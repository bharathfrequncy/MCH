'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getStaffUsers, getDuties, createDuty, getCurrentUser, copyLastMonthDuties } from '@/lib/storage';
import { User, DutyAllocation } from '@/lib/types';
import { CalendarDays, Plus, Lock, X, Copy, Info } from 'lucide-react';

const SHIFTS = [
  { label: 'Morning (8AM – 4PM)',       start: '08:00', end: '16:00', type: '8hr', editable: false },
  { label: 'Afternoon Duty I (1PM – 9PM)',  start: '13:00', end: '21:00', type: '8hr', editable: false },
  { label: 'Afternoon Duty II (2PM – 10PM)', start: '14:00', end: '22:00', type: '8hr', editable: false },
  { label: 'Night Duty (8PM – 8AM)',    start: '20:00', end: '08:00', type: '12hr', editable: false },
  { label: 'Split duty',                start: '08:00', end: '16:00', type: 'split', editable: true },
  { label: 'CUSTOMISED DUTY',           start: '08:00', end: '16:00', type: 'custom', editable: true },
];

export default function DutyPage() {
  const [staff, setStaff] = useState<User[]>([]);
  const [duties, setDuties] = useState<DutyAllocation[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ staffId: '', date: '', shiftIdx: 0, startTime: '08:00', endTime: '16:00' });
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [user, setUser] = useState<User | null>(null);

  const load = async () => {
    const [staffUsers, allDuties] = await Promise.all([
      getStaffUsers(),
      getDuties()
    ]);
    setStaff(staffUsers);
    setDuties(allDuties);
    setUser(getCurrentUser());
  };

  useEffect(() => {
    load();
    const today = new Date().toISOString().slice(0, 10);
    setFilterDate(today);
    setForm(f => ({ ...f, date: today }));
  }, []);

  const handleCopyLastMonth = async () => {
    if (!user) return;
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    
    if (!confirm(`This will copy all duties from last month to ${y}-${String(m).padStart(2, '0')}. Skip existing entries?`)) return;
    
    setCopying(true);
    try {
      const count = await copyLastMonthDuties(y, m, user.id);
      alert(`Successfully copied ${count} duties.`);
      await load();
    } catch (err) {
      alert('Failed to copy duties.');
    } finally {
      setCopying(false);
    }
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.staffId || !form.date) { setError('Please fill all fields.'); return; }
    const shift = SHIFTS[form.shiftIdx];
    
    // Check duplicate
    const exists = duties.find(d => d.staffId === form.staffId && d.date === form.date);
    if (exists) { setError('This staff already has a duty on that date.'); return; }
    
    setSaving(true);
    setError('');
    
    try {
      await createDuty({
        staffId: form.staffId,
        date: form.date,
        shiftType: shift.type,
        startTime: shift.editable ? form.startTime : shift.start,
        endTime: shift.editable ? form.endTime : shift.end,
        allocatedBy: user?.id ?? '',
      });
      await load();
      setShowModal(false);
    } catch (err) {
      setError('Failed to allocate duty. Potentially a duplicate date for this staff.');
    } finally {
      setSaving(false);
    }
  };

  const filteredDuties = filterDate
    ? duties.filter(d => d.date === filterDate)
    : duties;

  const getStaffName = (id: string) => staff.find(s => s.id === id)?.name ?? id;
  const getStaffDept = (id: string) => staff.find(s => s.id === id)?.department ?? '—';

  return (
    <DashboardLayout allowedRoles={['admin', 'jd', 'md']} title="Duty Roster" subtitle="Allocate staff shifts — entries are locked once allocated">

      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Duty Management</div>
          <div className="page-subtitle">
            <span className="badge badge-locked" style={{ fontSize: '0.78rem' }}>
              <Lock size={12} /> Allocations are permanent
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={handleCopyLastMonth} disabled={copying}>
            {copying ? 'Copying...' : <><Copy size={16} /> Copy Last Month</>}
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} id="allocate-duty-btn">
            <Plus size={16} /> Allocate Duty
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CalendarDays size={16} color="var(--text-3)" />
          <label style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>View Date:</label>
        </div>
        <input type="date" className="form-control" style={{ width: 'auto' }} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        {filterDate && <button className="btn btn-ghost btn-sm" onClick={() => setFilterDate('')}>Show All</button>}
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Staff Details</th>
              <th>Shift / Timing</th>
              <th>Notes / History</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredDuties.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>
                {filterDate ? 'No duties allocated for this select date' : 'No duties allocated yet'}
              </td></tr>
            ) : filteredDuties.map(d => (
              <tr key={d.id}>
                <td style={{ fontWeight: 600 }}>{d.date}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{getStaffName(d.staffId)}</div>
                  <div className="chip chip-sm" style={{ marginTop: '0.2rem' }}>{getStaffDept(d.staffId)}</div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="badge badge-info">{d.shiftType}</span>
                    <span style={{ fontSize: '0.875rem' }}>{d.startTime} – {d.endTime}</span>
                  </div>
                </td>
                <td>
                  {d.editNote && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Info size={10} /> {d.editNote}
                    </div>
                  )}
                  {!d.editNote && <span style={{ color: 'var(--text-4)', fontSize: '0.75rem' }}>—</span>}
                </td>
                <td>
                  <span className="badge badge-locked">
                    <Lock size={10} /> Locked
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="modal-overlay" style={{ display: showModal ? 'flex' : 'none' }}>
        <div className="modal">
          <div className="modal-header">
            <h3 className="modal-title">New Duty Allocation</h3>
            <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
          </div>
          <form onSubmit={handleAllocate}>
            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}><X size={16} /><span>{error}</span></div>}

            <div className="form-group">
              <label className="form-label form-required">Staff Member</label>
              <select className="form-control" value={form.staffId} onChange={e => setForm(f => ({ ...f, staffId: e.target.value }))} required>
                <option value="">Select Staff</option>
                {staff.filter(s => s.isActive).map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.department})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label form-required">Date</label>
              <input type="date" className="form-control" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>

            <div className="form-group">
              <label className="form-label form-required">Select Shift</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {SHIFTS.map((s, i) => (
                  <label key={i} style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', 
                    background: form.shiftIdx === i ? 'rgba(200,16,46,0.1)' : 'var(--surface-2)', 
                    borderRadius: 'var(--radius)', border: `1px solid ${form.shiftIdx === i ? 'var(--red)' : 'var(--border)'}`, 
                    cursor: 'pointer' 
                  }}>
                    <input type="radio" name="shift" checked={form.shiftIdx === i} onChange={() => setForm(f => ({ ...f, shiftIdx: i, startTime: s.start, endTime: s.end }))} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{s.type} shift allocation</div>
                    </div>
                    {form.shiftIdx === i && s.editable && (
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                        <input type="time" className="form-control" style={{ fontSize: '0.75rem', padding: '0.3rem', width: 'auto' }} value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
                        <input type="time" className="form-control" style={{ fontSize: '0.75rem', padding: '0.3rem', width: 'auto' }} value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Lock size={14} /> {saving ? 'Saving...' : 'Allocate & Lock'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
