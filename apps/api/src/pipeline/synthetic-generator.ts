/**
 * Synthetic historical air quality data generator.
 * Produces statistically realistic data for 16 major Indian cities
 * using seasonal patterns, weather correlations, and pollution source models.
 */
import type { HistoricalReading } from '../domain/models.js';

export interface CityProfile {
  id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  baseAqi: number;           // Typical AQI (annual median)
  winterMultiplier: number;  // Winter pollution factor (> 1 = worse in winter)
  monsoonMultiplier: number; // Monsoon pollution factor (< 1 = better during rains)
  stations: StationProfile[];
}

export interface StationProfile {
  id: string;
  name: string;
  ward: string;
  latOffset: number;
  lngOffset: number;
  areaFactor: number; // Multiplier (industrial zones > 1, residential < 1)
}

/** 16 major Indian cities with realistic baseline parameters */
export const CITY_PROFILES: CityProfile[] = [
  {
    id: 'delhi', name: 'Delhi', state: 'NCT', latitude: 28.6139, longitude: 77.209,
    baseAqi: 220, winterMultiplier: 2.1, monsoonMultiplier: 0.45,
    stations: [
      { id: 'DEL-AV', name: 'Anand Vihar', ward: 'Anand Vihar', latOffset: 0.08, lngOffset: 0.09, areaFactor: 1.6 },
      { id: 'DEL-DTU', name: 'DTU', ward: 'Rohini', latOffset: 0.12, lngOffset: -0.05, areaFactor: 0.9 },
      { id: 'DEL-DWK', name: 'Dwarka', ward: 'Dwarka', latOffset: -0.10, lngOffset: -0.15, areaFactor: 0.8 },
      { id: 'DEL-ITO', name: 'ITO', ward: 'Central Delhi', latOffset: 0.0, lngOffset: 0.0, areaFactor: 1.2 },
    ],
  },
  {
    id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', latitude: 19.076, longitude: 72.8777,
    baseAqi: 145, winterMultiplier: 1.4, monsoonMultiplier: 0.5,
    stations: [
      { id: 'MUM-BKC', name: 'Bandra Kurla Complex', ward: 'Bandra', latOffset: 0.05, lngOffset: 0.05, areaFactor: 1.1 },
      { id: 'MUM-COL', name: 'Colaba', ward: 'Colaba', latOffset: -0.12, lngOffset: -0.03, areaFactor: 0.8 },
      { id: 'MUM-MHD', name: 'Mazgaon', ward: 'Mazgaon', latOffset: 0.02, lngOffset: 0.01, areaFactor: 1.3 },
    ],
  },
  {
    id: 'kolkata', name: 'Kolkata', state: 'West Bengal', latitude: 22.5726, longitude: 88.3639,
    baseAqi: 160, winterMultiplier: 1.7, monsoonMultiplier: 0.55,
    stations: [
      { id: 'KOL-VET', name: 'Victoria', ward: 'Central', latOffset: -0.02, lngOffset: 0.01, areaFactor: 0.9 },
      { id: 'KOL-JAD', name: 'Jadavpur', ward: 'Jadavpur', latOffset: -0.07, lngOffset: 0.04, areaFactor: 1.1 },
      { id: 'KOL-DUM', name: 'Dum Dum', ward: 'Dum Dum', latOffset: 0.09, lngOffset: -0.03, areaFactor: 1.2 },
    ],
  },
  {
    id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707,
    baseAqi: 90, winterMultiplier: 1.2, monsoonMultiplier: 0.6,
    stations: [
      { id: 'CHN-AMD', name: 'Alandur', ward: 'Alandur', latOffset: -0.05, lngOffset: -0.02, areaFactor: 1.1 },
      { id: 'CHN-MNB', name: 'Manali', ward: 'Manali', latOffset: 0.10, lngOffset: 0.06, areaFactor: 1.5 },
    ],
  },
  {
    id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946,
    baseAqi: 105, winterMultiplier: 1.25, monsoonMultiplier: 0.65,
    stations: [
      { id: 'BLR-BTM', name: 'BTM Layout', ward: 'BTM', latOffset: -0.06, lngOffset: -0.01, areaFactor: 1.0 },
      { id: 'BLR-YLH', name: 'Yelhanka', ward: 'Yelhanka', latOffset: 0.12, lngOffset: 0.05, areaFactor: 0.85 },
    ],
  },
  {
    id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', latitude: 17.385, longitude: 78.4867,
    baseAqi: 130, winterMultiplier: 1.35, monsoonMultiplier: 0.58,
    stations: [
      { id: 'HYD-CHM', name: 'Charminar', ward: 'Charminar', latOffset: -0.04, lngOffset: 0.0, areaFactor: 1.2 },
      { id: 'HYD-HIT', name: 'Hitec City', ward: 'Madhapur', latOffset: 0.07, lngOffset: -0.08, areaFactor: 0.9 },
    ],
  },
  {
    id: 'pune', name: 'Pune', state: 'Maharashtra', latitude: 18.5204, longitude: 73.8567,
    baseAqi: 115, winterMultiplier: 1.3, monsoonMultiplier: 0.5,
    stations: [
      { id: 'PUN-KSH', name: 'Kasarwadi', ward: 'Kasarwadi', latOffset: 0.05, lngOffset: -0.07, areaFactor: 1.3 },
      { id: 'PUN-PHL', name: 'Phaltan', ward: 'Satara', latOffset: -0.08, lngOffset: 0.04, areaFactor: 0.85 },
    ],
  },
  {
    id: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', latitude: 23.0225, longitude: 72.5714,
    baseAqi: 155, winterMultiplier: 1.6, monsoonMultiplier: 0.48,
    stations: [
      { id: 'AHM-MAI', name: 'Maninagar', ward: 'Maninagar', latOffset: -0.04, lngOffset: 0.03, areaFactor: 1.2 },
      { id: 'AHM-SBP', name: 'Satellite', ward: 'Satellite', latOffset: 0.06, lngOffset: -0.07, areaFactor: 0.85 },
    ],
  },
  {
    id: 'lucknow', name: 'Lucknow', state: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462,
    baseAqi: 195, winterMultiplier: 1.9, monsoonMultiplier: 0.5,
    stations: [
      { id: 'LKO-TAL', name: 'Talkatora', ward: 'Central', latOffset: -0.03, lngOffset: 0.02, areaFactor: 1.1 },
      { id: 'LKO-LHB', name: 'LHB Colony', ward: 'Aliganj', latOffset: 0.09, lngOffset: -0.04, areaFactor: 0.95 },
    ],
  },
  {
    id: 'kanpur', name: 'Kanpur', state: 'Uttar Pradesh', latitude: 26.4499, longitude: 80.3319,
    baseAqi: 230, winterMultiplier: 2.1, monsoonMultiplier: 0.45,
    stations: [
      { id: 'KNP-KID', name: 'Kidwai Nagar', ward: 'Central', latOffset: 0.04, lngOffset: -0.02, areaFactor: 1.2 },
    ],
  },
  {
    id: 'patna', name: 'Patna', state: 'Bihar', latitude: 25.5941, longitude: 85.1376,
    baseAqi: 210, winterMultiplier: 2.0, monsoonMultiplier: 0.5,
    stations: [
      { id: 'PAT-KNK', name: 'Kankarbagh', ward: 'Kankarbagh', latOffset: -0.03, lngOffset: 0.02, areaFactor: 1.2 },
    ],
  },
  {
    id: 'gurugram', name: 'Gurugram', state: 'Haryana', latitude: 28.4595, longitude: 77.0266,
    baseAqi: 240, winterMultiplier: 2.1, monsoonMultiplier: 0.45,
    stations: [
      { id: 'GUR-SEC51', name: 'Sector 51', ward: 'Sector 51', latOffset: -0.02, lngOffset: 0.04, areaFactor: 1.3 },
    ],
  },
  {
    id: 'noida', name: 'Noida', state: 'Uttar Pradesh', latitude: 28.5355, longitude: 77.3910,
    baseAqi: 235, winterMultiplier: 2.05, monsoonMultiplier: 0.45,
    stations: [
      { id: 'NOI-SEC62', name: 'Sector 62', ward: 'Sector 62', latOffset: 0.03, lngOffset: -0.02, areaFactor: 1.2 },
    ],
  },
  {
    id: 'ghaziabad', name: 'Ghaziabad', state: 'Uttar Pradesh', latitude: 28.6692, longitude: 77.4538,
    baseAqi: 250, winterMultiplier: 2.2, monsoonMultiplier: 0.45,
    stations: [
      { id: 'GZB-IND', name: 'Indirapuram', ward: 'Indirapuram', latOffset: -0.04, lngOffset: 0.02, areaFactor: 1.4 },
    ],
  },
  {
    id: 'faridabad', name: 'Faridabad', state: 'Haryana', latitude: 28.4089, longitude: 77.3178,
    baseAqi: 225, winterMultiplier: 2.0, monsoonMultiplier: 0.46,
    stations: [
      { id: 'FAR-SEC11', name: 'Sector 11', ward: 'Sector 11', latOffset: 0.02, lngOffset: -0.03, areaFactor: 1.25 },
    ],
  },
];

