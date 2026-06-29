import { Activity, ArrowRight, BellRing, Building2, LogIn, Radar, Wind } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';

const highlights = [
  { title: 'Realtime AQI', text: 'Live city readings, health bands, and WebSocket updates.', icon: Activity },
  { title: 'AI-powered alerts', text: 'Correlated incidents and response intelligence for operators.', icon: BellRing },
  { title: 'Multi-city view', text: 'Compare city health, trends, and source signals quickly.', icon: Building2 },
];

export function LandingPage() {
  const { user, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to="/dashboard" replace />;

  const tryDemo = async () => {
    setError('');
    setLoading(true);
    try {
      await demoLogin();
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Demo login is unavailable. Please try the regular login.');
    } finally {
      setLoading(false);
    }
  };

  return <main className="landing-page">
    <section className="landing-hero">
      <div className="landing-nav"><span className="landing-brand"><span className="logo-mark"><Wind /></span>AirIQ</span><Link className="button ghost" to="/login"><LogIn />Login</Link></div>
      <div className="landing-copy">
        <span className="eyebrow">SMART CITY AIR INTELLIGENCE</span>
        <h1>AirIQ</h1>
        <p>Realtime AQI operations for cities that need fast environmental insight, clear alerts, and demo-ready response workflows.</p>
        <div className="landing-actions">
          <button className="button primary" onClick={tryDemo} disabled={loading}>{loading ? 'Entering demo...' : 'Try Demo'}<ArrowRight /></button>
          <Link className="button secondary" to="/login">Login</Link>
        </div>
        {error && <div className="form-error">{error}</div>}
      </div>
      <div className="landing-panel" aria-label="AirIQ live preview">
        <div><Radar /><span>DELHI GRID</span><strong>342 AQI</strong></div>
        <div><Activity /><span>WEBSOCKET</span><strong>LIVE</strong></div>
        <div><BellRing /><span>ALERTS</span><strong>5 unread</strong></div>
      </div>
    </section>
    <section className="landing-highlights">
      {highlights.map(({ title, text, icon: Icon }) => <article key={title}><Icon /><h2>{title}</h2><p>{text}</p></article>)}
    </section>
  </main>;
}
