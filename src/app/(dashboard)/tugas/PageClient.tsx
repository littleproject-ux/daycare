'use client';

import React, { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { CheckSquare, Plus, X, Clock, CheckCircle2, Circle, Calendar, User, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

type TaskStatus = 'todo' | 'in_progress' | 'done';
type TaskPriority = 'low' | 'medium' | 'high';

interface Task {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string;
  assignedName: string;
  dueDate: string | null;
  createdBy: string;
  createdAt: Timestamp;
  completedAt: Timestamp | null;
}

interface StaffMember { id: string; fullName: string; userId: string }

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ReactNode; color: string }> = {
  todo:        { label: 'Belum Mulai',       icon: <Circle className="h-4 w-4" />,       color: 'text-stone-500' },
  in_progress: { label: 'Sedang Dikerjakan', icon: <Clock className="h-4 w-4" />,        color: 'text-blue-600' },
  done:        { label: 'Selesai',           icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-emerald-600' },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; variant: 'danger' | 'warning' | 'info' }> = {
  high:   { label: 'Tinggi', variant: 'danger' },
  medium: { label: 'Sedang', variant: 'warning' },
  low:    { label: 'Rendah', variant: 'info' },
};

const EMPTY = { title: '', description: '', priority: 'medium' as TaskPriority, status: 'todo' as TaskStatus, assignedTo: '', assignedName: '', dueDate: '' };
const selCls = 'w-full h-10 rounded-xl border border-stone-200 px-3 text-sm focus:border-coral-400 focus:outline-none';
const isLate = (t: Task) => t.status !== 'done' && !!t.dueDate && isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate));

