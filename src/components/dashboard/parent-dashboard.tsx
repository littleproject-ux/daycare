'use client';

import React, { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, getDocs, limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Baby, CalendarCheck, FileText, Receipt, Bell, ChevronRight,
  Clock, Thermometer, Utensils, Moon, Smile, Heart,
  AlertCircle, CheckCircle2, MapPin,
} from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNow, isToday, isPast } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { formatRupiah } from '@/lib/utils';

interface Child {
  id: string;
  fullName: string;
  nickName?: string;
  birthDate: string;
  gender: 'male' | 'female';
  photoUrl?: string;
  roomName?: string;
  allergies?: string;
  medicalNotes?: string;
}

interface DailyReport {
  id: string;
  childId: string;
  date: string;
  temperature?: number;
  mood?: string;
  mealNote?: string;
  sleepNote?: string;
  activities?: string;
  notes?: string;
  createdAt: Timestamp;
}

interface Invoice {
  id: string;
  childId: string;
  childName: string;
  amount: number;
  outstandingAmount: number;
  status: string;
  dueDate: string;
  description?: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  audience: string;
  isPinned: boolean;
  createdAt: Timestamp;
}

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊', sad: '😢', energetic: '⚡', tired: '😴',
  sick: '🤒', cranky: '😤', calm: '😌', excited: '🤩',
};

