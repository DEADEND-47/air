import { useState } from 'react';
import { ArrowRight, CheckCircle, KeyRound, LockKeyhole, Mail, Wind } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';

type Mode = 'request' | 'reset' | 'done';
const requestSchema = z.object({ email: z.string().email('Enter a valid email address') });
const resetSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/[A-Z]/, 'Password must contain an uppercase letter').regex(/[0-9]/, 'Password must contain a number'),
  confirmPassword: z.string().min(8, 'Confirm your password'),
}).refine((value) => value.password === value.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

export function PasswordResetPage() {
  const { user, sendPasswordReset, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tokenFromUrl = params.get('token');

  const [mode, setMode] = useState<Mode>(tokenFromUrl || user ? 'reset' : 'request');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const requestForm = useForm<z.infer<typeof requestSchema>>({ resolver: zodResolver(requestSchema), defaultValues: { email: '' } });
  const resetForm = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema), defaultValues: { password: '', confirmPassword: '' } });

  const handleRequest = requestForm.handleSubmit(async ({ email }) => {
    setError(''); setSubmitting(true);
    try {
      await sendPasswordReset(email);
      setInfo('If your account exists, a reset link has been sent. Check your email (or server logs in dev).');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to send reset email.');
    } finally {
      setSubmitting(false);
    }
  });

  const handleReset = resetForm.handleSubmit(async ({ password }) => {
    setError(''); setSubmitting(true);
    try {
      await resetPassword(tokenFromUrl ?? '', password);
      setMode('done');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Reset failed. The link may have expired.');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <main className="login-page">
      <section className="login-visual" aria-label="AirIQ platform introduction">
        <div className="login-grid" />
        <div className="login-orbit orbit-one" /><div className="login-orbit orbit-two" />
        <div className="login-brand"><span className="logo-mark"><Wind /></span><span>AirIQ</span></div>
        <div className="login-copy">
          <span className="eyebrow">ACCOUNT RECOVERY</span>
          <h1>Reset your<br />credentials.</h1>
          <p>Your security is our priority. All password resets are logged and monitored.</p>
        </div>
      </section>

      <section className="login-form-wrap">
        {mode === 'request' && (
          <form id="reset-request-form" className="login-form" onSubmit={handleRequest}>
            <div className="login-icon"><Mail /></div>
            <span className="eyebrow">PASSWORD RESET</span>
            <h2>Forgot your password?</h2>
            <p style={{ marginBottom: '1.5rem', opacity: 0.7, fontSize: '0.875rem' }}>
              Enter your email address and we'll send you a reset link.
            </p>

            {error && <div className="form-error" role="alert">{error}</div>}
            {info && <div className="form-success" role="status">{info}</div>}

            <label>
              Email address
              <input id="reset-email" type="email" autoComplete="email" placeholder="you@organization.in" {...requestForm.register('email')} />
              {requestForm.formState.errors.email && <small className="field-error">{requestForm.formState.errors.email.message}</small>}
            </label>

            <button id="reset-request-submit" className="button primary login-submit" disabled={submitting}>
              {submitting ? 'Sending...' : <><Mail size={16} /><span>Send Reset Link</span><ArrowRight /></>}
            </button>

            <div className="login-footer-links">
              <Link to="/login" className="link-btn">{'<-'} Back to login</Link>
            </div>
          </form>
        )}

        {mode === 'reset' && (
          <form id="reset-password-form" className="login-form" onSubmit={handleReset}>
            <div className="login-icon"><KeyRound /></div>
            <span className="eyebrow">SET NEW PASSWORD</span>
            <h2>Choose a new password</h2>
            <p style={{ marginBottom: '1.5rem', opacity: 0.7, fontSize: '0.875rem' }}>
              Must be at least 8 characters with one uppercase letter and one number.
            </p>

            {error && <div className="form-error" role="alert">{error}</div>}

            <label>
              New Password
              <div className="input-with-icon">
                <LockKeyhole />
                <input id="new-password" type="password" autoComplete="new-password" {...resetForm.register('password')} />
              </div>
              {resetForm.formState.errors.password && <small className="field-error">{resetForm.formState.errors.password.message}</small>}
            </label>

            <label>
              Confirm New Password
              <div className="input-with-icon">
                <LockKeyhole />
                <input id="confirm-password" type="password" autoComplete="new-password" {...resetForm.register('confirmPassword')} />
              </div>
              {resetForm.formState.errors.confirmPassword && <small className="field-error">{resetForm.formState.errors.confirmPassword.message}</small>}
            </label>

            <button id="reset-submit" className="button primary login-submit" disabled={submitting}>
              {submitting ? 'Updating...' : <><span>Set New Password</span><ArrowRight /></>}
            </button>
          </form>
        )}

        {mode === 'done' && (
          <div className="login-form" style={{ textAlign: 'center' }}>
            <div className="login-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', margin: '0 auto 1.5rem' }}>
              <CheckCircle />
            </div>
            <span className="eyebrow">SUCCESS</span>
            <h2>Password updated!</h2>
            <p style={{ marginBottom: '2rem', opacity: 0.7, fontSize: '0.875rem' }}>
              Your password has been reset. You can now sign in with the new password.
            </p>
            <button id="go-to-login" className="button primary login-submit" onClick={() => navigate('/login')}>
              <span>Sign In Now</span><ArrowRight />
            </button>
          </div>
        )}

        <footer>AirIQ Local Stack <span>-</span> Express <span>-</span> SQLite</footer>
      </section>
    </main>
  );
}
