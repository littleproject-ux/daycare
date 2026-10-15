'use client';

import React, { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, getDocs,
  updateDoc, addDoc, deleteDoc, doc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ClipboardList, CheckCircle2, XCircle, Clock, User,
  Phone, CalendarDays, Plus, Pencil, Trash2, RotateCcw,
} from 'lucide-react';
import type { Child, ChildStatus } from '@/types';
import { inisial, hitungUmur, toDateSafe, formatTanggal } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const pendaftaranSchema = z.object({
  fullName: z.string().min(2, 'Nama minimal 2 karakter'),
  preferredName: z.string().optional(),
  dateOfBirth: z.string().min(1, 'Tanggal lahir wajib diisi'),
  gender: z.enum(['L', 'P'], { error: 'Pilih jenis kelamin' }),
  emergencyContactName: z.string().min(2, 'Nama orang tua/wali wajib diisi'),
  emergencyContactPhone: z.string().min(8, 'Nomor telepon tidak valid'),
  emergencyContactRelation: z.string().min(2, 'Hubungan wajib diisi'),
  address: z.string().optional(),
  allergies: z.string().optional(),
});
type PendaftaranFormData = z.infer<typeof pendaftaranSchema>;

const STATUS_FILTER_TABS = [
  { value: 'waitlist', label: 'Antrian' },
  { value: 'active', label: 'Disetujui' },
  { value: 'withdrawn', label: 'Ditolak/Keluar' },
  { value: 'graduated', label: 'Lulus' },
] as const;
type TabValue = typeof STATUS_FILTER_TABS[number]['value'];

