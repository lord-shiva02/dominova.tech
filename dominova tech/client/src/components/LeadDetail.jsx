import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi, Spinner, Alert, StatusBadge, formatCurrency, formatDateTime, ExternalLink, ConfirmModal } from './shared';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LeadDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApi(() => api.getLead(id), [id]);

  // Action Modals State
  const [actionLoading, setActionLoading] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [followupDate, setFollowupDate] = useState('');
  const [followupNotes, setFollowupNotes] = useState('');
  
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');

  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertData, setConvertData] = useState({ full_project_amount: '', advance_amount: '', requirements: '', specifications: '', website_expectations: '' });

  if (loading) return <Spinner size="lg" />;
  if (error) return <Alert type="error">{error}</Alert>;
  if (!data) return null;

  const { lead, followups, activeEscalation } = data;

  const handleAction = async (actionFn, successMsg) => {
    setActionLoading(true);
    try {
      await actionFn();
      alert(successMsg);
      setShowStatusModal(false);
      setShowFollowupModal(false);
      setShowEscalateModal(false);
      setShowConvertModal(false);
      refetch();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const isSales = user.role === 'sales' && lead.assigned_to === user.id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 className="page-title">{lead.client_name}</h1>
            <StatusBadge status={lead.status} />
          </div>
          <p className="page-desc">{lead.lead_id} {lead.org_name ? `— ${lead.org_name}` : ''}</p>
        </div>
        
        {isSales && !['CONVERTED', 'LOST'].includes(lead.status) && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary" onClick={() => { setNewStatus(lead.status); setShowStatusModal(true); }}>
              Update Status
            </button>
            <button className="btn btn-secondary" onClick={() => setShowFollowupModal(true)}>
              Schedule Follow-up
            </button>
            <button className="btn btn-warning" onClick={() => setShowEscalateModal(true)}>
              Escalate to Manager
            </button>
            {lead.status !== 'NEW' && (
              <button className="btn btn-success" onClick={() => setShowConvertModal(true)}>
                Convert to Project
              </button>
            )}
          </div>
        )}
      </div>

      <div className="lead-detail-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="card">
            <h3 className="section-title">Lead Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Client Name</span>
                <span className="detail-value">{lead.client_name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Phone Number</span>
                <span className="detail-value">{lead.phone}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Email Address</span>
                <span className="detail-value">{lead.email || '—'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Organization</span>
                <span className="detail-value">{lead.org_name || '—'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Source</span>
                <span className="detail-value">{lead.source}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Quoted Amount</span>
                <span className="detail-value">{formatCurrency(lead.quoted_amount)}</span>
              </div>
              {lead.google_business_url && (
                <div className="detail-item">
                  <span className="detail-label">Google Business</span>
                  <span className="detail-value"><ExternalLink url={lead.google_business_url} label="Profile Link" /></span>
                </div>
              )}
              {lead.instagram_url && (
                <div className="detail-item">
                  <span className="detail-label">Instagram</span>
                  <span className="detail-value"><ExternalLink url={lead.instagram_url} label="Profile Link" /></span>
                </div>
              )}
            </div>
            
            {lead.notes && (
              <div className="detail-item" style={{ marginTop: '24px' }}>
                <span className="detail-label">Initial Notes</span>
                <div className="detail-value" style={{ whiteSpace: 'pre-wrap', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px' }}>
                  {lead.notes}
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="section-title">Follow-ups History</h3>
            <div className="timeline">
              {followups.map((f, i) => (
                <div key={f.id} className="timeline-item">
                  <div className="timeline-dot" style={{ borderColor: f.status === 'COMPLETED' ? 'var(--success)' : 'var(--warning)', color: f.status === 'COMPLETED' ? 'var(--success)' : 'var(--warning)' }}>
                    {f.status === 'COMPLETED' ? '✓' : '!'}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-title">Follow-up {f.status === 'PENDING' ? 'Scheduled' : 'Completed'}</div>
                    <div className="timeline-time">Date: {formatDateTime(f.followup_date)}</div>
                    {f.notes && <div className="timeline-desc">{f.notes}</div>}
                    {f.outcome_notes && <div className="timeline-desc" style={{ color: 'var(--text-primary)', marginTop: '8px', background: 'var(--bg-elevated)', padding: '8px', borderRadius: '4px' }}>Outcome: {f.outcome_notes}</div>}
                  </div>
                </div>
              ))}
              {followups.length === 0 && <p className="text-muted">No follow-ups recorded.</p>}
            </div>
          </div>

        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="card">
            <h3 className="section-title">Sales Assignment</h3>
            <div className="detail-item">
              <span className="detail-label">Assigned To</span>
              <span className="font-bold">{lead.assigned_to_name || 'Unassigned'}</span>
            </div>
            <div className="detail-item" style={{ marginTop: '12px' }}>
              <span className="detail-label">Created At</span>
              <span className="detail-value">{formatDateTime(lead.created_at)}</span>
            </div>
          </div>

          {activeEscalation && (
            <div className="card" style={{ border: '1px solid var(--warning)' }}>
              <h3 className="section-title" style={{ color: 'var(--warning)' }}>Active Escalation</h3>
              <div className="detail-item">
                <span className="detail-label">Status</span>
                <span><StatusBadge status={activeEscalation.status} size="sm" /></span>
              </div>
              <div className="detail-item" style={{ marginTop: '12px' }}>
                <span className="detail-label">Reason</span>
                <span className="detail-value">{activeEscalation.reason}</span>
              </div>
              {activeEscalation.manager_notes && (
                <div className="detail-item" style={{ marginTop: '12px' }}>
                  <span className="detail-label">Manager Notes</span>
                  <span className="detail-value">{activeEscalation.manager_notes}</span>
                </div>
              )}
            </div>
          )}
          
        </div>
      </div>

      {/* MODALS */}
      {isSales && (
        <>
          <ConfirmModal
            open={showStatusModal} onClose={() => setShowStatusModal(false)}
            title="Update Lead Status"
            message={
              <div className="form-group">
                <label>New Status</label>
                <select className="form-control" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  {['CONTACTED', 'INTERESTED', 'LOST'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            }
            confirmText="Update Status" confirmVariant="btn-primary"
            onConfirm={() => handleAction(() => api.contactLead(id, { status: newStatus, notes: 'Status updated via UI' }), 'Status updated')}
            loading={actionLoading}
          />

          <ConfirmModal
            open={showFollowupModal} onClose={() => setShowFollowupModal(false)}
            title="Schedule Follow-up"
            message={
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label>Date & Time</label>
                  <input type="datetime-local" className="form-control" value={followupDate} onChange={e => setFollowupDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea className="form-control" value={followupNotes} onChange={e => setFollowupNotes(e.target.value)} />
                </div>
              </div>
            }
            confirmText="Schedule" confirmVariant="btn-primary"
            onConfirm={() => handleAction(() => api.createFollowup(id, { followup_date: followupDate, notes: followupNotes }), 'Follow-up scheduled')}
            loading={actionLoading}
          />

          <ConfirmModal
            open={showEscalateModal} onClose={() => setShowEscalateModal(false)}
            title="Escalate to Manager"
            message={
              <div className="form-group">
                <label>Reason for Escalation (required)</label>
                <textarea className="form-control" value={escalateReason} onChange={e => setEscalateReason(e.target.value)} />
              </div>
            }
            confirmText="Escalate" confirmVariant="btn-warning"
            onConfirm={() => handleAction(() => api.escalateLead(id, { reason: escalateReason }), 'Lead escalated to manager')}
            loading={actionLoading}
          />

          <ConfirmModal
            open={showConvertModal} onClose={() => setShowConvertModal(false)}
            title="Convert to Project"
            message={
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '8px' }}>
                <Alert type="info">Converting this lead will create a new project and send it to Admin for approval.</Alert>
                <div className="form-row">
                  <div className="form-group">
                    <label>Total Project Value (₹)</label>
                    <input type="number" className="form-control" value={convertData.full_project_amount} onChange={e => setConvertData({...convertData, full_project_amount: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Advance Received (₹)</label>
                    <input type="number" className="form-control" value={convertData.advance_amount} onChange={e => setConvertData({...convertData, advance_amount: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Core Requirements</label>
                  <textarea className="form-control" style={{ minHeight: '100px' }} value={convertData.requirements} onChange={e => setConvertData({...convertData, requirements: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Technical Specifications (Optional)</label>
                  <textarea className="form-control" value={convertData.specifications} onChange={e => setConvertData({...convertData, specifications: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Design/Website Expectations (Optional)</label>
                  <textarea className="form-control" value={convertData.website_expectations} onChange={e => setConvertData({...convertData, website_expectations: e.target.value})} />
                </div>
              </div>
            }
            confirmText="Submit for Admin Approval" confirmVariant="btn-success"
            onConfirm={() => handleAction(() => api.convertLead(id, convertData), 'Lead converted to project successfully!')}
            loading={actionLoading}
          />
        </>
      )}
    </div>
  );
}
