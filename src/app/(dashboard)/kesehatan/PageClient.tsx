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
import {
  Heart, Plus, AlertTriangle, Pill, Thermometer, FileText, X,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { Child } from '@/types';
import { inisial } from '@/lib/utils';

type IncidentType = 'injury' | 'illness' | 'allergic_reaction' | 'medication' | 'other';
type IncidentSeverity = 'minor' | 'moderate' | 'severe';

interface HealthIncident {
  id: string;
  organizationId: string;
  childId: string;
  childName: string;
  type: IncidentType;
  severity: IncidentSeverity;
  description: string;
  actionTaken: string;
  parentNotified: boolean;
  occurredAt: Timestamp;
  createdAt: Timestamp;
  staffId: string;
}

const TYPE_CONFIG: Record<IncidentType, { label: string; icon: React.ReactNode; color: string }> = {
  injury: { label: 'Cedera', icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'text-orange-600' },
  illness: { label: 'Sakit', icon: <Thermometer className="h-3.5 w-3.5" />, color: 'text-red-600' },
  allergic_reaction: { label: 'Alergi', icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'text-amber-600' },
  medication: { label: 'Obat', icon: <Pill className="h-3.5 w-3.5" />, color: 'text-blue-600' },
  other: { label: 'Lainnya', icon: <FileText className="h-3.5 w-3.5" />, color: 'text-stone-600' },
};

const SEVERITY_BADGE: Record<IncidentSeverity, 'danger' | 'warning' | 'info'> = {
  severe: 'danger',
  moderate: 'warning',
  minor: 'info',
};

const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  severe: 'Parah',
  moderate: 'Sedang',
  minor: 'Ringan',
};

