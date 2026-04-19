'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getCurrentUser, getLeaveRequests, createLeaveRequest, updateLeaveReplacementStatus, getStaffUsers, getOverallLeaveStatus } from '@/lib/storage';
import { LeaveRequest, User } from '@/lib/types';
import { CalendarDays, Check, X, Clock, Navigation, AlertCircle } from 'lucide-react';

export default function LeavePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [incoming, setIncoming] = useState<LeaveRequest[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  
  const [type, setType] = useState<'AD' | 'EL' | 'CL' | 'EC'>('CL');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [repId, setRepId] = useState('');
  const [noRep, setNoRep] = useState(false);

  useEffect(() => {
    const init = async () => {
      const user = getCurrentUser();
      if (user) {
        setCurrentUser(user);
        await loadLeaves(user.id);
        const allStaff = await getStaffUsers();
        setStaff(allStaff.filter(u => u.id !== user.id)); // other staff
      }
    };
    init();
  }, []);

  const loadLeaves = async (uid: string) => {
    const all = await getLeaveRequests();
    setLeaves(all.filter(l => l.staffId === uid));
    setIncoming(all.filter(l => l.replacementStaffId === uid && l.replacementStatus === 'pending'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !date) return;
    
    // AD has no replacement; EL can have no replacement if checked
    const needsRep = type !== 'AD' && !noRep;
    if (needsRep && !repId) {
      alert("Please select a replacement staff or check 'No replacement available' (for EL).");
      return;
    }

    const repStaff = needsRep ? staff.find(s => s.id === repId) : undefined;
    
    await createLeaveRequest({
      staffId: currentUser.id,
      staffName: currentUser.name,
      leaveType: type,
      date,
      reason,
      replacementStaffId: needsRep ? repId : undefined,
      replacementStaffName: needsRep ? repStaff?.name : 'N/A',
      noReplacementAvailable: noRep
    });

    setDate('');
    setReason('');
    setRepId('');
    setNoRep(false);
    await loadLeaves(currentUser.id);
  };

  const handleIncoming = async (id: string, status: 'accepted' | 'declined') => {
    await updateLeaveReplacementStatus(id, status);
    if (currentUser) await loadLeaves(currentUser.id);
  };

  if (!currentUser) return null;

  return (
    <DashboardLayout allowedRoles={['staff']} title="Leave Management" subtitle="Manage your leave applications and replacements">
      
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
              <select className="form-control" value={type} onChange={e => {
                const val = e.target.value as any;
                setType(val);
                if (val === 'AD') setNoRep(true);
                else setNoRep(false);
              }}>
                <option value="CL">Casual Leave (CL)</option>
                <option value="EC">Extra Casual (EC)</option>
                <option value="AD">Additional Leave (AD)</option>
                <option value="EL">Earned Leave (EL)</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label form-required">Date</label>
              <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} required />
            </div>

            {type !== 'AD' && (
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={noRep} onChange={e => setNoRep(e.target.checked)} />
                  No replacement staff available
                </label>
              </div>
            )}

            { (type !== 'AD' && !noRep) && (
              <div className="form-group">
                <label className="form-label form-required">Replacement Staff</label>
                <select className="form-control" value={repId} onChange={e => setRepId(e.target.value)} required>
                  <option value="">-- Select Replacement --</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.department})</option>)}
                </select>
                <small style={{ color: 'var(--text-3)' }}>They must log in and accept before admin reviews it.</small>
              </div>
            )}

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
              <table style={{ minWidth: '700px' }}>
                <thead>
                  <tr>
                    <th>Date / Type</th>
                    <th>Replacement</th>
                    <th>Approval Status (Adm/JD/MD)</th>
                    <th>Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((l) => {
                    const overall = getOverallLeaveStatus(l);
                    return (
                      <tr key={l.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{l.date}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{l.leaveType} — {l.reason}</div>
                        </td>
                        <td>
                          {l.noReplacementAvailable ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>No replacement</span>
                          ) : (
                            <div>
                              <div>{l.replacementStaffName}</div>
                              <span className={`badge badge-${l.replacementStatus === 'accepted' ? 'approved' : l.replacementStatus === 'declined' ? 'declined' : l.replacementStatus === 'na' ? 'info' : 'pending'}`}>
                                {l.replacementStatus.toUpperCase()}
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <span className={`chip chip-sm chip-${l.adminStatus}`}>{l.adminStatus[0].toUpperCase()}</span>
                            <span className={`chip chip-sm chip-${l.jdStatus}`}>{l.jdStatus[0].toUpperCase()}</span>
                            <span className={`chip chip-sm chip-${l.mdStatus}`}>{l.mdStatus[0].toUpperCase()}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${overall}`}>
                            {overall.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
