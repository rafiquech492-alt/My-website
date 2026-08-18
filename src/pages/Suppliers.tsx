import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Truck,
  Phone,
  Wallet,
  Eye,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toast';
import type { Supplier, Purchase, SupplierPayment } from '@/types';

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);
  const [supplierPurchases, setSupplierPurchases] = useState<Purchase[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('suppliers').select('*').order('name');
    setSuppliers((data as Supplier[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      const term = search.toLowerCase();
      return s.name.toLowerCase().includes(term) || (s.phone ?? '').includes(term);
    });
  }, [suppliers, search]);

  const openView = async (s: Supplier) => {
    const [purRes, payRes] = await Promise.all([
      supabase.from('purchases').select('*').eq('supplier_id', s.id).order('purchase_date', { ascending: false }),
      supabase.from('supplier_payments').select('*').eq('supplier_id', s.id).order('payment_date', { ascending: false }),
    ]);
    setSupplierPurchases((purRes.data as Purchase[]) ?? []);
    setSupplierPayments((payRes.data as SupplierPayment[]) ?? []);
    setViewSupplier(s);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this supplier?')) return;
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) {
      showToast('error', 'Failed to delete supplier');
    } else {
      showToast('success', 'Supplier deleted');
      load();
    }
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
      <div className="card p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="btn-primary"
          >
            <Plus size={16} /> Add Supplier
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full card p-12 text-center text-slate-400">
            <Truck size={32} className="mx-auto mb-2" />
            No suppliers found
          </div>
        ) : (
          filtered.map((s) => {
            const due = supplierPurchases
              .filter((p) => p.supplier_id === s.id)
              .reduce((sum, p) => sum + Number(p.remaining_balance), 0);
            return (
              <div key={s.id} className="card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 font-semibold">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{s.name}</p>
                      {s.phone && (
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Phone size={12} /> {s.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openView(s)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setEditing(s);
                        setModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {s.company && (
                  <p className="text-sm text-slate-500 mb-1">{s.company}</p>
                )}
                {s.address && (
                  <p className="text-sm text-slate-500 truncate">{s.address}</p>
                )}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Wallet size={12} /> Outstanding
                  </span>
                  <span className="text-sm font-semibold text-amber-600">
                    {formatCurrency(due)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <SupplierModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        supplier={editing}
        onSaved={load}
      />

      <Modal
        open={!!viewSupplier}
        onClose={() => setViewSupplier(null)}
        title="Supplier Ledger"
        size="lg"
      >
        {viewSupplier && (
          <SupplierLedger
            supplier={viewSupplier}
            purchases={supplierPurchases}
            payments={supplierPayments}
          />
        )}
      </Modal>
    </div>
  );
}

function SupplierLedger({
  supplier,
  purchases,
  payments,
}: {
  supplier: Supplier;
  purchases: Purchase[];
  payments: SupplierPayment[];
}) {
  const totalPurchases = purchases.reduce((s, p) => s + Number(p.total), 0);
  const totalPaid = purchases.reduce((s, p) => s + Number(p.paid_amount), 0);
  const totalDue = purchases.reduce((s, p) => s + Number(p.remaining_balance), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500">Total Purchases</p>
          <p className="text-lg font-bold text-slate-800">{formatCurrency(totalPurchases)}</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3">
          <p className="text-xs text-emerald-600">Total Paid</p>
          <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3">
          <p className="text-xs text-amber-600">Outstanding</p>
          <p className="text-lg font-bold text-amber-700">{formatCurrency(totalDue)}</p>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-slate-700 mb-2">Purchase History</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {purchases.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No purchases</p>
          ) : (
            purchases.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
              >
                <div>
                  <p className="text-sm font-medium text-blue-700">{p.purchase_number}</p>
                  <p className="text-xs text-slate-400">{formatDate(p.purchase_date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(Number(p.total))}</p>
                  {Number(p.remaining_balance) > 0 && (
                    <p className="text-xs text-amber-600">
                      Due: {formatCurrency(Number(p.remaining_balance))}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-slate-700 mb-2">Payment History</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {payments.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No payments recorded</p>
          ) : (
            payments.map((pay) => (
              <div
                key={pay.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100"
              >
                <div>
                  <p className="text-sm font-medium text-emerald-700">
                    {formatCurrency(Number(pay.amount))}
                  </p>
                  <p className="text-xs text-slate-400">{formatDate(pay.payment_date)}</p>
                </div>
                <span className="badge-neutral capitalize">{pay.payment_method}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SupplierModal({
  open,
  onClose,
  supplier,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    company: '',
    opening_balance: 0,
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name,
        phone: supplier.phone ?? '',
        address: supplier.address ?? '',
        company: supplier.company ?? '',
        opening_balance: Number(supplier.opening_balance),
        notes: supplier.notes ?? '',
      });
    } else {
      setForm({
        name: '',
        phone: '',
        address: '',
        company: '',
        opening_balance: 0,
        notes: '',
      });
    }
  }, [supplier, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (supplier) {
        const { error } = await supabase.from('suppliers').update(form).eq('id', supplier.id);
        if (error) throw error;
        showToast('success', 'Supplier updated');
      } else {
        const { error } = await supabase.from('suppliers').insert(form);
        if (error) throw error;
        showToast('success', 'Supplier added');
      }
      onSaved();
      onClose();
    } catch {
      showToast('error', 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={supplier ? 'Edit Supplier' : 'Add Supplier'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
          />
        </div>
        <div>
          <label className="label">Phone</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input"
          />
        </div>
        <div>
          <label className="label">Company</label>
          <input
            type="text"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            className="input"
          />
        </div>
        <div>
          <label className="label">Address</label>
          <textarea
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="input"
            rows={2}
          />
        </div>
        <div>
          <label className="label">Opening Balance</label>
          <input
            type="number"
            value={form.opening_balance}
            onChange={(e) => setForm({ ...form, opening_balance: Number(e.target.value) })}
            className="input"
          />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
