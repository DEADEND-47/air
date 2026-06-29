import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { AppShell } from './components/AppShell';
import { LoadingState } from './components/Ui';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PasswordResetPage } from './pages/PasswordResetPage';
import { AdminPage, AlertsPage, AttributionPage, CitiesPage, DashboardPage, EnforcementPage, ForecastingPage, HealthPage, HistoricalPage, NotFoundPage, SettingsPage } from './pages/Screens';

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <main className="full-state"><LoadingState label="Verifying secure operator session" /></main>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <AppShell />;
}

export function App() {
  return <Routes>
    {/* Public auth routes */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/reset-password" element={<PasswordResetPage />} />

    {/* Protected routes */}
    <Route element={<ProtectedLayout />}>
      <Route index element={<DashboardPage />} />
      <Route path="attribution" element={<AttributionPage />} />
      <Route path="forecasting" element={<ForecastingPage />} />
      <Route path="health" element={<HealthPage />} />
      <Route path="enforcement" element={<EnforcementPage />} />
      <Route path="cities" element={<CitiesPage />} />
      <Route path="alerts" element={<AlertsPage />} />
      <Route path="historical" element={<HistoricalPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="admin" element={<AdminPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>;
}
