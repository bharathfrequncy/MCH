'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getCurrentUser, createOTRequest, getOTRequestsForStaff, getDepartments } from '@/lib/storage';
import { User, OTRequest } from '@/lib/types';
import { ClipboardList, Send, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function OTRequestPage() {
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<OTRequest[]>([]);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [preferredShift, setPreferredShift] = useState('Morning (6AM-2PM)');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) return;
    setUser(u);
    setRequests(getOTRequestsForStaff(u.id));
    // Default date: tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().slice(0, 10));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!date || !reason.trim()) { setError('Please fill all required fields.'); return; }
    setSubmitting(true);
    setError('');
    await new Promise(r => setTimeout(r, 500));
    const req = createOTRequest({
      staffId: user.id,
      staffName: user.name,
      department: user.department,
      date,
      reason: reason.trim(),
      preferredShift,
    });
    setRequests(prev => [...prev, req]);
    setReason('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 4000);
    setSubmitting(false);
  };

  const statusIcon = (s: string) =>
    s === 'approved' ? <CheckCircle2 size={14} color="var(--success)" /> :
    s === 'declined' ? <XCircle size={14} color="var(--danger)" /> :
    <Clock size={14} color="#fbbf24" />;

  return (
    <DashboardLayout allowedRoles={['staff']} title="OT Duty Request" subtitle="Request overtime duty with reason for admin approval">
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '1.5rem' }}>

        {/* Request Form */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">New OT Request</h3>
            <ClipboardList size={18} color="var(--red-light)" />
          </div>

          {success && (
            <div className="alert alert-success"><CheckCircle2 /><span>OT request submitted successfully! Awaiting admin approval.</span></div>
          )}
          {error && (
            <div className="alert alert-error"><XCircle /><span>{error}</span></div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="ot-date">OT Date <span className="form-required">*</span></label>
              <input
                id="ot-date"
                type="date"
                className="form-control"
                value={date}
                onChange={e => setDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="ot-shift">Preferred Shift <span className="form-required">*</span></label>
              <select
                id="ot-shift"
                className="form-control"
                value={preferredShift}
                onChange={e => setPreferredShift(e.target.value)}
              >
                <option>Morning (6AM–2PM)</option>
                <option>Afternoon (2PM–10PM)</option>
                <option>Night (10PM–6AM)</option>
                <option>Full Day (8AM–8PM)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="ot-reason">Reason <span className="form-required">*</span></label>
              <textarea
                id="ot-reason"
                className="form-control"
                placeholder="Describe the reason for OT duty request..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={5}
                required
              />
              <small>{reason.length} / 500 characters</small>
            </div>

            <div style={{ padding: '0.875rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-3)' }}>
              <strong style={{ color: 'var(--text-2)' }}>Department:</strong> {user?.department || '—'}<br />
              <strong style={{ color: 'var(--text-2)' }}>Staff ID:</strong> {user?.staffId || '—'}
            </div>

            <button id="ot-submit-btn" type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
              <Send size={16} />
              {submitting ? 'Submitting...' : 'Submit OT Request'}
            </button>
          </form>
        </div>

        {/* Request History */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">My OT Request History</h3>
            <span className="badge badge-info">{requests.length}</span>
          </div>

          {requests.length === 0 ? (
            <div className="empty-state">
              <ClipboardList />
              <h3>No Requests Yet</h3>
              <p>Your OT requests will appear here after submission</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[...requests].reverse().map(req => (
                <div key={req.id} style={{
                  padding: '1rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)',
                  borderLeft: `3px solid ${req.status === 'approved' ? 'var(--success)' : req.status === 'declined' ? 'var(--danger)' : '#f59e0b'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                      {statusIcon(req.status)}
                      {req.date} — {req.preferredShift}
                    </div>
                    <span className={`badge badge-${req.status}`}>{req.status}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginBottom: req.adminNote ? '0.5rem' : 0 }}>{req.reason}</div>
                  {req.adminNote && (
                    <div style={{ fontSize: '0.78rem', padding: '0.4rem 0.7rem', background: 'var(--surface-3)', borderRadius: 'var(--radius-sm)', color: 'var(--text-2)', marginTop: '0.5rem' }}>
                      <strong>Admin note:</strong> {req.adminNote}
                    </div>
                  )}
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-4)', marginTop: '0.5rem' }}>
                    Submitted {new Date(req.createdAt).toLocaleDateString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
