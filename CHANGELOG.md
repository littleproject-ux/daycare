# Changelog — Daycare Management App

## v0.5 — 2026-10-15
### Diubah
- `src/components/layout/topbar.tsx` — search bisa expand, bell link ke /notifikasi dengan badge

## v0.4 — 2026-10-15
### Baru
- `src/app/(dashboard)/notifikasi/page.tsx` — halaman notifikasi (baru)
- `src/app/(dashboard)/notifikasi/PageClient.tsx` — halaman notifikasi dengan search, filter, mark read, delete
- `scripts/seed-notifikasi.mjs` — script isi data notifikasi test
### Diubah
- `src/app/(dashboard)/LayoutClient.tsx` — fetch nama org dari Firestore, pass ke Sidebar

## v0.3 — 2026-10-15
### Diubah
- `src/components/layout/sidebar.tsx` — redesign total: background putih, rainbow strip, warna ramah anak
- `next.config.ts` — tambah transpilePackages firebase untuk fix ChunkLoadError

## v0.2 — sebelumnya
### Diubah
- `next.config.ts` — hapus cacheComponents & partialPrefetching (fix build error Vercel)
- `src/lib/firebase.ts` — null stub pattern supaya tidak crash saat env vars kosong
- semua `page.tsx` — hapus `export const instant` dan `export const dynamic`

## v0.1 — awal
- Setup awal project Next.js 16 + Firebase + Tailwind
