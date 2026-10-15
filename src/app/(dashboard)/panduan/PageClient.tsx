'use client';

import React, { useMemo, useState } from 'react';
import { Topbar } from '@/components/layout/topbar';
import {
  BookOpen, ChevronRight, ChevronDown, Home, LogIn, Users, Building2, Baby, CalendarCheck, FileText,
  Receipt, FolderOpen, MessageSquare, BarChart3, Settings, HelpCircle, ShieldCheck, AlertTriangle,
  CheckCircle2, Info, ClipboardList, CalendarDays, CheckSquare, HeartPulse, Package, Wallet, CreditCard,
  Printer, Bell, LayoutDashboard, UserPlus, Lightbulb, Search, X, Rocket, Smartphone, Heart,
} from 'lucide-react';

// ─── Building blocks ─────────────────────────────────────────────────────────
type Block =
  | { t: 'p'; text: React.ReactNode }
  | { t: 'h'; text: string }
  | { t: 'steps'; items: { title: React.ReactNode; desc?: React.ReactNode }[] }
  | { t: 'list'; items: React.ReactNode[] }
  | { t: 'fields'; rows: [string, React.ReactNode][] }
  | { t: 'table'; head: string[]; rows: React.ReactNode[][] }
  | { t: 'tip'; text: React.ReactNode }
  | { t: 'warn'; text: React.ReactNode }
  | { t: 'info'; text: React.ReactNode };

interface Topic {
  id: string;
  group: string;
  icon: React.ReactNode;
  title: string;
  menu?: string;          // breadcrumb of where to find it
  keywords?: string;      // extra search terms
  blocks: Block[];
}

const M = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-md bg-stone-100 px-1.5 py-0.5 text-[12px] font-medium text-stone-700">{children}</span>
);
const B = ({ children }: { children: React.ReactNode }) => <strong className="text-stone-800">{children}</strong>;

