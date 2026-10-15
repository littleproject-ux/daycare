# 🍼 Sistem Manajemen Daycare

Platform manajemen daycare/TPA profesional berbasis web untuk Indonesia. Dibangun dengan Next.js 16, Firebase, dan Tailwind CSS v4.

---

## ✨ Fitur Utama

| Modul | Fitur |
|---|---|
| **Anak** | Pendaftaran, profil lengkap, detail per anak |
| **Kehadiran** | Input harian, rekap bulanan, export |
| **Laporan Harian** | Suhu, makan, tidur, mood, foto, catatan |
| **Keuangan** | Invoice, pembayaran, laporan pendapatan |
| **Staf** | Profil, penugasan, manajemen peran |
| **Kesehatan** | Insiden, keparahan, notifikasi darurat |
| **Komunikasi** | Pengumuman, pin, filter audiens |
| **Jadwal** | Kalender bulanan, manajemen acara |
| **Dokumen** | Upload Firebase Storage, tracking kedaluwarsa |
| **Inventaris** | Stok, mutasi, alert stok minimum |
| **Tugas** | Kanban todo/in-progress/done, prioritas |
| **Laporan** | Dashboard analitik KPI bulanan |
| **Portal Orang Tua** | Dashboard, laporan harian, kehadiran, tagihan |
| **Panduan** | 18 topik lengkap dalam Bahasa Indonesia |

---

## 🛠 Stack Teknologi

- **Framework**: Next.js 16.4.0 (App Router, Turbopack)
- **Bahasa**: TypeScript 5
- **Styling**: Tailwind CSS v4 (CSS-based config)
- **Database**: Firebase Firestore (multi-tenant)
- **Storage**: Firebase Storage
- **Auth**: Firebase Authentication
- **UI**: Radix UI + Lucide React
- **Form**: React Hook Form + Zod
- **Tanggal**: date-fns v4 (locale Indonesia)

---

## 📋 Prasyarat

- Node.js 18.17 atau lebih baru
- npm 9+ atau pnpm 8+
- Akun Firebase (gratis untuk mulai)
- Akun Vercel (untuk deployment, opsional)

---

## 🚀 Setup Lokal

### 1. Clone & Install

```bash
git clone <repo-url>
cd daycare-management
npm install
```

### 2. Setup Firebase

