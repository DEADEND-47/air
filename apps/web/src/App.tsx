import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { AppShell } from './components/AppShell';
import { LoadingState } from './components/Ui';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PasswordResetPage } from './pages/PasswordResetPage';
import { LandingPage } from './pages/LandingPage';
import { AdminAuditPage, AdminPage, AlertsPage, AttributionPage, CitiesPage, DashboardPage, EnforcementPage, ForecastingPage, HealthPage, NotFoundPage, ProfilePage, SettingsPage } from './pages/Screens';

const ComparePage = lazy(() => import('./pages/ComparePage'));
const HistoricalPage = lazy(() => import('./pages/HistoricalDataPage'));

function LazyScreen({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<main className="full-state"><LoadingState label="Loading AirIQ module" /></main>}>{children}</Suspense>;
}

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <main className="full-state"><LoadingState label="Verifying secure operator session" /></main>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <AppShell />;
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

export function App() {
  return <Routes>
    {/* Public auth routes */}
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/reset-password" element={<PasswordResetPage />} />

    {/* Protected routes */}
    <Route element={<ProtectedLayout />}>
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="attribution" element={<AttributionPage />} />
      <Route path="forecasting" element={<ForecastingPage />} />
      <Route path="health" element={<HealthPage />} />
      <Route path="enforcement" element={<EnforcementPage />} />
      <Route path="cities" element={<CitiesPage />} />
      <Route path="compare" element={<LazyScreen><ComparePage /></LazyScreen>} />
      <Route path="alerts" element={<AlertsPage />} />
      <Route path="historical" element={<LazyScreen><HistoricalPage /></LazyScreen>} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="admin" element={<AdminOnly><AdminPage /></AdminOnly>} />
      <Route path="admin/audit" element={<AdminOnly><AdminAuditPage /></AdminOnly>} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>;
}
