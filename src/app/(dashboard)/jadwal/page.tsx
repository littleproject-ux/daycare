'use client';

import React, { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Plus, X, Clock, MapPin, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

type EventType = 'kegiatan' | 'libur' | 'pertemuan' | 'lainnya';

interface DaycareEvent {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  type: EventType;
  startDate: Timestamp;
  endDate: Timestamp;
  location: string;
  audience: 'all' | 'parents' | 'staff';
  createdAt: Timestamp;
}

const TYPE_CONFIG: Record<EventType, { label: string; color: string; bg: string }> = {
  kegiatan: { label: 'Kegiatan', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  libur: { label: 'Libur', color: 'text-red-700', bg: 'bg-red-100' },
  pertemuan: { label: 'Pertemuan', color: 'text-blue-700', bg: 'bg-blue-100' },
  lainnya: { label: 'Lainnya', color: 'text-stone-700', bg: 'bg-stone-100' },
};

export default function JadwalPage() {
  const { organizationId, can } = useAuth();
  const [events, setEvents] = useState<DaycareEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'kegiatan' as EventType,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    startTime: '08:00',
    endDate: format(new Date(), 'yyyy-MM-dd'),
    endTime: '17:00',
    location: '',
    audience: 'all' as 'all' | 'parents' | 'staff',
  });

  useEffect(() => {
    if (!organizationId) return;
    loadEvents();
  }, [organizationId, currentMonth]);

  async function loadEvents() {
    setIsLoading(true);
    try {
      const start = Timestamp.fromDate(startOfMonth(currentMonth));
      const end = Timestamp.fromDate(endOfMonth(currentMonth));
      const snap = await getDocs(query(
        collection(db, 'events'),
        where('organizationId', '==', organizationId),
        where('startDate', '>=', start),
        where('startDate', '<=', end),
        orderBy('startDate')
      ));
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }) as DaycareEvent));
    } catch {
      toast({ title: 'Gagal memuat jadwal', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  async function saveEvent() {
    if (!form.title.trim()) {
      toast({ title: 'Isi judul acara', variant: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'events'), {
        organizationId,
        title: form.title,
        description: form.description,
        type: form.type,
        startDate: Timestamp.fromDate(new Date(`${form.startDate}T${form.startTime}`)),
        endDate: Timestamp.fromDate(new Date(`${form.endDate}T${form.endTime}`)),
        location: form.location,
        audience: form.audience,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Acara berhasil ditambahkan', variant: 'success' });
      setShowDialog(false);
      setForm({
        title: '', description: '', type: 'kegiatan',
        startDate: format(new Date(), 'yyyy-MM-dd'), startTime: '08:00',
        endDate: format(new Date(), 'yyyy-MM-dd'), endTime: '17:00',
        location: '', audience: 'all',
      });
      loadEvents();
    } catch {
      toast({ title: 'Gagal menyimpan acara', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = (startOfMonth(currentMonth).getDay() + 6) % 7; // Monday-based
  const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  const eventsForDay = (day: Date) =>
    events.filter(e => isSameDay(e.startDate.toDate(), day));

  const selectedDayEvents = selectedDay ? eventsForDay(selectedDay) : [];

  return (
    <div>
      <Topbar title="Jadwal & Kegiatan" subtitle="Kelola jadwal dan acara daycare" />

      <div className="p-6 space-y-5">
        {/* Month nav */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="h-8 w-8 rounded-xl border border-stone-200 flex items-center justify-center hover:bg-stone-50 text-stone-600"
            >
              ‹
            </button>
            <h2 className="text-base font-semibold text-stone-800">
              {format(currentMonth, 'MMMM yyyy', { locale: localeId })}
            </h2>
            <button
              onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="h-8 w-8 rounded-xl border border-stone-200 flex items-center justify-center hover:bg-stone-50 text-stone-600"
            >
              ›
            </button>
          </div>
          {can('create') && (
            <Button onClick={() => setShowDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Tambah Acara
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-7 mb-2">
                  {dayNames.map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-stone-400 py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
                  {days.map(day => {
                    const dayEvents = eventsForDay(day);
                    const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
                        className={`relative p-1.5 rounded-xl text-center transition-colors min-h-[52px] ${
                          isSelected ? 'bg-coral-500 text-white' :
                          isToday(day) ? 'bg-coral-50 text-coral-600 font-bold' :
                          !isSameMonth(day, currentMonth) ? 'text-stone-300' :
                          'hover:bg-stone-50 text-stone-700'
                        }`}
                      >
                        <span className="text-xs">{format(day, 'd')}</span>
                        {dayEvents.length > 0 && (
                          <div className="flex justify-center gap-0.5 mt-0.5 flex-wrap">
                            {dayEvents.slice(0, 3).map(e => (
                              <div
                                key={e.id}
                                className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : TYPE_CONFIG[e.type].color.replace('text-', 'bg-')}`}
                              />
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

          {/* Event list */}
          <div>
            <h3 className="text-sm font-semibold text-stone-700 mb-3">
              {selectedDay
                ? format(selectedDay, "d MMMM yyyy", { locale: localeId })
                : 'Semua Acara Bulan Ini'}
            </h3>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-stone-100 animate-pulse" />)}
              </div>
            ) : (selectedDay ? selectedDayEvents : events).length === 0 ? (
              <div className="text-center py-10 text-stone-400">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">
                  {selectedDay ? 'Tidak ada acara hari ini' : 'Tidak ada acara bulan ini'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {(selectedDay ? selectedDayEvents : events).map(e => (
                  <div key={e.id} className="rounded-xl border border-stone-100 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-stone-800">{e.title}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${TYPE_CONFIG[e.type].bg} ${TYPE_CONFIG[e.type].color}`}>
                        {TYPE_CONFIG[e.type].label}
                      </span>
                    </div>
                    {e.description && <p className="text-xs text-stone-500 mt-1">{e.description}</p>}
                    <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-stone-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(e.startDate.toDate(), 'HH:mm')}–{format(e.endDate.toDate(), 'HH:mm')}
                      </span>
                      {e.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{e.location}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h2 className="text-base font-semibold">Tambah Acara</h2>
              <button onClick={() => setShowDialog(false)} className="rounded-xl p-1.5 hover:bg-stone-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Judul Acara <span className="text-red-500">*</span></label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Nama acara..."
                  className="w-full h-10 rounded-xl border border-stone-200 px-3 text-sm focus:border-coral-400 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">Jenis</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as EventType }))}
                    className="w-full h-10 rounded-xl border border-stone-200 px-3 text-sm focus:border-coral-400 focus:outline-none"
                  >
                    {(Object.keys(TYPE_CONFIG) as EventType[]).map(t => (
                      <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">Lokasi</label>
                  <input
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="Ruang/tempat..."
                    className="w-full h-10 rounded-xl border border-stone-200 px-3 text-sm focus:border-coral-400 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">Mulai</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="w-full h-10 rounded-xl border border-stone-200 px-3 text-sm focus:border-coral-400 focus:outline-none" />
                  <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="w-full h-10 rounded-xl border border-stone-200 px-3 text-sm focus:border-coral-400 focus:outline-none mt-2" />
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">Selesai</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="w-full h-10 rounded-xl border border-stone-200 px-3 text-sm focus:border-coral-400 focus:outline-none" />
                  <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="w-full h-10 rounded-xl border border-stone-200 px-3 text-sm focus:border-coral-400 focus:outline-none mt-2" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Keterangan</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Detail acara (opsional)..."
                  className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:border-coral-400 focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="p-5 pt-0 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
              <Button onClick={saveEvent} isLoading={isSaving}>Simpan Acara</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
