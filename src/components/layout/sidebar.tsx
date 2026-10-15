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

// Each nav item has a color: [bgActive, bgHover, iconColor, textColor]
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
  };
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

// color: { activeBg, hoverBg, iconGradient (inactive), activeIconGradient, text, activeText }
const COLORS = {
  pink:   { activeBg: 'bg-pink-50',    hoverBg: 'hover:bg-pink-50/60',   iconGradient: 'from-pink-400 to-rose-500',      activeIconGradient: 'from-pink-500 to-rose-600',      text: 'text-pink-600',   activeText: 'text-pink-700'   },
  sky:    { activeBg: 'bg-sky-50',     hoverBg: 'hover:bg-sky-50/60',    iconGradient: 'from-sky-400 to-blue-500',       activeIconGradient: 'from-sky-500 to-blue-600',       text: 'text-sky-600',    activeText: 'text-sky-700'    },
  violet: { activeBg: 'bg-violet-50',  hoverBg: 'hover:bg-violet-50/60', iconGradient: 'from-violet-400 to-purple-500',  activeIconGradient: 'from-violet-500 to-purple-600',  text: 'text-violet-600', activeText: 'text-violet-700' },
  green:  { activeBg: 'bg-emerald-50', hoverBg: 'hover:bg-emerald-50/60',iconGradient: 'from-emerald-400 to-teal-500',   activeIconGradient: 'from-emerald-500 to-teal-600',   text: 'text-emerald-600',activeText: 'text-emerald-700'},
  blue:   { activeBg: 'bg-blue-50',    hoverBg: 'hover:bg-blue-50/60',   iconGradient: 'from-blue-400 to-indigo-500',    activeIconGradient: 'from-blue-500 to-indigo-600',    text: 'text-blue-600',   activeText: 'text-blue-700'   },
  amber:  { activeBg: 'bg-amber-50',   hoverBg: 'hover:bg-amber-50/60',  iconGradient: 'from-amber-400 to-orange-500',   activeIconGradient: 'from-amber-500 to-orange-600',   text: 'text-amber-600',  activeText: 'text-amber-700'  },
  orange: { activeBg: 'bg-orange-50',  hoverBg: 'hover:bg-orange-50/60', iconGradient: 'from-orange-400 to-red-500',     activeIconGradient: 'from-orange-500 to-red-600',     text: 'text-orange-600', activeText: 'text-orange-700' },
  teal:   { activeBg: 'bg-teal-50',    hoverBg: 'hover:bg-teal-50/60',   iconGradient: 'from-teal-400 to-cyan-500',      activeIconGradient: 'from-teal-500 to-cyan-600',      text: 'text-teal-600',   activeText: 'text-teal-700'   },
  rose:   { activeBg: 'bg-rose-50',    hoverBg: 'hover:bg-rose-50/60',   iconGradient: 'from-rose-400 to-pink-500',      activeIconGradient: 'from-rose-500 to-pink-600',      text: 'text-rose-600',   activeText: 'text-rose-700'   },
  indigo: { activeBg: 'bg-indigo-50',  hoverBg: 'hover:bg-indigo-50/60', iconGradient: 'from-indigo-400 to-violet-500',  activeIconGradient: 'from-indigo-500 to-violet-600',  text: 'text-indigo-600', activeText: 'text-indigo-700' },
  lime:   { activeBg: 'bg-lime-50',    hoverBg: 'hover:bg-lime-50/60',   iconGradient: 'from-lime-400 to-green-500',     activeIconGradient: 'from-lime-500 to-green-600',     text: 'text-lime-600',   activeText: 'text-lime-700'   },
  coral:  { activeBg: 'bg-orange-50',  hoverBg: 'hover:bg-orange-50/60', iconGradient: 'from-orange-400 to-red-400',     activeIconGradient: 'from-orange-500 to-red-500',     text: 'text-orange-600', activeText: 'text-orange-700' },
  cyan:   { activeBg: 'bg-cyan-50',    hoverBg: 'hover:bg-cyan-50/60',   iconGradient: 'from-cyan-400 to-sky-500',       activeIconGradient: 'from-cyan-500 to-sky-600',       text: 'text-cyan-600',   activeText: 'text-cyan-700'   },
  purple: { activeBg: 'bg-purple-50',  hoverBg: 'hover:bg-purple-50/60', iconGradient: 'from-purple-400 to-violet-500',  activeIconGradient: 'from-purple-500 to-violet-600',  text: 'text-purple-600', activeText: 'text-purple-700' },
};

