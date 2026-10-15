'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  doc, getDoc, collection, query, where, getDocs, orderBy, limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, User, Phone, CalendarDays, AlertTriangle,
  Heart, BookOpen, Activity, FileText,
} from 'lucide-react';
import type { Child } from '@/types';
import { inisial, hitungUmur } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface DailyReportSummary {
  id: string;
  date: string;
  mood: string;
  notes: string;
}

const MOOD_EMOJI: Record<string, string> = {
  sangat_baik: '😄',
  baik: '🙂',
  biasa: '😐',
  rewel: '😢',
  sakit: '🤒',
};

const STATUS_CONFIG = {
  active: { label: 'Aktif', variant: 'success' as const },
  waitlist: { label: 'Antrian', variant: 'warning' as const },
  withdrawn: { label: 'Keluar', variant: 'secondary' as const },
  graduated: { label: 'Lulus', variant: 'info' as const },
};

export default function ChildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { organizationId } = useAuth();
  const [child, setChild] = useState<Child | null>(null);
  const [recentReports, setRecentReports] = useState<DailyReportSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id || !organizationId) return;
    loadData();
  }, [id, organizationId]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [childSnap, reportSnap] = await Promise.all([
        getDoc(doc(db, 'children', id)),
        getDocs(query(
          collection(db, 'dailyReports'),
          where('childId', '==', id),
          orderBy('date', 'desc'),
          limit(7)
        )),
      ]);

      if (!childSnap.exists() || childSnap.data()?.organizationId !== organizationId) {
        toast({ title: 'Data anak tidak ditemukan', variant: 'error' });
        router.push('/anak');
        return;
      }

      setChild({ id: childSnap.id, ...childSnap.data() } as Child);
      setRecentReports(reportSnap.docs.map(d => ({
        id: d.id,
        date: d.data().date as string,
        mood: d.data().mood as string,
        notes: d.data().notes as string,
      })));
    } catch {
      toast({ title: 'Gagal memuat data', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div>
        <Topbar title="Detail Anak" subtitle="" />
        <div className="p-6 space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-xl bg-stone-100 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!child) return null;

  const dob = child.dateOfBirth instanceof Object
    ? (child.dateOfBirth as any).toDate?.() ?? child.dateOfBirth
    : new Date(child.dateOfBirth as string);

  const statusConfig = STATUS_CONFIG[child.status] ?? { label: child.status, variant: 'default' as const };

  return (
    <div>
      <Topbar
        title={child.fullName}
        subtitle={hitungUmur(dob)}
      />

      <div className="p-6 space-y-5 max-w-2xl">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-stone-500" onClick={() => router.push('/anak')}>
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Button>

        {/* Profile card */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-coral-100 text-coral-500 font-bold text-xl">
                {inisial(child.fullName)}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-stone-900">{child.fullName}</h2>
                <p className="text-sm text-stone-500">
                  {child.gender === 'L' ? 'Laki-laki' : 'Perempuan'} · {hitungUmur(dob)}
                </p>
                <div className="mt-1.5">
                  <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-stone-600">
                <CalendarDays className="h-4 w-4 text-stone-400 shrink-0" />
                <div>
                  <p className="text-xs text-stone-400">Tanggal Lahir</p>
                  <p className="font-medium">{format(dob, 'd MMMM yyyy', { locale: localeId })}</p>
                </div>
              </div>
              {child.bloodType && (
                <div className="flex items-center gap-2 text-stone-600">
                  <Heart className="h-4 w-4 text-stone-400 shrink-0" />
                  <div>
                    <p className="text-xs text-stone-400">Golongan Darah</p>
                    <p className="font-medium">{child.bloodType}</p>
                  </div>
                </div>
              )}
              {child.createdAt && (
                <div className="flex items-center gap-2 text-stone-600">
                  <FileText className="h-4 w-4 text-stone-400 shrink-0" />
                  <div>
                    <p className="text-xs text-stone-400">Tanggal Daftar</p>
                    <p className="font-medium">
                      {format((child.createdAt as any).toDate(), 'd MMM yyyy', { locale: localeId })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Allergies & medical */}
        {(child.allergies?.length || child.medicalNotes) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Catatan Kesehatan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {child.allergies && child.allergies.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-stone-500 mb-1.5">Alergi</p>
                  <div className="flex flex-wrap gap-2">
                    {child.allergies.map(a => (
                      <span key={a} className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              {child.medicalNotes && (
                <div>
                  <p className="text-xs font-medium text-stone-500 mb-1">Catatan Medis</p>
                  <p className="text-sm text-stone-700">{child.medicalNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Emergency contact */}
        {(child.emergencyContactName || child.emergencyContactPhone) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-coral-500" />
                Kontak Darurat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {child.emergencyContactName && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-stone-400" />
                  <span className="text-stone-700">{child.emergencyContactName}</span>
                </div>
              )}
              {child.emergencyContactPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-stone-400" />
                  <a href={`tel:${child.emergencyContactPhone}`} className="text-coral-600 font-medium">
                    {child.emergencyContactPhone}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent daily reports */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-coral-500" />
              Laporan Harian Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentReports.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-4">Belum ada laporan harian</p>
            ) : (
              <div className="space-y-2">
                {recentReports.map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-stone-50">
                    <span className="text-xl">{MOOD_EMOJI[r.mood] ?? '😐'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-700">
                        {format(new Date(r.date), 'EEEE, d MMM yyyy', { locale: localeId })}
                      </p>
                      {r.notes && <p className="text-xs text-stone-400 truncate">{r.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
