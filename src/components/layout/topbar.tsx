'use client';

import React from 'react';
import { Bell, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { UserAvatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface TopbarProps {
  title?: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { userProfile } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-stone-100 bg-white/90 backdrop-blur-sm px-6">
      <div className="flex flex-col min-w-0">
        {title && (
          <h1 className="text-lg font-semibold text-stone-900 truncate">{title}</h1>
        )}
        {subtitle && (
          <p className="text-xs text-stone-400 truncate">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Search button */}
        <Button variant="ghost" size="icon-sm" className="text-stone-400">
          <Search className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon-sm" className="relative text-stone-400">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-coral-500" />
        </Button>

        {/* User avatar */}
        <UserAvatar
          src={userProfile?.photoUrl}
          name={userProfile?.displayName || 'User'}
          size="sm"
        />
      </div>
    </header>
  );
}