function RenderBlock({ b }: { b: Block }) {
  switch (b.t) {
    case 'p': return <p>{b.text}</p>;
    case 'h': return <h3 className="text-sm font-semibold text-stone-800 pt-2">{b.text}</h3>;
    case 'list':
      return <ul className="ml-5 list-disc space-y-1">{b.items.map((x, i) => <li key={i}>{x}</li>)}</ul>;
    case 'steps':
      return (
        <ol className="space-y-2.5">
          {b.items.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-coral-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
              <div>
                <p className="font-medium text-stone-800">{s.title}</p>
                {s.desc && <div className="text-stone-500 mt-0.5">{s.desc}</div>}
              </div>
            </li>
          ))}
        </ol>
      );
    case 'fields':
      return (
        <div className="rounded-xl border border-stone-100 overflow-hidden">
          {b.rows.map(([k, v], i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-3 px-3 py-2 even:bg-stone-50/60">
              <span className="font-medium text-stone-700">{k}</span>
              <span className="text-stone-600">{v}</span>
            </div>
          ))}
        </div>
      );
    case 'table':
      return (
        <div className="overflow-x-auto rounded-xl border border-stone-100">
          <table className="w-full text-xs min-w-[520px]">
            <thead className="bg-stone-50 text-stone-500">
              <tr>{b.head.map((h, i) => <th key={i} className="text-left px-3 py-2 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i} className="border-t border-stone-100">{r.map((c, j) => <td key={j} className="px-3 py-2 align-top">{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'tip':
      return <Callout tone="tip" icon={<Lightbulb className="h-4 w-4" />}>{b.text}</Callout>;
    case 'warn':
      return <Callout tone="warn" icon={<AlertTriangle className="h-4 w-4" />}>{b.text}</Callout>;
    case 'info':
      return <Callout tone="info" icon={<Info className="h-4 w-4" />}>{b.text}</Callout>;
  }
}

function Callout({ tone, icon, children }: { tone: 'tip' | 'warn' | 'info'; icon: React.ReactNode; children: React.ReactNode }) {
  const cls = tone === 'tip' ? 'bg-emerald-50 text-emerald-800' : tone === 'warn' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800';
  return <div className={`flex gap-2.5 rounded-xl p-3 ${cls}`}><span className="mt-0.5 shrink-0">{icon}</span><div>{children}</div></div>;
}

const Y = <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
const N = <span className="text-stone-300">—</span>;

// ─── Content ────────────────────────────────────────────────────────────────
const topics: Topic[] = [
  // ════ MEMULAI ════
  {
    id: 'pengenalan', group: 'Memulai', icon: <Home className="h-5 w-5" />, title: 'Pengenalan Sistem',
    keywords: 'fitur menu tentang aplikasi',
    blocks: [
      { t: 'p', text: <><B>Sistem Manajemen Daycare</B> membantu pengelola tempat penitipan anak mencatat data anak, kehadiran, laporan harian, keuangan, staf, hingga komunikasi dengan orang tua — semuanya di satu tempat dan bisa dibuka dari komputer maupun HP.</> },
      { t: 'h', text: 'Menu yang tersedia' },
      {
        t: 'table', head: ['Kelompok', 'Menu', 'Kegunaan'], rows: [
          ['Utama', 'Dashboard', 'Ringkasan hari ini: anak aktif, kehadiran, tagihan, peringatan, jadwal, kapasitas ruangan'],
          ['Anak & Staf', 'Data Anak, Pendaftaran, Data Staf, Ruangan', 'Data master anak, antrian pendaftar, data pegawai, kelas/ruangan'],
          ['Operasional', 'Kehadiran, Laporan Harian, Jadwal & Acara, Tugas', 'Kegiatan harian pengasuh dan admin'],
          ['Kesehatan & Dokumen', 'Kesehatan, Dokumen', 'Catatan insiden kesehatan dan arsip dokumen/perizinan'],
          ['Keuangan', 'Keuangan, Inventaris', 'Tagihan, pembayaran, cetak invoice, stok barang'],
          ['Komunikasi', 'Komunikasi, Laporan', 'Pengumuman dan laporan bulanan + ekspor'],
          ['Lainnya', 'Pengaturan, Panduan, Notifikasi', 'Profil daycare, panduan ini, pemberitahuan'],
        ],
      },
      { t: 'info', text: <>Menu yang muncul menyesuaikan <B>peran</B> akun Anda. Orang tua hanya melihat menu portal orang tua (Beranda, Anak Saya, Laporan Harian, Kehadiran, Tagihan, Pengumuman, Jadwal). Lihat topik <B>Peran & Hak Akses</B>.</> },
    ],
  },
  {
    id: 'akun', group: 'Memulai', icon: <LogIn className="h-5 w-5" />, title: 'Mendaftar, Masuk & Keluar',
    keywords: 'login register daftar password google lupa reset logout keluar',
    blocks: [
      { t: 'h', text: 'Membuat akun baru' },
      {
        t: 'steps', items: [
          { title: 'Buka halaman Daftar', desc: <>Di halaman masuk, klik <M>Daftar sekarang</M>.</> },
          { title: 'Isi Nama Lengkap, Email, Password, dan Konfirmasi Password' },
          { title: 'Cek email Anda', desc: 'Sistem mengirim email verifikasi. Klik tautan di email tersebut.' },
          { title: 'Lanjutkan ke Pengaturan Awal', desc: <>Akun baru yang belum terhubung ke daycare mana pun akan diarahkan ke wizard <B>Pengaturan Awal Daycare</B>.</> },
        ],
      },
      { t: 'h', text: 'Masuk' },
      { t: 'list', items: [<>Isi <B>Email</B> dan <B>Password</B>, lalu klik <M>Masuk</M>.</>, <>Atau klik <M>Masuk dengan Google</M> untuk memakai akun Google.</>] },
      { t: 'h', text: 'Lupa password' },
      { t: 'steps', items: [{ title: <>Klik <M>Lupa password?</M> di halaman masuk</> }, { title: 'Masukkan email akun Anda' }, { title: 'Buka email reset dan buat password baru' }] },
      { t: 'h', text: 'Keluar' },
      { t: 'p', text: <>Klik ikon keluar (panah) pada kartu nama Anda di bagian bawah sidebar.</> },
      { t: 'warn', text: 'Jangan berbagi satu akun untuk beberapa orang. Setiap pengguna sebaiknya punya akun sendiri supaya riwayat siapa yang mencatat tetap jelas.' },
    ],
  },
  {
    id: 'setup', group: 'Memulai', icon: <Rocket className="h-5 w-5" />, title: 'Pengaturan Awal Daycare',
    keywords: 'onboarding wizard setup mulai pertama kali checklist',
    blocks: [
      { t: 'p', text: 'Saat pertama kali masuk, pemilik daycare mengisi wizard 2 langkah:' },
      {
        t: 'steps', items: [
          { title: 'Langkah 1 — Profil daycare', desc: 'Nama Daycare, Alamat Lengkap, Nomor Telepon, Email, dan Website (opsional).' },
          { title: 'Langkah 2 — Operasional', desc: <>Jam Buka, Jam Tutup, Hari Operasional, dan <B>Awalan Nomor Invoice</B> (huruf kapital/angka, mis. <M>INV</M>). Klik selesai — akun Anda otomatis menjadi <B>Pemilik (Owner)</B>.</> },
        ],
      },
      { t: 'h', text: 'Urutan setup yang disarankan' },
      {
        t: 'steps', items: [
          { title: 'Ruangan', desc: <>Buat kelas/ruangan di menu <M>Ruangan</M> (mis. Kelas Bayi 3–18 bulan, Kelas Balita 18–48 bulan).</> },
          { title: 'Data Staf', desc: <>Catat pengasuh, guru, dan staf di menu <M>Data Staf</M>.</> },
          { title: 'Data Anak', desc: <>Masukkan anak yang sudah aktif di <M>Data Anak</M>, sekalian pilih ruangannya. Calon anak baru masukkan lewat <M>Pendaftaran</M>.</> },
          { title: 'Mulai operasional', desc: 'Catat kehadiran setiap pagi, isi laporan harian, dan buat tagihan bulanan.' },
        ],
      },
      { t: 'tip', text: <>Semua data di wizard bisa diubah kapan saja lewat menu <M>Pengaturan</M>.</> },
    ],
  },
  {
    id: 'peran', group: 'Memulai', icon: <ShieldCheck className="h-5 w-5" />, title: 'Peran & Hak Akses',
    keywords: 'role owner admin pengasuh caregiver keuangan finance auditor orang tua parent izin permission',
    blocks: [
      { t: 'p', text: 'Setiap akun punya satu peran. Peran menentukan menu yang terlihat dan tombol yang bisa dipakai.' },
      {
        t: 'table', head: ['Kemampuan', 'Pemilik', 'Admin', 'Keuangan', 'Pengasuh', 'Auditor', 'Orang Tua'], rows: [
          ['Melihat data', Y, Y, Y, Y, Y, 'Anak sendiri'],
          ['Data anak & pendaftaran (tambah/edit)', Y, Y, N, 'Edit saja', N, N],
          ['Kehadiran, laporan harian, kesehatan', Y, Y, N, Y, N, N],
          ['Staf, ruangan, jadwal, pengumuman, inventaris', Y, Y, N, N, N, N],
          ['Tugas: membuat & menghapus', Y, Y, N, 'Ubah status', N, N],
          ['Tagihan & pembayaran', Y, Y, Y, N, N, 'Lihat & cetak'],
          ['Menghapus data (anak, staf, laporan, dll.)', Y, Y, N, N, N, N],
          ['Ekspor laporan', Y, Y, Y, N, Y, N],
          ['Pengaturan daycare', Y, Y, N, N, N, N],
        ],
      },
      { t: 'info', text: 'Tombol yang tidak sesuai peran Anda otomatis disembunyikan. Jika tombol yang Anda butuhkan tidak muncul, minta pemilik/admin mengubah peran akun Anda.' },
    ],
  },
  {
    id: 'pengguna', group: 'Memulai', icon: <UserPlus className="h-5 w-5" />, title: 'Menambah Akun Staf & Orang Tua',
    keywords: 'undang invite akun login staf orang tua hubungkan link parentUserId membership firebase',
    blocks: [
      { t: 'warn', text: <>Saat ini aplikasi <B>belum memiliki fitur undangan</B>. Menambah staf di menu <M>Data Staf</M> hanya mencatat data kepegawaian — <B>tidak</B> otomatis membuatkan akun login. Orang yang mendaftar sendiri akan diarahkan membuat daycare baru.</> },
      { t: 'p', text: 'Sampai fitur undangan tersedia, pemilik dapat menghubungkan akun secara manual lewat Firebase Console:' },
      {
        t: 'steps', items: [
          { title: 'Minta orang tersebut mendaftar akun', desc: 'Lewat halaman Daftar. Abaikan wizard daycare baru yang muncul (jangan diselesaikan).' },
          { title: 'Catat UID akunnya', desc: <>Firebase Console → Authentication → Users → salin kolom <M>User UID</M>.</> },
          {
            title: 'Buat dokumen membership', desc: <>Firestore → koleksi <M>memberships</M> → Add document dengan field: <M>userId</M> = UID tadi, <M>organizationId</M> = ID daycare Anda, <M>role</M> = <M>admin</M>/<M>caregiver</M>/<M>finance</M>/<M>auditor</M>/<M>parent</M>, <M>isActive</M> = true (boolean), <M>branchIds</M> = array kosong.</>,
          },
          { title: 'Khusus orang tua: hubungkan ke anaknya', desc: <>Firestore → <M>organizations/&#123;ID daycare&#125;/children/&#123;ID anak&#125;</M> → tambahkan field <M>parentUserId</M> = UID orang tua.</> },
          { title: 'Minta pengguna keluar lalu masuk lagi', desc: 'Menu dan aksesnya akan langsung menyesuaikan peran.' },
        ],
      },
      { t: 'info', text: <>ID daycare (organizationId) bisa dilihat di Firestore pada koleksi <M>organizations</M>, atau di dokumen membership milik akun pemilik.</> },
      { t: 'tip', text: 'Setelah anak terhubung, kehadiran, laporan harian, tagihan, dan pembayaran yang dicatat sesudahnya otomatis bisa dilihat orang tua.' },
    ],
  },
  {
    id: 'navigasi', group: 'Memulai', icon: <Smartphone className="h-5 w-5" />, title: 'Navigasi & Penggunaan di HP',
    keywords: 'sidebar menu hp mobile ciutkan collapse cari search notifikasi lonceng',
    blocks: [
      {
        t: 'list', items: [
          <>Di komputer, <B>sidebar</B> menu ada di kiri. Klik tombol bulat kecil di tepi sidebar untuk menciutkan/melebarkan.</>,
          <>Di HP, buka menu dengan tombol <M>☰</M> di kiri atas. Menu tertutup otomatis setelah Anda memilih halaman.</>,
          <>Ikon <M>🔍</M> di kanan atas untuk mencari anak, staf, tagihan, dokumen, atau barang.</>,
          <>Ikon <M>🔔</M> membuka halaman Notifikasi.</>,
          <>Tabel lebar (inventaris, item tagihan) dan deretan tab bisa digeser ke samping di layar kecil.</>,
        ],
      },
      { t: 'tip', text: 'Aplikasi bisa dipasang seperti aplikasi di HP: buka di Chrome → menu ⋮ → "Tambahkan ke layar utama".' },
    ],
  },

  // ════ DATA MASTER ════
  {
    id: 'dashboard', group: 'Ringkasan', icon: <LayoutDashboard className="h-5 w-5" />, title: 'Dashboard', menu: 'Dashboard',
    keywords: 'beranda ringkasan statistik perlu perhatian kapasitas',
    blocks: [
      { t: 'p', text: 'Dashboard menampilkan kondisi daycare hari ini, dihitung langsung dari data:' },
      {
        t: 'fields', rows: [
          ['Anak Aktif', 'Jumlah anak berstatus Aktif + jumlah pendaftar yang menunggu persetujuan.'],
          ['Hadir Hari Ini', 'Anak aktif yang tercatat Hadir hari ini.'],
          ['Tagihan Belum Lunas', 'Total sisa tagihan yang belum dibayar (hanya terlihat oleh peran yang boleh melihat keuangan).'],
          ['Staf Aktif', 'Jumlah staf berstatus aktif dan yang sedang cuti.'],
          ['Kehadiran Hari Ini', 'Daftar 6 anak pertama beserta jam masuk dan statusnya.'],
          ['Perlu Perhatian', 'Tagihan lewat jatuh tempo, dokumen yang kadaluarsa ≤ 30 hari, insiden kesehatan 7 hari terakhir yang belum diberitahukan ke orang tua, stok menipis, dan pendaftar yang menunggu. Klik untuk langsung ke menunya.'],
          ['Jadwal Hari Ini', 'Acara dari menu Jadwal yang berlangsung hari ini.'],
          ['Kapasitas Ruangan', 'Jumlah anak aktif per ruangan dibanding kapasitasnya.'],
        ],
      },
    ],
  },
  {
    id: 'ruangan', group: 'Data Master', icon: <Building2 className="h-5 w-5" />, title: 'Ruangan / Kelas', menu: 'Anak & Staf → Ruangan',
    keywords: 'kelas ruang kapasitas usia emoji warna okupansi',
    blocks: [
      { t: 'h', text: 'Menambah ruangan' },
      { t: 'steps', items: [{ title: 'Klik Tambah Ruangan' }, { title: 'Isi data lalu Simpan' }] },
      {
        t: 'fields', rows: [
          ['Nama Ruangan *', 'Mis. Kelas Bayi, Kelas Balita.'],
          ['Usia Min / Maks (bulan)', 'Rentang usia anak di kelas ini.'],
          ['Kapasitas', 'Jumlah anak maksimal.'],
          ['Emoji & Warna', 'Penanda visual di dashboard.'],
          ['Ruangan aktif', 'Matikan jika ruangan sementara tidak dipakai.'],
        ],
      },
      { t: 'p', text: 'Untuk mengubah atau menghapus, gunakan tombol edit / hapus pada kartu ruangan.' },
      { t: 'info', text: <>Jumlah &ldquo;terisi&rdquo; dihitung otomatis dari anak berstatus Aktif yang dipilih ruangannya di form <M>Data Anak</M>.</> },
    ],
  },
  {
    id: 'anak', group: 'Data Master', icon: <Baby className="h-5 w-5" />, title: 'Data Anak', menu: 'Anak & Staf → Data Anak',
    keywords: 'anak tambah edit hapus status lulus keluar alergi golongan darah kontak darurat detail',
    blocks: [
      { t: 'h', text: 'Menambah anak' },
      { t: 'steps', items: [{ title: 'Klik Tambah Anak' }, { title: 'Isi formulir, lalu klik Simpan Data Anak', desc: 'Anak yang ditambahkan dari sini langsung berstatus Aktif.' }] },
      {
        t: 'fields', rows: [
          ['Nama Lengkap *', 'Sesuai akta lahir.'],
          ['Nama Panggilan', 'Nama sehari-hari (tampil di portal orang tua).'],
          ['Tanggal Lahir *', 'Dipakai untuk menghitung usia.'],
          ['Jenis Kelamin *', 'Laki-laki / Perempuan.'],
          ['Golongan Darah', 'A, B, AB, O, atau tidak diketahui.'],
          ['Ruangan / Kelas', 'Pilih ruangan anak. Mempengaruhi hitungan kapasitas.'],
          ['Alamat', 'Opsional.'],
          ['Alergi', 'Pisahkan dengan koma, mis. "kacang, susu sapi". Tampil sebagai peringatan kuning.'],
          ['Catatan Medis', 'Kondisi khusus, obat rutin.'],
          ['Kontak Darurat *', 'Nama, nomor telepon (min. 8 digit), dan hubungan.'],
        ],
      },
      { t: 'h', text: 'Mengubah data / status' },
      { t: 'p', text: <>Klik ikon pensil di kartu anak. Saat edit tersedia pilihan <B>Status</B>: Aktif, Daftar Tunggu, Keluar, Lulus. Anak berstatus selain Aktif tidak muncul di Kehadiran, Laporan Harian, dan pilihan tagihan baru.</> },
      { t: 'h', text: 'Menghapus' },
      { t: 'p', text: <>Buka edit → tombol <M>Hapus</M> (khusus Pemilik/Admin).</> },
      { t: 'warn', text: 'Lebih baik ubah status ke Keluar/Lulus daripada menghapus. Menghapus tidak ikut menghapus riwayat kehadiran, laporan, atau tagihan anak tersebut.' },
      { t: 'tip', text: 'Klik kartu anak untuk membuka halaman detail: profil, catatan kesehatan, kontak darurat, dan 7 laporan harian terakhir. Gunakan filter status dan kotak cari untuk menemukan anak dengan cepat.' },
    ],
  },
  {
    id: 'pendaftaran', group: 'Data Master', icon: <ClipboardList className="h-5 w-5" />, title: 'Pendaftaran', menu: 'Anak & Staf → Pendaftaran',
    keywords: 'antrian waitlist setujui tolak calon anak baru kembalikan',
    blocks: [
      { t: 'p', text: 'Menu ini untuk calon anak yang belum resmi masuk. Data pendaftar tersimpan di tempat yang sama dengan Data Anak, dengan status Daftar Tunggu.' },
      {
        t: 'steps', items: [
          { title: 'Tambah Pendaftaran Baru', desc: 'Isi data anak dan data orang tua/wali. Status otomatis "Menunggu".' },
          { title: 'Tinjau di tab Antrian', desc: <>Klik <M>Setujui</M> → anak menjadi Aktif dan muncul di semua menu operasional. Klik <M>Tolak</M> → status Keluar.</> },
          { title: 'Koreksi bila perlu', desc: <>Tombol <M>Edit</M> untuk memperbaiki data, <M>Kembalikan ke Antrian</M> untuk membatalkan persetujuan/penolakan, ikon hapus untuk menghapus.</> },
        ],
      },
      { t: 'info', text: 'Tab: Antrian, Disetujui, Ditolak/Keluar, Lulus — angka di setiap tab menunjukkan jumlah datanya.' },
    ],
  },
  {
    id: 'staf', group: 'Data Master', icon: <Users className="h-5 w-5" />, title: 'Data Staf', menu: 'Anak & Staf → Data Staf',
    keywords: 'pegawai karyawan guru pengasuh jabatan cuti nonaktif',
    blocks: [
      {
        t: 'fields', rows: [
          ['Nama Lengkap, Email, Telepon', 'Data kontak staf.'],
          ['Jabatan', 'Kepala Daycare, Koordinator, Guru, Pengasuh, Staf Keuangan, Staf Administrasi, Petugas Kebersihan, Lainnya.'],
          ['Role Sistem', 'Admin, Keuangan, atau Pengasuh — sebagai catatan peran.'],
          ['Status', 'Aktif, Cuti, Nonaktif. Hanya staf Aktif yang bisa ditugaskan di menu Tugas.'],
          ['Tanggal Bergabung, Kontak Darurat', 'Opsional.'],
        ],
      },
      { t: 'p', text: <>Ubah data dengan <M>Edit Data</M>, hapus dengan ikon tempat sampah (Pemilik/Admin).</> },
      { t: 'warn', text: <>Menambah staf di sini tidak membuatkan akun login. Lihat <B>Menambah Akun Staf & Orang Tua</B>. Untuk staf yang berhenti, ubah status ke Nonaktif agar riwayatnya tetap ada.</> },
    ],
  },

  // ════ OPERASIONAL ════
  {
    id: 'kehadiran', group: 'Operasional Harian', icon: <CalendarCheck className="h-5 w-5" />, title: 'Kehadiran (Check-in / Check-out)', menu: 'Operasional → Kehadiran',
    keywords: 'absen check in check out antar jemput izin sakit libur tidak hadir jam masuk pulang',
    blocks: [
      { t: 'p', text: 'Halaman ini menampilkan semua anak Aktif untuk tanggal yang dipilih. Gunakan tombol ‹ › untuk pindah hari, atau Hari Ini. Tanggal yang akan datang tidak bisa dibuka.' },
      { t: 'h', text: 'Check-in (anak datang)' },
      { t: 'steps', items: [{ title: <>Klik <M>Check-in</M> pada baris anak</> }, { title: 'Isi Jam Masuk, Diantar oleh, Hubungan, Catatan', desc: 'Jam otomatis terisi jam sekarang; ubah bila mencatat belakangan.' }, { title: 'Klik Konfirmasi Check-in' }] },
      { t: 'h', text: 'Check-out (anak pulang)' },
      { t: 'steps', items: [{ title: 'Klik Check-out' }, { title: 'Isi Jam Pulang dan Dijemput oleh', desc: 'Pastikan penjemput adalah orang yang berwenang.' }, { title: 'Klik Konfirmasi Check-out' }] },
      { t: 'h', text: 'Anak tidak masuk' },
      { t: 'p', text: <>Pilih dari dropdown <M>Status lain…</M>: Izin, Sakit, Tidak Hadir, atau Libur.</> },
      { t: 'h', text: 'Salah catat?' },
      { t: 'p', text: <>Klik ikon pensil pada baris anak untuk mengubah status, jam masuk/pulang, pengantar/penjemput, atau catatan. Pemilik/Admin bisa <M>Hapus Catatan</M> untuk mengembalikan ke &ldquo;belum dicatat&rdquo;.</> },
      { t: 'tip', text: 'Lupa mencatat kemarin? Mundur ke tanggal tersebut dengan tombol ‹ lalu check-in seperti biasa — jam yang tersimpan mengikuti tanggal yang dipilih.' },
    ],
  },
  {
    id: 'laporan-harian', group: 'Operasional Harian', icon: <FileText className="h-5 w-5" />, title: 'Laporan Harian Anak', menu: 'Operasional → Laporan Harian',
    keywords: 'mood suasana hati makan tidur siang toilet popok aktivitas obat catatan orang tua',
    blocks: [
      { t: 'p', text: 'Satu laporan per anak per hari, untuk dibaca orang tua di portalnya.' },
      { t: 'steps', items: [{ title: 'Pilih tanggal (default hari ini)' }, { title: 'Klik Buat pada baris anak (atau Edit jika sudah ada)' }, { title: 'Isi formulir lalu Simpan Laporan' }] },
      {
        t: 'fields', rows: [
          ['Suasana Hati', 'Sangat Baik, Baik, Biasa, Rewel, Sakit.'],
          ['Porsi Makan', 'Sarapan, Makan Siang, Snack — Habis / Setengah / Tidak Makan.'],
          ['Tidur Siang', 'Jam mulai & selesai. Boleh dikosongkan jika anak tidak tidur.'],
          ['Ke Toilet / Ganti Popok', 'Jumlah kali.'],
          ['Aktivitas', 'Pisahkan dengan koma, mis. "Mewarnai, bernyanyi".'],
          ['Pemberian Obat', 'Centang, lalu isi nama obat & dosis.'],
          ['Catatan untuk Orang Tua', 'Perkembangan atau info penting hari ini.'],
        ],
      },
      { t: 'p', text: <>Bilah <B>Progress Laporan</B> menunjukkan berapa anak yang sudah dibuatkan laporan. Pemilik/Admin bisa menghapus laporan lewat tombol <M>Hapus Laporan</M> di form edit.</> },
    ],
  },
  {
    id: 'jadwal', group: 'Operasional Harian', icon: <CalendarDays className="h-5 w-5" />, title: 'Jadwal & Acara', menu: 'Operasional → Jadwal & Acara',
    keywords: 'kalender acara libur kegiatan pertemuan field trip',
    blocks: [
      { t: 'p', text: 'Kalender bulanan. Titik berwarna di tanggal menandakan ada acara; klik tanggal untuk melihat daftarnya.' },
      {
        t: 'fields', rows: [
          ['Judul Acara *', 'Mis. Field Trip, Rapat Orang Tua.'],
          ['Jenis', 'Kegiatan (hijau), Libur (merah), Pertemuan (biru), Lainnya.'],
          ['Untuk', <>Semua, Orang tua, atau <B>Staf saja</B> (tidak terlihat oleh orang tua).</>],
          ['Lokasi', 'Opsional.'],
          ['Mulai / Selesai', 'Tanggal dan jam. Waktu selesai tidak boleh sebelum waktu mulai.'],
          ['Keterangan', 'Detail acara.'],
        ],
      },
      { t: 'p', text: 'Edit atau hapus acara lewat ikon pensil / tempat sampah pada daftar acara (Pemilik/Admin).' },
      { t: 'tip', text: 'Acara hari ini otomatis muncul di kartu "Jadwal Hari Ini" pada Dashboard.' },
    ],
  },
  {
    id: 'tugas', group: 'Operasional Harian', icon: <CheckSquare className="h-5 w-5" />, title: 'Tugas & Pengingat', menu: 'Operasional → Tugas',
    keywords: 'to do pekerjaan prioritas tenggat deadline ditugaskan selesai',
    blocks: [
      { t: 'steps', items: [{ title: 'Buat Tugas', desc: 'Judul, keterangan, prioritas (Rendah/Sedang/Tinggi), batas waktu, dan staf yang ditugaskan.' }, { title: 'Ubah status dengan klik ikon bulat di kiri tugas', desc: 'Belum Mulai → Sedang Dikerjakan → Selesai → (kembali) Belum Mulai. Semua staf bisa melakukan ini.' }, { title: 'Edit atau hapus', desc: 'Ikon pensil/tempat sampah (Pemilik/Admin). Status juga bisa dipilih langsung dari form edit.' }] },
      { t: 'info', text: 'Tugas yang belum selesai melewati batas waktu ditandai ⚠ merah dan dihitung di kartu "Terlambat".' },
    ],
  },
  {
    id: 'kesehatan', group: 'Operasional Harian', icon: <HeartPulse className="h-5 w-5" />, title: 'Kesehatan & Keselamatan', menu: 'Kesehatan & Dokumen → Kesehatan',
    keywords: 'insiden cedera jatuh sakit demam alergi obat p3k',
    blocks: [
      { t: 'steps', items: [{ title: 'Klik Catat Insiden' }, { title: 'Pilih anak, jenis, tingkat keparahan, tanggal & waktu' }, { title: 'Tulis deskripsi kejadian dan tindakan yang diambil' }, { title: 'Centang "Orang tua sudah diberitahu" bila sudah' }] },
      {
        t: 'fields', rows: [
          ['Jenis', 'Cedera, Sakit, Alergi, Obat, Lainnya.'],
          ['Keparahan', 'Ringan, Sedang, Parah.'],
        ],
      },
      { t: 'p', text: <>Jika orang tua belum diberitahu, tampil tautan kuning <M>Belum diberitahu — tandai sudah</M>. Edit dengan ikon pensil; hapus (Pemilik/Admin) dengan ikon tempat sampah.</> },
      { t: 'warn', text: 'Insiden yang belum diberitahukan ke orang tua dalam 7 hari terakhir muncul di "Perlu Perhatian" pada Dashboard.' },
    ],
  },
  {
    id: 'dokumen', group: 'Operasional Harian', icon: <FolderOpen className="h-5 w-5" />, title: 'Dokumen', menu: 'Kesehatan & Dokumen → Dokumen',
    keywords: 'arsip izin perizinan kadaluarsa unggah upload file pdf',
    blocks: [
      { t: 'p', text: 'Arsip dokumen daycare (izin operasional, sertifikat, dokumen anak/staf) dengan pengingat masa berlaku.' },
      { t: 'steps', items: [{ title: 'Klik Unggah Dokumen' }, { title: 'Isi nama, kategori, tanggal Berlaku Hingga (opsional), keterangan' }, { title: 'Pilih file (PDF, gambar, Word, Excel — maks 10 MB) lalu Unggah' }] },
      { t: 'p', text: <>Ikon pensil untuk mengubah nama/kategori/tanggal kadaluarsa, ikon unduh untuk membuka file, ikon tempat sampah untuk menghapus (Pemilik/Admin).</> },
      { t: 'warn', text: <>Unggah file memerlukan <B>Firebase Storage</B>, yang hanya tersedia di paket Firebase berbayar (Blaze). Pada paket gratis, proses unggah akan gagal; data dokumen yang sudah ada tetap bisa diedit.</> },
      { t: 'info', text: 'Dokumen yang kadaluarsa atau akan kadaluarsa dalam 30 hari diberi tanda dan muncul di Dashboard.' },
    ],
  },
  {
    id: 'inventaris', group: 'Operasional Harian', icon: <Package className="h-5 w-5" />, title: 'Inventaris & Stok', menu: 'Keuangan → Inventaris',
    keywords: 'barang stok popok susu perlengkapan mainan minimum menipis riwayat',
    blocks: [
      { t: 'steps', items: [{ title: 'Tambah Barang', desc: 'Nama, kategori, satuan (buah/pak/lusin), stok awal, stok minimum.' }, { title: 'Ubah Stok saat barang masuk/keluar', desc: 'Pilih Tambah atau Kurangi, isi jumlah dan alasan. Riwayat 10 perubahan terakhir tampil di dialog yang sama.' }, { title: 'Edit / hapus barang', desc: 'Ikon pensil / tempat sampah.' }] },
      { t: 'info', text: 'Jumlah stok hanya diubah lewat "Ubah Stok" supaya setiap perubahan tercatat. Barang dengan stok ≤ stok minimum ditandai Menipis dan muncul di Dashboard.' },
    ],
  },

  // ════ KEUANGAN ════
  {
    id: 'tagihan', group: 'Keuangan', icon: <Wallet className="h-5 w-5" />, title: 'Membuat Tagihan (Invoice)', menu: 'Keuangan → Keuangan → Buat Tagihan',
    keywords: 'invoice tagihan spp makan siang snack item diskon persen pajak jatuh tempo periode nomor',
    blocks: [
      {
        t: 'steps', items: [
          { title: 'Klik Buat Tagihan' },
          { title: 'Pilih Anak, Periode Tagihan (bulan), dan Jatuh Tempo' },
          { title: 'Isi Rincian Item', desc: <>Satu tagihan bisa berisi banyak item. Klik tombol cepat <M>+ SPP Bulanan</M> <M>+ Makan Siang</M> <M>+ Snack</M> <M>+ Registrasi</M> <M>+ Kegiatan</M> <M>+ Denda</M>, atau <M>Tambah baris item</M>. Setiap baris: Jenis, Keterangan, Qty, Harga — Jumlah dihitung otomatis.</> },
          { title: 'Isi Diskon (opsional)', desc: 'Pilih Rp (nominal) atau % (persen dari subtotal), plus keterangan diskon, mis. "diskon saudara kandung".' },
          { title: 'Pajak / Biaya Tambahan dan Catatan (opsional)', desc: 'Catatan tampil di invoice cetak, cocok untuk info rekening transfer.' },
          { title: 'Periksa ringkasan Subtotal – Diskon + Pajak = Total, lalu Simpan Tagihan' },
        ],
      },
      { t: 'p', text: <>Contoh: SPP 1 × Rp1.500.000 + Makan siang 20 × Rp15.000 + Field trip Rp100.000 = Rp1.900.000; diskon 10% = Rp190.000; <B>Total Rp1.710.000</B>.</> },
      { t: 'info', text: <>Nomor tagihan dibuat otomatis: <M>AWALAN/TAHUN/BULAN/URUT</M>, mis. <M>INV/2026/10/0001</M>. Awalan diatur di <M>Pengaturan</M>.</> },
      {
        t: 'table', head: ['Jenis item', 'Contoh'], rows: [
          ['SPP / Biaya Program', 'SPP bulanan, biaya harian'], ['Makan', 'Makan siang, snack, susu'], ['Kegiatan', 'Field trip, kelas tambahan'],
          ['Antar-jemput', 'Biaya transport'], ['Perlengkapan', 'Seragam, buku, popok'], ['Registrasi', 'Uang pendaftaran'],
          ['Deposit', 'Uang jaminan'], ['Denda', 'Terlambat jemput'], ['Lainnya', 'Biaya lain'],
        ],
      },
    ],
  },
  {
    id: 'pembayaran', group: 'Keuangan', icon: <CreditCard className="h-5 w-5" />, title: 'Mencatat & Mengoreksi Pembayaran', menu: 'Keuangan → Keuangan',
    keywords: 'bayar pembayaran cicil sebagian lunas metode tunai transfer qris referensi salah edit hapus koreksi',
    blocks: [
      { t: 'h', text: 'Mencatat pembayaran' },
      {
        t: 'steps', items: [
          { title: 'Klik Bayar pada baris tagihan', desc: 'Atau buka Detail → Tambah Pembayaran.' },
          { title: 'Isi Jumlah, Tanggal Bayar, Metode, No. Referensi, Catatan', desc: 'Jumlah otomatis terisi sisa tagihan; ubah bila dibayar sebagian (dicicil).' },
          { title: 'Klik Konfirmasi Bayar' },
        ],
      },
      { t: 'fields', rows: [['Metode', 'Tunai, Transfer Bank, QRIS, Lainnya — tampil di invoice cetak.'], ['No. Referensi', 'Nomor bukti transfer/QRIS.']] },
      { t: 'p', text: <>Status tagihan berubah otomatis: <B>Sebagian</B> bila masih ada sisa, <B>Lunas</B> bila sisa Rp0. Pembayaran melebihi sisa tagihan akan ditolak.</> },
      { t: 'h', text: 'Salah input pembayaran?' },
      {
        t: 'steps', items: [
          { title: 'Buka Detail tagihan (ikon mata atau klik barisnya)' },
          { title: 'Di Riwayat Pembayaran, klik ikon pensil untuk mengubah', desc: 'Jumlah, tanggal, metode, referensi, dan catatan bisa diubah.' },
          { title: 'Atau klik ikon tempat sampah untuk menghapus pembayaran' },
        ],
      },
      { t: 'tip', text: 'Setiap kali pembayaran diubah atau dihapus, total dibayar, sisa tagihan, dan status dihitung ulang otomatis.' },
    ],
  },
  {
    id: 'kelola-tagihan', group: 'Keuangan', icon: <Receipt className="h-5 w-5" />, title: 'Mengelola Tagihan', menu: 'Keuangan → Keuangan → Detail',
    keywords: 'edit tagihan batalkan hapus aktifkan status terlambat jatuh tempo filter cari piutang',
    blocks: [
      {
        t: 'table', head: ['Status', 'Arti'], rows: [
          ['Belum Bayar', 'Belum ada pembayaran.'], ['Sebagian', 'Sudah dibayar sebagian.'], ['Lunas', 'Sisa Rp0.'],
          ['Terlambat', 'Belum lunas dan sudah lewat tanggal jatuh tempo (otomatis).'], ['Dibatalkan', 'Tidak dihitung sebagai piutang.'],
        ],
      },
      { t: 'h', text: 'Aksi di dialog Detail' },
      {
        t: 'fields', rows: [
          ['Edit Tagihan', 'Ubah anak, periode, jatuh tempo, item, diskon, pajak, catatan. Total baru tidak boleh lebih kecil dari yang sudah dibayar.'],
          ['Batalkan / Aktifkan Lagi', 'Untuk tagihan yang salah terbit tanpa menghapusnya.'],
          ['Hapus', 'Hanya untuk tagihan tanpa pembayaran (Pemilik). Jika sudah ada pembayaran, hapus pembayarannya dulu atau batalkan tagihan.'],
          ['Cetak Invoice', 'Membuka halaman cetak di tab baru.'],
        ],
      },
      { t: 'p', text: 'Gunakan kotak cari (nama anak / nomor tagihan) dan tab status di atas daftar. Kartu ringkasan menampilkan total piutang, jumlah terlambat, lunas, dan total tagihan.' },
    ],
  },
  {
    id: 'cetak', group: 'Keuangan', icon: <Printer className="h-5 w-5" />, title: 'Cetak Invoice / Simpan PDF', menu: 'Keuangan → ikon 🖨️',
    keywords: 'print cetak pdf invoice kwitansi terbilang stempel lunas',
    blocks: [
      { t: 'steps', items: [{ title: 'Klik ikon printer pada baris tagihan (atau Cetak Invoice di Detail)' }, { title: 'Halaman invoice terbuka di tab baru' }, { title: 'Klik Cetak / Simpan PDF', desc: 'Pilih printer, atau pilih "Simpan sebagai PDF" sebagai tujuan.' }] },
      { t: 'p', text: 'Isi invoice: kop daycare (nama, alamat, telepon, email, website, logo), nomor, tanggal terbit, jatuh tempo, periode, data anak & wali, rincian item, subtotal, diskon (beserta keterangannya), pajak, total, terbilang, stempel status (LUNAS / DIBAYAR SEBAGIAN / JATUH TEMPO / BELUM LUNAS), riwayat pembayaran dengan metodenya, catatan, dan kolom tanda tangan.' },
      { t: 'tip', text: <>Orang tua juga bisa mencetak dari menu <M>Tagihan Saya</M> → <M>Cetak</M>. Nama file PDF otomatis &ldquo;Invoice [nomor] - [nama anak]&rdquo;.</> },
      { t: 'info', text: 'Data kop invoice diambil dari menu Pengaturan — pastikan nama, alamat (format "Jalan ..., Kota" agar nama kota muncul di tanda tangan), telepon, dan email sudah benar.' },
    ],
  },

  // ════ KOMUNIKASI & LAPORAN ════
  {
    id: 'komunikasi', group: 'Komunikasi & Laporan', icon: <MessageSquare className="h-5 w-5" />, title: 'Pengumuman', menu: 'Komunikasi → Komunikasi',
    keywords: 'pengumuman sematkan pin orang tua staf broadcast',
    blocks: [
      { t: 'steps', items: [{ title: 'Klik Buat Pengumuman' }, { title: 'Isi Judul dan Isi Pengumuman' }, { title: 'Pilih Ditujukan Untuk: Semua, Orang Tua, atau Staf', desc: 'Pengumuman "Staf" tidak terlihat oleh orang tua.' }, { title: 'Centang Sematkan bila perlu, lalu Publikasikan' }] },
      { t: 'p', text: <>Pengumuman tersemat tampil paling atas. Gunakan ikon pin untuk sematkan/lepas, pensil untuk edit, tempat sampah untuk hapus (Pemilik/Admin).</> },
      { t: 'info', text: 'Tab "Pesan" (pesan langsung) masih dalam pengembangan.' },
    ],
  },
  {
    id: 'laporan', group: 'Komunikasi & Laporan', icon: <BarChart3 className="h-5 w-5" />, title: 'Laporan & Analitik', menu: 'Komunikasi → Laporan',
    keywords: 'laporan bulanan statistik ekspor csv excel pendapatan grafik kehadiran',
    blocks: [
      { t: 'p', text: 'Pilih bulan dengan tombol ‹ ›. Kartu yang tersedia:' },
      {
        t: 'fields', rows: [
          ['Anak Aktif / Total Anak', 'Jumlah anak aktif dari seluruh anak terdaftar.'],
          ['Pendaftar Baru', 'Anak yang didaftarkan di bulan tersebut.'],
          ['Kehadiran Rata-rata', 'Persentase catatan "Hadir" (status Libur tidak dihitung).'],
          ['Insiden Kesehatan', 'Jumlah insiden di bulan tersebut.'],
          ['Pendapatan Diterima', 'Jumlah pembayaran yang tanggal bayarnya di bulan tersebut.'],
          ['Invoice Lunas / Pending', 'Tagihan yang dibuat di bulan tersebut.'],
          ['Grafik Kehadiran Harian', 'Hadir vs tidak hadir per tanggal sebulan penuh (geser ke samping di HP).'],
        ],
      },
      { t: 'p', text: <>Klik <M>Ekspor Laporan</M> untuk mengunduh file <B>CSV</B> (bisa dibuka di Excel) berisi indikator bulanan dan kehadiran harian.</> },
    ],
  },
  {
    id: 'notifikasi', group: 'Komunikasi & Laporan', icon: <Bell className="h-5 w-5" />, title: 'Notifikasi', menu: 'ikon 🔔 / Notifikasi',
    keywords: 'notifikasi pemberitahuan baca tandai hapus',
    blocks: [
      { t: 'p', text: 'Halaman Notifikasi menampilkan pemberitahuan untuk akun Anda. Filter: Semua, Belum Dibaca, Dibaca. Klik notifikasi untuk menandai dibaca, Tandai semua dibaca, atau hapus.' },
      { t: 'info', text: 'Saat ini notifikasi belum dibuat otomatis oleh sistem. Pantau hal penting lewat kartu "Perlu Perhatian" di Dashboard.' },
    ],
  },

  // ════ PORTAL ORANG TUA ════
  {
    id: 'orang-tua', group: 'Portal Orang Tua', icon: <Heart className="h-5 w-5" />, title: 'Panduan untuk Orang Tua', menu: 'Beranda (akun orang tua)',
    keywords: 'orang tua wali portal anak saya tagihan saya laporan kehadiran',
    blocks: [
      { t: 'p', text: 'Akun orang tua yang sudah dihubungkan ke anaknya (lihat Menambah Akun Staf & Orang Tua) dapat membuka:' },
      {
        t: 'fields', rows: [
          ['Beranda', 'Ringkasan anak, laporan hari ini, tagihan belum lunas, pengumuman terbaru.'],
          ['Anak Saya', 'Profil anak sendiri (anak lain tidak terlihat).'],
          ['Laporan Harian', 'Laporan 30 hari terakhir: suasana hati, makan, tidur, toilet, aktivitas, obat, catatan pengasuh.'],
          ['Kehadiran', 'Kalender bulanan berwarna + daftar jam masuk/pulang.'],
          ['Tagihan', 'Daftar tagihan, sisa yang harus dibayar, riwayat pembayaran, dan tombol Cetak.'],
          ['Pengumuman & Jadwal', 'Hanya untuk "Semua" dan "Orang Tua".'],
        ],
      },
      { t: 'info', text: 'Data yang muncul di portal adalah data yang dicatat setelah akun orang tua dihubungkan ke anaknya.' },
    ],
  },

  // ════ ADMINISTRASI ════
  {
    id: 'pengaturan', group: 'Administrasi', icon: <Settings className="h-5 w-5" />, title: 'Pengaturan Daycare', menu: 'Pengaturan',
    keywords: 'profil nama alamat telepon email website jam buka tutup hari operasional awalan invoice prefix',
    blocks: [
      {
        t: 'fields', rows: [
          ['Informasi Daycare', 'Nama, Alamat Lengkap, Nomor Telepon, Email, Website — dipakai di kop invoice.'],
          ['Jadwal Operasional', 'Jam Buka, Jam Tutup, Hari Operasional.'],
          ['Pengaturan Invoice', 'Awalan Nomor Invoice, mis. INV → INV/2026/10/0001. Perubahan berlaku untuk tagihan berikutnya.'],
        ],
      },
      { t: 'p', text: <>Klik <M>Simpan Pengaturan</M> setelah mengubah. Hanya Pemilik/Admin yang dapat menyimpan perubahan.</> },
    ],
  },

  // ════ BANTUAN ════
  {
    id: 'troubleshooting', group: 'Bantuan', icon: <AlertTriangle className="h-5 w-5" />, title: 'Pemecahan Masalah', keywords: 'error gagal tidak bisa masalah solusi',
    blocks: [
      {
        t: 'table', head: ['Masalah', 'Penyebab & solusi'], rows: [
          ['Muncul "Gagal memuat …"', 'Periksa koneksi internet lalu muat ulang (Ctrl+Shift+R di komputer, tarik ke bawah di HP).'],
          ['Tombol Tambah/Edit/Hapus tidak muncul', 'Peran akun Anda tidak punya izin itu. Hubungi Pemilik/Admin.'],
          ['Anak tidak muncul di Kehadiran / Laporan Harian / pilihan tagihan', 'Status anak bukan Aktif. Setujui di Pendaftaran atau ubah status di Data Anak.'],
          ['Tombol "›" (hari berikutnya) tidak bisa diklik', 'Tanggal di masa depan memang tidak bisa dicatat.'],
          ['Tagihan tidak bisa dihapus', 'Sudah ada pembayaran. Hapus pembayarannya dulu di Detail, atau Batalkan tagihan.'],
          ['"Jumlah melebihi sisa tagihan"', 'Pembayaran lebih besar dari sisa. Periksa jumlahnya, atau edit tagihan jika totalnya salah.'],
          ['Unggah dokumen gagal', 'Firebase Storage belum aktif (perlu paket Blaze).'],
          ['Login lalu muncul wizard buat daycare', 'Akun belum terhubung ke daycare. Lihat Menambah Akun Staf & Orang Tua.'],
          ['Portal orang tua kosong', 'Akun belum dihubungkan ke anak (field parentUserId).'],
          ['Tampilan tidak berubah setelah pembaruan aplikasi', 'Muat ulang paksa: Ctrl+Shift+R.'],
        ],
      },
    ],
  },
  {
    id: 'faq', group: 'Bantuan', icon: <HelpCircle className="h-5 w-5" />, title: 'Pertanyaan Umum (FAQ)', keywords: 'faq tanya jawab',
    blocks: [
      { t: 'h', text: 'Apakah data aman?' },
      { t: 'p', text: 'Data tersimpan di Google Firebase dan dibatasi aturan keamanan: setiap pengguna hanya bisa membaca data daycare-nya sendiri, dan orang tua hanya data anaknya.' },
      { t: 'h', text: 'Bisakah dipakai di HP?' },
      { t: 'p', text: 'Bisa. Semua menu menyesuaikan layar HP. Lihat Navigasi & Penggunaan di HP.' },
      { t: 'h', text: 'Bagaimana kalau orang tua membayar dicicil?' },
      { t: 'p', text: 'Catat setiap pembayaran terpisah dengan jumlah yang diterima. Status otomatis "Sebagian" sampai lunas.' },
      { t: 'h', text: 'Bisakah satu tagihan berisi SPP dan makan siang?' },
      { t: 'p', text: 'Bisa — tambahkan beberapa item di satu tagihan. Lihat Membuat Tagihan.' },
      { t: 'h', text: 'Apa beda Hapus dan Batalkan pada tagihan?' },
      { t: 'p', text: 'Batalkan menyimpan tagihan dengan status Dibatalkan (bisa diaktifkan lagi). Hapus menghilangkannya permanen dan hanya bisa jika belum ada pembayaran.' },
      { t: 'h', text: 'Apakah data yang dihapus bisa dikembalikan?' },
      { t: 'p', text: 'Tidak. Karena itu sistem selalu meminta konfirmasi, dan untuk anak/staf lebih disarankan mengubah status daripada menghapus.' },
    ],
  },
];

const GROUPS = Array.from(new Set(topics.map((t) => t.group)));

/** Plain text of a block for full-text search */
function textOf(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(' ');
  if (React.isValidElement(node)) return textOf((node.props as { children?: React.ReactNode }).children);
  return '';
}
function topicText(t: Topic) {
  const parts: string[] = [t.title, t.group, t.menu ?? '', t.keywords ?? ''];
  for (const b of t.blocks) {
    if (b.t === 'p' || b.t === 'tip' || b.t === 'warn' || b.t === 'info' || b.t === 'h') parts.push(textOf(b.text));
    if (b.t === 'list') parts.push(...b.items.map(textOf));
    if (b.t === 'steps') parts.push(...b.items.map((s) => `${textOf(s.title)} ${textOf(s.desc)}`));
    if (b.t === 'fields') parts.push(...b.rows.map(([k, v]) => `${k} ${textOf(v)}`));
    if (b.t === 'table') parts.push(...b.rows.map((r) => r.map(textOf).join(' ')));
  }
  return parts.join(' ').toLowerCase();
}

function TopicBody({ topic }: { topic: Topic }) {
  return (
    <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
      {topic.menu && (
        <p className="text-xs text-stone-400">Lokasi menu: <span className="font-medium text-stone-600">{topic.menu}</span></p>
      )}
      {topic.blocks.map((b, i) => <RenderBlock key={i} b={b} />)}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function PanduanPage() {
  const [activeId, setActiveId] = useState<string>(topics[0].id);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set([topics[0].id]));

  const index = useMemo(() => new Map(topics.map((t) => [t.id, topicText(t)])), []);
  const q = search.trim().toLowerCase();
  const filtered = q ? topics.filter((t) => q.split(/\s+/).every((w) => index.get(t.id)!.includes(w))) : topics;
  const activeTopic = filtered.find((t) => t.id === activeId) ?? filtered[0];
  const activeIdx = topics.findIndex((t) => t.id === activeTopic?.id);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <Topbar title="Panduan Pengguna" subtitle="Pelajari cara menggunakan semua fitur sistem" />

      <div className="p-4 sm:p-6">
        <div className="rounded-2xl bg-gradient-to-br from-coral-400 to-coral-500 p-5 mb-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><BookOpen className="h-5 w-5" /></div>
            <div>
              <p className="font-semibold text-lg">Panduan Lengkap</p>
              <p className="text-sm text-white/80">{topics.length} topik dalam {GROUPS.length} kelompok · cari berdasarkan isi panduan</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari, mis. &quot;edit pembayaran&quot;, &quot;diskon&quot;, &quot;check-out&quot;…"
              aria-label="Cari panduan"
              className="w-full h-10 rounded-xl bg-white/95 pl-9 pr-9 text-sm text-stone-700 placeholder:text-stone-400 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Hapus pencarian" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Tidak ada topik yang cocok dengan &ldquo;<span className="font-medium">{search}</span>&rdquo;</p>
            <button onClick={() => setSearch('')} className="text-xs text-coral-500 mt-1 hover:underline">Hapus pencarian</button>
          </div>
        ) : (
          <>
            {/* Mobile: accordion grouped */}
            <div className="block lg:hidden space-y-5">
              {GROUPS.map((g) => {
                const items = filtered.filter((t) => t.group === g);
                if (!items.length) return null;
                return (
                  <div key={g}>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2 px-1">{g}</p>
                    <div className="space-y-2">
                      {items.map((topic) => {
                        const open = expanded.has(topic.id) || !!q;
                        return (
                          <div key={topic.id} className="bg-white rounded-xl border border-stone-100 overflow-hidden">
                            <button onClick={() => toggleExpand(topic.id)} className="w-full flex items-center justify-between gap-3 p-4 text-left" aria-expanded={open}>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-coral-50 text-coral-500 rounded-lg flex items-center justify-center shrink-0">{topic.icon}</div>
                                <span className="text-sm font-medium text-stone-800">{topic.title}</span>
                              </div>
                              {open ? <ChevronDown className="h-4 w-4 text-stone-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-stone-400 shrink-0" />}
                            </button>
                            {open && <div className="px-4 pb-4 border-t border-stone-50 pt-3"><TopicBody topic={topic} /></div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: grouped sidebar + content */}
            <div className="hidden lg:grid lg:grid-cols-[280px_1fr] gap-5 items-start">
              <nav className="space-y-4 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1" aria-label="Daftar topik panduan">
                {GROUPS.map((g) => {
                  const items = filtered.filter((t) => t.group === g);
                  if (!items.length) return null;
                  return (
                    <div key={g}>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1.5 px-3">{g}</p>
                      <div className="space-y-0.5">
                        {items.map((topic) => (
                          <button key={topic.id} onClick={() => setActiveId(topic.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${activeTopic?.id === topic.id ? 'bg-coral-50 text-coral-700' : 'text-stone-600 hover:bg-stone-50'}`}>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 [&>svg]:h-4 [&>svg]:w-4 ${activeTopic?.id === topic.id ? 'bg-coral-100 text-coral-600' : 'bg-stone-100 text-stone-500'}`}>
                              {topic.icon}
                            </div>
                            <span className="text-sm font-medium leading-tight">{topic.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </nav>

              {activeTopic && (
                <div className="bg-white rounded-2xl border border-stone-100 p-6">
                  <div className="flex items-center gap-3 mb-5 pb-4 border-b border-stone-100">
                    <div className="w-10 h-10 bg-coral-50 text-coral-500 rounded-xl flex items-center justify-center">{activeTopic.icon}</div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">{activeTopic.group}</p>
                      <h2 className="text-base font-semibold text-stone-800">{activeTopic.title}</h2>
                    </div>
                  </div>
                  <TopicBody topic={activeTopic} />
                  {!q && (
                    <div className="flex justify-between gap-3 mt-8 pt-4 border-t border-stone-100 text-sm">
                      {activeIdx > 0 ? (
                        <button onClick={() => setActiveId(topics[activeIdx - 1].id)} className="text-stone-500 hover:text-coral-600">‹ {topics[activeIdx - 1].title}</button>
                      ) : <span />}
                      {activeIdx < topics.length - 1 && (
                        <button onClick={() => setActiveId(topics[activeIdx + 1].id)} className="text-stone-500 hover:text-coral-600 text-right">{topics[activeIdx + 1].title} ›</button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
