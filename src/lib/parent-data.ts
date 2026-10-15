// Shared helpers for the parent portal (dashboard, laporan-harian-saya, kehadiran-saya, tagihan-saya).
// Everything here reads the SAME schema the staff pages write (src/types/index.ts), so the
// parent views never drift from what caregivers / finance actually save.
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toDateSafe } from '@/lib/utils';
import type { Child, DailyReport, Invoice, AttendanceStatus, InvoiceStatus } from '@/types';

/** Children linked to this parent account (organizations/{org}/children.parentUserId). */
export async function loadMyChildren(organizationId: string, uid: string): Promise<Child[]> {
  const snap = await getDocs(query(
    collection(db, 'organizations', organizationId, 'children'),
    where('parentUserId', '==', uid),
    where('status', '==', 'active'),
    orderBy('fullName'),
  ));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Child);
}

export const MOOD_INFO: Record<string, { label: string; emoji: string }> = {
  sangat_baik: { label: 'Sangat Baik', emoji: '😄' },
  baik: { label: 'Baik', emoji: '😊' },
  biasa: { label: 'Biasa', emoji: '😐' },
  rewel: { label: 'Rewel', emoji: '😔' },
  sakit: { label: 'Sakit', emoji: '🤒' },
};

const MEAL_LABEL: Record<string, string> = {
  sarapan: 'Sarapan', makan_siang: 'Makan siang', snack: 'Snack', makan_malam: 'Makan malam', susu: 'Susu',
};
const QTY_LABEL: Record<string, string> = { habis: 'habis', sebagian: 'setengah', tidak_makan: 'tidak makan' };

export interface ReportSummary {
  mood?: { label: string; emoji: string };
  meals?: string;
  nap?: string;
  hygiene?: string;
  activities?: string;
  medication?: string;
  notes?: string;
  photoUrls: string[];
}

/** Turn a caregiver DailyReport into human-readable lines for parents. */
export function summarizeReport(r: Partial<DailyReport>): ReportSummary {
  const meals = (r.meals ?? [])
    .map((m) => `${MEAL_LABEL[m.type] ?? m.type}${m.menu ? ` (${m.menu})` : ''}: ${QTY_LABEL[m.quantity] ?? m.quantity}`)
    .join(' · ');
  const napStart = toDateSafe(r.napStart);
  const napEnd = toDateSafe(r.napEnd);
  const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const nap = napStart ? `Tidur ${hhmm(napStart)}${napEnd ? `–${hhmm(napEnd)}` : ''}` : undefined;
  const hygieneParts = [
    r.toiletVisits ? `${r.toiletVisits}x ke toilet` : '',
    r.diaperChanges ? `${r.diaperChanges}x ganti popok` : '',
  ].filter(Boolean);
  const med = (r.medicationRecords ?? []).map((m) => `${m.medicationName}${m.dosage ? ` ${m.dosage}` : ''} (${m.time})`).join(', ');
  return {
    mood: r.mood ? MOOD_INFO[r.mood] ?? { label: r.mood, emoji: '🙂' } : undefined,
    meals: meals || undefined,
    nap,
    hygiene: hygieneParts.join(', ') || undefined,
    activities: Array.isArray(r.activities) ? r.activities.join(', ') || undefined : (r.activities as unknown as string) || undefined,
    medication: med || undefined,
    notes: r.parentVisibleNotes || r.caregiverNotes || undefined,
    photoUrls: r.photoUrls ?? [],
  };
}

export const ATTENDANCE_INFO: Record<AttendanceStatus, { label: string; dot: string; cell: string; badge: 'success' | 'danger' | 'info' | 'warning' | 'secondary'; bg: string; text: string }> = {
  hadir:       { label: 'Hadir',       dot: 'bg-emerald-500', cell: 'bg-emerald-100 text-emerald-700', badge: 'success',   bg: 'bg-emerald-50', text: 'text-emerald-600' },
  tidak_hadir: { label: 'Tidak Hadir', dot: 'bg-red-400',     cell: 'bg-red-100 text-red-600',         badge: 'danger',    bg: 'bg-red-50',     text: 'text-red-600' },
  izin:        { label: 'Izin',        dot: 'bg-blue-400',    cell: 'bg-blue-100 text-blue-600',       badge: 'info',      bg: 'bg-blue-50',    text: 'text-blue-600' },
  sakit:       { label: 'Sakit',       dot: 'bg-amber-400',   cell: 'bg-amber-100 text-amber-600',     badge: 'warning',   bg: 'bg-amber-50',   text: 'text-amber-600' },
  libur:       { label: 'Libur',       dot: 'bg-stone-300',   cell: 'bg-stone-100 text-stone-500',     badge: 'secondary', bg: 'bg-stone-50',   text: 'text-stone-500' },
};

/** Invoice amounts/labels normalised across old and new field names. */
export function invoiceView(inv: Partial<Invoice> & { amount?: number; description?: string; childName?: string }) {
  const total = inv.totalAmount ?? inv.amount ?? 0;
  const outstanding = inv.outstandingAmount ?? Math.max(0, total - (inv.paidAmount ?? 0));
  const due = toDateSafe(inv.dueDate);
  const status = effectiveInvoiceStatus(inv.status ?? 'sent', due, outstanding);
  return {
    total,
    paid: inv.paidAmount ?? Math.max(0, total - outstanding),
    outstanding,
    due,
    status,
    title: inv.items?.[0]?.description || inv.description || 'Tagihan',
  };
}

/** sent/partial invoices past their due date are shown as overdue even if not yet flagged in DB. */
export function effectiveInvoiceStatus(status: InvoiceStatus, due: Date | null, outstanding: number): InvoiceStatus {
  if (status === 'paid' || status === 'cancelled' || status === 'draft') return status;
  if (outstanding <= 0) return 'paid';
  if (due) {
    const endOfDue = new Date(due); endOfDue.setHours(23, 59, 59, 999);
    if (endOfDue.getTime() < Date.now()) return 'overdue';
  }
  return status;
}
