'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getFines, markFinePaid, getUsers } from '@/lib/storage';
import { Fine, User } from '@/lib/types';
import { AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react';

export default function FinesPage() {
  const [fines, setFines] = useState<Fine[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');
  const [filterStaff, setFilterStaff] = useState('');

  const load = () => {
    setFines([...getFines()].reverse());
    setUsers(getUsers());
  };

  useEffect(() => { load(); }, []);

  const filtered = fines.filter(f =>
    (filterStatus === 'all' || f.fineStatus === filterStatus) &&
    (!filterStaff || f.staffId === filterStaff)
  );

  const totalPending = fines.filter(f => f.fineStatus === 'pending').reduce((s, f) => s + f.fineAmount, 0);
  const totalPaid    = fines.filter(f => f.fineStatus === 'paid').reduce((s, f) => s + f.fineAmount, 0);

  const handleMarkPaid = (id: string) => {
    markFinePaid(id);
    load();
  };

  return (
    <DashboardLayout allowedRoles={['admin', 'moderator', 'owner']} title="Fine Management" subtitle="Track and manage early-checkout fines">

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon"><AlertTriangle /></div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>₹{totalPending.toFixed(2)}</div>
          <div className="stat-label">Pending Fines</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--success)', background: 'rgba(34,197,94,0.1)' }}><CheckCircle2 /></div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>₹{totalPaid.toFixed(2)}</div>
          <div className="stat-label">Collected Fines</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#fbbf24', background: 'rgba(245,158,11,0.1)' }}><DollarSign /></div>
          <div className="stat-value">₹{(totalPending + totalPaid).toFixed(2)}</div>
          <div className="stat-label">Total Fines Generated</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['all', 'pending', 'paid'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-ghost'}`} style={{ textTransform: 'capitalize' }}>{s}</button>
          ))}
        </div>
        <select className="form-control" style={{ width: 'auto' }} value={filterStaff} onChange={e => setFilterStaff(e.target.value)}>
          <option value="">All Staff</option>
          {users.filter(u => u.role === 'staff').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Staff</th><th>Shortfall</th><th>Rate (×2)</th>
              <th>Fine Amount</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>No fines found</td></tr>
            ) : filtered.map(f => (
              <tr key={f.id}>
                <td style={{ fontWeight: 600 }}>{f.date}</td>
                <td>{f.staffName}</td>
                <td>{f.shortfallMinutes} min</td>
                <td style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>₹{f.perMinuteWage.toFixed(2)}/min × 2</td>
                <td style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '1rem' }}>₹{f.fineAmount.toFixed(2)}</td>
                <td><span className={`badge ${f.fineStatus === 'paid' ? 'badge-paid' : 'badge-pending'}`}>{f.fineStatus}</span></td>
                <td>
                  {f.fineStatus === 'pending' && (
                    <button className="btn btn-success btn-sm" onClick={() => handleMarkPaid(f.id)} id={`pay-fine-${f.id}`}>
                      <CheckCircle2 size={14} />Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="alert alert-info" style={{ marginTop: '1.5rem' }}>
        <AlertTriangle size={18} />
        <div><strong>Fine Formula:</strong> Shortfall minutes × (Hourly Wage ÷ 60) × 2 = Fine Amount. Example: 30 min short × ₹0.83/min × 2 = ₹50.00</div>
      </div>
    </DashboardLayout>
  );
}
