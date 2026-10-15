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
  ClipboardList, ChevronLeft, ChevronRight, Utensils, Moon,
  Smile, Activity, Pill, Edit3, CheckCircle2, Clock,
} from 'lucide-react';
import type { Child, DailyReport } from '@/types';
import { dateToYMD, inisial } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { format, addDays, subDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const MOOD_OPTIONS: { value: DailyReport['mood']; label: string; emoji: string }[] = [
  { value: 'sangat_baik', label: 'Sangat Baik', emoji: '😄' },
  { value: 'baik', label: 'Baik', emoji: '😊' },
  { value: 'biasa', label: 'Biasa', emoji: '😐' },
  { value: 'rewel', label: 'Rewel', emoji: '😔' },
  { value: 'sakit', label: 'Sakit', emoji: '🤒' },
];

const MEAL_QTY = [
  { value: 'habis', label: 'Habis' },
  { value: 'sebagian', label: 'Setengah' },
  { value: 'tidak_makan', label: 'Tidak Makan' },
];

interface FormData {
  mood: DailyReport['mood'];
  sarapanQty: string;
  makanSiangQty: string;
  snackQty: string;
  napStart: string;
  napEnd: string;
  toiletVisits: string;
  diaperChanges: string;
  activities: string;
  medicationGiven: boolean;
  medicationName: string;
  medicationDosage: string;
  caregiverNotes: string;
}

const DEFAULT_FORM: FormData = {
  mood: 'baik',
  sarapanQty: 'habis',
  makanSiangQty: 'habis',
  snackQty: 'habis',
  napStart: '13:00',
  napEnd: '14:30',
  toiletVisits: '2',
  diaperChanges: '0',
  activities: '',
  medicationGiven: false,
  medicationName: '',
  medicationDosage: '',
  caregiverNotes: '',
};

function timeStrToTimestamp(timeStr: string): Timestamp {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return Timestamp.fromDate(d);
}

export default function LaporanHarianPage() {
  const { organizationId, user, can } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [children, setChildren] = useState<Child[]>([]);
  const [reports, setReports] = useState<Map<string, DailyReport>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const dateStr = dateToYMD(selectedDate);

  useEffect(() => {
    if (!organizationId) return;
    loadData();
  }, [organizationId, selectedDate]);

  async function loadData() {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const childQ = query(
        collection(db, 'organizations', organizationId, 'children'),
        where('status', '==', 'active'),
        orderBy('fullName')
      );
      const childSnap = await getDocs(childQ);
      const childList = childSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Child);
      setChildren(childList);

      const reportQ = query(
        collection(db, 'organizations', organizationId, 'dailyReports'),
        where('date', '==', dateStr)
      );
      const reportSnap = await getDocs(reportQ);
      const reportMap = new Map<string, DailyReport>();
      reportSnap.docs.forEach((d) => {
        const r = { id: d.id, ...d.data() } as DailyReport;
        reportMap.set(r.childId, r);
      });
      setReports(reportMap);
    } catch (e) {
      console.error(e);
      toast({ title: 'Gagal memuat data laporan', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  function openDialog(child: Child) {
    const existing = reports.get(child.id);
    setSelectedChild(child);
    setEditingReport(existing || null);
    if (existing) {
      const sarapan = existing.meals?.find((m) => m.type === 'sarapan');
      const siang = existing.meals?.find((m) => m.type === 'makan_siang');
      const snack = existing.meals?.find((m) => m.type === 'snack');
      const med = existing.medicationRecords?.[0];
      setFormData({
        mood: existing.mood || 'baik',
        sarapanQty: sarapan?.quantity || 'habis',
        makanSiangQty: siang?.quantity || 'habis',
        snackQty: snack?.quantity || 'habis',
        napStart: existing.napStart ? format(existing.napStart.toDate(), 'HH:mm') : '13:00',
        napEnd: existing.napEnd ? format(existing.napEnd.toDate(), 'HH:mm') : '14:30',
        toiletVisits: String(existing.toiletVisits || 2),
        diaperChanges: String(existing.diaperChanges || 0),
        activities: existing.activities?.join(', ') || '',
        medicationGiven: (existing.medicationRecords?.length || 0) > 0,
        medicationName: med?.medicationName || '',
        medicationDosage: med?.dosage || '',
        caregiverNotes: existing.caregiverNotes || '',
      });
    } else {
      setFormData(DEFAULT_FORM);
    }
    setShowDialog(true);
  }

  async function saveReport() {
    if (!organizationId) return;
    if (!selectedChild || !organizationId || !user) return;
    setIsSaving(true);
    try {
      const payload = {
        organizationId,
        childId: selectedChild.id,
        branchId: selectedChild.branchId || '',
        roomId: selectedChild.roomId || '',
        date: dateStr,
        status: 'published' as const,
        caregiverId: user.uid,
        mood: formData.mood,
        meals: [
          { time: '08:00', type: 'sarapan' as const, menu: '', quantity: formData.sarapanQty as 'habis' | 'sebagian' | 'tidak_makan' },
          { time: '12:00', type: 'makan_siang' as const, menu: '', quantity: formData.makanSiangQty as 'habis' | 'sebagian' | 'tidak_makan' },
          { time: '15:00', type: 'snack' as const, menu: '', quantity: formData.snackQty as 'habis' | 'sebagian' | 'tidak_makan' },
        ],
        napStart: timeStrToTimestamp(formData.napStart),
        napEnd: timeStrToTimestamp(formData.napEnd),
        toiletVisits: parseInt(formData.toiletVisits) || 0,
        diaperChanges: parseInt(formData.diaperChanges) || 0,
        activities: formData.activities
          ? formData.activities.split(',').map((a) => a.trim()).filter(Boolean)
          : [],
        medicationRecords: formData.medicationGiven
          ? [{
              medicationName: formData.medicationName || 'Sesuai resep',
              dosage: formData.medicationDosage || '',
              time: format(new Date(), 'HH:mm'),
              givenBy: user.uid,
            }]
          : [],
        incidents: [],
        caregiverNotes: formData.caregiverNotes,
        photoUrls: [],
        updatedAt: serverTimestamp(),
      };

      if (editingReport) {
        await updateDoc(doc(db, 'organizations', organizationId, 'dailyReports', editingReport.id), payload);
      } else {
        await addDoc(collection(db, 'organizations', organizationId, 'dailyReports'), {
          ...payload,
          parentAcknowledgedAt: null,
          createdAt: serverTimestamp(),
        });
      }

      toast({ title: `Laporan ${selectedChild.fullName} tersimpan`, variant: 'success' });
      setShowDialog(false);
      loadData();
    } catch (e) {
      console.error(e);
      toast({ title: 'Gagal menyimpan laporan', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  const summary = { reported: reports.size, total: children.length };

  return (
    <div>
      <Topbar title="Laporan Harian" subtitle="Rekap kegiatan harian setiap anak" />

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

        {/* Progress */}
        <div className="bg-white rounded-xl border border-stone-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-stone-700">Progress Laporan</p>
            <p className="text-sm font-bold text-stone-900">{summary.reported}/{summary.total} anak</p>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-coral-400 rounded-full transition-all duration-500"
              style={{ width: summary.total > 0 ? `${(summary.reported / summary.total) * 100}%` : '0%' }}
            />
          </div>
          <p className="text-xs text-stone-400 mt-1">{summary.total - summary.reported} laporan belum dibuat</p>
        </div>

        {/* Children list */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-stone-100 animate-pulse" />
            ))}
          </div>
        ) : children.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Belum ada anak aktif</p>
          </div>
        ) : (
          <Card>
            <div className="divide-y divide-stone-50">
              {children.map((child) => {
                const report = reports.get(child.id);
                const mood = report ? MOOD_OPTIONS.find((m) => m.value === report.mood) : null;
                const siang = report?.meals?.find((m) => m.type === 'makan_siang');

                return (
                  <div key={child.id} className="flex items-center gap-3 p-4 hover:bg-stone-50/60 transition-colors">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-50 text-coral-500 font-bold text-sm">
                      {inisial(child.fullName)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{child.fullName}</p>
                      {report ? (
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {mood && (
                            <span className="text-xs text-stone-500">
                              {mood.emoji} {mood.label}
                            </span>
                          )}
                          {report.napStart && report.napEnd && (
                            <span className="text-xs text-stone-500 flex items-center gap-1">
                              <Moon className="h-3 w-3" />
                              {format(report.napStart.toDate(), 'HH:mm')}–{format(report.napEnd.toDate(), 'HH:mm')}
                            </span>
                          )}
                          {siang && (
                            <span className="text-xs text-stone-500 flex items-center gap-1">
                              <Utensils className="h-3 w-3" />
                              {MEAL_QTY.find((q) => q.value === siang.quantity)?.label || siang.quantity}
                            </span>
                          )}
                          {(report.medicationRecords?.length || 0) > 0 && (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <Pill className="h-3 w-3" /> Obat
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-stone-400 mt-0.5">Belum ada laporan</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {report ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Selesai
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" /> Belum
                        </Badge>
                      )}
                      {can('create') && (
                        <Button
                          size="sm"
                          variant={report ? 'outline' : 'default'}
                          onClick={() => openDialog(child)}
                          className="text-xs gap-1"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          {report ? 'Edit' : 'Buat'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Report Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Laporan Harian — {selectedChild?.fullName}</DialogTitle>
            <p className="text-sm text-stone-500">
              {format(selectedDate, 'd MMMM yyyy', { locale: localeId })}
            </p>
          </DialogHeader>

          <div className="space-y-5">
            {/* Mood */}
            <div>
              <label className="text-sm font-semibold text-stone-700 block mb-2">Suasana Hati</label>
              <div className="flex gap-2 flex-wrap">
                {MOOD_OPTIONS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setFormData((d) => ({ ...d, mood: m.value }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                      formData.mood === m.value
                        ? 'bg-coral-500 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {m.emoji} {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Meals */}
            <div>
              <label className="text-sm font-semibold text-stone-700 block mb-2">Porsi Makan</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'sarapanQty' as const, label: 'Sarapan' },
                  { key: 'makanSiangQty' as const, label: 'Makan Siang' },
                  { key: 'snackQty' as const, label: 'Snack' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <p className="text-xs text-stone-500 mb-1">{label}</p>
                    <Select
                      value={formData[key]}
                      onValueChange={(v) => setFormData((d) => ({ ...d, [key]: v }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEAL_QTY.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Nap */}
            <div>
              <label className="text-sm font-semibold text-stone-700 block mb-2">Tidur Siang</label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Mulai"
                  type="time"
                  value={formData.napStart}
                  onChange={(e) => setFormData((d) => ({ ...d, napStart: e.target.value }))}
                />
                <Input
                  label="Selesai"
                  type="time"
                  value={formData.napEnd}
                  onChange={(e) => setFormData((d) => ({ ...d, napEnd: e.target.value }))}
                />
              </div>
            </div>

            {/* Hygiene */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Ke Toilet (kali)"
                type="number"
                min="0"
                max="20"
                value={formData.toiletVisits}
                onChange={(e) => setFormData((d) => ({ ...d, toiletVisits: e.target.value }))}
              />
              <Input
                label="Ganti Popok (kali)"
                type="number"
                min="0"
                max="20"
                value={formData.diaperChanges}
                onChange={(e) => setFormData((d) => ({ ...d, diaperChanges: e.target.value }))}
              />
            </div>

            {/* Activities */}
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1.5">
                Aktivitas (pisahkan dengan koma)
              </label>
              <input
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm placeholder:text-stone-400 focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-400/20"
                placeholder="Mewarnai, bernyanyi, bermain balok, ..."
                value={formData.activities}
                onChange={(e) => setFormData((d) => ({ ...d, activities: e.target.value }))}
              />
            </div>

            {/* Medication */}
            <div>
              <label className="text-sm font-semibold text-stone-700 block mb-2">Pemberian Obat</label>
              <div className="flex gap-2 mb-3">
                {[false, true].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => setFormData((d) => ({ ...d, medicationGiven: v }))}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                      formData.medicationGiven === v
                        ? 'bg-coral-500 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {v ? 'Ada' : 'Tidak Ada'}
                  </button>
                ))}
              </div>
              {formData.medicationGiven && (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Nama Obat"
                    placeholder="Contoh: Paracetamol"
                    value={formData.medicationName}
                    onChange={(e) => setFormData((d) => ({ ...d, medicationName: e.target.value }))}
                  />
                  <Input
                    label="Dosis"
                    placeholder="Contoh: 5ml"
                    value={formData.medicationDosage}
                    onChange={(e) => setFormData((d) => ({ ...d, medicationDosage: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1.5">Catatan untuk Orang Tua</label>
              <textarea
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm placeholder:text-stone-400 focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-400/20 resize-none"
                rows={3}
                placeholder="Informasi tambahan, perkembangan hari ini, ..."
                value={formData.caregiverNotes}
                onChange={(e) => setFormData((d) => ({ ...d, caregiverNotes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
            <Button onClick={saveReport} isLoading={isSaving} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Simpan Laporan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
