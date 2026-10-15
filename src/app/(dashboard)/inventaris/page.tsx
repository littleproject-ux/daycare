'use client';

import React, { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, getDocs, addDoc, updateDoc,
  doc, serverTimestamp, increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Package, Plus, X, Search, AlertTriangle, ArrowUpDown,
  TrendingUp, TrendingDown, Pencil,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

type ItemCategory = 'perlengkapan' | 'mainan' | 'kebersihan' | 'makanan' | 'obat' | 'lainnya';
type StockAction = 'tambah' | 'kurang';

interface InventoryItem {
  id: string;
  organizationId: string;
  name: string;
  category: ItemCategory;
  unit: string;
  stock: number;
  minStock: number;
  description: string;
  createdAt: any;
  updatedAt: any;
}

const CAT_CONFIG: Record<ItemCategory, { label: string; color: string; bg: string }> = {
  perlengkapan: { label: 'Perlengkapan', color: 'text-blue-700',    bg: 'bg-blue-50' },
  mainan:       { label: 'Mainan',        color: 'text-coral-700',   bg: 'bg-coral-50' },
  kebersihan:   { label: 'Kebersihan',    color: 'text-emerald-700', bg: 'bg-emerald-50' },
  makanan:      { label: 'Makanan',       color: 'text-amber-700',   bg: 'bg-amber-50' },
  obat:         { label: 'Obat-obatan',   color: 'text-violet-700',  bg: 'bg-violet-50' },
  lainnya:      { label: 'Lainnya',       color: 'text-stone-600',   bg: 'bg-stone-100' },
};

export default function InventarisPage() {
  const { organizationId, can } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<ItemCategory | 'semua'>('semua');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', category: 'perlengkapan' as ItemCategory,
    unit: 'buah', stock: '0', minStock: '5', description: '',
  });
  const [stockForm, setStockForm] = useState({ action: 'tambah' as StockAction, qty: '1', notes: '' });

  useEffect(() => {
    if (!organizationId) return;
    loadItems();
  }, [organizationId]);

  async function loadItems() {
    setIsLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, 'inventory'),
        where('organizationId', '==', organizationId),
        orderBy('name')
      ));
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }) as InventoryItem));
    } catch {
      toast({ title: 'Gagal memuat inventaris', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  async function saveItem() {
    if (!form.name.trim()) {
      toast({ title: 'Isi nama barang', variant: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'inventory'), {
        organizationId,
        name: form.name,
        category: form.category,
        unit: form.unit,
        stock: Number(form.stock),
        minStock: Number(form.minStock),
        description: form.description,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Barang berhasil ditambahkan', variant: 'success' });
      setShowAddDialog(false);
      setForm({ name: '', category: 'perlengkapan', unit: 'buah', stock: '0', minStock: '5', description: '' });
      loadItems();
    } catch {
      toast({ title: 'Gagal menyimpan barang', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  async function updateStock() {
    if (!selectedItem) return;
    const qty = Number(stockForm.qty);
    if (!qty || qty <= 0) {
      toast({ title: 'Masukkan jumlah yang valid', variant: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      const delta = stockForm.action === 'tambah' ? qty : -qty;
      const newStock = selectedItem.stock + delta;
      if (newStock < 0) {
        toast({ title: 'Stok tidak boleh kurang dari 0', variant: 'error' });
        setIsSaving(false);
        return;
      }
      await updateDoc(doc(db, 'inventory', selectedItem.id), {
        stock: increment(delta),
        updatedAt: serverTimestamp(),
      });
      // Log stock movement
      await addDoc(collection(db, 'stockMovements'), {
        organizationId,
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        action: stockForm.action,
        qty,
        notes: stockForm.notes,
        before: selectedItem.stock,
        after: newStock,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Stok berhasil diperbarui', variant: 'success' });
      setShowStockDialog(false);
      setSelectedItem(null);
      setStockForm({ action: 'tambah', qty: '1', notes: '' });
      loadItems();
    } catch {
      toast({ title: 'Gagal memperbarui stok', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  const filtered = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'semua' || item.category === filterCat;
    return matchSearch && matchCat;
  });

  const lowStockCount = items.filter(i => i.stock <= i.minStock).length;

  return (
    <div>
      <Topbar title="Inventaris" subtitle="Kelola stok perlengkapan, mainan, dan bahan habis pakai" />

      <div className="p-6 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-3 bg-stone-50">
            <p className="text-xl font-bold text-stone-700">{items.length}</p>
            <p className="text-xs text-stone-500 mt-0.5">Jenis Barang</p>
          </div>
          <div className="rounded-xl p-3 bg-amber-50">
            <p className="text-xl font-bold text-amber-600">{lowStockCount}</p>
            <p className="text-xs text-stone-500 mt-0.5">Stok Menipis</p>
          </div>
          <div className="rounded-xl p-3 bg-emerald-50">
            <p className="text-xl font-bold text-emerald-600">{items.filter(i => i.stock > i.minStock).length}</p>
            <p className="text-xs text-stone-500 mt-0.5">Stok Cukup</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              className="w-full pl-9 pr-3 h-9 rounded-xl border border-stone-200 text-sm placeholder:text-stone-400 focus:border-coral-400 focus:outline-none"
              placeholder="Cari barang..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1 overflow-x-auto">
            <button onClick={() => setFilterCat('semua')} className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${filterCat === 'semua' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'}`}>Semua</button>
            {(Object.keys(CAT_CONFIG) as ItemCategory[]).map(c => (
              <button key={c} onClick={() => setFilterCat(c)} className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${filterCat === c ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'}`}>
                {CAT_CONFIG[c].label}
              </button>
            ))}
          </div>
          {can('create') && (
            <Button onClick={() => setShowAddDialog(true)} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Tambah Barang
            </Button>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-stone-100 animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Tidak ada barang ditemukan</p>
          </div>
        ) : (
          <div className="rounded-xl border border-stone-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500">Nama Barang</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500">Kategori</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500">Stok</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500">Min. Stok</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filtered.map(item => {
                  const isLow = item.stock <= item.minStock;
                  return (
                    <tr key={item.id} className="hover:bg-stone-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-stone-800">{item.name}</p>
                        {item.description && <p className="text-xs text-stone-400 truncate max-w-[200px]">{item.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_CONFIG[item.category].bg} ${CAT_CONFIG[item.category].color}`}>
                          {CAT_CONFIG[item.category].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold text-base ${isLow ? 'text-red-600' : 'text-stone-800'}`}>{item.stock}</span>
                        <span className="text-xs text-stone-400 ml-1">{item.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-stone-500 text-xs">{item.minStock} {item.unit}</td>
                      <td className="px-4 py-3 text-center">
                        {isLow
                          ? <Badge variant="warning" className="gap-1"><AlertTriangle className="h-2.5 w-2.5" /> Menipis</Badge>
                          : <Badge variant="success" className="gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" /> Cukup</Badge>
                        }
                      </td>
                      <td className="px-4 py-3 text-right">
                        {can('edit') && (
                          <button
                            onClick={() => { setSelectedItem(item); setShowStockDialog(true); }}
                            className="flex items-center gap-1 text-xs text-coral-600 font-medium hover:text-coral-700 ml-auto"
                          >
                            <ArrowUpDown className="h-3.5 w-3.5" /> Ubah Stok
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Item Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h2 className="text-base font-semibold">Tambah Barang</h2>
              <button onClick={() => setShowAddDialog(false)} className="rounded-xl p-1.5 hover:bg-stone-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <Input label="Nama Barang *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nama barang..." />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">Kategori</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ItemCategory }))} className="w-full h-10 rounded-xl border border-stone-200 px-3 text-sm focus:border-coral-400 focus:outline-none">
                    {(Object.keys(CAT_CONFIG) as ItemCategory[]).map(c => <option key={c} value={c}>{CAT_CONFIG[c].label}</option>)}
                  </select>
                </div>
                <Input label="Satuan" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="buah, pack, lusin..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Stok Awal" type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
                <Input label="Stok Minimum" type="number" min="0" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: e.target.value }))} hint="Batas peringatan" />
              </div>
              <Input label="Keterangan" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Opsional..." />
            </div>
            <div className="p-5 pt-0 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Batal</Button>
              <Button onClick={saveItem} isLoading={isSaving}>Simpan</Button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Update Dialog */}
      {showStockDialog && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <div>
                <h2 className="text-base font-semibold">Ubah Stok</h2>
                <p className="text-xs text-stone-400 mt-0.5">{selectedItem.name}</p>
              </div>
              <button onClick={() => setShowStockDialog(false)} className="rounded-xl p-1.5 hover:bg-stone-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl bg-stone-50 p-3 text-center">
                <p className="text-3xl font-bold text-stone-800">{selectedItem.stock}</p>
                <p className="text-xs text-stone-400 mt-1">Stok saat ini ({selectedItem.unit})</p>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-2">Aksi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setStockForm(f => ({ ...f, action: 'tambah' }))}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-colors ${stockForm.action === 'tambah' ? 'bg-emerald-500 text-white border-emerald-500' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                  >
                    <TrendingUp className="h-4 w-4" /> Tambah
                  </button>
                  <button
                    onClick={() => setStockForm(f => ({ ...f, action: 'kurang' }))}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-colors ${stockForm.action === 'kurang' ? 'bg-red-500 text-white border-red-500' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                  >
                    <TrendingDown className="h-4 w-4" /> Kurangi
                  </button>
                </div>
              </div>
              <Input
                label={`Jumlah (${selectedItem.unit})`}
                type="number"
                min="1"
                value={stockForm.qty}
                onChange={e => setStockForm(f => ({ ...f, qty: e.target.value }))}
              />
              <Input
                label="Keterangan"
                value={stockForm.notes}
                onChange={e => setStockForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Alasan perubahan stok..."
              />
              <div className="rounded-xl bg-stone-50 p-2.5 text-sm text-stone-600 text-center">
                Stok baru:{' '}
                <span className="font-bold text-stone-900">
                  {Math.max(0, selectedItem.stock + (stockForm.action === 'tambah' ? Number(stockForm.qty) : -Number(stockForm.qty)))} {selectedItem.unit}
                </span>
              </div>
            </div>
            <div className="p-5 pt-0 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowStockDialog(false)}>Batal</Button>
              <Button onClick={updateStock} isLoading={isSaving}>Simpan</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
