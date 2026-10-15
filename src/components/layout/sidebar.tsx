'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Baby,
  ClipboardList,
  CalendarCheck,
  FileText,
  Users,
  Wallet,
  FolderOpen,
  HeartPulse,
  MessageCircle,
  BarChart3,
  Settings,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Package,
  CalendarDays,
  CheckSquare,
  Bell,
  LogOut,
  Menu,
  X,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { UserAvatar } from '@/components/ui/avatar';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  roles?: string[];
  color: {
    activeBg: string;
    hoverBg: string;
    iconGradient: string;
    activeIconGradient: string;
    text: string;
    activeText: string;
    ring: string;
  };
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const COLORS = {
  pink:   { activeBg: 'bg-pink-100',    hoverBg: 'hover:bg-pink-50',    iconGradient: 'from-pink-400 to-rose-400',      activeIconGradient: 'from-pink-500 to-rose-500',      text: 'text-pink-500',   activeText: 'text-pink-700',   ring: 'ring-pink-200'   },
  sky:    { activeBg: 'bg-sky-100',     hoverBg: 'hover:bg-sky-50',     iconGradient: 'from-sky-400 to-blue-400',       activeIconGradient: 'from-sky-500 to-blue-500',       text: 'text-sky-500',    activeText: 'text-sky-700',    ring: 'ring-sky-200'    },
  violet: { activeBg: 'bg-violet-100',  hoverBg: 'hover:bg-violet-50',  iconGradient: 'from-violet-400 to-purple-400',  activeIconGradient: 'from-violet-500 to-purple-500',  text: 'text-violet-500', activeText: 'text-violet-700', ring: 'ring-violet-200' },
  green:  { activeBg: 'bg-emerald-100', hoverBg: 'hover:bg-emerald-50', iconGradient: 'from-emerald-400 to-teal-400',   activeIconGradient: 'from-emerald-500 to-teal-500',   text: 'text-emerald-500',activeText: 'text-emerald-700',ring: 'ring-emerald-200'},
  blue:   { activeBg: 'bg-blue-100',    hoverBg: 'hover:bg-blue-50',    iconGradient: 'from-blue-400 to-indigo-400',    activeIconGradient: 'from-blue-500 to-indigo-500',    text: 'text-blue-500',   activeText: 'text-blue-700',   ring: 'ring-blue-200'   },
  amber:  { activeBg: 'bg-amber-100',   hoverBg: 'hover:bg-amber-50',   iconGradient: 'from-amber-400 to-orange-400',   activeIconGradient: 'from-amber-500 to-orange-500',   text: 'text-amber-600',  activeText: 'text-amber-700',  ring: 'ring-amber-200'  },
  orange: { activeBg: 'bg-orange-100',  hoverBg: 'hover:bg-orange-50',  iconGradient: 'from-orange-400 to-red-400',     activeIconGradient: 'from-orange-500 to-red-500',     text: 'text-orange-500', activeText: 'text-orange-700', ring: 'ring-orange-200' },
  teal:   { activeBg: 'bg-teal-100',    hoverBg: 'hover:bg-teal-50',    iconGradient: 'from-teal-400 to-cyan-400',      activeIconGradient: 'from-teal-500 to-cyan-500',      text: 'text-teal-500',   activeText: 'text-teal-700',   ring: 'ring-teal-200'   },
  rose:   { activeBg: 'bg-rose-100',    hoverBg: 'hover:bg-rose-50',    iconGradient: 'from-rose-400 to-pink-400',      activeIconGradient: 'from-rose-500 to-pink-500',      text: 'text-rose-500',   activeText: 'text-rose-700',   ring: 'ring-rose-200'   },
  indigo: { activeBg: 'bg-indigo-100',  hoverBg: 'hover:bg-indigo-50',  iconGradient: 'from-indigo-400 to-violet-400',  activeIconGradient: 'from-indigo-500 to-violet-500',  text: 'text-indigo-500', activeText: 'text-indigo-700', ring: 'ring-indigo-200' },
  lime:   { activeBg: 'bg-lime-100',    hoverBg: 'hover:bg-lime-50',    iconGradient: 'from-lime-400 to-green-400',     activeIconGradient: 'from-lime-500 to-green-500',     text: 'text-lime-600',   activeText: 'text-lime-700',   ring: 'ring-lime-200'   },
  coral:  { activeBg: 'bg-orange-100',  hoverBg: 'hover:bg-orange-50',  iconGradient: 'from-orange-400 to-red-400',     activeIconGradient: 'from-orange-500 to-red-500',     text: 'text-orange-500', activeText: 'text-orange-700', ring: 'ring-orange-200' },
  cyan:   { activeBg: 'bg-cyan-100',    hoverBg: 'hover:bg-cyan-50',    iconGradient: 'from-cyan-400 to-sky-400',       activeIconGradient: 'from-cyan-500 to-sky-500',       text: 'text-cyan-500',   activeText: 'text-cyan-700',   ring: 'ring-cyan-200'   },
  purple: { activeBg: 'bg-purple-100',  hoverBg: 'hover:bg-purple-50',  iconGradient: 'from-purple-400 to-violet-400',  activeIconGradient: 'from-purple-500 to-violet-500',  text: 'text-purple-500', activeText: 'text-purple-700', ring: 'ring-purple-200' },
};

