'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2,
  MapPin,
  Phone,
  Globe,
  Clock,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { doc, setDoc, collection, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

const step1Schema = z.object({
  name: z.string().min(3, 'Nama daycare minimal 3 karakter').max(100),
  address: z.string().min(10, 'Alamat terlalu singkat').max(500),
  phone: z.string().min(8, 'Nomor telepon tidak valid').max(20),
  email: z.string().email('Format email tidak valid'),
  website: z.string().url('URL tidak valid').optional().or(z.literal('')),
});

const step2Schema = z.object({
  openTime: z.string().min(1, 'Wajib diisi'),
  closeTime: z.string().min(1, 'Wajib diisi'),
  invoicePrefix: z.string().min(2, 'Minimal 2 karakter').max(10).regex(/^[A-Z0-9]+$/, 'Gunakan huruf kapital dan angka saja'),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

const WORK_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user, userProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const form1 = useForm<Step1Data>({ resolver: zodResolver(step1Schema) });
  const form2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { openTime: '07:00', closeTime: '17:00', invoicePrefix: 'INV' },
  });

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const onStep1 = async (data: Step1Data) => {
    setStep1Data(data);
    setStep(2);
  };

  const onStep2 = async (data: Step2Data) => {
    if (!user || !step1Data) return;
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const orgRef = doc(collection(db, 'organizations'));
      const membershipRef = doc(collection(db, 'memberships'));

      // Create organization
      batch.set(orgRef, {
        ...step1Data,
        timezone: 'Asia/Jakarta',
        currency: 'IDR',
        operatingHours: { open: data.openTime, close: data.closeTime },
        workDays: selectedDays,
        invoicePrefix: data.invoicePrefix,
        invoiceNextNumber: 1,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create owner membership
      batch.set(membershipRef, {
        userId: user.uid,
        organizationId: orgRef.id,
        role: 'owner',
        branchIds: [],
        isActive: true,
        joinedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      setDone(true);
      toast({
        title: 'Daycare berhasil dibuat!',
        description: `${step1Data.name} siap digunakan.`,
        variant: 'success',
      });

      setTimeout(() => {
        window.location.reload(); // Reload to pick up new membership
      }, 1500);
    } catch (error) {
      console.error(error);
      toast({ title: 'Gagal', description: 'Gagal membuat organisasi. Coba lagi.', variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#fffcfa]">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-stone-900">Selamat!</h2>
          <p className="text-stone-500">Daycare Anda telah berhasil dibuat. Memuat dashboard...</p>
          <div className="flex justify-center">
            <div className="h-1 w-32 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-coral-400 rounded-full animate-pulse" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-[#fffcfa] to-amber-50">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-coral-400 to-coral-600 text-white text-xl font-bold shadow-lg mb-4">
            DC
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Selamat Datang!</h1>
          <p className="text-stone-500 text-sm mt-1">
            Halo, {userProfile?.displayName}! Ayo setup daycare Anda.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <React.Fragment key={s}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                s < step ? 'bg-coral-500 text-white' :
                s === step ? 'bg-coral-100 text-coral-600 ring-2 ring-coral-300' :
                'bg-stone-100 text-stone-400'
              }`}>
                {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 2 && <div className={`flex-1 h-1 rounded-full ${s < step ? 'bg-coral-400' : 'bg-stone-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          {/* Step 1: Informasi Dasar */}
          {step === 1 && (
            <form onSubmit={form1.handleSubmit(onStep1)} className="space-y-5" noValidate>
              <div>
                <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-coral-500" />
                  Informasi Daycare
                </h2>
                <p className="text-sm text-stone-500 mt-0.5">Lengkapi profil daycare Anda.</p>
              </div>

              <Input
                label="Nama Daycare"
                placeholder="contoh: Daycare Pelangi"
                required
                error={form1.formState.errors.name?.message}
                {...form1.register('name')}
              />
              <Input
                label="Alamat Lengkap"
                placeholder="Jl. ... No. ..., Kelurahan, Kecamatan, Kota"
                required
                error={form1.formState.errors.address?.message}
                {...form1.register('address')}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Nomor Telepon"
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  required
                  error={form1.formState.errors.phone?.message}
                  {...form1.register('phone')}
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="daycare@email.com"
                  required
                  error={form1.formState.errors.email?.message}
                  {...form1.register('email')}
                />
              </div>
              <Input
                label="Website (opsional)"
                type="url"
                placeholder="https://daycareaanda.com"
                error={form1.formState.errors.website?.message}
                {...form1.register('website')}
              />

              <Button type="submit" className="w-full gap-2">
                Lanjut <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}

          {/* Step 2: Jadwal Operasional */}
          {step === 2 && (
            <form onSubmit={form2.handleSubmit(onStep2)} className="space-y-5" noValidate>
              <div>
                <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-coral-500" />
                  Jadwal Operasional
                </h2>
                <p className="text-sm text-stone-500 mt-0.5">Atur jam operasional dan hari kerja.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Jam Buka"
                  type="time"
                  required
                  error={form2.formState.errors.openTime?.message}
                  {...form2.register('openTime')}
                />
                <Input
                  label="Jam Tutup"
                  type="time"
                  required
                  error={form2.formState.errors.closeTime?.message}
                  {...form2.register('closeTime')}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-stone-700 block mb-2">
                  Hari Operasional
                </label>
                <div className="flex flex-wrap gap-2">
                  {WORK_DAYS.map((day, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                        selectedDays.includes(i)
                          ? 'bg-coral-500 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Awalan Nomor Invoice"
                placeholder="INV"
                hint="Contoh: INV → INV/2024/01/0001"
                required
                error={form2.formState.errors.invoicePrefix?.message}
                {...form2.register('invoicePrefix')}
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft className="h-4 w-4" /> Kembali
                </Button>
                <Button type="submit" className="flex-1 gap-2" isLoading={isSubmitting}>
                  Selesai <CheckCircle2 className="h-4 w-4" />
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
