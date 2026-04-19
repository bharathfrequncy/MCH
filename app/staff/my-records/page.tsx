'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getCurrentUser, getAttendanceForStaff, getFinesForStaff, getOTRequestsForStaff } from '@/lib/storage';
import { User, AttendanceLog, Fine, OTRequest } from '@/lib/types';
import { FileBarChart2, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

type Tab = 'attendance' | 'fines' | 'ot';

export default function MyRecordsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [otRequests, setOTRequests] = useState<OTRequest[]>([]);
  const [tab, setTab] = useState<Tab>('attendance');
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    const init = async () => {
      const u = getCurrentUser();
      if (!u) return;
      setUser(u);
      
      const [att, stfFines, stfOT] = await Promise.all([
        getAttendanceForStaff(u.id),
        getFinesForStaff(u.id),
        getOTRequestsForStaff(u.id)
      ]);

      setAttendance([...att].reverse());
      setFines([...stfFines].reverse());
      setOTRequests([...stfOT].reverse());
    };
    init();
  }, []);

  const filteredAttendance = attendance.filter(a => a.date.startsWith(filterMonth));
  const filteredFines = fines.filter(f => f.date.startsWith(filterMonth));
  const totalWorkedMins = filteredAttendance.reduce((s, a) => s + (a.totalMinutes ?? 0), 0);
  const totalFineAmt = filteredFines.reduce((s, f) => s + f.fineAmount, 0);

  const fmt = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <DashboardLayout allowedRoles={['staff']} title="My Records" subtitle="View your attendance, fines, and OT history">

      {/* Month Filter + Summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>Month:</label>
          <input
            type="month"
            className="form-control"
            style={{ width: 'auto' }}
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
          />
        </div>
        <div className="chip"><CheckCircle2 size={14} color="var(--success)" />{filteredAttendance.filter(a => a.status === 'checked-out').length} days worked</div>
        <div className="chip"><Clock size={14} />{Math.floor(totalWorkedMins / 60)}h {totalWorkedMins % 60}m total</div>
        <div className="chip" style={{ color: totalFineAmt > 0 ? 'var(--danger)' : 'var(--success)' }}>
          <AlertTriangle size={14} />₹{totalFineAmt.toFixed(2)} fines
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {(['attendance', 'fines', 'ot'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '0.6rem 1.25rem', border: 'none', borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            background: tab === t ? 'var(--red)' : 'transparent',
            color: tab === t ? 'white' : 'var(--text-3)',
            fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
            transition: 'all 0.2s', textTransform: 'capitalize',
          }}>
            {t === 'ot' ? 'OT Requests' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Attendance Tab */}
      {tab === 'attendance' && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Duration</th>
                <th>Expected</th>
                <th>Fine</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem' }}>No attendance records for this month</td></tr>
              ) : filteredAttendance.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>{a.date}</td>
                  <td>{fmt(a.checkInTime)}</td>
                  <td>{a.checkOutTime ? fmt(a.checkOutTime) : '—'}</td>
                  <td>{a.totalMinutes != null ? `${Math.floor(a.totalMinutes / 60)}h ${a.totalMinutes % 60}m` : '—'}</td>
                  <td>{a.expectedMinutes / 60}h</td>
                  <td style={{ color: (a.fineAmount ?? 0) > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                    {(a.fineAmount ?? 0) > 0 ? `₹${a.fineAmount!.toFixed(2)}` : 'None'}
                  </td>
                  <td>
                    <span className={`badge ${a.status === 'checked-out' ? 'badge-approved' : a.status === 'checked-in' ? 'badge-info' : 'badge-declined'}`}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Fines Tab */}
      {tab === 'fines' && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Date</th><th>Shortfall</th><th>Rate/min</th><th>Fine Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filteredFines.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem' }}>No fines for this month 🎉</td></tr>
              ) : filteredFines.map(f => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 600 }}>{f.date}</td>
                  <td>{f.shortfallMinutes} min</td>
                  <td>₹{f.perMinuteWage.toFixed(2)} × 2</td>
                  <td style={{ fontWeight: 700, color: 'var(--danger)' }}>₹{f.fineAmount.toFixed(2)}</td>
                  <td><span className={`badge ${f.fineStatus === 'paid' ? 'badge-approved' : 'badge-pending'}`}>{f.fineStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* OT Tab */}
      {tab === 'ot' && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Requested Date</th><th>Preferred Shift</th><th>Reason</th><th>Status</th><th>Admin Note</th><th>Submitted</th></tr>
            </thead>
            <tbody>
              {otRequests.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem' }}>No OT requests found</td></tr>
              ) : otRequests.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.date}</td>
                  <td><span className="chip">{r.preferredShift}</span></td>
                  <td style={{ maxWidth: 200, fontSize: '0.82rem', color: 'var(--text-2)' }}>{r.reason}</td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>{r.adminNote ?? '—'}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-4)' }}>{new Date(r.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