const staffNavSections: NavSection[] = [
  {
    title: 'UTAMA',
    items: [
      { label: 'Dashboard',      href: '/dashboard',      icon: <LayoutDashboard className="h-4 w-4" />, color: COLORS.sky    },
    ],
  },
  {
    title: 'ANAK & STAF',
    items: [
      { label: 'Data Anak',      href: '/anak',           icon: <Baby className="h-4 w-4" />,           color: COLORS.pink,   roles: ['owner','admin','caregiver'] },
      { label: 'Pendaftaran',    href: '/pendaftaran',    icon: <ClipboardList className="h-4 w-4" />,   color: COLORS.violet, roles: ['owner','admin'] },
      { label: 'Data Staf',      href: '/staf',           icon: <Users className="h-4 w-4" />,          color: COLORS.indigo, roles: ['owner','admin'] },
      { label: 'Ruangan',        href: '/ruangan',        icon: <Building2 className="h-4 w-4" />,      color: COLORS.teal,   roles: ['owner','admin'] },
    ],
  },
  {
    title: 'OPERASIONAL',
    items: [
      { label: 'Kehadiran',      href: '/kehadiran',      icon: <CalendarCheck className="h-4 w-4" />,  color: COLORS.green,  roles: ['owner','admin','caregiver'] },
      { label: 'Laporan Harian', href: '/laporan-harian', icon: <FileText className="h-4 w-4" />,       color: COLORS.orange, roles: ['owner','admin','caregiver'] },
      { label: 'Jadwal & Acara', href: '/jadwal',         icon: <CalendarDays className="h-4 w-4" />,   color: COLORS.blue   },
      { label: 'Tugas',          href: '/tugas',          icon: <CheckSquare className="h-4 w-4" />,    color: COLORS.teal   },
    ],
  },
  {
    title: 'KESEHATAN & DOKUMEN',
    items: [
      { label: 'Kesehatan',      href: '/kesehatan',      icon: <HeartPulse className="h-4 w-4" />,     color: COLORS.rose,  roles: ['owner','admin','caregiver'] },
      { label: 'Dokumen',        href: '/dokumen',        icon: <FolderOpen className="h-4 w-4" />,     color: COLORS.amber, roles: ['owner','admin'] },
    ],
  },
  {
    title: 'KEUANGAN',
    items: [
      { label: 'Keuangan',       href: '/keuangan',       icon: <Wallet className="h-4 w-4" />,         color: COLORS.lime,   roles: ['owner','admin','finance'] },
      { label: 'Inventaris',     href: '/inventaris',     icon: <Package className="h-4 w-4" />,        color: COLORS.cyan,   roles: ['owner','admin'] },
    ],
  },
  {
    title: 'KOMUNIKASI',
    items: [
      { label: 'Komunikasi',     href: '/komunikasi',     icon: <MessageCircle className="h-4 w-4" />,  color: COLORS.purple },
      { label: 'Laporan',        href: '/laporan',        icon: <BarChart3 className="h-4 w-4" />,      color: COLORS.coral,  roles: ['owner','admin','finance','auditor'] },
    ],
  },
];

