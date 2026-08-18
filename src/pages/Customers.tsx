import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  Phone,
  Wallet,
  Eye,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toast';
import type { Customer, Invoice, Payment } from '@/types';

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [customerPayments, setCustomerPayments] = useState<Payment[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('customers').select('*').order('name');
    setCustomers((data as Customer[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const term = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(term) || (c.phone ?? '').includes(term)
      );
    });
  }, [customers, search]);

  const openView = async (c: Customer) => {
    const [invRes, payRes] = await Promise.all([
      supabase.from('invoices').select('*').eq('customer_id', c.id).order('invoice_date', { ascending: false }),
      supabase.from('payments').select('*').eq('customer_id', c.id).order('payment_date', { ascending: false }),
    ]);
    setCustomerInvoices((invRes.data as Invoice[]) ?? []);
    setCustomerPayments((payRes.data as Payment[]) ?? []);
    setViewCustomer(c);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer? Their invoices will remain.')) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      showToast('error', 'Failed to delete customer');
    } else {
      showToast('success', 'Customer deleted');
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

  const totalDue = (c: Customer) => {
    return customerInvoices
      .filter((i) => i.customer_id === c.id)
      .reduce((s, i) => s + Number(i.remaining_balance), 0);
  };

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search customers..."
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
            <Plus size={16} /> Add Customer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full card p-12 text-center text-slate-400">
            <Users size={32} className="mx-auto mb-2" />
            No customers found
          </div>
        ) : (
          filtered.map((c) => {
            const due = totalDue(c);
            return (
              <div key={c.id} className="card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-700 font-semibold">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{c.name}</p>
                      {c.phone && (
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Phone size={12} /> {c.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openView(c)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setEditing(c);
                        setModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  {c.vehicle && (
                    <p className="text-slate-500">Vehicle: {c.vehicle}</p>
                  )}
                  {c.address && (
                    <p className="text-slate-500 truncate">{c.address}</p>
                  )}
                </div>
                {due > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Wallet size={12} /> Outstanding
                    </span>
                    <span className="text-sm font-semibold text-amber-600">
                      {formatCurrency(due)}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <CustomerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        customer={editing}
        onSaved={load}
      />

      <Modal
        open={!!viewCustomer}
        onClose={() => setViewCustomer(null)}
        title="Customer Ledger"
        size="lg"
      >
        {viewCustomer && (
          <CustomerLedger
            customer={viewCustomer}
            invoices={customerInvoices}
            payments={customerPayments}
          />
        )}
      </Modal>
    </div>
  );
}

function CustomerLedger({
  customer,
  invoices,
  payments,
}: {
  customer: Customer;
  invoices: Invoice[];
  payments: Payment[];
}) {
  const totalPurchases = invoices.reduce((s, i) => s + Number(i.total), 0);
  const totalPaid = invoices.reduce((s, i) => s + Number(i.paid_amount), 0);
  const totalDue = invoices.reduce((s, i) => s + Number(i.remaining_balance), 0);

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
        <h4 className="font-semibold text-slate-700 mb-2">Invoice History</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {invoices.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No invoices</p>
          ) : (
            invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
              >
                <div>
                  <p className="text-sm font-medium text-teal-700">{inv.invoice_number}</p>
                  <p className="text-xs text-slate-400">{formatDate(inv.invoice_date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(Number(inv.total))}</p>
                  {Number(inv.remaining_balance) > 0 && (
                    <p className="text-xs text-amber-600">
                      Due: {formatCurrency(Number(inv.remaining_balance))}
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

function CustomerModal({
  open,
  onClose,
  customer,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    vehicle: '',
    registration_number: '',
    credit_limit: 0,
    opening_balance: 0,
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name,
        phone: customer.phone ?? '',
        address: customer.address ?? '',
        vehicle: customer.vehicle ?? '',
        registration_number: customer.registration_number ?? '',
        credit_limit: Number(customer.credit_limit),
        opening_balance: Number(customer.opening_balance),
        notes: customer.notes ?? '',
      });
    } else {
      setForm({
        name: '',
        phone: '',
        address: '',
        vehicle: '',
        registration_number: '',
        credit_limit: 0,
        opening_balance: 0,
        notes: '',
      });
    }
  }, [customer, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (customer) {
        const { error } = await supabase.from('customers').update(form).eq('id', customer.id);
        if (error) throw error;
        showToast('success', 'Customer updated');
      } else {
        const { error } = await supabase.from('customers').insert(form);
        if (error) throw error;
        showToast('success', 'Customer added');
      }
      onSaved();
      onClose();
    } catch {
      showToast('error', 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={customer ? 'Edit Customer' : 'Add Customer'}>
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
          <label className="label">Address</label>
          <textarea
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="input"
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Vehicle / Bike</label>
            <input
              type="text"
              value={form.vehicle}
              onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Registration #</label>
            <input
              type="text"
              value={form.registration_number}
              onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Credit Limit</label>
            <input
              type="number"
              value={form.credit_limit}
              onChange={(e) => setForm({ ...form, credit_limit: Number(e.target.value) })}
              className="input"
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
