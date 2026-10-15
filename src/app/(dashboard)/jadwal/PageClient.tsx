'use client';

import React, { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Calendar, Plus, X, Clock, MapPin, Users, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toDateSafe } from '@/lib/utils';

type EventType = 'kegiatan' | 'libur' | 'pertemuan' | 'lainnya';
type Audience = 'all' | 'parents' | 'staff';

interface DaycareEvent {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  type: EventType;
  startDate: Timestamp;
  endDate: Timestamp;
  location: string;
  audience: Audience;
  createdAt: Timestamp;
}

const TYPE_CONFIG: Record<EventType, { label: string; color: string; bg: string; dot: string }> = {
  kegiatan: { label: 'Kegiatan', color: 'text-emerald-700', bg: 'bg-emerald-100', dot: 'bg-emerald-500' },
  libur: { label: 'Libur', color: 'text-red-700', bg: 'bg-red-100', dot: 'bg-red-500' },
  pertemuan: { label: 'Pertemuan', color: 'text-blue-700', bg: 'bg-blue-100', dot: 'bg-blue-500' },
  lainnya: { label: 'Lainnya', color: 'text-stone-700', bg: 'bg-stone-100', dot: 'bg-stone-500' },
};

const AUDIENCE_LABEL: Record<Audience, string> = { all: 'Semua', parents: 'Orang tua', staff: 'Staf saja' };

const emptyForm = (day = new Date()) => ({
  title: '',
  description: '',
  type: 'kegiatan' as EventType,
  startDate: format(day, 'yyyy-MM-dd'),
  startTime: '08:00',
  endDate: format(day, 'yyyy-MM-dd'),
  endTime: '12:00',
  location: '',
  audience: 'all' as Audience,
});

const inputCls = 'w-full h-10 rounded-xl border border-stone-200 px-3 text-sm focus:border-coral-400 focus:outline-none';

