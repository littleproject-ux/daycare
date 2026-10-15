'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Always render children so Next.js instant-navigation can validate child segments.
  // Loading / unauthenticated states are shown as full-screen overlays on top.
  const showOverlay = isLoading || !isAuthenticated;

  return (
    <div className="flex h-screen overflow-hidden bg-[#fffcfa]">
      {!showOverlay && <Sidebar />}
      <main className="flex-1 overflow-y-auto">
        {/* children must always be in the tree — overlaid when not ready */}
        <div className={showOverlay ? 'invisible' : undefined}>
          {children}
        </div>
      </main>

      {/* Full-screen overlay while loading or redirecting */}
      {showOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#fffcfa]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-coral-400 to-coral-600 animate-pulse" />
            <p className="text-sm text-stone-400 animate-pulse">Memuat...</p>
          </div>
        </div>
      )}
    </div>
  );
}
