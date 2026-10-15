'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Baby,
  Wallet,
  HeartPulse,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'attendance' | 'health' | 'finance' | 'message' | 'schedule' | 'child';
  read: boolean;
  createdAt: Timestamp;
  link?: string;
}

const TYPE_CONFIG: Record<Notification['type'], { icon: React.ReactNode; bg: string; iconColor: string; label: string }> = {
  info:       { icon: <Info className="h-4 w-4" />,          bg: 'bg-sky-100',     iconColor: 'text-sky-600',     label: 'Info'        },
  success:    { icon: <CheckCircle className="h-4 w-4" />,   bg: 'bg-emerald-100', iconColor: 'text-emerald-600', label: 'Berhasil'    },
  warning:    { icon: <AlertTriangle className="h-4 w-4" />, bg: 'bg-amber-100',   iconColor: 'text-amber-600',   label: 'Perhatian'   },
  error:      { icon: <XCircle className="h-4 w-4" />,       bg: 'bg-rose-100',    iconColor: 'text-rose-600',    label: 'Error'       },
  attendance: { icon: <CheckCheck className="h-4 w-4" />,    bg: 'bg-green-100',   iconColor: 'text-green-600',   label: 'Kehadiran'   },
  health:     { icon: <HeartPulse className="h-4 w-4" />,    bg: 'bg-pink-100',    iconColor: 'text-pink-600',    label: 'Kesehatan'   },
  finance:    { icon: <Wallet className="h-4 w-4" />,        bg: 'bg-lime-100',    iconColor: 'text-lime-600',    label: 'Keuangan'    },
  message:    { icon: <MessageCircle className="h-4 w-4" />, bg: 'bg-violet-100',  iconColor: 'text-violet-600',  label: 'Pesan'       },
  schedule:   { icon: <Calendar className="h-4 w-4" />,      bg: 'bg-blue-100',    iconColor: 'text-blue-600',    label: 'Jadwal'      },
  child:      { icon: <Baby className="h-4 w-4" />,          bg: 'bg-orange-100',  iconColor: 'text-orange-600',  label: 'Data Anak'   },
};

const FILTERS = ['Semua', 'Belum Dibaca', 'Dibaca'] as const;
type Filter = typeof FILTERS[number];

export default function NotifikasiPage() {
  const { userProfile, organizationId } = useAuth();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('Semua');

  useEffect(() => {
    if (!userProfile?.id || !organizationId || !db) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'organizations', organizationId, 'notifications'),
      where('userId', '==', userProfile.id),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [userProfile?.id, organizationId]);

  const markRead = async (id: string) => {
    if (!organizationId || !db) return;
    await updateDoc(doc(db, 'organizations', organizationId, 'notifications', id), { read: true });
  };

  const markAllRead = async () => {
    if (!organizationId || !db) return;
    const unread = notifs.filter((n) => !n.read);
    if (!unread.length) return;
    const batch = writeBatch(db);
    unread.forEach((n) => batch.update(doc(db, 'organizations', organizationId, 'notifications', n.id), { read: true }));
    await batch.commit();
  };

  const deleteNotif = async (id: string) => {
    if (!organizationId || !db) return;
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'organizations', organizationId, 'notifications', id));
  };

  const filtered = notifs.filter((n) => {
    if (filter === 'Belum Dibaca') return !n.read;
    if (filter === 'Dibaca') return n.read;
    return true;
  });

  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Bell className="h-5 w-5 text-violet-500" />
            Notifikasi
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 text-xs text-white font-semibold px-1.5">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">{notifs.length} total notifikasi</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Tandai semua dibaca
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl mb-5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'flex-1 text-xs font-semibold py-1.5 rounded-xl transition-all duration-150',
              filter === f
                ? 'bg-white text-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <BellOff className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-500">Tidak ada notifikasi</p>
          <p className="text-xs text-slate-400 mt-1">
            {filter === 'Belum Dibaca' ? 'Semua sudah dibaca 🎉' : 'Belum ada notifikasi masuk'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notif) => {
            const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.info;
            const timeAgo = notif.createdAt
              ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true, locale: localeId })
              : '';
            return (
              <div
                key={notif.id}
                onClick={() => !notif.read && markRead(notif.id)}
                className={cn(
                  'relative flex gap-3 rounded-2xl p-3.5 border transition-all duration-150 cursor-pointer group',
                  notif.read
                    ? 'bg-white border-slate-100 opacity-70 hover:opacity-100'
                    : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                )}
              >
                {/* Unread dot */}
                {!notif.read && (
                  <span className="absolute top-3.5 right-3.5 h-2 w-2 rounded-full bg-violet-500" />
                )}

                {/* Icon */}
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', cfg.bg)}>
                  <span className={cfg.iconColor}>{cfg.icon}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-4">
                  <p className={cn('text-sm font-semibold truncate', notif.read ? 'text-slate-500' : 'text-slate-800')}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{notif.body}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', cfg.bg, cfg.iconColor)}>
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-slate-400">{timeAgo}</span>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNotif(notif.id); }}
                  className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-rose-500"
                  title="Hapus"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
