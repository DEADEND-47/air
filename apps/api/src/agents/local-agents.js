export function classifyAqi(aqi) {
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'satisfactory';
  if (aqi <= 200) return 'moderate';
  if (aqi <= 300) return 'poor';
  if (aqi <= 400) return 'very_poor';
  return 'severe';
}

export function severityForAqi(aqi) {
  if (aqi > 300) return 'critical';
  if (aqi > 150) return 'warning';
  return 'info';
}

export function healthMessage(aqi) {
  const messages = {
    good: 'Air quality is good. Outdoor activity is encouraged.',
    satisfactory: 'Sensitive people may experience minor discomfort during prolonged outdoor activity.',
    moderate: 'Children, older adults, and respiratory patients should limit prolonged exertion.',
    poor: 'Reduce prolonged outdoor activity and wear a mask near traffic corridors.',
    very_poor: 'Avoid outdoor exercise. Keep windows closed and use filtered indoor air where possible.',
    severe: 'Remain indoors where possible. Use an N95 mask outdoors and seek care for breathing difficulty.',
  };
  return messages[classifyAqi(aqi)];
}

export function runForecast(city, readings, horizons = [0, 2, 6, 12, 24, 48, 72]) {
  const latest = readings[0]?.aqi ?? city.aqi;
  const previous = readings[1]?.aqi ?? latest;
  const slope = Math.max(-12, Math.min(12, latest - previous));
  return horizons.map((hours) => {
    const predictedAqi = Math.max(0, Math.round(latest + slope * Math.sqrt(Math.max(1, hours)) * 0.55));
    const uncertainty = Math.round(10 + hours * 0.9);
    return {
      cityId: city.id,
      ward: 'Citywide',
      horizonHours: hours,
      predictedAqi,
      lowerBound: Math.max(0, predictedAqi - uncertainty),
      upperBound: predictedAqi + uncertainty,
      confidence: Math.max(0.6, +(0.94 - hours * 0.004).toFixed(2)),
      predictedAt: new Date(Date.now() + hours * 60 * 60_000).toISOString(),
      drivers: slope >= 0 ? ['recent concentration trend', 'low dispersion'] : ['improving wind dispersion', 'recent concentration trend'],
    };
  });
}

export function runAttribution(cityId, ward, readings) {
  const averageNo2 = readings.reduce((sum, item) => sum + item.no2, 0) / Math.max(1, readings.length);
  const traffic = Math.round(Math.min(58, 32 + averageNo2 * 0.16));
  const dust = Math.round(Math.max(18, 34 - averageNo2 * 0.04));
  const industry = 16;
  const other = 100 - traffic - dust - industry;
  return {
    cityId,
    ward,
    generatedAt: new Date().toISOString(),
    confidence: 0.81,
    sources: [
      { source: 'Vehicular traffic', contribution: traffic, direction: 'rising' },
      { source: 'Road and construction dust', contribution: dust, direction: 'stable' },
      { source: 'Industry', contribution: industry, direction: 'stable' },
      { source: 'Biomass and other', contribution: other, direction: 'falling' },
    ],
    explanation: 'NO2 and particulate ratios indicate traffic as the dominant local source, with dust as the second-largest contributor.',
  };
}

export function buildAdvisory({ cityId, ward, aqi, audience, channels }) {
  return {
    cityId,
    ward,
    severity: severityForAqi(aqi),
    audience,
    channels,
    message: `${ward}: AQI is ${aqi}. ${healthMessage(aqi)}`,
  };
}

export function prioritizeEnforcement(cityId, attribution, alerts) {
  const criticalAlerts = alerts.filter((alert) => alert.severity === 'critical').length;
  return attribution.sources.slice(0, 3).map((source, index) => ({
    cityId,
    ward: attribution.ward,
    target: source.source === 'Vehicular traffic' ? 'High-emission traffic corridor' : `${source.source} hotspot`,
    category: source.source,
    priority: Math.min(100, Math.round(source.contribution * 1.7 + criticalAlerts * 8 - index * 3)),
    evidenceScore: Math.max(0.65, +(attribution.confidence - index * 0.05).toFixed(2)),
    estimatedImpact: +(source.contribution * 0.32).toFixed(1),
    status: 'queued',
  }));
}

export function correlateAlerts(alerts) {
  const groups = new Map();
  for (const alert of alerts) {
    const key = `${alert.cityId}:${alert.ward}`;
    groups.set(key, [...(groups.get(key) ?? []), alert]);
  }
  return {
    clusters: [...groups.entries()].map(([key, group], index) => ({
      id: `cluster-${index + 1}`,
      alertIds: group.map((alert) => alert.id),
      summary: `${group.length} signal${group.length === 1 ? '' : 's'} correlated in ${group[0]?.ward ?? key}`,
      severity: group.some((alert) => alert.severity === 'critical') ? 'critical' : group.some((alert) => alert.severity === 'warning') ? 'warning' : 'info',
      confidence: Math.min(0.96, 0.72 + group.length * 0.08),
    })),
  };
}
