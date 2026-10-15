'use client';

import React, { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, getDocs, addDoc, updateDoc,
  doc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  CheckSquare, Plus, X, Clock, AlertCircle,
  CheckCircle2, Circle, Calendar, User,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format, isPast, isToday } from 'date-fns';
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

interface StaffMember {
  id: string;
  fullName: string;
  userId: string;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  todo:        { label: 'Belum Mulai', icon: <Circle className="h-4 w-4" />,        color: 'text-stone-500', bg: 'bg-stone-100' },
  in_progress: { label: 'Sedang Dikerjakan', icon: <Clock className="h-4 w-4" />,  color: 'text-blue-600',  bg: 'bg-blue-50' },
  done:        { label: 'Selesai',    icon: <CheckCircle2 className="h-4 w-4" />,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; variant: 'danger' | 'warning' | 'info' }> = {
  high:   { label: 'Tinggi',  variant: 'danger' },
  medium: { label: 'Sedang',  variant: 'warning' },
  low:    { label: 'Rendah',  variant: 'info' },
};

export default function TugasPage() {
  const { organizationId, user, can } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'semua'>('semua');
  const [showDialog, setShowDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    title: '', description: '',
    priority: 'medium' as TaskPriority,
    assignedTo: '', assignedName: '',
    dueDate: '',
  });

  useEffect(() => {
    if (!organizationId) return;
    loadData();
  }, [organizationId]);

