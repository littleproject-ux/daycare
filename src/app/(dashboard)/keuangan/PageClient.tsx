'use client';

import React, { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, getDocs, limit,
  addDoc, updateDoc, doc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Wallet, Plus, FileText, CheckCircle2, Clock, AlertTriangle,
  XCircle, TrendingUp, Search, Eye, CreditCard,
} from 'lucide-react';
import type { Invoice, InvoiceStatus, Child } from '@/types';
import { formatRupiah, inisial } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'secondary' | 'default'; icon: React.ReactNode }> = {
  draft: { label: 'Draft', variant: 'secondary', icon: <FileText className="h-3 w-3" /> },
  sent: { label: 'Terbit', variant: 'default', icon: <Clock className="h-3 w-3" /> },
  partial: { label: 'Sebagian', variant: 'warning', icon: <AlertTriangle className="h-3 w-3" /> },
  overdue: { label: 'Terlambat', variant: 'danger', icon: <XCircle className="h-3 w-3" /> },
  paid: { label: 'Lunas', variant: 'success', icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: 'Dibatalkan', variant: 'secondary', icon: <XCircle className="h-3 w-3" /> },
};

interface InvoiceFormData {
  childId: string;
  dueDate: string;
  description: string;
  amount: string;
  notes: string;
}

const DEFAULT_FORM: InvoiceFormData = {
  childId: '',
  dueDate: '',
  description: 'Biaya Program Bulanan',
  amount: '',
  notes: '',
};

