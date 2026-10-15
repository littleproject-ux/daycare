'use client';

import React, { useState, useEffect } from 'react';
import {
  collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Megaphone, Plus, X, Pin, PinOff, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { inisial, toDateSafe } from '@/lib/utils';
import type { Timestamp } from 'firebase/firestore';

type AnnouncementAudience = 'all' | 'parents' | 'staff';

interface Announcement {
  id: string;
  organizationId: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  isPinned: boolean;
  authorId: string;
  authorName: string;
  createdAt: Timestamp;
}

const AUDIENCE_CONFIG: Record<AnnouncementAudience, { label: string; variant: 'info' | 'success' | 'default' }> = {
  all: { label: 'Semua', variant: 'info' },
  parents: { label: 'Orang Tua', variant: 'success' },
  staff: { label: 'Staf', variant: 'default' },
};

export default function KomunikasiPage() {
  const { organizationId, user, role, hasRole, userProfile } = useAuth();
  // firestore.rules: announcements writes → owner/admin
  const canManage = hasRole('owner', 'admin');
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [confirm, confirmEl] = useConfirm();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'pengumuman' | 'pesan'>('pengumuman');

  const [form, setForm] = useState({
    title: '',
    body: '',
    audience: 'all' as AnnouncementAudience,
    isPinned: false,
  });

  useEffect(() => {
    if (!organizationId) return;
    loadAnnouncements();
  }, [organizationId]);

  async function loadAnnouncements() {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, 'organizations', organizationId, 'announcements'),
        orderBy('createdAt', 'desc')
      ));
      // parents must not see staff-only announcements
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Announcement)
        .filter(a => role !== 'parent' || a.audience !== 'staff'));
    } catch {
      toast({ title: 'Gagal memuat pengumuman', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  function openAdd() { setEditing(null); setForm({ title: '', body: '', audience: 'all', isPinned: false }); setShowDialog(true); }
  function openEdit(a: Announcement) {
    setEditing(a);
    setForm({ title: a.title ?? '', body: a.body ?? '', audience: a.audience ?? 'all', isPinned: !!a.isPinned });
    setShowDialog(true);
  }

  async function saveAnnouncement() {
    if (!organizationId) return;
    if (!form.title.trim() || !form.body.trim()) {
      toast({ title: 'Isi judul dan isi pengumuman', variant: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      const payload = { title: form.title.trim(), body: form.body.trim(), audience: form.audience, isPinned: form.isPinned, updatedAt: serverTimestamp() };
      if (editing) {
        await updateDoc(doc(db, 'organizations', organizationId, 'announcements', editing.id), payload);
        toast({ title: 'Pengumuman diperbarui', variant: 'success' });
      } else {
        await addDoc(collection(db, 'organizations', organizationId, 'announcements'), {
          ...payload,
          organizationId,
          authorId: user?.uid ?? '',
          authorName: userProfile?.displayName || user?.displayName || user?.email || '',
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Pengumuman berhasil dibuat', variant: 'success' });
      }
      setShowDialog(false);
      setEditing(null);
      loadAnnouncements();
    } catch {
      toast({ title: 'Gagal menyimpan pengumuman', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  async function togglePin(a: Announcement) {
    if (!organizationId) return;
    try {
      await updateDoc(doc(db, 'organizations', organizationId, 'announcements', a.id), { isPinned: !a.isPinned, updatedAt: serverTimestamp() });
      setAnnouncements((prev) => prev.map((x) => (x.id === a.id ? { ...x, isPinned: !a.isPinned } : x)));
    } catch { toast({ title: 'Gagal mengubah sematan', variant: 'error' }); }
  }

  async function deleteAnnouncement(a: Announcement) {
    if (!organizationId) return;
    if (!(await confirm({ title: 'Hapus pengumuman?', description: `"${a.title}" akan dihapus.` }))) return;
    try {
      await deleteDoc(doc(db, 'organizations', organizationId, 'announcements', a.id));
      toast({ title: 'Pengumuman dihapus', variant: 'success' });
      loadAnnouncements();
    } catch { toast({ title: 'Gagal menghapus pengumuman', variant: 'error' }); }
  }

  const cardActions = canManage ? { onEdit: openEdit, onDelete: deleteAnnouncement, onTogglePin: togglePin } : undefined;

  const pinned = announcements.filter(a => a.isPinned);
  const regular = announcements.filter(a => !a.isPinned);

  return (
    <div>
      <Topbar title="Komunikasi" subtitle="Pengumuman dan pesan untuk orang tua dan staf" />

      <div className="p-4 sm:p-6 space-y-5">
        {/* Tabs */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1 max-w-full overflow-x-auto">
            <button
              onClick={() => setActiveTab('pengumuman')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'pengumuman' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
            >
              <Megaphone className="h-3.5 w-3.5" /> Pengumuman
            </button>
            <button
              onClick={() => setActiveTab('pesan')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'pesan' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Pesan
            </button>
          </div>
          {activeTab === 'pengumuman' && canManage && (
            <Button onClick={openAdd} className="gap-2 ml-auto shrink-0">
              <Plus className="h-4 w-4" /> Buat Pengumuman
            </Button>
          )}
        </div>

        {activeTab === 'pengumuman' ? (
          isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-stone-100 animate-pulse" />)}
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-16 text-stone-400">
              <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Belum ada pengumuman</p>
            </div>
          ) : (
            <div className="space-y-5">
              {pinned.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">📌 Disematkan</p>
                  <div className="space-y-3">
                    {pinned.map(a => <AnnouncementCard key={a.id} announcement={a} actions={cardActions} />)}
                  </div>
                </div>
              )}
              {regular.length > 0 && (
                <div>
                  {pinned.length > 0 && <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Terbaru</p>}
                  <div className="space-y-3">
                    {regular.map(a => <AnnouncementCard key={a.id} announcement={a} actions={cardActions} />)}
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="text-center py-16 text-stone-400">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium text-stone-500">Fitur Pesan Langsung</p>
            <p className="text-xs mt-1">Sedang dalam pengembangan</p>
          </div>
        )}
      </div>

      {/* Dialog */}
      {showDialog && (
        <div role="dialog" aria-modal="true" aria-label={editing ? 'Edit Pengumuman' : 'Buat Pengumuman'} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h2 className="text-base font-semibold">{editing ? 'Edit Pengumuman' : 'Buat Pengumuman'}</h2>
              <button onClick={() => setShowDialog(false)} className="rounded-xl p-1.5 hover:bg-stone-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Judul <span className="text-red-500">*</span></label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Judul pengumuman..."
                  className="w-full h-10 rounded-xl border border-stone-200 px-3 text-sm focus:border-coral-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Isi Pengumuman <span className="text-red-500">*</span></label>
                <textarea
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  rows={4}
                  placeholder="Tulis pengumuman di sini..."
                  className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:border-coral-400 focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Ditujukan Untuk</label>
                <div className="flex gap-2">
                  {(Object.keys(AUDIENCE_CONFIG) as AnnouncementAudience[]).map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, audience: a }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border ${
                        form.audience === a
                          ? 'bg-coral-500 text-white border-coral-500'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      {AUDIENCE_CONFIG[a].label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPinned}
                  onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-stone-700">Sematkan pengumuman ini</span>
              </label>
            </div>
            <div className="p-5 pt-0 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
              <Button onClick={saveAnnouncement} isLoading={isSaving}>{editing ? 'Simpan Perubahan' : 'Publikasikan'}</Button>
            </div>
          </div>
        </div>
      )}
      {confirmEl}
    </div>
  );
}

interface CardActions {
  onEdit: (a: Announcement) => void;
  onDelete: (a: Announcement) => void;
  onTogglePin: (a: Announcement) => void;
}

function AnnouncementCard({ announcement, actions }: { announcement: Announcement; actions?: CardActions }) {
  const created = toDateSafe(announcement.createdAt);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {announcement.isPinned && <Pin className="h-3.5 w-3.5 text-coral-500 shrink-0" />}
              <p className="text-sm font-semibold text-stone-900">{announcement.title}</p>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">{announcement.body}</p>
            <div className="mt-2 flex items-center gap-3 text-xs text-stone-400">
              <span className="flex items-center gap-1">
                <div className="h-4 w-4 rounded-full bg-coral-100 text-coral-500 flex items-center justify-center text-[9px] font-bold">
                  {inisial(announcement.authorName)}
                </div>
                {announcement.authorName || 'Admin'}
              </span>
              <span>{created ? formatDistanceToNow(created, { addSuffix: true, locale: localeId }) : '–'}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge variant={(AUDIENCE_CONFIG[announcement.audience] ?? AUDIENCE_CONFIG.all).variant}>
              {(AUDIENCE_CONFIG[announcement.audience] ?? AUDIENCE_CONFIG.all).label}
            </Badge>
            {actions && (
              <div className="flex gap-1">
                <button title={announcement.isPinned ? 'Lepas sematan' : 'Sematkan'} aria-label={announcement.isPinned ? 'Lepas sematan' : 'Sematkan'}
                  onClick={() => actions.onTogglePin(announcement)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-coral-600 hover:bg-coral-50">
                  {announcement.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                </button>
                <button title="Edit" aria-label="Edit pengumuman" onClick={() => actions.onEdit(announcement)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-coral-600 hover:bg-coral-50"><Pencil className="h-3.5 w-3.5" /></button>
                <button title="Hapus" aria-label="Hapus pengumuman" onClick={() => actions.onDelete(announcement)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
