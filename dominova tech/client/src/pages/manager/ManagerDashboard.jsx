import { useApi, Spinner, Alert } from '../../components/shared';
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

export default function ManagerDashboard() {
  const { data: escData, loading: escLoading, error: escError } = useApi(() => api.getEscalations({}));
  const { data: statsData, loading: statsLoading, error: statsError } = useApi(() => api.getOverview());

  if (escLoading || statsLoading) return <Spinner size="lg" />;
  if (escError || statsError) return <Alert type="error">{escError || statsError}</Alert>;
  if (!escData || !statsData) return null;

  const escalations = escData.escalations || [];
  const pendingCount = escalations.filter(e => e.status === 'PENDING_MANAGER').length;
  const inDiscussionCount = escalations.filter(e => e.status === 'IN_DISCUSSION').length;
  const convertedCount = escalations.filter(e => e.status === 'CONVERTED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Manager Dashboard</h1>
          <p className="page-desc">Review and close escalated leads</p>
        </div>
      </div>

      <section>
        <h2 className="section-title">Escalations Overview</h2>
        <div className="stat-grid">
          <StatCard title="Pending Review" value={pendingCount} icon="⚠️" link="/manager/escalations?status=PENDING_MANAGER" />
          <StatCard title="In Discussion" value={inDiscussionCount} icon="💬" link="/manager/escalations?status=IN_DISCUSSION" />
          <StatCard title="Converted" value={convertedCount} icon="🎯" link="/manager/escalations?status=CONVERTED" />
          <StatCard title="Total Escalated" value={escalations.length} icon="🔺" link="/manager/escalations" />
        </div>
      </section>
      
      <section>
        <h2 className="section-title">Company Overview (Sales)</h2>
        <div className="stat-grid">
          <StatCard title="Total Leads" value={statsData.leads.total} icon="👥" />
          <StatCard title="Total Converted" value={statsData.leads.converted} icon="🏆" />
        </div>
      </section>
    </div>
  );
}
