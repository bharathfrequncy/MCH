'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, seedIfEmpty } from '@/lib/storage';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      await seedIfEmpty();
      const user = getCurrentUser();
      if (!user) {
        router.replace('/login');
      } else {
        router.replace(`/${user.role}`);
      }
    };
    init();
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d0d' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="animate-spin" style={{ width: 40, height: 40, border: '3px solid #333', borderTopColor: '#C8102E', borderRadius: '50%', margin: '0 auto 1rem' }} />
        <p style={{ color: '#666', fontSize: '0.875rem' }}>Loading...</p>
      </div>
    </div>
  );
}
