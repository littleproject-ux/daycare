'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { formatRupiah, formatTanggal, terbilang, toDateSafe } from '@/lib/utils';
import { effectiveInvoiceStatus } from '@/lib/parent-data';
import { ITEM_TYPE_LABEL, METHOD_LABEL } from '@/lib/finance';
import { ArrowLeft, Printer } from 'lucide-react';
import type { Child, Invoice, InvoiceItem, Organization } from '@/types';

interface Payment {
  id: string;
  amount: number;
  method?: string;
  paidAt: unknown;
}

const ITEM_TYPE = ITEM_TYPE_LABEL;

const METHOD = METHOD_LABEL;

const STAMP: Record<string, { label: string; cls: string }> = {
  paid: { label: 'LUNAS', cls: 'border-emerald-600 text-emerald-600' },
  partial: { label: 'DIBAYAR SEBAGIAN', cls: 'border-amber-600 text-amber-600' },
  overdue: { label: 'JATUH TEMPO', cls: 'border-red-600 text-red-600' },
  sent: { label: 'BELUM LUNAS', cls: 'border-blue-700 text-blue-700' },
  draft: { label: 'DRAFT', cls: 'border-stone-400 text-stone-400' },
  cancelled: { label: 'DIBATALKAN', cls: 'border-stone-500 text-stone-500' },
};

