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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, Plus, Phone, Mail, Briefcase, ShieldCheck,
  Edit2, MoreVertical, Search,
} from 'lucide-react';
import type { Staff, StaffStatus, UserRole } from '@/types';
import { inisial } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const STATUS_CONFIG: Record<StaffStatus, { label: string; variant: 'success' | 'warning' | 'secondary' }> = {
  aktif: { label: 'Aktif', variant: 'success' },
  cuti: { label: 'Cuti', variant: 'warning' },
  nonaktif: { label: 'Nonaktif', variant: 'secondary' },
};

const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  admin: 'Admin',
  finance: 'Keuangan',
  caregiver: 'Pengasuh',
};

const POSITIONS = ['Kepala Daycare', 'Koordinator', 'Guru', 'Pengasuh', 'Staf Keuangan', 'Staf Administrasi', 'Petugas Kebersihan', 'Lainnya'];

interface StaffFormData {
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  position: string;
  status: StaffStatus;
  hireDate: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

const DEFAULT_FORM: StaffFormData = {
  fullName: '',
  email: '',
  phone: '',
  role: 'caregiver',
  position: 'Pengasuh',
  status: 'aktif',
  hireDate: new Date().toISOString().split('T')[0],
  emergencyContactName: '',
  emergencyContactPhone: '',
};

export default function StafPage() {
  const { organizationId, can } = useAuth();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<StaffStatus | 'semua'>('semua');
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<StaffFormData>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!organizationId) return;
    loadStaff();
  }, [organizationId]);

  async function loadStaff() {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'organizations', organizationId, 'staff'),
        orderBy('fullName')
      );
      const snap = await getDocs(q);
      setStaffList(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Staff));
    } catch (e) {
      console.error(e);
      toast({ title: 'Gagal memuat data staf', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  function openAddDialog() {
    setEditingStaff(null);
    setFormData(DEFAULT_FORM);
    setShowDialog(true);
  }

  function openEditDialog(staff: Staff) {
    setEditingStaff(staff);
    setFormData({
      fullName: staff.fullName,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      position: staff.position,
      status: staff.status,
      hireDate: staff.hireDate ? staff.hireDate.toDate().toISOString().split('T')[0] : '',
      emergencyContactName: staff.emergencyContactName || '',
      emergencyContactPhone: staff.emergencyContactPhone || '',
    });
    setShowDialog(true);
  }

  async function saveStaff() {
    if (!organizationId) return;
    if (!formData.fullName.trim()) {
      toast({ title: 'Nama staf wajib diisi', variant: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        organizationId,
        branchId: '',
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        position: formData.position,
        status: formData.status,
        hireDate: formData.hireDate ? Timestamp.fromDate(new Date(formData.hireDate)) : Timestamp.now(),
        assignedRoomIds: [],
        emergencyContactName: formData.emergencyContactName || null,
        emergencyContactPhone: formData.emergencyContactPhone || null,
        certifications: [],
        updatedAt: serverTimestamp(),
      };

      if (editingStaff) {
        await updateDoc(doc(db, 'organizations', organizationId, 'staff', editingStaff.id), payload);
        toast({ title: `Data ${formData.fullName} diperbarui`, variant: 'success' });
      } else {
        await addDoc(collection(db, 'organizations', organizationId, 'staff'), {
          ...payload,
          userId: '',
          createdAt: serverTimestamp(),
        });
        toast({ title: `${formData.fullName} berhasil ditambahkan`, variant: 'success' });
      }

      setShowDialog(false);
      loadStaff();
    } catch (e) {
      console.error(e);
      toast({ title: 'Gagal menyimpan data staf', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  const filtered = staffList.filter((s) => {
    const matchStatus = filterStatus === 'semua' || s.status === filterStatus;
    const matchSearch = !search || s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.position.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const summary = {
    aktif: staffList.filter((s) => s.status === 'aktif').length,
    cuti: staffList.filter((s) => s.status === 'cuti').length,
    nonaktif: staffList.filter((s) => s.status === 'nonaktif').length,
  };

  return (
    <div>
      <Topbar title="Staf" subtitle="Kelola data staf daycare" />

      <div className="p-6 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Staf Aktif', value: summary.aktif, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Sedang Cuti', value: summary.cuti, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Nonaktif', value: summary.nonaktif, color: 'text-stone-500', bg: 'bg-stone-50' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-3 ${s.bg}`}>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-stone-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters & Search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              className="w-full pl-9 pr-3 h-9 rounded-xl border border-stone-200 text-sm placeholder:text-stone-400 focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-400/20"
              placeholder="Cari nama atau posisi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
            {(['semua', 'aktif', 'cuti', 'nonaktif'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === s ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {s === 'semua' ? 'Semua' : STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
          {can('create') && (
            <Button onClick={openAddDialog} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Tambah Staf
            </Button>
          )}
        </div>

        {/* Staff list */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-stone-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              {staffList.length === 0 ? 'Belum ada staf terdaftar' : 'Tidak ada staf yang cocok'}
            </p>
            {can('create') && staffList.length === 0 && (
              <Button onClick={openAddDialog} className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> Tambah Staf Pertama
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((staff) => (
              <Card key={staff.id} className="hover:shadow-card-hover transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-coral-50 text-coral-500 font-bold text-sm">
                      {inisial(staff.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-stone-900 truncate">{staff.fullName}</p>
                          <p className="text-xs text-stone-400">{staff.position}</p>
                        </div>
                        <Badge variant={STATUS_CONFIG[staff.status].variant} className="shrink-0 text-xs">
                          {STATUS_CONFIG[staff.status].label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {staff.phone && (
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="truncate">{staff.phone}</span>
                      </div>
                    )}
                    {staff.email && (
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{staff.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <ShieldCheck className="h-3 w-3 shrink-0" />
                      <span>{ROLE_LABELS[staff.role] || staff.role}</span>
                    </div>
                  </div>

                  {can('edit') && (
                    <div className="mt-3 pt-3 border-t border-stone-50">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs gap-1"
                        onClick={() => openEditDialog(staff)}
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Edit Data
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStaff ? 'Edit Data Staf' : 'Tambah Staf Baru'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              label="Nama Lengkap"
              placeholder="Nama lengkap staf"
              required
              value={formData.fullName}
              onChange={(e) => setFormData((d) => ({ ...d, fullName: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Email"
                type="email"
                placeholder="email@contoh.com"
                value={formData.email}
                onChange={(e) => setFormData((d) => ({ ...d, email: e.target.value }))}
              />
              <Input
                label="Telepon"
                type="tel"
                placeholder="08xx"
                value={formData.phone}
                onChange={(e) => setFormData((d) => ({ ...d, phone: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Jabatan</label>
                <Select value={formData.position} onValueChange={(v) => setFormData((d) => ({ ...d, position: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Role Sistem</label>
                <Select value={formData.role} onValueChange={(v) => setFormData((d) => ({ ...d, role: v as UserRole }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="finance">Keuangan</SelectItem>
                    <SelectItem value="caregiver">Pengasuh</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Tanggal Bergabung"
                type="date"
                value={formData.hireDate}
                onChange={(e) => setFormData((d) => ({ ...d, hireDate: e.target.value }))}
              />
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Status</label>
                <Select value={formData.status} onValueChange={(v) => setFormData((d) => ({ ...d, status: v as StaffStatus }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="cuti">Cuti</SelectItem>
                    <SelectItem value="nonaktif">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Kontak Darurat</p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Nama"
                  placeholder="Nama kontak darurat"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData((d) => ({ ...d, emergencyContactName: e.target.value }))}
                />
                <Input
                  label="Telepon"
                  type="tel"
                  placeholder="08xx"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => setFormData((d) => ({ ...d, emergencyContactPhone: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
            <Button onClick={saveStaff} isLoading={isSaving}>
              {editingStaff ? 'Simpan Perubahan' : 'Tambah Staf'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
