'use client';

// Global search — target of the search box in the topbar (/cari?q=...)
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Search, Baby, Users, Receipt, FolderOpen, Package, LayoutGrid, ChevronRight } from 'lucide-react';
import { formatRupiah, inisial } from '@/lib/utils';

interface Hit { key: string; title: string; sub?: string; href: string }
interface Group { id: string; label: string; icon: React.ReactNode; hits: Hit[] }

const STAFF_MENUS = [
  ['Dashboard', '/dashboard'], ['Data Anak', '/anak'], ['Pendaftaran', '/pendaftaran'], ['Data Staf', '/staf'], ['Ruangan', '/ruangan'],
  ['Kehadiran', '/kehadiran'], ['Laporan Harian', '/laporan-harian'], ['Jadwal & Acara', '/jadwal'], ['Tugas', '/tugas'],
  ['Kesehatan', '/kesehatan'], ['Dokumen', '/dokumen'], ['Keuangan', '/keuangan'], ['Inventaris', '/inventaris'],
  ['Komunikasi', '/komunikasi'], ['Laporan', '/laporan'], ['Notifikasi', '/notifikasi'], ['Pengaturan', '/pengaturan'], ['Panduan', '/panduan'],
];
const PARENT_MENUS = [
  ['Beranda', '/dashboard'], ['Anak Saya', '/anak'], ['Laporan Harian', '/laporan-harian-saya'], ['Kehadiran', '/kehadiran-saya'],
  ['Tagihan', '/tagihan-saya'], ['Pengumuman', '/komunikasi'], ['Jadwal', '/jadwal'], ['Notifikasi', '/notifikasi'], ['Panduan', '/panduan'],
];

type Row = Record<string, unknown> & { id: string };

