import { beforeAll, describe, expect, it } from 'vitest';

let app;

beforeAll(async () => {
  process.env.DATABASE_FILE = './data/test-airiq.db';
  process.env.JWT_SECRET = 'test-secret-with-more-than-sixteen-chars';
  process.env.NODE_ENV = 'test';
  const { createApp } = await import('./app.js');
  app = await createApp();
});

async function request(path, options = {}) {
  const server = app.listen(0);
  const port = server.address().port;
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
      ...options,
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

describe('simplified Express API', () => {
  it('logs in and returns dashboard data', async () => {
    const login = await request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@airiq.local', password: 'Password123!' }),
    });
    expect(login.status).toBe(200);
    expect(login.body.accessToken).toBeTruthy();

    const overview = await request('/api/v1/dashboard/overview?cityId=delhi', {
      headers: { Authorization: `Bearer ${login.body.accessToken}` },
    });
    expect(overview.status).toBe(200);
    expect(overview.body.city.name).toBe('Delhi');
    expect(overview.body.forecasts.length).toBeGreaterThan(0);

    const alerts = await request('/api/v1/alerts?page=1&limit=1', {
      headers: { Authorization: `Bearer ${login.body.accessToken}` },
    });
    expect(alerts.status).toBe(200);
    expect(alerts.body.page).toBe(1);
    expect(alerts.body.limit).toBe(1);
    expect(alerts.body.total).toBeGreaterThan(0);

    const read = await request(`/api/v1/alerts/${alerts.body.data[0].id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${login.body.accessToken}` },
      body: JSON.stringify({}),
    });
    expect(read.status).toBe(200);
    expect(read.body.readAt).toBeTruthy();
  });
});