export default function PrintInvoiceClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { organizationId, user, role } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [org, setOrg] = useState<Partial<Organization> | null>(null);
  const [child, setChild] = useState<Partial<Child> | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId || !user || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const invSnap = await getDoc(doc(db, 'organizations', organizationId, 'invoices', id));
        if (!invSnap.exists()) { if (!cancelled) setError('Tagihan tidak ditemukan.'); return; }
        const inv = { id: invSnap.id, ...invSnap.data() } as Invoice;

        const [orgSnap, childSnap, paySnap] = await Promise.all([
          getDoc(doc(db, 'organizations', organizationId)).catch(() => null),
          inv.childId ? getDoc(doc(db, 'organizations', organizationId, 'children', inv.childId)).catch(() => null) : null,
          // parents may only list payments stamped with their uid (security rules)
          getDocs(role === 'parent'
            ? query(collection(db, 'organizations', organizationId, 'payments'), where('invoiceId', '==', id), where('parentUserId', '==', user.uid))
            : query(collection(db, 'organizations', organizationId, 'payments'), where('invoiceId', '==', id))
          ).catch(() => null),
        ]);
        if (cancelled) return;
        setInvoice(inv);
        setOrg(orgSnap?.exists() ? (orgSnap.data() as Organization) : null);
        setChild(childSnap?.exists() ? (childSnap.data() as Child) : null);
        setPayments((paySnap?.docs ?? [])
          .map((d) => ({ id: d.id, ...d.data() }) as Payment)
          .sort((a, b) => (toDateSafe(a.paidAt)?.getTime() ?? 0) - (toDateSafe(b.paidAt)?.getTime() ?? 0)));
        // default file name when "Save as PDF"
        document.title = `Invoice ${inv.invoiceNumber ?? ''} - ${inv.childName || childSnap?.data()?.fullName || ''}`.trim();
      } catch {
        if (!cancelled) setError('Gagal memuat tagihan. Pastikan Anda memiliki akses.');
      }
    })();
    return () => { cancelled = true; };
  }, [organizationId, user, role, id]);

  const toolbar = (
    <div className="print:hidden sticky top-0 z-10 bg-white border-b border-stone-200">
      <div className="max-w-[210mm] mx-auto flex items-center justify-between gap-3 px-4 py-3">
        <button onClick={() => (window.history.length > 1 ? router.back() : router.push(role === 'parent' ? '/tagihan-saya' : '/keuangan'))}
          className="flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>
        <button onClick={() => window.print()} disabled={!invoice}
          className="flex items-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white text-sm font-medium px-4 py-2">
          <Printer className="h-4 w-4" /> Cetak / Simpan PDF
        </button>
      </div>
    </div>
  );

  if (error) return <>{toolbar}<p className="text-center text-sm text-red-600 py-16">{error}</p></>;
  if (!invoice) return <>{toolbar}<p className="text-center text-sm text-stone-400 py-16">Memuat tagihan...</p></>;

  const items: InvoiceItem[] = invoice.items?.length
    ? invoice.items
    : [{ description: 'Tagihan', quantity: 1, unitPrice: invoice.totalAmount, amount: invoice.totalAmount, type: 'lainnya' }];
  const subtotal = invoice.subtotal ?? items.reduce((s, i) => s + i.amount, 0);
  const total = invoice.totalAmount ?? subtotal;
  const paid = invoice.paidAmount ?? payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = invoice.outstandingAmount ?? Math.max(0, total - paid);
  const status = effectiveInvoiceStatus(invoice.status, toDateSafe(invoice.dueDate), outstanding);
  const stamp = STAMP[status] ?? STAMP.sent;
  const periodStart = toDateSafe(invoice.billingPeriodStart);
  const periodEnd = toDateSafe(invoice.billingPeriodEnd);
  const issued = toDateSafe(invoice.issuedAt) ?? toDateSafe(invoice.createdAt);
  const childName = child?.fullName || invoice.childName || '-';
  // city = last comma-separated part of the address, e.g. "Jl. Melati 1, Bandung" → "Bandung"
  const city = org?.address?.includes(',') ? org.address.split(',').pop()!.trim() : '';

  return (
    <>
      {toolbar}
      <style>{`@page { size: A4; margin: 12mm; } @media print { html, body { background: #fff !important; } }`}</style>

      <div className="py-6 print:py-0 px-3 print:px-0">
        <article className="mx-auto max-w-[210mm] bg-white shadow-sm print:shadow-none p-8 sm:p-10 print:p-0 text-[13px] leading-relaxed text-stone-800">
          {/* Header */}
          <header className="flex items-start justify-between gap-6 border-b-4 border-blue-700 pb-5">
            <div className="flex items-start gap-3 min-w-0">
              {org?.logoUrl && <img src={org.logoUrl} alt="" className="h-14 w-14 object-contain" />}
              <div className="min-w-0">
                <p className="text-lg font-bold text-blue-800">{org?.name || 'Daycare'}</p>
                {org?.address && <p className="text-xs text-stone-600">{org.address}</p>}
                <p className="text-xs text-stone-600">
                  {[org?.phone && `Telp. ${org.phone}`, org?.email, org?.website].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-extrabold tracking-wide text-blue-700">INVOICE</p>
              <p className="text-xs text-stone-500 mt-0.5">No. {invoice.invoiceNumber || invoice.id}</p>
            </div>
          </header>

          {/* Meta */}
          <section className="grid grid-cols-2 gap-6 mt-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 mb-1">Ditagihkan kepada</p>
              <p className="font-semibold text-stone-900">{childName}</p>
              {child?.emergencyContactName && (
                <p className="text-xs text-stone-600">
                  Wali: {child.emergencyContactName}{child.emergencyContactRelation ? ` (${child.emergencyContactRelation})` : ''}
                </p>
              )}
              {child?.emergencyContactPhone && <p className="text-xs text-stone-600">Telp. {child.emergencyContactPhone}</p>}
              {child?.address && <p className="text-xs text-stone-600">{child.address}</p>}
            </div>
            <table className="text-xs justify-self-end">
              <tbody>
                <tr><td className="pr-4 py-0.5 text-stone-500">Tanggal terbit</td><td className="font-medium">{issued ? formatTanggal(issued) : '-'}</td></tr>
                <tr><td className="pr-4 py-0.5 text-stone-500">Jatuh tempo</td><td className="font-medium">{formatTanggal(invoice.dueDate)}</td></tr>
                {periodStart && (
                  <tr><td className="pr-4 py-0.5 text-stone-500">Periode</td>
                    <td className="font-medium">{formatTanggal(periodStart, 'd MMM yyyy')}{periodEnd ? ` – ${formatTanggal(periodEnd, 'd MMM yyyy')}` : ''}</td></tr>
                )}
              </tbody>
            </table>
          </section>

          {/* Items */}
          <table className="w-full mt-6 border-collapse">
            <thead>
              <tr className="border-y-2 border-blue-700 text-[11px] uppercase tracking-wider text-blue-800">
                <th className="text-left py-2 w-8">No</th>
                <th className="text-left py-2">Keterangan</th>
                <th className="text-right py-2 w-14">Qty</th>
                <th className="text-right py-2 w-32">Harga</th>
                <th className="text-right py-2 w-32">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-b border-stone-200 align-top">
                  <td className="py-2">{i + 1}</td>
                  <td className="py-2">
                    {it.description || ITEM_TYPE[it.type] || '-'}
                    {it.description && it.type && <span className="block text-[11px] text-stone-400">{ITEM_TYPE[it.type]}</span>}
                  </td>
                  <td className="py-2 text-right">{it.quantity}</td>
                  <td className="py-2 text-right">{formatRupiah(it.unitPrice)}</td>
                  <td className="py-2 text-right">{formatRupiah(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <section className="flex justify-between gap-6 mt-4">
            <div className="flex-1 pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">Terbilang</p>
              <p className="italic text-stone-700">{terbilang(total)}</p>
              {/* Status stamp */}
              <div className={`inline-block mt-5 ml-4 rotate-[-8deg] border-4 rounded-lg px-4 py-1 text-lg font-extrabold tracking-widest opacity-75 ${stamp.cls}`}>
                {stamp.label}
              </div>
            </div>
            <table className="w-72 text-sm">
              <tbody>
                <tr><td className="py-0.5 text-stone-500">Subtotal</td><td className="py-0.5 text-right">{formatRupiah(subtotal)}</td></tr>
                {!!invoice.discountAmount && <tr><td className="py-0.5 text-stone-500">Diskon{(invoice as Invoice & { discountNote?: string }).discountNote ? ` (${(invoice as Invoice & { discountNote?: string }).discountNote})` : ''}</td><td className="py-0.5 text-right">−{formatRupiah(invoice.discountAmount)}</td></tr>}
                {!!invoice.taxAmount && <tr><td className="py-0.5 text-stone-500">Pajak</td><td className="py-0.5 text-right">{formatRupiah(invoice.taxAmount)}</td></tr>}
                <tr className="border-t-2 border-blue-700 font-bold text-blue-800"><td className="pt-1.5">Total</td><td className="pt-1.5 text-right">{formatRupiah(total)}</td></tr>
                <tr><td className="py-0.5 text-stone-500">Sudah dibayar</td><td className="py-0.5 text-right">{formatRupiah(paid)}</td></tr>
                <tr className="font-semibold"><td className="py-0.5">Sisa tagihan</td><td className="py-0.5 text-right">{formatRupiah(outstanding)}</td></tr>
              </tbody>
            </table>
          </section>

          {/* Payment history */}
          {payments.length > 0 && (
            <section className="mt-6 break-inside-avoid">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 mb-1">Riwayat pembayaran</p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-300 text-stone-500">
                    <th className="text-left py-1">Tanggal</th><th className="text-left py-1">Metode</th><th className="text-right py-1">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-stone-100">
                      <td className="py-1">{formatTanggal(toDateSafe(p.paidAt), 'd MMM yyyy')}</td>
                      <td className="py-1">{p.method ? METHOD[p.method] ?? p.method : '-'}</td>
                      <td className="py-1 text-right">{formatRupiah(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {invoice.notes && (
            <section className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">Catatan</p>
              <p className="text-stone-700 whitespace-pre-line">{invoice.notes}</p>
            </section>
          )}

          {/* Signature */}
          <section className="mt-10 flex justify-end break-inside-avoid">
            <div className="text-center w-56">
              <p className="text-xs text-stone-500">{[city, issued && formatTanggal(issued)].filter(Boolean).join(', ')}</p>
              <p className="text-xs text-stone-500">Hormat kami,</p>
              <div className="h-16" />
              <p className="border-t border-stone-400 pt-1 text-xs font-medium">{org?.name || 'Admin'}</p>
            </div>
          </section>

          <footer className="mt-8 pt-3 border-t border-stone-200 text-[10px] text-stone-400 text-center">
            Terima kasih atas kepercayaan Anda kepada {org?.name || 'kami'}.
          </footer>
        </article>
      </div>
    </>
  );
}
