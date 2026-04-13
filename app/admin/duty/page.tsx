'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getStaffUsers, getDuties, createDuty, getCurrentUser } from '@/lib/storage';
import { User, DutyAllocation } from '@/lib/types';
import { CalendarDays, Plus, Lock, X } from 'lucide-react';

const SHIFTS = [
  { label: 'Morning  (6AM – 2PM)',   start: '06:00', end: '14:00', type: '8hr' as const },
  { label: 'Afternoon (2PM – 10PM)', start: '14:00', end: '22:00', type: '8hr' as const },
  { label: 'Night    (10PM – 6AM)',  start: '22:00', end: '06:00', type: '8hr' as const },
  { label: 'Extended  (8AM – 5PM)', start: '08:00', end: '17:00', type: '9hr' as const },
];

export default function DutyPage() {
  const [staff, setStaff] = useState<User[]>([]);
  const [duties, setDuties] = useState<DutyAllocation[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ staffId: '', date: '', shiftIdx: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const load = () => {
    setStaff(getStaffUsers());
    setDuties([...getDuties()].reverse());
    setCurrentUser(getCurrentUser());
  };

  useEffect(() => {
    load();
    const today = new Date().toISOString().slice(0, 10);
    setFilterDate(today);
    setForm(f => ({ ...f, date: today }));
  }, []);

  const filteredDuties = filterDate
    ? duties.filter(d => d.date === filterDate)
    : duties;

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.staffId || !form.date) { setError('Please fill all fields.'); return; }
    const shift = SHIFTS[form.shiftIdx];
    // Check duplicate
    const exists = duties.find(d => d.staffId === form.staffId && d.date === form.date);
    if (exists) { setError('This staff already has a duty on that date.'); return; }
    setSaving(true);
    setError('');
    await new Promise(r => setTimeout(r, 400));
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

  const getStaffName = (id: string) => staff.find(s => s.id === id)?.name ?? id;
  const getStaffDept = (id: string) => staff.find(s => s.id === id)?.department ?? '—';

  return (
    <DashboardLayout allowedRoles={['admin', 'jd', 'md']} title="Duty Roster" subtitle="Allocate staff shifts — once saved, entries are locked">

      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Duty Allocation</div>
          <div className="page-subtitle">
            <span className="badge badge-locked" style={{ fontSize: '0.78rem' }}>
              <Lock size={12} />All allocated duties are permanently locked
            </span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} id="allocate-duty-btn">
          <Plus size={16} />Allocate Duty
        </button>
      </div>

      {/* Date Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>Filter by Date:</label>
        <input type="date" className="form-control" style={{ width: 'auto' }} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        {filterDate && <button className="btn btn-ghost btn-sm" onClick={() => setFilterDate('')}>Clear</button>}
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Staff Name</th><th>Department</th>
              <th>Shift</th><th>Start</th><th>End</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredDuties.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>
                {filterDate ? 'No duty allocations for this date' : 'No duty allocations yet'}
              </td></tr>
            ) : filteredDuties.map(d => (
              <tr key={d.id}>
                <td style={{ fontWeight: 600 }}>{d.date}</td>
                <td>{getStaffName(d.staffId)}</td>
                <td><span className="chip">{getStaffDept(d.staffId)}</span></td>
                <td><span className="badge badge-info">{d.shiftType}</span></td>
                <td>{d.startTime}</td>
                <td>{d.endTime}</td>
                <td>
                  <span className="badge badge-locked">
                    <Lock size={10} />Locked
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Warning notice */}
      <div className="alert alert-warning" style={{ marginTop: '1.5rem' }}>
        <Lock size={18} />
        <div>
          <strong>Lock Policy:</strong> Once a duty is allocated and saved, it cannot be edited or modified. 
          Please verify all details before allocating. Contact the Owner/MD if a correction is needed.
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Allocate Duty</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleAllocate}>
              {error && <div className="alert alert-error"><X size={16} /><span>{error}</span></div>}

              <div className="form-group">
                <label className="form-label">Staff Member <span className="form-required">*</span></label>
                <select className="form-control" value={form.staffId} onChange={e => setForm(f => ({ ...f, staffId: e.target.value }))} required>
                  <option value="">Select Staff</option>
                  {staff.filter(s => s.isActive).map(s => (
                    <option key={s.id} value={s.id}>{s.name} — {s.department}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date <span className="form-required">*</span></label>
                <input type="date" className="form-control" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              </div>

              <div className="form-group">
                <label className="form-label">Shift <span className="form-required">*</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {SHIFTS.map((s, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: form.shiftIdx === i ? 'rgba(200,16,46,0.1)' : 'var(--surface-2)', borderRadius: 'var(--radius)', border: `1px solid ${form.shiftIdx === i ? 'var(--red)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.2s' }}>
                      <input type="radio" name="shift" checked={form.shiftIdx === i} onChange={() => setForm(f => ({ ...f, shiftIdx: i }))} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{s.type} shift</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="alert alert-warning">
                <Lock size={16} />
                <span>This duty will be <strong>locked immediately</strong> after saving and cannot be edited.</span>
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
