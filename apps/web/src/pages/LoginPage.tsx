import { useState } from 'react';
import { Activity, ArrowRight, LockKeyhole, ShieldCheck, Wind } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: 'admin@airiq.local', password: 'Password123!' } });

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = form.handleSubmit(async (values) => {
    setError('');
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to reach the AirIQ API');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <main className="login-page">
      <section className="login-visual" aria-label="AirIQ platform introduction">
        <div className="login-grid" />
        <div className="login-brand"><span className="logo-mark"><Wind /></span><span>AirIQ</span></div>
        <div className="login-copy">
          <span className="eyebrow">URBAN AIR DASHBOARD</span>
          <h1>See the air.<br />Shape the response.</h1>
          <p>A simple local dashboard for AQI readings, forecasts, alerts, advisories, and enforcement workflows.</p>
        </div>
        <div className="login-signal"><Activity /><div><span>LOCAL DEV</span><strong>Express + SQLite API</strong></div><i /></div>
      </section>

      <section className="login-form-wrap">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-icon"><ShieldCheck /></div>
          <span className="eyebrow">SIGN IN</span>
          <h2>Enter AirIQ</h2>
          <p>Use a seeded local account or create your own operator profile.</p>

          {error && <div className="form-error" role="alert">{error}</div>}

          <label>
            Email address
            <input type="email" autoComplete="username" {...form.register('email')} />
            {form.formState.errors.email && <small className="field-error">{form.formState.errors.email.message}</small>}
          </label>

          <label>
            Password
            <div className="input-with-icon">
              <LockKeyhole />
              <input type="password" autoComplete="current-password" {...form.register('password')} />
            </div>
            {form.formState.errors.password && <small className="field-error">{form.formState.errors.password.message}</small>}
          </label>

          <div className="login-options">
            <Link to="/reset-password" className="forgot-link">Forgot password?</Link>
          </div>

          <button className="button primary login-submit" disabled={submitting}>
            {submitting ? 'Signing in...' : <><span>Continue</span><ArrowRight /></>}
          </button>

          <div className="login-footer-links">
            <span>No account?</span>
            <Link to="/register" className="link-btn">Create one</Link>
          </div>

          <small className="demo-note">Demo: <strong>admin@airiq.local</strong> / <strong>Password123!</strong></small>
        </form>
        <footer>AirIQ Local Stack <span>-</span> Express <span>-</span> SQLite</footer>
      </section>
    </main>
  );
}
