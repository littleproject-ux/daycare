'use client';

import React from 'react';
import { Bell, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { UserAvatar } from '@/components/ui/avatar';

interface TopbarProps {
  title?: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { userProfile } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-white/95 backdrop-blur-md px-6 border-b border-stone-200/60"
      style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)' }}>
      <div className="flex flex-col min-w-0">
        {title && (
          <h1 className="text-[15px] font-bold text-stone-900 leading-tight truncate">{title}</h1>
        )}
        {subtitle && (
          <p className="text-[11px] text-stone-400 truncate leading-tight">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {/* Search */}
        <button className="flex items-center gap-2 h-8 px-3 rounded-lg bg-stone-100 text-stone-400 hover:bg-stone-200 hover:text-stone-600 transition-colors text-xs">
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Cari...</span>
        </button>

        {/* Notifications */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-coral-500" />
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-stone-200 mx-1" />

        {/* User avatar */}
        <button className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-stone-100 transition-colors">
          <UserAvatar
            src={userProfile?.photoUrl}
            name={userProfile?.displayName || 'User'}
            size="sm"
          />
          <span className="hidden sm:block text-xs font-medium text-stone-700 max-w-24 truncate">
            {userProfile?.displayName?.split(' ')[0]}
          </span>
        </button>
      </div>
    </header>
  );
}
