import { hash } from 'bcryptjs';
import type {
  Advisory,
  Alert,
  Attribution,
  City,
  EnforcementCase,
  ForecastPoint,
  SensorReading,
  User,
} from '../domain/models.js';

const now = new Date('2026-06-23T12:30:00.000Z');
const isoHoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();
const isoHoursAhead = (hours: number) => new Date(now.getTime() + hours * 3_600_000).toISOString();

export interface SeedData {
  users: User[];
  cities: City[];
  readings: SensorReading[];
  forecasts: ForecastPoint[];
  attributions: Attribution[];
  alerts: Alert[];
  advisories: Advisory[];
  enforcement: EnforcementCase[];
}

export async function createSeedData(): Promise<SeedData> {
  const users: User[] = [
    {
      id: 'usr-admin',
      email: 'admin@airiq.city',
      name: 'Aarav Mehta',
      role: 'city_admin',
      passwordHash: await hash('AirIQ!2026', 10),
      active: true,
      emailVerified: true,
      failedAttempts: 0,
      createdAt: now.toISOString(),
    },
    {
      id: 'usr-demo',
      email: 'demo@example.com',
      name: 'Demo User',
      role: 'city_admin',
      passwordHash: await hash('Password123!', 10),
      active: true,
      emailVerified: true,
      failedAttempts: 0,
      createdAt: now.toISOString(),
    },
    {
      id: 'usr-enforcement',
      email: 'enforcement@airiq.city',
      name: 'Maya Rao',
      role: 'enforcement_officer',
      passwordHash: await hash('AirIQ!2026', 10),
      active: true,
      emailVerified: true,
      failedAttempts: 0,
      createdAt: now.toISOString(),
    },
  ];

  const cities: City[] = [
    { id: 'delhi', name: 'Delhi', state: 'NCT', latitude: 28.6139, longitude: 77.209, aqi: 342, pm25: 342, pm10: 410, no2: 85, trend: 'up', updatedAt: now.toISOString() },
    { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', latitude: 19.076, longitude: 72.8777, aqi: 215, pm25: 215, pm10: 280, no2: 62, trend: 'down', updatedAt: now.toISOString() },
    { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946, aqi: 112, pm25: 112, pm10: 145, no2: 45, trend: 'down', updatedAt: now.toISOString() },
    { id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707, aqi: 85, pm25: 85, pm10: 110, no2: 32, trend: 'flat', updatedAt: now.toISOString() },
    { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', latitude: 17.385, longitude: 78.4867, aqi: 135, pm25: 135, pm10: 160, no2: 48, trend: 'up', updatedAt: now.toISOString() },
    { id: 'kolkata', name: 'Kolkata', state: 'West Bengal', latitude: 22.5726, longitude: 88.3639, aqi: 185, pm25: 185, pm10: 210, no2: 78, trend: 'flat', updatedAt: now.toISOString() },
    { id: 'pune', name: 'Pune', state: 'Maharashtra', latitude: 18.5204, longitude: 73.8567, aqi: 108, pm25: 108, pm10: 130, no2: 40, trend: 'down', updatedAt: now.toISOString() },
    { id: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', latitude: 23.0225, longitude: 72.5714, aqi: 165, pm25: 165, pm10: 190, no2: 52, trend: 'up', updatedAt: now.toISOString() },
    { id: 'lucknow', name: 'Lucknow', state: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462, aqi: 245, pm25: 245, pm10: 290, no2: 70, trend: 'up', updatedAt: now.toISOString() },
    { id: 'kanpur', name: 'Kanpur', state: 'Uttar Pradesh', latitude: 26.4499, longitude: 80.3319, aqi: 265, pm25: 265, pm10: 310, no2: 75, trend: 'flat', updatedAt: now.toISOString() },
    { id: 'patna', name: 'Patna', state: 'Bihar', latitude: 25.5941, longitude: 85.1376, aqi: 285, pm25: 285, pm10: 340, no2: 80, trend: 'up', updatedAt: now.toISOString() },
    { id: 'gurugram', name: 'Gurugram', state: 'Haryana', latitude: 28.4595, longitude: 77.0266, aqi: 295, pm25: 295, pm10: 350, no2: 82, trend: 'up', updatedAt: now.toISOString() },
    { id: 'noida', name: 'Noida', state: 'Uttar Pradesh', latitude: 28.5355, longitude: 77.391, aqi: 280, pm25: 280, pm10: 330, no2: 79, trend: 'up', updatedAt: now.toISOString() },
    { id: 'ghaziabad', name: 'Ghaziabad', state: 'Uttar Pradesh', latitude: 28.6692, longitude: 77.4538, aqi: 310, pm25: 310, pm10: 370, no2: 84, trend: 'up', updatedAt: now.toISOString() },
    { id: 'faridabad', name: 'Faridabad', state: 'Haryana', latitude: 28.4089, longitude: 77.3178, aqi: 270, pm25: 270, pm10: 320, no2: 77, trend: 'flat', updatedAt: now.toISOString() }
  ];

  const readings: SensorReading[] = [];
  const forecasts: ForecastPoint[] = [];
  const attributions: Attribution[] = [];
  const alerts: Alert[] = [];
  const advisories: Advisory[] = [];
  const enforcement: EnforcementCase[] = [];

  cities.forEach((city) => {
    if (city.id === 'delhi') {
      // 1. Delhi readings (exactly 18 for existing integration tests compatibility)
      for (let index = 0; index < 18; index++) {
        const ward = ['Anand Vihar', 'Rohini', 'Dwarka', 'Okhla', 'Connaught Place', 'Najafgarh'][index % 6] ?? 'Central';
        const base = [378, 315, 268, 347, 241, 286][index % 6] ?? 300;
        readings.push({
          id: `reading-${index + 1}`,
          sensorId: `DL-${String((index % 6) + 1).padStart(3, '0')}`,
          cityId: 'delhi',
          ward,
          latitude: 28.61 + ((index % 6) - 2) * 0.035,
          longitude: 77.21 + ((index % 5) - 2) * 0.045,
          aqi: clampAqi(base - Math.floor(index / 6) * 9),
          pm25: clampVal(base - 22),
          pm10: clampVal(base + 48),
          no2: clampVal(64 + (index % 5) * 6),
          temperature: 31 - (index % 4),
          humidity: 52 + (index % 6) * 3,
          observedAt: isoHoursAgo(index),
        });
      }

      // 2. Delhi forecasts
      [0, 2, 4, 6, 12, 24, 48, 72].forEach((horizon, index) => {
        forecasts.push({
          cityId: 'delhi',
          ward: 'Citywide',
          horizonHours: horizon,
          predictedAqi: [342, 356, 371, 388, 352, 314, 278, 246][index] ?? 342,
          lowerBound: [324, 333, 344, 354, 318, 275, 235, 204][index] ?? 320,
          upperBound: [360, 379, 398, 422, 386, 353, 321, 288][index] ?? 360,
          confidence: +Math.max(0.67, 0.96 - index * 0.04).toFixed(2),
          predictedAt: isoHoursAhead(horizon),
          drivers: horizon <= 6 ? ['wind speed drop', 'traffic accumulation', 'low mixing height'] : ['regional transport', 'boundary layer recovery'],
        });
      });

      // 3. Delhi attribution
      attributions.push({
        cityId: 'delhi',
        ward: 'Citywide',
        generatedAt: now.toISOString(),
        confidence: 0.87,
        sources: [
          { source: 'Vehicular traffic', contribution: 45, direction: 'rising' },
          { source: 'Road and construction dust', contribution: 30, direction: 'stable' },
          { source: 'Industry', contribution: 15, direction: 'falling' },
          { source: 'Biomass and other', contribution: 10, direction: 'stable' },
        ],
        explanation: 'Traffic congestion and a shallow boundary layer are trapping primary emissions along the eastern corridor. Dust remains elevated but stable.',
      });

      // 4. Delhi alerts (including resolved alerts)
      alerts.push(
        { id: 'alert-001', cityId: 'delhi', ward: 'Anand Vihar', title: 'Critical PM2.5 spike', description: 'PM2.5 exceeded 350 ug/m3 across three adjacent sensors for 20 minutes.', severity: 'critical', status: 'open', source: 'Sensor Fusion', correlationId: 'corr-east-01', createdAt: isoHoursAgo(0.4), updatedAt: isoHoursAgo(0.4) },
        { id: 'alert-002', cityId: 'delhi', ward: 'Central Delhi', title: 'AQI threshold forecast', description: 'Forecast model indicates an 85% probability of AQI exceeding 350 within two hours.', severity: 'warning', status: 'acknowledged', source: 'Forecast Agent', assignedTo: 'usr-admin', createdAt: isoHoursAgo(1.1), updatedAt: isoHoursAgo(0.8) },
        { id: 'alert-003', cityId: 'delhi', ward: 'Okhla', title: 'Industrial plume signature', description: 'SO2 and PM10 ratios indicate a probable unfiltered industrial release.', severity: 'critical', status: 'open', source: 'Attribution Agent', correlationId: 'corr-south-04', createdAt: isoHoursAgo(2.2), updatedAt: isoHoursAgo(2.2) },
        { id: 'alert-004', cityId: 'delhi', ward: 'Rohini', title: 'Sensor drift detected', description: 'Node DL-002 diverged from neighbouring reference instruments.', severity: 'info', status: 'resolved', source: 'Data Quality Monitor', createdAt: isoHoursAgo(8), updatedAt: isoHoursAgo(4) }
      );

      // 5. Delhi advisories
      advisories.push({
        id: 'advisory-001',
        cityId: 'delhi',
        ward: 'East Delhi',
        severity: 'critical',
        audience: ['children', 'older adults', 'respiratory patients'],
        channels: ['sms', 'push', 'public_display'],
        message: 'Air quality is severe in East Delhi. Remain indoors where possible, use an N95 mask outdoors, and avoid strenuous activity.',
        status: 'published',
        reach: 428190,
        createdAt: isoHoursAgo(3),
        publishedAt: isoHoursAgo(2.8),
      });

      // 6. Delhi cases
      enforcement.push(
        { id: 'case-001', cityId: 'delhi', ward: 'Okhla Phase II', target: 'Industrial cluster OI-14', category: 'Industrial emissions', priority: 96, evidenceScore: 0.92, estimatedImpact: 18.4, status: 'queued', createdAt: isoHoursAgo(1.5), updatedAt: isoHoursAgo(1.5) },
        { id: 'case-002', cityId: 'delhi', ward: 'Anand Vihar', target: 'Heavy vehicle corridor NH-24', category: 'Vehicular emissions', priority: 88, evidenceScore: 0.86, estimatedImpact: 12.7, status: 'dispatched', assignedUnit: 'Alpha-3', createdAt: isoHoursAgo(3), updatedAt: isoHoursAgo(0.5) },
        { id: 'case-003', cityId: 'delhi', ward: 'Dwarka Sector 23', target: 'Construction site DW-88', category: 'Construction dust', priority: 73, evidenceScore: 0.79, estimatedImpact: 7.8, status: 'investigating', assignedUnit: 'Dust Patrol-2', createdAt: isoHoursAgo(6), updatedAt: isoHoursAgo(1.2) }
      );
    } else {
      // Seed dynamically for other 14 cities
      // Seed 5 readings per city (to meet potential check limit expectations)
      for (let index = 0; index < 5; index++) {
        const wards = ['Central Grid', 'Eastern Corridor', 'Residential Zone', 'Industrial Grid', 'Transit Center'];
        const ward = wards[index] ?? 'Central Grid';
        const sensorOffset = index - 2; // -2, -1, 0, 1, 2
        const latOffset = sensorOffset * 0.025;
        const lngOffset = sensorOffset * 0.035;

        readings.push({
          id: `reading-${city.id}-${index + 1}`,
          sensorId: `${city.id.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
          cityId: city.id,
          ward,
          latitude: +(city.latitude + latOffset).toFixed(6),
          longitude: +(city.longitude + lngOffset).toFixed(6),
          aqi: clampAqi(city.aqi + sensorOffset * 15),
          pm25: clampVal(city.pm25 + sensorOffset * 12),
          pm10: clampVal(city.pm10 + sensorOffset * 18),
          no2: clampVal(city.no2 + sensorOffset * 5),
          temperature: 30 - index,
          humidity: 55 + index * 4,
          observedAt: now.toISOString(),
        });
      }

      // forecasts
      [0, 6, 12, 24, 48, 72].forEach((horizon, index) => {
        forecasts.push({
          cityId: city.id,
          ward: 'Citywide',
          horizonHours: horizon,
          predictedAqi: clampAqi(city.aqi + (index - 2) * 15),
          lowerBound: clampAqi(city.aqi + (index - 2) * 15 - 20),
          upperBound: clampAqi(city.aqi + (index - 2) * 15 + 25),
          confidence: +Math.max(0.65, 0.95 - index * 0.04).toFixed(2),
          predictedAt: isoHoursAhead(horizon),
          drivers: ['Vehicular build-up', 'Wind pattern stagnation'],
        });
      });

      // source attribution
      attributions.push({
        cityId: city.id,
        ward: 'Citywide',
        generatedAt: now.toISOString(),
        confidence: 0.88,
        sources: [
          { source: 'Vehicular traffic', contribution: 45, direction: 'rising' },
          { source: 'Road & Construction dust', contribution: 30, direction: 'stable' },
          { source: 'Industrial emissions', contribution: 15, direction: 'falling' },
          { source: 'Biomass burning', contribution: 10, direction: 'stable' },
        ],
        explanation: `Calibration models identify heavy transit traffic and local dust suspension as primary pollution drivers in ${city.name}.`,
      });

      // 1 alert
      alerts.push({
        id: `alert-${city.id}-01`,
        cityId: city.id,
        ward: 'Central Grid',
        title: `Critical AQI threshold in ${city.name}`,
        description: `Primary particulate matter levels have exceeded standard limits. Continuous exposure warnings in effect.`,
        severity: city.aqi > 250 ? 'critical' : 'warning',
        status: 'open',
        source: 'Sensor Fusion',
        createdAt: isoHoursAgo(1.2),
        updatedAt: isoHoursAgo(1.2),
      });

      // 1 enforcement case
      enforcement.push({
        id: `case-${city.id}-01`,
        cityId: city.id,
        ward: 'Eastern Corridor',
        target: `Transit Vehicle Depot ${city.name.slice(0, 3).toUpperCase()}-1`,
        category: 'Vehicular emissions',
        priority: city.aqi > 200 ? 92 : 72,
        evidenceScore: 0.85,
        estimatedImpact: 14.8,
        status: 'queued',
        createdAt: isoHoursAgo(2),
        updatedAt: isoHoursAgo(2),
      });

      // 1 health advisory
      advisories.push({
        id: `advisory-${city.id}-01`,
        cityId: city.id,
        ward: 'Citywide',
        severity: city.aqi > 200 ? 'critical' : 'warning',
        audience: ['children', 'older adults', 'respiratory patients'],
        channels: ['sms', 'push', 'email'],
        message: `Air quality index in ${city.name} has crossed safe margins at ${city.aqi}. Please limit intense outdoor activities.`,
        status: 'published',
        reach: 220000,
        createdAt: isoHoursAgo(3),
        publishedAt: isoHoursAgo(2.5),
      });
    }
  });

  return { users, cities, readings, forecasts, attributions, alerts, advisories, enforcement };
}

function clampAqi(v: number): number {
  return Math.max(0, Math.min(999, Math.round(v)));
}

function clampVal(v: number): number {
  return Math.max(0, +v.toFixed(1));
}
