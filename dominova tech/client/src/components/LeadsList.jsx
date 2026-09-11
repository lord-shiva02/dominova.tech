import { useState } from 'react';
import { useApi, Spinner, Alert, StatusBadge, formatDate, formatCurrency, SearchBar, Pagination } from './shared';
import { api } from '../api/client';
import { Link } from 'react-router-dom';

export default function LeadsList({ role = 'admin' }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const { data, loading, error } = useApi(() => 
    api.getLeads({ page, limit: 20, search, status: statusFilter }),
    [page, search, statusFilter]
  );

  const statuses = ['NEW', 'ASSIGNED', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP', 'MANAGER_REVIEW', 'CONVERTED', 'LOST'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{role === 'admin' ? 'All Leads' : 'My Leads'}</h1>
          <p className="page-desc">Manage and track your leads</p>
        </div>
        {role === 'sales' && (
          <button className="btn btn-primary" onClick={() => alert('New lead modal to be implemented')}>+ New Lead</button>
        )}
      </div>

      <div className="card" style={{ padding: '24px' }}>
        <SearchBar 
          value={search} 
          onChange={setSearch} 
          placeholder="Search leads by name, phone, or ID..."
          filters={
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              {statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          }
        />

        {loading ? <Spinner size="lg" /> : error ? <Alert type="error">{error}</Alert> : (
          <>
            <div className="table-wrapper" style={{ marginTop: '24px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Lead ID</th>
                    <th>Client</th>
                    <th>Contact</th>
                    <th>Status</th>
                    {role === 'admin' && <th>Assigned To</th>}
                    <th>Quoted Value</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.leads.map(lead => (
                    <tr key={lead.id}>
                      <td className="td-muted">{lead.lead_id}</td>
                      <td>
                        <div className="font-bold">{lead.client_name}</div>
                        {lead.org_name && <div className="text-xs text-muted">{lead.org_name}</div>}
                      </td>
                      <td>
                        <div>{lead.phone}</div>
                        {lead.email && <div className="text-xs text-muted truncate" style={{ maxWidth: '120px' }}>{lead.email}</div>}
                      </td>
                      <td><StatusBadge status={lead.status} /></td>
                      {role === 'admin' && <td>{lead.assigned_to_name || <span className="text-muted">Unassigned</span>}</td>}
                      <td>{formatCurrency(lead.quoted_amount)}</td>
                      <td className="text-xs text-muted">{formatDate(lead.created_at)}</td>
                      <td>
                        <Link to={`/${role}/leads/${lead.id}`} className="btn btn-ghost btn-sm">View</Link>
                      </td>
                    </tr>
                  ))}
                  {data?.leads.length === 0 && (
                    <tr>
                      <td colSpan={role === 'admin' ? 8 : 7} style={{ textAlign: 'center', padding: '40px' }} className="text-muted">
                        No leads found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {data && <Pagination page={page} total={data.total} limit={data.limit} onChange={setPage} />}
          </>
        )}
      </div>
    </div>
  );
}
