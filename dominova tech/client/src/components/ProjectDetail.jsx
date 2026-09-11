import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi, Spinner, Alert, StatusBadge, formatCurrency, formatDateTime, ExternalLink, Avatar, ConfirmModal } from './shared';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApi(() => api.getProject(id), [id]);

  const [message, setMessage] = useState('');
  const [submittingMsg, setSubmittingMsg] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  
  // Modals state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [devPayout, setDevPayout] = useState('');
  const [submitUrl, setSubmitUrl] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showFinalRejectModal, setShowFinalRejectModal] = useState(false);

  if (loading) return <Spinner size="lg" />;
  if (error) return <Alert type="error">{error}</Alert>;
  if (!data) return null;

  const { project, statusHistory, messages, files, revisions } = data;

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmittingMsg(true);
    try {
      await api.sendProjectMessage(id, message);
      setMessage('');
      refetch();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingMsg(false);
    }
  };

  const handleAction = async (actionFn, successMsg) => {
    setActionLoading(true); setActionError('');
    try {
      await actionFn();
      alert(successMsg);
      setShowRejectModal(false);
      setShowApproveModal(false);
      setShowSubmitModal(false);
      setShowFinalRejectModal(false);
      refetch();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const isDev = user.role === 'developer';
  const isAdmin = user.role === 'admin';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {actionError && <Alert type="error" onClose={() => setActionError('')}>{actionError}</Alert>}
      
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 className="page-title">{project.project_id}</h1>
            <StatusBadge status={project.status} />
          </div>
          <p className="page-desc">{project.client_name} {project.org_name ? `— ${project.org_name}` : ''}</p>
        </div>
        
        {/* ACTION BUTTONS */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Admin Actions */}
          {isAdmin && project.status === 'PENDING_ADMIN_APPROVAL' && (
            <>
              <button className="btn btn-danger" onClick={() => setShowRejectModal(true)}>Reject / Return</button>
              <button className="btn btn-success" onClick={() => setShowApproveModal(true)}>Approve Project</button>
            </>
          )}
          {isAdmin && project.status === 'PENDING_FINAL_APPROVAL' && (
            <>
              <button className="btn btn-danger" onClick={() => setShowFinalRejectModal(true)}>Request Revisions</button>
              <button className="btn btn-success" onClick={() => handleAction(() => api.finalApproveProject(id, { admin_notes: 'Approved via UI' }), 'Project completed!')}>
                Give Final Approval
              </button>
            </>
          )}

          {/* Developer Actions */}
          {isDev && project.status === 'AVAILABLE_FOR_DEVELOPER' && (
            <button className="btn btn-primary" onClick={() => handleAction(() => api.acceptProject(id), 'Project accepted!')} disabled={actionLoading}>
              {actionLoading ? <Spinner /> : 'Accept Project'}
            </button>
          )}
          {isDev && project.developer_id === user.id && ['ASSIGNED', 'IN_DEVELOPMENT', 'TESTING', 'REVISION_REQUIRED'].includes(project.status) && (
            <button className="btn btn-success" onClick={() => setShowSubmitModal(true)}>
              Submit Website
            </button>
          )}
          {isDev && project.developer_id === user.id && project.status === 'ASSIGNED' && (
            <button className="btn btn-secondary" onClick={() => handleAction(() => api.updateProjectStatus(id, { status: 'IN_DEVELOPMENT' }), 'Status updated')} disabled={actionLoading}>
              Start Development
            </button>
          )}
        </div>
      </div>

      <div className="lead-detail-grid">
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Main Info Card */}
          <div className="card">
            <h3 className="section-title">Requirements & Details</h3>
            <div className="detail-grid" style={{ marginBottom: '24px' }}>
              <div className="detail-item">
                <span className="detail-label">Client Name</span>
                <span className="detail-value">{project.client_name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Phone</span>
                <span className="detail-value">{project.phone}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Google Business</span>
                <span className="detail-value"><ExternalLink url={project.google_business_url} label="View Profile" /></span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Instagram</span>
                <span className="detail-value"><ExternalLink url={project.instagram_url} label="View Profile" /></span>
              </div>
            </div>

            <div className="detail-item" style={{ marginBottom: '16px' }}>
              <span className="detail-label">Core Requirements</span>
              <div className="detail-value" style={{ whiteSpace: 'pre-wrap', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px' }}>
                {project.requirements}
              </div>
            </div>

            {project.specifications && (
              <div className="detail-item" style={{ marginBottom: '16px' }}>
                <span className="detail-label">Technical Specifications</span>
                <div className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{project.specifications}</div>
              </div>
            )}
            
            {project.website_expectations && (
              <div className="detail-item">
                <span className="detail-label">Design Expectations</span>
                <div className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{project.website_expectations}</div>
              </div>
            )}
          </div>

          {/* Revisions History (if any) */}
          {revisions?.length > 0 && (
            <div className="card" style={{ border: '1px solid rgba(249,115,22,0.3)' }}>
              <h3 className="section-title" style={{ color: 'var(--warning)' }}>Revisions History</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {revisions.map(rev => (
                  <div key={rev.id} style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="badge badge-REVISION_REQUIRED">Revision #{rev.revision_number}</span>
                      <span className="text-xs text-muted">{formatDateTime(rev.rejected_at)}</span>
                    </div>
                    <p style={{ fontSize: '14px' }}>{rev.rejection_reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="card">
            <h3 className="section-title">Project Messages</h3>
            <div className="chat-container">
              {messages.map(msg => {
                const isMine = msg.sender_id === user.id;
                return (
                  <div key={msg.id} className={`chat-message ${isMine ? 'mine' : ''}`}>
                    <Avatar name={msg.sender_name} size={32} />
                    <div className="chat-bubble">
                      <div className="chat-sender">{msg.sender_name} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({msg.sender_role})</span></div>
                      <div className="chat-text">{msg.message}</div>
                      <div className="chat-time">{formatDateTime(msg.created_at)}</div>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && <p className="text-muted text-center" style={{ padding: '20px' }}>No messages yet.</p>}
            </div>
            
            {(isDev && project.developer_id === user.id) || !isDev ? (
              <form onSubmit={handleSendMessage} className="chat-input-wrapper">
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Type a message..." 
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  disabled={submittingMsg}
                />
                <button type="submit" className="btn btn-primary" disabled={submittingMsg || !message.trim()}>Send</button>
              </form>
            ) : null}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Team & Finances */}
          <div className="card">
            <h3 className="section-title">Project Team</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Avatar name={project.salesperson_name} />
                <div>
                  <div className="font-bold">{project.salesperson_name}</div>
                  <div className="text-xs text-muted">Salesperson</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {project.developer_id ? (
                  <>
                    <Avatar name={project.developer_name} />
                    <div>
                      <div className="font-bold">{project.developer_name}</div>
                      <div className="text-xs text-muted">Developer</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="user-avatar" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>?</div>
                    <div className="text-muted">Unassigned Developer</div>
                  </>
                )}
              </div>
            </div>

            <h3 className="section-title">Finances</h3>
            <div className="detail-item" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-sm">Client Project Value:</span>
                <span className="font-bold">{isAdmin || user.role === 'sales' ? formatCurrency(project.full_project_amount) : 'Hidden'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-sm text-muted">Advance Received:</span>
                <span className="font-bold text-muted">{isAdmin || user.role === 'sales' ? formatCurrency(project.advance_amount) : 'Hidden'}</span>
              </div>
            </div>
            
            <div className="section-divider" style={{ margin: '12px 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-sm">Developer Payout:</span>
              <span className="font-bold" style={{ color: 'var(--success)' }}>
                {project.developer_payout ? formatCurrency(project.developer_payout) : 'Pending Admin'}
              </span>
            </div>
          </div>

          {/* Submission Info */}
          {project.final_website_url && (
            <div className="card" style={{ border: '1px solid var(--brand-primary)' }}>
              <h3 className="section-title" style={{ color: 'var(--brand-primary-light)' }}>Final Submission</h3>
              <div className="detail-item">
                <span className="detail-label">Website URL</span>
                <a href={project.final_website_url} target="_blank" rel="noreferrer" className="btn btn-secondary w-full" style={{ marginTop: '8px' }}>
                  Open Website 🔗
                </a>
              </div>
            </div>
          )}

          {/* Status Timeline */}
          <div className="card">
            <h3 className="section-title">Timeline</h3>
            <div className="timeline">
              {statusHistory.map((sh, idx) => (
                <div key={sh.id} className="timeline-item">
                  <div className="timeline-dot" style={{ 
                    borderColor: idx === statusHistory.length - 1 ? 'var(--brand-primary)' : 'var(--border)',
                    color: idx === statusHistory.length - 1 ? 'var(--brand-primary)' : 'inherit'
                  }}>✓</div>
                  <div className="timeline-content">
                    <div className="timeline-title">Status changed to {sh.new_status.replace(/_/g, ' ')}</div>
                    <div className="timeline-time">{formatDateTime(sh.created_at)} by {sh.changed_by_name}</div>
                    {sh.notes && <div className="timeline-desc">{sh.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* MODALS */}
      {isAdmin && (
        <>
          <ConfirmModal
            open={showRejectModal}
            onClose={() => setShowRejectModal(false)}
            title="Reject Project"
            message={
              <div>
                <p style={{ marginBottom: '16px' }}>Return this project to sales. Please provide a reason.</p>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Missing requirements, price too low" 
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                />
              </div>
            }
            confirmText="Reject Project"
            onConfirm={() => handleAction(() => api.rejectProject(id, { rejection_reason: rejectReason }), 'Project rejected')}
            loading={actionLoading}
          />
          <ConfirmModal
            open={showApproveModal}
            onClose={() => setShowApproveModal(false)}
            title="Approve Project"
            message={
              <div>
                <p style={{ marginBottom: '16px' }}>Approve this project and make it available for developers. You must set the developer payout.</p>
                <div className="form-group">
                  <label>Developer Payout (₹)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 8000" 
                    value={devPayout}
                    onChange={e => setDevPayout(e.target.value)}
                  />
                </div>
              </div>
            }
            confirmText="Approve & Publish"
            confirmVariant="btn-success"
            onConfirm={() => handleAction(() => api.approveProject(id, { developer_payout: devPayout }), 'Project approved')}
            loading={actionLoading}
          />
          <ConfirmModal
            open={showFinalRejectModal}
            onClose={() => setShowFinalRejectModal(false)}
            title="Request Revisions"
            message={
              <div>
                <p style={{ marginBottom: '16px' }}>What needs to be fixed before final approval?</p>
                <textarea 
                  className="form-control" 
                  placeholder="List the required changes..." 
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                />
              </div>
            }
            confirmText="Send Revision Request"
            confirmVariant="btn-warning"
            onConfirm={() => handleAction(() => api.finalRejectProject(id, { rejection_reason: rejectReason }), 'Revision requested')}
            loading={actionLoading}
          />
        </>
      )}

      {isDev && (
        <ConfirmModal
          open={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
          title="Submit Website"
          message={
            <div>
              <p style={{ marginBottom: '16px' }}>Please provide the final live URL of the completed website.</p>
              <div className="form-group">
                <label>Website URL</label>
                <input 
                  type="url" 
                  className="form-control" 
                  placeholder="https://www.example.com" 
                  value={submitUrl}
                  onChange={e => setSubmitUrl(e.target.value)}
                />
              </div>
            </div>
          }
          confirmText="Submit for Approval"
          confirmVariant="btn-primary"
          onConfirm={() => handleAction(() => api.submitProject(id, { final_website_url: submitUrl }), 'Website submitted for approval!')}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
