'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, User, Phone, CalendarDays, AlertTriangle, Heart, BookOpen, FileText, MapPin, Home,
} from 'lucide-react';
import type { Child, DailyReport } from '@/types';
import { inisial, hitungUmur, formatTanggal, toDateSafe } from '@/lib/utils';
import { summarizeReport } from '@/lib/parent-data';
import { toast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const STATUS_CONFIG = {
  active: { label: 'Aktif', variant: 'success' as const },
  waitlist: { label: 'Antrian', variant: 'warning' as const },
  withdrawn: { label: 'Keluar', variant: 'secondary' as const },
  graduated: { label: 'Lulus', variant: 'info' as const },
};

export default function ChildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { organizationId, role, user } = useAuth();
  const [child, setChild] = useState<Child | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [recentReports, setRecentReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id || !organizationId || !user) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, organizationId, user]);

  async function loadData() {
    if (!organizationId || !id || !user) return;
    setIsLoading(true);
    try {
      const childSnap = await getDoc(doc(db, 'organizations', organizationId, 'children', id));
      if (!childSnap.exists()) {
        toast({ title: 'Data anak tidak ditemukan', variant: 'error' });
        router.push('/anak');
        return;
      }
      const c = { id: childSnap.id, ...childSnap.data() } as Child;
      setChild(c);

      // Equality-only filters (no composite index). Parents must also filter on their uid (security rules).
      const reportQ = role === 'parent'
        ? query(collection(db, 'organizations', organizationId, 'dailyReports'), where('parentUserId', '==', user.uid), where('childId', '==', id))
        : query(collection(db, 'organizations', organizationId, 'dailyReports'), where('childId', '==', id));
      const [reportSnap, roomSnap] = await Promise.all([
        getDocs(reportQ).catch(() => null),
        c.roomId ? getDoc(doc(db, 'organizations', organizationId, 'rooms', c.roomId)).catch(() => null) : null,
      ]);
      setRecentReports((reportSnap?.docs ?? [])
        .map((d) => ({ id: d.id, ...d.data() }) as DailyReport)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 7));
      setRoomName(roomSnap?.exists() ? (roomSnap.data().name as string) : null);
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
        <div className="p-4 sm:p-6 space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-xl bg-stone-100 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!child) return null;

  const dob = toDateSafe(child.dateOfBirth);
  const statusConfig = STATUS_CONFIG[child.status] ?? { label: child.status, variant: 'default' as const };

  return (
    <div>
      <Topbar title={child.fullName} subtitle={dob ? hitungUmur(dob) : ''} />

      <div className="p-4 sm:p-6 space-y-5 max-w-2xl">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-stone-500" onClick={() => router.push('/anak')}>
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Button>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-coral-100 text-coral-500 font-bold text-xl overflow-hidden">
                {child.photoUrl ? <img src={child.photoUrl} alt="" className="h-full w-full object-cover" /> : inisial(child.fullName)}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-stone-900">{child.fullName}</h2>
                {child.preferredName && <p className="text-xs text-stone-400">Panggilan: {child.preferredName}</p>}
                <p className="text-sm text-stone-500">
                  {child.gender === 'L' ? 'Laki-laki' : 'Perempuan'}{dob ? ` · ${hitungUmur(dob)}` : ''}
                </p>
                <div className="mt-1.5"><Badge variant={statusConfig.variant}>{statusConfig.label}</Badge></div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Info icon={<CalendarDays className="h-4 w-4" />} label="Tanggal Lahir" value={dob ? formatTanggal(dob) : '-'} />
              {child.bloodType && <Info icon={<Heart className="h-4 w-4" />} label="Golongan Darah" value={child.bloodType} />}
              {roomName && <Info icon={<MapPin className="h-4 w-4" />} label="Ruangan" value={roomName} />}
              {child.createdAt && <Info icon={<FileText className="h-4 w-4" />} label="Tanggal Daftar" value={formatTanggal(child.createdAt, 'd MMM yyyy')} />}
              {child.address && <Info icon={<Home className="h-4 w-4" />} label="Alamat" value={child.address} />}
            </div>
          </CardContent>
        </Card>

        {(child.allergies?.length || child.medicalNotes) ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Catatan Kesehatan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {child.allergies && child.allergies.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-stone-500 mb-1.5">Alergi</p>
                  <div className="flex flex-wrap gap-2">
                    {child.allergies.map((a) => (
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
        ) : null}

        {(child.emergencyContactName || child.emergencyContactPhone) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-coral-500" /> Kontak Darurat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {child.emergencyContactName && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-stone-400" />
                  <span className="text-stone-700">
                    {child.emergencyContactName}{child.emergencyContactRelation ? ` (${child.emergencyContactRelation})` : ''}
                  </span>
                </div>
              )}
              {child.emergencyContactPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-stone-400" />
                  <a href={`tel:${child.emergencyContactPhone}`} className="text-coral-600 font-medium">{child.emergencyContactPhone}</a>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-coral-500" /> Laporan Harian Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentReports.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-4">Belum ada laporan harian</p>
            ) : (
              <div className="space-y-2">
                {recentReports.map((r) => {
                  const s = summarizeReport(r);
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-stone-50">
                      <span className="text-xl">{s.mood?.emoji ?? '😐'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-700">
                          {format(parseISO(r.date), 'EEEE, d MMM yyyy', { locale: localeId })}
                        </p>
                        {(s.notes || s.activities) && <p className="text-xs text-stone-400 truncate">{s.notes || s.activities}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-stone-600">
      <span className="text-stone-400 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-stone-400">{label}</p>
        <p className="font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
