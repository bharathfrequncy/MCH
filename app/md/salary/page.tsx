'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getUsers, getSalaryRecords, generateMonthlySalary } from '@/lib/storage';
import { User, SalaryRecord } from '@/lib/types';
import { DollarSign, RefreshCw, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export default function SalaryPage() {
  const [staff, setStaff] = useState<User[]>([]);
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const load = async () => {
    const [allUsers, allSalary] = await Promise.all([
      getUsers(),
      getSalaryRecords()
    ]);
    setStaff(allUsers.filter(u => u.role === 'staff'));
    setRecords(allSalary);
  };

  useEffect(() => { load(); }, []);

  const [year, monthNum] = filterMonth.split('-').map(Number);
  const filteredRecords = records.filter(r => r.year === year && r.month === monthNum);

  const getRecord = (staffId: string) => filteredRecords.find(r => r.staffId === staffId);

  const handleGenerate = async (staffId: string) => {
    setGenerating(staffId);
    try {
      await generateMonthlySalary(staffId, monthNum, year);
      await load();
    } catch (err) {
      console.error('Failed to generate salary:', err);
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateAll = async () => {
    setGenerating('all');
    try {
      for (const s of staff) {
        await generateMonthlySalary(s.id, monthNum, year);
      }
      await load();
    } catch (err) {
      console.error('Failed to generate all salaries:', err);
    } finally {
      setGenerating(null);
    }
  };

  const totalNetSalary = filteredRecords.reduce((s, r) => s + r.netSalary, 0);
  const totalFines     = filteredRecords.reduce((s, r) => s + r.finesDeducted, 0);
  const totalOT        = filteredRecords.reduce((s, r) => s + r.otWages, 0);

  const monthLabel = new Date(year, monthNum - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <DashboardLayout allowedRoles={['admin', 'jd', 'md']} title="Salary Management" subtitle="View and generate monthly salary with OT wages and fine deductions">

      {/* Month Selector + Generate All */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>Month:</label>
          <input type="month" className="form-control" style={{ width: 'auto' }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={handleGenerateAll} disabled={generating === 'all'} id="generate-all-salary-btn">
          <RefreshCw size={16} className={generating === 'all' ? 'animate-spin' : ''} />
          {generating === 'all' ? 'Generating...' : `Generate All — ${monthLabel}`}
        </button>
      </div>

      {/* Summary Stats */}
      {filteredRecords.length > 0 && (
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-icon"><DollarSign /></div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>₹{totalNetSalary.toFixed(0)}</div>
            <div className="stat-label">Total Net Payable</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ color: '#22d3ee', background: 'rgba(34,211,238,0.1)' }}><TrendingUp /></div>
            <div className="stat-value" style={{ color: '#22d3ee' }}>₹{totalOT.toFixed(0)}</div>
            <div className="stat-label">Total OT Wages</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.1)' }}><TrendingDown /></div>
            <div className="stat-value" style={{ color: 'var(--danger)' }}>₹{totalFines.toFixed(0)}</div>
            <div className="stat-label">Total Fines Deducted</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.1)' }}><AlertTriangle /></div>
            <div className="stat-value">{filteredRecords.length}</div>
            <div className="stat-label">Records Generated</div>
          </div>
        </div>
      )}

      {/* Salary Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Staff</th><th>Designation</th><th>Shift</th><th>Wage/hr</th>
              <th>Base Salary</th><th>OT Wages</th><th>Fines Deducted</th><th>Net Salary</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>No staff found</td></tr>
            ) : staff.map(s => {
              const rec = getRecord(s.id);
              return (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td style={{ color: 'var(--text-2)' }}>{s.designation}</td>
                  <td><span className="badge badge-info">{s.shiftType}</span></td>
                  <td>₹{s.hourlyWage}/hr</td>
                  <td>{rec ? <span style={{ fontWeight: 600 }}>₹{rec.baseSalary.toFixed(2)}</span> : <span style={{ color: 'var(--text-4)' }}>—</span>}</td>
                  <td>{rec ? <span style={{ color: '#22d3ee', fontWeight: 600 }}>₹{rec.otWages.toFixed(2)}</span> : <span style={{ color: 'var(--text-4)' }}>—</span>}</td>
                  <td>{rec ? <span style={{ color: rec.finesDeducted > 0 ? 'var(--danger)' : 'var(--text-3)', fontWeight: 600 }}>₹{rec.finesDeducted.toFixed(2)}</span> : <span style={{ color: 'var(--text-4)' }}>—</span>}</td>
                  <td>
                    {rec ? (
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--success)' }}>₹{rec.netSalary.toFixed(2)}</span>
                    ) : (
                      <span style={{ color: 'var(--text-4)' }}>Not generated</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleGenerate(s.id)}
                      disabled={generating === s.id}
                      id={`generate-salary-${s.id}`}
                    >
                      <RefreshCw size={14} className={generating === s.id ? 'animate-spin' : ''} />
                      {generating === s.id ? '...' : rec ? 'Regenerate' : 'Generate'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="alert alert-info" style={{ marginTop: '1.5rem' }}>
        <DollarSign size={18} />
        <div>
          <strong>Salary Formula:</strong> Net Salary = Base Salary + (OT Wages at 1.5×) − Fines Deducted<br />
          <strong>Base Salary</strong> = Working Days × Shift Hours × Hourly Wage | <strong>OT</strong> = Approved OT days × 8hr × 1.5×
        </div>
      </div>
    </DashboardLayout>
  );
}
