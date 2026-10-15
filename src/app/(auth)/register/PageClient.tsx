'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

const registerSchema = z
  .object({
    displayName: z.string().min(2, 'Nama minimal 2 karakter').max(50),
    email: z.string().email('Format email tidak valid'),
    password: z.string().min(8, 'Password minimal 8 karakter'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Konfirmasi password tidak cocok',
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { registerWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerWithEmail(data.email, data.password, data.displayName);
      toast({
        title: 'Akun berhasil dibuat!',
        description: 'Silakan cek email Anda untuk verifikasi.',
        variant: 'success',
      });
      router.replace('/dashboard');
    } catch (error: any) {
      const msg =
        error.code === 'auth/email-already-in-use'
          ? 'Email sudah digunakan oleh akun lain.'
          : 'Gagal membuat akun. Coba lagi.';
      toast({ title: 'Gagal Mendaftar', description: msg, variant: 'error' });
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.replace('/dashboard');
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({ title: 'Gagal', description: 'Gagal masuk dengan Google.', variant: 'error' });
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-stone-900">Buat Akun Baru</h1>
        <p className="text-sm text-stone-500 mt-0.5">Daftarkan daycare Anda sekarang.</p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-3"
        onClick={handleGoogleSignIn}
        isLoading={isGoogleLoading}
      >
        {!isGoogleLoading && (
          <svg viewBox="0 0 24 24" className="h-5 w-5">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        )}
        Daftar dengan Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-stone-200" />
        </div>
        <div className="relative flex justify-center text-xs text-stone-400 uppercase">
          <span className="bg-white px-3">atau</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Nama Lengkap"
          placeholder="Nama Anda"
          error={errors.displayName?.message}
          required
          {...register('displayName')}
        />
        <Input
          label="Email"
          type="email"
          placeholder="nama@email.com"
          error={errors.email?.message}
          required
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          placeholder="Min. 8 karakter"
          error={errors.password?.message}
          required
          {...register('password')}
        />
        <Input
          label="Konfirmasi Password"
          type="password"
          placeholder="Ulangi password"
          error={errors.confirmPassword?.message}
          required
          {...register('confirmPassword')}
        />

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Buat Akun
        </Button>
      </form>

      <p className="text-center text-xs text-stone-400">
        Dengan mendaftar, Anda menyetujui syarat dan ketentuan layanan.
      </p>

      <p className="text-center text-sm text-stone-500">
        Sudah punya akun?{' '}
        <Link href="/login" className="font-medium text-coral-600 hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
