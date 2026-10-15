'use client';

import React, { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, getDocs,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Building2, Plus, Edit2, Trash2, Users, Baby } from 'lucide-react';
import type { Room } from '@/types';
import { toast } from '@/hooks/use-toast';

const EMOJI_OPTIONS = ['🐰','☀️','⭐','🌈','🦋','🐻','🌸','🐠','🦁','🌻','🐸','🚀'];
const GRADIENT_OPTIONS = [
  { label: 'Pink',   value: 'from-pink-400 to-rose-500' },
  { label: 'Kuning', value: 'from-amber-400 to-orange-500' },
  { label: 'Biru',   value: 'from-sky-400 to-blue-500' },
  { label: 'Hijau',  value: 'from-emerald-400 to-teal-500' },
  { label: 'Ungu',   value: 'from-violet-400 to-purple-500' },
  { label: 'Merah',  value: 'from-red-400 to-rose-600' },
];

interface RoomWithMeta extends Room {
  emoji?: string;
  gradient?: string;
}

interface FormData {
  name: string;
  ageGroupMin: number;
  ageGroupMax: number;
  capacity: number;
  emoji: string;
  gradient: string;
  isActive: boolean;
}

const DEFAULT_FORM: FormData = {
  name: '',
  ageGroupMin: 0,
  ageGroupMax: 12,
  capacity: 10,
  emoji: '⭐',
  gradient: 'from-sky-400 to-blue-500',
  isActive: true,
};

function monthsToLabel(min: number, max: number): string {
  const fmt = (m: number) => m < 12 ? `${m} bln` : `${Math.floor(m / 12)} thn`;
  return `${fmt(min)} – ${fmt(max)}`;
}

