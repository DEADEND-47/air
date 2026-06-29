import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { broadcast } from '../realtime/hub.js';

const CITY_PROFILES = [
  { id: 'delhi', name: 'Delhi', latitude: 28.6139, longitude: 77.209, baseAqi: 220 },
  { id: 'mumbai', name: 'Mumbai', latitude: 19.076, longitude: 72.8777, baseAqi: 145 },
  { id: 'bengaluru', name: 'Bengaluru', latitude: 12.9716, longitude: 77.5946, baseAqi: 105 },
  { id: 'chennai', name: 'Chennai', latitude: 13.0827, longitude: 80.2707, baseAqi: 90 },
  { id: 'hyderabad', name: 'Hyderabad', latitude: 17.385, longitude: 78.4867, baseAqi: 130 },
  { id: 'kolkata', name: 'Kolkata', latitude: 22.5726, longitude: 88.3639, baseAqi: 160 },
];

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function generateSyntheticHistory(daysBack = 30) {
  const rows = [];
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  for (const city of CITY_PROFILES) {
    for (let day = 0; day < daysBack; day++) {
      const date = new Date(end.getTime() - day * 24 * 60 * 60_000);
      for (let sample = 0; sample < 4; sample++) {
        const observed = new Date(date);
        observed.setHours(sample * 6 + 2, 0, 0, 0);
        const seasonal = observed.getMonth() >= 10 || observed.getMonth() <= 1 ? 1.35 : 0.95;
        const aqi = Math.round(clamp(city.baseAqi * seasonal + rand(-25, 25), 0, 999));
        rows.push({
          cityId: city.id,
          stationId: `${city.id.slice(0, 3).toUpperCase()}-HIST`,
          stationName: `${city.name} Historical Station`,
          ward: 'Citywide',
          latitude: city.latitude,
          longitude: city.longitude,
          aqi,
          pm25: +(aqi * 0.42).toFixed(1),
          pm10: +(aqi * 0.62).toFixed(1),
          no2: +(aqi * 0.22).toFixed(1),
          temperature: +rand(20, 36).toFixed(1),
          humidity: +rand(35, 80).toFixed(1),
          windSpeed: +rand(1, 8).toFixed(1),
          windDirection: Math.round(rand(0, 360)),
          source: 'synthetic',
          qualityFlag: 'good',
          observedAt: observed.toISOString(),
          ingestedAt: new Date().toISOString(),
        });
      }
    }
  }
  return rows;
}

async function fetchRealLatest() {
  const headers = process.env.OPENAQ_API_KEY ? { 'X-API-Key': process.env.OPENAQ_API_KEY } : {};
  const response = await fetch('https://api.openaq.org/v2/latest?country=IN&limit=1000', { headers });
  if (!response.ok) throw new Error(`OpenAQ returned ${response.status}`);
  const openAq = await response.json();
  const rows = [];
  for (const city of CITY_PROFILES) {
    let weather = null;
    try {
      const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current_weather=true`);
      if (weatherResponse.ok) weather = (await weatherResponse.json()).current_weather;
    } catch {
      weather = null;
    }
    const match = openAq.results?.find((item) => item.city?.toLowerCase() === city.name.toLowerCase());
    const pm25 = match?.measurements?.find((item) => item.parameter === 'pm25')?.value ?? city.baseAqi * 0.42;
    const pm10 = match?.measurements?.find((item) => item.parameter === 'pm10')?.value ?? city.baseAqi * 0.62;
    const no2 = match?.measurements?.find((item) => item.parameter === 'no2')?.value ?? city.baseAqi * 0.22;
    rows.push({
      cityId: city.id,
      stationId: match?.locationId ? `OP-${match.locationId}` : `${city.id.slice(0, 3).toUpperCase()}-AUTO`,
      stationName: match?.location ?? `${city.name} Auto Station`,
      ward: 'Citywide',
      latitude: match?.coordinates?.latitude ?? city.latitude,
      longitude: match?.coordinates?.longitude ?? city.longitude,
      aqi: Math.round(pm25 * 1.5),
      pm25,
      pm10,
      no2,
      temperature: weather?.temperature ?? 28,
      humidity: 60,
      windSpeed: weather?.windspeed ?? 4,
      windDirection: weather?.winddirection ?? 180,
      source: match ? 'openaq' : 'synthetic-fallback',
      qualityFlag: 'good',
      observedAt: new Date().toISOString(),
      ingestedAt: new Date().toISOString(),
    });
  }
  return rows;
}

function computeDailyStats(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.cityId}:${row.observedAt.slice(0, 10)}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.entries()].map(([key, group]) => {
    const [cityId, statDate] = key.split(':');
    const avg = (field) => +(group.reduce((sum, row) => sum + row[field], 0) / group.length).toFixed(1);
    return {
      cityId,
      statDate,
      aqiAvg: avg('aqi'),
      aqiMax: Math.max(...group.map((row) => row.aqi)),
      aqiMin: Math.min(...group.map((row) => row.aqi)),
      pm25Avg: avg('pm25'),
      pm10Avg: avg('pm10'),
      no2Avg: avg('no2'),
      readingCount: group.length,
    };
  });
}

export async function runEtl({ source = 'synthetic', daysBack = 30 } = {}) {
  let rows;
  if (source === 'real') {
    try { rows = await fetchRealLatest(); }
    catch { rows = generateSyntheticHistory(3); }
  } else {
    rows = generateSyntheticHistory(daysBack);
  }

  let inserted = 0;
  const insertedRows = [];
  for (const row of rows) {
    try {
      await db.insert(schema.historicalReadings).values(row).onConflictDoNothing();
      inserted += 1;
      insertedRows.push(row);
    } catch {
      // Duplicate historical rows are okay for local demo reruns.
    }
  }
  for (const stat of computeDailyStats(rows)) {
    await db.insert(schema.dailyStats).values(stat).onConflictDoUpdate({
      target: [schema.dailyStats.cityId, schema.dailyStats.statDate],
      set: stat,
    });
  }
  if (insertedRows.length) {
    broadcast('readings.updated', { source, rows: insertedRows.slice(0, 25), rowsInserted: inserted });
  }
  return { source, rowsSeen: rows.length, rowsInserted: inserted };
}
