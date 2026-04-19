'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getOTRequests, reviewOTRequest, getCurrentUser } from '@/lib/storage';
import { OTRequest } from '@/lib/types';
import { ClipboardList, CheckCircle2, XCircle, Clock, X } from 'lucide-react';

export default function OTRequestsAdminPage() {
  const [requests, setRequests] = useState<OTRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'declined'>('pending');
  const [reviewModal, setReviewModal] = useState<OTRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => setRequests([...getOTRequests()].reverse());
  useEffect(() => { load(); }, []);

  const filtered = requests.filter(r => filter === 'all' ? true : r.status === filter);

  const handleReview = async (status: 'approved' | 'declined') => {
    if (!reviewModal) return;
    const adminUser = getCurrentUser();
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    reviewOTRequest(reviewModal.id, status, adminNote, adminUser?.id ?? '');
    load();
    setReviewModal(null);
    setAdminNote('');
    setSaving(false);
  };

  const pending  = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;
  const declined = requests.filter(r => r.status === 'declined').length;

  return (
    <DashboardLayout allowedRoles={['admin', 'jd', 'md']} title="OT Requests" subtitle="Review and manage overtime duty requests from staff">

      {/* Summary */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total',    value: requests.length, color: 'var(--text-1)' },
          { label: 'Pending',  value: pending,          color: '#fbbf24' },
          { label: 'Approved', value: approved,          color: 'var(--success)' },
          { label: 'Declined', value: declined,          color: 'var(--danger)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(['all','pending','approved','declined'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} style={{ textTransform: 'capitalize' }}>
            {f} {f === 'pending' && pending > 0 && <span className="nav-badge" style={{ marginLeft: '0.25rem' }}>{pending}</span>}
          </button>
        ))}
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Staff</th><th>Department</th><th>OT Date</th><th>Time Range</th><th>Shift</th>
              <th>Reason</th><th>Status</th><th>Submitted</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>No requests found</td></tr>
            ) : filtered.map(req => (
              <tr key={req.id}>
                <td style={{ fontWeight: 600 }}>{req.staffName}</td>
                <td><span className="chip">{req.department}</span></td>
                <td>{req.date}</td>
                <td style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                  {req.fromTime} → {req.toTime}
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{req.preferredShift}</td>
                <td style={{ maxWidth: 180, fontSize: '0.82rem', color: 'var(--text-2)' }} title={req.reason}>
                  {req.reason.length > 50 ? req.reason.slice(0, 50) + '...' : req.reason}
                </td>
                <td><span className={`badge badge-${req.status}`}>{req.status}</span></td>
                <td style={{ fontSize: '0.78rem', color: 'var(--text-4)' }}>{new Date(req.createdAt).toLocaleDateString('en-IN')}</td>
                <td>
                  {req.status === 'pending' ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => { setReviewModal(req); setAdminNote(''); }} id={`review-${req.id}`}>
                      Review
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-4)' }}>{req.adminNote ? `"${req.adminNote}"` : '—'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setReviewModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Review OT Request</h3>
              <button className="modal-close" onClick={() => setReviewModal(null)}><X size={16} /></button>
            </div>

            <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                <div><span style={{ color: 'var(--text-3)' }}>Staff: </span><strong>{reviewModal.staffName}</strong></div>
                <div><span style={{ color: 'var(--text-3)' }}>Dept: </span><strong>{reviewModal.department}</strong></div>
                <div><span style={{ color: 'var(--text-3)' }}>Date: </span><strong>{reviewModal.date}</strong></div>
                <div><span style={{ color: 'var(--text-3)' }}>Time: </span><strong style={{ color: 'var(--red-light)' }}>{reviewModal.fromTime} → {reviewModal.toTime}</strong></div>
                <div style={{ gridColumn: 'span 2' }}><span style={{ color: 'var(--text-3)' }}>Shift: </span><strong>{reviewModal.preferredShift}</strong></div>
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                <div style={{ color: 'var(--text-3)', marginBottom: '0.25rem' }}>Reason:</div>
                <div style={{ color: 'var(--text-1)' }}>{reviewModal.reason}</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Admin Note (optional)</label>
              <textarea
                className="form-control"
                placeholder="Add a note for the staff member..."
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                rows={3}
              />
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setReviewModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleReview('declined')} disabled={saving} id="decline-ot-btn">
                <XCircle size={16} />{saving ? '...' : 'Decline'}
              </button>
              <button className="btn btn-success" onClick={() => handleReview('approved')} disabled={saving} id="approve-ot-btn">
                <CheckCircle2 size={16} />{saving ? '...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