  async function loadData() {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const [taskSnap, staffSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'organizations', organizationId, 'tasks'),
          orderBy('createdAt', 'desc')
        )),
        getDocs(query(
          collection(db, 'organizations', organizationId, 'staff'),
          where('status', '==', 'aktif'),
          orderBy('fullName')
        )),
      ]);
      setTasks(taskSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Task));
      setStaff(staffSnap.docs.map(d => ({ id: d.id, ...d.data() }) as StaffMember));
    } catch {
      toast({ title: 'Gagal memuat tugas', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  async function saveTask() {
    if (!organizationId) return;
    if (!form.title.trim()) {
      toast({ title: 'Isi judul tugas', variant: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'organizations', organizationId, 'tasks'), {
        organizationId,
        title: form.title,
        description: form.description,
        status: 'todo' as TaskStatus,
        priority: form.priority,
        assignedTo: form.assignedTo,
        assignedName: form.assignedName,
        dueDate: form.dueDate || null,
        createdBy: user?.uid ?? '',
        completedAt: null,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Tugas berhasil dibuat', variant: 'success' });
      setShowDialog(false);
      setForm({ title: '', description: '', priority: 'medium', assignedTo: '', assignedName: '', dueDate: '' });
      loadData();
    } catch {
      toast({ title: 'Gagal membuat tugas', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  async function updateTaskStatus(taskId: string, newStatus: TaskStatus) {
    if (!organizationId) return;
    try {
      await updateDoc(doc(db, 'organizations', organizationId, 'tasks', taskId), {
        status: newStatus,
        ...(newStatus === 'done' ? { completedAt: serverTimestamp() } : { completedAt: null }),
      });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      toast({ title: 'Status tugas diperbarui', variant: 'success' });
    } catch {
      toast({ title: 'Gagal memperbarui status', variant: 'error' });
    }
  }

  const displayed = filterStatus === 'semua' ? tasks : tasks.filter(t => t.status === filterStatus);

  const counts: Record<TaskStatus | 'semua', number> = {
    semua: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  };

  const overdueCount = tasks.filter(t =>
    t.status !== 'done' && t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))
  ).length;

  return (
    <div>
      <Topbar title="Tugas & Pengingat" subtitle="Kelola tugas harian dan penugasan staf" />

      <div className="p-6 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-xl p-3 bg-stone-50">
            <p className="text-xl font-bold text-stone-700">{counts.todo}</p>
            <p className="text-xs text-stone-500 mt-0.5">Belum Mulai</p>
          </div>
          <div className="rounded-xl p-3 bg-blue-50">
            <p className="text-xl font-bold text-blue-600">{counts.in_progress}</p>
            <p className="text-xs text-stone-500 mt-0.5">Sedang Dikerjakan</p>
          </div>
          <div className="rounded-xl p-3 bg-emerald-50">
            <p className="text-xl font-bold text-emerald-600">{counts.done}</p>
            <p className="text-xs text-stone-500 mt-0.5">Selesai</p>
          </div>
          <div className="rounded-xl p-3 bg-red-50">
            <p className="text-xl font-bold text-red-600">{overdueCount}</p>
            <p className="text-xs text-stone-500 mt-0.5">Terlambat</p>
          </div>
        </div>

        {/* Tabs + Action */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1 max-w-full overflow-x-auto">
            {(['semua', 'todo', 'in_progress', 'done'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${filterStatus === s ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
              >
                {s === 'semua' ? 'Semua' : STATUS_CONFIG[s].label}
                {counts[s] > 0 && (
                  <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${filterStatus === s ? 'bg-coral-100 text-coral-600' : 'bg-stone-200 text-stone-500'}`}>
                    {counts[s]}
                  </span>
                )}
              </button>
            ))}
          </div>
          {can('create') && (
            <Button onClick={() => setShowDialog(true)} className="gap-2 ml-auto shrink-0">
              <Plus className="h-4 w-4" /> Buat Tugas
            </Button>
          )}
        </div>

        {/* Task List */}
        {isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-stone-100 animate-pulse" />)}</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Tidak ada tugas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map(task => {
              const isOverdue = task.status !== 'done' && task.dueDate &&
                isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));
              return (
                <Card key={task.id} className={task.status === 'done' ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Status toggle */}
                      <button
                        onClick={() => {
                          const next: TaskStatus = task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'todo';
                          updateTaskStatus(task.id, next);
                        }}
                        className={`mt-0.5 shrink-0 ${STATUS_CONFIG[task.status].color}`}
                        title="Klik untuk ubah status"
                      >
                        {STATUS_CONFIG[task.status].icon}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant={PRIORITY_CONFIG[task.priority].variant} className="text-xs">
                              {PRIORITY_CONFIG[task.priority].label}
                            </Badge>
                          </div>
                        </div>
                        {task.description && (
                          <p className="text-xs text-stone-500 mt-1">{task.description}</p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-stone-400">
                          {task.assignedName && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" /> {task.assignedName}
                            </span>
                          )}
                          {task.dueDate && (
                            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
                              <Calendar className="h-3 w-3" />
                              {isOverdue && '⚠ '}
                              {isToday(new Date(task.dueDate)) ? 'Hari ini' : format(new Date(task.dueDate), 'd MMM yyyy', { locale: localeId })}
                            </span>
                          )}
                          <span className={`flex items-center gap-1 ${STATUS_CONFIG[task.status].color}`}>
                            {STATUS_CONFIG[task.status].label}
                          </span>
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

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h2 className="text-base font-semibold">Buat Tugas Baru</h2>
              <button onClick={() => setShowDialog(false)} className="rounded-xl p-1.5 hover:bg-stone-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <Input label="Judul Tugas *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Apa yang perlu dikerjakan?" />
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Keterangan</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Detail tugas (opsional)..."
                  className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:border-coral-400 focus:outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">Prioritas</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
                    className="w-full h-10 rounded-xl border border-stone-200 px-3 text-sm focus:border-coral-400 focus:outline-none">
                    <option value="low">Rendah</option>
                    <option value="medium">Sedang</option>
                    <option value="high">Tinggi</option>
                  </select>
                </div>
                <Input label="Batas Waktu" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Ditugaskan Kepada</label>
                <select
                  value={form.assignedTo}
                  onChange={e => {
                    const s = staff.find(st => st.id === e.target.value);
                    setForm(f => ({ ...f, assignedTo: e.target.value, assignedName: s?.fullName ?? '' }));
                  }}
                  className="w-full h-10 rounded-xl border border-stone-200 px-3 text-sm focus:border-coral-400 focus:outline-none"
                >
                  <option value="">Pilih staf (opsional)...</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                </select>
              </div>
            </div>
            <div className="p-5 pt-0 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
              <Button onClick={saveTask} isLoading={isSaving}>Buat Tugas</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
