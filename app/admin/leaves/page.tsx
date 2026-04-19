'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  getLeaveRequests, updateLeaveAdminStatus, updateLeaveJDStatus, updateLeaveMDStatus,
  getCurrentUser, getOverallLeaveStatus,
} from '@/lib/storage';
import { LeaveRequest, UserRole, ApprovalStatus } from '@/lib/types';
import { CheckCircle2, XCircle, Clock, Info } from 'lucide-react';

const LEAVE_COLORS: Record<string, string> = {
  CL: '#60a5fa', EL: '#f87171', AL: '#34d399',
};
const LEAVE_LABELS: Record<string, string> = {
  CL: 'Casual Leave', EL: 'Emergency Leave', AL: 'Additional Leave',
};

interface Props {
  role?: UserRole;
}

export default function LeavesPage({ role: propRole }: Props) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const [filter, setFilter] = useState<'actionable' | 'all'>('actionable');
  const [role, setRole] = useState<UserRole>(propRole ?? 'admin');

  useEffect(() => {
    const u = getCurrentUser();
    setCurrentUser(u);
    // If no role prop, derive from current user
    if (!propRole && u) setRole(u.role as UserRole);
    loadLeaves();
  }, [propRole]);

  const loadLeaves = () => setLeaves(getLeaveRequests());

  const getMyStatus = (l: LeaveRequest): ApprovalStatus => {
    if (role === 'admin') return l.adminStatus;
    if (role === 'jd') return l.jdStatus;
    return l.mdStatus;
  };

  const isActionable = (l: LeaveRequest): boolean => {
    if (getMyStatus(l) !== 'pending') return false;
    if (l.leaveType === 'AL') return true;
    if (l.leaveType === 'EL' && l.noReplacementAvailable) {
      if (role === 'jd' || role === 'md') return l.adminStatus === 'approved';
      return true;
    }
    const repOk = l.replacementStatus === 'accepted' || l.replacementStatus === 'na';
    if (!repOk) return false;
    return true;
  };

  const handleAction = (id: string, status: 'approved' | 'declined') => {
    const uid = currentUser?.id;
    if (role === 'admin') updateLeaveAdminStatus(id, status, uid);
    else if (role === 'jd') updateLeaveJDStatus(id, status, uid);
    else updateLeaveMDStatus(id, status, uid);
    loadLeaves();
  };

  const actionableLeaves = leaves.filter(isActionable);
  const displayed = filter === 'actionable' ? actionableLeaves : leaves;
  const roleLabel = role === 'admin' ? 'Admin' : role === 'jd' ? 'JD' : 'MD';

  const allowedRoles: UserRole[] =
    role === 'admin' ? ['admin', 'jd', 'md'] :
    role === 'jd'   ? ['jd', 'md'] :
                      ['md'];

  return (
    <DashboardLayout
      allowedRoles={['admin', 'jd', 'md']}
      title="Leave Approval"
      subtitle={`Review and approve leave requests — ${roleLabel} can approve independently`}
    >
      <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
        <Info size={18} />
        <div>
          <strong>Approval Rules:</strong>
          {' '}CL/EC/EL: Any one of Admin, JD, or MD approval is sufficient (after replacement acceptance).
          {' '}EL (No Replacement): Admin must approve first, then JD or MD.
          {' '}<strong style={{ color: '#34d399' }}>AL:</strong> All three — Admin + JD + MD — must approve.
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button className={`btn btn-sm ${filter === 'actionable' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('actionable')}>
          <Clock size={14} /> Needs My Action ({actionableLeaves.length})
        </button>
        <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('all')}>
          All Requests ({leaves.length})
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{filter === 'actionable' ? `Pending ${roleLabel} Action` : 'All Leave Requests'}</h3>
          <span className="badge badge-info">{displayed.length}</span>
        </div>

        {displayed.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 />
            <h3>{filter === 'actionable' ? 'All Caught Up' : 'No Leave Requests'}</h3>
            <p>{filter === 'actionable' ? 'No requests need your action right now.' : 'No leave requests found.'}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Staff / Date / Reason</th>
                  <th>Leave Type</th>
                  <th>Replacement</th>
                  <th>Admin</th>
                  <th>JD</th>
                  <th>MD</th>
                  <th>Overall</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((l) => {
                  const overall = getOverallLeaveStatus(l);
                  const myStatus = getMyStatus(l);
                  const canAct = myStatus === 'pending' && isActionable(l);
                  return (
                    <tr key={l.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{l.staffName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{l.date}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-4)', marginTop: '0.1rem', maxWidth: 200 }}>{l.reason}</div>
                        {l.noReplacementAvailable && (
                          <div style={{ marginTop: '0.3rem', fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600 }}>
                            ⚠ No Replacement: {l.noReplacementReason}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)',
                          fontWeight: 700, fontSize: '0.75rem',
                          background: `${LEAVE_COLORS[l.leaveType] || '#888'}22`,
                          color: LEAVE_COLORS[l.leaveType] || '#888',
                        }}>
                          {LEAVE_LABELS[l.leaveType] || l.leaveType}
                        </span>
                        {l.leaveType === 'AL' && <div style={{ fontSize: '0.7rem', color: '#34d399', marginTop: 3 }}>All 3 required</div>}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {l.noReplacementAvailable
                          ? <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.75rem' }}>⚠ None Available</span>
                          : l.leaveType === 'AL'
                            ? <span style={{ color: 'var(--text-3)' }}>—</span>
                            : (
                              <>
                                <div>{l.replacementStaffName || '—'}</div>
                                <span className={`badge badge-${l.replacementStatus === 'accepted' ? 'approved' : l.replacementStatus === 'declined' ? 'declined' : 'pending'}`} style={{ fontSize: '0.7rem' }}>
                                  {l.replacementStatus === 'na' ? 'N/A' : l.replacementStatus.toUpperCase()}
                                </span>
                              </>
                            )
                        }
                      </td>
                      <td><span className={`badge badge-${l.adminStatus}`}>{l.adminStatus.toUpperCase()}</span></td>
                      <td><span className={`badge badge-${l.jdStatus}`}>{l.jdStatus.toUpperCase()}</span></td>
                      <td><span className={`badge badge-${l.mdStatus}`}>{l.mdStatus.toUpperCase()}</span></td>
                      <td>
                        <span className={`badge badge-${overall === 'approved' ? 'approved' : overall === 'declined' ? 'declined' : 'pending'}`}>
                          {overall.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {canAct ? (
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button onClick={() => handleAction(l.id, 'approved')} className="btn btn-sm btn-success" id={`approve-${l.id}`}>
                              <CheckCircle2 size={13} /> OK
                            </button>
                            <button onClick={() => handleAction(l.id, 'declined')} className="btn btn-sm btn-danger">
                              <XCircle size={13} /> No
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                            {myStatus !== 'pending' ? `${myStatus} by me` : 'Awaiting prereq.'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
