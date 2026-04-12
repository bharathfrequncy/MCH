'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getUsers, createUser, updateUser, deleteUser, getDepartments } from '@/lib/storage';
import { User } from '@/lib/types';
import { UserPlus, Edit2, Trash2, X, Check, Search } from 'lucide-react';

const BLANK: Omit<User, 'id' | 'perMinuteWage'> = {
  name: '', role: 'staff', staffId: '', email: '', phone: '',
  department: '', designation: '', hourlyWage: 50,
  shiftType: '8hr', joinDate: '', password: '', isActive: true,
};

export default function AdminStaffPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [depts, setDepts] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = () => {
    setUsers(getUsers().filter(u => u.role === 'staff'));
    setDepts(getDepartments().map(d => d.name));
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.staffId.toLowerCase().includes(search.toLowerCase()) ||
    u.department.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditing(null); setForm({ ...BLANK }); setShowModal(true); };
  const openEdit = (u: User) => { setEditing(u); setForm({ name: u.name, role: u.role, staffId: u.staffId, email: u.email, phone: u.phone, department: u.department, designation: u.designation, hourlyWage: u.hourlyWage, shiftType: u.shiftType, joinDate: u.joinDate, password: u.password, isActive: u.isActive }); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    if (editing) {
      updateUser(editing.id, form);
    } else {
      createUser(form);
    }
    load();
    setShowModal(false);
    setSaving(false);
  };

  const handleDelete = (id: string) => {
    deleteUser(id);
    setDeleteConfirm(null);
    load();
  };

  const f = (k: keyof typeof form, v: string | number | boolean) => setForm(p => ({ ...p, [k]: v }));

  return (
    <DashboardLayout allowedRoles={['admin', 'moderator', 'owner']} title="Staff Management" subtitle="Add, edit and manage hospital staff">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Staff Members</div>
          <div className="page-subtitle">{users.length} staff registered</div>
        </div>
        <button id="add-staff-btn" className="btn btn-primary" onClick={openAdd}><UserPlus size={16} />Add Staff</button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: 360 }}>
        <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }} />
        <input className="form-control" style={{ paddingLeft: '2.5rem' }} placeholder="Search by name, ID, or department..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Staff ID</th><th>Name</th><th>Department</th><th>Designation</th>
              <th>Shift</th><th>Wage/hr</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>No staff found</td></tr>
            ) : filtered.map(u => (
              <tr key={u.id}>
                <td><span className="chip">{u.staffId}</span></td>
                <td style={{ fontWeight: 600 }}>{u.name}</td>
                <td>{u.department || '—'}</td>
                <td style={{ color: 'var(--text-2)' }}>{u.designation}</td>
                <td><span className="badge badge-info">{u.shiftType}</span></td>
                <td>₹{u.hourlyWage}/hr</td>
                <td>
                  <span className={`badge ${u.isActive ? 'badge-approved' : 'badge-declined'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)} title="Edit"><Edit2 size={14} /></button>
                    {deleteConfirm === u.id ? (
                      <>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}><Check size={14} /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(null)}><X size={14} /></button>
                      </>
                    ) : (
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteConfirm(u.id)} title="Delete"><Trash2 size={14} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Edit Staff' : 'Add New Staff'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name <span className="form-required">*</span></label>
                  <input className="form-control" value={form.name} onChange={e => f('name', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Staff ID <span className="form-required">*</span></label>
                  <input className="form-control" value={form.staffId} onChange={e => f('staffId', e.target.value)} required placeholder="MCH-STF-001" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email <span className="form-required">*</span></label>
                  <input className="form-control" type="email" value={form.email} onChange={e => f('email', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-control" value={form.phone} onChange={e => f('phone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Department <span className="form-required">*</span></label>
                  <select className="form-control" value={form.department} onChange={e => f('department', e.target.value)} required>
                    <option value="">Select Department</option>
                    {depts.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <input className="form-control" value={form.designation} onChange={e => f('designation', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Shift Type</label>
                  <select className="form-control" value={form.shiftType} onChange={e => f('shiftType', e.target.value as '8hr' | '9hr')}>
                    <option value="8hr">8 Hours</option>
                    <option value="9hr">9 Hours</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Hourly Wage (₹)</label>
                  <input className="form-control" type="number" min={0} value={form.hourlyWage} onChange={e => f('hourlyWage', Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Join Date</label>
                  <input className="form-control" type="date" value={form.joinDate} onChange={e => f('joinDate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Password <span className="form-required">*</span></label>
                  <input className="form-control" type="text" value={form.password} onChange={e => f('password', e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.isActive} onChange={e => f('isActive', e.target.checked)} />
                  <span className="form-label" style={{ marginBottom: 0 }}>Active Staff</span>
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Update Staff' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
