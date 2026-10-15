'use client';

import React, { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, getDocs, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Receipt, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { formatRupiah } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface Invoice {
  id: string; childId: string; childName: string;
  amount: number; outstandingAmount: number; paidAmount: number;
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string; description?: string; invoiceNumber?: string;
  periodMonth?: number; periodYear?: number; createdAt: Timestamp;
}

interface Payment {
  id: string; invoiceId: string; amount: number;
  method?: string; notes?: string; paidAt: Timestamp;
}

const STATUS_CONFIG = {
  draft:     { label: 'Draft',         variant: 'secondary' as const, icon: <Clock className="h-3.5 w-3.5" /> },
  sent:      { label: 'Belum Lunas',   variant: 'warning' as const,   icon: <Clock className="h-3.5 w-3.5" /> },
  partial:   { label: 'Bayar Sebagian',variant: 'info' as const,      icon: <Clock className="h-3.5 w-3.5" /> },
  paid:      { label: 'Lunas',         variant: 'success' as const,   icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  overdue:   { label: 'Terlambat',     variant: 'danger' as const,    icon: <AlertCircle className="h-3.5 w-3.5" /> },
  cancelled: { label: 'Dibatalkan',    variant: 'secondary' as const, icon: <Clock className="h-3.5 w-3.5" /> },
};

function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const { organizationId } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPay, setLoadingPay] = useState(false);
  const cfg = STATUS_CONFIG[invoice.status];

  async function loadPayments() {
    if (!organizationId) return;
    if (payments.length > 0) { setExpanded(e => !e); return; }
    setLoadingPay(true);
    try {
      const snap = await getDocs(query(
        collection(db, 'organizations', organizationId, 'payments'),
        where('invoiceId', '==', invoice.id),
        orderBy('paidAt', 'desc'),
      ));
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Payment));
      setExpanded(true);
    } catch { /* silent */ }
    finally { setLoadingPay(false); }
  }

  const outstanding = invoice.outstandingAmount ?? invoice.amount;
  const isOverdue = invoice.status === 'overdue' ||
    (invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.dueDate &&
     isPast(new Date(invoice.dueDate)) && !isToday(new Date(invoice.dueDate)));

  return (
    <Card className={isOverdue && invoice.status !== 'paid' ? 'border-red-200' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            invoice.status === 'paid' ? 'bg-emerald-50' : isOverdue ? 'bg-red-50' : 'bg-amber-50'
          }`}>
            <Receipt className={`h-4 w-4 ${
              invoice.status === 'paid' ? 'text-emerald-500' : isOverdue ? 'text-red-500' : 'text-amber-500'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-sm font-semibold text-stone-800 truncate">
                {invoice.description || `Tagihan ${invoice.childName}`}
              </p>
              <Badge variant={cfg.variant} className="text-xs shrink-0">{cfg.label}</Badge>
            </div>
            {invoice.invoiceNumber && (
              <p className="text-xs text-stone-400">{invoice.invoiceNumber}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-stone-500">
              <span>Jatuh tempo: {invoice.dueDate ? format(new Date(invoice.dueDate), 'd MMM yyyy', { locale: localeId }) : '-'}</span>
              {invoice.childName && <span>· {invoice.childName}</span>}
            </div>
            <div className="flex items-center justify-between mt-3">
              <div>
                <p className="text-xs text-stone-400">Total</p>
                <p className="text-sm font-bold text-stone-800">{formatRupiah(invoice.amount)}</p>
              </div>
              {invoice.status !== 'paid' && (
                <div className="text-right">
                  <p className="text-xs text-stone-400">Sisa</p>
                  <p className={`text-sm font-bold ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                    {formatRupiah(outstanding)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expand payment history */}
        {(invoice.status === 'partial' || invoice.status === 'paid') && (
          <button
            onClick={loadPayments}
            className="w-full mt-3 pt-3 border-t border-stone-100 flex items-center justify-center gap-1 text-xs text-stone-400 hover:text-stone-600"
            disabled={loadingPay}
          >
            {loadingPay ? 'Memuat...' : expanded ? <><ChevronUp className="h-3 w-3" />Sembunyikan riwayat</> : <><ChevronDown className="h-3 w-3" />Riwayat pembayaran</>}
          </button>
        )}
        {expanded && payments.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between text-xs bg-emerald-50 rounded-lg px-3 py-2">
                <div>
                  <span className="font-medium text-emerald-700">{formatRupiah(p.amount)}</span>
                  {p.method && <span className="text-stone-400 ml-2">via {p.method}</span>}
                </div>
                <span className="text-stone-400">
                  {p.paidAt?.toDate ? format(p.paidAt.toDate(), 'd MMM yyyy', { locale: localeId }) : '-'}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TagihanSayaPage() {
  const { user, organizationId } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('aktif');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!organizationId || !user) return;
    loadInvoices();
  }, [organizationId, user]);

  async function loadInvoices() {
    if (!organizationId || !user) return;
    setIsLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, 'organizations', organizationId, 'invoices'),
        where('parentUserId', '==', user.uid),
        orderBy('dueDate', 'desc'),
      ));
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Invoice));
    } catch { toast({ title: 'Gagal memuat tagihan', variant: 'error' }); }
    finally { setIsLoading(false); }
  }

  const displayed = invoices.filter(inv => {
    if (filterStatus === 'aktif') return inv.status !== 'paid' && inv.status !== 'cancelled';
    if (filterStatus === 'lunas') return inv.status === 'paid';
    return true;
  });

  const unpaidTotal = invoices
    .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((s, i) => s + (i.outstandingAmount ?? i.amount), 0);

  return (
    <div>
      <Topbar title="Tagihan Saya" subtitle="Rekap tagihan dan pembayaran" />
      <div className="p-6 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-3 bg-amber-50 text-center">
            <p className="text-xl font-bold text-amber-600">{invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').length}</p>
            <p className="text-xs text-stone-500 mt-0.5">Belum Lunas</p>
          </div>
          <div className="rounded-xl p-3 bg-emerald-50 text-center">
            <p className="text-xl font-bold text-emerald-600">{invoices.filter(i => i.status === 'paid').length}</p>
            <p className="text-xs text-stone-500 mt-0.5">Lunas</p>
          </div>
          <div className="rounded-xl p-3 bg-red-50 text-center">
            <p className="text-xl font-bold text-red-600">{invoices.filter(i => i.status === 'overdue').length}</p>
            <p className="text-xs text-stone-500 mt-0.5">Terlambat</p>
          </div>
        </div>

        {unpaidTotal > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
            <p className="text-xs text-stone-500">Total yang perlu dibayar</p>
            <p className="text-xl font-bold text-amber-600">{formatRupiah(unpaidTotal)}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
          {[
            { key: 'aktif', label: 'Belum Lunas' },
            { key: 'lunas', label: 'Lunas' },
            { key: 'semua', label: 'Semua' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setFilterStatus(t.key)}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === t.key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
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
            {displayed.map(inv => <InvoiceCard key={inv.id} invoice={inv} />)}
          </div>
        )}
      </div>
    </div>
  );
}
