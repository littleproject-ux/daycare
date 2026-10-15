'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { ParentDashboard } from '@/components/dashboard/parent-dashboard';
import {
  Baby, CalendarCheck, Wallet, Users, TrendingUp, AlertTriangle, Clock, ChevronRight, Building2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Topbar } from '@/components/layout/topbar';
import { formatTanggal, formatRupiah, formatWaktu, inisial, toDateSafe } from '@/lib/utils';
import { effectiveInvoiceStatus } from '@/lib/parent-data';
import Link from 'next/link';
import { OnboardingWizard } from '@/components/dashboard/onboarding-wizard';
import { addDays, endOfDay, format, startOfDay, subDays } from 'date-fns';
import type { Attendance, Child, Invoice, Room, Staff } from '@/types';

interface RoomData extends Room {
  emoji?: string;
  gradient?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: 'coral' | 'blue' | 'green' | 'amber';
  href?: string;
}

function StatCard({ title, value, subtitle, icon, trend, color = 'coral', href }: StatCardProps) {
  const gradientMap = {
    coral: 'from-coral-500 to-orange-600',
    blue: 'from-sky-500 to-blue-600',
    green: 'from-emerald-500 to-teal-600',
    amber: 'from-amber-500 to-orange-500',
  };

  const content = (
    <div className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br ${gradientMap[color]} shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer h-full`}>
      <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
      <div className="absolute -bottom-6 -right-2 h-16 w-16 rounded-full bg-white/10" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-white/80 font-medium">{title}</p>
            <p className="text-lg sm:text-2xl font-bold text-white mt-1 truncate">{value}</p>
            {subtitle && <p className="text-xs text-white/60 mt-0.5">{subtitle}</p>}
            {trend && (
              <div className="flex items-center gap-1 mt-2 text-xs font-medium text-white/80">
                <TrendingUp className={`h-3.5 w-3.5 ${trend.value < 0 ? 'rotate-180' : ''}`} />
                {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
              </div>
            )}
          </div>
          <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

interface DashData {
  children: Child[];
  attendance: Attendance[];
  invoices: Invoice[] | null;   // null = no permission / failed
  staff: Staff[] | null;
  rooms: RoomData[];
  alerts: { text: string; color: string; icon: string; href: string }[];
  events: { time: string; title: string }[];
}

const ATT_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'secondary' | 'info' }> = {
  hadir: { label: 'Hadir', variant: 'success' },
  izin: { label: 'Izin', variant: 'info' },
  sakit: { label: 'Sakit', variant: 'warning' },
  tidak_hadir: { label: 'Tidak Hadir', variant: 'danger' },
  libur: { label: 'Libur', variant: 'secondary' },
};

/**
 * Role switch lives in its own component so each dashboard calls its hooks unconditionally
 * (the old early `return <ParentDashboard />` before useEffect crashed with
 * "Rendered fewer hooks than expected").
 */
export default function DashboardPage() {
  const { role } = useAuth();
  if (role === 'parent') return <ParentDashboard />;
  return <StaffDashboard />;
}

function StaffDashboard() {
  const { userProfile, organizationId } = useAuth();
  const [data, setData] = useState<DashData | null>(null);
  const [today] = useState(() => new Date());

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    (async () => {
      const org = (c: string) => collection(db, 'organizations', organizationId, c);
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      // allSettled: a role without read access to one collection (e.g. caregiver → invoices)
      // must not blank the whole dashboard.
      const [childR, attR, invR, staffR, roomR, docR, incR, invtR, evR] = await Promise.allSettled([
        getDocs(query(org('children'), orderBy('fullName'))),
        getDocs(query(org('attendance'), where('date', '==', todayStr))),
        getDocs(query(org('invoices'), orderBy('createdAt', 'desc'), limit(300))),
        getDocs(query(org('staff'), orderBy('fullName'))),
        getDocs(query(org('rooms'), orderBy('name'))),
        getDocs(query(org('documents'), orderBy('createdAt', 'desc'), limit(200))),
        getDocs(query(org('healthIncidents'), orderBy('occurredAt', 'desc'), limit(20))),
        getDocs(query(org('inventory'), orderBy('name'))),
        getDocs(query(org('events'), where('startDate', '<=', endOfDay(new Date())), orderBy('startDate', 'desc'), limit(30))),
      ]);
      const ok = <T,>(r: PromiseSettledResult<{ docs: { id: string; data: () => unknown }[] }>): T[] | null =>
        r.status === 'fulfilled' ? r.value.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as T) : null;

      const children = ok<Child>(childR) ?? [];
      const attendance = ok<Attendance>(attR) ?? [];
      const invoices = ok<Invoice>(invR);
      const staff = ok<Staff>(staffR);
      const occupancy = new Map<string, number>();
      children.filter((c) => c.status === 'active' && c.roomId).forEach((c) => occupancy.set(c.roomId, (occupancy.get(c.roomId) ?? 0) + 1));
      const rooms = (ok<RoomData>(roomR) ?? [])
        .filter((r) => r.isActive !== false)
        .map((r) => ({ ...r, currentOccupancy: occupancy.get(r.id) ?? 0 }));

      // ── "Perlu Perhatian" built from real data ─────────────────────────────
      const alerts: DashData['alerts'] = [];
      if (invoices) {
        const overdue = invoices.filter((i) => effectiveInvoiceStatus(i.status, toDateSafe(i.dueDate), i.outstandingAmount ?? 0) === 'overdue');
        if (overdue.length) alerts.push({ text: `${overdue.length} tagihan lewat jatuh tempo`, color: 'text-red-600', icon: '🔴', href: '/keuangan' });
      }
      const docs = ok<{ expiryDate?: string | null }>(docR) ?? [];
      const soon = addDays(new Date(), 30);
      const expiring = docs.filter((d) => { const e = toDateSafe(d.expiryDate); return e && e <= soon; });
      if (expiring.length) alerts.push({ text: `${expiring.length} dokumen kadaluarsa / segera kadaluarsa`, color: 'text-amber-600', icon: '🟡', href: '/dokumen' });
      const incidents = (ok<{ occurredAt: unknown; parentNotified?: boolean; severity?: string }>(incR) ?? [])
        .filter((i) => { const d = toDateSafe(i.occurredAt); return d && d >= subDays(new Date(), 7); });
      const unnotified = incidents.filter((i) => !i.parentNotified);
      if (unnotified.length) alerts.push({ text: `${unnotified.length} insiden belum diberitahukan ke orang tua`, color: 'text-orange-600', icon: '🟠', href: '/kesehatan' });
      else if (incidents.length) alerts.push({ text: `${incidents.length} insiden kesehatan minggu ini`, color: 'text-orange-600', icon: '🟠', href: '/kesehatan' });
      const lowStock = (ok<{ stock: number; minStock: number }>(invtR) ?? []).filter((i) => i.stock <= i.minStock);
      if (lowStock.length) alerts.push({ text: `${lowStock.length} barang stok menipis`, color: 'text-amber-600', icon: '📦', href: '/inventaris' });
      const waitlist = children.filter((c) => c.status === 'waitlist').length;
      if (waitlist) alerts.push({ text: `${waitlist} pendaftaran menunggu persetujuan`, color: 'text-sky-600', icon: '📝', href: '/pendaftaran' });

      // ── Today's events (started on/before today and not yet ended) ──────────
      const dayStart = startOfDay(new Date());
      const events = (ok<{ title: string; startDate: unknown; endDate?: unknown }>(evR) ?? [])
        .filter((e) => { const end = toDateSafe(e.endDate) ?? toDateSafe(e.startDate); return end && end >= dayStart; })
        .map((e) => ({ start: toDateSafe(e.startDate)!, title: e.title }))
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .map((e) => ({ time: e.start < dayStart ? 'Hari ini' : formatWaktu(e.start), title: e.title }));

      if (!cancelled) setData({ children, attendance, invoices, staff, rooms, alerts, events });
    })();
    return () => { cancelled = true; };
  }, [organizationId]);

  // No org yet → onboarding (organizationId comes from the active membership)
  if (!organizationId) {
    return <OnboardingWizard onComplete={() => window.location.reload()} />;
  }

  const active = data?.children.filter((c) => c.status === 'active') ?? [];
  const waitlist = data?.children.filter((c) => c.status === 'waitlist').length ?? 0;
  const attByChild = new Map((data?.attendance ?? []).map((a) => [a.childId, a]));
  const presentToday = active.filter((c) => attByChild.get(c.id)?.status === 'hadir').length;
  const unpaid = (data?.invoices ?? []).filter((i) => !['paid', 'cancelled', 'draft'].includes(i.status) && (i.outstandingAmount ?? 0) > 0);
  const unpaidTotal = unpaid.reduce((s, i) => s + (i.outstandingAmount ?? 0), 0);
  const staffActive = data?.staff?.filter((s) => s.status === 'aktif').length ?? 0;
  const staffLeave = data?.staff?.filter((s) => s.status === 'cuti').length ?? 0;
  const roomName = new Map((data?.rooms ?? []).map((r) => [r.id, r.name]));
  const loading = !data;
  const dash = (v: string | number) => (loading ? '…' : v);

  return (
    <div>
      <Topbar title="Dashboard" subtitle="Ringkasan operasional hari ini" />

      <div className="p-4 sm:p-6 space-y-6">
        <div className="relative overflow-hidden rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #c2410c 0%, #9a1c10 50%, #7c2d12 100%)' }}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 bg-white -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-24 w-32 h-32 rounded-full opacity-10 bg-peach-300 translate-y-10" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-lg font-bold">Halo, {userProfile?.displayName?.split(' ')[0] || 'Pengguna'}! 👋</p>
              <p className="text-white/70 text-sm mt-0.5" suppressHydrationWarning>{formatTanggal(today, 'EEEE, d MMMM yyyy')}</p>
              <p className="text-white/60 text-xs mt-2">Semangat mengelola daycare hari ini 🌟</p>
            </div>
            <div className="text-5xl">🍼</div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard title="Anak Aktif" value={dash(active.length)}
            subtitle={waitlist ? `${waitlist} menunggu persetujuan` : 'tidak ada antrian'}
            icon={<Baby className="h-5 w-5" />} color="coral" href="/anak" />
          <StatCard title="Hadir Hari Ini" value={dash(presentToday)}
            subtitle={`dari ${active.length} anak aktif`}
            icon={<CalendarCheck className="h-5 w-5" />} color="green" href="/kehadiran" />
          {data?.invoices !== null && (
            <StatCard title="Tagihan Belum Lunas" value={dash(formatRupiah(unpaidTotal))}
              subtitle={`dari ${unpaid.length} tagihan`}
              icon={<Wallet className="h-5 w-5" />} color="amber" href="/keuangan" />
          )}
          {data?.staff !== null && (
            <StatCard title="Staf Aktif" value={dash(staffActive)}
              subtitle={staffLeave ? `${staffLeave} sedang cuti` : 'tidak ada yang cuti'}
              icon={<Users className="h-5 w-5" />} color="blue" href="/staf" />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">Kehadiran Hari Ini</CardTitle>
              <Link href="/kehadiran" className="text-xs text-coral-500 hover:text-coral-600 flex items-center gap-1">
                Lihat semua <ChevronRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-9 rounded-lg bg-stone-100 animate-pulse" />)}</div>
              ) : active.length === 0 ? (
                <p className="text-sm text-stone-400 text-center py-6">Belum ada anak aktif</p>
              ) : (
                <div className="space-y-2">
                  {active.slice(0, 6).map((child) => {
                    const att = attByChild.get(child.id);
                    const badge = att ? ATT_BADGE[att.status] ?? ATT_BADGE.hadir : null;
                    return (
                      <div key={child.id} className="flex items-center gap-3 py-1.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-coral-50 text-coral-500 text-xs font-bold shrink-0">
                          {inisial(child.fullName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-900 truncate">{child.fullName}</p>
                          <p className="text-xs text-stone-400">{roomName.get(child.roomId) ?? 'Belum ada ruangan'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-stone-400">{att?.checkInTime ? formatWaktu(att.checkInTime) : '-'}</span>
                          <Badge variant={badge?.variant ?? 'secondary'}>{badge?.label ?? 'Belum Dicatat'}</Badge>
                        </div>
                      </div>
                    );
                  })}
                  {active.length > 6 && (
                    <Link href="/kehadiran" className="block text-center text-xs text-stone-400 hover:text-coral-500 pt-1">
                      +{active.length - 6} anak lainnya
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Perlu Perhatian
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {loading ? (
                  <div className="h-16 rounded-lg bg-stone-100 animate-pulse" />
                ) : data.alerts.length === 0 ? (
                  <p className="text-sm text-emerald-600">✅ Semua aman, tidak ada yang perlu ditindaklanjuti</p>
                ) : data.alerts.map((alert, i) => (
                  <Link key={i} href={alert.href} className="flex items-start gap-2 text-sm hover:underline">
                    <span>{alert.icon}</span>
                    <span className={alert.color}>{alert.text}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-sky-500" /> Jadwal Hari Ini
                </CardTitle>
                <Link href="/jadwal" className="text-xs text-coral-500 hover:text-coral-600">Kalender</Link>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {loading ? (
                  <div className="h-12 rounded-lg bg-stone-100 animate-pulse" />
                ) : data.events.length === 0 ? (
                  <p className="text-sm text-stone-400">Tidak ada acara hari ini</p>
                ) : data.events.map((event, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-xs font-mono text-stone-400 w-14 shrink-0">{event.time}</span>
                    <span className="text-stone-700">{event.title}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-stone-400" /> Kapasitas Ruangan
            </CardTitle>
            <Link href="/ruangan" className="text-xs text-coral-500 hover:text-coral-600 font-medium flex items-center gap-0.5">
              Kelola <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {!loading && data.rooms.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2 text-center">
                <Building2 className="h-8 w-8 text-stone-200" />
                <p className="text-sm text-stone-400">Belum ada ruangan</p>
                <Link href="/ruangan" className="text-xs text-coral-500 hover:underline">Tambah ruangan →</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(data?.rooms ?? []).map((room) => {
                  const pct = room.capacity > 0 ? Math.round((room.currentOccupancy / room.capacity) * 100) : 0;
                  const gradient = room.gradient ?? 'from-sky-400 to-blue-500';
                  return (
                    <div key={room.id} className="relative overflow-hidden rounded-xl p-4 bg-white border border-stone-100 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-lg shadow-sm`}>
                            {room.emoji ?? '🏠'}
                          </div>
                          <p className="text-sm font-semibold text-stone-900">{room.name}</p>
                        </div>
                        <span className={`text-sm font-bold px-2.5 py-1 rounded-xl ${
                          pct >= 90 ? 'bg-red-50 text-red-600' : pct >= 70 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {room.currentOccupancy}/{room.capacity}
                        </span>
                      </div>
                      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full bg-gradient-to-r transition-all ${gradient}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <p className="text-xs text-stone-400 mt-1.5">{pct}% kapasitas terisi</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
