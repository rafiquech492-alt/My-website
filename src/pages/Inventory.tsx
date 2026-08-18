import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  Filter,
  Download,
  Upload,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toast';
import type { Product, Category } from '@/types';

export function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const load = async () => {
    setLoading(true);
    const [prodRes, catRes] = await Promise.all([
      supabase.from('products').select('*, categories(*)').order('name'),
      supabase.from('categories').select('*').order('name'),
    ]);
    setProducts((prodRes.data as Product[]) ?? []);
    setCategories((catRes.data as Category[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.part_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (p.brand ?? '').toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === 'all' || p.category_id === categoryFilter;
      const matchStock =
        stockFilter === 'all' ||
        (stockFilter === 'out' && p.quantity <= 0) ||
        (stockFilter === 'low' && p.quantity > 0 && p.quantity <= p.min_stock_level) ||
        (stockFilter === 'ok' && p.quantity > p.min_stock_level);
      return matchSearch && matchCat && matchStock;
    });
  }, [products, search, categoryFilter, stockFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      showToast('error', 'Failed to delete product');
    } else {
      showToast('success', 'Product deleted');
      load();
    }
  };

  const openAdd = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const exportCSV = () => {
    const headers = ['Name', 'Part Number', 'Barcode', 'Brand', 'Vehicle Model', 'Purchase Price', 'Sale Price', 'Quantity', 'Min Stock'];
    const rows = filtered.map((p) => [
      p.name, p.part_number ?? '', p.barcode ?? '', p.brand ?? '', p.vehicle_model ?? '',
      p.purchase_price, p.sale_price, p.quantity, p.min_stock_level,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input sm:w-44"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="input sm:w-36"
          >
            <option value="all">All Stock</option>
            <option value="out">Out of Stock</option>
            <option value="low">Low Stock</option>
            <option value="ok">In Stock</option>
          </select>
          <button onClick={exportCSV} className="btn-secondary">
            <Download size={16} /> <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header">Product</th>
                <th className="table-header hidden sm:table-cell">Part #</th>
                <th className="table-header hidden md:table-cell">Brand</th>
                <th className="table-header">Price</th>
                <th className="table-header">Stock</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <Package size={32} className="mx-auto mb-2" />
                    No products found
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const out = p.quantity <= 0;
                  const low = p.quantity > 0 && p.quantity <= p.min_stock_level;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-slate-800">{p.name}</p>
                          {p.categories && (
                            <p className="text-xs text-slate-400">{p.categories.name}</p>
                          )}
                        </div>
                      </td>
                      <td className="table-cell hidden sm:table-cell text-slate-500">
                        {p.part_number ?? '-'}
                      </td>
                      <td className="table-cell hidden md:table-cell text-slate-500">
                        {p.brand ?? '-'}
                      </td>
                      <td className="table-cell">
                        <p className="font-medium text-teal-700">
                          {formatCurrency(Number(p.sale_price))}
                        </p>
                        <p className="text-xs text-slate-400">
                          Buy: {formatCurrency(Number(p.purchase_price))}
                        </p>
                      </td>
                      <td className="table-cell">
                        <span className="font-medium">{p.quantity}</span>
                        <span className="text-xs text-slate-400 ml-1">/ {p.min_stock_level}</span>
                      </td>
                      <td className="table-cell">
                        {out ? (
                          <span className="badge-danger">Out of Stock</span>
                        ) : low ? (
                          <span className="badge-warning">Low Stock</span>
                        ) : (
                          <span className="badge-success">In Stock</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        product={editingProduct}
        categories={categories}
        onSaved={load}
      />
    </div>
  );
}

interface ProductModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  categories: Category[];
  onSaved: () => void;
}

function ProductModal({ open, onClose, product, categories, onSaved }: ProductModalProps) {
  const [form, setForm] = useState({
    name: '',
    part_number: '',
    barcode: '',
    category_id: '',
    brand: '',
    vehicle_model: '',
    purchase_price: 0,
    sale_price: 0,
    wholesale_price: 0,
    quantity: 0,
    min_stock_level: 5,
    rack_location: '',
    warranty: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        part_number: product.part_number ?? '',
        barcode: product.barcode ?? '',
        category_id: product.category_id ?? '',
        brand: product.brand ?? '',
        vehicle_model: product.vehicle_model ?? '',
        purchase_price: Number(product.purchase_price),
        sale_price: Number(product.sale_price),
        wholesale_price: Number(product.wholesale_price),
        quantity: product.quantity,
        min_stock_level: product.min_stock_level,
        rack_location: product.rack_location ?? '',
        warranty: product.warranty ?? '',
        notes: product.notes ?? '',
      });
    } else {
      setForm({
        name: '',
        part_number: '',
        barcode: '',
        category_id: '',
        brand: '',
        vehicle_model: '',
        purchase_price: 0,
        sale_price: 0,
        wholesale_price: 0,
        quantity: 0,
        min_stock_level: 5,
        rack_location: '',
        warranty: '',
        notes: '',
      });
    }
  }, [product, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...form,
        category_id: form.category_id || null,
      };
      if (product) {
        const { error } = await supabase.from('products').update(data).eq('id', product.id);
        if (error) throw error;
        showToast('success', 'Product updated');
      } else {
        const { error } = await supabase.from('products').insert(data);
        if (error) throw error;
        showToast('success', 'Product added');
      }
      onSaved();
      onClose();
    } catch (err) {
      showToast('error', 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={product ? 'Edit Product' : 'Add Product'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Product Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="e.g. Clutch Plate"
            />
          </div>
          <div>
            <label className="label">Part Number / SKU</label>
            <input
              type="text"
              value={form.part_number}
              onChange={(e) => setForm({ ...form, part_number: e.target.value })}
              className="input"
              placeholder="e.g. CP-001"
            />
          </div>
          <div>
            <label className="label">Barcode</label>
            <input
              type="text"
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              className="input"
              placeholder="Barcode number"
            />
          </div>
          <div>
            <label className="label">Category</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="input"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Brand</label>
            <input
              type="text"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              className="input"
              placeholder="e.g. Honda"
            />
          </div>
          <div>
            <label className="label">Vehicle / Bike Model</label>
            <input
              type="text"
              value={form.vehicle_model}
              onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })}
              className="input"
              placeholder="e.g. CD 70"
            />
          </div>
          <div>
            <label className="label">Purchase Price</label>
            <input
              type="number"
              min="0"
              value={form.purchase_price}
              onChange={(e) => setForm({ ...form, purchase_price: Number(e.target.value) })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Sale Price</label>
            <input
              type="number"
              min="0"
              value={form.sale_price}
              onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Wholesale Price</label>
            <input
              type="number"
              min="0"
              value={form.wholesale_price}
              onChange={(e) => setForm({ ...form, wholesale_price: Number(e.target.value) })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Quantity</label>
            <input
              type="number"
              min="0"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Min Stock Level</label>
            <input
              type="number"
              min="0"
              value={form.min_stock_level}
              onChange={(e) => setForm({ ...form, min_stock_level: Number(e.target.value) })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Rack / Location</label>
            <input
              type="text"
              value={form.rack_location}
              onChange={(e) => setForm({ ...form, rack_location: e.target.value })}
              className="input"
              placeholder="e.g. A-3"
            />
          </div>
          <div>
            <label className="label">Warranty</label>
            <input
              type="text"
              value={form.warranty}
              onChange={(e) => setForm({ ...form, warranty: e.target.value })}
              className="input"
              placeholder="e.g. 1 Month"
            />
          </div>
          <div className="col-span-2">
            <label className="label">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input"
              rows={2}
            />
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
