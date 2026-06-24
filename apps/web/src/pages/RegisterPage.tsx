import { useState, type FormEvent, type ChangeEvent } from 'react';
import { ArrowRight, CheckCircle, KeyRound, UserPlus, Wind } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';

type Step = 'details' | 'verify';

export function RegisterPage() {
  const { user, register, verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return 'At least 8 characters';
    if (!/[A-Z]/.test(pw)) return 'At least one uppercase letter';
    if (!/[0-9]/.test(pw)) return 'At least one number';
    return null;
  };

  const passwordStrength = (): { label: string; color: string } => {
    const issues = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[0-9]/.test(password),
      password.length >= 12,
    ].filter(Boolean).length;
    if (issues <= 1) return { label: 'Weak', color: '#ef4444' };
    if (issues === 2) return { label: 'Fair', color: '#f97316' };
    if (issues === 3) return { label: 'Good', color: '#eab308' };
    return { label: 'Strong', color: '#22c55e' };
  };

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const pwError = validatePassword(password);
    if (pwError) { setError(`Password: ${pwError}`); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      setStep('verify');
      setInfo(`A 6-digit verification code was sent to ${email}. Check your inbox (or server logs in dev mode).`);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await verifyEmail(email, otpCode);
      navigate('/login', { state: { registered: true } });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Verification failed. Check your code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError(''); setInfo('');
    try {
      await resendVerification(email);
      setInfo('A new code has been sent to your email.');
    } catch {
      setError('Unable to resend. Please wait a moment and try again.');
    }
  };

  const strength = passwordStrength();

  return (
    <main className="login-page">
      <section className="login-visual" aria-label="AirIQ platform introduction">
        <div className="login-grid" />
        <div className="login-orbit orbit-one" /><div className="login-orbit orbit-two" />
        <div className="login-brand"><span className="logo-mark"><Wind /></span><span>AirIQ</span></div>
        <div className="login-copy">
          <span className="eyebrow">JOIN THE PLATFORM</span>
          <h1>Monitor cities.<br />Drive action.</h1>
          <p>Create your AirIQ account to access real-time pollution data, AI forecasts, and enforcement workflows.</p>
        </div>
      </section>

      <section className="login-form-wrap">
        {step === 'details' ? (
          <form id="register-form" className="login-form" onSubmit={handleRegister}>
            <div className="login-icon"><UserPlus /></div>
            <span className="eyebrow">CREATE ACCOUNT</span>
            <h2>Get started with AirIQ</h2>
            <p style={{ marginBottom: '1.5rem', opacity: 0.7, fontSize: '0.875rem' }}>
              Fill in your details. We'll send a verification code to your email.
            </p>

            {error && <div className="form-error" role="alert">{error}</div>}

            <label>
              Full Name
              <input id="reg-name" type="text" autoComplete="name" value={name} onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} required minLength={2} maxLength={100} placeholder="Aarav Mehta" />
            </label>

            <label>
              Email address
              <input id="reg-email" type="email" autoComplete="email" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} required placeholder="you@organization.in" />
            </label>

            <label>
              Password
              <input id="reg-password" type="password" autoComplete="new-password" value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} required minLength={8} placeholder="Min 8 chars, 1 uppercase, 1 number" />
            </label>

            {password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{
                      width: `${(['Weak', 'Fair', 'Good', 'Strong'].indexOf(strength.label) + 1) * 25}%`,
                      background: strength.color,
                    }}
                  />
                </div>
                <span style={{ color: strength.color, fontSize: '0.75rem' }}>{strength.label}</span>
              </div>
            )}

            <label>
              Confirm Password
              <input id="reg-confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)} required minLength={8} />
            </label>

            {confirmPassword && confirmPassword !== password && (
              <small style={{ color: '#ef4444', display: 'block', marginTop: '-0.5rem' }}>Passwords don't match</small>
            )}

            <button id="register-submit" className="button primary login-submit" disabled={submitting}>
              {submitting ? 'Creating account…' : <><UserPlus size={16} /><span>Create Account</span><ArrowRight size={16} /></>}
            </button>

            <div className="login-footer-links">
              <span>Already have an account?</span>
              <Link to="/login" className="link-btn">Sign in →</Link>
            </div>
          </form>
        ) : (
          <form id="verify-form" className="login-form" onSubmit={handleVerify}>
            <div className="login-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <CheckCircle />
            </div>
            <span className="eyebrow">VERIFY YOUR EMAIL</span>
            <h2>Check your inbox</h2>

            {info && <div className="form-success" role="status">{info}</div>}
            {error && <div className="form-error" role="alert">{error}</div>}

            <label>
              6-Digit Verification Code
              <div className="input-with-icon">
                <KeyRound />
                <input
                  id="verify-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            </label>

            <button id="verify-submit" className="button primary login-submit" disabled={submitting || otpCode.length !== 6}>
              {submitting ? 'Verifying…' : <><span>Verify &amp; Continue</span><ArrowRight /></>}
            </button>

            <div className="login-alt-actions">
              <button type="button" className="link-btn" onClick={handleResend}>
                Didn't receive a code? Resend
              </button>
              <button type="button" className="link-btn" onClick={() => { setStep('details'); setError(''); setInfo(''); }}>
                ← Back to edit details
              </button>
            </div>
          </form>
        )}

        <footer>AirIQ Control Plane <span>•</span> Build 1.0.0 <span>•</span> Encrypted</footer>
      </section>
    </main>
  );
}