const parentNavSections: NavSection[] = [
  {
    items: [
      { label: 'Beranda',        href: '/dashboard',           icon: <LayoutDashboard className="h-4 w-4" />, color: COLORS.sky    },
      { label: 'Anak Saya',      href: '/anak',                icon: <Baby className="h-4 w-4" />,           color: COLORS.pink   },
      { label: 'Laporan Harian', href: '/laporan-harian-saya', icon: <FileText className="h-4 w-4" />,       color: COLORS.orange },
      { label: 'Kehadiran',      href: '/kehadiran-saya',      icon: <CalendarCheck className="h-4 w-4" />,  color: COLORS.green  },
      { label: 'Tagihan',        href: '/tagihan-saya',        icon: <Wallet className="h-4 w-4" />,         color: COLORS.amber  },
      { label: 'Pengumuman',     href: '/komunikasi',          icon: <Bell className="h-4 w-4" />,           color: COLORS.violet },
      { label: 'Jadwal',         href: '/jadwal',              icon: <CalendarDays className="h-4 w-4" />,   color: COLORS.blue   },
    ],
  },
];

const bottomItems: NavItem[] = [
  { label: 'Pengaturan', href: '/pengaturan', icon: <Settings className="h-4 w-4" />, color: COLORS.sky   },
  { label: 'Panduan',    href: '/panduan',    icon: <BookOpen className="h-4 w-4" />, color: COLORS.green },
];

interface SidebarProps {
  orgName?: string;
  orgLogoUrl?: string;
}

export function Sidebar({ orgName = 'Daycare', orgLogoUrl }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { userProfile, role, logout } = useAuth();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  const resolvedSections = role === 'parent' ? parentNavSections : staffNavSections;

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        title={collapsed ? item.label : undefined}
        className={cn(
          'flex items-center gap-2.5 rounded-2xl px-2.5 py-1.5 text-sm font-medium transition-all duration-200 group relative',
          active
            ? `${item.color.activeBg} ${item.color.activeText} shadow-sm ring-1 ${item.color.ring}`
            : `text-slate-500 ${item.color.hoverBg} hover:${item.color.text}`,
          collapsed && 'justify-center px-2'
        )}
      >
        <span className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm transition-all duration-200',
          active
            ? `${item.color.activeIconGradient} scale-105 shadow-md`
            : `${item.color.iconGradient} opacity-80 group-hover:opacity-100 group-hover:scale-105`
        )}>
          <span className="text-white [&>svg]:h-4 [&>svg]:w-4">
            {item.icon}
          </span>
        </span>
        {!collapsed && (
          <>
            <span className="truncate flex-1">{item.label}</span>
            {item.badge && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 text-xs text-white font-semibold px-1.5">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col border-r border-slate-200/80 bg-white">
      {/* Decorative top rainbow strip */}
      <div className="h-1 w-full bg-gradient-to-r from-pink-400 via-violet-400 via-sky-400 via-emerald-400 to-amber-400 shrink-0" />

      {/* Logo / Org Name */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-3.5 border-b border-slate-100',
        collapsed && 'justify-center px-2'
      )}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 to-orange-400 text-white font-bold text-sm shadow-md shadow-orange-200">
          {orgLogoUrl
            ? <img src={orgLogoUrl} alt={orgName} className="h-full w-full rounded-2xl object-cover" />
            : orgName.substring(0, 2).toUpperCase()
          }
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{orgName}</p>
            <p className="text-[11px] text-slate-400 font-medium">Manajemen Daycare</p>
          </div>
        )}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-3">
        {resolvedSections.map((section, si) => (
          <div key={si}>
            {section.title && !collapsed && (
              <p className="px-2 pb-1.5 text-[9.5px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom items */}
      <div className="border-t border-slate-100 pt-2 pb-3 px-2.5 space-y-0.5">
        {bottomItems.map((item) => <NavLink key={item.href} item={item} />)}

        {/* User card */}
        <div className={cn(
          'flex items-center gap-2.5 rounded-2xl px-2.5 py-2 mt-2 bg-slate-50 border border-slate-200',
          collapsed && 'justify-center px-2'
        )}>
          <UserAvatar src={userProfile?.photoUrl} name={userProfile?.displayName || 'User'} size="sm" />
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">{userProfile?.displayName}</p>
                <p className="text-[10px] text-slate-400 capitalize">{role || 'Pengguna'}</p>
              </div>
              <button onClick={logout} className="text-slate-400 hover:text-rose-500 transition-colors p-0.5 rounded-lg hover:bg-rose-50" title="Keluar">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex absolute -right-3 top-16 h-6 w-6 items-center justify-center rounded-full bg-white border-2 border-slate-200 text-slate-400 hover:text-violet-500 hover:border-violet-300 shadow-md transition-all duration-200"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-md text-slate-600"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        'lg:hidden fixed left-0 top-0 z-40 h-full w-64 shadow-2xl transform transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col relative h-screen transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}>
        <SidebarContent />
      </aside>
    </>
  );
}
