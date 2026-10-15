// v0.5 — 2026-10-15
'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Bell, Search, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { UserAvatar } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TopbarProps {
  title?: string;
  subtitle?: string;
  unreadCount?: number;
}

export function Topbar({ title, subtitle, unreadCount = 0 }: TopbarProps) {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      router.push(`/cari?q=${encodeURIComponent(searchValue.trim())}`);
      setSearchOpen(false);
      setSearchValue('');
    }
    if (e.key === 'Escape') {
      setSearchOpen(false);
      setSearchValue('');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-white/95 backdrop-blur-md px-6 border-b border-slate-200/60"
      style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.04)' }}>

      <div className="flex flex-col min-w-0">
        {title && (
          <h1 className="text-[15px] font-bold text-slate-900 leading-tight truncate">{title}</h1>
        )}
        {subtitle && (
          <p className="text-[11px] text-slate-400 truncate leading-tight">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5">

        {/* Search — expands on click */}
        <div className={`flex items-center gap-2 h-9 rounded-xl border transition-all duration-200 overflow-hidden
          ${searchOpen
            ? 'w-56 border-violet-300 bg-white ring-2 ring-violet-100 px-3'
            : 'w-9 border-transparent bg-slate-100 hover:bg-slate-200 justify-center cursor-pointer px-0'
          }`}
          onClick={() => !searchOpen && setSearchOpen(true)}
        >
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          {searchOpen && (
            <>
              <input
                ref={inputRef}
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleSearch}
                placeholder="Cari..."
                className="flex-1 text-sm text-slate-700 placeholder:text-slate-400 bg-transparent outline-none min-w-0"
              />
              {searchValue && (
                <button onClick={() => setSearchValue('')} className="text-slate-400 hover:text-slate-600 shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Notifications — link ke halaman notifikasi */}
        <Link
          href="/notifikasi"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-violet-50 hover:text-violet-500 transition-colors"
        >
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] text-white font-bold px-0.5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Divider */}
        <div className="h-5 w-px bg-slate-200 mx-1" />

        {/* User avatar */}
        <button className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-slate-100 transition-colors">
          <UserAvatar
            src={userProfile?.photoUrl}
            name={userProfile?.displayName || 'User'}
            size="sm"
          />
          <span className="hidden sm:block text-xs font-medium text-slate-700 max-w-24 truncate">
            {userProfile?.displayName?.split(' ')[0]}
          </span>
        </button>
      </div>
    </header>
  );
}
