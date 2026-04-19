'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getLeaveRequests, getCurrentUser, updateLeaveAdminStatus, updateLeaveJDStatus, updateLeaveMDStatus, getOverallLeaveStatus } from '@/lib/storage';
import { LeaveRequest, User, ApprovalStatus } from '@/lib/types';
import { Check, X, Clock, Calendar, User as UserIcon, RefreshCw } from 'lucide-react';

export default function AdminLeavesPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const all = await getLeaveRequests();
    setRequests(all);
    setUser(getCurrentUser());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (id: string, status: ApprovalStatus) => {
    if (!user) return;
    setActing(id);
    try {
      if (user.role === 'admin') await updateLeaveAdminStatus(id, status, user.id);
      else if (user.role === 'jd') await updateLeaveJDStatus(id, status, user.id);
      else if (user.role === 'md') await updateLeaveMDStatus(id, status, user.id);
      await load();
    } catch (err) {
      alert('Failed to update status.');
    } finally {
      setActing(null);
    }
  };

  const canAction = (req: LeaveRequest) => {
    if (!user) return false;
    // Admin, JD, MD can all act. 
    // Replacement must be accepted first if applicable (handled in business logic usually, but we show here)
    if (req.replacementStatus === 'pending') return false; 
    
    if (user.role === 'admin' && req.adminStatus === 'pending') return true;
    if (user.role === 'jd' && req.jdStatus === 'pending') return true;
    if (user.role === 'md' && req.mdStatus === 'pending') return true;
    return false;
  };

  const getStatusBadge = (s: string) => (
    <span className={`badge badge-${s}`}>{s.toUpperCase()}</span>
  );

  return (
    <DashboardLayout allowedRoles={['admin', 'jd', 'md']} title="Leave Approvals" subtitle={`Manage and review staff leave applications (${user?.role?.toUpperCase()} mode)`}>
      
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Staff / Date</th>
              <th>Type / Replacement</th>
              <th>Tier Status</th>
              <th>Overall</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>No leave requests found.</td></tr>
            ) : requests.map((req) => (
              <tr key={req.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{req.staffName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={12} /> {req.date}
                  </div>
                </td>
                <td>
                  <div className="badge badge-info" style={{ marginBottom: '0.25rem' }}>{req.leaveType}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    Rep: {req.noReplacementAvailable ? 'N/A' : req.replacementStaffName} 
                    ({req.replacementStatus})
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                      <span color="var(--text-3)">Admin:</span>
                      <span className={`text-${req.adminStatus}`}>{req.adminStatus}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                      <span color="var(--text-3)">JD:</span>
                      <span className={`text-${req.jdStatus}`}>{req.jdStatus}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                      <span color="var(--text-3)">MD:</span>
                      <span className={`text-${req.mdStatus}`}>{req.mdStatus}</span>
                    </div>
                  </div>
                </td>
                <td>
                  {getStatusBadge(getOverallLeaveStatus(req))}
                </td>
                <td>
                  {canAction(req) ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-sm btn-success" 
                        onClick={() => handleAction(req.id, 'approved')}
                        disabled={acting === req.id}
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button 
                        className="btn btn-sm btn-danger" 
                        onClick={() => handleAction(req.id, 'declined')}
                        disabled={acting === req.id}
                      >
                        <X size={14} /> Decline
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>
                      {req.replacementStatus === 'pending' ? 'Waiting Replacement' : 'No Action Required'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
