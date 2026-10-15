'use client';

import React, { useState, useEffect } from 'react';
import {
  collection, query, where, getDocs, orderBy, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3, Users, TrendingUp, FileText, Download, Calendar,
  CheckCircle2, XCircle, DollarSign,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { formatRupiah } from '@/lib/utils';

interface MonthStats {
  totalChildren: number;
  activeChildren: number;
  newEnrollments: number;
  avgAttendance: number;
  totalRevenue: number;
  paidInvoices: number;
  pendingInvoices: number;
  totalIncidents: number;
}

export default function LaporanPage() {
  const { organizationId, can } = useAuth();
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState<{ date: string; hadir: number; absent: number }[]>([]);

  useEffect(() => {
    if (!organizationId) return;
    loadStats();
  }, [organizationId, selectedMonth]);

  async function loadStats() {
    setIsLoading(true);
    try {
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);
      const tsStart = Timestamp.fromDate(monthStart);
      const tsEnd = Timestamp.fromDate(monthEnd);

      const [childSnap, attendSnap, invoiceSnap, incidentSnap] = await Promise.all([
        getDocs(query(collection(db, 'children'), where('organizationId', '==', organizationId))),
        getDocs(query(
          collection(db, 'attendance'),
          where('organizationId', '==', organizationId),
          where('date', '>=', format(monthStart, 'yyyy-MM-dd')),
          where('date', '<=', format(monthEnd, 'yyyy-MM-dd'))
        )),
        getDocs(query(
          collection(db, 'invoices'),
          where('organizationId', '==', organizationId),
          where('createdAt', '>=', tsStart),
          where('createdAt', '<=', tsEnd)
        )),
        getDocs(query(
          collection(db, 'healthIncidents'),
          where('organizationId', '==', organizationId),
          where('occurredAt', '>=', tsStart),
          where('occurredAt', '<=', tsEnd)
        )),
      ]);

      const children = childSnap.docs.map(d => d.data());
      const attendances = attendSnap.docs.map(d => d.data());
      const invoices = invoiceSnap.docs.map(d => d.data());

      const activeChildren = children.filter(c => c.status === 'active').length;
      const newEnrollments = children.filter(c => {
        if (!c.createdAt) return false;
        const created = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
        return created >= monthStart && created <= monthEnd;
      }).length;

      // Attendance by day
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
      const byDate = new Map<string, { hadir: number; absent: number }>();
      for (const att of attendances) {
        const date = att.date as string;
        if (!byDate.has(date)) byDate.set(date, { hadir: 0, absent: 0 });
        const day = byDate.get(date)!;
        if (att.status === 'hadir' || att.status === 'terlambat') day.hadir++;
        else day.absent++;
      }
      const attData = days.slice(0, 15).map(d => {
        const key = format(d, 'yyyy-MM-dd');
        const v = byDate.get(key) ?? { hadir: 0, absent: 0 };
        return { date: format(d, 'd MMM', { locale: localeId }), ...v };
      });
      setAttendanceData(attData);

      const totalHadir = attendances.filter(a => a.status === 'hadir' || a.status === 'terlambat').length;
      const totalAttendance = attendances.length;
      const avgAttendance = totalAttendance > 0 ? Math.round((totalHadir / totalAttendance) * 100) : 0;

      const paidInvoices = invoices.filter(i => i.status === 'paid');
      const pendingInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled');
      const totalRevenue = paidInvoices.reduce((s, i) => s + (i.amount - (i.outstandingAmount ?? 0)), 0);

      setStats({
        totalChildren: children.length,
        activeChildren,
        newEnrollments,
        avgAttendance,
        totalRevenue,
        paidInvoices: paidInvoices.length,
        pendingInvoices: pendingInvoices.length,
        totalIncidents: incidentSnap.size,
      });
    } catch (e) {
      toast({ title: 'Gagal memuat laporan', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  const maxBar = Math.max(...attendanceData.map(d => d.hadir + d.absent), 1);

  return (
    <div>
      <Topbar title="Laporan & Analitik" subtitle="Ringkasan performa dan statistik daycare" />

      <div className="p-6 space-y-5">
        {/* Month selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedMonth(m => subMonths(m, 1))}
              className="h-8 w-8 rounded-xl border border-stone-200 flex items-center justify-center hover:bg-stone-50"
            >‹</button>
            <h2 className="text-base font-semibold text-stone-800">
              {format(selectedMonth, 'MMMM yyyy', { locale: localeId })}
            </h2>
            <button
              onClick={() => setSelectedMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="h-8 w-8 rounded-xl border border-stone-200 flex items-center justify-center hover:bg-stone-50"
            >›</button>
          </div>
          {can('export') && (
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Ekspor Laporan
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-stone-100 animate-pulse" />)}
          </div>
        ) : stats ? (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Anak Aktif', value: stats.activeChildren, sub: `dari ${stats.totalChildren} total`, icon: <Users className="h-5 w-5" />, color: 'text-coral-600', bg: 'bg-coral-50' },
                { label: 'Pendaftar Baru', value: stats.newEnrollments, sub: 'bulan ini', icon: <TrendingUp className="h-5 w-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Kehadiran Rata-rata', value: `${stats.avgAttendance}%`, sub: 'anak hadir', icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Insiden Kesehatan', value: stats.totalIncidents, sub: 'bulan ini', icon: <XCircle className="h-5 w-5" />, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Total Pendapatan', value: formatRupiah(stats.totalRevenue), sub: 'sudah dibayar', icon: <DollarSign className="h-5 w-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Invoice Lunas', value: stats.paidInvoices, sub: 'tagihan', icon: <FileText className="h-5 w-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Invoice Pending', value: stats.pendingInvoices, sub: 'belum dibayar', icon: <FileText className="h-5 w-5" />, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Total Anak', value: stats.totalChildren, sub: 'terdaftar', icon: <Users className="h-5 w-5" />, color: 'text-stone-600', bg: 'bg-stone-50' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl p-4 ${s.bg} flex items-start gap-3`}>
                  <div className={`${s.color} opacity-70 shrink-0 mt-0.5`}>{s.icon}</div>
                  <div>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs font-medium text-stone-700 mt-0.5">{s.label}</p>
                    <p className="text-xs text-stone-400">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Attendance chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-coral-500" />
                  Kehadiran Harian (15 hari pertama)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attendanceData.length === 0 ? (
                  <p className="text-center text-sm text-stone-400 py-8">Belum ada data kehadiran</p>
                ) : (
                  <div className="flex items-end gap-1.5 h-32 overflow-x-auto">
                    {attendanceData.map(d => (
                      <div key={d.date} className="flex flex-col items-center gap-1 shrink-0">
                        <div className="flex items-end gap-0.5" style={{ height: '96px' }}>
                          <div
                            className="w-3 bg-coral-400 rounded-t"
                            style={{ height: `${Math.round((d.hadir / maxBar) * 96)}px` }}
                            title={`Hadir: ${d.hadir}`}
                          />
                          <div
                            className="w-3 bg-stone-200 rounded-t"
                            style={{ height: `${Math.round((d.absent / maxBar) * 96)}px` }}
                            title={`Tidak hadir: ${d.absent}`}
                          />
                        </div>
                        <span className="text-[9px] text-stone-400 whitespace-nowrap">{d.date}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-4 mt-3 text-xs text-stone-500">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-coral-400 inline-block" /> Hadir</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-stone-200 inline-block" /> Tidak Hadir</span>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
