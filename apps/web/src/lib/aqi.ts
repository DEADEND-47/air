export type AqiBand = 'good' | 'satisfactory' | 'moderate' | 'poor' | 'very-poor' | 'severe';

export function aqiBand(value: number): AqiBand {
  if (value <= 50) return 'good';
  if (value <= 100) return 'satisfactory';
  if (value <= 200) return 'moderate';
  if (value <= 300) return 'poor';
  if (value <= 400) return 'very-poor';
  return 'severe';
}

export function aqiLabel(value: number): string {
  return aqiBand(value).replace('-', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN', { notation: value >= 100_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

export function relativeTime(value: string): string {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, 'second');
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');
  return formatter.format(Math.round(hours / 24), 'day');
}
