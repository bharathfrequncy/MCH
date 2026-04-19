'use client';
import LeavesPage from '@/app/admin/leaves/page';

export default function JDLeavesPage() {
  // JD gets their own role-specific approval view
  return <LeavesPage role="jd" />;
}
