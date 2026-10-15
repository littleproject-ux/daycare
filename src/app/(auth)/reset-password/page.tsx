'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

const schema = z.object({
  email: z.string().email('Format email tidak valid'),
});

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await resetPassword(data.email);
      setSent(true);
    } catch (error) {
      toast({ title: 'Gagal', description: 'Gagal mengirim email reset. Periksa alamat email Anda.', variant: 'error' });
    }
  };

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="h-7 w-7 text-emerald-500" />
          </div>
        </div>
        <h2 className="text-lg font-bold text-stone-900">Email Terkirim!</h2>
        <p className="text-sm text-stone-500">
          Kami telah mengirim tautan reset password ke email Anda. Silakan cek kotak masuk.
        </p>
        <Link href="/login">
          <Button variant="outline" className="w-full mt-2">Kembali ke Halaman Masuk</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-stone-900">Lupa Password</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          Masukkan email Anda dan kami akan mengirimkan tautan reset.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          placeholder="nama@email.com"
          error={errors.email?.message}
          required
          {...register('email')}
        />
        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Kirim Tautan Reset
        </Button>
      </form>

      <p className="text-center text-sm text-stone-500">
        <Link href="/login" className="font-medium text-coral-600 hover:underline">
          Kembali ke Masuk
        </Link>
      </p>
    </div>
  );
}
