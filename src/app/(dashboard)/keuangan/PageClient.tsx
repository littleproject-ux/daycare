'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  collection, query, orderBy, getDocs, getDoc, limit, where,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  Wallet, Plus, FileText, CheckCircle2, Clock, AlertTriangle, XCircle, Search,
  CreditCard, Printer, Pencil, Trash2, Eye, Ban, RotateCcw, X,
} from 'lucide-react';
import type { Invoice, InvoiceItem, InvoiceStatus, Child, Payment } from '@/types';
import { formatRupiah, inisial, toDateSafe, formatTanggal } from '@/lib/utils';
import { effectiveInvoiceStatus } from '@/lib/parent-data';
import {
  ITEM_TYPES, ITEM_TYPE_LABEL, ITEM_PRESETS, PAYMENT_METHODS, METHOD_LABEL, recalcInvoice, nextInvoiceNumber,
} from '@/lib/finance';
import { toast } from '@/hooks/use-toast';
import { format, parseISO, endOfMonth, addDays } from 'date-fns';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'secondary' | 'default' | 'info'; icon: React.ReactNode }> = {
  draft: { label: 'Draft', variant: 'secondary', icon: <FileText className="h-3 w-3" /> },
  sent: { label: 'Belum Bayar', variant: 'default', icon: <Clock className="h-3 w-3" /> },
  partial: { label: 'Sebagian', variant: 'warning', icon: <AlertTriangle className="h-3 w-3" /> },
  overdue: { label: 'Terlambat', variant: 'danger', icon: <XCircle className="h-3 w-3" /> },
  paid: { label: 'Lunas', variant: 'success', icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: 'Dibatalkan', variant: 'secondary', icon: <Ban className="h-3 w-3" /> },
};

const FILTERS: (InvoiceStatus | 'semua')[] = ['semua', 'sent', 'partial', 'overdue', 'paid', 'cancelled'];

// Local-date helpers (avoid the UTC shift of new Date('yyyy-MM-dd'))
const ymd = (d: Date | null) => (d ? format(d, 'yyyy-MM-dd') : '');
const localNoon = (s: string) => { const d = parseISO(s); d.setHours(12, 0, 0, 0); return d; };

type ExtInvoice = Invoice & { discountNote?: string };
type ConfirmFn = (o: { title: string; description?: React.ReactNode; confirmText?: string }) => Promise<boolean>;

