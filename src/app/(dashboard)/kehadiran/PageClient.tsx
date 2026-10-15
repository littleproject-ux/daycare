'use client';

import React, { useState, useEffect } from 'react';
import {
  collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  CalendarCheck, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, UserCheck, AlertCircle, LogOut, Pencil,
} from 'lucide-react';
import type { Child, Attendance, AttendanceStatus } from '@/types';
import { dateToYMD, inisial, toDateSafe } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  hadir: { label: 'Hadir', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="h-4 w-4" /> },
  tidak_hadir: { label: 'Tidak Hadir', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-4 w-4" /> },
  izin: { label: 'Izin', color: 'bg-amber-100 text-amber-700', icon: <Clock className="h-4 w-4" /> },
  sakit: { label: 'Sakit', color: 'bg-orange-100 text-orange-700', icon: <AlertCircle className="h-4 w-4" /> },
  libur: { label: 'Libur', color: 'bg-stone-100 text-stone-600', icon: <CalendarCheck className="h-4 w-4" /> },
};

const selCls = 'w-full h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm focus:border-coral-400 focus:outline-none';

type DialogMode = 'checkin' | 'checkout' | 'edit';
interface FormState {
  status: AttendanceStatus;
  checkIn: string;   // HH:mm
  checkOut: string;  // HH:mm
  dropOffName: string;
  dropOffRelation: string;
  pickupName: string;
  pickupRelation: string;
  notes: string;
}