/** Generate a random float in [min, max] with Gaussian noise */
function randFloat(min: number, max: number, noise = 0.1): number {
  const mid = (min + max) / 2;
  const half = (max - min) / 2;
  // Box-Muller for mild Gaussian noise
  const u1 = Math.random(), u2 = Math.random();
  const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const value = mid + half * (0.5 + gaussian * noise);
  return Math.max(min, Math.min(max, value));
}

function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }

/** Compute seasonal AQI multiplier for a given date */
function seasonalMultiplier(date: Date, city: CityProfile): number {
  const month = date.getMonth(); // 0-based
  // Monsoon: June (5) to September (8)
  if (month >= 5 && month <= 8) return city.monsoonMultiplier + Math.random() * 0.1;
  // Winter: November (10) to February (1)
  if (month >= 10 || month <= 1) {
    const fraction = month >= 10 ? (month - 10) / 4 : (month + 2) / 4;
    return 1 + (city.winterMultiplier - 1) * Math.sin(fraction * Math.PI);
  }
  // Spring/Autumn: mild
  return 1.0 + Math.random() * 0.2;
}

/** Compute hour-of-day multiplier (rush hours = higher pollution) */
function hourMultiplier(hour: number): number {
  if (hour >= 7 && hour <= 10) return 1.3;   // Morning rush
  if (hour >= 17 && hour <= 20) return 1.25; // Evening rush
  if (hour >= 2 && hour <= 5) return 0.75;   // Night low
  return 1.0;
}

