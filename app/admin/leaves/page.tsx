'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getLeaveRequests, updateLeaveAdminStatus } from '@/lib/storage';
import { LeaveRequest } from '@/lib/types';
import { Clock, CheckX, CalendarDays, CheckCircle2 } from 'lucide-react';

export default function AdminLeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = () => {
    setLeaves(getLeaveRequests());
  };

  const handleAction = (id: string, status: 'approved' | 'declined') => {
    updateLeaveAdminStatus(id, status);
    loadLeaves();
  };

  // Only show leaves that have been accepted by the replacement staff (or at least filter them)
  const pendingLeaves = leaves.filter(l => l.adminStatus === 'pending' && l.replacementStatus === 'accepted');
  const pastLeaves = leaves.filter(l => l.adminStatus !== 'pending' || (l.adminStatus === 'pending' && l.replacementStatus !== 'accepted'));

  return (
    <DashboardLayout allowedRoles={['admin', 'md', 'jd']} title="Leave Approval Workflow" subtitle="Review leave requests that have been accepted by replacement staff">
      
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header"><h3 className="card-title">Pending Approvals</h3></div>
        {pendingLeaves.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 />
            <h3>All Caught Up</h3>
            <p>No actionable leave requests waiting for your approval.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Request Date</th>
                  <th>Staff</th>
                  <th>Leave Details</th>
                  <th>Replacement Staff</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingLeaves.map((l) => (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(l.createdAt).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 600 }}>{l.staffName}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                        <span className="badge badge-info">{l.leaveType}</span>
                        {l.date}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>{l.reason}</div>
                    </td>
                    <td>
                      <div>{l.replacementStaffName}</div>
                      <span className="badge badge-approved" style={{ marginTop: '0.2rem' }}>Accepted</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleAction(l.id, 'approved')} className="btn btn-sm btn-success">Approve</button>
                        <button onClick={() => handleAction(l.id, 'declined')} className="btn btn-sm btn-danger">Decline</button>
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
        <div className="card-header"><h3 className="card-title">Leave Request History / Waiting on Replacement</h3></div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date / Type</th>
                <th>Staff</th>
                <th>Replacement</th>
                <th>Replacement Status</th>
                <th>Admin Status</th>
              </tr>
            </thead>
            <tbody>
              {pastLeaves.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{l.date}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{l.leaveType}</div>
                  </td>
                  <td>{l.staffName}</td>
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
      </div>
      
    </DashboardLayout>
  );
}
