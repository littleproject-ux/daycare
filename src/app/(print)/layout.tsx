'use client';

// Layout for printable documents: no sidebar/topbar, plain white page.
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-stone-400">Memuat...</div>;
  }
  return <div className="min-h-screen bg-stone-100 print:bg-white">{children}</div>;
}
