'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getAttendanceLogs, getUsers } from '@/lib/storage';
import { AttendanceLog, User } from '@/lib/types';
import { MapPin } from 'lucide-react';

export default function AdminAttendancePage() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterStaff, setFilterStaff] = useState('');

  useEffect(() => {
    setLogs([...getAttendanceLogs()].reverse());
    setUsers(getUsers());
  }, []);

  const getName = (id: string) => users.find(u => u.id === id)?.name ?? id;
  const getDept = (id: string) => users.find(u => u.id === id)?.department ?? '—';

  const filtered = logs.filter(l =>
    (!filterDate || l.date === filterDate) &&
    (!filterStaff || l.staffId === filterStaff)
  );

  const fmt = (iso?: string) => iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

  const todayPresent = logs.filter(l => l.date === new Date().toISOString().slice(0, 10)).length;

  return (
    <DashboardLayout allowedRoles={['admin', 'jd', 'md']} title="Attendance Log" subtitle="View all staff attendance records with geolocation">

      {/* Stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon"><MapPin /></div>
          <div className="stat-value">{todayPresent}</div>
          <div className="stat-label">Present Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{logs.filter(l => (l.fineAmount ?? 0) > 0).length}</div>
          <div className="stat-label">Total Fine Events</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{logs.length}</div>
          <div className="stat-label">Total Records</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>Date:</label>
          <input type="date" className="form-control" style={{ width: 'auto' }} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>Staff:</label>
          <select className="form-control" style={{ width: 'auto' }} value={filterStaff} onChange={e => setFilterStaff(e.target.value)}>
            <option value="">All Staff</option>
            {users.filter(u => u.role === 'staff').map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        {(filterDate || filterStaff) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilterDate(''); setFilterStaff(''); }}>Clear Filters</button>
        )}
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Staff</th><th>Department</th>
              <th>Check In</th><th>Check Out</th><th>Duration</th>
              <th>Expected</th><th>Location</th><th>Fine</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>No attendance records found</td></tr>
            ) : filtered.map(l => (
              <tr key={l.id}>
                <td style={{ fontWeight: 600 }}>{l.date}</td>
                <td>{getName(l.staffId)}</td>
                <td><span className="chip">{getDept(l.staffId)}</span></td>
                <td>{fmt(l.checkInTime)}</td>
                <td>{fmt(l.checkOutTime)}</td>
                <td>{l.totalMinutes != null ? `${Math.floor(l.totalMinutes / 60)}h ${l.totalMinutes % 60}m` : '—'}</td>
                <td>{l.expectedMinutes / 60}h</td>
                <td>
                  {l.checkInGeo ? (
                    <span className="geo-status geo-onsite" style={{ fontSize: '0.7rem' }}>
                      📍 {l.checkInGeo.lat.toFixed(3)}, {l.checkInGeo.lng.toFixed(3)}
                    </span>
                  ) : <span style={{ color: 'var(--text-4)', fontSize: '0.8rem' }}>No GPS</span>}
                </td>
                <td style={{ color: (l.fineAmount ?? 0) > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                  {(l.fineAmount ?? 0) > 0 ? `₹${l.fineAmount!.toFixed(2)}` : '✓'}
                </td>
                <td>
                  <span className={`badge ${l.status === 'checked-out' ? 'badge-approved' : l.status === 'checked-in' ? 'badge-info' : 'badge-declined'}`}>
                    {l.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
