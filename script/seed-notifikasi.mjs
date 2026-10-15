// Script untuk tambah notifikasi test ke Firestore
// Jalankan: node scripts/seed-notifikasi.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// ── GANTI INI ──────────────────────────────────────────────
const EMAIL    = 'amrie87.syaiful@gmail.com';   // email login kamu
const PASSWORD = 'desember123';    // password login kamu
const ORG_ID   = 'DgM5MEg9TZTHJungwFc4';  // document ID di collection organizations
// ───────────────────────────────────────────────────────────

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const notifSamples = [
  { title: 'Selamat datang!',           body: 'Aplikasi daycare berhasil diaktifkan.',                  type: 'success'  },
  { title: 'Kehadiran hari ini',         body: '12 anak hadir, 2 anak tidak hadir.',                    type: 'attendance'},
  { title: 'Jadwal imunisasi',           body: 'Besok ada jadwal imunisasi untuk kelompok A (10:00).',  type: 'health'   },
  { title: 'Tagihan jatuh tempo',        body: 'Ada 3 tagihan yang belum dibayar bulan ini.',           type: 'finance'  },
  { title: 'Pesan dari orang tua',       body: 'Bu Sari mengirim pesan tentang anaknya Budi.',          type: 'message'  },
  { title: 'Acara minggu ini',           body: 'Jum\'at ada acara pentas seni anak-anak.',              type: 'schedule' },
];

async function main() {
  console.log('🔐 Login...');
  const { user } = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
  console.log('✅ Login berhasil, UID:', user.uid);

  const ref = collection(db, 'organizations', ORG_ID, 'notifications');

  for (const notif of notifSamples) {
    await addDoc(ref, {
      userId:    user.uid,
      title:     notif.title,
      body:      notif.body,
      type:      notif.type,
      read:      false,
      createdAt: Timestamp.now(),
    });
    console.log('📬 Tambah:', notif.title);
  }

  console.log('\n✅ Selesai! Buka /notifikasi di app.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