export default function JadwalPage() {
  const { organizationId, role, hasRole } = useAuth();
  // firestore.rules: events create/update/delete → owner/admin only
  const canManage = hasRole('owner', 'admin');
  const [events, setEvents] = useState<DaycareEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<DaycareEvent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [confirm, confirmEl] = useConfirm();

  useEffect(() => {
    if (!organizationId) return;
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, currentMonth]);

  async function loadEvents() {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const start = Timestamp.fromDate(startOfMonth(currentMonth));
      const end = Timestamp.fromDate(endOfMonth(currentMonth));
      // range + orderBy on the SAME field → no composite index needed
      const snap = await getDocs(query(
        collection(db, 'organizations', organizationId, 'events'),
        where('startDate', '>=', start),
        where('startDate', '<=', end),
        orderBy('startDate')
      ));
      // parents must not see staff-only events
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DaycareEvent)
        .filter((e) => role !== 'parent' || e.audience !== 'staff'));
    } catch {
      toast({ title: 'Gagal memuat jadwal', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm(selectedDay ?? new Date()));
    setShowDialog(true);
  }

  function openEdit(e: DaycareEvent) {
    const s = toDateSafe(e.startDate) ?? new Date();
    const en = toDateSafe(e.endDate) ?? s;
    setEditing(e);
    setForm({
      title: e.title ?? '',
      description: e.description ?? '',
      type: e.type ?? 'kegiatan',
      startDate: format(s, 'yyyy-MM-dd'),
      startTime: format(s, 'HH:mm'),
      endDate: format(en, 'yyyy-MM-dd'),
      endTime: format(en, 'HH:mm'),
      location: e.location ?? '',
      audience: e.audience ?? 'all',
    });
    setShowDialog(true);
  }

  async function saveEvent() {
    if (!organizationId) return;
    if (!form.title.trim()) { toast({ title: 'Isi judul acara', variant: 'error' }); return; }
    const start = parseISO(`${form.startDate}T${form.startTime || '00:00'}`);
    const end = parseISO(`${form.endDate}T${form.endTime || '23:59'}`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) { toast({ title: 'Tanggal/jam tidak valid', variant: 'error' }); return; }
    if (end < start) { toast({ title: 'Waktu selesai harus setelah waktu mulai', variant: 'error' }); return; }
    setIsSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        startDate: Timestamp.fromDate(start),
        endDate: Timestamp.fromDate(end),
        location: form.location.trim(),
        audience: form.audience,
        updatedAt: serverTimestamp(),
      };
      if (editing) {
        await updateDoc(doc(db, 'organizations', organizationId, 'events', editing.id), payload);
        toast({ title: 'Acara diperbarui', variant: 'success' });
      } else {
        await addDoc(collection(db, 'organizations', organizationId, 'events'), { ...payload, organizationId, createdAt: serverTimestamp() });
        toast({ title: 'Acara berhasil ditambahkan', variant: 'success' });
      }
      setShowDialog(false);
      setEditing(null);
      loadEvents();
    } catch {
      toast({ title: 'Gagal menyimpan acara', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteEvent(e: DaycareEvent) {
    if (!organizationId) return;
    if (!(await confirm({ title: 'Hapus acara?', description: `"${e.title}" akan dihapus dari jadwal.` }))) return;
    try {
      await deleteDoc(doc(db, 'organizations', organizationId, 'events', e.id));
      toast({ title: 'Acara dihapus', variant: 'success' });
      loadEvents();
    } catch {
      toast({ title: 'Gagal menghapus acara', variant: 'error' });
    }
  }

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = (startOfMonth(currentMonth).getDay() + 6) % 7; // Monday-based
  const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const eventsForDay = (day: Date) => events.filter((e) => { const s = toDateSafe(e.startDate); return s && isSameDay(s, day); });
  const listed = selectedDay ? eventsForDay(selectedDay) : events;

  return (
    <div>
      <Topbar title="Jadwal & Kegiatan" subtitle="Kelola jadwal dan acara daycare" />

      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button aria-label="Bulan sebelumnya"
              onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="h-8 w-8 rounded-xl border border-stone-200 flex items-center justify-center hover:bg-stone-50 text-stone-600">‹</button>
            <h2 className="text-base font-semibold text-stone-800">{format(currentMonth, 'MMMM yyyy', { locale: localeId })}</h2>
            <button aria-label="Bulan berikutnya"
              onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="h-8 w-8 rounded-xl border border-stone-200 flex items-center justify-center hover:bg-stone-50 text-stone-600">›</button>
          </div>
          {canManage && (
            <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /> Tambah Acara</Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-7 mb-2">
                  {dayNames.map((d) => <div key={d} className="text-center text-xs font-semibold text-stone-400 py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
                  {days.map((day) => {
                    const dayEvents = eventsForDay(day);
                    const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDay(isSelected ? null : day)}
                        className={`relative p-1.5 rounded-xl text-center transition-colors min-h-[48px] ${
                          isSelected ? 'bg-coral-500 text-white' :
                          isToday(day) ? 'bg-coral-50 text-coral-600 font-bold' :
                          !isSameMonth(day, currentMonth) ? 'text-stone-300' : 'hover:bg-stone-50 text-stone-700'
                        }`}
                      >
                        <span className="text-xs">{format(day, 'd')}</span>
                        {dayEvents.length > 0 && (
                          <div className="flex justify-center gap-0.5 mt-0.5 flex-wrap">
                            {dayEvents.slice(0, 3).map((e) => (
                              <div key={e.id} className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : TYPE_CONFIG[e.type]?.dot ?? 'bg-stone-400'}`} />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-stone-700 mb-3">
              {selectedDay ? format(selectedDay, 'd MMMM yyyy', { locale: localeId }) : 'Semua Acara Bulan Ini'}
            </h3>
            {isLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-stone-100 animate-pulse" />)}</div>
            ) : listed.length === 0 ? (
              <div className="text-center py-10 text-stone-400">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">{selectedDay ? 'Tidak ada acara di tanggal ini' : 'Tidak ada acara bulan ini'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {listed.map((e) => {
                  const cfg = TYPE_CONFIG[e.type] ?? TYPE_CONFIG.lainnya;
                  const s = toDateSafe(e.startDate); const en = toDateSafe(e.endDate);
                  const multiDay = s && en && !isSameDay(s, en);
                  return (
                    <div key={e.id} data-testid="event-row" className="rounded-xl border border-stone-100 bg-white p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-stone-800">{e.title}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      {e.description && <p className="text-xs text-stone-500 mt-1">{e.description}</p>}
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {s ? format(s, multiDay ? 'd MMM HH:mm' : 'HH:mm', { locale: localeId }) : '-'}–{en ? format(en, multiDay ? 'd MMM HH:mm' : 'HH:mm', { locale: localeId }) : '-'}
                        </span>
                        {e.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</span>}
                        {role !== 'parent' && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{AUDIENCE_LABEL[e.audience] ?? 'Semua'}</span>}
                      </div>
                      {canManage && (
                        <div className="flex justify-end gap-1 mt-2">
                          {canManage && (
                            <button title="Edit" aria-label="Edit acara" onClick={() => openEdit(e)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-coral-600 hover:bg-coral-50"><Pencil className="h-3.5 w-3.5" /></button>
                          )}
                          {canManage && (
                            <button title="Hapus" aria-label="Hapus acara" onClick={() => deleteEvent(e)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showDialog && (
        <div role="dialog" aria-modal="true" aria-label={editing ? 'Edit Acara' : 'Tambah Acara'}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          onKeyDown={(ev) => { if (ev.key === 'Escape') setShowDialog(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h2 className="text-base font-semibold">{editing ? 'Edit Acara' : 'Tambah Acara'}</h2>
              <button aria-label="Tutup" onClick={() => setShowDialog(false)} className="rounded-xl p-1.5 hover:bg-stone-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Judul Acara <span className="text-red-500">*</span></label>
                <input aria-label="Judul acara" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Nama acara..." className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">Jenis</label>
                  <select aria-label="Jenis acara" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as EventType }))} className={inputCls}>
                    {(Object.keys(TYPE_CONFIG) as EventType[]).map((t) => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">Untuk</label>
                  <select aria-label="Untuk siapa" value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value as Audience }))} className={inputCls}>
                    {(Object.keys(AUDIENCE_LABEL) as Audience[]).map((a) => <option key={a} value={a}>{AUDIENCE_LABEL[a]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">Lokasi</label>
                  <input aria-label="Lokasi" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="Ruang/tempat..." className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">Mulai</label>
                  <input aria-label="Tanggal mulai" type="date" value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value, endDate: f.endDate < e.target.value ? e.target.value : f.endDate }))} className={inputCls} />
                  <input aria-label="Jam mulai" type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} className={`${inputCls} mt-2`} />
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">Selesai</label>
                  <input aria-label="Tanggal selesai" type="date" value={form.endDate} min={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className={inputCls} />
                  <input aria-label="Jam selesai" type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} className={`${inputCls} mt-2`} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Keterangan</label>
                <textarea aria-label="Keterangan acara" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Detail acara (opsional)..."
                  className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:border-coral-400 focus:outline-none resize-none" />
              </div>
            </div>
            <div className="p-5 pt-0 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
              <Button onClick={saveEvent} isLoading={isSaving}>{editing ? 'Simpan Perubahan' : 'Simpan Acara'}</Button>
            </div>
          </div>
        </div>
      )}
      {confirmEl}
    </div>
  );
}
