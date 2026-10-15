'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, ChevronLeft, ChevronRight, Baby } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, addMonths, subMonths, parseISO,
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { formatWaktu } from '@/lib/utils';
import { loadMyChildren, ATTENDANCE_INFO } from '@/lib/parent-data';
import type { Attendance, AttendanceStatus, Child } from '@/types';

const SUMMARY: AttendanceStatus[] = ['hadir', 'tidak_hadir', 'izin', 'sakit'];

export default function KehadiranSayaPage() {
  const { user, organizationId } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!organizationId || !user) return;
    loadChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, user]);

  useEffect(() => {
    if (selectedChild) loadAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChild, currentMonth]);

  async function loadChildren() {
    if (!organizationId || !user) return;
    try {
      const list = await loadMyChildren(organizationId, user.uid);
      setChildren(list);
      if (list.length > 0) setSelectedChild(list[0].id);
      else setIsLoading(false);
    } catch {
      toast({ title: 'Gagal memuat data anak', variant: 'error' });
      setIsLoading(false);
    }
  }

  async function loadAttendance() {
    if (!selectedChild || !organizationId || !user) return;
    setIsLoading(true);
    try {
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const snap = await getDocs(query(
        collection(db, 'organizations', organizationId, 'attendance'),
        where('parentUserId', '==', user.uid),
        where('childId', '==', selectedChild),
      ));
      // month filter + sort client-side (no composite index needed)
      setAttendance(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Attendance)
        .filter((a) => a.date >= start && a.date <= end)
        .sort((a, b) => a.date.localeCompare(b.date)));
    } catch {
      toast({ title: 'Gagal memuat kehadiran', variant: 'error' });
    } finally { setIsLoading(false); }
  }

  const attendanceMap = Object.fromEntries(attendance.map((a) => [a.date, a]));
  const monthDays = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const counted = attendance.filter((a) => a.status !== 'libur');
  const hadir = counted.filter((a) => a.status === 'hadir').length;
  const pct = counted.length > 0 ? Math.round((hadir / counted.length) * 100) : 0;
  const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const startPad = (startOfMonth(currentMonth).getDay() + 6) % 7;

  if (!isLoading && children.length === 0) {
    return (
      <div>
        <Topbar title="Kehadiran" subtitle="Rekap kehadiran anak Anda" />
        <div className="text-center py-16 text-stone-400">
          <Baby className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Data anak belum tersedia</p>
          <p className="text-xs mt-1">Hubungi admin daycare untuk menghubungkan akun Anda</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Kehadiran" subtitle="Rekap kehadiran anak Anda" />
      <div className="p-4 sm:p-6 space-y-5">
        {children.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedChild(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${selectedChild === c.id ? 'bg-coral-500 text-white' : 'bg-stone-100 text-stone-600'}`}
              >
                {c.preferredName || c.fullName}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SUMMARY.map((s) => (
            <div key={s} className={`rounded-xl p-3 text-center ${ATTENDANCE_INFO[s].bg}`}>
              <p className={`text-xl font-bold ${ATTENDANCE_INFO[s].text}`}>{attendance.filter((a) => a.status === s).length}</p>
              <p className="text-xs text-stone-500 mt-0.5">{ATTENDANCE_INFO[s].label}</p>
            </div>
          ))}
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth((m) => subMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-stone-100" aria-label="Bulan sebelumnya">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-center">
                <p className="text-sm font-semibold">{format(currentMonth, 'MMMM yyyy', { locale: localeId })}</p>
                {counted.length > 0 && <p className="text-xs text-stone-400">{pct}% kehadiran</p>}
              </div>
              <button
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                disabled={isSameMonth(currentMonth, new Date())}
                className="p-1.5 rounded-lg hover:bg-stone-100 disabled:opacity-30"
                aria-label="Bulan berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {DAYS.map((d) => <div key={d} className="text-center text-xs text-stone-400 py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {[...Array(startPad)].map((_, i) => <div key={`pad-${i}`} />)}
              {monthDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const rec = attendanceMap[dateStr];
                const info = rec ? ATTENDANCE_INFO[rec.status] : null;
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div
                    key={dateStr}
                    className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium
                      ${isToday(day) ? 'ring-2 ring-coral-400' : ''}
                      ${isWeekend && !rec ? 'opacity-40' : ''}
                      ${info ? info.cell : 'text-stone-500'}`}
                    title={info?.label}
                  >
                    {format(day, 'd')}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-4 justify-center flex-wrap text-xs text-stone-500">
              {SUMMARY.map((s) => (
                <span key={s} className="flex items-center gap-1">
                  <span className={`w-3 h-3 rounded ${ATTENDANCE_INFO[s].dot} inline-block`} />
                  {ATTENDANCE_INFO[s].label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-stone-100 animate-pulse" />)}</div>
        ) : attendance.length === 0 ? (
          <div className="text-center py-10 text-stone-400">
            <CalendarCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Belum ada data kehadiran bulan ini</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...attendance].reverse().map((a) => {
              const info = ATTENDANCE_INFO[a.status] ?? ATTENDANCE_INFO.hadir;
              return (
                <div key={a.id} className="flex items-center gap-3 bg-white rounded-xl border border-stone-100 px-3 py-2.5">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${info.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-700">{format(parseISO(a.date), 'EEEE, d MMM', { locale: localeId })}</p>
                    {(a.checkInTime || a.checkOutTime) && (
                      <p className="text-xs text-stone-400">
                        Masuk {formatWaktu(a.checkInTime)}{a.checkOutTime ? ` · Pulang ${formatWaktu(a.checkOutTime)}` : ''}
                      </p>
                    )}
                  </div>
                  {a.notes && <p className="text-xs text-stone-400 truncate max-w-24">{a.notes}</p>}
                  <Badge variant={info.badge}>{info.label}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
