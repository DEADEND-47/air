import { describe, expect, it } from 'vitest';
import { aqiBand, aqiLabel, formatNumber, relativeTime } from './aqi';

describe('aqi helpers', () => {
  it('should map values correctly to aqiBand', () => {
    expect(aqiBand(30)).toBe('good');
    expect(aqiBand(75)).toBe('satisfactory');
    expect(aqiBand(150)).toBe('moderate');
    expect(aqiBand(250)).toBe('poor');
    expect(aqiBand(350)).toBe('very-poor');
    expect(aqiBand(450)).toBe('severe');
  });

  it('should format labels correctly with capitalized letters', () => {
    expect(aqiLabel(30)).toBe('Good');
    expect(aqiLabel(75)).toBe('Satisfactory');
    expect(aqiLabel(150)).toBe('Moderate');
    expect(aqiLabel(250)).toBe('Poor');
    expect(aqiLabel(350)).toBe('Very Poor');
    expect(aqiLabel(450)).toBe('Severe');
  });

  it('should format numbers according to en-IN system', () => {
    expect(formatNumber(125)).toBe('125');
    expect(formatNumber(150000)).toBe('1.5L'); // compact notation in en-IN: 1.5 Lakhs
  });

  it('should calculate relativeTime correctly', () => {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

    expect(relativeTime(tenMinutesAgo)).toBe('10 minutes ago');
    expect(relativeTime(twoHoursAgo)).toBe('2 hours ago');
  });
});
