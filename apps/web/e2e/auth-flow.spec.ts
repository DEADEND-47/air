import { test, expect } from '@playwright/test';

test.describe('AirIQ E2E Operations Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept and mock backend API requests for hermetic execution
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'mock-jwt-token-123',
          refreshToken: 'mock-refresh-token-123',
          expiresIn: 3600,
          user: { id: 'usr-admin', email: 'admin@airiq.local', name: 'Admin User', role: 'admin', active: true }
        }),
      });
    });

    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'usr-admin', email: 'admin@airiq.local', name: 'Admin User', role: 'admin', active: true }
        }),
      });
    });

    await page.route('**/api/v1/dashboard/overview**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          city: { id: 'delhi', name: 'Delhi', state: 'NCT', latitude: 28.6, longitude: 77.2, aqi: 342, pm25: 320, pm10: 410, no2: 85, trend: 'up', updatedAt: new Date().toISOString() },
          forecastDelta: 18,
          activeAlerts: 3,
          enforcementActions: 2,
          citizensAlerted: 428190,
          sensorUptime: 99.4,
          readings: [
            { id: '1', sensorId: 'DL-001', cityId: 'delhi', ward: 'Anand Vihar', latitude: 28.6, longitude: 77.2, aqi: 378, pm25: 350, pm10: 420, no2: 90, temperature: 30, humidity: 60, observedAt: new Date().toISOString() }
          ],
          forecasts: [
            { cityId: 'delhi', ward: 'Citywide', horizonHours: 6, predictedAqi: 360, lowerBound: 340, upperBound: 380, confidence: 0.9, predictedAt: new Date().toISOString(), drivers: ['wind speed'] }
          ],
          attribution: {
            cityId: 'delhi',
            ward: 'Citywide',
            generatedAt: new Date().toISOString(),
            confidence: 0.87,
            sources: [
              { source: 'Vehicular traffic', contribution: 45, direction: 'rising' },
              { source: 'Road dust', contribution: 30, direction: 'stable' }
            ],
            explanation: 'Traffic is trapping emissions.',
          },
          insight: 'Traffic is the main source today.',
        }),
      });
    });

    await page.route('**/api/v1/cities', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'delhi', name: 'Delhi', state: 'NCT', latitude: 28.6, longitude: 77.2, aqi: 342, pm25: 320, pm10: 410, no2: 85, trend: 'up', updatedAt: new Date().toISOString() }
          ]
        }),
      });
    });

    await page.route('**/api/v1/alerts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.route('**/api/v1/advisories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.route('**/api/v1/enforcement', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });
  });

  test('should navigate to login page, authenticate successfully, and render dashboard', async ({ page }) => {
    // 1. Visit landing page
    await page.goto('/');

    // 2. Expect redirection to /login (because tokenStore is empty)
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('h2')).toContainText('Enter command center');

    // 3. Fill in operator credentials (default values are pre-filled in UI)
    await page.fill('input[type="email"]', 'admin@airiq.local');
    await page.fill('input[type="password"]', 'Password123!');

    // 4. Click login submit button
    await page.click('button.login-submit');

    // 5. Verify redirection to home dashboard and rendering of overview metrics
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('h1')).toContainText('Delhi Air Operations');
    await expect(page.locator('.metric-card >> text=CURRENT AQI')).toBeVisible();
    await expect(page.locator('.metric-card >> text=342')).toBeVisible();
  });
});
