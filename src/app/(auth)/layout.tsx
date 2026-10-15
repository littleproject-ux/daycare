'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-[#fffcfa] to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-coral-400 to-coral-600 text-white text-xl font-bold shadow-lg mb-4">
            DC
          </div>
          <h2 className="text-2xl font-bold text-stone-900">Daycare Manager</h2>
          <p className="text-stone-500 text-sm mt-1">Sistem Manajemen Daycare Profesional</p>
        </div>

        {/* Auth card */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