function ChildCard({ child, report }: { child: Child; report?: DailyReport }) {
  const age = child.birthDate
    ? Math.floor((Date.now() - new Date(child.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

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
              <p className="font-semibold text-stone-800 truncate">{child.nickName || child.fullName}</p>
              <div className="flex items-center gap-2 text-xs text-stone-400">
                {age !== null && <span>{age} tahun</span>}
                {child.roomName && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{child.roomName}</span>
                  </>
                )}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-stone-300 shrink-0" />
          </div>

          {/* Laporan hari ini */}
          {report && isToday(new Date(report.date)) ? (
            <div className="bg-stone-50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-medium text-stone-500 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Laporan Hari Ini
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {report.temperature && (
                  <div className="flex items-center gap-1.5 text-stone-600">
                    <Thermometer className="h-3.5 w-3.5 text-red-400" />
                    <span>{report.temperature}°C</span>
                  </div>
                )}
                {report.mood && (
                  <div className="flex items-center gap-1.5 text-stone-600">
                    <span>{MOOD_EMOJI[report.mood] || '😊'}</span>
                    <span className="capitalize">{report.mood}</span>
                  </div>
                )}
                {report.mealNote && (
                  <div className="flex items-center gap-1.5 text-stone-600">
                    <Utensils className="h-3.5 w-3.5 text-amber-400" />
                    <span className="truncate">{report.mealNote}</span>
                  </div>
                )}
                {report.sleepNote && (
                  <div className="flex items-center gap-1.5 text-stone-600">
                    <Moon className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="truncate">{report.sleepNote}</span>
                  </div>
                )}
              </div>
              {report.notes && (
                <p className="text-xs text-stone-500 italic line-clamp-2">"{report.notes}"</p>
              )}
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
  }, [organizationId, user]);

  async function loadData() {
    if (!organizationId || !user) return;
    setIsLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // Load children belonging to this parent
      const childSnap = await getDocs(query(
        collection(db, 'children'),
        where('organizationId', '==', organizationId),
        where('parentUserId', '==', user.uid),
        where('status', '==', 'aktif'),
        orderBy('fullName'),
      ));
      const childList = childSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Child);
      setChildren(childList);

      if (childList.length === 0) {
        setIsLoading(false);
        return;
      }

      const childIds = childList.map(c => c.id);

      // Load today's daily reports for each child (parallel)
      const [reportSnaps, invoiceSnap, announcementSnap] = await Promise.all([
        Promise.all(childIds.map(cid =>
          getDocs(query(
            collection(db, 'dailyReports'),
            where('childId', '==', cid),
            where('date', '==', today),
            limit(1),
          ))
        )),
        getDocs(query(
          collection(db, 'invoices'),
          where('organizationId', '==', organizationId),
          where('parentUserId', '==', user.uid),
          where('status', 'in', ['sent', 'partial', 'overdue']),
          orderBy('dueDate'),
        )),
        getDocs(query(
          collection(db, 'announcements'),
          where('organizationId', '==', organizationId),
          where('audience', 'in', ['all', 'parents']),
          orderBy('createdAt', 'desc'),
          limit(5),
        )),
      ]);

      // Map reports by childId
      const reportMap: Record<string, DailyReport> = {};
      reportSnaps.forEach((snap, i) => {
        if (!snap.empty) {
          const d = snap.docs[0];
          reportMap[childIds[i]] = { id: d.id, ...d.data() } as DailyReport;
        }
      });
      setReports(reportMap);
      setInvoices(invoiceSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Invoice));
      setAnnouncements(announcementSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Announcement));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const unpaidTotal = invoices.reduce((s, inv) => s + (inv.outstandingAmount ?? inv.amount), 0);
  const overdueInvoices = invoices.filter(inv => inv.status === 'overdue');

  return (
    <div>
      <Topbar
        title="Selamat Datang 👋"
        subtitle="Pantau perkembangan anak Anda hari ini"
      />

      <div className="p-6 space-y-6">
        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-3 bg-coral-50 text-center">
            <p className="text-xl font-bold text-coral-600">{children.length}</p>
            <p className="text-xs text-stone-500 mt-0.5">Anak Terdaftar</p>
          </div>
          <div className="rounded-xl p-3 bg-blue-50 text-center">
            <p className="text-xl font-bold text-blue-600">
              {Object.keys(reports).length}/{children.length}
            </p>
            <p className="text-xs text-stone-500 mt-0.5">Laporan Hari Ini</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${overdueInvoices.length > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
            <p className={`text-xl font-bold ${overdueInvoices.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {invoices.length}
            </p>
            <p className="text-xs text-stone-500 mt-0.5">Tagihan Belum Lunas</p>
          </div>
        </div>

        {/* Overdue warning */}
        {overdueInvoices.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700">
                {overdueInvoices.length} tagihan sudah jatuh tempo
              </p>
              <p className="text-xs text-red-500 mt-0.5">
                Total: {formatRupiah(overdueInvoices.reduce((s, i) => s + (i.outstandingAmount ?? i.amount), 0))}
              </p>
            </div>
            <Link href="/tagihan-saya">
              <button className="text-xs text-red-600 font-medium hover:underline">Lihat</button>
            </Link>
          </div>
        )}

        {/* Children */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-stone-700">Anak Saya</h2>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-36 rounded-xl bg-stone-100 animate-pulse" />
              ))}
            </div>
          ) : children.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <Baby className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Data anak belum tersedia</p>
              <p className="text-xs mt-1">Hubungi admin daycare untuk menghubungkan akun Anda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {children.map(child => (
                <ChildCard key={child.id} child={child} report={reports[child.id]} />
              ))}
            </div>
          )}
        </section>

        {/* Invoices */}
        {invoices.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-stone-700">Tagihan</h2>
              <Link href="/tagihan-saya" className="text-xs text-coral-500 hover:underline">Lihat semua</Link>
            </div>
            <div className="space-y-2">
              {invoices.slice(0, 3).map(inv => {
                const isOverdue = inv.status === 'overdue' ||
                  (inv.dueDate && isPast(new Date(inv.dueDate)) && !isToday(new Date(inv.dueDate)));
                return (
                  <Card key={inv.id}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isOverdue ? 'bg-red-100' : 'bg-amber-50'}`}>
                        <Receipt className={`h-4 w-4 ${isOverdue ? 'text-red-500' : 'text-amber-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">
                          {inv.description || inv.childName}
                        </p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          Jatuh tempo: {inv.dueDate ? format(new Date(inv.dueDate), 'd MMM yyyy', { locale: localeId }) : '-'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${isOverdue ? 'text-red-600' : 'text-stone-800'}`}>
                          {formatRupiah(inv.outstandingAmount ?? inv.amount)}
                        </p>
                        <Badge variant={isOverdue ? 'danger' : 'warning'} className="text-xs">
                          {isOverdue ? 'Terlambat' : 'Belum Lunas'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Announcements */}
        {announcements.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-stone-700 flex items-center gap-1.5">
                <Bell className="h-4 w-4 text-stone-400" /> Pengumuman
              </h2>
              <Link href="/komunikasi" className="text-xs text-coral-500 hover:underline">Lihat semua</Link>
            </div>
            <div className="space-y-2">
              {announcements.map(ann => (
                <Card key={ann.id} className={ann.isPinned ? 'border-amber-200 bg-amber-50/30' : ''}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      {ann.isPinned && <span className="text-amber-500 text-xs mt-0.5">📌</span>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-800">{ann.title}</p>
                        <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{ann.content}</p>
                        <p className="text-xs text-stone-300 mt-1">
                          {ann.createdAt?.toDate
                            ? formatDistanceToNow(ann.createdAt.toDate(), { addSuffix: true, locale: localeId })
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Quick links */}
        <section>
          <h2 className="text-sm font-semibold text-stone-700 mb-3">Menu Cepat</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/laporan-harian-saya', icon: <FileText className="h-5 w-5" />, label: 'Laporan Harian', color: 'bg-blue-50 text-blue-600' },
              { href: '/kehadiran-saya', icon: <CalendarCheck className="h-5 w-5" />, label: 'Kehadiran', color: 'bg-emerald-50 text-emerald-600' },
              { href: '/tagihan-saya', icon: <Receipt className="h-5 w-5" />, label: 'Tagihan Saya', color: 'bg-amber-50 text-amber-600' },
              { href: '/komunikasi', icon: <Bell className="h-5 w-5" />, label: 'Pengumuman', color: 'bg-purple-50 text-purple-600' },
            ].map(item => (
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