export default function KeuanganPage() {
  const { organizationId, user, can } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'semua'>('semua');
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [formData, setFormData] = useState<InvoiceFormData>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [childMap, setChildMap] = useState<Map<string, Child>>(new Map());

  useEffect(() => {
    if (!organizationId) return;
    loadData();
  }, [organizationId]);

  async function loadData() {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      // Load children for the form select
      const childQ = query(
        collection(db, 'organizations', organizationId, 'children'),
        where('status', '==', 'active'),
        orderBy('fullName')
      );
      const childSnap = await getDocs(childQ);
      const childList = childSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Child);
      setChildren(childList);
      const cmap = new Map<string, Child>();
      childList.forEach((c) => cmap.set(c.id, c));
      setChildMap(cmap);

      // Load invoices
      const invQ = query(
        collection(db, 'organizations', organizationId, 'invoices'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      const invSnap = await getDocs(invQ);
      setInvoices(invSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Invoice));
    } catch (e) {
      console.error(e);
      toast({ title: 'Gagal memuat data keuangan', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  async function createInvoice() {
    if (!organizationId) return;
    if (!organizationId || !user) return;
    if (!formData.childId) { toast({ title: 'Pilih anak terlebih dahulu', variant: 'error' }); return; }
    if (!formData.amount || isNaN(Number(formData.amount))) { toast({ title: 'Masukkan jumlah yang valid', variant: 'error' }); return; }

    setIsSaving(true);
    try {
      const amount = parseFloat(formData.amount);
      const dueDate = formData.dueDate ? Timestamp.fromDate(new Date(formData.dueDate)) : Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      const now = new Date();
      const invoiceNum = `INV/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(Date.now()).slice(-4)}`;

      await addDoc(collection(db, 'organizations', organizationId, 'invoices'), {
        organizationId,
        invoiceNumber: invoiceNum,
        childId: formData.childId,
        guardianId: '',
        branchId: '',
        status: 'sent',
        billingPeriodStart: Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 1)),
        billingPeriodEnd: Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
        dueDate,
        items: [{
          description: formData.description,
          quantity: 1,
          unitPrice: amount,
          amount,
          type: 'biaya_program',
        }],
        subtotal: amount,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: amount,
        paidAmount: 0,
        outstandingAmount: amount,
        notes: formData.notes,
        periodLocked: false,
        issuedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({ title: 'Tagihan berhasil dibuat', variant: 'success' });
      setShowDialog(false);
      setFormData(DEFAULT_FORM);
      loadData();
    } catch (e) {
      console.error(e);
      toast({ title: 'Gagal membuat tagihan', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  async function recordPayment() {
    if (!organizationId) return;
    if (!selectedInvoice) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Masukkan jumlah pembayaran yang valid', variant: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      const newPaid = selectedInvoice.paidAmount + amount;
      const newOutstanding = Math.max(0, selectedInvoice.totalAmount - newPaid);
      const newStatus: InvoiceStatus = newOutstanding <= 0 ? 'paid' : selectedInvoice.status;

      await updateDoc(doc(db, 'organizations', organizationId, 'invoices', selectedInvoice.id), {
        paidAmount: newPaid,
        outstandingAmount: newOutstanding,
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // Also create a payment record
      await addDoc(collection(db, 'organizations', organizationId, 'payments'), {
        organizationId,
        invoiceId: selectedInvoice.id,
        childId: selectedInvoice.childId,
        amount,
        method: 'transfer',
        status: 'sukses',
        paidAt: serverTimestamp(),
        receivedBy: user?.uid || '',
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Pembayaran berhasil dicatat', variant: 'success' });
      setShowPayDialog(false);
      setPayAmount('');
      loadData();
    } catch (e) {
      console.error(e);
      toast({ title: 'Gagal mencatat pembayaran', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  const filtered = invoices.filter((inv) => {
    const child = childMap.get(inv.childId);
    const matchStatus = filterStatus === 'semua' || inv.status === filterStatus;
    const matchSearch = !search || child?.fullName.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const summary = {
    totalPiutang: invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
      .reduce((sum, i) => sum + i.outstandingAmount, 0),
    terlambat: invoices.filter((i) => i.status === 'overdue').length,
    lunas: invoices.filter((i) => i.status === 'paid').length,
    totalTagihan: invoices.filter((i) => i.status !== 'cancelled').length,
  };

  return (
    <div>
      <Topbar title="Keuangan" subtitle="Kelola tagihan dan pembayaran" />

      <div className="p-6 space-y-5">
        {/* Summary cards */}
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

        {/* Filters & Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              className="w-full pl-9 pr-3 h-9 rounded-xl border border-stone-200 text-sm placeholder:text-stone-400 focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-400/20"
              placeholder="Cari tagihan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1 overflow-x-auto">
            {(['semua', 'sent', 'overdue', 'paid'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  filterStatus === s ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {s === 'semua' ? 'Semua' : STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
          {can('create') && (
            <Button onClick={() => setShowDialog(true)} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Buat Tagihan
            </Button>
          )}
        </div>

        {/* Invoice list */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-stone-100 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <Wallet className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{invoices.length === 0 ? 'Belum ada tagihan' : 'Tidak ada tagihan yang cocok'}</p>
          </div>
        ) : (
          <Card>
            <div className="divide-y divide-stone-50">
              {filtered.map((inv) => {
                const child = childMap.get(inv.childId);
                const cfg = STATUS_CONFIG[inv.status];
                return (
                  <div key={inv.id} className="flex items-center gap-3 p-4 hover:bg-stone-50/60 transition-colors">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-50 text-coral-500 font-bold text-sm">
                      {child ? inisial(child.fullName) : '?'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-stone-900 truncate">
                          {child?.fullName || 'Anak tidak dikenal'}
                        </p>
                        <Badge variant={cfg.variant} className="gap-1 text-xs shrink-0">
                          {cfg.icon} {cfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-stone-400 mt-0.5">
                        <span>{inv.invoiceNumber}</span>
                        {inv.dueDate && (
                          <span>Jatuh tempo: {format(inv.dueDate.toDate(), 'd MMM yyyy', { locale: localeId })}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-stone-900">{formatRupiah(inv.totalAmount)}</p>
                      {inv.outstandingAmount > 0 && inv.outstandingAmount < inv.totalAmount && (
                        <p className="text-xs text-stone-400">Sisa: {formatRupiah(inv.outstandingAmount)}</p>
                      )}
                    </div>

                    {can('edit') && inv.status !== 'paid' && inv.status !== 'cancelled' && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => { setSelectedInvoice(inv); setPayAmount(String(inv.outstandingAmount)); setShowPayDialog(true); }}
                        className="text-xs gap-1 shrink-0"
                      >
                        <CreditCard className="h-3.5 w-3.5" /> Bayar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Create Invoice Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buat Tagihan Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1.5">Anak</label>
              <Select value={formData.childId} onValueChange={(v) => setFormData((d) => ({ ...d, childId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih anak..." />
                </SelectTrigger>
                <SelectContent>
                  {children.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              label="Deskripsi"
              placeholder="Biaya Program Bulanan"
              value={formData.description}
              onChange={(e) => setFormData((d) => ({ ...d, description: e.target.value }))}
            />
            <Input
              label="Jumlah (Rp)"
              type="number"
              placeholder="1500000"
              value={formData.amount}
              onChange={(e) => setFormData((d) => ({ ...d, amount: e.target.value }))}
            />
            <Input
              label="Jatuh Tempo"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData((d) => ({ ...d, dueDate: e.target.value }))}
            />
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1.5">Catatan (opsional)</label>
              <textarea
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm placeholder:text-stone-400 focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-400/20 resize-none"
                rows={2}
                placeholder="Catatan tambahan..."
                value={formData.notes}
                onChange={(e) => setFormData((d) => ({ ...d, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
            <Button onClick={createInvoice} isLoading={isSaving}>Buat Tagihan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Catat Pembayaran</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="rounded-xl bg-stone-50 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500">No. Tagihan</span>
                  <span className="font-medium">{selectedInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Total</span>
                  <span className="font-medium">{formatRupiah(selectedInvoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Sudah Dibayar</span>
                  <span className="font-medium text-emerald-600">{formatRupiah(selectedInvoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-stone-200 pt-1 mt-1">
                  <span className="text-stone-500 font-medium">Sisa</span>
                  <span className="font-bold text-coral-600">{formatRupiah(selectedInvoice.outstandingAmount)}</span>
                </div>
              </div>
              <Input
                label="Jumlah Pembayaran (Rp)"
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>Batal</Button>
            <Button onClick={recordPayment} isLoading={isSaving} variant="success" className="gap-2">
              <CheckCircle2 className="h-4 w-4" /> Konfirmasi Bayar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
