'use client';

import React, { useState } from 'react';
import { Topbar } from '@/components/layout/topbar';
import {
  BookOpen, ChevronRight, ChevronDown, Search, Home, LogIn, Users, Building2,
  Baby, CalendarCheck, FileText, Activity, UserCog, Receipt, FolderOpen,
  MessageSquare, BarChart3, Settings, HelpCircle, Phone, ShieldCheck, Star,
  AlertTriangle, CheckCircle2, Info,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Topic {
  id: string;
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
}

const topics: Topic[] = [
  {
    id: 'pengenalan',
    icon: <Home className="h-5 w-5" />,
    title: '1. Pengenalan Sistem',
    content: (
      <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
        <p>
          <strong className="text-stone-800">Sistem Manajemen Daycare</strong> adalah platform digital lengkap untuk membantu pengelola tempat penitipan anak (TPA/Daycare) mengelola operasional harian secara efisien dan profesional.
        </p>
        <div className="bg-blue-50 rounded-xl p-4 space-y-2">
          <p className="font-medium text-blue-800 flex items-center gap-2"><Info className="h-4 w-4" /> Fitur Utama</p>
          <ul className="space-y-1 ml-5 list-disc text-blue-700">
            <li>Manajemen data anak dan kehadiran</li>
            <li>Laporan harian dan aktivitas belajar</li>
            <li>Keuangan: tagihan, pembayaran, invoice</li>
            <li>Manajemen staf dan penugasan</li>
            <li>Dokumen, inventaris, dan kesehatan</li>
            <li>Komunikasi dengan orang tua</li>
            <li>Dashboard laporan dan analitik</li>
          </ul>
        </div>
        <p>
          Sistem ini dirancang untuk multi-pengguna dengan berbagai peran — dari pemilik, admin, staf pengasuh, keuangan, hingga orang tua — masing-masing dengan akses sesuai kebutuhan.
        </p>
      </div>
    ),
  },
  {
    id: 'setup',
    icon: <Settings className="h-5 w-5" />,
    title: '2. Pengaturan Awal',
    content: (
      <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
        <p>Setelah akun dibuat, ikuti langkah berikut untuk menyiapkan sistem:</p>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Lengkapi Profil Organisasi', desc: 'Buka menu Pengaturan → isi nama daycare, alamat, nomor telepon, dan logo.' },
            { step: '2', title: 'Tambahkan Ruang/Kelas', desc: 'Di Pengaturan → Ruangan, buat kelas sesuai kelompok usia (mis: Bayi 0-1 thn, Toddler 1-3 thn).' },
            { step: '3', title: 'Daftarkan Staf', desc: 'Di menu Staf, tambahkan pengasuh dan admin beserta perannya.' },
            { step: '4', title: 'Daftarkan Anak', desc: 'Di menu Anak, input data setiap anak beserta kontak darurat orang tua.' },
            { step: '5', title: 'Atur Tarif', desc: 'Di Pengaturan → Tarif, tentukan biaya bulanan atau harian per kelas.' },
          ].map(item => (
            <div key={item.step} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-coral-100 text-coral-600 flex items-center justify-center text-xs font-bold shrink-0">{item.step}</div>
              <div>
                <p className="font-medium text-stone-700">{item.title}</p>
                <p className="text-stone-500 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'login',
    icon: <LogIn className="h-5 w-5" />,
    title: '3. Login & Akun',
    content: (
      <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
        <p>Sistem menggunakan email dan kata sandi untuk autentikasi.</p>
        <div className="space-y-3">
          <div className="bg-stone-50 rounded-xl p-3">
            <p className="font-medium text-stone-700 mb-1">Login</p>
            <p>Kunjungi halaman login, masukkan email dan kata sandi yang terdaftar. Centang "Ingat saya" agar tidak perlu login ulang.</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-3">
            <p className="font-medium text-stone-700 mb-1">Lupa Kata Sandi</p>
            <p>Klik tautan "Lupa kata sandi?" di halaman login, masukkan email Anda, lalu cek kotak masuk untuk tautan reset.</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-3">
            <p className="font-medium text-stone-700 mb-1">Undang Pengguna Baru</p>
            <p>Admin dapat mengundang pengguna baru melalui Pengaturan → Tim. Pengguna baru akan menerima email undangan.</p>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-amber-700 text-xs">Jangan bagikan kata sandi ke orang lain. Gunakan fitur undangan untuk menambah pengguna baru.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'peran',
    icon: <ShieldCheck className="h-5 w-5" />,
    title: '4. Peran & Hak Akses',
    content: (
      <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
        <p>Sistem memiliki enam peran dengan hak akses berbeda:</p>
        <div className="space-y-2">
          {[
            { role: 'Pemilik (Owner)', color: 'bg-purple-100 text-purple-700', desc: 'Akses penuh ke semua fitur termasuk pengaturan organisasi dan laporan keuangan.' },
            { role: 'Admin', color: 'bg-blue-100 text-blue-700', desc: 'Kelola data anak, staf, kehadiran, dokumen. Tidak bisa mengubah pengaturan billing.' },
            { role: 'Keuangan (Finance)', color: 'bg-emerald-100 text-emerald-700', desc: 'Kelola invoice, pembayaran, dan laporan keuangan.' },
            { role: 'Pengasuh (Caregiver)', color: 'bg-amber-100 text-amber-700', desc: 'Input kehadiran, laporan harian, dan aktivitas anak yang ditugaskan.' },
            { role: 'Orang Tua (Parent)', color: 'bg-coral-100 text-coral-600', desc: 'Lihat data anak sendiri, kehadiran, laporan harian, dan tagihan.' },
            { role: 'Auditor', color: 'bg-stone-100 text-stone-600', desc: 'Hanya bisa melihat (read-only) semua data untuk keperluan audit.' },
          ].map(item => (
            <div key={item.role} className="flex gap-2 items-start">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${item.color}`}>{item.role}</span>
              <p className="text-xs text-stone-500 pt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'cabang',
    icon: <Building2 className="h-5 w-5" />,
    title: '5. Cabang & Ruangan',
    content: (
      <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
        <p>Atur struktur fisik daycare Anda dengan cabang dan ruangan kelas.</p>
        <div className="space-y-3">
          <div>
            <p className="font-medium text-stone-700 mb-1">Ruangan/Kelas</p>
            <p>Buat ruangan berdasarkan kelompok usia atau jenis program. Contoh:</p>
            <ul className="ml-4 mt-1 space-y-0.5 list-disc text-stone-500">
              <li>Bayi (0–12 bulan) — kapasitas 8 anak</li>
              <li>Toddler (1–3 tahun) — kapasitas 12 anak</li>
              <li>Prasekolah (3–5 tahun) — kapasitas 15 anak</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-stone-700 mb-1">Penugasan Staf</p>
            <p>Setiap ruangan dapat memiliki staf pengasuh yang ditugaskan. Pengasuh hanya melihat anak di ruangan mereka.</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-green-700 text-xs flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Kapasitas ruangan akan termonitor otomatis — sistem memberi peringatan jika sudah penuh.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'anak',
    icon: <Baby className="h-5 w-5" />,
    title: '6. Pendaftaran Anak',
    content: (
      <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
        <p>Daftarkan setiap anak dengan informasi lengkap untuk memastikan perawatan optimal.</p>
        <div className="space-y-2">
          <p className="font-medium text-stone-700">Data yang Diperlukan:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {['Nama lengkap', 'Tanggal lahir', 'Jenis kelamin', 'Nama orang tua', 'Nomor HP orang tua', 'Alamat rumah', 'Kontak darurat', 'Golongan darah', 'Alergi & kondisi kesehatan', 'Kelas/Ruangan', 'Tanggal masuk', 'Foto anak'].map(item => (
              <div key={item} className="flex items-center gap-1.5 bg-stone-50 rounded-lg px-2 py-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                <span className="text-stone-600">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-3">
          <p className="text-amber-700 text-xs"><strong>Penting:</strong> Informasi alergi dan kondisi kesehatan wajib diisi dengan akurat. Data ini akan muncul di laporan harian dan dapat diakses pengasuh kapan saja.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'kehadiran',
    icon: <CalendarCheck className="h-5 w-5" />,
    title: '7. Kehadiran',
    content: (
      <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
        <p>Input kehadiran anak setiap hari kerja untuk memantau pola kehadiran.</p>
        <div className="space-y-3">
          <div className="bg-stone-50 rounded-xl p-3">
            <p className="font-medium text-stone-700 mb-1">Cara Input Kehadiran</p>
            <ol className="list-decimal ml-4 space-y-1 text-xs text-stone-500">
              <li>Buka menu <strong>Kehadiran</strong></li>
              <li>Pilih tanggal (default: hari ini)</li>
              <li>Pilih ruangan/kelas</li>
              <li>Tandai status setiap anak: Hadir / Absen / Izin / Sakit</li>
              <li>Isi catatan jika perlu (mis: alasan absen)</li>
              <li>Klik Simpan</li>
            </ol>
          </div>
          <div>
            <p className="font-medium text-stone-700 mb-1">Status Kehadiran</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg">✓ Hadir</span>
              <span className="bg-red-50 text-red-600 px-2 py-1 rounded-lg">✗ Absen</span>
              <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">📋 Izin</span>
              <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded-lg">🤒 Sakit</span>
            </div>
          </div>
          <p className="text-xs text-stone-500">Laporan persentase kehadiran otomatis tersedia di menu Laporan setiap bulan.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'laporan-harian',
    icon: <FileText className="h-5 w-5" />,
    title: '8. Laporan Harian',
    content: (
      <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
        <p>Laporan harian memberikan informasi perkembangan dan kondisi anak kepada orang tua.</p>
        <div className="space-y-3">
          <div>
            <p className="font-medium text-stone-700 mb-1">Isi Laporan Harian</p>
            <ul className="ml-4 list-disc space-y-0.5 text-xs text-stone-500">
              <li>Suhu tubuh pagi dan siang</li>
              <li>Pola makan (porsi dan jenis makanan)</li>
              <li>Jam tidur dan durasi tidur siang</li>
              <li>Suasana hati (emoji mood)</li>
              <li>Aktivitas yang dilakukan</li>
              <li>Catatan khusus pengasuh</li>
              <li>Foto kegiatan (opsional)</li>
            </ul>
          </div>
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-blue-800 text-xs"><Info className="h-3 w-3 inline mr-1" />Orang tua dapat melihat laporan harian anak mereka di portal orang tua setiap saat. Laporan dikirim otomatis ke notifikasi orang tua saat disimpan.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'aktivitas',
    icon: <Star className="h-5 w-5" />,
    title: '9. Aktivitas Belajar',
    content: (
      <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
        <p>Dokumentasikan kegiatan pembelajaran dan perkembangan anak secara berkala.</p>
        <div className="space-y-3">
          <div>
            <p className="font-medium text-stone-700 mb-1">Kategori Aktivitas</p>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {['Motorik Kasar', 'Motorik Halus', 'Kognitif', 'Bahasa & Komunikasi', 'Sosial-Emosional', 'Seni & Kreativitas', 'Kemandirian', 'Agama & Moral'].map(k => (
                <div key={k} className="bg-stone-50 rounded-lg px-2 py-1 text-stone-600">{k}</div>
              ))}
            </div>
          </div>
          <p>Setiap aktivitas dapat ditandai dengan kemampuan yang dicapai anak (Belum Bisa / Masih Dibantu / Mandiri) untuk melacak perkembangan dari waktu ke waktu.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'staf',
    icon: <UserCog className="h-5 w-5" />,
    title: '10. Manajemen Staf',
    content: (
      <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
        <p>Kelola data staf daycare termasuk pengasuh, admin, dan tenaga pendukung lainnya.</p>
        <div className="space-y-3">
          <div className="bg-stone-50 rounded-xl p-3">
            <p className="font-medium text-stone-700 mb-1">Data Staf yang Dicatat</p>
            <ul className="ml-4 list-disc text-xs text-stone-500 space-y-0.5">
              <li>Nama lengkap dan informasi kontak</li>
              <li>Jabatan dan peran sistem</li>
              <li>Tanggal mulai bekerja</li>
              <li>Ruangan yang ditugaskan</li>
              <li>Dokumen (sertifikat, KTP, dll.)</li>
              <li>Status aktif/non-aktif</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-stone-700 mb-1">Penugasan Tugas</p>
            <p className="text-xs text-stone-500">Gunakan menu Tugas untuk mendistribusikan pekerjaan harian kepada staf dan memantau progresnya.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'keuangan',
    icon: <Receipt className="h-5 w-5" />,
    title: '11. Keuangan & Invoice',
    content: (
      <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
        <p>Kelola tagihan bulanan, pembayaran, dan laporan keuangan daycare.</p>
        <div className="space-y-3">
          <div>
            <p className="font-medium text-stone-700 mb-1">Alur Penagihan</p>
            <div className="space-y-1.5">
              {[
                { from: 'Draft', to: 'Terbit (Sent)' },
                { from: 'Terbit', to: 'Bayar Sebagian / Lunas' },
                { from: 'Jatuh Tempo', to: 'Terlambat (Overdue)' },
              ].map(item => (
                <div key={item.from} className="flex items-center gap-2 text-xs">
                  <span className="bg-stone-100 px-2 py-0.5 rounded font-medium text-stone-600">{item.from}</span>
                  <ChevronRight className="h-3 w-3 text-stone-400" />
                  <span className="bg-emerald-50 px-2 py-0.5 rounded font-medium text-emerald-600">{item.to}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-stone-50 rounded-xl p-3">
            <p className="font-medium text-stone-700 text-xs mb-1">Fitur Keuangan</p>
            <ul className="ml-3 list-disc text-xs text-stone-500 space-y-0.5">
              <li>Buat invoice massal untuk semua anak</li>
              <li>Rekam pembayaran sebagian atau penuh</li>
              <li>Laporan pendapatan per bulan</li>
              <li>Export ke PDF atau Excel</li>
              <li>Notifikasi tagihan jatuh tempo</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'dokumen',
    icon: <FolderOpen className="h-5 w-5" />,
    title: '12. Dokumen & Kesehatan',
    content: (
      <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
        <p><strong>Dokumen:</strong> Simpan semua berkas penting daycare di satu tempat.</p>
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            {['Dokumen Anak', 'Dokumen Staf', 'Perizinan', 'Dokumen Org.', 'Keuangan', 'Lainnya'].map(k => (
              <div key={k} className="bg-blue-50 text-blue-700 rounded-lg px-2 py-1 text-center">{k}</div>
            ))}
          </div>
          <p className="text-xs text-stone-500">Setiap dokumen dapat diberi tanggal kedaluwarsa — sistem akan memberi peringatan 30 hari sebelum masa berlaku habis.</p>
        </div>
        <p><strong>Kesehatan:</strong> Catat insiden kesehatan dan kondisi khusus anak.</p>
        <div className="bg-red-50 rounded-xl p-3 text-xs text-red-700">
          <AlertTriangle className="h-3 w-3 inline mr-1" />Insiden dengan tingkat keparahan <strong>Berat</strong> akan memicu notifikasi darurat ke orang tua dan admin.
        </div>
      </div>
    ),
  },
  {
    id: 'komunikasi',
    icon: <MessageSquare className="h-5 w-5" />,
    title: '13. Komunikasi',
    content: (
      <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
        <p>Jaga komunikasi efektif antara pihak daycare dan orang tua melalui fitur pengumuman.</p>
        <div className="space-y-3">
          <div className="bg-stone-50 rounded-xl p-3">
            <p className="font-medium text-stone-700 mb-1">Pengumuman</p>
            <ul className="ml-3 list-disc text-xs text-stone-500 space-y-0.5">
              <li>Buat pengumuman untuk semua, orang tua, atau staf saja</li>
              <li>Sematkan (pin) pengumuman penting</li>
              <li>Notifikasi otomatis ke penerima</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-stone-700 mb-1">Contoh Penggunaan</p>
            <ul className="ml-3 list-disc text-xs text-stone-500 space-y-0.5">
              <li>Libur nasional atau daycare tutup</li>
              <li>Kegiatan khusus (field trip, parent day)</li>
              <li>Informasi menu makan minggu ini</li>
              <li>Pengumuman biaya atau perubahan jadwal</li>
              <li>Reminder vaksinasi atau pemeriksaan</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'laporan',
    icon: <BarChart3 className="h-5 w-5" />,
    title: '14. Laporan & Analitik',
    content: (
      <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
        <p>Pantau kesehatan bisnis daycare melalui dashboard laporan bulanan yang komprehensif.</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { label: 'Kehadiran', desc: 'Rata-rata % kehadiran per bulan' },
            { label: 'Pendapatan', desc: 'Total pendapatan terkumpul' },
            { label: 'Tagihan', desc: 'Invoice lunas vs belum bayar' },
            { label: 'Anak Baru', desc: 'Pendaftaran baru per bulan' },
            { label: 'Insiden', desc: 'Jumlah laporan kesehatan' },
            { label: 'Kapasitas', desc: 'Tingkat hunian per kelas' },
          ].map(item => (
            <div key={item.label} className="bg-stone-50 rounded-xl p-2">
              <p className="font-medium text-stone-700">{item.label}</p>
              <p className="text-stone-400 text-xs mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-500">Laporan dapat diexport ke PDF atau Excel untuk keperluan pelaporan kepada dinas atau investor.</p>
      </div>
    ),
  },
  {
    id: 'pengaturan',
    icon: <Settings className="h-5 w-5" />,
    title: '15. Pengaturan Sistem',
    content: (
      <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
        <p>Konfigurasi sistem sesuai kebutuhan daycare Anda.</p>
        <div className="space-y-2 text-xs">
          {[
            { setting: 'Profil Organisasi', desc: 'Nama, alamat, kontak, logo daycare' },
            { setting: 'Jam Operasional', desc: 'Jam buka dan tutup, hari kerja' },
            { setting: 'Notifikasi', desc: 'Atur notifikasi email dan push ke orang tua' },
            { setting: 'Template Invoice', desc: 'Desain dan komponen biaya invoice' },
            { setting: 'Manajemen Tim', desc: 'Undang pengguna, atur peran' },
            { setting: 'Backup Data', desc: 'Export semua data sebagai arsip' },
          ].map(item => (
            <div key={item.setting} className="flex gap-3 bg-stone-50 rounded-xl px-3 py-2">
              <p className="font-medium text-stone-700 w-36 shrink-0">{item.setting}</p>
              <p className="text-stone-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'troubleshooting',
    icon: <AlertTriangle className="h-5 w-5" />,
    title: '16. Pemecahan Masalah',
    content: (
      <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
        <div className="space-y-3">
          {[
            { problem: 'Tidak bisa login', solution: 'Pastikan email dan kata sandi benar. Jika lupa kata sandi, gunakan fitur "Lupa kata sandi". Cek koneksi internet.' },
            { problem: 'Data tidak tersimpan', solution: 'Cek koneksi internet. Pastikan semua field wajib (*) sudah diisi. Refresh halaman dan coba lagi.' },
            { problem: 'Upload dokumen gagal', solution: 'Pastikan ukuran file di bawah 10 MB. Format yang didukung: PDF, JPG, PNG, DOCX, XLSX.' },
            { problem: 'Tidak bisa akses menu tertentu', solution: 'Menu yang tersembunyi sesuai peran Anda. Hubungi admin untuk menyesuaikan hak akses.' },
            { problem: 'Laporan kosong / data tidak muncul', solution: 'Cek filter tanggal atau status yang dipilih. Pastikan data sudah diinput untuk periode tersebut.' },
          ].map(item => (
            <div key={item.problem} className="bg-stone-50 rounded-xl p-3">
              <p className="font-medium text-stone-700 text-xs mb-1">❓ {item.problem}</p>
              <p className="text-stone-500 text-xs">→ {item.solution}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'faq',
    icon: <HelpCircle className="h-5 w-5" />,
    title: '17. FAQ',
    content: (
      <div className="space-y-3 text-sm text-stone-600 leading-relaxed">
        {[
          { q: 'Berapa banyak anak yang bisa didaftarkan?', a: 'Tidak ada batas. Sistem dapat menampung seluruh anak yang terdaftar di daycare Anda.' },
          { q: 'Apakah orang tua bisa melihat laporan harian?', a: 'Ya. Orang tua yang memiliki akun dengan peran "Orang Tua" dapat melihat laporan harian anak mereka secara real-time.' },
          { q: 'Bisakah satu staf mengelola beberapa ruangan?', a: 'Bisa. Satu staf dapat ditugaskan ke beberapa ruangan sekaligus.' },
          { q: 'Apakah data aman?', a: 'Ya. Data disimpan di Firebase dengan enkripsi penuh dan akses dibatasi berdasarkan organisasi masing-masing.' },
          { q: 'Apakah bisa diakses dari HP?', a: 'Ya. Antarmuka responsif dan dapat diakses dari browser HP, tablet, maupun komputer.' },
          { q: 'Bagaimana jika ada 2 cabang daycare?', a: 'Setiap cabang dapat memiliki organisasi terpisah dengan data yang terisolasi, atau dikelola dalam satu organisasi dengan ruangan yang berbeda.' },
        ].map((item, i) => (
          <div key={i} className="bg-stone-50 rounded-xl p-3">
            <p className="font-medium text-stone-700 text-xs mb-1">Q: {item.q}</p>
            <p className="text-stone-500 text-xs">A: {item.a}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'kontak',
    icon: <Phone className="h-5 w-5" />,
    title: '18. Kontak & Dukungan',
    content: (
      <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
        <p>Butuh bantuan lebih lanjut? Tim kami siap membantu.</p>
        <div className="space-y-3">
          <div className="bg-coral-50 rounded-xl p-4 text-center">
            <p className="text-2xl mb-2">📧</p>
            <p className="font-medium text-stone-700">Email Dukungan</p>
            <p className="text-coral-600 font-medium">support@daycare.id</p>
            <p className="text-xs text-stone-400 mt-1">Respon dalam 1×24 jam kerja</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-2xl mb-2">💬</p>
            <p className="font-medium text-stone-700">WhatsApp</p>
            <p className="text-green-600 font-medium">+62 812-3456-7890</p>
            <p className="text-xs text-stone-400 mt-1">Senin–Jumat, 09.00–17.00 WIB</p>
          </div>
        </div>
        <div className="bg-stone-50 rounded-xl p-3 text-xs text-stone-500">
          <p className="font-medium text-stone-700 mb-1">Saat menghubungi dukungan, siapkan:</p>
          <ul className="ml-3 list-disc space-y-0.5">
            <li>Nama organisasi daycare Anda</li>
            <li>Email akun yang digunakan</li>
            <li>Deskripsi masalah + screenshot (jika ada)</li>
          </ul>
        </div>
      </div>
    ),
  },
];

export default function PanduanPage() {
  const [activeId, setActiveId] = useState<string>(topics[0].id);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set([topics[0].id]));

  const filtered = search.trim()
    ? topics.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : topics;

  const activeTopic = topics.find(t => t.id === activeId);

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <Topbar title="Panduan Pengguna" subtitle="Pelajari cara menggunakan semua fitur sistem" />

      <div className="p-6">
        {/* Header banner */}
        <div className="rounded-2xl bg-gradient-to-br from-coral-400 to-coral-500 p-5 mb-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-lg">Panduan Lengkap</p>
              <p className="text-sm text-white/80">18 topik tersedia dalam Bahasa Indonesia</p>
            </div>
          </div>
          <div className="mt-3">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari topik panduan..."
              className="bg-white/90 border-0 text-stone-700 placeholder:text-stone-400"
            />
          </div>
        </div>

        {/* Mobile: accordion layout */}
        <div className="block lg:hidden space-y-2">
          {filtered.map(topic => (
            <div key={topic.id} className="bg-white rounded-xl border border-stone-100 overflow-hidden">
              <button
                onClick={() => toggleExpand(topic.id)}
                className="w-full flex items-center justify-between gap-3 p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-coral-50 text-coral-500 rounded-lg flex items-center justify-center shrink-0">
                    {topic.icon}
                  </div>
                  <span className="text-sm font-medium text-stone-800">{topic.title}</span>
                </div>
                {expanded.has(topic.id)
                  ? <ChevronDown className="h-4 w-4 text-stone-400 shrink-0" />
                  : <ChevronRight className="h-4 w-4 text-stone-400 shrink-0" />
                }
              </button>
              {expanded.has(topic.id) && (
                <div className="px-4 pb-4 border-t border-stone-50 pt-3">
                  {topic.content}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Desktop: sidebar + content layout */}
        <div className="hidden lg:grid lg:grid-cols-[280px_1fr] gap-5">
          {/* Sidebar */}
          <div className="space-y-1">
            {filtered.map(topic => (
              <button
                key={topic.id}
                onClick={() => setActiveId(topic.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  activeId === topic.id
                    ? 'bg-coral-50 text-coral-700'
                    : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  activeId === topic.id ? 'bg-coral-100 text-coral-600' : 'bg-stone-100 text-stone-500'
                }`}>
                  {topic.icon}
                </div>
                <span className="text-sm font-medium leading-tight">{topic.title}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          {activeTopic && (
            <div className="bg-white rounded-2xl border border-stone-100 p-6">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-stone-100">
                <div className="w-10 h-10 bg-coral-50 text-coral-500 rounded-xl flex items-center justify-center">
                  {activeTopic.icon}
                </div>
                <h2 className="text-base font-semibold text-stone-800">{activeTopic.title}</h2>
              </div>
              {activeTopic.content}
            </div>
          )}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Topik tidak ditemukan untuk "<span className="font-medium">{search}</span>"</p>
            <button onClick={() => setSearch('')} className="text-xs text-coral-500 mt-1 hover:underline">Hapus pencarian</button>
          </div>
        )}
      </div>
    </div>
  );
}