// Staff / admin nav sections
const staffNavSections: NavSection[] = [
  {
    title: 'UTAMA',
    items: [
      { label: 'Dashboard',      href: '/dashboard',      icon: <LayoutDashboard className="h-4.5 w-4.5" />, color: COLORS.sky    },
    ],
  },
  {
    title: 'ANAK & STAF',
    items: [
      { label: 'Data Anak',      href: '/anak',           icon: <Baby className="h-4.5 w-4.5" />,           color: COLORS.pink,   roles: ['owner','admin','caregiver'] },
      { label: 'Pendaftaran',    href: '/pendaftaran',    icon: <ClipboardList className="h-4.5 w-4.5" />,   color: COLORS.violet, roles: ['owner','admin'] },
      { label: 'Data Staf',      href: '/staf',           icon: <Users className="h-4.5 w-4.5" />,          color: COLORS.indigo, roles: ['owner','admin'] },
      { label: 'Ruangan',        href: '/ruangan',        icon: <Building2 className="h-4.5 w-4.5" />,      color: COLORS.teal,   roles: ['owner','admin'] },
    ],
  },
  {
    title: 'OPERASIONAL',
    items: [
      { label: 'Kehadiran',      href: '/kehadiran',      icon: <CalendarCheck className="h-4.5 w-4.5" />,  color: COLORS.green,  roles: ['owner','admin','caregiver'] },
      { label: 'Laporan Harian', href: '/laporan-harian', icon: <FileText className="h-4.5 w-4.5" />,       color: COLORS.orange, roles: ['owner','admin','caregiver'] },
      { label: 'Jadwal & Acara', href: '/jadwal',         icon: <CalendarDays className="h-4.5 w-4.5" />,   color: COLORS.blue   },
      { label: 'Tugas',          href: '/tugas',          icon: <CheckSquare className="h-4.5 w-4.5" />,    color: COLORS.teal   },
    ],
  },
  {
    title: 'KESEHATAN & DOKUMEN',
    items: [
      { label: 'Kesehatan',      href: '/kesehatan',      icon: <HeartPulse className="h-4.5 w-4.5" />,     color: COLORS.rose,  roles: ['owner','admin','caregiver'] },
      { label: 'Dokumen',        href: '/dokumen',        icon: <FolderOpen className="h-4.5 w-4.5" />,     color: COLORS.amber, roles: ['owner','admin'] },
    ],
  },
  {
    title: 'KEUANGAN',
    items: [
      { label: 'Keuangan',       href: '/keuangan',       icon: <Wallet className="h-4.5 w-4.5" />,         color: COLORS.lime,   roles: ['owner','admin','finance'] },
      { label: 'Inventaris',     href: '/inventaris',     icon: <Package className="h-4.5 w-4.5" />,        color: COLORS.cyan,   roles: ['owner','admin'] },
    ],
  },
  {
    title: 'KOMUNIKASI',
    items: [
      { label: 'Komunikasi',     href: '/komunikasi',     icon: <MessageCircle className="h-4.5 w-4.5" />,  color: COLORS.purple },
      { label: 'Laporan',        href: '/laporan',        icon: <BarChart3 className="h-4.5 w-4.5" />,      color: COLORS.coral,  roles: ['owner','admin','finance','auditor'] },
    ],
  },
];

