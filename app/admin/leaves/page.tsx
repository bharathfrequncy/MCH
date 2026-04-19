'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getLeaveRequests, updateLeaveAdminStatus, updateLeaveJDStatus, updateLeaveMDStatus, getCurrentUser, getOverallLeaveStatus } from '@/lib/storage';
import { LeaveRequest, User } from '@/lib/types';
import { Clock, CalendarDays, CheckCircle2, UserCheck, XCircle } from 'lucide-react';

export default function AdminLeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    const allLeaves = await getLeaveRequests();
    setLeaves(allLeaves);
  };

  const handleAction = async (id: string, status: 'approved' | 'declined') => {
    if (!user) return;
    
    if (user.role === 'admin') await updateLeaveAdminStatus(id, status, user.id);
    else if (user.role === 'jd') await updateLeaveJDStatus(id, status, user.id);
    else if (user.role === 'md') await updateLeaveMDStatus(id, status, user.id);
    
    await loadLeaves();
  };

  /**
   * Actionable if:
   * 1. Own role's status is 'pending'.
   * 2. Replacement is either 'accepted' or 'na'.
   * 3. For non-AL leaves: Overall status is still 'pending' (if one already approved, no need for others to act).
   */
  const pendingLeaves = leaves.filter(l => {
    if (!user) return false;
    
    const overall = getOverallLeaveStatus(l);
    if (overall !== 'pending') return false; // Already finished (approved or declined)

    let myStatus = 'pending';
    if (user.role === 'admin') myStatus = l.adminStatus;
    if (user.role === 'jd') myStatus = l.jdStatus;
    if (user.role === 'md') myStatus = l.mdStatus;

    const repDone = l.replacementStatus === 'accepted' || l.replacementStatus === 'na';
    
    return myStatus === 'pending' && repDone;
  });
  
  const historyLeaves = leaves.filter(l => !pendingLeaves.some(p => p.id === l.id));

  return (
    <DashboardLayout allowedRoles={['admin', 'md', 'jd']} title="Admin Leave Approvals" subtitle="Review and approve staff leave requests">
      
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <h3 className="card-title">Pending My Approval</h3>
          <span className="badge badge-info">{pendingLeaves.length} Actionable</span>
        </div>
        {pendingLeaves.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 size={48} />
            <h3>No Pending Approvals</h3>
            <p>You have reviewed all current actionable requests.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Request Date</th>
                  <th>Staff</th>
                  <th>Leave Details</th>
                  <th>Replacement</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingLeaves.map((l) => (
                  <tr key={l.id}>
                    <td>{new Date(l.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{l.staffName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>ID: {l.staffId}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                        <span className="badge badge-info">{l.leaveType}</span>
                        {l.date}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>{l.reason}</div>
                    </td>
                    <td>
                      {l.replacementStatus === 'na' ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>Not required</span>
                      ) : (
                        <div>
                          <div>{l.replacementStaffName}</div>
                          <span className="badge badge-approved" style={{ marginTop: '0.2rem' }}>Accepted</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleAction(l.id, 'approved')} className="btn btn-sm btn-success">
                          <UserCheck size={14} /> Approve
                        </button>
                        <button onClick={() => handleAction(l.id, 'declined')} className="btn btn-sm btn-danger">
                          <XCircle size={14} /> Decline
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">All Leave Requests</h3></div>
        <div className="table-wrapper">
          <table style={{ minWidth: '800px' }}>
            <thead>
              <tr>
                <th>Date / Type</th>
                <th>Staff</th>
                <th>Rep. Status</th>
                <th>Adm / JD / MD Status</th>
                <th>Overall</th>
              </tr>
            </thead>
            <tbody>
              {historyLeaves.map((l) => {
                const overall = getOverallLeaveStatus(l);
                return (
                  <tr key={l.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{l.date}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{l.leaveType}</div>
                    </td>
                    <td>{l.staffName}</td>
                    <td>
                      <span className={`badge badge-${l.replacementStatus === 'accepted' ? 'approved' : l.replacementStatus === 'declined' ? 'declined' : l.replacementStatus === 'na' ? 'info' : 'pending'}`}>
                        {l.replacementStatus.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <span className={`chip chip-sm chip-${l.adminStatus}`}>Adm: {l.adminStatus[0].toUpperCase()}</span>
                        <span className={`chip chip-sm chip-${l.jdStatus}`}>JD: {l.jdStatus[0].toUpperCase()}</span>
                        <span className={`chip chip-sm chip-${l.mdStatus}`}>MD: {l.mdStatus[0].toUpperCase()}</span>
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
      </div>
    </DashboardLayout>
  );
}
