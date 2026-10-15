'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Clock, FileText, Save, CheckCircle2 } from 'lucide-react';
import type { Organization } from '@/types';
import { toast } from '@/hooks/use-toast';

const WORK_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function PengaturanPage() {
  const { organizationId, hasRole } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    openTime: '07:00',
    closeTime: '17:00',
    workDays: [1, 2, 3, 4, 5] as number[],
    invoicePrefix: 'INV',
  });

  const canEdit = hasRole('owner', 'admin');

  useEffect(() => {
    if (!organizationId) return;
    loadOrg();
  }, [organizationId]);

  async function loadOrg() {
    setIsLoading(true);
    try {
      const snap = await getDoc(doc(db, 'organizations', organizationId!));
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as Organization;
        setOrg(data);
        setFormData({
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          openTime: data.operatingHours?.open || '07:00',
          closeTime: data.operatingHours?.close || '17:00',
          workDays: data.workDays || [1, 2, 3, 4, 5],
          invoicePrefix: data.invoicePrefix || 'INV',
        });
      }
    } catch (e) {
      toast({ title: 'Gagal memuat pengaturan', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  async function saveSettings() {
    if (!organizationId) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'organizations', organizationId), {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        website: formData.website || null,
        operatingHours: { open: formData.openTime, close: formData.closeTime },
        workDays: formData.workDays,
        invoicePrefix: formData.invoicePrefix,
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Pengaturan berhasil disimpan', variant: 'success' });
    } catch (e) {
      toast({ title: 'Gagal menyimpan pengaturan', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  function toggleDay(day: number) {
    setFormData((d) => ({
      ...d,
      workDays: d.workDays.includes(day)
        ? d.workDays.filter((x) => x !== day)
        : [...d.workDays, day].sort(),
    }));
  }

  if (isLoading) {
    return (
      <div>
        <Topbar title="Pengaturan" subtitle="Konfigurasi daycare Anda" />
        <div className="p-6 space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-xl bg-stone-100 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Pengaturan" subtitle="Konfigurasi daycare Anda" />

      <div className="p-6 space-y-5 max-w-2xl">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-coral-500" />
              Informasi Daycare
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Nama Daycare"
              value={formData.name}
              onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
              disabled={!canEdit}
            />
            <Input
              label="Alamat Lengkap"
              value={formData.address}
              onChange={(e) => setFormData((d) => ({ ...d, address: e.target.value }))}
              disabled={!canEdit}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nomor Telepon"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((d) => ({ ...d, phone: e.target.value }))}
                disabled={!canEdit}
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((d) => ({ ...d, email: e.target.value }))}
                disabled={!canEdit}
              />
            </div>
            <Input
              label="Website (opsional)"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData((d) => ({ ...d, website: e.target.value }))}
              disabled={!canEdit}
            />
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-coral-500" />
              Jadwal Operasional
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Jam Buka"
                type="time"
                value={formData.openTime}
                onChange={(e) => setFormData((d) => ({ ...d, openTime: e.target.value }))}
                disabled={!canEdit}
              />
              <Input
                label="Jam Tutup"
                type="time"
                value={formData.closeTime}
                onChange={(e) => setFormData((d) => ({ ...d, closeTime: e.target.value }))}
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-2">Hari Operasional</label>
              <div className="flex flex-wrap gap-2">
                {WORK_DAYS.map((day, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => toggleDay(i)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      formData.workDays.includes(i)
                        ? 'bg-coral-500 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {day.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-coral-500" />
              Pengaturan Invoice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              label="Awalan Nomor Invoice"
              placeholder="INV"
              hint={`Contoh: ${formData.invoicePrefix}/2024/01/0001`}
              value={formData.invoicePrefix}
              onChange={(e) => setFormData((d) => ({ ...d, invoicePrefix: e.target.value.toUpperCase() }))}
              disabled={!canEdit}
            />
          </CardContent>
        </Card>

        {canEdit && (
          <Button onClick={saveSettings} isLoading={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            Simpan Pengaturan
          </Button>
        )}

        {!canEdit && (
          <p className="text-sm text-stone-400 italic">Hanya owner dan admin yang dapat mengubah pengaturan.</p>
        )}
      </div>
    </div>
  );
}
