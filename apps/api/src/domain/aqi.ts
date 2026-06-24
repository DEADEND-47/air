export type AqiBand = 'good' | 'satisfactory' | 'moderate' | 'poor' | 'very_poor' | 'severe';

export function classifyAqi(aqi: number): AqiBand {
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'satisfactory';
  if (aqi <= 200) return 'moderate';
  if (aqi <= 300) return 'poor';
  if (aqi <= 400) return 'very_poor';
  return 'severe';
}

export function healthMessage(aqi: number): string {
  const band = classifyAqi(aqi);
  const messages: Record<AqiBand, string> = {
    good: 'Air quality is good. Outdoor activity is encouraged.',
    satisfactory: 'Sensitive people may experience minor discomfort during prolonged outdoor activity.',
    moderate: 'Children, older adults, and people with respiratory illness should limit prolonged exertion.',
    poor: 'Reduce prolonged outdoor activity and use a well-fitted mask near traffic corridors.',
    very_poor: 'Avoid outdoor exercise. Keep windows closed and use filtered indoor air where possible.',
    severe: 'Remain indoors where possible. Use an N95 mask outdoors and seek care for breathing difficulty.',
  };
  return messages[band];
}

export function severityForAqi(aqi: number): 'info' | 'warning' | 'critical' {
  if (aqi > 300) return 'critical';
  if (aqi > 150) return 'warning';
  return 'info';
}