// Parent nav sections
const parentNavSections: NavSection[] = [
  {
    items: [
      { label: 'Beranda',        href: '/dashboard',           icon: <LayoutDashboard className="h-4.5 w-4.5" />, color: COLORS.sky    },
      { label: 'Anak Saya',      href: '/anak',                icon: <Baby className="h-4.5 w-4.5" />,           color: COLORS.pink   },
      { label: 'Laporan Harian', href: '/laporan-harian-saya', icon: <FileText className="h-4.5 w-4.5" />,       color: COLORS.orange },
      { label: 'Kehadiran',      href: '/kehadiran-saya',      icon: <CalendarCheck className="h-4.5 w-4.5" />,  color: COLORS.green  },
      { label: 'Tagihan',        href: '/tagihan-saya',        icon: <Wallet className="h-4.5 w-4.5" />,         color: COLORS.amber  },
      { label: 'Pengumuman',     href: '/komunikasi',          icon: <Bell className="h-4.5 w-4.5" />,           color: COLORS.violet },
      { label: 'Jadwal',         href: '/jadwal',              icon: <CalendarDays className="h-4.5 w-4.5" />,   color: COLORS.blue   },
    ],
  },
];

const bottomItems: NavItem[] = [
  { label: 'Pengaturan', href: '/pengaturan', icon: <Settings className="h-4.5 w-4.5" />, color: COLORS.sky   },
  { label: 'Panduan',    href: '/panduan',    icon: <BookOpen className="h-4.5 w-4.5" />, color: COLORS.green },
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
          'flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-150 group',
          active
            ? 'bg-white/10 text-white'
            : 'text-stone-400 hover:bg-white/6 hover:text-stone-100',
          collapsed && 'justify-center px-2'
        )}
      >
        <span className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br transition-all duration-150',
          active
            ? `${item.color.activeIconGradient} shadow-lg shadow-black/30 scale-105`
            : `${item.color.iconGradient} opacity-75 group-hover:opacity-100 group-hover:scale-105`
        )}>
          <span className="text-white [&>svg]:h-4 [&>svg]:w-4">
            {item.icon}
          </span>
        </span>
        {!collapsed && (
          <>
            <span className="truncate flex-1">{item.label}</span>
            {item.badge && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-coral-500 text-xs text-white font-medium px-1">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="sidebar-dark flex h-full flex-col border-r border-black/20" style={{ background: 'linear-gradient(180deg, #1e1410 0%, #17100c 60%, #120e09 100%)' }}>
      {/* Logo / Org Name */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-4 border-b border-white/8',
        collapsed && 'justify-center px-2'
      )}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-coral-500 to-orange-600 text-white font-bold text-sm shadow-lg shadow-coral-900/40">
          {orgLogoUrl
            ? <img src={orgLogoUrl} alt={orgName} className="h-full w-full rounded-xl object-cover" />
            : orgName.substring(0, 2).toUpperCase()
          }
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{orgName}</p>
            <p className="text-xs text-stone-500">Manajemen Daycare</p>
          </div>
        )}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {resolvedSections.map((section, si) => (
          <div key={si}>
            {section.title && !collapsed && (
              <p className="px-2.5 pb-1.5 text-[9px] font-bold tracking-[0.12em] text-stone-600 uppercase">
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
      <div className="border-t border-white/8 pt-2 pb-3 px-2 space-y-0.5">
        {bottomItems.map((item) => <NavLink key={item.href} item={item} />)}

        {/* User */}
        <div className={cn(
          'flex items-center gap-2.5 rounded-xl px-2.5 py-2 mt-1 bg-white/5 border border-white/6',
          collapsed && 'justify-center px-2'
        )}>
          <UserAvatar src={userProfile?.photoUrl} name={userProfile?.displayName || 'User'} size="sm" />
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-stone-200 truncate">{userProfile?.displayName}</p>
                <p className="text-xs text-stone-600 capitalize">{role || 'Pengguna'}</p>
              </div>
              <button onClick={logout} className="text-stone-600 hover:text-red-400 transition-colors" title="Keluar">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex absolute -right-3 top-16 h-6 w-6 items-center justify-center rounded-full bg-stone-800 border border-stone-700 text-stone-500 hover:text-coral-400 hover:border-coral-600 shadow-md transition-colors"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-stone-200 shadow-sm text-stone-600"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        'lg:hidden fixed left-0 top-0 z-40 h-full w-64 shadow-xl transform transition-transform duration-200',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col relative h-screen transition-all duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}>
        <SidebarContent />
      </aside>
    </>
  );
}
