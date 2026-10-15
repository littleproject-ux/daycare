'use client';

import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Baby,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Child, ChildStatus } from '@/types';
import { formatTanggal, formatTanggalPendek, hitungUmur, inisial } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

const childSchema = z.object({
  fullName: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  preferredName: z.string().max(50).optional(),
  dateOfBirth: z.string().min(1, 'Tanggal lahir wajib diisi'),
  gender: z.enum(['L', 'P'], { error: 'Pilih jenis kelamin' }),
  address: z.string().max(500).optional(),
  bloodType: z.enum(['A', 'B', 'AB', 'O', '']).optional(),
  allergies: z.string().optional(),
  medicalNotes: z.string().max(1000).optional(),
  emergencyContactName: z.string().min(2, 'Nama kontak darurat wajib diisi'),
  emergencyContactPhone: z.string().min(8, 'Nomor telepon tidak valid'),
  emergencyContactRelation: z.string().min(2, 'Hubungan wajib diisi'),
});

type ChildFormData = z.infer<typeof childSchema>;

const STATUS_LABELS: Record<ChildStatus, string> = {
  active: 'Aktif',
  waitlist: 'Daftar Tunggu',
  withdrawn: 'Keluar',
  graduated: 'Lulus',
};

const STATUS_VARIANTS: Record<ChildStatus, 'success' | 'warning' | 'secondary' | 'info'> = {
  active: 'success',
  waitlist: 'warning',
  withdrawn: 'secondary',
  graduated: 'info',
};