export default function KesehatanPage() {
  const { organizationId, user, can } = useAuth();
  const [incidents, setIncidents] = useState<HealthIncident[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filterType, setFilterType] = useState<IncidentType | 'semua'>('semua');

  const [form, setForm] = useState({
    childId: '',
    type: 'injury' as IncidentType,
    severity: 'minor' as IncidentSeverity,
    description: '',
    actionTaken: '',
    parentNotified: false,
    occurredDate: format(new Date(), 'yyyy-MM-dd'),
    occurredTime: format(new Date(), 'HH:mm'),
  });

  useEffect(() => {
    if (!organizationId) return;
    loadData();
  }, [organizationId]);

  async function loadData() {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const [incidentSnap, childSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'organizations', organizationId, 'healthIncidents'),
          orderBy('occurredAt', 'desc')
        )),
        getDocs(query(
          collection(db, 'organizations', organizationId, 'children'),
          where('status', '==', 'active'),
          orderBy('fullName')
        )),
      ]);
      setIncidents(incidentSnap.docs.map(d => ({ id: d.id, ...d.data() }) as HealthIncident));
      setChildren(childSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Child));
    } catch {
      toast({ title: 'Gagal memuat data kesehatan', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  async function saveIncident() {
    if (!organizationId) return;
    if (!form.childId || !form.description.trim()) {
      toast({ title: 'Isi semua kolom yang wajib', variant: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      const child = children.find(c => c.id === form.childId);
      const occurredAt = Timestamp.fromDate(new Date(`${form.occurredDate}T${form.occurredTime}`));
      await addDoc(collection(db, 'organizations', organizationId, 'healthIncidents'), {
        organizationId,
        childId: form.childId,
        childName: child?.fullName ?? '',
        type: form.type,
        severity: form.severity,
        description: form.description,
        actionTaken: form.actionTaken,
        parentNotified: form.parentNotified,
        occurredAt,
        staffId: user?.uid ?? '',
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Insiden berhasil dicatat', variant: 'success' });
      setShowDialog(false);
      setForm({
        childId: '', type: 'injury', severity: 'minor', description: '', actionTaken: '',
        parentNotified: false,
        occurredDate: format(new Date(), 'yyyy-MM-dd'),
        occurredTime: format(new Date(), 'HH:mm'),
      });
      loadData();
    } catch {
      toast({ title: 'Gagal menyimpan insiden', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  const displayed = filterType === 'semua' ? incidents : incidents.filter(i => i.type === filterType);

  return (
    <div>
      <Topbar title="Kesehatan & Keselamatan" subtitle="Catat dan pantau insiden kesehatan anak" />

      <div className="p-6 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Insiden', value: incidents.length, color: 'text-stone-700', bg: 'bg-stone-50' },
            { label: 'Parah', value: incidents.filter(i => i.severity === 'severe').length, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Sedang', value: incidents.filter(i => i.severity === 'moderate').length, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Ringan', value: incidents.filter(i => i.severity === 'minor').length, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-3 ${s.bg}`}>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-stone-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter + action */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
            <button
              onClick={() => setFilterType('semua')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'semua' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
            >
              Semua
            </button>
            {(Object.keys(TYPE_CONFIG) as IncidentType[]).map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filterType === t ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
              >
                {TYPE_CONFIG[t].label}
              </button>
            ))}
          </div>
          {can('create') && (
            <Button onClick={() => setShowDialog(true)} className="gap-2 ml-auto shrink-0">
              <Plus className="h-4 w-4" /> Catat Insiden
            </Button>
          )}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-stone-100 animate-pulse" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <Heart className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Tidak ada insiden tercatat</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(incident => (
              <Card key={incident.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-50 text-coral-500 font-bold text-xs">
                      {inisial(incident.childName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-stone-900">{incident.childName}</p>
                          <p className="text-xs text-stone-400">
                            {format(incident.occurredAt.toDate(), "d MMM yyyy 'pukul' HH:mm", { locale: localeId })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={SEVERITY_BADGE[incident.severity]}>{SEVERITY_LABEL[incident.severity]}</Badge>
                          <span className={`flex items-center gap-1 text-xs font-medium ${TYPE_CONFIG[incident.type].color}`}>
                            {TYPE_CONFIG[incident.type].icon}
                            {TYPE_CONFIG[incident.type].label}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1.5 text-sm text-stone-700">{incident.description}</p>
                      {incident.actionTaken && (
                        <p className="mt-1 text-xs text-stone-500">
                          <span className="font-medium">Tindakan:</span> {incident.actionTaken}
                        </p>
                      )}
                      {incident.parentNotified && (
                        <p className="mt-1 text-xs text-emerald-600 font-medium">✓ Orang tua sudah diberitahu</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h2 className="text-base font-semibold">Catat Insiden Kesehatan</h2>
              <button onClick={() => setShowDialog(false)} className="rounded-xl p-1.5 hover:bg-stone-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Anak <span className="text-red-500">*</span></label>
                <select
                  value={form.childId}
                  onChange={e => setForm(f => ({ ...f, childId: e.target.value }))}
                  className="w-full h-10 rounded-xl border border-stone-200 px-3 text-sm focus:border-coral-400 focus:outline-none"
                >
                  <option value="">Pilih anak...</option>
                  {children.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">Jenis Insiden</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as IncidentType }))}
                    className="w-full h-10 rounded-xl border border-stone-200 px-3 text-sm focus:border-coral-400 focus:outline-none"
                  >
                    {(Object.keys(TYPE_CONFIG) as IncidentType[]).map(t => (
                      <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">Tingkat Keparahan</label>
                  <select
                    value={form.severity}
                    onChange={e => setForm(f => ({ ...f, severity: e.target.value as IncidentSeverity }))}
                    className="w-full h-10 rounded-xl border border-stone-200 px-3 text-sm focus:border-coral-400 focus:outline-none"
                  >
                    <option value="minor">Ringan</option>
                    <option value="moderate">Sedang</option>
                    <option value="severe">Parah</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">Tanggal</label>
                  <input
                    type="date"
                    value={form.occurredDate}
                    onChange={e => setForm(f => ({ ...f, occurredDate: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-stone-200 px-3 text-sm focus:border-coral-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">Waktu</label>
                  <input
                    type="time"
                    value={form.occurredTime}
                    onChange={e => setForm(f => ({ ...f, occurredTime: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-stone-200 px-3 text-sm focus:border-coral-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Deskripsi Kejadian <span className="text-red-500">*</span></label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Ceritakan kejadian yang terjadi..."
                  className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:border-coral-400 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Tindakan yang Diambil</label>
                <textarea
                  value={form.actionTaken}
                  onChange={e => setForm(f => ({ ...f, actionTaken: e.target.value }))}
                  rows={2}
                  placeholder="P3K, dirujuk ke dokter, dll..."
                  className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:border-coral-400 focus:outline-none resize-none"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.parentNotified}
                  onChange={e => setForm(f => ({ ...f, parentNotified: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-stone-700">Orang tua sudah diberitahu</span>
              </label>
            </div>
            <div className="p-5 pt-3 border-t border-stone-100 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
              <Button onClick={saveIncident} isLoading={isSaving}>Simpan Insiden</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