export default function TugasPage() {
  const { organizationId, user, hasRole } = useAuth();
  // firestore.rules: tasks create/delete → owner/admin; status update → any staff
  const canManage = hasRole('owner', 'admin');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'semua'>('semua');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [confirm, confirmEl] = useConfirm();

  useEffect(() => {
    if (!organizationId) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  async function loadData() {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const [taskSnap, staffSnap] = await Promise.all([
        getDocs(query(collection(db, 'organizations', organizationId, 'tasks'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'organizations', organizationId, 'staff'), where('status', '==', 'aktif'))),
      ]);
      setTasks(taskSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Task));
      setStaff(staffSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as StaffMember)
        .sort((a, b) => String(a.fullName ?? '').localeCompare(String(b.fullName ?? ''))));
    } catch {
      toast({ title: 'Gagal memuat tugas', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  function openAdd() { setEditing(null); setForm(EMPTY); setShowDialog(true); }
  function openEdit(t: Task) {
    setEditing(t);
    setForm({
      title: t.title ?? '', description: t.description ?? '', priority: t.priority ?? 'medium', status: t.status ?? 'todo',
      assignedTo: t.assignedTo ?? '', assignedName: t.assignedName ?? '', dueDate: t.dueDate ?? '',
    });
    setShowDialog(true);
  }

  async function saveTask() {
    if (!organizationId) return;
    if (!form.title.trim()) { toast({ title: 'Isi judul tugas', variant: 'error' }); return; }
    setIsSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        assignedTo: form.assignedTo,
        assignedName: form.assignedName,
        dueDate: form.dueDate || null,
        updatedAt: serverTimestamp(),
      };
      if (editing) {
        const statusChanged = form.status !== editing.status;
        await updateDoc(doc(db, 'organizations', organizationId, 'tasks', editing.id), {
          ...payload,
          status: form.status,
          ...(statusChanged ? { completedAt: form.status === 'done' ? serverTimestamp() : null } : {}),
        });
        toast({ title: 'Tugas diperbarui', variant: 'success' });
      } else {
        await addDoc(collection(db, 'organizations', organizationId, 'tasks'), {
          ...payload,
          organizationId,
          status: 'todo' as TaskStatus,
          createdBy: user?.uid ?? '',
          completedAt: null,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Tugas berhasil dibuat', variant: 'success' });
      }
      setShowDialog(false);
      setEditing(null);
      loadData();
    } catch {
      toast({ title: 'Gagal menyimpan tugas', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  async function updateTaskStatus(taskId: string, newStatus: TaskStatus) {
    if (!organizationId) return;
    try {
      await updateDoc(doc(db, 'organizations', organizationId, 'tasks', taskId), {
        status: newStatus,
        completedAt: newStatus === 'done' ? serverTimestamp() : null,
      });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
      toast({ title: 'Status tugas diperbarui', variant: 'success' });
    } catch {
      toast({ title: 'Gagal memperbarui status', variant: 'error' });
    }
  }

  async function deleteTask(t: Task) {
    if (!organizationId) return;
    if (!(await confirm({ title: 'Hapus tugas?', description: `"${t.title}" akan dihapus.` }))) return;
    try {
      await deleteDoc(doc(db, 'organizations', organizationId, 'tasks', t.id));
      toast({ title: 'Tugas dihapus', variant: 'success' });
      loadData();
    } catch {
      toast({ title: 'Gagal menghapus tugas', variant: 'error' });
    }
  }

  const displayed = filterStatus === 'semua' ? tasks : tasks.filter((t) => t.status === filterStatus);
  const counts: Record<TaskStatus | 'semua', number> = {
    semua: tasks.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
  };
  const overdueCount = tasks.filter(isLate).length;

  return (
    <div>
      <Topbar title="Tugas & Pengingat" subtitle="Kelola tugas harian dan penugasan staf" />

      <div className="p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl p-3 bg-stone-50"><p className="text-xl font-bold text-stone-700">{counts.todo}</p><p className="text-xs text-stone-500 mt-0.5">Belum Mulai</p></div>
          <div className="rounded-xl p-3 bg-blue-50"><p className="text-xl font-bold text-blue-600">{counts.in_progress}</p><p className="text-xs text-stone-500 mt-0.5">Sedang Dikerjakan</p></div>
          <div className="rounded-xl p-3 bg-emerald-50"><p className="text-xl font-bold text-emerald-600">{counts.done}</p><p className="text-xs text-stone-500 mt-0.5">Selesai</p></div>
          <div className="rounded-xl p-3 bg-red-50"><p className="text-xl font-bold text-red-600">{overdueCount}</p><p className="text-xs text-stone-500 mt-0.5">Terlambat</p></div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1 max-w-full overflow-x-auto">
            {(['semua', 'todo', 'in_progress', 'done'] as const).map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${filterStatus === s ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
                {s === 'semua' ? 'Semua' : STATUS_CONFIG[s].label}
                {counts[s] > 0 && (
                  <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${filterStatus === s ? 'bg-coral-100 text-coral-600' : 'bg-stone-200 text-stone-500'}`}>{counts[s]}</span>
                )}
              </button>
            ))}
          </div>
          {canManage && (
            <Button onClick={openAdd} className="gap-2 ml-auto shrink-0"><Plus className="h-4 w-4" /> Buat Tugas</Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-stone-100 animate-pulse" />)}</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Tidak ada tugas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map((task) => {
              const late = isLate(task);
              const due = task.dueDate ? parseISO(task.dueDate) : null;
              const st = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.todo;
              const pr = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
              return (
                <Card key={task.id} data-testid="task-row" className={task.status === 'done' ? 'opacity-70' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => updateTaskStatus(task.id, task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'todo')}
                        className={`mt-0.5 shrink-0 ${st.color}`} title="Klik untuk ubah status" aria-label="Ubah status">
                        {st.icon}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-stone-400' : 'text-stone-800'}`}>{task.title}</p>
                          <Badge variant={pr.variant} className="text-xs shrink-0">{pr.label}</Badge>
                        </div>
                        {task.description && <p className="text-xs text-stone-500 mt-1">{task.description}</p>}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-stone-400">
                          {task.assignedName && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {task.assignedName}</span>}
                          {due && (
                            <span className={`flex items-center gap-1 ${late ? 'text-red-500 font-medium' : ''}`}>
                              <Calendar className="h-3 w-3" />{late && '⚠ '}
                              {isToday(due) ? 'Hari ini' : format(due, 'd MMM yyyy', { locale: localeId })}
                            </span>
                          )}
                          <span className={st.color}>{st.label}</span>
                          {canManage && (
                            <span className="ml-auto flex gap-1">
                              <button title="Edit" aria-label="Edit tugas" onClick={() => openEdit(task)}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-coral-600 hover:bg-coral-50"><Pencil className="h-3.5 w-3.5" /></button>
                              <button title="Hapus" aria-label="Hapus tugas" onClick={() => deleteTask(task)}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {showDialog && (
        <div role="dialog" aria-modal="true" aria-label={editing ? 'Edit Tugas' : 'Buat Tugas Baru'}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          onKeyDown={(e) => { if (e.key === 'Escape') setShowDialog(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h2 className="text-base font-semibold">{editing ? 'Edit Tugas' : 'Buat Tugas Baru'}</h2>
              <button aria-label="Tutup" onClick={() => setShowDialog(false)} className="rounded-xl p-1.5 hover:bg-stone-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <Input label="Judul Tugas" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Apa yang perlu dikerjakan?" />
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Keterangan</label>
                <textarea aria-label="Keterangan tugas" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Detail tugas (opsional)..."
                  className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:border-coral-400 focus:outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">Prioritas</label>
                  <select aria-label="Prioritas" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))} className={selCls}>
                    <option value="low">Rendah</option><option value="medium">Sedang</option><option value="high">Tinggi</option>
                  </select>
                </div>
                <Input label="Batas Waktu" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
              {editing && (
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">Status</label>
                  <select aria-label="Status tugas" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TaskStatus }))} className={selCls}>
                    {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Ditugaskan Kepada</label>
                <select aria-label="Ditugaskan kepada" value={form.assignedTo}
                  onChange={(e) => {
                    const s = staff.find((st) => st.id === e.target.value);
                    setForm((f) => ({ ...f, assignedTo: e.target.value, assignedName: s?.fullName ?? '' }));
                  }}
                  className={selCls}>
                  <option value="">Tidak ditugaskan</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                  {editing?.assignedTo && !staff.some((s) => s.id === editing.assignedTo) && (
                    <option value={editing.assignedTo}>{editing.assignedName} (nonaktif)</option>
                  )}
                </select>
              </div>
            </div>
            <div className="p-5 pt-0 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
              <Button onClick={saveTask} isLoading={isSaving}>{editing ? 'Simpan Perubahan' : 'Buat Tugas'}</Button>
            </div>
          </div>
        </div>
      )}
      {confirmEl}
    </div>
  );
}
