'use client';
import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/storage';
import { UserRole, User } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

interface DashboardLayoutProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  title: string;
  subtitle?: string;
}

export default function DashboardLayout({ children, allowedRoles, title, subtitle }: DashboardLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.replace('/login'); return; }
    if (!allowedRoles.includes(u.role)) { router.replace(`/${u.role}`); return; }
    setUser(u);
    setChecking(false);
  }, [router, allowedRoles]);

  if (checking || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d0d' }}>
        <div className="animate-spin" style={{ width: 36, height: 36, border: '3px solid #222', borderTopColor: '#C8102E', borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar user={user} />
      <div className="main-content">
        <TopBar title={title} subtitle={subtitle} />
        <div className="page-container">
          {children}
        </div>
      </div>
    </div>
  );
}
