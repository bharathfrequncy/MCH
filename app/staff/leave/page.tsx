'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getCurrentUser, getLeaveRequests, createLeaveRequest, updateLeaveReplacementStatus, getStaffUsers } from '@/lib/storage';
import { LeaveRequest, User } from '@/lib/types';
import { CalendarDays, Check, X, Clock, Navigation } from 'lucide-react';

export default function LeavePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [incoming, setIncoming] = useState<LeaveRequest[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  
  const [type, setType] = useState<'EC' | 'CL'>('CL');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [repId, setRepId] = useState('');

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      loadLeaves(user.id);
      setStaff(getStaffUsers().filter(u => u.id !== user.id)); // other staff
    }
  }, []);

  const loadLeaves = (uid: string) => {
    const all = getLeaveRequests();
    setLeaves(all.filter(l => l.staffId === uid));
    setIncoming(all.filter(l => l.replacementStaffId === uid && l.replacementStatus === 'pending'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !date || !repId) return;

    const repStaff = staff.find(s => s.id === repId);
    createLeaveRequest({
      staffId: currentUser.id,
      staffName: currentUser.name,
      leaveType: type,
      date,
      reason,
      replacementStaffId: repId,
      replacementStaffName: repStaff?.name
    });

    setDate('');
    setReason('');
    setRepId('');
    loadLeaves(currentUser.id);
  };

  const handleIncoming = (id: string, stat: 'accepted' | 'declined') => {
    updateLeaveReplacementStatus(id, stat);
    if (currentUser) loadLeaves(currentUser.id);
  };

  if (!currentUser) return null;

  return (
    <DashboardLayout allowedRoles={['staff']} title="Leave Management" subtitle="EC / CL Leaves and Replacement Requests">
      
      {incoming.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem', borderColor: 'var(--info)' }}>
          <div className="card-header"><h3 className="card-title">Incoming Replacement Requests</h3></div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Requesting Staff</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Action</th>
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
                        <button onClick={() => handleIncoming(r.id, 'accepted')} className="btn btn-sm btn-success"><Check /> Accept</button>
                        <button onClick={() => handleIncoming(r.id, 'declined')} className="btn btn-sm btn-danger"><X /> Decline</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        
        {/* Request Form */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">Apply for Leave</h3></div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label form-required">Leave Type</label>
              <select className="form-control" value={type} onChange={e => setType(e.target.value as any)}>
                <option value="CL">Casual Leave (CL)</option>
                <option value="EC">Extra Casual (EC)</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label form-required">Date</label>
              <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label form-required">Replacement Staff</label>
              <select className="form-control" value={repId} onChange={e => setRepId(e.target.value)} required>
                <option value="">-- Select Replacement --</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.department})</option>)}
              </select>
              <small style={{ color: 'var(--text-3)' }}>They must log in and accept before admin reviews it.</small>
            </div>

            <div className="form-group">
              <label className="form-label form-required">Reason</label>
              <textarea className="form-control" value={reason} onChange={e => setReason(e.target.value)} required placeholder="Reason for leave..."></textarea>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              <Navigation size={16} /> Submit Leave Request
            </button>
          </form>
        </div>

        {/* My Leaves List */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">My Application History</h3></div>
          {leaves.length === 0 ? (
            <div className="empty-state">
              <CalendarDays />
              <h3>No Leave Applications</h3>
              <p>You haven't requested any leaves yet.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date / Type</th>
                    <th>Replacement</th>
                    <th>Rep. Status</th>
                    <th>Admin Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{l.date}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{l.leaveType} — {l.reason}</div>
                      </td>
                      <td>{l.replacementStaffName}</td>
                      <td>
                        <span className={`badge badge-${l.replacementStatus === 'accepted' ? 'approved' : l.replacementStatus === 'declined' ? 'declined' : 'pending'}`}>
                          {l.replacementStatus.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${l.adminStatus === 'approved' ? 'approved' : l.adminStatus === 'declined' ? 'declined' : 'pending'}`}>
                          {l.adminStatus.toUpperCase()}
                        </span>
                      </td>
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
