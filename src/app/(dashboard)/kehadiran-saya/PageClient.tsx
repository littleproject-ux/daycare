'use client';

import React, { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, getDocs, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, addMonths, subMonths,
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

interface Child { id: string; fullName: string; nickName?: string; }
interface AttendanceRecord {
  id: string; childId: string; date: string;
  status: 'hadir' | 'absen' | 'izin' | 'sakit'; notes?: string;
}

const STATUS_CONFIG = {
  hadir: { label: 'Hadir', color: 'bg-emerald-500', badge: 'success' as const },
  absen: { label: 'Absen', color: 'bg-red-400', badge: 'danger' as const },
  izin:  { label: 'Izin',  color: 'bg-blue-400',  badge: 'info' as const },
  sakit: { label: 'Sakit', color: 'bg-amber-400',  badge: 'warning' as const },
};

export default function KehadiranSayaPage() {
  const { user, organizationId } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!organizationId || !user) return;
    loadChildren();
  }, [organizationId, user]);

  useEffect(() => {
    if (selectedChild) loadAttendance();
  }, [selectedChild, currentMonth]);

  async function loadChildren() {
    if (!organizationId || !user) return;
    try {
      const snap = await getDocs(query(
        collection(db, 'organizations', organizationId, 'children'),
        where('parentUserId', '==', user.uid),
        where('status', '==', 'aktif'),
        orderBy('fullName'),
      ));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Child);
      setChildren(list);
      if (list.length > 0) setSelectedChild(list[0].id);
    } catch { toast({ title: 'Gagal memuat data', variant: 'error' }); }
    finally { setIsLoading(false); }
  }

  async function loadAttendance() {
    if (!organizationId) return;
    if (!selectedChild || !organizationId) return;
    setIsLoading(true);
    try {
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const snap = await getDocs(query(
        collection(db, 'organizations', organizationId, 'attendance'),
        where('childId', '==', selectedChild),
        where('date', '>=', start),
        where('date', '<=', end),
        orderBy('date'),
      ));
      setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() }) as AttendanceRecord));
    } catch { toast({ title: 'Gagal memuat kehadiran', variant: 'error' }); }
    finally { setIsLoading(false); }
  }

  const attendanceMap = Object.fromEntries(attendance.map(a => [a.date, a]));
  const monthDays = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const hadir = attendance.filter(a => a.status === 'hadir').length;
  const total = attendance.length;
  const pct = total > 0 ? Math.round((hadir / total) * 100) : 0;

  const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const startPad = (startOfMonth(currentMonth).getDay() + 6) % 7;

  return (
    <div>
      <Topbar title="Kehadiran" subtitle="Rekap kehadiran anak Anda" />
      <div className="p-6 space-y-5">
        {/* Child selector */}
        {children.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {children.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedChild(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${selectedChild === c.id ? 'bg-coral-500 text-white' : 'bg-stone-100 text-stone-600'}`}
              >
                {c.nickName || c.fullName}
              </button>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {(['hadir', 'absen', 'izin', 'sakit'] as const).map(s => (
            <div key={s} className={`rounded-xl p-3 text-center ${s === 'hadir' ? 'bg-emerald-50' : s === 'absen' ? 'bg-red-50' : s === 'izin' ? 'bg-blue-50' : 'bg-amber-50'}`}>
              <p className={`text-xl font-bold ${s === 'hadir' ? 'text-emerald-600' : s === 'absen' ? 'text-red-600' : s === 'izin' ? 'text-blue-600' : 'text-amber-600'}`}>
                {attendance.filter(a => a.status === s).length}
              </p>
              <p className="text-xs text-stone-500 mt-0.5 capitalize">{STATUS_CONFIG[s].label}</p>
            </div>
          ))}
        </div>

        {/* Month navigator + calendar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-stone-100">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-center">
                <p className="text-sm font-semibold">{format(currentMonth, 'MMMM yyyy', { locale: localeId })}</p>
                {total > 0 && <p className="text-xs text-stone-400">{pct}% kehadiran</p>}
              </div>
              <button
                onClick={() => setCurrentMonth(m => addMonths(m, 1))}
                disabled={isSameMonth(currentMonth, new Date())}
                className="p-1.5 rounded-lg hover:bg-stone-100 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(d => <div key={d} className="text-center text-xs text-stone-400 py-1">{d}</div>)}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {[...Array(startPad)].map((_, i) => <div key={`pad-${i}`} />)}
              {monthDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const rec = attendanceMap[dateStr];
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div
                    key={dateStr}
                    className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium relative
                      ${isToday(day) ? 'ring-2 ring-coral-400' : ''}
                      ${isWeekend ? 'opacity-40' : ''}
                      ${rec?.status === 'hadir' ? 'bg-emerald-100 text-emerald-700' :
                        rec?.status === 'absen' ? 'bg-red-100 text-red-600' :
                        rec?.status === 'izin' ? 'bg-blue-100 text-blue-600' :
                        rec?.status === 'sakit' ? 'bg-amber-100 text-amber-600' :
                        'text-stone-500'}
                    `}
                    title={rec ? STATUS_CONFIG[rec.status].label : undefined}
                  >
                    {format(day, 'd')}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-3 mt-4 justify-center flex-wrap text-xs text-stone-500">
              {(['hadir', 'absen', 'izin', 'sakit'] as const).map(s => (
                <span key={s} className="flex items-center gap-1">
                  <span className={`w-3 h-3 rounded ${STATUS_CONFIG[s].color} inline-block`} />
                  {STATUS_CONFIG[s].label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-stone-100 animate-pulse" />)}</div>
        ) : attendance.length === 0 ? (
          <div className="text-center py-10 text-stone-400">
            <CalendarCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Belum ada data kehadiran bulan ini</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...attendance].reverse().map(a => (
              <div key={a.id} className="flex items-center gap-3 bg-white rounded-xl border border-stone-100 px-3 py-2.5">
                <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_CONFIG[a.status].color}`} />
                <p className="text-sm text-stone-700 flex-1">
                  {format(new Date(a.date), 'EEEE, d MMM', { locale: localeId })}
                </p>
                <Badge variant={STATUS_CONFIG[a.status].badge}>{STATUS_CONFIG[a.status].label}</Badge>
                {a.notes && <p className="text-xs text-stone-400 truncate max-w-24">{a.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
