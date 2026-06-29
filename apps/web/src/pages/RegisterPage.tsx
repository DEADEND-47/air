import { useState } from 'react';
import { ArrowRight, UserPlus, Wind } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm your password'),
}).refine((value) => value.password === value.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<RegisterForm>({ resolver: zodResolver(registerSchema), defaultValues: { name: '', email: '', password: '', confirmPassword: '' } });

  if (user) return <Navigate to="/" replace />;

  const handleRegister = form.handleSubmit(async (values) => {
    setError('');
    setSubmitting(true);
    try {
      await register(values.name, values.email, values.password);
      navigate('/', { replace: true });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Registration failed');
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
          <span className="eyebrow">CREATE ACCOUNT</span>
          <h1>Start simple.<br />Stay useful.</h1>
          <p>New users are created with the viewer role. Admins can change roles from the backend seed or database.</p>
        </div>
      </section>

      <section className="login-form-wrap">
        <form className="login-form" onSubmit={handleRegister}>
          <div className="login-icon"><UserPlus /></div>
          <span className="eyebrow">REGISTER</span>
          <h2>Create your account</h2>

          {error && <div className="form-error" role="alert">{error}</div>}

          <label>
            Full name
            <input type="text" autoComplete="name" {...form.register('name')} />
            {form.formState.errors.name && <small className="field-error">{form.formState.errors.name.message}</small>}
          </label>
          <label>
            Email address
            <input type="email" autoComplete="email" {...form.register('email')} />
            {form.formState.errors.email && <small className="field-error">{form.formState.errors.email.message}</small>}
          </label>
          <label>
            Password
            <input type="password" autoComplete="new-password" {...form.register('password')} />
            {form.formState.errors.password && <small className="field-error">{form.formState.errors.password.message}</small>}
          </label>
          <label>
            Confirm password
            <input type="password" autoComplete="new-password" {...form.register('confirmPassword')} />
            {form.formState.errors.confirmPassword && <small className="field-error">{form.formState.errors.confirmPassword.message}</small>}
          </label>

          <button className="button primary login-submit" disabled={submitting}>
            {submitting ? 'Creating...' : <><UserPlus size={16} /><span>Create account</span><ArrowRight size={16} /></>}
          </button>

          <div className="login-footer-links">
            <span>Already have an account?</span>
            <Link to="/login" className="link-btn">Sign in</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
