import { useEffect, useState } from 'react';
import { Laptop, Monitor, Shield, Smartphone, Trash2 } from 'lucide-react';
import { api, type SessionInfo } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { sessionStore } from '../lib/api';

function DeviceIcon({ userAgent }: { userAgent?: string }) {
  const ua = userAgent?.toLowerCase() ?? '';
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return <Smartphone size={18} />;
  if (ua.includes('tablet') || ua.includes('ipad')) return <Monitor size={18} />;
  return <Laptop size={18} />;
}

function formatRelative(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function SessionsPage() {
  const { logout } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);

  const currentSid = sessionStore.get();

  const loadSessions = async () => {
    setLoading(true); setError('');
    try {
      const data = await api.sessions();
      // Sort: current first, then by lastActiveAt
      setSessions(data.sort((a, b) => (a.isCurrent ? -1 : b.isCurrent ? 1 : new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime())));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadSessions(); }, []);

  const handleRevoke = async (sessionId: string, isCurrent: boolean) => {
    if (isCurrent) {
      // Signing out current session = full logout
      await logout();
      return;
    }
    setRevoking(sessionId);
    try {
      await api.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm('Sign out from ALL other devices? You will remain logged in on this device.')) return;
    try {
      // Revoke all other sessions (not current)
      await Promise.all(sessions.filter((s) => !s.isCurrent).map((s) => api.revokeSession(s.id)));
      setSessions((prev) => prev.filter((s) => s.isCurrent));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke sessions');
    }
  };

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="page-container" style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Shield size={24} style={{ color: 'var(--color-primary)' }} />
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Active Sessions</h1>
        </div>
        <p style={{ opacity: 0.6, margin: 0, fontSize: '0.875rem' }}>
          Manage where you're logged in. Revoke access from devices you no longer use.
        </p>
      </header>

      {error && <div className="form-error" role="alert" style={{ marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>Loading sessions…</div>
      ) : (
        <>
          {sessions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>No active sessions found.</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sessions.map((session) => (
              <div
                key={session.id}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  border: session.isCurrent ? '1px solid var(--color-primary)' : '1px solid var(--border)',
                  borderRadius: '12px',
                  background: session.isCurrent ? 'color-mix(in srgb, var(--color-primary) 8%, var(--card))' : 'var(--card)',
                }}
              >
                <div style={{ color: 'var(--color-primary)', flexShrink: 0 }}>
                  <DeviceIcon userAgent={session.deviceName} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{session.deviceName || 'Unknown Device'}</span>
                    {session.isCurrent && (
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px', background: 'var(--color-primary)', color: '#fff' }}>
                        This device
                      </span>
                    )}
                    {session.rememberMe && (
                      <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>· 7-day session</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', opacity: 0.6, marginTop: '2px' }}>
                    {session.ipAddress && <span>{session.ipAddress} · </span>}
                    Last active {formatRelative(session.lastActiveAt)}
                    {' · '}Expires {new Date(session.expiresAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  id={`revoke-session-${session.id}`}
                  className="button"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: session.isCurrent ? 'var(--color-warning)' : 'var(--color-error, #ef4444)',
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    cursor: revoking === session.id ? 'not-allowed' : 'pointer',
                    opacity: revoking === session.id ? 0.5 : 1,
                    flexShrink: 0,
                  }}
                  disabled={revoking === session.id}
                  onClick={() => handleRevoke(session.id, session.isCurrent)}
                >
                  <Trash2 size={13} />
                  {session.isCurrent ? 'Sign out' : 'Revoke'}
                </button>
              </div>
            ))}
          </div>

          {otherSessions.length > 1 && (
            <button
              id="revoke-all-sessions"
              className="button"
              style={{
                marginTop: '1.5rem',
                width: '100%',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--color-error, #ef4444)',
                padding: '0.75rem',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
              onClick={handleRevokeAll}
            >
              Sign out from all other devices ({otherSessions.length})
            </button>
          )}
        </>
      )}
    </div>
  );
}
