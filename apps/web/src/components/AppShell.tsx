import { useState } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import {
  Activity,
  BellRing,
  Building2,
  ChevronDown,
  Cross,
  Gauge,
  LogOut,
  Menu,
  Moon,
  Radar,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Siren,
  Sun,
  Users,
  Wind,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useCity } from '../context/CityContext';

const navigation = [
  { to: '/', label: 'Command Center', icon: Gauge },
  { to: '/attribution', label: 'Attribution Engine', icon: Radar },
  { to: '/forecasting', label: 'Forecasting', icon: Activity },
  { to: '/health', label: 'Citizen Advisories', icon: Cross },
  { to: '/enforcement', label: 'Enforcement', icon: ShieldCheck },
  { to: '/cities', label: 'Multi-City View', icon: Building2 },
  { to: '/alerts', label: 'Alert Center', icon: Siren },
];

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('airiq-theme') ?? 'dark');
  const { user, logout } = useAuth();
  const { activeCityId, setActiveCityId, activeCity, cities } = useCity();
  const location = useLocation();

  const setCurrentTheme = (next: string) => {
    setTheme(next);
    localStorage.setItem('airiq-theme', next);
    document.documentElement.dataset.theme = next;
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="topbar">
        <button className="icon-button mobile-only" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu /></button>
        <NavLink to="/" className="wordmark" aria-label="AirIQ home"><LogoMark /><span>AirIQ</span></NavLink>
        <div className="global-search">
          <Search aria-hidden="true" />
          <label className="sr-only" htmlFor="global-search">Search AirIQ</label>
          <input id="global-search" type="search" placeholder="Search coordinates, wards, nodes..." />
          <kbd>⌘ K</kbd>
        </div>
        <div className="topbar-actions">
          <select
            className="city-selector"
            value={activeCityId}
            onChange={(e) => setActiveCityId(e.target.value)}
            style={{
              background: 'var(--card)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '0.4rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
              fontFamily: 'inherit',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
          <div className="live-pill"><span />LIVE</div>
          <button className="icon-button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} onClick={() => setCurrentTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun /> : <Moon />}</button>
          <NavLink to="/alerts" className="icon-button notification-button" aria-label="View alerts"><BellRing /><span className="notification-dot" /></NavLink>
          <div style={{ position: 'relative' }}>
            <button
              className="operator-menu"
              aria-label="Open operator menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <img src="/images/operator.jpg" alt="" />
              <span><strong>{user?.name ?? 'Operator'}</strong><small>{user?.role.replaceAll('_', ' ')}</small></span>
              <ChevronDown aria-hidden="true" style={{ transform: menuOpen ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} />
            </button>
            {menuOpen && (
              <div
                style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '0.5rem',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.35)', zIndex: 200,
                  minWidth: '200px',
                }}
              >
                <Link
                  to="/sessions"
                  onClick={() => setMenuOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', borderRadius: '6px', textDecoration: 'none', color: 'inherit', fontSize: '0.875rem' }}
                >
                  <Shield size={15} /> Active Sessions
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', borderRadius: '6px', textDecoration: 'none', color: 'inherit', fontSize: '0.875rem' }}
                >
                  <Settings size={15} /> Settings
                </Link>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.35rem 0' }} />
                <button
                  onClick={() => { setMenuOpen(false); void logout(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', borderRadius: '6px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.875rem', width: '100%' }}
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`} aria-label="Primary navigation">
        <div className="mobile-sidebar-heading mobile-only"><span className="wordmark"><LogoMark />AirIQ</span><button className="icon-button" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X /></button></div>
        <div className="terminal-label">
          <span>OPS CONSOLE</span>
          <strong>{(activeCity?.name ?? 'Delhi').toUpperCase()} / {(activeCity?.state ?? 'NCR').toUpperCase()}</strong>
          <small>NODE AX-{(activeCityId ?? 'delhi').slice(0, 3).toUpperCase()}-992</small>
        </div>
        <nav>
          {navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon aria-hidden="true" /><span>{label}</span></NavLink>)}
        </nav>
        <div className="sidebar-spacer" />
        <NavLink className="nav-item" to="/admin"><Users aria-hidden="true" /><span>Team & Access</span></NavLink>
        <NavLink className="nav-item" to="/settings"><Settings aria-hidden="true" /><span>System Settings</span></NavLink>
        <button className="nav-item logout" onClick={logout}><LogOut aria-hidden="true" /><span>Sign out</span></button>
        <div className="system-health"><div><span className="health-dot" />Systems nominal</div><small>18 / 18 feeds online</small></div>
      </aside>
      {mobileOpen && <button className="sidebar-scrim mobile-only" aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} />}

      <main id="main-content" className="main-content" key={location.pathname}>
        <Outlet />
      </main>
    </div>
  );
}

function LogoMark() {
  return <span className="logo-mark" aria-hidden="true"><Wind /></span>;
}
