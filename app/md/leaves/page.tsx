'use client';
import LeavesPage from '@/app/admin/leaves/page';

export default function MDLeavesPage() {
  // MD gets their own role-specific approval view
  return <LeavesPage role="md" />;
}
