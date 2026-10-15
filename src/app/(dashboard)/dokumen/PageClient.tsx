'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  collection, query, where, orderBy, getDocs, addDoc, deleteDoc,
  doc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileText, Upload, X, Download, Trash2, Search,
  FolderOpen, AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

type DocCategory = 'anak' | 'staf' | 'organisasi' | 'perizinan' | 'keuangan' | 'lainnya';

interface DaycareDocument {
  id: string;
  organizationId: string;
  name: string;
  category: DocCategory;
  description: string;
  fileUrl: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  expiryDate: string | null;
  uploadedBy: string;
  createdAt: Timestamp;
}

const CATEGORY_CONFIG: Record<DocCategory, { label: string; color: string; bg: string }> = {
  anak:         { label: 'Data Anak',    color: 'text-coral-700',   bg: 'bg-coral-50' },
  staf:         { label: 'Staf',         color: 'text-blue-700',    bg: 'bg-blue-50' },
  organisasi:   { label: 'Organisasi',   color: 'text-violet-700',  bg: 'bg-violet-50' },
  perizinan:    { label: 'Perizinan',    color: 'text-amber-700',   bg: 'bg-amber-50' },
  keuangan:     { label: 'Keuangan',     color: 'text-emerald-700', bg: 'bg-emerald-50' },
  lainnya:      { label: 'Lainnya',      color: 'text-stone-600',   bg: 'bg-stone-100' },
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function expiryStatus(expiryDate: string | null): 'ok' | 'soon' | 'expired' | null {
  if (!expiryDate) return null;
  const days = differenceInDays(new Date(expiryDate), new Date());
  if (days < 0) return 'expired';
  if (days <= 30) return 'soon';
  return 'ok';
}

export default function DokumenPage() {
  const { organizationId, user, can } = useAuth();
  const [documents, setDocuments] = useState<DaycareDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<DocCategory | 'semua'>('semua');
  const [showDialog, setShowDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    category: 'organisasi' as DocCategory,
    description: '',
    expiryDate: '',
    file: null as File | null,
  });

  useEffect(() => {
    if (!organizationId) return;
    loadDocuments();
  }, [organizationId]);

  async function loadDocuments() {
    setIsLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, 'organizations', organizationId, 'documents'),
        orderBy('createdAt', 'desc')
      ));
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() }) as DaycareDocument));
    } catch {
      toast({ title: 'Gagal memuat dokumen', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  async function uploadDocument() {
    if (!form.file || !form.name.trim()) {
      toast({ title: 'Pilih file dan isi nama dokumen', variant: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      const filePath = `orgs/${organizationId}/documents/${Date.now()}_${form.file.name}`;
      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, form.file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on('state_changed',
          (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          resolve
        );
      });

      const fileUrl = await getDownloadURL(storageRef);
      await addDoc(collection(db, 'organizations', organizationId, 'documents'), {
        organizationId,
        name: form.name,
        category: form.category,
        description: form.description,
        fileUrl,
        filePath,
        fileSize: form.file.size,
        fileType: form.file.type,
        expiryDate: form.expiryDate || null,
        uploadedBy: user?.email ?? '',
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Dokumen berhasil diunggah', variant: 'success' });
      setShowDialog(false);
      setForm({ name: '', category: 'organisasi', description: '', expiryDate: '', file: null });
      setUploadProgress(null);
      loadDocuments();
    } catch {
      toast({ title: 'Gagal mengunggah dokumen', variant: 'error' });
    } finally {
      setIsSaving(false);
      setUploadProgress(null);
    }
  }

  async function deleteDocument(doc_: DaycareDocument) {
    if (!confirm(`Hapus dokumen "${doc_.name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'organizations', organizationId, 'documents', doc_.id));
      try { await deleteObject(ref(storage, doc_.filePath)); } catch {}
      toast({ title: 'Dokumen dihapus', variant: 'success' });
      loadDocuments();
    } catch {
      toast({ title: 'Gagal menghapus dokumen', variant: 'error' });
    }
  }

  const filtered = documents.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'semua' || d.category === filterCat;
    return matchSearch && matchCat;
  });

  const expiringCount = documents.filter(d => expiryStatus(d.expiryDate) === 'soon').length;
  const expiredCount = documents.filter(d => expiryStatus(d.expiryDate) === 'expired').length;

  return (
    <div>
      <Topbar title="Dokumen" subtitle="Kelola dokumen organisasi, perizinan, dan arsip" />

      <div className="p-6 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-3 bg-stone-50">
            <p className="text-xl font-bold text-stone-700">{documents.length}</p>
            <p className="text-xs text-stone-500 mt-0.5">Total Dokumen</p>
          </div>
          <div className="rounded-xl p-3 bg-amber-50">
            <p className="text-xl font-bold text-amber-600">{expiringCount}</p>
            <p className="text-xs text-stone-500 mt-0.5">Segera Kadaluarsa</p>
          </div>
          <div className="rounded-xl p-3 bg-red-50">
            <p className="text-xl font-bold text-red-600">{expiredCount}</p>
            <p className="text-xs text-stone-500 mt-0.5">Sudah Kadaluarsa</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              className="w-full pl-9 pr-3 h-9 rounded-xl border border-stone-200 text-sm placeholder:text-stone-400 focus:border-coral-400 focus:outline-none"
              placeholder="Cari dokumen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1 overflow-x-auto">
            <button
              onClick={() => setFilterCat('semua')}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${filterCat === 'semua' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'}`}
            >Semua</button>
            {(Object.keys(CATEGORY_CONFIG) as DocCategory[]).map(c => (
              <button key={c} onClick={() => setFilterCat(c)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${filterCat === c ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'}`}
              >{CATEGORY_CONFIG[c].label}</button>
            ))}
          </div>
          {can('create') && (
            <Button onClick={() => setShowDialog(true)} className="gap-2 shrink-0">
              <Upload className="h-4 w-4" /> Unggah Dokumen
            </Button>
          )}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-stone-100 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Tidak ada dokumen ditemukan</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(d => {
              const expStatus = expiryStatus(d.expiryDate);
              return (
                <Card key={d.id}>
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-stone-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-stone-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-stone-800 truncate">{d.name}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_CONFIG[d.category].bg} ${CATEGORY_CONFIG[d.category].color}`}>
                          {CATEGORY_CONFIG[d.category].label}
                        </span>
                        {expStatus === 'expired' && (
                          <Badge variant="danger" className="gap-1 text-xs">
                            <AlertTriangle className="h-2.5 w-2.5" /> Kadaluarsa
                          </Badge>
                        )}
                        {expStatus === 'soon' && (
                          <Badge variant="warning" className="gap-1 text-xs">
                            <Clock className="h-2.5 w-2.5" /> Segera Kadaluarsa
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-3 mt-0.5 text-xs text-stone-400 flex-wrap">
                        <span>{formatBytes(d.fileSize)}</span>
                        {d.expiryDate && (
                          <span>Berlaku s/d: {format(new Date(d.expiryDate), 'd MMM yyyy', { locale: localeId })}</span>
                        )}
                        <span>Diunggah: {d.createdAt ? format(d.createdAt.toDate(), 'd MMM yyyy', { locale: localeId }) : '–'}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <a
                        href={d.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 w-8 rounded-lg border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50"
                        title="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      {can('delete') && (
                        <button
                          onClick={() => deleteDocument(d)}
                          className="h-8 w-8 rounded-lg border border-stone-200 flex items-center justify-center text-red-400 hover:bg-red-50"
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h2 className="text-base font-semibold">Unggah Dokumen</h2>
              <button onClick={() => { setShowDialog(false); setUploadProgress(null); }} className="rounded-xl p-1.5 hover:bg-stone-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Nama Dokumen <span className="text-red-500">*</span></label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nama dokumen..."
                  className="w-full h-10 rounded-xl border border-stone-200 px-3 text-sm focus:border-coral-400 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">Kategori</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value as DocCategory }))}
                    className="w-full h-10 rounded-xl border border-stone-200 px-3 text-sm focus:border-coral-400 focus:outline-none"
                  >
                    {(Object.keys(CATEGORY_CONFIG) as DocCategory[]).map(c => (
                      <option key={c} value={c}>{CATEGORY_CONFIG[c].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">Berlaku Hingga</label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-stone-200 px-3 text-sm focus:border-coral-400 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Keterangan</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Deskripsi singkat (opsional)..."
                  className="w-full h-10 rounded-xl border border-stone-200 px-3 text-sm focus:border-coral-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">File <span className="text-red-500">*</span></label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-stone-200 rounded-xl p-4 text-center cursor-pointer hover:border-coral-300 hover:bg-coral-50/30 transition-colors"
                >
                  {form.file ? (
                    <div className="flex items-center gap-2 justify-center text-sm text-stone-700">
                      <FileText className="h-4 w-4 text-coral-500" />
                      <span className="truncate max-w-[200px]">{form.file.name}</span>
                      <span className="text-stone-400">({formatBytes(form.file.size)})</span>
                    </div>
                  ) : (
                    <div className="text-stone-400">
                      <Upload className="h-6 w-6 mx-auto mb-1.5 opacity-60" />
                      <p className="text-sm">Klik untuk pilih file</p>
                      <p className="text-xs mt-0.5">PDF, gambar, atau dokumen (maks. 10 MB)</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) setForm(f => ({ ...f, file, name: f.name || file.name.replace(/\.[^.]+$/, '') }));
                  }}
                />
              </div>
              {uploadProgress !== null && (
                <div>
                  <div className="flex justify-between text-xs text-stone-500 mb-1">
                    <span>Mengunggah...</span><span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-full bg-coral-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
            </div>
            <div className="p-5 pt-0 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowDialog(false); setUploadProgress(null); }}>Batal</Button>
              <Button onClick={uploadDocument} isLoading={isSaving} className="gap-2">
                <Upload className="h-4 w-4" /> Unggah
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
