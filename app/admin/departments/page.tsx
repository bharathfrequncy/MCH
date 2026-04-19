'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getDepartments, createDepartment, deleteDepartment } from '@/lib/storage';
import { Department } from '@/lib/types';
import { Building2, Plus, Trash2, X, Check } from 'lucide-react';

export default function DepartmentsPage() {
  const [depts, setDepts] = useState<Department[]>([]);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    const allDepts = await getDepartments();
    setDepts(allDepts);
  };
  
  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (depts.some(d => d.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('Department already exists.');
      return;
    }
    setSaving(true);
    try {
      await createDepartment(trimmed);
      setNewName('');
      setError('');
      await load();
    } catch (err) {
      setError('Failed to create department.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDepartment(id);
    setDeleteConfirm(null);
    await load();
  };

  return (
    <DashboardLayout allowedRoles={['admin', 'jd', 'md']} title="Departments" subtitle="Manage hospital departments">
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.5rem' }}>

        {/* Add Form */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Add Department</h3>
            <Building2 size={18} color="var(--red-light)" />
          </div>
          <form onSubmit={handleAdd}>
            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}><X size={16} /><span>{error}</span></div>}
            <div className="form-group">
              <label className="form-label" htmlFor="dept-name">Department Name <span className="form-required">*</span></label>
              <input
                id="dept-name"
                className="form-control"
                placeholder="e.g. Intensive Care Unit"
                value={newName}
                onChange={e => { setNewName(e.target.value); setError(''); }}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving} id="add-dept-btn">
              <Plus size={16} />{saving ? 'Adding...' : 'Add Department'}
            </button>
          </form>

          <div className="divider" />
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
            Departments created here will appear in the staff management form when adding or editing staff.
          </div>
        </div>

        {/* Department List */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">All Departments</h3>
            <span className="badge badge-info">{depts.length}</span>
          </div>

          {depts.length === 0 ? (
            <div className="empty-state">
              <Building2 />
              <h3>No Departments Yet</h3>
              <p>Add your first department using the form</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {depts.map(d => (
                <div key={d.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.875rem 1rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)',
                  borderLeft: '3px solid var(--red)',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{d.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-4)' }}>
                      Added {new Date(d.createdAt).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {deleteConfirm === d.id ? (
                      <>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(d.id)}><Check size={12} /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(null)}><X size={12} /></button>
                      </>
                    ) : (
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteConfirm(d.id)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
