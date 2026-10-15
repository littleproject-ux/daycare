import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

// ─── Tailwind class merging ──────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency ────────────────────────────────────────────────────────────────
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Date ────────────────────────────────────────────────────────────────────
export function formatTanggal(
  date: Date | Timestamp | string | null | undefined,
  fmt = 'd MMMM yyyy'
): string {
  if (!date) return '-';
  const d =
    date instanceof Timestamp
      ? date.toDate()
      : typeof date === 'string'
      ? new Date(date)
      : date;
  return format(d, fmt, { locale: id });
}

export function formatTanggalPendek(date: Date | Timestamp | string | null | undefined): string {
  return formatTanggal(date, 'dd/MM/yyyy');
}

export function formatWaktu(date: Date | Timestamp | null | undefined): string {
  if (!date) return '-';
  const d = date instanceof Timestamp ? date.toDate() : date;
  return format(d, 'HH:mm', { locale: id });
}

export function formatRelative(date: Date | Timestamp | null | undefined): string {
  if (!date) return '-';
  const d = date instanceof Timestamp ? date.toDate() : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: id });
}

export function timestampToDate(ts: Timestamp | undefined | null): Date | null {
  return ts ? ts.toDate() : null;
}

export function dateToYMD(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// ─── Age calculation ─────────────────────────────────────────────────────────
export function hitungUmur(
  dateOfBirth: Date | Timestamp | null | undefined
): string {
  if (!dateOfBirth) return '-';
  const dob =
    dateOfBirth instanceof Timestamp ? dateOfBirth.toDate() : dateOfBirth;
  const now = new Date();
  const totalMonths =
    (now.getFullYear() - dob.getFullYear()) * 12 +
    (now.getMonth() - dob.getMonth());
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) return `${months} bulan`;
  if (months === 0) return `${years} tahun`;
  return `${years} tahun ${months} bulan`;
}

export function hitungUmurBulan(dateOfBirth: Date | Timestamp): number {
  const dob =
    dateOfBirth instanceof Timestamp ? dateOfBirth.toDate() : dateOfBirth;
  const now = new Date();
  return (
    (now.getFullYear() - dob.getFullYear()) * 12 +
    (now.getMonth() - dob.getMonth())
  );
}

// ─── String helpers ───────────────────────────────────────────────────────────
export function inisial(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Number helpers ───────────────────────────────────────────────────────────
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('id-ID').format(n);
}

// ─── Invoice number ───────────────────────────────────────────────────────────
export function generateInvoiceNumber(prefix: string, next: number): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const seq = String(next).padStart(4, '0');
  return `${prefix}/${year}/${month}/${seq}`;
}

// ─── File helpers ─────────────────────────────────────────────────────────────
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function isPdfFile(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}
