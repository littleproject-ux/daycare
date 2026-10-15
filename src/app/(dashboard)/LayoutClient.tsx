// v0.4 — 2026-10-15
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/layout/sidebar';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, organizationId } = useAuth();
  const router = useRouter();
  const [orgName, setOrgName] = useState<string>('Daycare');
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!organizationId || !db) return;
    getDoc(doc(db, 'organizations', organizationId)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.name) setOrgName(data.name);
        if (data.logoUrl) setOrgLogoUrl(data.logoUrl);
      }
    }).catch(() => {});
  }, [organizationId]);

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
      {!showOverlay && <Sidebar orgName={orgName} orgLogoUrl={orgLogoUrl} />}
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
