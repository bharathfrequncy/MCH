'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, CalendarDays, ClipboardList,
  MapPin, FileBarChart2, AlertTriangle, DollarSign,
  Settings, LogOut, Building2, ShieldCheck, UserCog,
} from 'lucide-react';
import { User } from '@/lib/types';
import { logout, getOTRequests } from '@/lib/storage';
import { useEffect, useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badgeKey?: string;
}

function getNavItems(role: string): NavItem[] {
  const base = [
    { href: `/${role}`, label: 'Dashboard', icon: <LayoutDashboard /> },
  ];

  if (role === 'staff') {
    return [
      ...base,
      { href: '/staff/attendance',  label: 'Attendance',    icon: <MapPin /> },
      { href: '/staff/leave',       label: 'Leave (EC/CL)', icon: <CalendarDays /> },
      { href: '/staff/ot-request',  label: 'OT Request',    icon: <ClipboardList /> },
      { href: '/staff/my-records',  label: 'My Records',    icon: <FileBarChart2 /> },
    ];
  }

  if (role === 'admin') {
    return [
      ...base,
      { href: '/admin/staff',       label: 'Staff',         icon: <Users /> },
      { href: '/admin/departments', label: 'Departments',   icon: <Building2 /> },
      { href: '/admin/duty',        label: 'Duty Roster',   icon: <CalendarDays /> },
      { href: '/admin/ot-requests', label: 'OT Requests',   icon: <ClipboardList />, badgeKey: 'ot' },
      { href: '/admin/leaves',      label: 'Leaves',        icon: <CalendarDays /> },
      { href: '/admin/attendance',  label: 'Attendance',    icon: <MapPin /> },
      { href: '/admin/fines',       label: 'Fines',         icon: <AlertTriangle /> },
      { href: '/admin/reports',     label: 'Reports',       icon: <FileBarChart2 /> },
      { href: '/admin/settings',    label: 'Settings',      icon: <Settings /> },
    ];
  }

  if (role === 'jd') {
    return [
      ...base,
      { href: '/jd/staff',       label: 'Staff',         icon: <Users /> },
      { href: '/jd/departments', label: 'Departments',   icon: <Building2 /> },
      { href: '/jd/duty',        label: 'Duty Roster',   icon: <CalendarDays /> },
      { href: '/jd/ot-requests', label: 'OT Requests',   icon: <ClipboardList />, badgeKey: 'ot' },
      { href: '/jd/leaves',      label: 'Leaves',        icon: <CalendarDays /> },
      { href: '/jd/attendance',  label: 'Attendance',    icon: <MapPin /> },
      { href: '/jd/fines',       label: 'Fines',         icon: <AlertTriangle /> },
      { href: '/jd/salary',      label: 'Salary',        icon: <DollarSign /> },
      { href: '/jd/reports',     label: 'Reports',       icon: <FileBarChart2 /> },
      { href: '/jd/settings',    label: 'Settings',      icon: <Settings /> },
    ];
  }

  if (role === 'md') {
    return [
      ...base,
      { href: '/md/staff',       label: 'Staff',         icon: <Users /> },
      { href: '/md/departments', label: 'Departments',   icon: <Building2 /> },
      { href: '/md/duty',        label: 'Duty Roster',   icon: <CalendarDays /> },
      { href: '/md/ot-requests', label: 'OT Requests',   icon: <ClipboardList />, badgeKey: 'ot' },
      { href: '/md/leaves',      label: 'Leaves',        icon: <CalendarDays /> },
      { href: '/md/attendance',  label: 'Attendance',    icon: <MapPin /> },
      { href: '/md/fines',       label: 'Fines',         icon: <AlertTriangle /> },
      { href: '/md/salary',      label: 'Salary',        icon: <DollarSign /> },
      { href: '/md/reports',     label: 'Reports',       icon: <FileBarChart2 /> },
      { href: '/md/settings',    label: 'Settings',      icon: <Settings /> },
    ];
  }

  return base;
}

const ROLE_LABELS: Record<string, string> = {
  staff: 'Staff',
  admin: 'Administrator',
  jd: 'Joint Director',
  md: 'Managing Director',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  staff:     <UserCog size={14} />,
  admin:     <ShieldCheck size={14} />,
  jd:        <ShieldCheck size={14} />,
  md:        <ShieldCheck size={14} />,
};

export default function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = getNavItems(user.role);
  const [pendingOT, setPendingOT] = useState(0);

  useEffect(() => {
    const pending = getOTRequests().filter(r => r.status === 'pending').length;
    setPendingOT(pending);
  }, []);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const initials = user.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <img src="/logo.png" alt="Mother Care Hospital Logo" className="sidebar-logo" />
        <div className="sidebar-title">Mother Care Hospital</div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== `/${user.role}` && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={`nav-item${isActive ? ' active' : ''}`}>
              {item.icon}
              <span>{item.label}</span>
              {item.badgeKey === 'ot' && pendingOT > 0 && (
                <span className="nav-badge">{pendingOT}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name" title={user.name}>{user.name}</div>
            <div className="sidebar-user-role">{ROLE_LABELS[user.role] ?? user.role}</div>
          </div>
        </div>
        <button className="nav-item" style={{ width: '100%', border: 'none', background: 'none' }} onClick={handleLogout} id="logout-btn">
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
