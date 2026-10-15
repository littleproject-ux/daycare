'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Baby, CalendarCheck, FileText, Receipt, Bell, ChevronRight,
  Clock, Utensils, Moon, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { formatRupiah, hitungUmur, toDateSafe } from '@/lib/utils';
import { loadMyChildren, summarizeReport, invoiceView } from '@/lib/parent-data';
import type { Child, DailyReport, Invoice } from '@/types';

interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: 'all' | 'parents' | 'staff';
  isPinned: boolean;
  createdAt: unknown;
}

function ChildCard({ child, report }: { child: Child; report?: DailyReport }) {
  const s = report ? summarizeReport(report) : null;
  const dob = toDateSafe(child.dateOfBirth);

  return (
    <Link href={`/anak/${child.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-coral-100 to-peach-100 shrink-0 flex items-center justify-center">
              {child.photoUrl ? (
                <img src={child.photoUrl} alt={child.fullName} className="w-full h-full object-cover" />
              ) : (
                <Baby className="h-6 w-6 text-coral-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-800 truncate">{child.preferredName || child.fullName}</p>
              {dob && <p className="text-xs text-stone-400">{hitungUmur(dob)}</p>}
            </div>
            <ChevronRight className="h-4 w-4 text-stone-300 shrink-0" />
          </div>

          {s ? (
            <div className="bg-stone-50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-medium text-stone-500 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Laporan Hari Ini
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {s.mood && (
                  <div className="flex items-center gap-1.5 text-stone-600">
                    <span>{s.mood.emoji}</span><span>{s.mood.label}</span>
                  </div>
                )}
                {s.nap && (
                  <div className="flex items-center gap-1.5 text-stone-600">
                    <Moon className="h-3.5 w-3.5 text-indigo-400 shrink-0" /><span className="truncate">{s.nap}</span>
                  </div>
                )}
                {s.meals && (
                  <div className="flex items-center gap-1.5 text-stone-600 sm:col-span-2">
                    <Utensils className="h-3.5 w-3.5 text-amber-400 shrink-0" /><span className="truncate">{s.meals}</span>
                  </div>
                )}
              </div>
              {s.notes && <p className="text-xs text-stone-500 italic line-clamp-2">&ldquo;{s.notes}&rdquo;</p>}
            </div>
          ) : (
            <div className="bg-stone-50 rounded-xl p-3 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-stone-300" />
              <p className="text-xs text-stone-400">Laporan hari ini belum tersedia</p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export function ParentDashboard() {
  const { user, organizationId } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [reports, setReports] = useState<Record<string, DailyReport>>({});
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!organizationId || !user) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, user]);

  async function loadData() {
    if (!organizationId || !user) return;
    setIsLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const org = (c: string) => collection(db, 'organizations', organizationId, c);

      // Announcements are readable by every member, load them even if no child is linked yet
      const annP = getDocs(query(org('announcements'), orderBy('createdAt', 'desc'), limit(20)));

      const childList = await loadMyChildren(organizationId, user.uid);
      setChildren(childList);

      // Parent queries must filter on parentUserId so they pass the security rules.
      const [reportSnap, invoiceSnap, annSnap] = await Promise.all([
        childList.length
          ? getDocs(query(org('dailyReports'), where('parentUserId', '==', user.uid), where('date', '==', today)))
          : Promise.resolve(null),
        childList.length
          ? getDocs(query(org('invoices'), where('parentUserId', '==', user.uid), orderBy('dueDate', 'desc')))
          : Promise.resolve(null),
        annP,
      ]);

      const reportMap: Record<string, DailyReport> = {};
      reportSnap?.docs.forEach((d) => { const r = { id: d.id, ...d.data() } as DailyReport; reportMap[r.childId] = r; });
      setReports(reportMap);

      setInvoices((invoiceSnap?.docs ?? [])
        .map((d) => ({ id: d.id, ...d.data() }) as Invoice)
        .filter((inv) => ['sent', 'partial', 'overdue'].includes(invoiceView(inv).status)));

      setAnnouncements(annSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Announcement)
        .filter((a) => a.audience !== 'staff')
        .sort((a, b) => Number(b.isPinned) - Number(a.isPinned))
        .slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const views = invoices.map((inv) => ({ inv, v: invoiceView(inv) }));
  const overdue = views.filter(({ v }) => v.status === 'overdue');

  return (
    <div>
      <Topbar title="Selamat Datang 👋" subtitle="Pantau perkembangan anak Anda hari ini" />

      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-3 bg-coral-50 text-center">
            <p className="text-xl font-bold text-coral-600">{children.length}</p>
            <p className="text-xs text-stone-500 mt-0.5">Anak Terdaftar</p>
          </div>
          <div className="rounded-xl p-3 bg-blue-50 text-center">
            <p className="text-xl font-bold text-blue-600">{Object.keys(reports).length}/{children.length}</p>
            <p className="text-xs text-stone-500 mt-0.5">Laporan Hari Ini</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${overdue.length > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
            <p className={`text-xl font-bold ${overdue.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{invoices.length}</p>
            <p className="text-xs text-stone-500 mt-0.5">Tagihan Belum Lunas</p>
          </div>
        </div>

        {overdue.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700">{overdue.length} tagihan sudah jatuh tempo</p>
              <p className="text-xs text-red-500 mt-0.5">
                Total: {formatRupiah(overdue.reduce((s, { v }) => s + v.outstanding, 0))}
              </p>
            </div>
            <Link href="/tagihan-saya" className="text-xs text-red-600 font-medium hover:underline">Lihat</Link>
          </div>
        )}

        <section>
          <h2 className="text-sm font-semibold text-stone-700 mb-3">Anak Saya</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => <div key={i} className="h-36 rounded-xl bg-stone-100 animate-pulse" />)}
            </div>
          ) : children.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <Baby className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Data anak belum tersedia</p>
              <p className="text-xs mt-1">Hubungi admin daycare untuk menghubungkan akun Anda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {children.map((child) => <ChildCard key={child.id} child={child} report={reports[child.id]} />)}
            </div>
          )}
        </section>

        {views.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-stone-700">Tagihan</h2>
              <Link href="/tagihan-saya" className="text-xs text-coral-500 hover:underline">Lihat semua</Link>
            </div>
            <div className="space-y-2">
              {views.slice(0, 3).map(({ inv, v }) => {
                const late = v.status === 'overdue';
                return (
                  <Card key={inv.id}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${late ? 'bg-red-100' : 'bg-amber-50'}`}>
                        <Receipt className={`h-4 w-4 ${late ? 'text-red-500' : 'text-amber-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{v.title}</p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          Jatuh tempo: {v.due ? format(v.due, 'd MMM yyyy', { locale: localeId }) : '-'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${late ? 'text-red-600' : 'text-stone-800'}`}>{formatRupiah(v.outstanding)}</p>
                        <Badge variant={late ? 'danger' : 'warning'} className="text-xs">{late ? 'Terlambat' : 'Belum Lunas'}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {announcements.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-stone-700 flex items-center gap-1.5">
                <Bell className="h-4 w-4 text-stone-400" /> Pengumuman
              </h2>
              <Link href="/komunikasi" className="text-xs text-coral-500 hover:underline">Lihat semua</Link>
            </div>
            <div className="space-y-2">
              {announcements.map((ann) => {
                const created = toDateSafe(ann.createdAt);
                return (
                  <Card key={ann.id} className={ann.isPinned ? 'border-amber-200 bg-amber-50/30' : ''}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        {ann.isPinned && <span className="text-amber-500 text-xs mt-0.5">📌</span>}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-800">{ann.title}</p>
                          <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{ann.body}</p>
                          <p className="text-xs text-stone-300 mt-1">
                            {created ? formatDistanceToNow(created, { addSuffix: true, locale: localeId }) : '-'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold text-stone-700 mb-3">Menu Cepat</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/laporan-harian-saya', icon: <FileText className="h-5 w-5" />, label: 'Laporan Harian', color: 'bg-blue-50 text-blue-600' },
              { href: '/kehadiran-saya', icon: <CalendarCheck className="h-5 w-5" />, label: 'Kehadiran', color: 'bg-emerald-50 text-emerald-600' },
              { href: '/tagihan-saya', icon: <Receipt className="h-5 w-5" />, label: 'Tagihan Saya', color: 'bg-amber-50 text-amber-600' },
              { href: '/komunikasi', icon: <Bell className="h-5 w-5" />, label: 'Pengumuman', color: 'bg-purple-50 text-purple-600' },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <div className={`rounded-xl p-4 flex items-center gap-3 ${item.color.split(' ')[0]} hover:opacity-80 transition-opacity`}>
                  <div className={item.color}>{item.icon}</div>
                  <span className="text-sm font-medium text-stone-700">{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
