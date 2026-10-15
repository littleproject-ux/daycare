import { Timestamp } from 'firebase/firestore';

// ─── Roles & Permissions ────────────────────────────────────────────────────
export type UserRole =
  | 'owner'
  | 'admin'
  | 'finance'
  | 'caregiver'
  | 'parent'
  | 'auditor';

export interface Permission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
}

// ─── Organization ────────────────────────────────────────────────────────────
export interface Organization {
  id: string;
  name: string;
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  timezone: string; // default: 'Asia/Jakarta'
  currency: string; // default: 'IDR'
  operatingHours: {
    open: string; // e.g. "07:00"
    close: string; // e.g. "17:00"
  };
  workDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  invoicePrefix: string;
  invoiceNextNumber: number;
  ownerId: string;
  subscriptionPlan?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Branch & Room ───────────────────────────────────────────────────────────
export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  address: string;
  phone?: string;
  capacity: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Room {
  id: string;
  organizationId: string;
  branchId: string;
  name: string;
  ageGroupMin: number; // months
  ageGroupMax: number; // months
  capacity: number;
  currentOccupancy: number;
  caregiverIds: string[];
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── User & Membership ───────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  phone?: string;
  isEmailVerified: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: UserRole;
  branchIds: string[]; // assigned branches
  isActive: boolean;
  invitedBy?: string;
  invitedAt?: Timestamp;
  joinedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Child & Guardian ────────────────────────────────────────────────────────
export type ChildStatus = 'active' | 'waitlist' | 'withdrawn' | 'graduated';
export type Gender = 'L' | 'P'; // Laki-laki / Perempuan

export interface Child {
  id: string;
  organizationId: string;
  branchId: string;
  roomId: string;
  fullName: string;
  preferredName?: string;
  dateOfBirth: Timestamp;
  gender: Gender;
  photoUrl?: string;
  address?: string;
  status: ChildStatus;
  enrollmentDate?: Timestamp;
  withdrawalDate?: Timestamp;
  bloodType?: string;
  allergies: string[];
  medicalNotes?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  authorizedPickupContacts: PickupContact[];
  programId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PickupContact {
  name: string;
  phone: string;
  relation: string;
  photoUrl?: string;
}

export interface Guardian {
  id: string;
  organizationId: string;
  userId?: string; // linked Firebase user
  fullName: string;
  email: string;
  phone: string;
  address?: string;
  occupation?: string;
  relation: string; // e.g. 'Ayah', 'Ibu', 'Wali'
  isPrimary: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ChildGuardianRelation {
  id: string;
  organizationId: string;
  childId: string;
  guardianId: string;
  relation: string;
  isPrimary: boolean;
  createdAt: Timestamp;
}

// ─── Enrollment ──────────────────────────────────────────────────────────────
export type EnrollmentStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'waitlisted'
  | 'active'
  | 'withdrawn';

export interface Enrollment {
  id: string;
  organizationId: string;
  childId: string;
  branchId: string;
  roomId: string;
  programId: string;
  status: EnrollmentStatus;
  startDate: Timestamp;
  endDate?: Timestamp;
  feePlanId: string;
  notes?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  documentsStatus: 'incomplete' | 'complete' | 'verified';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Program ─────────────────────────────────────────────────────────────────
export type BillingPeriod = 'harian' | 'mingguan' | 'bulanan';

export interface Program {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  ageGroupMin: number; // months
  ageGroupMax: number; // months
  schedule: string[]; // e.g. ['Senin', 'Selasa', ...]
  checkInTime: string;
  checkOutTime: string;
  billingPeriod: BillingPeriod;
  baseFee: number;
  registrationFee: number;
  depositAmount: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Attendance ──────────────────────────────────────────────────────────────
export type AttendanceStatus =
  | 'hadir'
  | 'tidak_hadir'
  | 'izin'
  | 'sakit'
  | 'libur';

export interface Attendance {
  id: string;
  organizationId: string;
  childId: string;
  branchId: string;
  roomId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkInTime?: Timestamp;
  checkOutTime?: Timestamp;
  checkInBy?: string; // staff userId
  checkOutBy?: string;
  pickupPersonName?: string;
  pickupPersonRelation?: string;
  notes?: string;
  isLateArrival: boolean;
  isEarlyPickup: boolean;
  correctionOf?: string; // original attendance id
  correctionReason?: string;
  correctedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Daily Report ────────────────────────────────────────────────────────────
export type ReportStatus = 'draft' | 'submitted' | 'published';

export interface DailyReport {
  id: string;
  organizationId: string;
  childId: string;
  branchId: string;
  roomId: string;
  date: string; // YYYY-MM-DD
  status: ReportStatus;
  caregiverId: string;

  // Meals
  meals: MealRecord[];

  // Sleep
  napStart?: Timestamp;
  napEnd?: Timestamp;
  napNotes?: string;

  // Hygiene
  diaperChanges: number;
  toiletVisits: number;
  hygieneNotes?: string;

  // Mood & Activities
  mood: 'sangat_baik' | 'baik' | 'biasa' | 'rewel' | 'sakit';
  activities: string[];
  developmentNotes?: string;

  // Medication
  medicationRecords: MedicationRecord[];

  // Incidents
  incidents: IncidentSummary[];

  // Notes
  caregiverNotes?: string;
  parentVisibleNotes?: string;

  // Parent acknowledgment
  parentAcknowledgedAt?: Timestamp;
  parentAcknowledgedBy?: string;

  photoUrls: string[];
  publishedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MealRecord {
  time: string; // HH:mm
  type: 'sarapan' | 'makan_siang' | 'snack' | 'makan_malam' | 'susu';
  menu: string;
  quantity: 'habis' | 'sebagian' | 'tidak_makan';
  notes?: string;
}

export interface MedicationRecord {
  medicationName: string;
  dosage: string;
  time: string;
  givenBy: string;
  parentAuthorized: boolean;
  notes?: string;
}

export interface IncidentSummary {
  incidentId: string;
  type: string;
  description: string;
  time: string;
}

// ─── Staff ───────────────────────────────────────────────────────────────────
export type StaffStatus = 'aktif' | 'cuti' | 'nonaktif';

export interface Staff {
  id: string;
  organizationId: string;
  userId: string;
  branchId: string;
  fullName: string;
  email: string;
  phone: string;
  photoUrl?: string;
  role: UserRole;
  position: string; // e.g. 'Pengasuh', 'Guru', 'Kepala'
  status: StaffStatus;
  hireDate: Timestamp;
  assignedRoomIds: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  certifications: Certification[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Certification {
  name: string;
  issuedBy: string;
  issuedDate: Timestamp;
  expiryDate?: Timestamp;
  documentUrl?: string;
}

// ─── Invoice & Payment ───────────────────────────────────────────────────────
export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export interface Invoice {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  childId: string;
  guardianId: string;
  branchId: string;
  status: InvoiceStatus;
  billingPeriodStart: Timestamp;
  billingPeriodEnd: Timestamp;
  dueDate: Timestamp;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  notes?: string;
  issuedAt?: Timestamp;
  periodLocked: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  type: 'biaya_program' | 'registrasi' | 'deposit' | 'diskon' | 'denda' | 'lainnya';
}

export type PaymentMethod =
  | 'tunai'
  | 'transfer_bank'
  | 'qris'
  | 'lainnya';

export interface Payment {
  id: string;
  organizationId: string;
  invoiceId: string;
  childId: string;
  guardianId: string;
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  paymentDate: Timestamp;
  receivedBy: string;
  notes?: string;
  receiptUrl?: string;
  isRefund: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Document ────────────────────────────────────────────────────────────────
export type DocumentType =
  | 'akta_lahir'
  | 'kartu_keluarga'
  | 'foto_anak'
  | 'surat_kesehatan'
  | 'formulir_pendaftaran'
  | 'kontrak_program'
  | 'surat_izin_foto'
  | 'surat_kuasa_penjemputan'
  | 'lainnya';

export type DocumentStatus = 'pending' | 'submitted' | 'verified' | 'rejected' | 'expired';

export interface Document {
  id: string;
  organizationId: string;
  childId?: string;
  guardianId?: string;
  staffId?: string;
  type: DocumentType;
  name: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  status: DocumentStatus;
  expiryDate?: Timestamp;
  verifiedBy?: string;
  verifiedAt?: Timestamp;
  rejectionReason?: string;
  uploadedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Incident ────────────────────────────────────────────────────────────────
export type IncidentSeverity = 'ringan' | 'sedang' | 'berat' | 'darurat';
export type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Incident {
  id: string;
  organizationId: string;
  childId: string;
  branchId: string;
  roomId?: string;
  type: string; // e.g. 'Jatuh', 'Tergores', 'Demam', ...
  severity: IncidentSeverity;
  status: IncidentStatus;
  occurredAt: Timestamp;
  location: string;
  description: string;
  witnesses: string[];
  firstAidGiven: string;
  reportedBy: string;
  parentNotifiedAt?: Timestamp;
  parentNotifiedBy?: string;
  followUpActions?: string;
  resolvedAt?: Timestamp;
  resolvedBy?: string;
  photoUrls: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Notification ────────────────────────────────────────────────────────────
export type NotificationType =
  | 'kehadiran'
  | 'laporan_harian'
  | 'tagihan'
  | 'pembayaran'
  | 'dokumen'
  | 'pengumuman'
  | 'insiden'
  | 'sistem';

export interface Notification {
  id: string;
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  data?: Record<string, string>;
  createdAt: Timestamp;
}

// ─── Announcement ────────────────────────────────────────────────────────────
export interface Announcement {
  id: string;
  organizationId: string;
  branchId?: string; // null = all branches
  roomId?: string;
  title: string;
  content: string;
  authorId: string;
  isPublished: boolean;
  publishedAt?: Timestamp;
  expiresAt?: Timestamp;
  targetRoles: UserRole[];
  attachmentUrls: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Task ─────────────────────────────────────────────────────────────────────
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'rendah' | 'sedang' | 'tinggi' | 'mendesak';

export interface Task {
  id: string;
  organizationId: string;
  branchId?: string;
  title: string;
  description?: string;
  assignedTo: string[];
  createdBy: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Timestamp;
  completedAt?: Timestamp;
  completedBy?: string;
  relatedType?: string;
  relatedId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Audit Log ───────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  organizationId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Timestamp;
}

// ─── Shared / Utility ────────────────────────────────────────────────────────
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