export interface GeneratorOptions {
  daysBack?: number;      // How many days of history to generate (default: 730)
  readingsPerDayPerStation?: number; // Daily observations per station (default: 4)
  startDate?: Date;       // Start date (default: 2 years ago)
}

/**
 * Generate synthetic historical readings for all 16 cities.
 * Produces data for the specified time range with realistic seasonality,
 * diurnal patterns, weather correlations, and random noise.
 */
export function generateSyntheticHistory(options: GeneratorOptions = {}): Omit<HistoricalReading, 'id' | 'ingestedAt'>[] {
  const daysBack = options.daysBack ?? 730;
  const readingsPerDay = options.readingsPerDayPerStation ?? 4;
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  const startDate = options.startDate ?? new Date(endDate.getTime() - daysBack * 24 * 60 * 60_000);

  const records: Omit<HistoricalReading, 'id' | 'ingestedAt'>[] = [];
  const hoursPerReading = Math.floor(24 / readingsPerDay);
  const hours = Array.from({ length: readingsPerDay }, (_, i) => i * hoursPerReading + Math.floor(hoursPerReading / 2));

  for (const city of CITY_PROFILES) {
    const currentDate = new Date(startDate);
    while (currentDate < endDate) {
      const seasonal = seasonalMultiplier(currentDate, city);
      // Daily base AQI (with day-to-day weather variation)
      const dailyFactor = seasonal * randFloat(0.8, 1.2, 0.15);

      for (const station of city.stations) {
        for (const hour of hours) {
          const observedAt = new Date(currentDate);
          observedAt.setHours(hour, Math.floor(Math.random() * 30), 0, 0);

          const hourFactor = hourMultiplier(hour);
          const rawAqi = city.baseAqi * dailyFactor * hourFactor * station.areaFactor;
          const aqi = clamp(Math.round(rawAqi + randFloat(-20, 20, 0.3)), 0, 999);

          // Derive pollutant concentrations from AQI (simplified linear model)
          const aqiRatio = aqi / city.baseAqi;
          const pm25 = clamp(+(aqi * 0.42 * randFloat(0.85, 1.15, 0.1)).toFixed(1), 0, 500);
          const pm10 = clamp(+(aqi * 0.58 * randFloat(0.9, 1.2, 0.1)).toFixed(1), 0, 600);
          const no2  = clamp(+(aqi * 0.22 * aqiRatio * randFloat(0.7, 1.3, 0.2)).toFixed(1), 0, 400);
          const so2  = clamp(+(pm25 * 0.15 * randFloat(0.5, 1.5, 0.3)).toFixed(1), 0, 200);
          const co   = clamp(+(aqi * 0.08 * randFloat(0.6, 1.4, 0.3)).toFixed(1), 0, 50);
          const o3   = clamp(+(40 + (100 - aqi) * 0.1 + randFloat(-10, 10, 0.3)).toFixed(1), 0, 200);

          // Weather (seasonal)
          const isMonsoon = observedAt.getMonth() >= 5 && observedAt.getMonth() <= 8;
          const isWinter = observedAt.getMonth() >= 10 || observedAt.getMonth() <= 1;
          const temperature = isMonsoon
            ? randFloat(28, 35, 0.1)
            : isWinter ? randFloat(8, 22, 0.1) : randFloat(22, 38, 0.1);
          const humidity = isMonsoon
            ? randFloat(65, 95, 0.1)
            : isWinter ? randFloat(40, 75, 0.1) : randFloat(20, 55, 0.1);
          const windSpeed = clamp(randFloat(0.5, 4.0, 0.3), 0, 20);
          const windDirection = Math.floor(Math.random() * 360);
          const rainfallMm = isMonsoon && Math.random() < 0.25 ? +randFloat(1, 40, 0.5).toFixed(1) : 0;

          records.push({
            cityId: city.id,
            stationId: station.id,
            stationName: station.name,
            ward: station.ward,
            latitude: +(city.latitude + station.latOffset + randFloat(-0.002, 0.002)).toFixed(6),
            longitude: +(city.longitude + station.lngOffset + randFloat(-0.002, 0.002)).toFixed(6),
            aqi, pm25, pm10, no2, so2, co, o3,
            temperature: +temperature.toFixed(1),
            humidity: +humidity.toFixed(1),
            windSpeed: +windSpeed.toFixed(1),
            windDirection,
            rainfallMm,
            source: 'synthetic',
            qualityFlag: 'good',
            observedAt: observedAt.toISOString(),
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return records;
}

/** AQI category classification per CPCB standards */
export function aqiCategory(aqi: number): string {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}