export default function KehadiranPage() {
  const { organizationId, user, can, hasRole } = useAuth();
  const canDelete = hasRole('owner', 'admin'); // firestore.rules: attendance delete → admin
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [children, setChildren] = useState<Child[]>([]);
  const [attendance, setAttendance] = useState<Map<string, Attendance>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [dialog, setDialog] = useState<{ mode: DialogMode; child: Child } | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, confirmEl] = useConfirm();

  const dateStr = dateToYMD(selectedDate);
  const isTodaySel = dateStr === dateToYMD(new Date());

  useEffect(() => {
    if (!organizationId) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, dateStr]);

  async function loadData() {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const [childSnap, attSnap] = await Promise.all([
        getDocs(query(collection(db, 'organizations', organizationId, 'children'), where('status', '==', 'active'))),
        getDocs(query(collection(db, 'organizations', organizationId, 'attendance'), where('date', '==', dateStr))),
      ]);
      setChildren(childSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Child)
        .sort((a, b) => String(a.fullName ?? '').localeCompare(String(b.fullName ?? ''))));
      const attMap = new Map<string, Attendance>();
      attSnap.docs.forEach((d) => { const att = { id: d.id, ...d.data() } as Attendance; attMap.set(att.childId, att); });
      setAttendance(attMap);
    } catch (e) {
      console.error(e);
      toast({ title: 'Gagal memuat data kehadiran', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  /** Timestamp on the SELECTED date at hh:mm (not "now", so back-dated entries get the right day) */
  const at = (hhmm: string) => Timestamp.fromDate(parseISO(`${dateStr}T${hhmm || '00:00'}`));
  const nowHHmm = () => format(new Date(), 'HH:mm');

  function openDialog(mode: DialogMode, child: Child) {
    const att = attendance.get(child.id);
    const ci = toDateSafe(att?.checkInTime); const co = toDateSafe(att?.checkOutTime);
    setForm({
      status: att?.status ?? 'hadir',
      checkIn: ci ? format(ci, 'HH:mm') : (isTodaySel ? nowHHmm() : '07:30'),
      checkOut: co ? format(co, 'HH:mm') : (isTodaySel ? nowHHmm() : '16:00'),
      dropOffName: att?.dropOffPersonName ?? (mode === 'edit' ? '' : ''),
      dropOffRelation: att?.dropOffPersonRelation ?? '',
      pickupName: att?.pickupPersonName ?? '',
      pickupRelation: att?.pickupPersonRelation ?? '',
      notes: att?.notes ?? '',
    });
    setDialog({ mode, child });
  }

  async function quickStatus(child: Child, status: AttendanceStatus) {
    if (!organizationId || !user) return;
    const existing = attendance.get(child.id);
    try {
      if (existing) {
        await updateDoc(doc(db, 'organizations', organizationId, 'attendance', existing.id), { status, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'organizations', organizationId, 'attendance'), {
          organizationId,
          childId: child.id,
          parentUserId: child.parentUserId ?? null,
          branchId: child.branchId || '',
          roomId: child.roomId || '',
          date: dateStr,
          status,
          checkInTime: null,
          checkOutTime: null,
          checkInBy: user.uid,
          isLateArrival: false,
          isEarlyPickup: false,
          notes: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      toast({ title: `${child.fullName}: ${STATUS_CONFIG[status].label}`, variant: 'success' });
      loadData();
    } catch {
      toast({ title: 'Gagal memperbarui kehadiran', variant: 'error' });
    }
  }

  async function submitDialog() {
    if (!organizationId || !user || !dialog || !form) return;
    const { mode, child } = dialog;
    const existing = attendance.get(child.id);
    const present = mode === 'checkin' || mode === 'checkout' || form.status === 'hadir';
    if (present && form.checkOut && mode !== 'checkin' && form.checkIn && form.checkOut < form.checkIn) {
      toast({ title: 'Jam pulang tidak boleh sebelum jam masuk', variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      let data: Record<string, unknown>;
      if (mode === 'checkin') {
        data = {
          status: 'hadir', checkInTime: at(form.checkIn), checkInBy: user.uid,
          dropOffPersonName: form.dropOffName.trim() || null, dropOffPersonRelation: form.dropOffRelation.trim() || null,
          notes: form.notes.trim(),
        };
      } else if (mode === 'checkout') {
        data = {
          checkOutTime: at(form.checkOut), checkOutBy: user.uid,
          pickupPersonName: form.pickupName.trim() || null, pickupPersonRelation: form.pickupRelation.trim() || null,
          notes: form.notes.trim(),
        };
      } else {
        data = {
          status: form.status,
          checkInTime: form.status === 'hadir' && form.checkIn ? at(form.checkIn) : null,
          checkOutTime: form.status === 'hadir' && existing?.checkOutTime && form.checkOut ? at(form.checkOut) : null,
          dropOffPersonName: form.dropOffName.trim() || null, dropOffPersonRelation: form.dropOffRelation.trim() || null,
          pickupPersonName: form.pickupName.trim() || null, pickupPersonRelation: form.pickupRelation.trim() || null,
          notes: form.notes.trim(),
        };
      }
      if (existing) {
        await updateDoc(doc(db, 'organizations', organizationId, 'attendance', existing.id), { ...data, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'organizations', organizationId, 'attendance'), {
          organizationId,
          childId: child.id,
          parentUserId: child.parentUserId ?? null,
          branchId: child.branchId || '',
          roomId: child.roomId || '',
          date: dateStr,
          checkOutTime: null,
          checkInBy: user.uid,
          isLateArrival: false,
          isEarlyPickup: false,
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      toast({
        title: mode === 'checkin' ? `${child.fullName} berhasil check-in` : mode === 'checkout' ? `${child.fullName} berhasil check-out` : 'Kehadiran diperbarui',
        variant: 'success',
      });
      setDialog(null);
      loadData();
    } catch {
      toast({ title: 'Gagal menyimpan kehadiran', variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord() {
    if (!organizationId || !dialog) return;
    const existing = attendance.get(dialog.child.id);
    if (!existing) return;
    const ok = await confirm({ title: 'Hapus catatan kehadiran?', description: `Catatan ${dialog.child.fullName} tanggal ini akan dihapus (kembali ke "belum dicatat").` });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'organizations', organizationId, 'attendance', existing.id));
      toast({ title: 'Catatan kehadiran dihapus', variant: 'success' });
      setDialog(null);
      loadData();
    } catch {
      toast({ title: 'Gagal menghapus catatan', variant: 'error' });
    }
  }

  const summary = {
    hadir: children.filter((c) => attendance.get(c.id)?.status === 'hadir').length,
    izin: children.filter((c) => attendance.get(c.id)?.status === 'izin').length,
    sakit: children.filter((c) => attendance.get(c.id)?.status === 'sakit').length,
    belumTercatat: children.filter((c) => !attendance.has(c.id)).length,
  };

  const set = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <div>
      <Topbar title="Kehadiran" subtitle="Catat check-in dan check-out harian" />

      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="outline" size="icon-sm" aria-label="Hari sebelumnya" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-stone-900" suppressHydrationWarning>
              {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: localeId })}
            </p>
            {isTodaySel && <span className="text-xs text-coral-500 font-medium">Hari ini</span>}
          </div>
          <Button variant="outline" size="icon-sm" aria-label="Hari berikutnya"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            // compare calendar days, not milliseconds: no recording for future dates
            disabled={dateStr >= dateToYMD(new Date())} suppressHydrationWarning>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())} disabled={isTodaySel}>Hari Ini</Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-stone-100 animate-pulse" />)}</div>
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
                const ci = toDateSafe(att?.checkInTime); const co = toDateSafe(att?.checkOutTime);
                return (
                  <div key={child.id} data-testid="attendance-row" className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 hover:bg-stone-50/60 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-50 text-coral-500 font-bold text-sm">
                        {inisial(child.fullName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-900 truncate">{child.fullName}</p>
                        <div className="flex flex-wrap items-center gap-x-3 text-xs text-stone-400">
                          {ci && <span>Masuk: {format(ci, 'HH:mm')}</span>}
                          {co && <span>Pulang: {format(co, 'HH:mm')}</span>}
                          {att?.pickupPersonName && <span>Dijemput: {att.pickupPersonName}</span>}
                          {att?.notes && <span className="truncate">“{att.notes}”</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {status && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[status].color}`}>
                          {STATUS_CONFIG[status].icon}{STATUS_CONFIG[status].label}
                        </span>
                      )}
                      {can('create') && !status && (
                        <>
                          <Button size="sm" variant="success" onClick={() => openDialog('checkin', child)} className="text-xs gap-1">
                            <UserCheck className="h-3.5 w-3.5" /> Check-in
                          </Button>
                          <select aria-label={`Status ${child.fullName}`} defaultValue=""
                            onChange={(e) => { if (e.target.value) quickStatus(child, e.target.value as AttendanceStatus); e.target.value = ''; }}
                            className="h-8 rounded-lg border border-stone-200 bg-white px-2 text-xs">
                            <option value="">Status lain…</option>
                            <option value="izin">Izin</option>
                            <option value="sakit">Sakit</option>
                            <option value="tidak_hadir">Tidak Hadir</option>
                            <option value="libur">Libur</option>
                          </select>
                        </>
                      )}
                      {can('edit') && status === 'hadir' && !co && (
                        <Button size="sm" variant="outline" onClick={() => openDialog('checkout', child)} className="text-xs gap-1">
                          <LogOut className="h-3.5 w-3.5" /> Check-out
                        </Button>
                      )}
                      {can('edit') && status && (
                        <button title="Edit kehadiran" aria-label={`Edit kehadiran ${child.fullName}`} onClick={() => openDialog('edit', child)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-stone-200 text-stone-500 hover:text-coral-600 hover:border-coral-300 hover:bg-coral-50">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      <Dialog open={!!dialog} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === 'checkin' ? 'Check-in' : dialog?.mode === 'checkout' ? 'Check-out' : 'Edit Kehadiran'}: {dialog?.child.fullName}
            </DialogTitle>
          </DialogHeader>
          {form && dialog && (
            <div className="space-y-4">
              {dialog.mode === 'edit' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-stone-700">Status</label>
                  <select aria-label="Status kehadiran" value={form.status} onChange={(e) => set({ status: e.target.value as AttendanceStatus })} className={selCls}>
                    {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                </div>
              )}

              {(dialog.mode === 'checkin' || (dialog.mode === 'edit' && form.status === 'hadir')) && (
                <>
                  <Input label="Jam Masuk" type="time" value={form.checkIn} onChange={(e) => set({ checkIn: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Diantar oleh" placeholder="Nama pengantar" value={form.dropOffName} onChange={(e) => set({ dropOffName: e.target.value })} />
                    <Input label="Hubungan" placeholder="Ibu, Ayah, ..." value={form.dropOffRelation} onChange={(e) => set({ dropOffRelation: e.target.value })} />
                  </div>
                </>
              )}

              {(dialog.mode === 'checkout' || (dialog.mode === 'edit' && form.status === 'hadir' && attendance.get(dialog.child.id)?.checkOutTime)) && (
                <>
                  <Input label="Jam Pulang" type="time" value={form.checkOut} onChange={(e) => set({ checkOut: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Dijemput oleh" placeholder="Nama penjemput" value={form.pickupName} onChange={(e) => set({ pickupName: e.target.value })} />
                    <Input label="Hubungan" placeholder="Ibu, Ayah, ..." value={form.pickupRelation} onChange={(e) => set({ pickupRelation: e.target.value })} />
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-stone-700">Catatan (opsional)</label>
                <textarea aria-label="Catatan kehadiran" rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })}
                  placeholder="Informasi tambahan..."
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm placeholder:text-stone-400 focus:border-coral-400 focus:outline-none resize-none" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {dialog?.mode === 'edit' && canDelete && (
              <Button variant="outline" className="sm:mr-auto text-red-600 hover:bg-red-50" onClick={deleteRecord}>Hapus Catatan</Button>
            )}
            <Button variant="outline" onClick={() => setDialog(null)}>Batal</Button>
            <Button onClick={submitDialog} isLoading={saving} className="gap-2">
              {dialog?.mode === 'checkin' ? <><UserCheck className="h-4 w-4" /> Konfirmasi Check-in</>
                : dialog?.mode === 'checkout' ? <><LogOut className="h-4 w-4" /> Konfirmasi Check-out</>
                : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmEl}
    </div>
  );
}
