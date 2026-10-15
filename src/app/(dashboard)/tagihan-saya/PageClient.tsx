'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Receipt, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { formatRupiah, toDateSafe } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { invoiceView } from '@/lib/parent-data';
import type { Invoice, InvoiceStatus } from '@/types';

interface Payment {
  id: string; invoiceId: string; amount: number;
  method?: string; notes?: string; paidAt: unknown;
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; variant: 'secondary' | 'warning' | 'info' | 'success' | 'danger' }> = {
  draft:     { label: 'Draft',          variant: 'secondary' },
  sent:      { label: 'Belum Lunas',    variant: 'warning' },
  partial:   { label: 'Bayar Sebagian', variant: 'info' },
  paid:      { label: 'Lunas',          variant: 'success' },
  overdue:   { label: 'Terlambat',      variant: 'danger' },
  cancelled: { label: 'Dibatalkan',     variant: 'secondary' },
};

const METHOD_LABEL: Record<string, string> = { tunai: 'tunai', transfer: 'transfer', transfer_bank: 'transfer bank', qris: 'QRIS' };

function InvoiceCard({ invoice, childName }: { invoice: Invoice; childName?: string }) {
  const { organizationId, user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [loadingPay, setLoadingPay] = useState(false);
  const v = invoiceView(invoice);
  const cfg = STATUS_CONFIG[v.status] ?? STATUS_CONFIG.sent;
  const isOverdue = v.status === 'overdue';
  const isPaid = v.status === 'paid';

  async function togglePayments() {
    if (!organizationId || !user) return;
    if (payments !== null) { setExpanded((e) => !e); return; }
    setLoadingPay(true);
    try {
      // parentUserId filter is required by the security rules for parent reads
      const snap = await getDocs(query(
        collection(db, 'organizations', organizationId, 'payments'),
        where('invoiceId', '==', invoice.id),
        where('parentUserId', '==', user.uid),
      ));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Payment)
        .sort((a, b) => (toDateSafe(b.paidAt)?.getTime() ?? 0) - (toDateSafe(a.paidAt)?.getTime() ?? 0));
      setPayments(list);
      setExpanded(true);
    } catch {
      toast({ title: 'Gagal memuat riwayat pembayaran', variant: 'error' });
    } finally { setLoadingPay(false); }
  }

  return (
    <Card className={isOverdue ? 'border-red-200' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isPaid ? 'bg-emerald-50' : isOverdue ? 'bg-red-50' : 'bg-amber-50'}`}>
            <Receipt className={`h-4 w-4 ${isPaid ? 'text-emerald-500' : isOverdue ? 'text-red-500' : 'text-amber-500'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-sm font-semibold text-stone-800 truncate">{v.title}</p>
              <Badge variant={cfg.variant} className="text-xs shrink-0">{cfg.label}</Badge>
            </div>
            {invoice.invoiceNumber && <p className="text-xs text-stone-400">{invoice.invoiceNumber}</p>}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-2 text-xs text-stone-500">
              <span>Jatuh tempo: {v.due ? format(v.due, 'd MMM yyyy', { locale: localeId }) : '-'}</span>
              {childName && <span>· {childName}</span>}
            </div>
            <div className="flex items-center justify-between mt-3">
              <div>
                <p className="text-xs text-stone-400">Total</p>
                <p className="text-sm font-bold text-stone-800">{formatRupiah(v.total)}</p>
              </div>
              {!isPaid && (
                <div className="text-right">
                  <p className="text-xs text-stone-400">Sisa</p>
                  <p className={`text-sm font-bold ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>{formatRupiah(v.outstanding)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {v.paid > 0 && (
          <button
            onClick={togglePayments}
            className="w-full mt-3 pt-3 border-t border-stone-100 flex items-center justify-center gap-1 text-xs text-stone-400 hover:text-stone-600"
            disabled={loadingPay}
          >
            {loadingPay ? 'Memuat...' : expanded
              ? <><ChevronUp className="h-3 w-3" />Sembunyikan riwayat</>
              : <><ChevronDown className="h-3 w-3" />Riwayat pembayaran</>}
          </button>
        )}
        {expanded && payments && (
          <div className="mt-3 space-y-1.5">
            {payments.length === 0 && <p className="text-xs text-stone-400 text-center">Belum ada catatan pembayaran</p>}
            {payments.map((p) => {
              const paidAt = toDateSafe(p.paidAt);
              return (
                <div key={p.id} className="flex items-center justify-between text-xs bg-emerald-50 rounded-lg px-3 py-2">
                  <div>
                    <span className="font-medium text-emerald-700">{formatRupiah(p.amount)}</span>
                    {p.method && <span className="text-stone-400 ml-2">via {METHOD_LABEL[p.method] ?? p.method}</span>}
                  </div>
                  <span className="text-stone-400">{paidAt ? format(paidAt, 'd MMM yyyy', { locale: localeId }) : '-'}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TagihanSayaPage() {
  const { user, organizationId } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [childNames, setChildNames] = useState<Record<string, string>>({});
  const [filterStatus, setFilterStatus] = useState<'aktif' | 'lunas' | 'semua'>('aktif');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!organizationId || !user) return;
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, user]);

  async function loadInvoices() {
    if (!organizationId || !user) return;
    setIsLoading(true);
    try {
      const [invSnap, childSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'organizations', organizationId, 'invoices'),
          where('parentUserId', '==', user.uid),
          orderBy('dueDate', 'desc'),
        )),
        getDocs(query(
          collection(db, 'organizations', organizationId, 'children'),
          where('parentUserId', '==', user.uid),
        )),
      ]);
      setInvoices(invSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Invoice));
      setChildNames(Object.fromEntries(childSnap.docs.map((d) => [d.id, (d.data().preferredName || d.data().fullName) as string])));
    } catch {
      toast({ title: 'Gagal memuat tagihan', variant: 'error' });
    } finally { setIsLoading(false); }
  }

  const withView = invoices.map((inv) => ({ inv, v: invoiceView(inv) }));
  const isOpen = (s: InvoiceStatus) => s !== 'paid' && s !== 'cancelled' && s !== 'draft';
  const displayed = withView.filter(({ v }) => {
    if (filterStatus === 'aktif') return isOpen(v.status);
    if (filterStatus === 'lunas') return v.status === 'paid';
    return true;
  });
  const unpaidTotal = withView.filter(({ v }) => isOpen(v.status)).reduce((s, { v }) => s + v.outstanding, 0);

  return (
    <div>
      <Topbar title="Tagihan Saya" subtitle="Rekap tagihan dan pembayaran" />
      <div className="p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-3 bg-amber-50 text-center">
            <p className="text-xl font-bold text-amber-600">{withView.filter(({ v }) => isOpen(v.status)).length}</p>
            <p className="text-xs text-stone-500 mt-0.5">Belum Lunas</p>
          </div>
          <div className="rounded-xl p-3 bg-emerald-50 text-center">
            <p className="text-xl font-bold text-emerald-600">{withView.filter(({ v }) => v.status === 'paid').length}</p>
            <p className="text-xs text-stone-500 mt-0.5">Lunas</p>
          </div>
          <div className="rounded-xl p-3 bg-red-50 text-center">
            <p className="text-xl font-bold text-red-600">{withView.filter(({ v }) => v.status === 'overdue').length}</p>
            <p className="text-xs text-stone-500 mt-0.5">Terlambat</p>
          </div>
        </div>

        {unpaidTotal > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
            <p className="text-xs text-stone-500">Total yang perlu dibayar</p>
            <p className="text-xl font-bold text-amber-600">{formatRupiah(unpaidTotal)}</p>
          </div>
        )}

        <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
          {([
            { key: 'aktif', label: 'Belum Lunas' },
            { key: 'lunas', label: 'Lunas' },
            { key: 'semua', label: 'Semua' },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setFilterStatus(t.key)}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${filterStatus === t.key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-stone-100 animate-pulse" />)}</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Tidak ada tagihan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(({ inv }) => (
              <InvoiceCard key={inv.id} invoice={inv} childName={inv.childName || childNames[inv.childId]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