export default function RuanganPage() {
  const { organizationId, can } = useAuth();
  const [rooms, setRooms] = useState<RoomWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomWithMeta | null>(null);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<RoomWithMeta | null>(null);

  const canEdit = can?.('edit') ?? true;

  useEffect(() => {
    if (!organizationId) return;
    loadRooms();
  }, [organizationId]);

  async function loadRooms() {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'organizations', organizationId, 'rooms'),
        orderBy('name')
      );
      // Occupancy = active children assigned to the room (the stored field was never updated)
      const [snap, childSnap] = await Promise.all([
        getDocs(q),
        getDocs(query(collection(db, 'organizations', organizationId, 'children'), where('status', '==', 'active'))),
      ]);
      const occ = new Map<string, number>();
      childSnap.docs.forEach((d) => { const r = d.data().roomId as string | undefined; if (r) occ.set(r, (occ.get(r) ?? 0) + 1); });
      setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data(), currentOccupancy: occ.get(d.id) ?? 0 }) as RoomWithMeta));
    } catch (e) {
      console.error(e);
      toast({ title: 'Gagal memuat data ruangan', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  function openAdd() {
    setEditingRoom(null);
    setFormData(DEFAULT_FORM);
    setShowDialog(true);
  }

  function openEdit(room: RoomWithMeta) {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      ageGroupMin: room.ageGroupMin,
      ageGroupMax: room.ageGroupMax,
      capacity: room.capacity,
      emoji: room.emoji ?? '⭐',
      gradient: room.gradient ?? 'from-sky-400 to-blue-500',
      isActive: room.isActive,
    });
    setShowDialog(true);
  }

  async function saveRoom() {
    if (!organizationId) return;
    if (!formData.name.trim()) {
      toast({ title: 'Nama ruangan wajib diisi', variant: 'error' });
      return;
    }
    if (formData.ageGroupMin >= formData.ageGroupMax) {
      toast({ title: 'Usia minimum harus lebih kecil dari maksimum', variant: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        organizationId,
        branchId: '',
        name: formData.name.trim(),
        ageGroupMin: Number(formData.ageGroupMin),
        ageGroupMax: Number(formData.ageGroupMax),
        capacity: Number(formData.capacity),
        currentOccupancy: editingRoom?.currentOccupancy ?? 0,
        caregiverIds: editingRoom?.caregiverIds ?? [],
        emoji: formData.emoji,
        gradient: formData.gradient,
        isActive: formData.isActive,
        updatedAt: serverTimestamp(),
      };
      if (editingRoom) {
        await updateDoc(doc(db, 'organizations', organizationId, 'rooms', editingRoom.id), payload);
        toast({ title: 'Ruangan berhasil diperbarui' });
      } else {
        await addDoc(collection(db, 'organizations', organizationId, 'rooms'), { ...payload, createdAt: serverTimestamp() });
        toast({ title: 'Ruangan berhasil ditambahkan' });
      }
      setShowDialog(false);
      loadRooms();
    } catch (e) {
      console.error(e);
      toast({ title: 'Gagal menyimpan', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteRoom(room: RoomWithMeta) {
    if (!organizationId) return;
    try {
      await deleteDoc(doc(db, 'organizations', organizationId, 'rooms', room.id));
      toast({ title: 'Ruangan dihapus' });
      setDeleteConfirm(null);
      loadRooms();
    } catch (e) {
      console.error(e);
      toast({ title: 'Gagal menghapus', variant: 'error' });
    }
  }

  const activeRooms = rooms.filter((r) => r.isActive);
  const inactiveRooms = rooms.filter((r) => !r.isActive);

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar title="Ruangan" subtitle="Master data ruangan & kapasitas" />
      <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full space-y-6">

        {/* Summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Ruangan', value: rooms.length, icon: <Building2 className="h-4 w-4" />, color: 'bg-sky-50 text-sky-700' },
            { label: 'Aktif', value: activeRooms.length, icon: <Building2 className="h-4 w-4" />, color: 'bg-emerald-50 text-emerald-700' },
            { label: 'Total Kapasitas', value: activeRooms.reduce((s, r) => s + r.capacity, 0), icon: <Users className="h-4 w-4" />, color: 'bg-violet-50 text-violet-700' },
            { label: 'Terisi', value: activeRooms.reduce((s, r) => s + (r.currentOccupancy ?? 0), 0), icon: <Baby className="h-4 w-4" />, color: 'bg-amber-50 text-amber-700' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-4 ${s.color.split(' ')[0]} flex items-center gap-3`}>
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.color.replace('bg-', 'bg-').replace('50', '100')}`}>
                <span className={s.color.split(' ')[1]}>{s.icon}</span>
              </div>
              <div>
                <p className="text-xs text-stone-500">{s.label}</p>
                <p className={`text-xl font-bold ${s.color.split(' ')[1]}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-700">Daftar Ruangan</h2>
          {canEdit && (
            <Button size="sm" onClick={openAdd} className="gap-1.5 bg-coral-500 hover:bg-coral-600 text-white">
              <Plus className="h-4 w-4" /> Tambah Ruangan
            </Button>
          )}
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-stone-100 animate-pulse" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-16 w-16 rounded-2xl bg-stone-100 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-stone-300" />
            </div>
            <p className="text-stone-400 text-sm">Belum ada ruangan</p>
            {canEdit && (
              <Button size="sm" onClick={openAdd} variant="outline">Tambah Ruangan Pertama</Button>
            )}
          </div>
        ) : (
          <>
            {activeRooms.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeRooms.map((room) => (
                  <RoomCard key={room.id} room={room} canEdit={canEdit} onEdit={openEdit} onDelete={setDeleteConfirm} />
                ))}
              </div>
            )}
            {inactiveRooms.length > 0 && (
              <>
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mt-2">Nonaktif</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inactiveRooms.map((room) => (
                    <RoomCard key={room.id} room={room} canEdit={canEdit} onEdit={openEdit} onDelete={setDeleteConfirm} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRoom ? 'Edit Ruangan' : 'Tambah Ruangan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Preview */}
            <div className={`h-16 rounded-xl bg-gradient-to-br ${formData.gradient} flex items-center gap-3 px-4`}>
              <span className="text-3xl">{formData.emoji}</span>
              <div>
                <p className="text-white font-semibold">{formData.name || 'Nama Ruangan'}</p>
                <p className="text-white/70 text-xs">{monthsToLabel(formData.ageGroupMin, formData.ageGroupMax)} · kapasitas {formData.capacity}</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Nama Ruangan *</label>
              <Input
                placeholder="cth: Ruang Kelinci"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Usia Min (bulan)</label>
                <Input type="number" min={0} value={formData.ageGroupMin}
                  onChange={(e) => setFormData({ ...formData, ageGroupMin: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Usia Maks (bulan)</label>
                <Input type="number" min={1} value={formData.ageGroupMax}
                  onChange={(e) => setFormData({ ...formData, ageGroupMax: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Kapasitas</label>
                <Input type="number" min={1} value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })} />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-stone-600 mb-2 block">Emoji</label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((e) => (
                  <button key={e} onClick={() => setFormData({ ...formData, emoji: e })}
                    className={`h-9 w-9 rounded-lg text-xl flex items-center justify-center border-2 transition-all ${
                      formData.emoji === e ? 'border-coral-400 bg-coral-50 scale-110' : 'border-stone-100 hover:border-stone-200'
                    }`}>{e}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-stone-600 mb-2 block">Warna</label>
              <div className="flex flex-wrap gap-2">
                {GRADIENT_OPTIONS.map((g) => (
                  <button key={g.value} onClick={() => setFormData({ ...formData, gradient: g.value })}
                    className={`h-8 w-8 rounded-lg bg-gradient-to-br ${g.value} border-2 transition-all ${
                      formData.gradient === g.value ? 'border-stone-700 scale-110' : 'border-transparent hover:border-stone-300'
                    }`} title={g.label} />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded" />
              <label htmlFor="isActive" className="text-sm text-stone-700">Ruangan aktif</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
            <Button onClick={saveRoom} disabled={isSaving} className="bg-coral-500 hover:bg-coral-600 text-white">
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Ruangan?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-600">
            Ruangan <strong>{deleteConfirm?.name}</strong> akan dihapus permanen. Pastikan tidak ada anak yang terdaftar di ruangan ini.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteRoom(deleteConfirm)}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoomCard({ room, canEdit, onEdit, onDelete }: {
  room: RoomWithMeta;
  canEdit: boolean;
  onEdit: (r: RoomWithMeta) => void;
  onDelete: (r: RoomWithMeta) => void;
}) {
  const pct = room.capacity > 0 ? Math.round(((room.currentOccupancy ?? 0) / room.capacity) * 100) : 0;
  const gradient = room.gradient ?? 'from-sky-400 to-blue-500';
  const emoji = room.emoji ?? '⭐';

  return (
    <Card className={`overflow-hidden border border-stone-100 shadow-sm hover:shadow-md transition-all ${!room.isActive ? 'opacity-60' : ''}`}>
      <div className={`h-2 bg-gradient-to-r ${gradient}`} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-xl shadow-sm`}>
              {emoji}
            </div>
            <div>
              <p className="font-semibold text-stone-900 text-sm">{room.name}</p>
              <p className="text-xs text-stone-400">{monthsToLabel(room.ageGroupMin, room.ageGroupMax)}</p>
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-1">
              <button onClick={() => onEdit(room)} className="h-7 w-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-sky-500 hover:bg-sky-50 transition-colors">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onDelete(room)} className="h-7 w-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-500 flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Kapasitas
            </span>
            <span className={`font-bold px-2 py-0.5 rounded-lg text-xs ${
              pct >= 90 ? 'bg-red-50 text-red-600' :
              pct >= 70 ? 'bg-amber-50 text-amber-600' :
              'bg-emerald-50 text-emerald-600'
            }`}>
              {room.currentOccupancy ?? 0}/{room.capacity}
            </span>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all`}
              style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-stone-400">{pct}% kapasitas terisi</p>
        </div>

        {!room.isActive && (
          <Badge variant="secondary" className="mt-2 text-xs">Nonaktif</Badge>
        )}
      </CardContent>
    </Card>
  );
}
