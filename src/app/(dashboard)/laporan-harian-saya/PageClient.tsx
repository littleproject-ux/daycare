'use client';

import React, { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, getDocs, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileText, Baby, Thermometer, Utensils, Moon, ChevronDown,
  ChevronUp, Image as ImageIcon,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

interface Child { id: string; fullName: string; nickName?: string; photoUrl?: string; }
interface DailyReport {
  id: string; childId: string; childName?: string; date: string;
  temperature?: number; mood?: string; mealNote?: string;
  sleepNote?: string; activities?: string; notes?: string;
  photoUrls?: string[]; createdAt: Timestamp;
}

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊', sad: '😢', energetic: '⚡', tired: '😴',
  sick: '🤒', cranky: '😤', calm: '😌', excited: '🤩',
};

function ReportCard({ report, childName }: { report: DailyReport; childName?: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-stone-800">
              {format(new Date(report.date), 'EEEE, d MMMM yyyy', { locale: localeId })}
            </p>
            {childName && <p className="text-xs text-stone-400">{childName}</p>}
          </div>
          {report.mood && <span className="text-xl">{MOOD_EMOJI[report.mood] || '😊'}</span>}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-stone-600">
          {report.temperature && (
            <div className="flex items-center gap-1.5 bg-red-50 rounded-lg px-2 py-1.5">
              <Thermometer className="h-3.5 w-3.5 text-red-400" />
              <span>Suhu: <strong>{report.temperature}°C</strong></span>
            </div>
          )}
          {report.mealNote && (
            <div className="flex items-center gap-1.5 bg-amber-50 rounded-lg px-2 py-1.5">
              <Utensils className="h-3.5 w-3.5 text-amber-400" />
              <span className="truncate">{report.mealNote}</span>
            </div>
          )}
          {report.sleepNote && (
            <div className="flex items-center gap-1.5 bg-indigo-50 rounded-lg px-2 py-1.5">
              <Moon className="h-3.5 w-3.5 text-indigo-400" />
              <span className="truncate">{report.sleepNote}</span>
            </div>
          )}
        </div>

        {(report.activities || report.notes || (report.photoUrls?.length ?? 0) > 0) && (
          <>
            <button
              onClick={() => setExpanded(e => !e)}
              className="w-full mt-3 flex items-center justify-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              {expanded ? <><ChevronUp className="h-3 w-3" />Sembunyikan</> : <><ChevronDown className="h-3 w-3" />Detail</>}
            </button>
            {expanded && (
              <div className="mt-3 space-y-2 text-sm text-stone-600 border-t border-stone-100 pt-3">
                {report.activities && (
                  <div>
                    <p className="text-xs font-medium text-stone-500 mb-1">Aktivitas</p>
                    <p className="text-xs">{report.activities}</p>
                  </div>
                )}
                {report.notes && (
                  <div>
                    <p className="text-xs font-medium text-stone-500 mb-1">Catatan Pengasuh</p>
                    <p className="text-xs italic">"{report.notes}"</p>
                  </div>
                )}
                {(report.photoUrls?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-medium text-stone-500 mb-1 flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" /> Foto
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {report.photoUrls!.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`foto ${i + 1}`} className="w-20 h-20 rounded-lg object-cover border border-stone-100 hover:opacity-80" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function LaporanHarianSayaPage() {
  const { user, organizationId } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('semua');
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!organizationId || !user) return;
    loadChildren();
  }, [organizationId, user]);

  useEffect(() => {
    if (children.length > 0) loadReports();
  }, [children, selectedChild]);

  async function loadChildren() {
    if (!organizationId || !user) return;
    try {
      const snap = await getDocs(query(
        collection(db, 'organizations', organizationId, 'children'),
        where('parentUserId', '==', user.uid),
        where('status', '==', 'aktif'),
        orderBy('fullName'),
      ));
      setChildren(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Child));
    } catch { toast({ title: 'Gagal memuat data', variant: 'error' }); }
  }

  async function loadReports() {
    if (!organizationId || !user) return;
    setIsLoading(true);
    try {
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const childIds = selectedChild === 'semua' ? children.map(c => c.id) : [selectedChild];

      const snaps = await Promise.all(childIds.map(cid =>
        getDocs(query(
          collection(db, 'organizations', organizationId, 'dailyReports'),
          where('childId', '==', cid),
          where('date', '>=', thirtyDaysAgo),
          orderBy('date', 'desc'),
        ))
      ));
      const all = snaps.flatMap(snap =>
        snap.docs.map(d => ({ id: d.id, ...d.data() }) as DailyReport)
      ).sort((a, b) => b.date.localeCompare(a.date));
      setReports(all);
    } catch { toast({ title: 'Gagal memuat laporan', variant: 'error' }); }
    finally { setIsLoading(false); }
  }

  const childMap = Object.fromEntries(children.map(c => [c.id, c.nickName || c.fullName]));

  return (
    <div>
      <Topbar title="Laporan Harian" subtitle="Perkembangan anak 30 hari terakhir" />
      <div className="p-6 space-y-4">
        {/* Child filter */}
        {children.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedChild('semua')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${selectedChild === 'semua' ? 'bg-coral-500 text-white' : 'bg-stone-100 text-stone-600'}`}
            >
              Semua Anak
            </button>
            {children.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedChild(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${selectedChild === c.id ? 'bg-coral-500 text-white' : 'bg-stone-100 text-stone-600'}`}
              >
                {c.nickName || c.fullName}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-stone-100 animate-pulse" />)}</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Belum ada laporan harian</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <ReportCard key={r.id} report={r} childName={children.length > 1 ? childMap[r.childId] : undefined} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
