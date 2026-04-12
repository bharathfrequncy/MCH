'use client';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export default function TopBar({ title, subtitle }: TopBarProps) {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDate(now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">{title}</div>
        {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
      </div>
      <div className="topbar-right">
        <div style={{ textAlign: 'right' }}>
          <div className="topbar-time" style={{ color: 'var(--white)', fontWeight: 600 }}>{time}</div>
          <div className="topbar-time">{date}</div>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--radius)',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-2)', cursor: 'pointer',
          transition: 'all var(--transition)',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-3)'; (e.currentTarget as HTMLDivElement).style.color = 'var(--white)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLDivElement).style.color = 'var(--text-2)'; }}
        >
          <Bell size={16} />
        </div>
      </div>
    </header>
  );
}
