'use client';
import { useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getAttendanceLogs, getFines, getOTRequests, getUsers, getDuties } from '@/lib/storage';
import { AttendanceLog, Fine, OTRequest, User, DutyAllocation } from '@/lib/types';
import { FileBarChart2, Download, Printer } from 'lucide-react';

type ReportType = 'attendance' | 'fines' | 'ot' | 'duty';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('attendance');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterStaff, setFilterStaff] = useState('');
  const [users, setUsers] = useState<User[]>([]);

  const [attLogs, setAttLogs] = useState<AttendanceLog[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [otReqs, setOTReqs] = useState<OTRequest[]>([]);
  const [duties, setDuties] = useState<DutyAllocation[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUsers(getUsers());
    setAttLogs(getAttendanceLogs());
    setFines(getFines());
    setOTReqs(getOTRequests());
    setDuties(getDuties());
  }, []);

  const inRange = (dateStr: string) => dateStr >= fromDate && dateStr <= toDate;
  const getName = (id: string) => users.find(u => u.id === id)?.name ?? id;
  const matchStaff = (id: string) => !filterStaff || id === filterStaff;

  const filteredAtt   = attLogs.filter(l => inRange(l.date) && matchStaff(l.staffId));
  const filteredFines = fines.filter(f => inRange(f.date) && matchStaff(f.staffId));
  const filteredOT    = otReqs.filter(r => inRange(r.date) && matchStaff(r.staffId));
  const filteredDuty  = duties.filter(d => inRange(d.date) && matchStaff(d.staffId));

  const handlePrint = () => window.print();

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(reportRef.current, { backgroundColor: '#1a1a1a', scale: 1.5 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`MCH_${reportType}_report_${fromDate}_to_${toDate}.pdf`);
  };

  const fmt = (iso?: string) => iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <DashboardLayout allowedRoles={['admin', 'moderator', 'owner']} title="Reports" subtitle="Generate and export hospital reports as PDF">

      {/* Controls */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header"><h3 className="card-title">Report Configuration</h3></div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Report Type</label>
            <select className="form-control" value={reportType} onChange={e => setReportType(e.target.value as ReportType)} id="report-type-select">
              <option value="attendance">Attendance Report</option>
              <option value="fines">Fine Report</option>
              <option value="ot">OT Requests Report</option>
              <option value="duty">Duty Roster Report</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">From Date</label>
            <input type="date" className="form-control" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">To Date</label>
            <input type="date" className="form-control" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Staff (optional)</label>
            <select className="form-control" value={filterStaff} onChange={e => setFilterStaff(e.target.value)}>
              <option value="">All Staff</option>
              {users.filter(u => u.role === 'staff').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={handlePrint} id="print-report-btn"><Printer size={16} />Print</button>
            <button className="btn btn-primary" onClick={handleExportPDF} id="export-pdf-btn"><Download size={16} />Export PDF</button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div ref={reportRef}>
        <div className="card">
          {/* Report Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid var(--red)' }}>
            <div style={{ width: 50, height: 50, background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <img src="/logo.png" alt="logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--white)' }}>Mothers Care Hospital</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>
                {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report &middot; {fromDate} to {toDate}
                {filterStaff ? ` · ${getName(filterStaff)}` : ''}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-4)' }}>
              Generated: {new Date().toLocaleString('en-IN')}
            </div>
          </div>

          {/* Attendance Report */}
          {reportType === 'attendance' && (
            <>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'Total Records', value: filteredAtt.length, color: 'var(--text-1)' },
                  { label: 'Completed Shifts', value: filteredAtt.filter(a => a.status === 'checked-out').length, color: 'var(--success)' },
                  { label: 'Total Fine Events', value: filteredAtt.filter(a => (a.fineAmount ?? 0) > 0).length, color: 'var(--danger)' },
                  { label: 'Total Fine Amount', value: `₹${filteredAtt.reduce((s, a) => s + (a.fineAmount ?? 0), 0).toFixed(2)}`, color: 'var(--danger)' },
                ].map(s => (
                  <div key={s.label} style={{ padding: '0.75rem 1rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)', minWidth: 120 }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Date</th><th>Staff</th><th>Check In</th><th>Check Out</th><th>Duration</th><th>Expected</th><th>Fine</th><th>Geo</th><th>Status</th></tr></thead>
                  <tbody>
                    {filteredAtt.length === 0
                      ? <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>No records</td></tr>
                      : filteredAtt.map(l => (
                        <tr key={l.id}>
                          <td>{l.date}</td>
                          <td style={{ fontWeight: 600 }}>{getName(l.staffId)}</td>
                          <td>{fmt(l.checkInTime)}</td>
                          <td>{fmt(l.checkOutTime)}</td>
                          <td>{l.totalMinutes != null ? `${Math.floor(l.totalMinutes/60)}h ${l.totalMinutes%60}m` : '—'}</td>
                          <td>{l.expectedMinutes/60}h</td>
                          <td style={{ color: (l.fineAmount??0)>0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>{(l.fineAmount??0)>0 ? `₹${l.fineAmount!.toFixed(2)}` : '✓'}</td>
                          <td style={{ fontSize: '0.75rem' }}>{l.checkInGeo ? `${l.checkInGeo.lat.toFixed(4)},${l.checkInGeo.lng.toFixed(4)}` : 'N/A'}</td>
                          <td><span className={`badge badge-${l.status === 'checked-out' ? 'approved' : 'info'}`}>{l.status}</span></td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Fines Report */}
          {reportType === 'fines' && (
            <>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                {[
                  { label: 'Total Fines', value: filteredFines.length },
                  { label: 'Pending', value: `₹${filteredFines.filter(f=>f.fineStatus==='pending').reduce((s,f)=>s+f.fineAmount,0).toFixed(2)}`, color: 'var(--danger)' },
                  { label: 'Collected', value: `₹${filteredFines.filter(f=>f.fineStatus==='paid').reduce((s,f)=>s+f.fineAmount,0).toFixed(2)}`, color: 'var(--success)' },
                ].map(s => (
                  <div key={s.label} style={{ padding: '0.75rem 1rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: s.color ?? 'var(--text-1)' }}>{s.value}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Date</th><th>Staff</th><th>Shortfall (min)</th><th>Rate/min ×2</th><th>Fine Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {filteredFines.length === 0
                      ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>No fines</td></tr>
                      : filteredFines.map(f => (
                        <tr key={f.id}>
                          <td>{f.date}</td>
                          <td style={{ fontWeight: 600 }}>{f.staffName}</td>
                          <td>{f.shortfallMinutes} min</td>
                          <td>₹{f.perMinuteWage.toFixed(2)} × 2</td>
                          <td style={{ fontWeight: 700, color: 'var(--danger)' }}>₹{f.fineAmount.toFixed(2)}</td>
                          <td><span className={`badge badge-${f.fineStatus === 'paid' ? 'paid' : 'pending'}`}>{f.fineStatus}</span></td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* OT Report */}
          {reportType === 'ot' && (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Date</th><th>Staff</th><th>Department</th><th>Shift</th><th>Reason</th><th>Status</th><th>Admin Note</th></tr></thead>
                <tbody>
                  {filteredOT.length === 0
                    ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>No OT requests</td></tr>
                    : filteredOT.map(r => (
                      <tr key={r.id}>
                        <td>{r.date}</td>
                        <td style={{ fontWeight: 600 }}>{r.staffName}</td>
                        <td>{r.department}</td>
                        <td style={{ fontSize: '0.8rem' }}>{r.preferredShift}</td>
                        <td style={{ fontSize: '0.8rem', maxWidth: 180 }}>{r.reason}</td>
                        <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{r.adminNote ?? '—'}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}

          {/* Duty Report */}
          {reportType === 'duty' && (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Date</th><th>Staff</th><th>Shift</th><th>Start</th><th>End</th><th>Status</th></tr></thead>
                <tbody>
                  {filteredDuty.length === 0
                    ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>No duty records</td></tr>
                    : filteredDuty.map(d => (
                      <tr key={d.id}>
                        <td>{d.date}</td>
                        <td style={{ fontWeight: 600 }}>{getName(d.staffId)}</td>
                        <td><span className="badge badge-info">{d.shiftType}</span></td>
                        <td>{d.startTime}</td>
                        <td>{d.endTime}</td>
                        <td><span className="badge badge-locked">🔒 Locked</span></td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          .sidebar, .topbar, .page-header, .card:first-child { display: none !important; }
          .main-content { margin: 0 !important; padding: 0 !important; }
          .page-container { padding: 0 !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>
    </DashboardLayout>
  );
}
