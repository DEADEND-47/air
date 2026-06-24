import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { DashboardOverview, City, Alert, Correlation, User, EnforcementCase, Advisory } from '../lib/types';
import {
  DashboardPage,
  AttributionPage,
  ForecastingPage,
  HealthPage,
  EnforcementPage,
  CitiesPage,
  AlertsPage,
  SettingsPage,
  AdminPage,
  NotFoundPage,
} from './Screens';
import { AuthProvider } from '../auth/AuthContext';
import { CityProvider } from '../context/CityContext';

// Mock charts and maps to avoid JSDOM rendering issues
vi.mock('../components/Charts', () => ({
  AttributionBars: () => <div data-testid="AttributionBars" />,
  ForecastChart: () => <div data-testid="ForecastChart" />,
  ConfidenceChart: () => <div data-testid="ConfidenceChart" />,
  CityTrendChart: () => <div data-testid="CityTrendChart" />,
  ContributionComparison: () => <div data-testid="ContributionComparison" />,
}));

vi.mock('../components/MapPanel', () => ({
  MapPanel: () => <div data-testid="MapPanel" />,
}));

vi.mock('../lib/api', () => ({
  api: {
    overview: vi.fn(),
    attribution: vi.fn(),
    advisories: vi.fn(),
    createAdvisory: vi.fn(),
    enforcement: vi.fn(),
    generateEnforcement: vi.fn(),
    updateEnforcement: vi.fn(),
    cities: vi.fn(),
    alerts: vi.fn(),
    correlateAlerts: vi.fn(),
    updateAlert: vi.fn(),
    users: vi.fn(),
  },
  tokenStore: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
  },
  refreshStore: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
  },
  sessionStore: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
  },
}));

