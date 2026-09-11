import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner, Alert } from '../components/shared';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Email and password required'); return; }
    setLoading(true);
    setError('');
    try {
      const user = await login(email, password);
      const roleRoutes = { admin: '/admin', sales: '/sales', manager: '/manager', developer: '/developer' };
      navigate(roleRoutes[user.role] || '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { role: 'Admin', email: 'admin@dominova.in', password: 'Admin@123', color: '#6366f1' },
    { role: 'Sales', email: 'sales1@dominova.in', password: 'Sales@123', color: '#22d3ee' },
    { role: 'Manager', email: 'manager@dominova.in', password: 'Manager@123', color: '#c084fc' },
    { role: 'Developer', email: 'dev1@dominova.in', password: 'Dev@123', color: '#4ade80' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg-base)',
      position: 'relative',
    }}>
      {/* Left panel */}
      <div style={{
        flex: '0 1 520px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px',
        maxWidth: '520px',
        margin: '0 auto',
        width: '100%',
        animation: 'fadeIn 0.5s ease',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '48px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: 44, height: 44,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', fontWeight: 800, color: 'white',
            boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
          }}>D</div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Dominova</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.02em' }}>Internal Operating System</div>
          </div>
        </div>

        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Welcome back
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '14px' }}>
          Sign in to access your dashboard
        </p>

        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: error ? '16px' : 0 }}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="you@dominova.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              style={{ padding: '12px 14px' }}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: '12px 14px' }}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: '4px', width: '100%', padding: '12px 24px', fontSize: '15px' }}>
            {loading ? <><Spinner /> Signing in...</> : 'Sign In'}
          </button>
        </form>

        {/* Demo accounts */}
        <div style={{ marginTop: '40px' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', textAlign: 'center', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Quick Access
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {demoAccounts.map((acc) => (
              <button
                key={acc.role}
                onClick={() => { setEmail(acc.email); setPassword(acc.password); }}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = acc.color; e.currentTarget.style.background = `${acc.color}08`; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
              >
                <div style={{ fontSize: '12px', fontWeight: 600, color: acc.color, marginBottom: '3px' }}>{acc.role}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{acc.email}</div>
              </button>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '32px' }}>
          © 2026 Dominova Technologies
        </p>
      </div>

      {/* Right decorative panel */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.04) 50%, rgba(99,102,241,0.02) 100%)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden',
      }} className="login-right-panel">
        {/* Decorative glow orbs */}
        <div style={{ position: 'absolute', top: '10%', right: '20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '10%', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
        
        <div style={{ textAlign: 'center', maxWidth: '380px', position: 'relative', zIndex: 1, animation: 'slideUp 0.6s ease' }}>
          <div style={{ fontSize: '56px', marginBottom: '24px' }}>🚀</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', letterSpacing: '-0.02em' }}>
            One system for everything
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7 }}>
            Track every lead from first contact to final delivery.
            Sales → Projects → Developers → Payments — all in one place.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '36px' }}>
            {[
              { icon: '🎯', text: 'Lead tracking & follow-ups' },
              { icon: '📁', text: 'Project lifecycle management' },
              { icon: '💻', text: 'Developer assignment & progress' },
              { icon: '💰', text: 'Wallets & earnings system' },
            ].map((f) => (
              <div key={f.text} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                background: 'rgba(24,24,27,0.6)', backdropFilter: 'blur(8px)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '14px 18px', textAlign: 'left',
              }}>
                <span style={{ fontSize: '18px' }}>{f.icon}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