export default function PendaftaranPage() {
  const { organizationId, can, hasRole } = useAuth();
  const canDelete = hasRole('owner', 'admin');
  const [editing, setEditing] = useState<Child | null>(null);
  const [confirm, confirmEl] = useConfirm();
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>('waitlist');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<PendaftaranFormData>({ resolver: zodResolver(pendaftaranSchema) });

  useEffect(() => {
    if (!organizationId) return;
    loadChildren();
  }, [organizationId]);

  async function loadChildren() {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'organizations', organizationId, 'children'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setChildren(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Child));
    } catch (e) {
      toast({ title: 'Gagal memuat data pendaftaran', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  async function updateStatus(childId: string, newStatus: ChildStatus) {
    if (!organizationId) return;
    setIsUpdating(childId);
    try {
      await updateDoc(doc(db, 'organizations', organizationId, 'children', childId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Status berhasil diperbarui', variant: 'success' });
      loadChildren();
    } catch (e) {
      toast({ title: 'Gagal memperbarui status', variant: 'error' });
    } finally {
      setIsUpdating(null);
    }
  }

  function openAdd() {
    setEditing(null);
    reset({ fullName: '', preferredName: '', dateOfBirth: '', gender: undefined as unknown as 'L', emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '', address: '', allergies: '' });
    setShowAddDialog(true);
  }
  function openEdit(child: Child) {
    setEditing(child);
    const dob = toDateSafe(child.dateOfBirth);
    reset({
      fullName: child.fullName ?? '',
      preferredName: child.preferredName ?? '',
      dateOfBirth: dob ? format(dob, 'yyyy-MM-dd') : '',
      gender: child.gender,
      emergencyContactName: child.emergencyContactName ?? '',
      emergencyContactPhone: child.emergencyContactPhone ?? '',
      emergencyContactRelation: child.emergencyContactRelation ?? '',
      address: child.address ?? '',
      allergies: Array.isArray(child.allergies) ? child.allergies.join(', ') : '',
    });
    setShowAddDialog(true);
  }
  function closeDialog() { setShowAddDialog(false); setEditing(null); reset(); }

  async function deleteRegistration(child: Child) {
    if (!organizationId) return;
    if (!(await confirm({ title: 'Hapus pendaftaran?', description: `Data ${child.fullName} akan dihapus permanen.` }))) return;
    try {
      await deleteDoc(doc(db, 'organizations', organizationId, 'children', child.id));
      toast({ title: 'Pendaftaran dihapus', variant: 'success' });
      loadChildren();
    } catch { toast({ title: 'Gagal menghapus pendaftaran', variant: 'error' }); }
  }

  async function onSubmit(data: PendaftaranFormData) {
    if (!organizationId) return;
    if (editing) {
      try {
        await updateDoc(doc(db, 'organizations', organizationId, 'children', editing.id), {
          fullName: data.fullName,
          preferredName: data.preferredName || null,
          dateOfBirth: Timestamp.fromDate(parseISO(data.dateOfBirth)),
          gender: data.gender,
          address: data.address || null,
          allergies: data.allergies ? data.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          emergencyContactRelation: data.emergencyContactRelation,
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Pendaftaran diperbarui', variant: 'success' });
        closeDialog();
        loadChildren();
      } catch {
        toast({ title: 'Gagal memperbarui pendaftaran', variant: 'error' });
      }
      return;
    }
    try {
      await addDoc(collection(db, 'organizations', organizationId, 'children'), {
        organizationId,
        branchId: '',
        roomId: '',
        fullName: data.fullName,
        preferredName: data.preferredName || null,
        dateOfBirth: Timestamp.fromDate(parseISO(data.dateOfBirth)), // local date
        parentUserId: null,
        gender: data.gender,
        address: data.address || null,
        status: 'waitlist' as ChildStatus,
        bloodType: null,
        allergies: data.allergies ? data.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        medicalNotes: null,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone,
        emergencyContactRelation: data.emergencyContactRelation,
        authorizedPickupContacts: [],
        photoUrl: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Pendaftaran berhasil ditambahkan', variant: 'success' });
      closeDialog();
      loadChildren();
    } catch {
      toast({ title: 'Gagal menyimpan pendaftaran', variant: 'error' });
    }
  }

  const displayed = children.filter((c) => c.status === activeTab);
  const waitlistCount = children.filter((c) => c.status === 'waitlist').length;

  return (
    <div>
      <Topbar title="Pendaftaran" subtitle="Kelola antrian dan persetujuan pendaftaran anak" />

      <div className="p-4 sm:p-6 space-y-5">
        {/* Header action */}
        {can('create') && (
          <div className="flex justify-end">
            <Button onClick={openAdd} className="gap-2">
              <Plus className="h-4 w-4" /> Tambah Pendaftaran Baru
            </Button>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Menunggu Persetujuan', value: children.filter(c => c.status === 'waitlist').length, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Aktif', value: children.filter(c => c.status === 'active').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Tidak Aktif', value: children.filter(c => c.status === 'withdrawn' || c.status === 'graduated').length, color: 'text-stone-500', bg: 'bg-stone-50' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-3 ${s.bg}`}>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-stone-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
          {STATUS_FILTER_TABS.map((tab) => {
            const count = children.filter((c) => c.status === tab.value).length;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 whitespace-nowrap ${
                  activeTab === tab.value ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
                    activeTab === tab.value ? 'bg-coral-100 text-coral-600' : 'bg-stone-200 text-stone-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-stone-100 animate-pulse" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              {activeTab === 'waitlist' ? 'Tidak ada antrian pendaftaran' :
               activeTab === 'active' ? 'Tidak ada anak aktif' : 'Tidak ada data'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map((child) => (
              <Card key={child.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-coral-50 text-coral-500 font-bold text-sm">
                      {inisial(child.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-stone-900">{child.fullName}</p>
                          <p className="text-xs text-stone-400 mt-0.5">
                            {toDateSafe(child.dateOfBirth) ? hitungUmur(toDateSafe(child.dateOfBirth)!) : '-'}
                            {' · '}
                            {child.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                          </p>
                        </div>
                        {child.status === 'waitlist' && (
                          <Badge variant="warning" className="gap-1 shrink-0">
                            <Clock className="h-3 w-3" /> Menunggu
                          </Badge>
                        )}
                        {child.status === 'active' && (
                          <Badge variant="success" className="gap-1 shrink-0">
                            <CheckCircle2 className="h-3 w-3" /> Aktif
                          </Badge>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-500">
                        {child.emergencyContactName && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {child.emergencyContactName}
                          </span>
                        )}
                        {child.emergencyContactPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {child.emergencyContactPhone}
                          </span>
                        )}
                        {child.createdAt && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            Daftar: {formatTanggal(child.createdAt, 'd MMM yyyy')}
                          </span>
                        )}
                      </div>

                      {child.allergies && child.allergies.length > 0 && (
                        <p className="mt-1 text-xs text-amber-600">⚠️ Alergi: {child.allergies.join(', ')}</p>
                      )}
                    </div>
                  </div>

                  {can('edit') && (
                    <div className="mt-3 pt-3 border-t border-stone-50 flex flex-wrap gap-2 justify-end">
                      <Button size="sm" variant="outline" className="text-xs gap-1 sm:mr-auto" onClick={() => openEdit(child)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      {canDelete && (
                        <Button size="sm" variant="outline" className="text-xs gap-1 text-red-600 hover:bg-red-50" onClick={() => deleteRegistration(child)} aria-label="Hapus pendaftaran">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {activeTab !== 'waitlist' && (
                        <Button size="sm" variant="outline" className="text-xs gap-1" isLoading={isUpdating === child.id}
                          onClick={() => updateStatus(child.id, 'waitlist')}>
                          <RotateCcw className="h-3.5 w-3.5" /> Kembalikan ke Antrian
                        </Button>
                      )}
                    </div>
                  )}
                  {can('edit') && activeTab === 'waitlist' && (
                    <div className="mt-2 flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1"
                        isLoading={isUpdating === child.id}
                        onClick={() => updateStatus(child.id, 'withdrawn')}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Tolak
                      </Button>
                      <Button
                        size="sm"
                        variant="success"
                        className="text-xs gap-1"
                        isLoading={isUpdating === child.id}
                        onClick={() => updateStatus(child.id, 'active')}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Setujui
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Registration Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit Pendaftaran: ${editing.fullName}` : 'Tambah Pendaftaran Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input label="Nama Lengkap Anak" required placeholder="Sesuai akta lahir"
              error={errors.fullName?.message} {...register('fullName')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nama Panggilan" placeholder="Opsional" {...register('preferredName')} />
              <Input label="Tanggal Lahir" type="date" required
                error={errors.dateOfBirth?.message} {...register('dateOfBirth')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-stone-700">Jenis Kelamin <span className="text-red-500">*</span></label>
              <Select value={watch('gender')} onValueChange={(v) => setValue('gender', v as 'L' | 'P')}>
                <SelectTrigger error={errors.gender?.message}><SelectValue placeholder="Pilih..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">Laki-laki</SelectItem>
                  <SelectItem value="P">Perempuan</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && <p className="text-xs text-red-500">{errors.gender.message}</p>}
            </div>
            <Input label="Alamat" placeholder="Alamat rumah (opsional)" {...register('address')} />
            <Input label="Alergi" placeholder="pisah koma, contoh: kacang, susu" {...register('allergies')} />
            <div className="border-t pt-3">
              <p className="text-sm font-semibold text-stone-700 mb-3">Data Orang Tua / Wali</p>
              <div className="space-y-3">
                <Input label="Nama Orang Tua/Wali" required placeholder="Nama lengkap"
                  error={errors.emergencyContactName?.message} {...register('emergencyContactName')} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Nomor HP" type="tel" required placeholder="08xxxxxxxxxx"
                    error={errors.emergencyContactPhone?.message} {...register('emergencyContactPhone')} />
                  <Input label="Hubungan" required placeholder="Ibu / Ayah / Wali"
                    error={errors.emergencyContactRelation?.message} {...register('emergencyContactRelation')} />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Batal</Button>
              <Button type="submit" isLoading={isSubmitting}>{editing ? 'Simpan Perubahan' : 'Simpan Pendaftaran'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {confirmEl}
    </div>
  );
}