describe('Screens & Dashboards Page Render', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.resetAllMocks();
    vi.mocked(api.cities).mockResolvedValue([
      { id: 'delhi', name: 'Delhi', state: 'NCT', latitude: 28.6, longitude: 77.2, aqi: 342, pm25: 320, pm10: 410, no2: 85, trend: 'up' as const, updatedAt: new Date().toISOString() }
    ]);
    vi.mocked(api.overview).mockResolvedValue({
      city: { id: 'delhi', name: 'Delhi', state: 'NCT', latitude: 28.6, longitude: 77.2, aqi: 342, pm25: 320, pm10: 410, no2: 85, trend: 'up' as const, updatedAt: new Date().toISOString() },
      forecastDelta: 18,
      activeAlerts: 3,
      enforcementActions: 2,
      citizensAlerted: 428190,
      sensorUptime: 99.4,
      readings: [
        { id: '1', sensorId: 'DL-001', cityId: 'delhi', ward: 'Anand Vihar', latitude: 28.6, longitude: 77.2, aqi: 378, pm25: 350, pm10: 420, no2: 90, temperature: 30, humidity: 60, observedAt: new Date().toISOString() }
      ],
      forecasts: [
        { cityId: 'delhi', ward: 'Citywide', horizonHours: 6, predictedAqi: 360, lowerBound: 340, upperBound: 380, confidence: 0.9, predictedAt: new Date().toISOString(), drivers: [] }
      ],
      attribution: {
        cityId: 'delhi',
        ward: 'Citywide',
        generatedAt: new Date().toISOString(),
        confidence: 0.87,
        sources: [{ source: 'Vehicular traffic', contribution: 45, direction: 'rising' as const }],
        explanation: 'Traffic congestion is trapping emissions.',
      },
      insight: 'Traffic is the main source today.',
    });
  });

  const wrap = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <CityProvider>{ui}</CityProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('should render DashboardPage with live statistics', async () => {
    const mockOverview: DashboardOverview = {
      city: { id: 'delhi', name: 'Delhi', state: 'NCT', latitude: 28.6, longitude: 77.2, aqi: 342, pm25: 320, pm10: 410, no2: 85, trend: 'up' as const, updatedAt: new Date().toISOString() },
      forecastDelta: 18,
      activeAlerts: 3,
      enforcementActions: 2,
      citizensAlerted: 428190,
      sensorUptime: 99.4,
      readings: [
        { id: '1', sensorId: 'DL-001', cityId: 'delhi', ward: 'Anand Vihar', latitude: 28.6, longitude: 77.2, aqi: 378, pm25: 350, pm10: 420, no2: 90, temperature: 30, humidity: 60, observedAt: new Date().toISOString() }
      ],
      forecasts: [
        { cityId: 'delhi', ward: 'Citywide', horizonHours: 6, predictedAqi: 360, lowerBound: 340, upperBound: 380, confidence: 0.9, predictedAt: new Date().toISOString(), drivers: [] }
      ],
      attribution: {
        cityId: 'delhi',
        ward: 'Citywide',
        generatedAt: new Date().toISOString(),
        confidence: 0.87,
        sources: [{ source: 'Vehicular traffic', contribution: 45, direction: 'rising' as const }],
        explanation: 'Traffic congestion is trapping emissions.',
      },
      insight: 'Traffic is the main source today.',
    };

    vi.mocked(api.overview).mockResolvedValue(mockOverview);

    wrap(<DashboardPage />);

    expect(screen.getByText('Synchronizing intelligence feeds')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Delhi Air Operations')).toBeInTheDocument();
      expect(screen.getByText('CURRENT AQI')).toBeInTheDocument();
      expect(screen.getByText('342')).toBeInTheDocument();
      expect(screen.getByText('4.3L')).toBeInTheDocument();
    });
  });

  it('should render AttributionPage and allow running analysis', async () => {
    const mockOverview = {
      readings: [],
      attribution: {
        cityId: 'delhi',
        ward: 'Citywide',
        generatedAt: new Date().toISOString(),
        confidence: 0.87,
        sources: [{ source: 'Vehicular traffic', contribution: 45, direction: 'rising' }],
        explanation: 'Traffic congestion is trapping emissions.',
      },
    };

    vi.mocked(api.overview).mockResolvedValue(mockOverview as unknown as DashboardOverview);

    wrap(<AttributionPage />);

    await waitFor(() => {
      expect(screen.getByText('Source Intelligence')).toBeInTheDocument();
      expect(screen.getByText('Traffic congestion is trapping emissions.')).toBeInTheDocument();
      expect(screen.getByText('Run new analysis')).toBeInTheDocument();
    });
  });

  it('should render ForecastingPage with correct parameters', async () => {
    const mockOverview = {
      readings: [{ id: '1', sensorId: 'DL-01', cityId: 'delhi', ward: 'Anand Vihar', latitude: 28.6, longitude: 77.2, aqi: 342, pm25: 320, pm10: 410, no2: 85, temperature: 30, humidity: 60, observedAt: new Date().toISOString() }],
      forecastDelta: 18,
      forecasts: [
        { cityId: 'delhi', ward: 'Citywide', horizonHours: 24, predictedAqi: 360, lowerBound: 340, upperBound: 380, confidence: 0.9, predictedAt: new Date().toISOString(), drivers: ['wind speed'] }
      ],
    };

    vi.mocked(api.overview).mockResolvedValue(mockOverview as unknown as DashboardOverview);

    wrap(<ForecastingPage />);

    await waitFor(() => {
      expect(screen.getByText('Atmospheric Outlook')).toBeInTheDocument();
      expect(screen.getByText('360')).toBeInTheDocument();
      expect(screen.getByText('340–380')).toBeInTheDocument();
      expect(screen.getByText('wind speed')).toBeInTheDocument();
    });
  });

  it('should render HealthPage with active broadcasts', async () => {
    const mockAdvisories: Advisory[] = [
      { id: 'adv-1', cityId: 'delhi', ward: 'East Delhi', severity: 'critical' as const, audience: ['children'], channels: ['sms' as const], message: 'Air is bad.', status: 'published' as const, reach: 250000, createdAt: new Date().toISOString(), publishedAt: new Date().toISOString() }
    ];

    vi.mocked(api.advisories).mockResolvedValue(mockAdvisories);

    wrap(<HealthPage />);

    await waitFor(() => {
      expect(screen.getByText('Health Advisory Command')).toBeInTheDocument();
      expect(screen.getByText('East Delhi')).toBeInTheDocument();
      expect(screen.getByText('Air is bad.')).toBeInTheDocument();
      expect(screen.getByText('2.5L')).toBeInTheDocument();
    });
  });

  it('should render EnforcementPage queue matrix', async () => {
    const mockCases = [
      { id: 'case-1', cityId: 'delhi', ward: 'Okhla', target: 'Industrial cluster', category: 'Industrial emissions', priority: 96, evidenceScore: 0.92, estimatedImpact: 18.4, status: 'queued', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];

    vi.mocked(api.enforcement).mockResolvedValue(mockCases as unknown as EnforcementCase[]);

    wrap(<EnforcementPage />);

    await waitFor(() => {
      expect(screen.getByText('Prioritized Target Matrix')).toBeInTheDocument();
      expect(screen.getByText('Industrial cluster')).toBeInTheDocument();
      expect(screen.getByText('Okhla')).toBeInTheDocument();
    });
  });

  it('should render CitiesPage comparisons', async () => {
    const mockCities = [
      { id: 'delhi', name: 'Delhi', state: 'NCT', latitude: 28.6, longitude: 77.2, aqi: 342, pm25: 320, pm10: 410, no2: 85, trend: 'up', updatedAt: new Date().toISOString() },
      { id: 'mumbai', name: 'Mumbai', state: 'MH', latitude: 19.0, longitude: 72.8, aqi: 215, pm25: 200, pm10: 250, no2: 60, trend: 'down', updatedAt: new Date().toISOString() }
    ];

    vi.mocked(api.cities).mockResolvedValue(mockCities as unknown as City[]);

    wrap(<CitiesPage />);

    await waitFor(() => {
      expect(screen.getByText('National Air Picture')).toBeInTheDocument();
      expect(screen.getAllByText('Delhi')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Mumbai')[0]).toBeInTheDocument();
    });
  });

  it('should render AlertsPage feed', async () => {
    const mockAlerts = [
      { id: 'alert-1', cityId: 'delhi', ward: 'Anand Vihar', title: 'PM spike', description: 'Plume detected.', severity: 'critical', status: 'open', source: 'Sensor', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
    const mockCorrelations = {
      clusters: [{ id: 'cluster-1', alertIds: ['alert-1'], summary: 'Correlated plume', severity: 'critical', confidence: 0.95 }]
    };

    vi.mocked(api.alerts).mockResolvedValue(mockAlerts as unknown as Alert[]);
    vi.mocked(api.correlateAlerts).mockResolvedValue(mockCorrelations as unknown as Correlation);

    wrap(<AlertsPage />);

    await waitFor(() => {
      expect(screen.getByText('Mission Feed')).toBeInTheDocument();
      expect(screen.getByText('PM spike')).toBeInTheDocument();
      expect(screen.getByText('Correlated plume')).toBeInTheDocument();
    });
  });

  it('should render SettingsPage choices', () => {
    wrap(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Default city')).toBeInTheDocument();
    expect(screen.getByText('Critical AQI incidents')).toBeInTheDocument();
  });

  it('should render AdminPage operators table', async () => {
    const mockUsers = [
      { id: 'usr-1', email: 'admin@airiq.city', name: 'Aarav Mehta', role: 'city_admin', active: true }
    ];

    vi.mocked(api.users).mockResolvedValue(mockUsers as unknown as User[]);

    wrap(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Team & Access')).toBeInTheDocument();
      expect(screen.getByText('Aarav Mehta')).toBeInTheDocument();
      expect(screen.getByText('admin@airiq.city')).toBeInTheDocument();
    });
  });

  it('should render NotFoundPage layout', () => {
    wrap(<NotFoundPage />);
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Signal not found')).toBeInTheDocument();
  });
});
