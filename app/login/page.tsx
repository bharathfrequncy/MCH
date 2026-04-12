'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, seedIfEmpty, getCurrentUser } from '@/lib/storage';
import { UserRole } from '@/lib/types';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

const ROLES: { key: UserRole; label: string; color: string }[] = [
  { key: 'staff',     label: 'Staff',     color: '#3b82f6' },
  { key: 'admin',     label: 'Admin',     color: '#f59e0b' },
  { key: 'jd',        label: 'JD',        color: '#8b5cf6' },
  { key: 'md',        label: 'MD',        color: '#C8102E' },
];

const DEMO_CREDS: Record<UserRole, { email: string; password: string }> = {
  staff:     { email: 'staff@mch.com',     password: 'staff123' },
  admin:     { email: 'admin@mch.com',     password: 'admin123' },
  jd:        { email: 'jd@mch.com',        password: 'jd123' },
  md:        { email: 'md@mch.com',        password: 'md123' },
};

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    seedIfEmpty();
    const user = getCurrentUser();
    if (user) router.replace(`/${user.role}`);
  }, [router]);

  // Auto-fill demo credentials when role changes
  const handleRoleChange = (r: UserRole) => {
    setRole(r);
    setEmail(DEMO_CREDS[r].email);
    setPassword(DEMO_CREDS[r].password);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 600)); // tiny delay for UX
    const user = login(email.trim(), password);
    setLoading(false);
    if (!user) {
      setError('Invalid email or password. Please try again.');
      return;
    }
    router.replace(`/${user.role}`);
  };

  return (
    <div className="login-page">
      <div className="login-bg" />

      {/* Left branding panel */}
      <div className="login-left">
        <div className="login-brand">
          <img src="/logo.png" alt="MCH Logo" className="login-brand-logo" />
          <h1 className="login-brand-name">
            MCH
          </h1>
          <p className="login-brand-tagline">Staff Management System &mdash; Powered by Care &amp; Precision</p>

          <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { icon: '📍', text: 'Geotagged Attendance Tracking' },
              { icon: '🏥', text: 'OT Duty Request & Approval' },
              { icon: '📊', text: 'Reports & Fine Management' },
              { icon: '👑', text: '4-Tier Role Access Control' },
            ].map(item => (
              <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-2)', fontSize: '0.875rem' }}>
                <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login card */}
      <div className="login-right">
        <div className="login-card">
          <h2 className="login-title">Welcome Back</h2>
          <p className="login-subtitle">Sign in to access your dashboard</p>

          {/* Role Selector */}
          <div className="role-tabs">
            {ROLES.map(r => (
              <button
                key={r.key}
                className={`role-tab${role === r.key ? ' active' : ''}`}
                onClick={() => handleRoleChange(r.key)}
                type="button"
              >
                {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
                <AlertCircle />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="form-control"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: '2.75rem' }}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(p => !p)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)', display: 'flex' }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? (
                <span className="animate-spin" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} />
              ) : <LogIn size={18} />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div style={{ marginTop: '1.5rem', padding: '0.875rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)', fontSize: '0.78rem', color: 'var(--text-3)' }}>
            <strong style={{ color: 'var(--text-2)' }}>Demo Credentials (auto-filled)</strong>
            <div style={{ marginTop: '0.4rem' }}>
              Email: <code style={{ color: 'var(--red-light)' }}>{DEMO_CREDS[role].email}</code>
            </div>
            <div>
              Password: <code style={{ color: 'var(--red-light)' }}>{DEMO_CREDS[role].password}</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
