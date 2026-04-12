'use client';
import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import { getCurrentUser, getAttendanceForStaff, getFinesForStaff, getOTRequestsForStaff, getTodayAttendance } from '@/lib/storage';
import { User, AttendanceLog, Fine, OTRequest } from '@/lib/types';
import { MapPin, ClipboardList, AlertTriangle, CheckCircle2, Clock, TrendingDown } from 'lucide-react';
import Link from 'next/link';

export default function StaffDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [todayLog, setTodayLog] = useState<AttendanceLog | undefined>(undefined);
  const [fines, setFines] = useState<Fine[]>([]);
  const [otRequests, setOTRequests] = useState<OTRequest[]>([]);
  const [totalDays, setTotalDays] = useState(0);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) return;
    setUser(u);
    setTodayLog(getTodayAttendance(u.id));
    const att = getAttendanceForStaff(u.id);
    setTotalDays(att.filter(a => a.status === 'checked-out').length);
    setFines(getFinesForStaff(u.id));
    setOTRequests(getOTRequestsForStaff(u.id));
  }, []);

  const pendingFines = fines.filter(f => f.fineStatus === 'pending');
  const pendingOT    = otRequests.filter(r => r.status === 'pending');
  const approvedOT   = otRequests.filter(r => r.status === 'approved');

  const checkInTime = todayLog?.checkInTime
    ? new Date(todayLog.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <DashboardLayout allowedRoles={['staff']} title="Staff Dashboard" subtitle={`Welcome back, ${user?.name ?? ''}`}>
      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon"><Clock /></div>
          <div className="stat-value">{todayLog ? (todayLog.status === 'checked-in' ? 'In' : 'Done') : 'Out'}</div>
          <div className="stat-label">Today&apos;s Status {checkInTime ? `· In at ${checkInTime}` : ''}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><CheckCircle2 /></div>
          <div className="stat-value">{totalDays}</div>
          <div className="stat-label">Days Worked</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><AlertTriangle /></div>
          <div className="stat-value" style={{ color: pendingFines.length > 0 ? 'var(--danger)' : 'var(--success)' }}>
            ₹{pendingFines.reduce((s, f) => s + f.fineAmount, 0).toFixed(0)}
          </div>
          <div className="stat-label">Pending Fines</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><ClipboardList /></div>
          <div className="stat-value">{approvedOT.length}</div>
          <div className="stat-label">OT Approved</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Quick Actions */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">Quick Actions</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link href="/staff/attendance" className="btn btn-primary btn-lg" style={{ justifyContent: 'flex-start' }}>
              <MapPin size={20} /> Mark Attendance
            </Link>
            <Link href="/staff/ot-request" className="btn btn-secondary btn-lg" style={{ justifyContent: 'flex-start' }}>
              <ClipboardList size={20} /> Request OT Duty
            </Link>
            <Link href="/staff/my-records" className="btn btn-ghost btn-lg" style={{ justifyContent: 'flex-start' }}>
              <TrendingDown size={20} /> View My Records
            </Link>
          </div>
        </div>

        {/* Recent OT Requests */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent OT Requests</h3>
            <span className="badge badge-info">{otRequests.length} Total</span>
          </div>
          {otRequests.length === 0 ? (
            <div className="empty-state"><ClipboardList /><h3>No Requests Yet</h3><p>Submit your first OT request</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {otRequests.slice(-4).reverse().map(req => (
                <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{req.date}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{req.reason.slice(0, 40)}...</div>
                  </div>
                  <span className={`badge badge-${req.status}`}>{req.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fine Summary */}
        {pendingFines.length > 0 && (
          <div className="card card-red" style={{ gridColumn: 'span 2' }}>
            <div className="card-header">
              <h3 className="card-title" style={{ color: 'var(--red-light)' }}>⚠ Pending Fines</h3>
              <span className="badge badge-declined">₹{pendingFines.reduce((s, f) => s + f.fineAmount, 0).toFixed(2)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
              {pendingFines.map(f => (
                <div key={f.id} style={{ padding: '0.875rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--red)' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{f.date}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: '0.4rem' }}>{f.shortfallMinutes} min short × ₹{f.perMinuteWage.toFixed(2)} × 2</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--red-light)' }}>₹{f.fineAmount.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
