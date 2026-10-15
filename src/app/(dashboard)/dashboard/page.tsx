'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ParentDashboard } from '@/components/dashboard/parent-dashboard';
import {
  Baby,
  CalendarCheck,
  Wallet,
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
  Building2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Topbar } from '@/components/layout/topbar';
import { formatTanggal, formatRupiah } from '@/lib/utils';
import Link from 'next/link';
import { OnboardingWizard } from '@/components/dashboard/onboarding-wizard';

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
    <div className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${gradientMap[color]} shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer`}>
      {/* decorative circle */}
      <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
      <div className="absolute -bottom-6 -right-2 h-16 w-16 rounded-full bg-white/10" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/80 font-medium">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            {subtitle && <p className="text-xs text-white/60 mt-0.5">{subtitle}</p>}
            {trend && (
              <div className="flex items-center gap-1 mt-2 text-xs font-medium text-white/80">
                <TrendingUp className={`h-3.5 w-3.5 ${trend.value < 0 ? 'rotate-180' : ''}`} />
                {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
              </div>
            )}
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-white">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export default function DashboardPage() {
  const { userProfile, membership, organizationId, role, hasRole } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Parent role gets a dedicated portal view
  if (role === 'parent') return <ParentDashboard />;
  const today = new Date();

  // Check if org needs onboarding
  useEffect(() => {
    if (membership && !organizationId) {
      setShowOnboarding(true);
    }
  }, [membership, organizationId]);

  // If user has no org yet, show onboarding
  if (!organizationId || showOnboarding) {
    return <OnboardingWizard onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <div>
      <Topbar title="Dashboard" subtitle="Ringkasan operasional hari ini" />

      <div className="p-6 space-y-6">
        {/* Welcome banner */}
        <div className="relative overflow-hidden rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #c2410c 0%, #9a1c10 50%, #7c2d12 100%)' }}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 bg-white -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-24 w-32 h-32 rounded-full opacity-10 bg-peach-300 translate-y-10" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-lg font-bold">
                Halo, {userProfile?.displayName?.split(' ')[0] || 'Pengguna'}! 👋
              </p>
              <p className="text-white/70 text-sm mt-0.5">{formatTanggal(today, 'EEEE, d MMMM yyyy')}</p>
              <p className="text-white/60 text-xs mt-2">Semangat mengelola daycare hari ini 🌟</p>
            </div>
            <div className="text-5xl">🍼</div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Anak Aktif"
            value="24"
            subtitle="2 menunggu persetujuan"
            icon={<Baby className="h-5 w-5" />}
            color="coral"
            href="/anak"
          />
          <StatCard
            title="Hadir Hari Ini"
            value="20"
            subtitle="dari 24 anak aktif"
            icon={<CalendarCheck className="h-5 w-5" />}
            color="green"
            href="/kehadiran"
          />
          <StatCard
            title="Tagihan Belum Lunas"
            value={formatRupiah(4800000)}
            subtitle="dari 6 tagihan"
            icon={<Wallet className="h-5 w-5" />}
            color="amber"
            href="/keuangan"
          />
          <StatCard
            title="Total Staf"
            value="8"
            subtitle="1 sedang cuti"
            icon={<Users className="h-5 w-5" />}
            color="blue"
            href="/staf"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Today's attendance */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">Kehadiran Hari Ini</CardTitle>
              <Link href="/kehadiran" className="text-xs text-coral-500 hover:text-coral-600 flex items-center gap-1">
                Lihat semua <ChevronRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { name: 'Alya Putri', room: 'Ruang Kelinci', status: 'hadir', time: '07:45' },
                  { name: 'Bintang Pratama', room: 'Ruang Kelinci', status: 'hadir', time: '08:00' },
                  { name: 'Cinta Dewi', room: 'Ruang Matahari', status: 'izin', time: '-' },
                  { name: 'Dimas Santoso', room: 'Ruang Matahari', status: 'hadir', time: '08:15' },
                  { name: 'Erika Susanti', room: 'Ruang Bintang', status: 'belum_hadir', time: '-' },
                ].map((child, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-coral-50 text-coral-500 text-xs font-bold shrink-0">
                      {child.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{child.name}</p>
                      <p className="text-xs text-stone-400">{child.room}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-400">{child.time}</span>
                      <Badge
                        variant={
                          child.status === 'hadir' ? 'success' :
                          child.status === 'izin' ? 'warning' : 'secondary'
                        }
                      >
                        {child.status === 'hadir' ? 'Hadir' :
                         child.status === 'izin' ? 'Izin' : 'Belum Hadir'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alerts & reminders */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Perlu Perhatian
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  { text: '2 tagihan jatuh tempo hari ini', color: 'text-red-600', icon: '🔴' },
                  { text: '3 dokumen hampir kadaluarsa', color: 'text-amber-600', icon: '🟡' },
                  { text: '1 insiden belum ditindaklanjuti', color: 'text-orange-600', icon: '🟠' },
                  { text: 'Rasio staf:anak perlu dicek', color: 'text-amber-600', icon: '⚠️' },
                ].map((alert, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span>{alert.icon}</span>
                    <span className={alert.color}>{alert.text}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-sky-500" />
                  Jadwal Hari Ini
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  { time: '09:00', event: 'Aktivitas Seni & Kerajinan' },
                  { time: '11:00', event: 'Makan Siang Bersama' },
                  { time: '13:00', event: 'Waktu Tidur Siang' },
                  { time: '15:00', event: 'Bermain Outdoor' },
                ].map((event, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-xs font-mono text-stone-400 w-10 shrink-0">{event.time}</span>
                    <span className="text-stone-700">{event.event}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Room occupancy */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-stone-400" />
              Kapasitas Ruangan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'Ruang Kelinci', current: 8, max: 10, ageGroup: '0–12 bulan', emoji: '🐰', gradient: 'from-pink-400 to-rose-500' },
                { name: 'Ruang Matahari', current: 9, max: 12, ageGroup: '1–2 tahun', emoji: '☀️', gradient: 'from-amber-400 to-orange-500' },
                { name: 'Ruang Bintang', current: 7, max: 10, ageGroup: '2–3 tahun', emoji: '⭐', gradient: 'from-sky-400 to-blue-500' },
              ].map((room) => {
                const pct = Math.round((room.current / room.max) * 100);
                return (
                  <div key={room.name} className="relative overflow-hidden rounded-xl p-4 bg-white border border-stone-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${room.gradient} flex items-center justify-center text-lg shadow-sm`}>
                          {room.emoji}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-stone-900">{room.name}</p>
                          <p className="text-xs text-stone-400">{room.ageGroup}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold px-2.5 py-1 rounded-xl ${
                        pct >= 90 ? 'bg-red-50 text-red-600' :
                        pct >= 70 ? 'bg-amber-50 text-amber-600' :
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        {room.current}/{room.max}
                      </span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r transition-all ${room.gradient}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-stone-400 mt-1.5">{pct}% kapasitas terisi</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
