'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  getCurrentUser, getLeaveRequests, createLeaveRequest,
  updateLeaveReplacementStatus, getStaffUsers, getOverallLeaveStatus,
} from '@/lib/storage';
import { LeaveRequest, LeaveType, User } from '@/lib/types';
import { CalendarDays, Check, X, Clock, Navigation, AlertTriangle, Info } from 'lucide-react';

const LEAVE_TYPE_INFO: Record<LeaveType, { label: string; color: string; desc: string }> = {
  CL: { label: 'Casual Leave (CL)', color: '#60a5fa', desc: 'Planned leave — replacement required' },
  EL: { label: 'Emergency Leave (EL)', color: '#f87171', desc: 'Emergency — replacement optional' },
  AL: { label: 'Additional Leave (AL)', color: '#34d399', desc: 'Extra leave — requires Admin + JD + MD approval' },
};

export default function LeavePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [incoming, setIncoming] = useState<LeaveRequest[]>([]);
  const [staff, setStaff] = useState<User[]>([]);

  const [type, setType] = useState<LeaveType>('CL');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [repId, setRepId] = useState('');
  const [noReplacement, setNoReplacement] = useState(false);
  const [noRepReason, setNoRepReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      loadLeaves(user.id);
      setStaff(getStaffUsers().filter((u) => u.id !== user.id));
    }
  }, []);

  const loadLeaves = (uid: string) => {
    const all = getLeaveRequests();
    setLeaves(all.filter((l) => l.staffId === uid));
    setIncoming(all.filter((l) => l.replacementStaffId === uid && l.replacementStatus === 'pending'));
  };

  // Reset replacement fields when type changes
  const handleTypeChange = (t: LeaveType) => {
    setType(t);
    setNoReplacement(false);
    setNoRepReason('');
    setRepId('');
  };

  const needsReplacement = type !== 'AL';
  const isEL = type === 'EL';
  const isAL = type === 'AL';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !date) { setError('Please fill all required fields.'); return; }
    if (needsReplacement && !noReplacement && !repId) {
      setError('Please select a replacement staff or mark no replacement available (EL only).');
      return;
    }
    if (noReplacement && !noRepReason.trim()) {
      setError('Please provide a reason for no replacement being available.');
      return;
    }
    if (isAL && !reason.trim()) {
      setError('Please provide a reason for the Additional Leave.');
      return;
    }
    setSubmitting(true);
    setError('');
    await new Promise((r) => setTimeout(r, 400));

    const repStaff = staff.find((s) => s.id === repId);
    createLeaveRequest({
      staffId: currentUser.id,
      staffName: currentUser.name,
      leaveType: type,
      date,
      reason: reason.trim(),
      replacementStaffId: noReplacement ? undefined : repId || undefined,
      replacementStaffName: noReplacement ? undefined : repStaff?.name,
      noReplacementAvailable: noReplacement,
      noReplacementReason: noReplacement ? noRepReason.trim() : undefined,
    });

    setDate('');
    setReason('');
    setRepId('');
    setNoReplacement(false);
    setNoRepReason('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 4000);
    setSubmitting(false);
    loadLeaves(currentUser.id);
  };

  const handleIncoming = (id: string, stat: 'accepted' | 'declined') => {
    updateLeaveReplacementStatus(id, stat);
    if (currentUser) loadLeaves(currentUser.id);
  };

  const overallBadge = (leave: LeaveRequest) => {
    const s = getOverallLeaveStatus(leave);
    return <span className={`badge badge-${s === 'approved' ? 'approved' : s === 'declined' ? 'declined' : 'pending'}`}>{s.toUpperCase()}</span>;
  };

  if (!currentUser) return null;

  return (
    <DashboardLayout allowedRoles={['staff']} title="Leave Management" subtitle="Apply for CL / EL (Emergency) / AL (Additional) leaves">

      {/* Incoming Replacement Requests */}
      {incoming.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem', borderColor: 'var(--info)' }}>
          <div className="card-header"><h3 className="card-title">Incoming Replacement Requests</h3></div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Requesting Staff</th><th>Date</th><th>Type</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {incoming.map((r) => (
                  <tr key={r.id}>
                    <td>{r.staffName}</td>
                    <td>{r.date}</td>
                    <td><span className="badge badge-info">{r.leaveType}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleIncoming(r.id, 'accepted')} className="btn btn-sm btn-success"><Check size={14} /> Accept</button>
                        <button onClick={() => handleIncoming(r.id, 'declined')} className="btn btn-sm btn-danger"><X size={14} /> Decline</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.5rem' }}>

        {/* Request Form */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">Apply for Leave</h3></div>

          {success && <div className="alert alert-success"><Check size={16} /><span>Leave request submitted successfully!</span></div>}
          {error && <div className="alert alert-error"><X size={16} /><span>{error}</span></div>}

          <form onSubmit={handleSubmit}>
            {/* Leave Type */}
            <div className="form-group">
              <label className="form-label">Leave Type <span className="form-required">*</span></label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(Object.keys(LEAVE_TYPE_INFO) as LeaveType[]).map((t) => {
                  const info = LEAVE_TYPE_INFO[t];
                  return (
                    <label key={t} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                      padding: '0.65rem 0.75rem', borderRadius: 'var(--radius)',
                      background: type === t ? `${info.color}18` : 'var(--surface-2)',
                      border: `1px solid ${type === t ? info.color : 'var(--border)'}`,
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}>
                      <input type="radio" name="leaveType" checked={type === t} onChange={() => handleTypeChange(t)} style={{ marginTop: 3 }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: type === t ? info.color : 'var(--text-1)' }}>{info.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{info.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Date */}
            <div className="form-group">
              <label className="form-label">Date <span className="form-required">*</span></label>
              <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>

            {/* Reason — always shown for AL and EL, optional for others */}
            <div className="form-group">
              <label className="form-label">
                Reason {(isAL || isEL) ? <span className="form-required">*</span> : '(optional)'}
              </label>
              <textarea
                className="form-control"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required={isAL || isEL}
                placeholder={isAL ? 'Reason for additional leave (required)...' : isEL ? 'Describe the emergency...' : 'Reason for leave...'}
                rows={3}
              />
            </div>

            {/* Replacement section — not for AL */}
            {!isAL && (
              <>
                <div className="form-group">
                  <label className="form-label">Replacement Staff <span className="form-required">*</span></label>
                  <select
                    className="form-control"
                    value={noReplacement ? '__none__' : repId}
                    onChange={(e) => {
                      if (e.target.value === '__none__') {
                        setNoReplacement(true);
                        setRepId('');
                      } else {
                        setNoReplacement(false);
                        setRepId(e.target.value);
                      }
                    }}
                    required={!noReplacement && !repId}
                  >
                    <option value="">-- Select Replacement --</option>
                    {staff.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.department})</option>)}
                    {isEL && <option value="__none__">⚠ No Replacement Staff Available</option>}
                  </select>
                  {!isEL && (
                    <small style={{ color: 'var(--text-3)' }}>They must accept before admin reviews the request.</small>
                  )}
                </div>

                {/* No-replacement reason (EL only) */}
                {noReplacement && (
                  <div className="form-group">
                    <div className="alert alert-warning" style={{ marginBottom: '0.75rem' }}>
                      <AlertTriangle size={16} />
                      <span>Request will go directly to Admin for review, then JD/MD for final approval.</span>
                    </div>
                    <label className="form-label">Reason for No Replacement <span className="form-required">*</span></label>
                    <textarea
                      className="form-control"
                      value={noRepReason}
                      onChange={(e) => setNoRepReason(e.target.value)}
                      required
                      placeholder="Explain why no replacement is available..."
                      rows={3}
                    />
                  </div>
                )}
              </>
            )}

            {/* AL info box */}
            {isAL && (
              <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                <Info size={16} />
                <span>Additional Leave requires approval from <strong>Admin + JD + MD</strong> — all three must approve.</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={submitting}
            >
              <Navigation size={16} />
              {submitting ? 'Submitting...' : 'Submit Leave Request'}
            </button>
          </form>
        </div>

        {/* My Leaves History */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">My Application History</h3>
            <span className="badge badge-info">{leaves.length}</span>
          </div>
          {leaves.length === 0 ? (
            <div className="empty-state">
              <CalendarDays />
              <h3>No Leave Applications</h3>
              <p>You haven&apos;t requested any leaves yet.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date / Type</th>
                    <th>Replacement</th>
                    <th>Rep. Status</th>
                    <th>Admin</th>
                    <th>JD</th>
                    <th>MD</th>
                    <th>Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {[...leaves].reverse().map((l) => (
                    <tr key={l.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{l.date}</div>
                        <div style={{ fontSize: '0.75rem', marginTop: '0.15rem' }}>
                          <span style={{ color: LEAVE_TYPE_INFO[l.leaveType]?.color }}>{LEAVE_TYPE_INFO[l.leaveType]?.label || l.leaveType}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.1rem' }}>{l.reason}</div>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {l.noReplacementAvailable
                          ? <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>No Staff Available</span>
                          : l.replacementStaffName || (l.leaveType === 'AL' ? '—' : '—')}
                      </td>
                      <td>
                        {l.replacementStatus === 'na'
                          ? <span className="badge badge-info">N/A</span>
                          : <span className={`badge badge-${l.replacementStatus === 'accepted' ? 'approved' : l.replacementStatus === 'declined' ? 'declined' : 'pending'}`}>
                              {l.replacementStatus.toUpperCase()}
                            </span>
                        }
                      </td>
                      <td><span className={`badge badge-${l.adminStatus}`}>{l.adminStatus.toUpperCase()}</span></td>
                      <td><span className={`badge badge-${l.jdStatus}`}>{l.jdStatus.toUpperCase()}</span></td>
                      <td><span className={`badge badge-${l.mdStatus}`}>{l.mdStatus.toUpperCase()}</span></td>
                      <td>{overallBadge(l)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
