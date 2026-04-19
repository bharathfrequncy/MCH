'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getStaffUsers, getDuties, createDuty, getCurrentUser, editDuty, copyLastMonthDuties, getUserById } from '@/lib/storage';
import { User, DutyAllocation } from '@/lib/types';
import { CalendarDays, Plus, Lock, X, ChevronLeft, ChevronRight, Copy, Edit2, Save } from 'lucide-react';

const SHIFTS = [
  { label: 'Morning  (6AM – 2PM)',   start: '06:00', end: '14:00', type: '8hr' as const },
  { label: 'Afternoon (2PM – 10PM)', start: '14:00', end: '22:00', type: '8hr' as const },
  { label: 'Night    (10PM – 6AM)',  start: '22:00', end: '06:00', type: '8hr' as const },
  { label: 'Extended  (8AM – 5PM)', start: '08:00', end: '17:00', type: '9hr' as const },
];

type ViewMode = 'daily' | 'weekly' | 'monthly';

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getMonthStart(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DutyPage() {
  const [staff, setStaff] = useState<User[]>([]);
  const [duties, setDuties] = useState<DutyAllocation[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ staffId: '', date: '', shiftIdx: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');

  // Calendar navigation state
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-indexed

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ shiftIdx: 0, editNote: '' });

  // Week navigation
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay()); // Sunday
    return d.toISOString().slice(0, 10);
  });

  const load = () => {
    setStaff(getStaffUsers());
    setDuties([...getDuties()].reverse());
    setCurrentUser(getCurrentUser());
  };

  useEffect(() => {
    load();
    const today = new Date().toISOString().slice(0, 10);
    setFilterDate(today);
    setForm((f) => ({ ...f, date: today }));
  }, []);

  // ── Daily filter
  const filteredDuties = filterDate ? duties.filter((d) => d.date === filterDate) : duties;

  // ── Weekly dates
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const prevWeek = () => {
    const d = new Date(weekStart); d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };
  const nextWeek = () => {
    const d = new Date(weekStart); d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  // ── Monthly calendar cells
  const monthDays = getDaysInMonth(calYear, calMonth);
  const startDay = getMonthStart(calYear, calMonth);
  const calCells: (number | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: monthDays }, (_, i) => i + 1),
  ];
  const getDayStr = (day: number) =>
    `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const dutiesOnDate = (dateStr: string) => duties.filter((d) => d.date === dateStr);
  const getStaffName = (id: string) => staff.find((s) => s.id === id)?.name ?? id;
  const getStaffDept = (id: string) => staff.find((s) => s.id === id)?.department ?? '—';

  // ── Allocate
  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.staffId || !form.date) { setError('Please fill all fields.'); return; }
    const shift = SHIFTS[form.shiftIdx];
    const exists = duties.find((d) => d.staffId === form.staffId && d.date === form.date);
    if (exists) { setError('This staff already has a duty on that date.'); return; }
    setSaving(true);
    setError('');
    await new Promise((r) => setTimeout(r, 400));
    createDuty({
      staffId: form.staffId,
      date: form.date,
      shiftType: shift.type,
      startTime: shift.start,
      endTime: shift.end,
      allocatedBy: currentUser?.id ?? '',
    });
    load();
    setShowModal(false);
    setSaving(false);
  };

  // ── Edit
  const startEdit = (duty: DutyAllocation) => {
    const idx = SHIFTS.findIndex((s) => s.start === duty.startTime && s.end === duty.endTime);
    setEditingId(duty.id);
    setEditForm({ shiftIdx: idx >= 0 ? idx : 0, editNote: '' });
  };
  const saveEdit = (id: string) => {
    if (!currentUser) return;
    const shift = SHIFTS[editForm.shiftIdx];
    editDuty(id, { shiftType: shift.type, startTime: shift.start, endTime: shift.end, editNote: editForm.editNote }, currentUser.id);
    setEditingId(null);
    load();
  };

  // ── Copy last month
  const handleCopyLastMonth = async () => {
    if (!currentUser) return;
    setCopyLoading(true);
    setCopyMsg('');
    await new Promise((r) => setTimeout(r, 400));
    const copied = copyLastMonthDuties(calYear, calMonth + 1, currentUser.id);
    load();
    setCopyMsg(copied > 0 ? `✓ Copied ${copied} duties from last month.` : 'No duties found in the previous month to copy.');
    setCopyLoading(false);
    setTimeout(() => setCopyMsg(''), 5000);
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  };

  const monthLabel = new Date(calYear, calMonth).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <DashboardLayout allowedRoles={['admin', 'jd', 'md']} title="Duty Roster" subtitle="Allocate, view and manage staff shifts">

      {/* Header row */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Duty Allocation</div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            {(['daily', 'weekly', 'monthly'] as ViewMode[]).map((m) => (
              <button
                key={m}
                className={`btn btn-sm ${viewMode === m ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode(m)}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={handleCopyLastMonth} disabled={copyLoading} id="copy-last-month-btn">
            <Copy size={15} /> {copyLoading ? 'Copying...' : 'Copy Last Month'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} id="allocate-duty-btn">
            <Plus size={16} /> Allocate Duty
          </button>
        </div>
      </div>

      {copyMsg && (
        <div className={`alert ${copyMsg.startsWith('✓') ? 'alert-success' : 'alert-warning'}`} style={{ marginBottom: '1rem' }}>
          <span>{copyMsg}</span>
        </div>
      )}

      {/* ── DAILY VIEW ── */}
      {viewMode === 'daily' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>Filter by Date:</label>
            <input type="date" className="form-control" style={{ width: 'auto' }} value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            {filterDate && <button className="btn btn-ghost btn-sm" onClick={() => setFilterDate('')}>Clear</button>}
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Staff Name</th><th>Department</th>
                  <th>Shift</th><th>Start</th><th>End</th><th>Status</th><th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {filteredDuties.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>
                    {filterDate ? 'No duty allocations for this date' : 'No duty allocations yet'}
                  </td></tr>
                ) : filteredDuties.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600 }}>{d.date}</td>
                    <td>{getStaffName(d.staffId)}</td>
                    <td><span className="chip">{getStaffDept(d.staffId)}</span></td>
                    {editingId === d.id ? (
                      <>
                        <td colSpan={3}>
                          <select className="form-control" style={{ fontSize: '0.8rem' }} value={editForm.shiftIdx} onChange={(e) => setEditForm((f) => ({ ...f, shiftIdx: +e.target.value }))}>
                            {SHIFTS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
                          </select>
                          <input
                            className="form-control"
                            style={{ fontSize: '0.78rem', marginTop: '0.3rem' }}
                            placeholder="Edit note (reason for change)..."
                            value={editForm.editNote}
                            onChange={(e) => setEditForm((f) => ({ ...f, editNote: e.target.value }))}
                          />
                        </td>
                        <td><span className="badge badge-locked"><Lock size={10} />Locked</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button className="btn btn-sm btn-success" onClick={() => saveEdit(d.id)}><Save size={13} /></button>
                            <button className="btn btn-sm btn-ghost" onClick={() => setEditingId(null)}><X size={13} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td><span className="badge badge-info">{d.shiftType}</span></td>
                        <td>{d.startTime}</td>
                        <td>{d.endTime}</td>
                        <td>
                          <span className="badge badge-locked"><Lock size={10} />Locked</span>
                          {d.editedAt && (
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-4)', marginTop: 2 }}>
                              Edited by {getUserById(d.editedBy ?? '')?.name ?? d.editedBy} on {new Date(d.editedAt).toLocaleDateString('en-IN')}
                              {d.editNote && ` — ${d.editNote}`}
                            </div>
                          )}
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => startEdit(d)} id={`edit-duty-${d.id}`}>
                            <Edit2 size={14} />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── WEEKLY VIEW ── */}
      {viewMode === 'weekly' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={prevWeek}><ChevronLeft size={16} /></button>
            <span style={{ fontWeight: 600, minWidth: 240, textAlign: 'center', color: 'var(--text-1)' }}>
              {new Date(weekDates[0]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — {new Date(weekDates[6]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={nextWeek}><ChevronRight size={16} /></button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: 130, padding: '0.6rem', background: 'var(--surface-2)', borderRadius: 'var(--radius) 0 0 0' }}>Staff</th>
                  {weekDates.map((d, i) => {
                    const isToday = d === new Date().toISOString().slice(0, 10);
                    return (
                      <th key={d} style={{
                        padding: '0.6rem', background: isToday ? 'rgba(200,16,46,0.1)' : 'var(--surface-2)',
                        color: isToday ? 'var(--red-light)' : 'var(--text-2)',
                        fontSize: '0.8rem', fontWeight: 600, textAlign: 'center',
                        borderLeft: '1px solid var(--border)',
                      }}>
                        <div>{WEEKDAYS[i]}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                          {new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                        {isToday && <div style={{ fontSize: '0.65rem', color: 'var(--red-light)' }}>Today</div>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {staff.filter((s) => s.isActive).map((s) => (
                  <tr key={s.id}>
                    <td style={{ padding: '0.5rem 0.75rem', background: 'var(--surface-2)', fontWeight: 600, fontSize: '0.82rem', borderTop: '1px solid var(--border)' }}>
                      <div>{s.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 400 }}>{s.department}</div>
                    </td>
                    {weekDates.map((dateStr) => {
                      const duty = duties.find((d) => d.staffId === s.id && d.date === dateStr);
                      return (
                        <td key={dateStr} style={{ padding: '0.4rem', borderLeft: '1px solid var(--border)', borderTop: '1px solid var(--border)', verticalAlign: 'top', minHeight: 60 }}>
                          {duty ? (
                            <div style={{ padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(200,16,46,0.12)', fontSize: '0.72rem', lineHeight: 1.4 }}>
                              <div style={{ fontWeight: 700, color: 'var(--red-light)' }}>{duty.startTime}–{duty.endTime}</div>
                              <div style={{ color: 'var(--text-3)' }}>{duty.shiftType}</div>
                            </div>
                          ) : (
                            <div style={{ color: 'var(--text-4)', fontSize: '0.7rem', textAlign: 'center', paddingTop: 8 }}>—</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── MONTHLY VIEW ── */}
      {viewMode === 'monthly' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={prevMonth}><ChevronLeft size={16} /></button>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', minWidth: 200, textAlign: 'center', color: 'var(--text-1)' }}>{monthLabel}</span>
            <button className="btn btn-ghost btn-sm" onClick={nextMonth}><ChevronRight size={16} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
            {WEEKDAYS.map((d) => (
              <div key={d} style={{ padding: '0.5rem', background: 'var(--surface-2)', textAlign: 'center', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-3)' }}>{d}</div>
            ))}
            {calCells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} style={{ minHeight: 80, background: 'var(--surface-2)', opacity: 0.3 }} />;
              const dateStr = getDayStr(day);
              const dayDuties = dutiesOnDate(dateStr);
              const isToday = dateStr === new Date().toISOString().slice(0, 10);
              return (
                <div key={dateStr} style={{
                  minHeight: 80, padding: '0.4rem',
                  background: isToday ? 'rgba(200,16,46,0.08)' : 'var(--surface-2)',
                  borderTop: isToday ? '2px solid var(--red)' : '1px solid var(--border)',
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem', color: isToday ? 'var(--red-light)' : 'var(--text-2)' }}>
                    {day}
                  </div>
                  {dayDuties.slice(0, 3).map((d) => (
                    <div key={d.id} style={{
                      fontSize: '0.65rem', padding: '0.15rem 0.35rem', borderRadius: 3,
                      background: 'rgba(200,16,46,0.15)', color: 'var(--text-1)',
                      marginBottom: 2, lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    }}>
                      {getStaffName(d.staffId)} {d.startTime}
                    </div>
                  ))}
                  {dayDuties.length > 3 && (
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>+{dayDuties.length - 3} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Allocate Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Allocate Duty</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleAllocate}>
              {error && <div className="alert alert-error"><X size={16} /><span>{error}</span></div>}

              <div className="form-group">
                <label className="form-label">Staff Member <span className="form-required">*</span></label>
                <select className="form-control" value={form.staffId} onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value }))} required>
                  <option value="">Select Staff</option>
                  {staff.filter((s) => s.isActive).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — {s.department}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date <span className="form-required">*</span></label>
                <input type="date" className="form-control" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
              </div>

              <div className="form-group">
                <label className="form-label">Shift <span className="form-required">*</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {SHIFTS.map((s, i) => (
                    <label key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.75rem',
                      background: form.shiftIdx === i ? 'rgba(200,16,46,0.1)' : 'var(--surface-2)',
                      borderRadius: 'var(--radius)', border: `1px solid ${form.shiftIdx === i ? 'var(--red)' : 'var(--border)'}`,
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}>
                      <input type="radio" name="shift" checked={form.shiftIdx === i} onChange={() => setForm((f) => ({ ...f, shiftIdx: i }))} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{s.type} shift</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving} id="confirm-duty-btn">
                  <Lock size={14} />{saving ? 'Saving...' : 'Allocate & Lock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
