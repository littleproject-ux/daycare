'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileText, Baby, Utensils, Moon, Droplets, Pill, ChevronDown, ChevronUp, Image as ImageIcon,
} from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { loadMyChildren, summarizeReport } from '@/lib/parent-data';
import type { Child, DailyReport } from '@/types';

function ReportCard({ report, childName }: { report: DailyReport; childName?: string }) {
  const [expanded, setExpanded] = useState(false);
  const s = summarizeReport(report);
  const hasDetail = !!(s.activities || s.notes || s.medication || s.photoUrls.length);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-stone-800">
              {format(parseISO(report.date), 'EEEE, d MMMM yyyy', { locale: localeId })}
            </p>
            {childName && <p className="text-xs text-stone-400">{childName}</p>}
          </div>
          {s.mood && (
            <span className="flex items-center gap-1 text-xs text-stone-500">
              <span className="text-xl">{s.mood.emoji}</span>{s.mood.label}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-600">
          {s.meals && (
            <div className="flex items-center gap-1.5 bg-amber-50 rounded-lg px-2 py-1.5 sm:col-span-2">
              <Utensils className="h-3.5 w-3.5 text-amber-400 shrink-0" /><span>{s.meals}</span>
            </div>
          )}
          {s.nap && (
            <div className="flex items-center gap-1.5 bg-indigo-50 rounded-lg px-2 py-1.5">
              <Moon className="h-3.5 w-3.5 text-indigo-400 shrink-0" /><span className="truncate">{s.nap}</span>
            </div>
          )}
          {s.hygiene && (
            <div className="flex items-center gap-1.5 bg-sky-50 rounded-lg px-2 py-1.5">
              <Droplets className="h-3.5 w-3.5 text-sky-400 shrink-0" /><span className="truncate">{s.hygiene}</span>
            </div>
          )}
        </div>

        {hasDetail && (
          <>
            <button
              onClick={() => setExpanded((e) => !e)}
              className="w-full mt-3 flex items-center justify-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              {expanded ? <><ChevronUp className="h-3 w-3" />Sembunyikan</> : <><ChevronDown className="h-3 w-3" />Detail</>}
            </button>
            {expanded && (
              <div className="mt-3 space-y-2 text-sm text-stone-600 border-t border-stone-100 pt-3">
                {s.activities && (
                  <div>
                    <p className="text-xs font-medium text-stone-500 mb-1">Aktivitas</p>
                    <p className="text-xs">{s.activities}</p>
                  </div>
                )}
                {s.medication && (
                  <div>
                    <p className="text-xs font-medium text-stone-500 mb-1 flex items-center gap-1"><Pill className="h-3 w-3" /> Obat</p>
                    <p className="text-xs">{s.medication}</p>
                  </div>
                )}
                {s.notes && (
                  <div>
                    <p className="text-xs font-medium text-stone-500 mb-1">Catatan Pengasuh</p>
                    <p className="text-xs italic">&ldquo;{s.notes}&rdquo;</p>
                  </div>
                )}
                {s.photoUrls.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-stone-500 mb-1 flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Foto</p>
                    <div className="flex gap-2 flex-wrap">
                      {s.photoUrls.map((url, i) => (
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
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, user]);

  async function loadAll() {
    if (!organizationId || !user) return;
    setIsLoading(true);
    try {
      const list = await loadMyChildren(organizationId, user.uid);
      setChildren(list);
      if (list.length === 0) { setReports([]); return; }
      // One query for all linked children; parentUserId filter is required by the security rules.
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const snap = await getDocs(query(
        collection(db, 'organizations', organizationId, 'dailyReports'),
        where('parentUserId', '==', user.uid),
        where('date', '>=', thirtyDaysAgo),
        orderBy('date', 'desc'),
      ));
      setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DailyReport));
    } catch {
      toast({ title: 'Gagal memuat laporan', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  const childMap = Object.fromEntries(children.map((c) => [c.id, c.preferredName || c.fullName]));
  const shown = selectedChild === 'semua' ? reports : reports.filter((r) => r.childId === selectedChild);

  return (
    <div>
      <Topbar title="Laporan Harian" subtitle="Perkembangan anak 30 hari terakhir" />
      <div className="p-4 sm:p-6 space-y-4">
        {children.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {[{ id: 'semua', name: 'Semua Anak' }, ...children.map((c) => ({ id: c.id, name: c.preferredName || c.fullName }))].map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedChild(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${selectedChild === c.id ? 'bg-coral-500 text-white' : 'bg-stone-100 text-stone-600'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-stone-100 animate-pulse" />)}</div>
        ) : children.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <Baby className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Data anak belum tersedia</p>
            <p className="text-xs mt-1">Hubungi admin daycare untuk menghubungkan akun Anda</p>
          </div>
        ) : shown.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Belum ada laporan harian</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((r) => (
              <ReportCard key={r.id} report={r} childName={children.length > 1 ? childMap[r.childId] : undefined} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
