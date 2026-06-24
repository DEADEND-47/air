import { useState, type FormEvent } from 'react';
import { Activity, ArrowRight, KeyRound, LockKeyhole, Mail, ShieldCheck, Wind } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';

type LoginMode = 'password' | 'otp-request' | 'otp-verify';

export function LoginPage() {
  const { user, login, sendLoginOtp, loginWithOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<LoginMode>('password');
  const [email, setEmail] = useState('admin@airiq.city');
  const [password, setPassword] = useState('AirIQ!2026');
  const [otpCode, setOtpCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const redirectAfterLogin = () => navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true });

  const handlePasswordLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await login(email, password, rememberMe);
      redirectAfterLogin();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to reach the AirIQ control plane');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOtp = async (event: FormEvent) => {
    event.preventDefault();
    setError(''); setInfo(''); setSubmitting(true);
    try {
      await sendLoginOtp(email);
      setMode('otp-verify');
      setInfo('A 6-digit code has been sent to your email.');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to send OTP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await loginWithOtp(email, otpCode);
      redirectAfterLogin();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Invalid OTP code');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-visual" aria-label="AirIQ platform introduction">
        <div className="login-grid" />
        <div className="login-orbit orbit-one" /><div className="login-orbit orbit-two" />
        <div className="login-brand"><span className="logo-mark"><Wind /></span><span>AirIQ</span></div>
        <div className="login-copy">
          <span className="eyebrow">URBAN INTELLIGENCE PLATFORM</span>
          <h1>See the air.<br />Shape the response.</h1>
          <p>One operational picture for pollution forecasting, source attribution, enforcement, and citizen health.</p>
        </div>
        <div className="login-signal"><Activity /><div><span>DELHI GRID / LIVE</span><strong>18 sensor feeds synchronized</strong></div><i /></div>
      </section>

      <section className="login-form-wrap">
        <form
          className="login-form"
          onSubmit={mode === 'password' ? handlePasswordLogin : mode === 'otp-request' ? handleSendOtp : handleOtpLogin}
        >
          <div className="login-icon"><ShieldCheck /></div>
          <span className="eyebrow">SECURE OPERATOR ACCESS</span>

          {mode === 'password' && <h2>Enter command center</h2>}
          {mode === 'otp-request' && <h2>Passwordless Login</h2>}
          {mode === 'otp-verify' && <h2>Enter your code</h2>}

          <p style={{ marginBottom: '1.5rem', opacity: 0.7, fontSize: '0.875rem' }}>
            {mode === 'password' && 'Authenticate with your AirIQ operations account.'}
            {mode === 'otp-request' && 'We\'ll email you a 6-digit login code.'}
            {mode === 'otp-verify' && `Code sent to ${email}. Check your inbox (or server logs in dev).`}
          </p>

          {error && <div className="form-error" role="alert">{error}</div>}
          {info && <div className="form-success" role="status">{info}</div>}

          {(mode === 'password' || mode === 'otp-request') && (
            <label>
              Email address
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
          )}

          {mode === 'password' && (
            <>
              <label>
                Password
                <div className="input-with-icon">
                  <LockKeyhole />
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
              </label>

              <div className="login-options">
                <label className="checkbox-label">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me for 7 days</span>
                </label>
                <Link to="/reset-password" className="forgot-link">Forgot password?</Link>
              </div>
            </>
          )}

          {mode === 'otp-verify' && (
            <label>
              6-Digit Code
              <div className="input-with-icon">
                <KeyRound />
                <input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            </label>
          )}

          <button id="login-submit" className="button primary login-submit" disabled={submitting}>
            {submitting
              ? 'Connecting…'
              : mode === 'password' ? <><span>Continue to AirIQ</span><ArrowRight /></>
              : mode === 'otp-request' ? <><Mail size={16} /><span>Send Login Code</span></>
              : <><span>Verify &amp; Login</span><ArrowRight /></>
            }
          </button>

          {/* Mode switcher */}
          <div className="login-alt-actions">
            {mode !== 'password' && (
              <button type="button" className="link-btn" onClick={() => { setMode('password'); setError(''); setInfo(''); }}>
                ← Back to password login
              </button>
            )}
            {mode === 'password' && (
              <button type="button" className="link-btn" onClick={() => { setMode('otp-request'); setError(''); }}>
                Login with email code instead
              </button>
            )}
            {mode === 'otp-verify' && (
              <button type="button" className="link-btn" onClick={() => handleSendOtp({ preventDefault: () => {} } as FormEvent)}>
                Resend code
              </button>
            )}
          </div>

          {/* Register & demo links */}
          <div className="login-footer-links">
            <span>No account?</span>
            <Link to="/register" className="link-btn">Create one →</Link>
          </div>

          <small className="demo-note">
            Demo: <strong>admin@airiq.city</strong> / <strong>AirIQ!2026</strong>
          </small>
        </form>
        <footer>AirIQ Control Plane <span>•</span> Build 1.0.0 <span>•</span> Encrypted</footer>
      </section>
    </main>
  );
}
