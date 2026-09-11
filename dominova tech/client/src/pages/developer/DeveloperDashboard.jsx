import { useApi, Spinner, Alert, formatCurrency } from '../../components/shared';
import { api } from '../../api/client';
import { Link } from 'react-router-dom';

function StatCard({ title, value, icon, link }) {
  const content = (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="stat-value">{value}</div>
        <div className="stat-icon" style={{ background: 'var(--bg-elevated)', color: 'var(--brand-primary-light)' }}>
          {icon}
        </div>
      </div>
      <div className="stat-label">{title}</div>
    </div>
  );
  
  return link ? <Link to={link} style={{ textDecoration: 'none' }}>{content}</Link> : content;
}

export default function DeveloperDashboard() {
  const { data: statsData, loading: statsLoading, error: statsError } = useApi(() => api.getProjectStats());
  const { data: walletData, loading: walletLoading, error: walletError } = useApi(() => api.getMyWallet());

  if (statsLoading || walletLoading) return <Spinner size="lg" />;
  if (statsError || walletError) return <Alert type="error">{statsError || walletError}</Alert>;
  if (!statsData || !walletData) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Developer Dashboard</h1>
          <p className="page-desc">Manage your projects and earnings</p>
        </div>
      </div>

      <section>
        <h2 className="section-title">My Projects</h2>
        <div className="stat-grid">
          <StatCard title="Available Projects" value={statsData.available_for_developer} icon="🆕" link="/developer/projects" />
          <StatCard title="In Development" value={statsData.in_development} icon="⚡" link="/developer/my-project" />
          <StatCard title="Revisions Required" value={statsData.revision_required} icon="⚠️" link="/developer/my-project" />
          <StatCard title="Completed" value={statsData.completed} icon="✅" link="/developer/completed" />
        </div>
      </section>

      <section>
        <h2 className="section-title">My Earnings</h2>
        <div className="stat-grid">
          <StatCard title="Available Balance" value={formatCurrency(walletData.wallet.available_balance)} icon="💰" link="/developer/wallet" />
          <StatCard title="Total Earned" value={formatCurrency(walletData.wallet.total_earned)} icon="📈" link="/developer/wallet" />
          <StatCard title="Total Withdrawn" value={formatCurrency(walletData.wallet.total_withdrawn)} icon="💸" link="/developer/wallet" />
        </div>
      </section>
    </div>
  );
}