export default function CariPageClient() {
  const params = useSearchParams();
  const router = useRouter();
  const { organizationId, user, role } = useAuth();
  const q = (params.get('q') ?? '').trim();
  const [input, setInput] = useState(q);
  const [data, setData] = useState<Record<string, Row[]> | null>(null);
  const isParent = role === 'parent';

  // keep the box in sync when the URL changes (render-phase sync, no effect)
  const [lastQ, setLastQ] = useState(q);
  if (q !== lastQ) { setLastQ(q); setInput(q); }

  useEffect(() => {
    if (!organizationId || !user || !role) return;
    let cancelled = false;
    const org = (c: string) => collection(db, 'organizations', organizationId, c);
    const load = (c: string) => getDocs(org(c)).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }) as Row));
    // Each collection independently: a role without read access just gets no results for it
    const jobs: Record<string, Promise<Row[]>> = isParent
      ? {
          children: getDocs(query(org('children'), where('parentUserId', '==', user.uid))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }) as Row)),
          invoices: getDocs(query(org('invoices'), where('parentUserId', '==', user.uid))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }) as Row)),
        }
      : { children: load('children'), staff: load('staff'), invoices: load('invoices'), documents: load('documents'), inventory: load('inventory') };
    Promise.all(Object.entries(jobs).map(([k, p]) => p.then((v) => [k, v] as const).catch(() => [k, [] as Row[]] as const)))
      .then((entries) => { if (!cancelled) setData(Object.fromEntries(entries)); });
    return () => { cancelled = true; };
  }, [organizationId, user, role, isParent]);

  const groups: Group[] = useMemo(() => {
    if (!q) return [];
    const words = q.toLowerCase().split(/\s+/);
    const match = (...fields: unknown[]) => { const hay = fields.filter(Boolean).join(' ').toLowerCase(); return words.every((w) => hay.includes(w)); };
    const childName = new Map((data?.children ?? []).map((c) => [c.id, String(c.fullName ?? '')]));
    const menus = (isParent ? PARENT_MENUS : STAFF_MENUS).filter(([label]) => match(label));
    const g: Group[] = [
      { id: 'menu', label: 'Menu', icon: <LayoutGrid className="h-4 w-4" />, hits: menus.map(([label, href]) => ({ key: href, title: label, href })) },
      {
        id: 'children', label: isParent ? 'Anak Saya' : 'Anak', icon: <Baby className="h-4 w-4" />,
        hits: (data?.children ?? []).filter((c) => match(c.fullName, c.preferredName, c.emergencyContactName, c.emergencyContactPhone))
          .map((c) => ({ key: c.id, title: String(c.fullName), sub: [c.preferredName, c.emergencyContactName && `Wali: ${c.emergencyContactName}`].filter(Boolean).join(' · '), href: `/anak/${c.id}` })),
      },
      {
        id: 'staff', label: 'Staf', icon: <Users className="h-4 w-4" />,
        hits: (data?.staff ?? []).filter((s) => match(s.fullName, s.position, s.email, s.phone))
          .map((s) => ({ key: s.id, title: String(s.fullName), sub: [s.position, s.phone].filter(Boolean).join(' · '), href: '/staf' })),
      },
      {
        id: 'invoices', label: 'Tagihan', icon: <Receipt className="h-4 w-4" />,
        hits: (data?.invoices ?? []).filter((i) => match(i.invoiceNumber, i.childName, childName.get(String(i.childId)), ...(Array.isArray(i.items) ? i.items.map((x: { description?: string }) => x.description) : [])))
          .map((i) => ({
            key: i.id,
            title: `${i.invoiceNumber ?? 'Tagihan'} — ${i.childName || childName.get(String(i.childId)) || ''}`,
            sub: `${formatRupiah(Number(i.totalAmount ?? 0))} · sisa ${formatRupiah(Number(i.outstandingAmount ?? 0))}`,
            href: isParent ? '/tagihan-saya' : '/keuangan',
          })),
      },
      {
        id: 'documents', label: 'Dokumen', icon: <FolderOpen className="h-4 w-4" />,
        hits: (data?.documents ?? []).filter((d) => match(d.name, d.description, d.category))
          .map((d) => ({ key: d.id, title: String(d.name), sub: String(d.category ?? ''), href: '/dokumen' })),
      },
      {
        id: 'inventory', label: 'Inventaris', icon: <Package className="h-4 w-4" />,
        hits: (data?.inventory ?? []).filter((x) => match(x.name, x.category, x.description))
          .map((x) => ({ key: x.id, title: String(x.name), sub: `Stok ${x.stock ?? 0} ${x.unit ?? ''}`, href: '/inventaris' })),
      },
    ];
    return g.filter((x) => x.hits.length > 0);
  }, [q, data, isParent]);

  const total = groups.reduce((s, g) => s + g.hits.length, 0);

  return (
    <div>
      <Topbar title="Pencarian" subtitle={q ? `Hasil untuk "${q}"` : 'Cari data di seluruh aplikasi'} />
      <div className="p-4 sm:p-6 space-y-5 max-w-3xl">
        <form onSubmit={(e) => { e.preventDefault(); const v = input.trim(); router.push(v ? `/cari?q=${encodeURIComponent(v)}` : '/cari'); }} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            autoFocus
            aria-label="Kata kunci pencarian"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nama anak, staf, nomor tagihan, dokumen, barang, atau menu…"
            className="w-full h-11 rounded-xl border border-stone-200 bg-white pl-9 pr-24 text-sm focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-400/20"
          />
          <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-3 rounded-lg bg-coral-500 text-white text-xs font-medium hover:bg-coral-600">Cari</button>
        </form>

        {!q ? (
          <p className="text-sm text-stone-400 text-center py-10">Ketik kata kunci lalu tekan Enter.</p>
        ) : !data ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-stone-100 animate-pulse" />)}</div>
        ) : total === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Tidak ada hasil untuk &ldquo;{q}&rdquo;</p>
            <Link href={`/panduan`} className="text-xs text-coral-500 hover:underline">Buka Panduan</Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-stone-400">{total} hasil</p>
            {groups.map((g) => (
              <section key={g.id}>
                <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2 flex items-center gap-1.5">{g.icon}{g.label} <span className="font-normal">({g.hits.length})</span></h2>
                <Card>
                  <div className="divide-y divide-stone-100">
                    {g.hits.slice(0, 20).map((h) => (
                      <Link key={h.key} href={h.href} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50">
                        <div className="h-8 w-8 rounded-full bg-coral-50 text-coral-500 text-xs font-bold flex items-center justify-center shrink-0">
                          {g.id === 'children' || g.id === 'staff' ? inisial(h.title) : g.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-800 truncate">{h.title}</p>
                          {h.sub && <p className="text-xs text-stone-400 truncate">{h.sub}</p>}
                        </div>
                        <ChevronRight className="h-4 w-4 text-stone-300 shrink-0" />
                      </Link>
                    ))}
                  </div>
                </Card>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
