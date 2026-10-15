// Shared finance constants/helpers (keuangan page, print invoice, parent portal).
import type { InvoiceItem, InvoiceStatus } from '@/types';

export const ITEM_TYPES: { value: InvoiceItem['type']; label: string }[] = [
  { value: 'biaya_program', label: 'SPP / Biaya Program' },
  { value: 'makan', label: 'Makan' },
  { value: 'kegiatan', label: 'Kegiatan' },
  { value: 'antar_jemput', label: 'Antar-jemput' },
  { value: 'perlengkapan', label: 'Perlengkapan' },
  { value: 'registrasi', label: 'Registrasi' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'denda', label: 'Denda' },
  { value: 'lainnya', label: 'Lainnya' },
];

export const ITEM_TYPE_LABEL: Record<string, string> = Object.fromEntries(ITEM_TYPES.map((t) => [t.value, t.label]));

/** Quick-add templates in the invoice form */
export const ITEM_PRESETS: { label: string; item: Omit<InvoiceItem, 'amount'> }[] = [
  { label: 'SPP Bulanan', item: { type: 'biaya_program', description: 'SPP Bulanan', quantity: 1, unitPrice: 0 } },
  { label: 'Makan Siang', item: { type: 'makan', description: 'Makan siang', quantity: 20, unitPrice: 0 } },
  { label: 'Snack', item: { type: 'makan', description: 'Snack', quantity: 20, unitPrice: 0 } },
  { label: 'Registrasi', item: { type: 'registrasi', description: 'Biaya registrasi', quantity: 1, unitPrice: 0 } },
  { label: 'Kegiatan', item: { type: 'kegiatan', description: 'Kegiatan / field trip', quantity: 1, unitPrice: 0 } },
  { label: 'Denda', item: { type: 'denda', description: 'Denda keterlambatan jemput', quantity: 1, unitPrice: 0 } },
];

export const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: 'tunai', label: 'Tunai' },
  { value: 'transfer_bank', label: 'Transfer Bank' },
  { value: 'qris', label: 'QRIS' },
  { value: 'lainnya', label: 'Lainnya' },
];

export const METHOD_LABEL: Record<string, string> = {
  ...Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label])),
  transfer: 'Transfer', // legacy
};

/** Status after a change in total/paid. Cancelled/draft are kept as-is. */
export function recalcInvoice(total: number, paid: number, current?: InvoiceStatus) {
  const outstanding = Math.max(0, Math.round(total - paid));
  let status: InvoiceStatus;
  if (current === 'cancelled' || current === 'draft') status = current;
  else if (outstanding <= 0) status = 'paid';
  else if (paid > 0) status = 'partial';
  else status = 'sent';
  return { outstanding, status };
}

/** PREFIX/yyyy/MM/0001 — next sequence for the given month, based on existing numbers. */
export function nextInvoiceNumber(prefix: string, existing: string[], date = new Date()) {
  const base = `${prefix || 'INV'}/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/`;
  const max = existing
    .filter((n) => n?.startsWith(base))
    .map((n) => parseInt(n.slice(base.length), 10))
    .filter((n) => !isNaN(n))
    .reduce((m, n) => Math.max(m, n), 0);
  return base + String(max + 1).padStart(4, '0');
}