export default function AnakPage() {
  const { organizationId, can } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ChildStatus | 'semua'>('semua');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChildFormData>({ resolver: zodResolver(childSchema) });

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
        orderBy('fullName')
      );
      const snap = await getDocs(q);
      setChildren(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Child));
    } catch (e) {
      console.error(e);
      toast({ title: 'Gagal memuat data anak', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  function openEdit(child: Child, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditingChild(child);
    // Pre-fill form
    reset({
      fullName: child.fullName,
      preferredName: child.preferredName ?? '',
      dateOfBirth: child.dateOfBirth
        ? (child.dateOfBirth instanceof Object
            ? (child.dateOfBirth as any).toDate?.().toISOString().slice(0, 10)
            : String(child.dateOfBirth).slice(0, 10))
        : '',
      gender: child.gender as 'L' | 'P',
      address: child.address ?? '',
      bloodType: (child.bloodType ?? '') as any,
      allergies: Array.isArray(child.allergies) ? child.allergies.join(', ') : '',
      medicalNotes: child.medicalNotes ?? '',
      emergencyContactName: child.emergencyContactName ?? '',
      emergencyContactPhone: child.emergencyContactPhone ?? '',
      emergencyContactRelation: child.emergencyContactRelation ?? '',
    });
    setShowAddDialog(true);
  }

  function closeDialog() {
    setShowAddDialog(false);
    setEditingChild(null);
    reset();
  }

  const onSubmit = async (data: ChildFormData) => {
    if (!organizationId) return;
    try {
      const dob = Timestamp.fromDate(new Date(data.dateOfBirth));
      const payload = {
        fullName: data.fullName,
        preferredName: data.preferredName || null,
        dateOfBirth: dob,
        gender: data.gender,
        address: data.address || null,
        bloodType: data.bloodType || null,
        allergies: data.allergies ? data.allergies.split(',').map((s) => s.trim()) : [],
        medicalNotes: data.medicalNotes || null,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone,
        emergencyContactRelation: data.emergencyContactRelation,
        updatedAt: serverTimestamp(),
      };

      if (editingChild) {
        await updateDoc(doc(db, 'organizations', organizationId, 'children', editingChild.id), payload);
        toast({ title: 'Data anak berhasil diperbarui', variant: 'success' });
      } else {
        await addDoc(collection(db, 'organizations', organizationId, 'children'), {
          ...payload,
          organizationId,
          branchId: '',
          roomId: '',
          status: 'active' as ChildStatus,
          authorizedPickupContacts: [],
          photoUrl: null,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Anak berhasil ditambahkan', variant: 'success' });
      }
      closeDialog();
      loadChildren();
    } catch (e) {
      console.error(e);
      toast({ title: editingChild ? 'Gagal memperbarui data' : 'Gagal menambahkan anak', variant: 'error' });
    }
  };

  const filtered = children.filter((c) => {
    const matchSearch =
      !search ||
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.preferredName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'semua' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const countByStatus = (status: ChildStatus) => children.filter((c) => c.status === status).length;

  // Generate a consistent color gradient per child name
  const avatarGradients = [
    'from-coral-400 to-rose-500',
    'from-sky-400 to-blue-500',
    'from-emerald-400 to-teal-500',
    'from-violet-400 to-purple-500',
    'from-amber-400 to-orange-500',
    'from-pink-400 to-fuchsia-500',
    'from-mint-400 to-emerald-500',
    'from-peach-400 to-coral-500',
  ];
  const getGradient = (name: string) => avatarGradients[name.charCodeAt(0) % avatarGradients.length];

  return (
    <div>
      <Topbar title="Data Anak" subtitle="Kelola profil dan informasi anak" />

      <div className="p-6 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { status: 'active', gradient: 'from-emerald-500 to-teal-600', emoji: '✅' },
            { status: 'waitlist', gradient: 'from-amber-500 to-orange-500', emoji: '⏳' },
            { status: 'withdrawn', gradient: 'from-stone-400 to-stone-500', emoji: '👋' },
            { status: 'graduated', gradient: 'from-sky-500 to-blue-600', emoji: '🎓' },
          ] as { status: ChildStatus; gradient: string; emoji: string }[]).map(({ status: s, gradient, emoji }) => (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? 'semua' : s)}
              className={`relative overflow-hidden p-4 rounded-2xl text-left transition-all ${
                filterStatus === s ? 'ring-2 ring-coral-400 ring-offset-1 shadow-md' : 'hover:shadow-sm'
              } bg-gradient-to-br ${gradient}`}
            >
              <div className="absolute -top-3 -right-3 h-14 w-14 rounded-full bg-white/10" />
              <p className="text-3xl font-bold text-white">{countByStatus(s)}</p>
              <p className="text-xs text-white/75 mt-0.5">{STATUS_LABELS[s]}</p>
              <span className="absolute bottom-2 right-3 text-xl opacity-60">{emoji}</span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Cari nama anak..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 h-10 rounded-xl border border-stone-200 text-sm text-stone-900 placeholder:text-stone-400 focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-400/20 bg-white"
            />
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Status</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="waitlist">Daftar Tunggu</SelectItem>
              <SelectItem value="withdrawn">Keluar</SelectItem>
              <SelectItem value="graduated">Lulus</SelectItem>
            </SelectContent>
          </Select>
          {can('create') && (
            <Button onClick={() => setShowAddDialog(true)} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Tambah Anak
            </Button>
          )}
        </div>

        {/* Children list */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-stone-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
              <Baby className="h-8 w-8 text-stone-300" />
            </div>
            <h3 className="text-base font-medium text-stone-600">
              {search ? 'Tidak ada anak yang cocok' : 'Belum ada data anak'}
            </h3>
            <p className="text-sm text-stone-400 mt-1 mb-4">
              {search ? 'Coba kata kunci lain.' : 'Mulai tambahkan data anak.'}
            </p>
            {!search && can('create') && (
              <Button onClick={() => setShowAddDialog(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Tambah Anak Pertama
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((child) => (
              <Link key={child.id} href={`/anak/${child.id}`}>
                <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer overflow-hidden">
                  {/* Colored top strip */}
                  <div className={`h-1.5 bg-gradient-to-r ${getGradient(child.fullName)}`} />
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getGradient(child.fullName)} text-white font-bold text-sm shadow-sm`}>
                        {child.photoUrl ? (
                          <img src={child.photoUrl} alt={child.fullName} className="h-full w-full object-cover rounded-xl" />
                        ) : (
                          inisial(child.fullName)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-stone-900 truncate">{child.fullName}</p>
                            {child.preferredName && (
                              <p className="text-xs text-stone-400">"{child.preferredName}"</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant={STATUS_VARIANTS[child.status]}>
                              {STATUS_LABELS[child.status]}
                            </Badge>
                            {can('edit') && (
                              <button
                                onClick={(e) => openEdit(child, e)}
                                className="ml-1 p-1.5 rounded-lg text-stone-400 hover:text-coral-500 hover:bg-coral-50 transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {child.dateOfBirth ? hitungUmur(child.dateOfBirth) : '-'}
                          {child.dateOfBirth && (
                            <span className="text-stone-400 ml-1">
                              ({formatTanggalPendek(child.dateOfBirth)})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{child.emergencyContactName} ({child.emergencyContactRelation})</span>
                      </div>
                      {child.allergies && child.allergies.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-amber-600">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">Alergi: {child.allergies.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Child Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingChild ? `Edit: ${editingChild.fullName}` : 'Tambah Data Anak'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Input
                  label="Nama Lengkap"
                  required
                  placeholder="Nama sesuai akta lahir"
                  error={errors.fullName?.message}
                  {...register('fullName')}
                />
              </div>
              <Input
                label="Nama Panggilan"
                placeholder="Nama sehari-hari"
                error={errors.preferredName?.message}
                {...register('preferredName')}
              />
              <Input
                label="Tanggal Lahir"
                type="date"
                required
                error={errors.dateOfBirth?.message}
                {...register('dateOfBirth')}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-stone-700">
                  Jenis Kelamin <span className="text-red-500">*</span>
                </label>
                <Select
                  value={watch('gender')}
                  onValueChange={(v) => setValue('gender', v as 'L' | 'P')}
                  required
                >
                  <SelectTrigger error={errors.gender?.message}>
                    <SelectValue placeholder="Pilih..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-xs text-red-500">{errors.gender.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-stone-700">Golongan Darah</label>
                <Select value={watch('bloodType') ?? ''} onValueChange={(v) => setValue('bloodType', v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tidak diketahui</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="AB">AB</SelectItem>
                    <SelectItem value="O">O</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Input
              label="Alamat"
              placeholder="Alamat lengkap"
              error={errors.address?.message}
              {...register('address')}
            />

            <Input
              label="Alergi"
              placeholder="pisah dengan koma, contoh: kacang, susu sapi"
              hint="Kosongkan jika tidak ada alergi"
              error={errors.allergies?.message}
              {...register('allergies')}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-stone-700">Catatan Medis</label>
              <textarea
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm placeholder:text-stone-400 focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-400/20 resize-none"
                rows={2}
                placeholder="Kondisi kesehatan khusus, obat rutin, dll."
                {...register('medicalNotes')}
              />
            </div>

            <div className="border-t border-stone-100 pt-4">
              <p className="text-sm font-semibold text-stone-700 mb-3">Kontak Darurat</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Nama"
                  required
                  placeholder="Nama lengkap"
                  error={errors.emergencyContactName?.message}
                  {...register('emergencyContactName')}
                />
                <Input
                  label="Nomor Telepon"
                  type="tel"
                  required
                  placeholder="08xxxxxxxxxx"
                  error={errors.emergencyContactPhone?.message}
                  {...register('emergencyContactPhone')}
                />
                <Input
                  label="Hubungan"
                  required
                  placeholder="contoh: Ibu, Ayah, Nenek"
                  error={errors.emergencyContactRelation?.message}
                  {...register('emergencyContactRelation')}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Batal
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {editingChild ? 'Simpan Perubahan' : 'Simpan Data Anak'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
