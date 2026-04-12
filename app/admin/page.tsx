'use client';
import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import { getUsers, getOTRequests, getAttendanceLogs, getFines, getDuties } from '@/lib/storage';
import { Users, ClipboardList, MapPin, AlertTriangle, CalendarDays, CheckCircle2 } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ staff: 0, pendingOT: 0, todayPresent: 0, pendingFines: 0, duties: 0, approvedOT: 0 });

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const staff = getUsers().filter(u => u.role === 'staff').length;
    const otReqs = getOTRequests();
    const pendingOT = otReqs.filter(r => r.status === 'pending').length;
    const approvedOT = otReqs.filter(r => r.status === 'approved').length;
    const todayPresent = getAttendanceLogs().filter(a => a.date === today && a.status !== 'absent').length;
    const pendingFines = getFines().filter(f => f.fineStatus === 'pending').length;
    const duties = getDuties().length;
    setStats({ staff, pendingOT, todayPresent, pendingFines, duties, approvedOT });
  }, []);

  const cards = [
    { icon: <Users />, value: stats.staff, label: 'Total Staff', color: '#3b82f6' },
    { icon: <MapPin />, value: stats.todayPresent, label: "Today's Present", color: 'var(--success)' },
    { icon: <ClipboardList />, value: stats.pendingOT, label: 'Pending OT Requests', color: '#f59e0b' },
    { icon: <CheckCircle2 />, value: stats.approvedOT, label: 'OT Approved', color: '#22d3ee' },
    { icon: <CalendarDays />, value: stats.duties, label: 'Duty Allocations', color: '#a78bfa' },
    { icon: <AlertTriangle />, value: stats.pendingFines, label: 'Pending Fines', color: 'var(--red-light)' },
  ];

  return (
    <DashboardLayout allowedRoles={['admin', 'moderator', 'owner']} title="Admin Dashboard" subtitle="Hospital operations overview">
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {cards.map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-icon" style={{ color: c.color, background: `${c.color}22` }}>{c.icon}</div>
            <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Quick Guide</h3></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {[
            { icon: '👥', title: 'Manage Staff', desc: 'Add, edit, or deactivate hospital staff members' },
            { icon: '📅', title: 'Duty Roster', desc: 'Allocate shifts — locked once saved, cannot be edited' },
            { icon: '✅', title: 'OT Requests', desc: 'Review and approve/decline OT duty requests' },
            { icon: '💸', title: 'Fines', desc: 'View and manage early-checkout fines' },
            { icon: '📊', title: 'Reports', desc: 'Generate and export attendance and duty reports' },
          ].map(item => (
            <div key={item.title} style={{ padding: '1rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{item.icon}</div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{item.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