#### 2a. Buat Project Firebase
1. Buka [console.firebase.google.com](https://console.firebase.google.com)
2. Klik **Add project** → isi nama → nonaktifkan Google Analytics (opsional)
3. Setelah project dibuat, buka **Project Settings** → **Your apps**
4. Klik ikon **Web** (`</>`) → daftarkan app → salin konfigurasi

#### 2b. Aktifkan Layanan Firebase
Di Firebase Console:
- **Authentication** → Get started → aktifkan **Email/Password** dan **Google**
- **Firestore Database** → Create database → pilih mode **production** → pilih region `asia-southeast2` (Jakarta)
- **Storage** → Get started → pilih region `asia-southeast2`

### 3. Buat File `.env.local`

Buat file `.env.local` di root project:

```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin SDK (untuk API routes, opsional untuk MVP)
# Dapatkan dari Project Settings → Service Accounts → Generate new private key
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> **Catatan**: Nilai `NEXT_PUBLIC_*` didapat dari Firebase Console → Project Settings → Your apps → SDK setup and configuration.

### 4. Deploy Firebase Rules & Indexes

```bash
# Install Firebase CLI (sekali saja)
npm install -g firebase-tools

# Login
firebase login

# Set project
firebase use your-project-id

# Deploy Firestore rules dan indexes
firebase deploy --only firestore

# Deploy Storage rules
firebase deploy --only storage
```

### 5. Jalankan Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

Saat pertama login, wizard setup akan muncul untuk membuat organisasi daycare.

---

## 🏗 Struktur Project

```
src/
├── app/
│   ├── (auth)/              # Login, register, reset password
│   │   ├── login/
│   │   ├── register/
│   │   └── reset-password/
│   └── (dashboard)/         # Semua halaman dashboard (butuh auth)
│       ├── dashboard/        # Dashboard utama + parent portal
│       ├── anak/             # Daftar anak + detail (/anak/[id])
│       ├── kehadiran/        # Input & rekap kehadiran
│       ├── laporan-harian/   # Laporan harian pengasuh
│       ├── staf/             # Manajemen staf
│       ├── keuangan/         # Invoice & pembayaran
│       ├── kesehatan/        # Insiden kesehatan
│       ├── komunikasi/       # Pengumuman
│       ├── jadwal/           # Kalender & acara
│       ├── dokumen/          # Dokumen & upload
│       ├── inventaris/       # Stok barang
│       ├── tugas/            # Manajemen tugas
│       ├── laporan/          # Analitik & laporan
│       ├── panduan/          # Panduan pengguna
│       ├── pengaturan/       # Pengaturan organisasi
│       ├── laporan-harian-saya/  # Parent: laporan harian
│       ├── kehadiran-saya/       # Parent: kehadiran anak
│       └── tagihan-saya/         # Parent: tagihan & pembayaran
├── components/
│   ├── dashboard/
│   │   ├── onboarding-wizard.tsx  # Setup wizard pertama kali
│   │   └── parent-dashboard.tsx   # Dashboard orang tua
│   ├── layout/
│   │   ├── sidebar.tsx      # Navigasi sidebar (role-aware)
│   │   └── topbar.tsx       # Header per halaman
│   └── ui/                  # Komponen UI (Button, Badge, Card, dll.)
├── lib/
│   ├── firebase.ts          # Firebase client init
│   ├── firebase-admin.ts    # Firebase Admin SDK
│   ├── auth-context.tsx     # Auth context + role permissions
│   └── utils.ts             # Helpers (formatRupiah, formatTanggal, dll.)
└── types/                   # TypeScript type definitions
```

---

## 🔐 Peran & Hak Akses

| Peran | Deskripsi | Akses |
|---|---|---|
| `owner` | Pemilik daycare | Penuh semua fitur |
| `admin` | Administrator | Semua kecuali billing settings |
| `finance` | Staf keuangan | Keuangan + laporan |
| `caregiver` | Pengasuh | Anak, kehadiran, laporan harian |
| `parent` | Orang tua | Data anak sendiri + portal orang tua |
| `auditor` | Auditor | Read-only semua data |

---

## 🗄 Koleksi Firestore

| Koleksi | Deskripsi |
|---|---|
| `organizations` | Data organisasi daycare |
| `memberships` | Hubungan user ↔ organisasi + peran |
| `users` | Profil pengguna |
| `children` | Data anak terdaftar |
| `attendance` | Rekap kehadiran harian |
| `dailyReports` | Laporan harian per anak |
| `invoices` | Tagihan orang tua |
| `payments` | Rekam pembayaran invoice |
| `staff` | Data staf daycare |
| `healthIncidents` | Insiden kesehatan |
| `announcements` | Pengumuman |
| `events` | Jadwal & acara |
| `documents` | Metadata dokumen (file di Storage) |
| `inventory` | Data inventaris barang |
| `stockMovements` | Log mutasi stok |
| `tasks` | Tugas harian staf |

Setiap dokumen di koleksi operasional wajib memiliki field `organizationId` untuk isolasi multi-tenant.

---

## ☁️ Deploy ke Vercel

### 1. Push ke GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/username/daycare-management.git
git push -u origin main
```

### 2. Import di Vercel

1. Buka [vercel.com/new](https://vercel.com/new)
2. Import repository GitHub Anda
3. Vercel otomatis mendeteksi Next.js
4. **Tambahkan Environment Variables** — salin semua isi `.env.local` ke bagian Environment Variables di Vercel

### 3. Deploy

Klik **Deploy**. Vercel akan build dan deploy otomatis.

Setiap `git push` ke branch `main` akan trigger re-deploy otomatis.

### 4. Custom Domain (opsional)

Di Vercel Dashboard → Settings → Domains → tambahkan domain Anda.

---

## 🔧 Firebase Security Rules

Rules sudah dikonfigurasi di `firestore.rules` dan `storage.rules`:

**Firestore**: Akses dibatasi per organisasi. User hanya bisa baca/tulis data dengan `organizationId` yang sama dengan miliknya.

**Storage**: 
- Read: semua member organisasi
- Write: staf aktif (owner/admin/finance/caregiver), maks 10 MB
- Delete: admin/owner saja
- Format yang diizinkan: gambar (JPG/PNG/WebP), PDF, dokumen Office

---

## 📦 Scripts

```bash
npm run dev        # Development server dengan Turbopack
npm run build      # Build production
npm run start      # Jalankan build production
npm run lint       # Lint dengan ESLint
npx tsc --noEmit   # Cek TypeScript tanpa build
```

---

## 🌐 Konfigurasi Firebase CLI (opsional tapi dianjurkan)

Simpan Project ID agar tidak perlu `firebase use` setiap saat:

```bash
# .firebaserc (sudah ada jika pernah run firebase init)
{
  "projects": {
    "default": "your-project-id"
  }
}
```

---

## 🐛 Troubleshooting

### Build gagal: `auth/invalid-api-key`
Normal terjadi saat build di mesin lokal tanpa `.env.local`. Di Vercel, pastikan semua env variable sudah diisi.

### Firestore: `PERMISSION_DENIED`
Deploy ulang security rules: `firebase deploy --only firestore:rules`

### Storage upload gagal
1. Cek Storage rules sudah di-deploy
2. Pastikan CORS Storage sudah dikonfigurasi (lihat [Firebase Storage CORS](https://firebase.google.com/docs/storage/web/download-files#cors_configuration))

### Halaman tidak muncul setelah login
Pastikan membership document sudah ada di koleksi `memberships` dengan `userId` dan `organizationId` yang benar, dan `isActive: true`.

---

## 📄 Lisensi

MIT License — bebas digunakan dan dimodifikasi untuk kebutuhan komersial maupun pribadi.

---

*Dibuat dengan ❤️ untuk daycare Indonesia*
