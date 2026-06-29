import bcrypt from 'bcryptjs';
import { runAttribution, runForecast } from '../agents/local-agents.js';

const now = new Date();
const isoHoursAgo = (hours) => new Date(now.getTime() - hours * 60 * 60_000).toISOString();

export async function createSeedData() {
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const users = [
    { id: 'usr-admin', email: 'admin@airiq.local', name: 'Admin User', role: 'admin', passwordHash, active: true },
    { id: 'usr-analyst', email: 'analyst@airiq.local', name: 'Analyst User', role: 'analyst', passwordHash, active: true },
    { id: 'usr-viewer', email: 'viewer@airiq.local', name: 'Viewer User', role: 'viewer', passwordHash, active: true },
  ];

  const cities = [
    { id: 'delhi', name: 'Delhi', state: 'NCT', latitude: 28.6139, longitude: 77.209, aqi: 342, pm25: 142, pm10: 260, no2: 85, trend: 'up' },
    { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', latitude: 19.076, longitude: 72.8777, aqi: 215, pm25: 88, pm10: 176, no2: 62, trend: 'down' },
    { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946, aqi: 112, pm25: 46, pm10: 96, no2: 45, trend: 'down' },
    { id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707, aqi: 85, pm25: 32, pm10: 74, no2: 32, trend: 'flat' },
    { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', latitude: 17.385, longitude: 78.4867, aqi: 135, pm25: 54, pm10: 116, no2: 48, trend: 'up' },
    { id: 'kolkata', name: 'Kolkata', state: 'West Bengal', latitude: 22.5726, longitude: 88.3639, aqi: 185, pm25: 76, pm10: 151, no2: 78, trend: 'flat' },
  ].map((city) => ({ ...city, updatedAt: now.toISOString() }));

  const readings = [];
  for (const city of cities) {
    for (let index = 0; index < 8; index++) {
      const ward = ['Central Grid', 'Eastern Corridor', 'Residential Zone', 'Industrial Grid'][index % 4];
      const aqi = Math.max(20, Math.round(city.aqi + (index - 3) * 8));
      readings.push({
        id: `reading-${city.id}-${index + 1}`,
        cityId: city.id,
        sensorId: `${city.id.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
        ward,
        latitude: +(city.latitude + (index - 3) * 0.018).toFixed(6),
        longitude: +(city.longitude + (index - 3) * 0.022).toFixed(6),
        aqi,
        pm25: +(aqi * 0.42).toFixed(1),
        pm10: +(aqi * 0.62).toFixed(1),
        no2: +(city.no2 + (index % 4) * 4).toFixed(1),
        temperature: 30 - (index % 4),
        humidity: 52 + (index % 5) * 4,
        observedAt: isoHoursAgo(index),
      });
    }
  }

  const forecasts = cities.flatMap((city) => runForecast(city, readings.filter((r) => r.cityId === city.id)));
  const attributions = cities.map((city) => runAttribution(city.id, 'Citywide', readings.filter((r) => r.cityId === city.id)));
  const alerts = [
    { id: 'alert-001', cityId: 'delhi', ward: 'Eastern Corridor', title: 'Critical PM2.5 spike', description: 'PM2.5 exceeded safe limits across three nearby sensors.', severity: 'critical', status: 'open', source: 'Sensor Grid', createdAt: isoHoursAgo(1), updatedAt: isoHoursAgo(1) },
    { id: 'alert-003', cityId: 'delhi', ward: 'Okhla Industrial Belt', title: 'Construction dust escalation', description: 'Dust monitors show a sustained increase near active construction clusters.', severity: 'warning', status: 'open', source: 'Dust Watch', createdAt: isoHoursAgo(2), updatedAt: isoHoursAgo(2) },
    { id: 'alert-004', cityId: 'delhi', ward: 'Anand Vihar', title: 'Traffic corridor buildup', description: 'Vehicular emissions are accumulating faster than dispersion in the freight corridor.', severity: 'warning', status: 'acknowledged', source: 'Traffic Model', assignedTo: 'usr-analyst', createdAt: isoHoursAgo(3), updatedAt: isoHoursAgo(2) },
    { id: 'alert-005', cityId: 'delhi', ward: 'Rohini', title: 'Sensor drift review needed', description: 'One station is trending outside expected calibration bounds during the morning window.', severity: 'info', status: 'open', source: 'QA Agent', createdAt: isoHoursAgo(5), updatedAt: isoHoursAgo(4) },
    { id: 'alert-006', cityId: 'delhi', ward: 'Punjabi Bagh', title: 'Localized AQI hotspot', description: 'A neighborhood hotspot has remained above the local threshold for multiple readings.', severity: 'critical', status: 'open', source: 'Sensor Grid', createdAt: isoHoursAgo(6), updatedAt: isoHoursAgo(5) },
    { id: 'alert-007', cityId: 'delhi', ward: 'Dwarka', title: 'Forecast exceedance risk', description: 'Forecast confidence for an evening exceedance has crossed the warning threshold.', severity: 'warning', status: 'open', source: 'Forecast Agent', createdAt: isoHoursAgo(7), updatedAt: isoHoursAgo(6) },
    { id: 'alert-008', cityId: 'delhi', ward: 'Mayur Vihar', title: 'Neighborhood exposure notice', description: 'Community exposure levels remain elevated for sensitive groups in this zone.', severity: 'warning', status: 'resolved', source: 'Health Model', createdAt: isoHoursAgo(8), updatedAt: isoHoursAgo(1) },
    { id: 'alert-009', cityId: 'delhi', ward: 'Narela', title: 'Industrial plume watch', description: 'Wind shifts are carrying emissions from the industrial edge toward residential areas.', severity: 'critical', status: 'open', source: 'Attribution Agent', createdAt: isoHoursAgo(9), updatedAt: isoHoursAgo(8) },
    { id: 'alert-010', cityId: 'delhi', ward: 'Lajpat Nagar', title: 'Morning inversion detected', description: 'Atmospheric inversion conditions are reducing pollutant dispersal across the district.', severity: 'info', status: 'acknowledged', source: 'Weather Feed', createdAt: isoHoursAgo(10), updatedAt: isoHoursAgo(7) },
    { id: 'alert-002', cityId: 'mumbai', ward: 'Central Grid', title: 'AQI forecast warning', description: 'AQI is likely to stay above 200 for the next six hours.', severity: 'warning', status: 'acknowledged', source: 'Forecast Agent', assignedTo: 'usr-analyst', createdAt: isoHoursAgo(4), updatedAt: isoHoursAgo(2) },
  ];
  const advisories = [
    { id: 'advisory-001', cityId: 'delhi', ward: 'Citywide', severity: 'critical', audience: ['children', 'older adults', 'respiratory patients'], channels: ['email', 'public_display'], message: 'Air quality is severe. Limit outdoor activity and use masks near traffic.', status: 'published', reach: 125000, createdAt: isoHoursAgo(3), publishedAt: isoHoursAgo(2) },
  ];
  const enforcementCases = [
    { id: 'case-001', cityId: 'delhi', ward: 'Okhla', target: 'Industrial cluster OI-14', category: 'Industrial emissions', priority: 92, evidenceScore: 0.9, estimatedImpact: 16.4, status: 'queued', createdAt: isoHoursAgo(2), updatedAt: isoHoursAgo(2) },
    { id: 'case-002', cityId: 'delhi', ward: 'Anand Vihar', target: 'Heavy vehicle corridor', category: 'Vehicular traffic', priority: 86, evidenceScore: 0.84, estimatedImpact: 12.2, status: 'dispatched', assignedUnit: 'Unit A', createdAt: isoHoursAgo(5), updatedAt: isoHoursAgo(1) },
  ];

  return { users, cities, readings, forecasts, attributions, alerts, advisories, enforcementCases };
}
