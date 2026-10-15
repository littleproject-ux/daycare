'use client';

import React, { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, getDocs,
  addDoc, updateDoc, doc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  CalendarCheck, ChevronLeft, ChevronRight, CheckCircle2,
  XCircle, Clock, UserCheck, AlertCircle,
} from 'lucide-react';
import type { Child, Attendance, AttendanceStatus } from '@/types';
import { formatTanggal, dateToYMD, inisial } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { format, addDays, subDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  hadir: { label: 'Hadir', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="h-4 w-4" /> },
  tidak_hadir: { label: 'Tidak Hadir', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-4 w-4" /> },
  izin: { label: 'Izin', color: 'bg-amber-100 text-amber-700', icon: <Clock className="h-4 w-4" /> },
  sakit: { label: 'Sakit', color: 'bg-orange-100 text-orange-700', icon: <AlertCircle className="h-4 w-4" /> },
  libur: { label: 'Libur', color: 'bg-stone-100 text-stone-600', icon: <CalendarCheck className="h-4 w-4" /> },
};

export default function KehadiranPage() {
  const { organizationId, user, can } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [children, setChildren] = useState<Child[]>([]);
  const [attendance, setAttendance] = useState<Map<string, Attendance>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [checkInData, setCheckInData] = useState({ pickupName: '', pickupRelation: '', notes: '' });

  const dateStr = dateToYMD(selectedDate);

  useEffect(() => {
    if (!organizationId) return;
    loadData();
  }, [organizationId, selectedDate]);

  async function loadData() {
    setIsLoading(true);
    try {
      // Load active children
      const childQ = query(
        collection(db, 'children'),
        where('organizationId', '==', organizationId),
        where('status', '==', 'active'),
        orderBy('fullName')
      );
      const childSnap = await getDocs(childQ);
      const childList = childSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Child);
      setChildren(childList);

      // Load attendance for selected date
      const attQ = query(
        collection(db, 'attendance'),
        where('organizationId', '==', organizationId),
        where('date', '==', dateStr)
      );
      const attSnap = await getDocs(attQ);
      const attMap = new Map<string, Attendance>();
      attSnap.docs.forEach((d) => {
        const att = { id: d.id, ...d.data() } as Attendance;
        attMap.set(att.childId, att);
      });
      setAttendance(attMap);
    } catch (e) {
      console.error(e);
      toast({ title: 'Gagal memuat data kehadiran', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  async function markAttendance(childId: string, status: AttendanceStatus) {
    if (!organizationId || !user) return;
    const existing = attendance.get(childId);

    try {
      if (existing) {
        // Update existing
        await updateDoc(doc(db, 'attendance', existing.id), {
          status,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create new
        await addDoc(collection(db, 'attendance'), {
          organizationId,
          childId,
          branchId: '',
          roomId: '',
          date: dateStr,
          status,
          checkInTime: status === 'hadir' ? Timestamp.now() : null,
          checkOutTime: null,
          checkInBy: user.uid,
          isLateArrival: false,
          isEarlyPickup: false,
          notes: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      toast({ title: `Status diperbarui: ${STATUS_CONFIG[status].label}`, variant: 'success' });
      loadData();
    } catch (e) {
      toast({ title: 'Gagal memperbarui kehadiran', variant: 'error' });
    }
  }

  async function handleCheckIn(child: Child) {
    if (!organizationId || !user) return;
    const existing = attendance.get(child.id);
    if (existing?.checkInTime) {
      toast({ title: 'Anak sudah check-in', variant: 'warning' });
      return;
    }

    try {
      if (existing) {
        await updateDoc(doc(db, 'attendance', existing.id), {
          status: 'hadir',
          checkInTime: Timestamp.now(),
          checkInBy: user.uid,
          pickupPersonName: checkInData.pickupName || null,
          pickupPersonRelation: checkInData.pickupRelation || null,
          notes: checkInData.notes || null,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'attendance'), {
          organizationId,
          childId: child.id,
          branchId: child.branchId || '',
          roomId: child.roomId || '',
          date: dateStr,
          status: 'hadir',
          checkInTime: Timestamp.now(),
          checkOutTime: null,
          checkInBy: user.uid,
          pickupPersonName: checkInData.pickupName || null,
          pickupPersonRelation: checkInData.pickupRelation || null,
          isLateArrival: false,
          isEarlyPickup: false,
          notes: checkInData.notes || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      toast({ title: `${child.fullName} berhasil check-in`, variant: 'success' });
      setShowCheckInDialog(false);
      setCheckInData({ pickupName: '', pickupRelation: '', notes: '' });
      loadData();
    } catch (e) {
      toast({ title: 'Gagal check-in', variant: 'error' });
    }
  }

  async function handleCheckOut(child: Child) {
    const att = attendance.get(child.id);
    if (!att) return;
    try {
      await updateDoc(doc(db, 'attendance', att.id), {
        checkOutTime: Timestamp.now(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: `${child.fullName} berhasil check-out`, variant: 'success' });
      loadData();
    } catch (e) {
      toast({ title: 'Gagal check-out', variant: 'error' });
    }
  }

  const summary = {
    hadir: children.filter((c) => attendance.get(c.id)?.status === 'hadir').length,
    izin: children.filter((c) => attendance.get(c.id)?.status === 'izin').length,
    sakit: children.filter((c) => attendance.get(c.id)?.status === 'sakit').length,
    belumTercatat: children.filter((c) => !attendance.has(c.id)).length,
  };

  return (
    <div>
      <Topbar title="Kehadiran" subtitle="Catat check-in dan check-out harian" />

      <div className="p-6 space-y-5">
        {/* Date navigation */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon-sm" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-stone-900">
              {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: localeId })}
            </p>
            {dateStr === dateToYMD(new Date()) && (
              <span className="text-xs text-coral-500 font-medium">Hari ini</span>
            )}
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            disabled={selectedDate >= new Date()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
            disabled={dateStr === dateToYMD(new Date())}
          >
            Hari Ini
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Hadir', value: summary.hadir, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Izin', value: summary.izin, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Sakit', value: summary.sakit, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Belum Catat', value: summary.belumTercatat, color: 'text-stone-500', bg: 'bg-stone-50' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-3 ${s.bg}`}>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-stone-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Children list */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-stone-100 animate-pulse" />
            ))}
          </div>
        ) : children.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Belum ada anak aktif</p>
          </div>
        ) : (
          <Card>
            <div className="divide-y divide-stone-50">
              {children.map((child) => {
                const att = attendance.get(child.id);
                const status = att?.status;

                return (
                  <div key={child.id} className="flex items-center gap-3 p-4 hover:bg-stone-50/60 transition-colors">
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-50 text-coral-500 font-bold text-sm">
                      {inisial(child.fullName)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{child.fullName}</p>
                      <div className="flex items-center gap-3 text-xs text-stone-400">
                        {att?.checkInTime && (
                          <span>Masuk: {format(att.checkInTime.toDate(), 'HH:mm')}</span>
                        )}
                        {att?.checkOutTime && (
                          <span>Keluar: {format(att.checkOutTime.toDate(), 'HH:mm')}</span>
                        )}
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-2">
                      {status && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[status].color}`}>
                          {STATUS_CONFIG[status].icon}
                          {STATUS_CONFIG[status].label}
                        </span>
                      )}

                      {can('create') && (
                        <div className="flex items-center gap-1">
                          {!status && (
                            <>
                              <Button
                                size="sm"
                                variant="success"
                                onClick={() => {
                                  setSelectedChild(child);
                                  setShowCheckInDialog(true);
                                }}
                                className="text-xs gap-1"
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                                Check-in
                              </Button>
                              <Select onValueChange={(v) => markAttendance(child.id, v as AttendanceStatus)}>
                                <SelectTrigger className="h-8 w-24 text-xs">
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="izin">Izin</SelectItem>
                                  <SelectItem value="sakit">Sakit</SelectItem>
                                  <SelectItem value="tidak_hadir">Tidak Hadir</SelectItem>
                                </SelectContent>
                              </Select>
                            </>
                          )}
                          {status === 'hadir' && !att?.checkOutTime && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCheckOut(child)}
                              className="text-xs"
                            >
                              Check-out
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Check-in Dialog */}
      <Dialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check-in: {selectedChild?.fullName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              label="Nama Penjemput (opsional)"
              placeholder="Nama yang mengantar"
              value={checkInData.pickupName}
              onChange={(e) => setCheckInData((d) => ({ ...d, pickupName: e.target.value }))}
            />
            <Input
              label="Hubungan dengan Anak (opsional)"
              placeholder="contoh: Ibu, Ayah, Kakek"
              value={checkInData.pickupRelation}
              onChange={(e) => setCheckInData((d) => ({ ...d, pickupRelation: e.target.value }))}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-stone-700">Catatan (opsional)</label>
              <textarea
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm placeholder:text-stone-400 focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-400/20 resize-none"
                rows={2}
                placeholder="Informasi tambahan..."
                value={checkInData.notes}
                onChange={(e) => setCheckInData((d) => ({ ...d, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckInDialog(false)}>Batal</Button>
            <Button onClick={() => selectedChild && handleCheckIn(selectedChild)} className="gap-2">
              <UserCheck className="h-4 w-4" />
              Konfirmasi Check-in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