// ════════════════════════════════════════════════════════════════════════════
export default function KeuanganPage() {
  const { organizationId, user, can } = useAuth();
  const [invoices, setInvoices] = useState<ExtInvoice[]>([]);
  const [childMap, setChildMap] = useState<Map<string, Child>>(new Map());
  const [prefix, setPrefix] = useState('INV');
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'semua'>('semua');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExtInvoice | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<{ invoice: ExtInvoice; payment: Payment | null; others: Payment[] } | null>(null);
  const [confirm, confirmEl] = useConfirm();

  useEffect(() => {
    if (!organizationId) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  async function loadData() {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const [childSnap, invSnap, orgSnap] = await Promise.all([
        getDocs(query(collection(db, 'organizations', organizationId, 'children'), orderBy('fullName'))),
        getDocs(query(collection(db, 'organizations', organizationId, 'invoices'), orderBy('createdAt', 'desc'), limit(500))),
        getDoc(doc(db, 'organizations', organizationId)).catch(() => null),
      ]);
      const cmap = new Map<string, Child>();
      childSnap.docs.forEach((d) => cmap.set(d.id, { id: d.id, ...d.data() } as Child));
      setChildMap(cmap);
      setInvoices(invSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as ExtInvoice));
      if (orgSnap?.exists() && orgSnap.data().invoicePrefix) setPrefix(orgSnap.data().invoicePrefix as string);
    } catch (e) {
      console.error(e);
      toast({ title: 'Gagal memuat data keuangan', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  const statusOf = (inv: ExtInvoice) => effectiveInvoiceStatus(inv.status, toDateSafe(inv.dueDate), inv.outstandingAmount ?? 0);
  const nameOf = (inv: ExtInvoice) => childMap.get(inv.childId)?.fullName || inv.childName || 'Anak tidak dikenal';

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchStatus = filterStatus === 'semua' || statusOf(inv) === filterStatus;
    const matchSearch = !q || nameOf(inv).toLowerCase().includes(q) || (inv.invoiceNumber ?? '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const openInv = invoices.filter((i) => !['paid', 'cancelled', 'draft'].includes(statusOf(i)));
  const summary = {
    totalPiutang: openInv.reduce((s, i) => s + (i.outstandingAmount ?? 0), 0),
    terlambat: invoices.filter((i) => statusOf(i) === 'overdue').length,
    lunas: invoices.filter((i) => statusOf(i) === 'paid').length,
    totalTagihan: invoices.filter((i) => i.status !== 'cancelled').length,
  };

  async function openPayment(inv: ExtInvoice, payment: Payment | null = null) {
    if (!organizationId) return;
    try {
      // load the other payments so the new paid total is computed from real records
      const snap = await getDocs(query(collection(db, 'organizations', organizationId, 'payments'), where('invoiceId', '==', inv.id)));
      const others = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Payment).filter((p) => p.id !== payment?.id);
      setPayFor({ invoice: inv, payment, others });
    } catch {
      toast({ title: 'Gagal memuat data pembayaran', variant: 'error' });
    }
  }

  async function cancelInvoice(inv: ExtInvoice) {
    if (!organizationId) return;
    const ok = await confirm({
      title: 'Batalkan tagihan?',
      description: `${inv.invoiceNumber} untuk ${nameOf(inv)} akan ditandai dibatalkan dan tidak dihitung sebagai piutang.`,
      confirmText: 'Batalkan Tagihan',
    });
    if (!ok) return;
    try {
      await updateDoc(doc(db, 'organizations', organizationId, 'invoices', inv.id), { status: 'cancelled', updatedAt: serverTimestamp() });
      toast({ title: 'Tagihan dibatalkan', variant: 'success' });
      loadData();
    } catch { toast({ title: 'Gagal membatalkan tagihan', variant: 'error' }); }
  }

  async function restoreInvoice(inv: ExtInvoice) {
    if (!organizationId) return;
    const { status } = recalcInvoice(inv.totalAmount, inv.paidAmount ?? 0);
    try {
      await updateDoc(doc(db, 'organizations', organizationId, 'invoices', inv.id), { status, updatedAt: serverTimestamp() });
      toast({ title: 'Tagihan diaktifkan kembali', variant: 'success' });
      loadData();
    } catch { toast({ title: 'Gagal mengaktifkan tagihan', variant: 'error' }); }
  }

  async function deleteInvoice(inv: ExtInvoice) {
    if (!organizationId) return;
    if ((inv.paidAmount ?? 0) > 0) {
      toast({ title: 'Tagihan sudah ada pembayaran', description: 'Hapus pembayarannya dulu, atau batalkan tagihan.', variant: 'error' });
      return;
    }
    const ok = await confirm({ title: 'Hapus tagihan?', description: `${inv.invoiceNumber} akan dihapus permanen.` });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'organizations', organizationId, 'invoices', inv.id));
      toast({ title: 'Tagihan dihapus', variant: 'success' });
      setDetailId(null);
      loadData();
    } catch { toast({ title: 'Gagal menghapus tagihan', variant: 'error' }); }
  }

  const detailInvoice = invoices.find((i) => i.id === detailId) ?? null;

  return (
    <div>
      <Topbar title="Keuangan" subtitle="Kelola tagihan dan pembayaran" />

      <div className="p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl p-4 bg-coral-50">
            <p className="text-xs text-stone-500 font-medium">Total Piutang</p>
            <p className="text-lg font-bold text-coral-600 mt-1">{formatRupiah(summary.totalPiutang)}</p>
          </div>
          <div className="rounded-xl p-4 bg-red-50">
            <p className="text-xs text-stone-500 font-medium">Terlambat</p>
            <p className="text-lg font-bold text-red-600 mt-1">{summary.terlambat} tagihan</p>
          </div>
          <div className="rounded-xl p-4 bg-emerald-50">
            <p className="text-xs text-stone-500 font-medium">Lunas</p>
            <p className="text-lg font-bold text-emerald-600 mt-1">{summary.lunas} tagihan</p>
          </div>
          <div className="rounded-xl p-4 bg-stone-50">
            <p className="text-xs text-stone-500 font-medium">Total Tagihan</p>
            <p className="text-lg font-bold text-stone-700 mt-1">{summary.totalTagihan}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              className="w-full pl-9 pr-3 h-9 rounded-xl border border-stone-200 text-sm placeholder:text-stone-400 focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-400/20"
              placeholder="Cari nama anak / nomor tagihan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {can('create') && (
            <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Buat Tagihan
            </Button>
          )}
        </div>
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1 max-w-full overflow-x-auto w-fit">
          {FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filterStatus === s ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {s === 'semua' ? 'Semua' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-stone-100 animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <Wallet className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{invoices.length === 0 ? 'Belum ada tagihan' : 'Tidak ada tagihan yang cocok'}</p>
          </div>
        ) : (
          <Card>
            <div className="divide-y divide-stone-100">
              {filtered.map((inv) => {
                const st = statusOf(inv);
                const cfg = STATUS_CONFIG[st] ?? STATUS_CONFIG.sent;
                const due = toDateSafe(inv.dueDate);
                const payable = can('edit') && !['paid', 'cancelled'].includes(st);
                return (
                  <div key={inv.id} data-testid="invoice-row" className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 hover:bg-stone-50/60 transition-colors">
                    <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => setDetailId(inv.id)}>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-50 text-coral-500 font-bold text-sm">
                        {inisial(nameOf(inv))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-stone-900 truncate">{nameOf(inv)}</p>
                          <Badge variant={cfg.variant} className="gap-1 text-xs shrink-0">{cfg.icon} {cfg.label}</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 text-xs text-stone-400 mt-0.5">
                          <span>{inv.invoiceNumber}</span>
                          <span>{inv.items?.length ?? 0} item</span>
                          {due && <span>Jatuh tempo: {formatTanggal(due, 'd MMM yyyy')}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-stone-900">{formatRupiah(inv.totalAmount)}</p>
                        {(inv.outstandingAmount ?? 0) > 0 && (inv.outstandingAmount ?? 0) < inv.totalAmount && (
                          <p className="text-xs text-stone-400">Sisa: {formatRupiah(inv.outstandingAmount)}</p>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      <IconBtn title="Detail" onClick={() => setDetailId(inv.id)}><Eye className="h-3.5 w-3.5" /></IconBtn>
                      <a href={`/cetak/invoice/${inv.id}`} target="_blank" rel="noopener noreferrer" title="Cetak invoice"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-stone-200 text-stone-500 hover:text-blue-700 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                        <Printer className="h-3.5 w-3.5" />
                      </a>
                      {payable && (
                        <Button size="sm" variant="success" onClick={() => openPayment(inv)} className="text-xs gap-1">
                          <CreditCard className="h-3.5 w-3.5" /> Bayar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      <InvoiceFormDialog
        open={formOpen}
        editing={editing}
        childMap={childMap}
        prefix={prefix}
        existingNumbers={invoices.map((i) => i.invoiceNumber)}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); loadData(); }}
      />

      {detailInvoice && (
        <InvoiceDetailDialog
          invoice={detailInvoice}
          childName={nameOf(detailInvoice)}
          status={statusOf(detailInvoice)}
          onClose={() => setDetailId(null)}
          onEdit={() => { setEditing(detailInvoice); setFormOpen(true); }}
          onPay={(p) => openPayment(detailInvoice, p)}
          onCancel={() => cancelInvoice(detailInvoice)}
          onRestore={() => restoreInvoice(detailInvoice)}
          onDelete={() => deleteInvoice(detailInvoice)}
          onChanged={loadData}
          confirm={confirm}
        />
      )}

      {payFor && (
        <PaymentFormDialog
          invoice={payFor.invoice}
          payment={payFor.payment}
          others={payFor.others}
          childName={nameOf(payFor.invoice)}
          parentUserId={payFor.invoice.parentUserId ?? childMap.get(payFor.invoice.childId)?.parentUserId ?? null}
          receivedBy={user?.uid ?? ''}
          onClose={() => setPayFor(null)}
          onSaved={() => { setPayFor(null); loadData(); }}
        />
      )}
      {confirmEl}
    </div>
  );
}

function IconBtn({ title, onClick, children, danger }: { title: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick}
      className={`inline-flex items-center justify-center h-8 w-8 rounded-lg border border-stone-200 text-stone-500 transition-colors ${
        danger ? 'hover:text-red-600 hover:border-red-300 hover:bg-red-50' : 'hover:text-coral-600 hover:border-coral-300 hover:bg-coral-50'}`}>
      {children}
    </button>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? 'font-bold text-stone-900' : 'text-stone-600'}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-stone-50 px-3 py-2">
      <p className="text-stone-400">{label}</p>
      <p className="font-medium text-stone-800 truncate">{value}</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Create / edit invoice (multi-item, discount, tax)
interface ItemRow { type: InvoiceItem['type']; description: string; quantity: string; unitPrice: string }

function InvoiceFormDialog({ open, editing, childMap, prefix, existingNumbers, onClose, onSaved }: {
  open: boolean; editing: ExtInvoice | null; childMap: Map<string, Child>; prefix: string; existingNumbers: string[];
  onClose: () => void; onSaved: () => void;
}) {
  const { organizationId } = useAuth();
  const [childId, setChildId] = useState('');
  const [period, setPeriod] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<ItemRow[]>([]);
  const [discountMode, setDiscountMode] = useState<'rp' | 'pct'>('rp');
  const [discount, setDiscount] = useState('');
  const [discountNote, setDiscountNote] = useState('');
  const [tax, setTax] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset the form each time it opens (render-phase sync, no effect needed)
  const openKey = open ? (editing?.id ?? 'new') : null;
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null);
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    if (open) {
      const now = new Date();
      if (editing) {
        setChildId(editing.childId);
        setPeriod(ymd(toDateSafe(editing.billingPeriodStart)).slice(0, 7) || format(now, 'yyyy-MM'));
        setDueDate(ymd(toDateSafe(editing.dueDate)));
        const src: InvoiceItem[] = editing.items?.length
          ? editing.items
          : [{ type: 'lainnya', description: 'Tagihan', quantity: 1, unitPrice: editing.totalAmount, amount: editing.totalAmount }];
        setItems(src.map((i) => ({ type: i.type ?? 'lainnya', description: i.description ?? '', quantity: String(i.quantity ?? 1), unitPrice: String(i.unitPrice ?? i.amount ?? 0) })));
        setDiscountMode('rp');
        setDiscount(editing.discountAmount ? String(editing.discountAmount) : '');
        setDiscountNote(editing.discountNote ?? '');
        setTax(editing.taxAmount ? String(editing.taxAmount) : '');
        setNotes(editing.notes ?? '');
      } else {
        setChildId('');
        setPeriod(format(now, 'yyyy-MM'));
        setDueDate(format(addDays(now, 7), 'yyyy-MM-dd'));
        setItems([{ type: 'biaya_program', description: 'SPP Bulanan', quantity: '1', unitPrice: '' }]);
        setDiscountMode('rp'); setDiscount(''); setDiscountNote(''); setTax(''); setNotes('');
      }
    }
  }

  const num = (s: string) => { const n = parseFloat(String(s).replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; };
  const lines = items.map((i) => ({ ...i, amount: Math.round(num(i.quantity) * num(i.unitPrice)) }));
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const discountAmount = Math.min(subtotal, Math.round(discountMode === 'pct' ? (subtotal * num(discount)) / 100 : num(discount)));
  const taxAmount = Math.round(num(tax));
  const total = Math.max(0, subtotal - discountAmount + taxAmount);
  const paid = editing?.paidAmount ?? 0;

  const children = useMemo(() => [...childMap.values()]
    .filter((c) => c.status === 'active' || c.id === editing?.childId)
    .sort((a, b) => a.fullName.localeCompare(b.fullName)), [childMap, editing]);

  const setItem = (idx: number, patch: Partial<ItemRow>) => setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  async function save() {
    if (!organizationId) return;
    if (!childId) { toast({ title: 'Pilih anak terlebih dahulu', variant: 'error' }); return; }
    if (lines.some((l) => !l.description.trim() || l.amount <= 0)) {
      toast({ title: 'Setiap item wajib punya keterangan, qty, dan harga', variant: 'error' }); return;
    }
    if (!dueDate) { toast({ title: 'Isi tanggal jatuh tempo', variant: 'error' }); return; }
    if (total < paid) {
      toast({ title: 'Total tidak boleh lebih kecil dari yang sudah dibayar', description: `Sudah dibayar ${formatRupiah(paid)}`, variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      const child = childMap.get(childId);
      const periodStart = parseISO(`${period || format(new Date(), 'yyyy-MM')}-01`);
      const { outstanding, status } = recalcInvoice(total, paid, editing?.status);
      const payload = {
        childId,
        childName: child?.fullName ?? '',
        parentUserId: child?.parentUserId ?? null,
        billingPeriodStart: Timestamp.fromDate(periodStart),
        billingPeriodEnd: Timestamp.fromDate(endOfMonth(periodStart)),
        dueDate: Timestamp.fromDate(localNoon(dueDate)),
        items: lines.map((l) => ({ type: l.type, description: l.description.trim(), quantity: num(l.quantity), unitPrice: num(l.unitPrice), amount: l.amount })),
        subtotal,
        discountAmount,
        discountNote: discountNote.trim(),
        taxAmount,
        totalAmount: total,
        outstandingAmount: outstanding,
        status,
        notes: notes.trim(),
        updatedAt: serverTimestamp(),
      };
      if (editing) {
        await updateDoc(doc(db, 'organizations', organizationId, 'invoices', editing.id), payload);
        toast({ title: 'Tagihan diperbarui', variant: 'success' });
      } else {
        await addDoc(collection(db, 'organizations', organizationId, 'invoices'), {
          ...payload,
          organizationId,
          invoiceNumber: nextInvoiceNumber(prefix, existingNumbers),
          guardianId: '',
          branchId: '',
          paidAmount: 0,
          periodLocked: false,
          issuedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Tagihan berhasil dibuat', variant: 'success' });
      }
      onSaved();
    } catch (e) {
      console.error(e);
      toast({ title: 'Gagal menyimpan tagihan', variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit Tagihan ${editing.invoiceNumber}` : 'Buat Tagihan Baru'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-stone-700">Anak <span className="text-red-500">*</span></label>
              <Select value={childId || undefined} onValueChange={setChildId}>
                <SelectTrigger aria-label="Pilih anak"><SelectValue placeholder="Pilih anak..." /></SelectTrigger>
                <SelectContent>
                  {children.map((c) => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input label="Periode Tagihan" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
            <Input label="Jatuh Tempo" required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          <div>
            <p className="text-sm font-semibold text-stone-700 mb-2">Rincian Item</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {ITEM_PRESETS.map((p) => (
                <button key={p.label} type="button"
                  onClick={() => setItems((arr) => [...arr, { type: p.item.type, description: p.item.description, quantity: String(p.item.quantity), unitPrice: '' }])}
                  className="text-xs px-2.5 py-1 rounded-lg border border-dashed border-stone-300 text-stone-600 hover:border-coral-400 hover:text-coral-600">
                  + {p.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <div className="hidden sm:grid grid-cols-[150px_1fr_70px_130px_120px_32px] gap-2 text-[11px] font-medium uppercase tracking-wide text-stone-400 px-1">
                <span>Jenis</span><span>Keterangan</span><span className="text-right">Qty</span><span className="text-right">Harga</span><span className="text-right">Jumlah</span><span />
              </div>
              {lines.map((it, idx) => (
                <div key={idx} data-testid="invoice-item" className="grid grid-cols-2 sm:grid-cols-[150px_1fr_70px_130px_120px_32px] gap-2 items-center rounded-xl sm:rounded-none bg-stone-50 sm:bg-transparent p-2 sm:p-0">
                  <select aria-label="Jenis item" value={it.type}
                    onChange={(e) => setItem(idx, { type: e.target.value as InvoiceItem['type'] })}
                    className="h-9 rounded-lg border border-stone-200 bg-white px-2 text-sm col-span-2 sm:col-span-1">
                    {ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <input aria-label="Keterangan item" value={it.description} onChange={(e) => setItem(idx, { description: e.target.value })}
                    placeholder="Keterangan" className="h-9 rounded-lg border border-stone-200 px-2 text-sm col-span-2 sm:col-span-1" />
                  <input aria-label="Qty" type="number" min={0} value={it.quantity} onChange={(e) => setItem(idx, { quantity: e.target.value })}
                    className="h-9 rounded-lg border border-stone-200 px-2 text-sm text-right" />
                  <input aria-label="Harga satuan" type="number" min={0} value={it.unitPrice} onChange={(e) => setItem(idx, { unitPrice: e.target.value })}
                    placeholder="Harga" className="h-9 rounded-lg border border-stone-200 px-2 text-sm text-right" />
                  <p className="text-sm font-medium text-right text-stone-800">{formatRupiah(it.amount)}</p>
                  <button type="button" aria-label="Hapus item" onClick={() => setItems((arr) => arr.filter((_, i) => i !== idx))}
                    disabled={items.length === 1}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 justify-self-end">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setItems((arr) => [...arr, { type: 'lainnya', description: '', quantity: '1', unitPrice: '' }])}
                className="text-sm text-coral-600 hover:underline flex items-center gap-1 mt-1">
                <Plus className="h-3.5 w-3.5" /> Tambah baris item
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-stone-700">Diskon</label>
                <div className="flex gap-2">
                  <select aria-label="Jenis diskon" value={discountMode} onChange={(e) => setDiscountMode(e.target.value as 'rp' | 'pct')}
                    className="h-10 rounded-xl border border-stone-200 bg-white px-2 text-sm">
                    <option value="rp">Rp</option>
                    <option value="pct">%</option>
                  </select>
                  <input aria-label="Nilai diskon" type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)}
                    placeholder="0" className="flex-1 h-10 rounded-xl border border-stone-200 px-3 text-sm" />
                </div>
                <input aria-label="Keterangan diskon" value={discountNote} onChange={(e) => setDiscountNote(e.target.value)}
                  placeholder="Keterangan diskon (mis. diskon saudara kandung)" className="h-9 rounded-lg border border-stone-200 px-3 text-sm" />
              </div>
              <Input label="Pajak / Biaya Tambahan (Rp)" type="number" min={0} value={tax} onChange={(e) => setTax(e.target.value)} placeholder="0" />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-stone-700">Catatan (tampil di invoice)</label>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Catatan tagihan"
                  placeholder="mis. Transfer ke BCA 123456 a.n. Daycare ..."
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm resize-none focus:border-coral-400 focus:outline-none" />
              </div>
            </div>
            <div className="rounded-xl bg-stone-50 p-4 text-sm space-y-1.5 h-fit">
              <Row label="Subtotal" value={formatRupiah(subtotal)} />
              <Row label={`Diskon${discountMode === 'pct' && num(discount) ? ` (${num(discount)}%)` : ''}`} value={`−${formatRupiah(discountAmount)}`} />
              <Row label="Pajak / biaya tambahan" value={formatRupiah(taxAmount)} />
              <div className="border-t border-stone-200 pt-1.5"><Row label="Total" value={formatRupiah(total)} bold /></div>
              {editing && <Row label="Sudah dibayar" value={formatRupiah(paid)} />}
              {editing && <Row label="Sisa" value={formatRupiah(Math.max(0, total - paid))} />}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save} isLoading={saving}>{editing ? 'Simpan Perubahan' : 'Simpan Tagihan'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Invoice detail: items + payment history with edit/delete
function InvoiceDetailDialog({ invoice, childName, status, onClose, onEdit, onPay, onCancel, onRestore, onDelete, onChanged, confirm }: {
  invoice: ExtInvoice; childName: string; status: InvoiceStatus;
  onClose: () => void; onEdit: () => void; onPay: (p: Payment | null) => void;
  onCancel: () => void; onRestore: () => void; onDelete: () => void; onChanged: () => void; confirm: ConfirmFn;
}) {
  const { organizationId, can } = useAuth();
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.sent;

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    getDocs(query(collection(db, 'organizations', organizationId, 'payments'), where('invoiceId', '==', invoice.id)))
      .then((snap) => {
        if (cancelled) return;
        setPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Payment)
          .sort((a, b) => (toDateSafe(a.paidAt)?.getTime() ?? 0) - (toDateSafe(b.paidAt)?.getTime() ?? 0)));
      })
      .catch(() => { if (!cancelled) setPayments([]); });
    return () => { cancelled = true; };
    // reload when the invoice totals change after a payment edit
  }, [organizationId, invoice.id, invoice.paidAmount, invoice.updatedAt]);

  async function deletePayment(p: Payment) {
    if (!organizationId || !payments) return;
    const ok = await confirm({
      title: 'Hapus pembayaran?',
      description: `${formatRupiah(p.amount)} tanggal ${formatTanggal(toDateSafe(p.paidAt), 'd MMM yyyy')} akan dihapus dan sisa tagihan dihitung ulang.`,
    });
    if (!ok) return;
    try {
      const newPaid = payments.filter((x) => x.id !== p.id).reduce((s, x) => s + x.amount, 0);
      const { outstanding, status: st } = recalcInvoice(invoice.totalAmount, newPaid, invoice.status);
      const batch = writeBatch(db);
      batch.delete(doc(db, 'organizations', organizationId, 'payments', p.id));
      batch.update(doc(db, 'organizations', organizationId, 'invoices', invoice.id), {
        paidAmount: newPaid, outstandingAmount: outstanding, status: st, updatedAt: serverTimestamp(),
      });
      await batch.commit();
      toast({ title: 'Pembayaran dihapus', variant: 'success' });
      onChanged();
    } catch { toast({ title: 'Gagal menghapus pembayaran', variant: 'error' }); }
  }

  const cancelled = invoice.status === 'cancelled';

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {invoice.invoiceNumber}
            <Badge variant={cfg.variant} className="gap-1 text-xs">{cfg.icon} {cfg.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Meta label="Anak" value={childName} />
            <Meta label="Jatuh tempo" value={formatTanggal(invoice.dueDate)} />
            <Meta label="Periode" value={formatTanggal(invoice.billingPeriodStart, 'MMMM yyyy')} />
            <Meta label="Diterbitkan" value={formatTanggal(invoice.issuedAt ?? invoice.createdAt, 'd MMM yyyy')} />
          </div>

          <div className="rounded-xl border border-stone-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-stone-50 text-stone-500">
                <tr><th className="text-left p-2">Item</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Harga</th><th className="text-right p-2">Jumlah</th></tr>
              </thead>
              <tbody>
                {(invoice.items ?? []).map((it, i) => (
                  <tr key={i} className="border-t border-stone-100">
                    <td className="p-2">{it.description}<span className="block text-[10px] text-stone-400">{ITEM_TYPE_LABEL[it.type] ?? it.type}</span></td>
                    <td className="p-2 text-right">{it.quantity}</td>
                    <td className="p-2 text-right">{formatRupiah(it.unitPrice)}</td>
                    <td className="p-2 text-right">{formatRupiah(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-stone-200 p-3 space-y-1 bg-stone-50/50">
              <Row label="Subtotal" value={formatRupiah(invoice.subtotal ?? invoice.totalAmount)} />
              {!!invoice.discountAmount && <Row label={`Diskon${invoice.discountNote ? ` (${invoice.discountNote})` : ''}`} value={`−${formatRupiah(invoice.discountAmount)}`} />}
              {!!invoice.taxAmount && <Row label="Pajak / biaya tambahan" value={formatRupiah(invoice.taxAmount)} />}
              <Row label="Total" value={formatRupiah(invoice.totalAmount)} bold />
              <Row label="Sudah dibayar" value={formatRupiah(invoice.paidAmount ?? 0)} />
              <Row label="Sisa" value={formatRupiah(invoice.outstandingAmount ?? 0)} bold />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-stone-700">Riwayat Pembayaran</p>
              {can('edit') && !cancelled && (invoice.outstandingAmount ?? 0) > 0 && (
                <Button size="sm" variant="success" className="gap-1 text-xs" onClick={() => onPay(null)}>
                  <Plus className="h-3.5 w-3.5" /> Tambah Pembayaran
                </Button>
              )}
            </div>
            {payments === null ? (
              <div className="h-10 rounded-lg bg-stone-100 animate-pulse" />
            ) : payments.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-3">Belum ada pembayaran</p>
            ) : (
              <div className="space-y-1.5">
                {payments.map((p) => (
                  <div key={p.id} data-testid="payment-row" className="flex items-center gap-3 rounded-lg bg-emerald-50/60 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-emerald-700">{formatRupiah(p.amount)}</p>
                      <p className="text-xs text-stone-500 truncate">
                        {formatTanggal(toDateSafe(p.paidAt), 'd MMM yyyy')} · {METHOD_LABEL[p.method] ?? p.method ?? '-'}
                        {p.referenceNumber ? ` · Ref ${p.referenceNumber}` : ''}{p.notes ? ` · ${p.notes}` : ''}
                      </p>
                    </div>
                    {can('edit') && <IconBtn title="Edit pembayaran" onClick={() => onPay(p)}><Pencil className="h-3.5 w-3.5" /></IconBtn>}
                    {can('edit') && <IconBtn title="Hapus pembayaran" danger onClick={() => deletePayment(p)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {invoice.notes && <p className="text-xs text-stone-500 whitespace-pre-line"><span className="font-medium">Catatan:</span> {invoice.notes}</p>}
        </div>

        <DialogFooter className="gap-2 pt-2 flex-wrap sm:justify-between">
          <div className="flex gap-2 flex-wrap">
            {can('edit') && !cancelled && <Button variant="outline" size="sm" className="gap-1" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /> Edit Tagihan</Button>}
            {can('edit') && !cancelled && <Button variant="outline" size="sm" className="gap-1" onClick={onCancel}><Ban className="h-3.5 w-3.5" /> Batalkan</Button>}
            {can('edit') && cancelled && <Button variant="outline" size="sm" className="gap-1" onClick={onRestore}><RotateCcw className="h-3.5 w-3.5" /> Aktifkan Lagi</Button>}
            {can('delete') && <Button variant="destructive" size="sm" className="gap-1" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /> Hapus</Button>}
          </div>
          <a href={`/cetak/invoice/${invoice.id}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium">
            <Printer className="h-3.5 w-3.5" /> Cetak Invoice
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Add / edit payment (amount, date, method, reference, notes)
function PaymentFormDialog({ invoice, payment, others, childName, parentUserId, receivedBy, onClose, onSaved }: {
  invoice: ExtInvoice; payment: Payment | null; others: Payment[]; childName: string;
  parentUserId: string | null; receivedBy: string; onClose: () => void; onSaved: () => void;
}) {
  const { organizationId } = useAuth();
  const paidByOthers = others.reduce((s, p) => s + p.amount, 0);
  const maxAmount = Math.max(0, invoice.totalAmount - paidByOthers);
  const [amount, setAmount] = useState(String(payment?.amount ?? maxAmount));
  const [date, setDate] = useState(ymd(toDateSafe(payment?.paidAt) ?? new Date()));
  const [method, setMethod] = useState<string>(payment?.method === 'transfer' ? 'transfer_bank' : (payment?.method ?? 'tunai'));
  const [ref, setRef] = useState(payment?.referenceNumber ?? '');
  const [notes, setNotes] = useState(payment?.notes ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!organizationId) return;
    const amt = Math.round(parseFloat(amount));
    if (isNaN(amt) || amt <= 0) { toast({ title: 'Masukkan jumlah pembayaran yang valid', variant: 'error' }); return; }
    if (amt > maxAmount) { toast({ title: `Jumlah melebihi sisa tagihan (${formatRupiah(maxAmount)})`, variant: 'error' }); return; }
    if (!date) { toast({ title: 'Isi tanggal pembayaran', variant: 'error' }); return; }
    setSaving(true);
    try {
      const newPaid = paidByOthers + amt;
      const { outstanding, status } = recalcInvoice(invoice.totalAmount, newPaid, invoice.status);
      const data = {
        amount: amt,
        paidAt: Timestamp.fromDate(localNoon(date)),
        method,
        referenceNumber: ref.trim(),
        notes: notes.trim(),
        updatedAt: serverTimestamp(),
      };
      const batch = writeBatch(db);
      if (payment) {
        batch.update(doc(db, 'organizations', organizationId, 'payments', payment.id), data);
      } else {
        batch.set(doc(collection(db, 'organizations', organizationId, 'payments')), {
          ...data,
          organizationId,
          invoiceId: invoice.id,
          childId: invoice.childId,
          parentUserId,
          status: 'sukses',
          receivedBy,
          createdAt: serverTimestamp(),
        });
      }
      batch.update(doc(db, 'organizations', organizationId, 'invoices', invoice.id), {
        paidAmount: newPaid, outstandingAmount: outstanding, status, updatedAt: serverTimestamp(),
      });
      await batch.commit();
      toast({ title: payment ? 'Pembayaran diperbarui' : 'Pembayaran berhasil dicatat', variant: 'success' });
      onSaved();
    } catch (e) {
      console.error(e);
      toast({ title: 'Gagal menyimpan pembayaran', variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{payment ? 'Edit Pembayaran' : 'Catat Pembayaran'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl bg-stone-50 p-3 text-sm space-y-1">
            <Row label="No. Tagihan" value={invoice.invoiceNumber} />
            <Row label="Anak" value={childName} />
            <Row label="Total" value={formatRupiah(invoice.totalAmount)} />
            <Row label={payment ? 'Dibayar (pembayaran lain)' : 'Sudah dibayar'} value={formatRupiah(paidByOthers)} />
            <div className="border-t border-stone-200 pt-1"><Row label="Maksimal bisa dibayar" value={formatRupiah(maxAmount)} bold /></div>
          </div>
          <Input label="Jumlah Pembayaran (Rp)" required type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input label="Tanggal Bayar" required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-stone-700">Metode Pembayaran</label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger aria-label="Metode pembayaran"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input label="No. Referensi (opsional)" placeholder="No. transfer / bukti" value={ref} onChange={(e) => setRef(e.target.value)} />
          <Input label="Catatan Pembayaran (opsional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save} isLoading={saving} variant="success" className="gap-2">
            <CheckCircle2 className="h-4 w-4" /> {payment ? 'Simpan Perubahan' : 'Konfirmasi Bayar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
