import { useState, useEffect, useMemo } from 'react';
import { Plus, Receipt, Trash2, Search, TrendingDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, isSameDay } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toast';
import type { Expense } from '@/types';

export function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    category: '',
    description: '',
    amount: 0,
    payment_method: 'cash',
    expense_date: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false });
    setExpenses((data as Expense[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const term = search.toLowerCase();
      return (
        e.description.toLowerCase().includes(term) ||
        (e.category ?? '').toLowerCase().includes(term)
      );
    });
  }, [expenses, search]);

  const todayExpenses = expenses
    .filter((e) => isSameDay(e.expense_date, new Date()))
    .reduce((s, e) => s + Number(e.amount), 0);

  const monthExpenses = expenses
    .filter((e) => {
      const d = new Date(e.expense_date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + Number(e.amount), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('expenses').insert({
        ...form,
        expense_date: new Date(form.expense_date).toISOString(),
      });
      if (error) throw error;
      showToast('success', 'Expense recorded');
      setModalOpen(false);
      setForm({
        category: '',
        description: '',
        amount: 0,
        payment_method: 'cash',
        expense_date: new Date().toISOString().split('T')[0],
      });
      load();
    } catch {
      showToast('error', 'Failed to record expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
      showToast('error', 'Failed to delete');
    } else {
      showToast('success', 'Expense deleted');
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

  const expenseCategories = [
    'Rent',
    'Electricity',
    'Salaries',
    'Transport',
    'Maintenance',
    'Marketing',
    'Supplies',
    'Miscellaneous',
  ];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5 bg-gradient-to-r from-red-50 to-orange-50 border-red-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500 text-white">
              <TrendingDown size={20} />
            </div>
            <div>
              <p className="text-xs text-red-600">Today's Expenses</p>
              <p className="text-xl font-bold text-red-700">{formatCurrency(todayExpenses)}</p>
            </div>
          </div>
        </div>
        <div className="card p-5 bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-white">
              <Receipt size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-600">This Month</p>
              <p className="text-xl font-bold text-slate-800">{formatCurrency(monthExpenses)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="btn-primary"
          >
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header">Date</th>
                <th className="table-header">Description</th>
                <th className="table-header hidden sm:table-cell">Category</th>
                <th className="table-header hidden sm:table-cell">Method</th>
                <th className="table-header">Amount</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <Receipt size={32} className="mx-auto mb-2" />
                    No expenses found
                  </td>
                </tr>
              ) : (
                filtered.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50">
                    <td className="table-cell text-slate-500">
                      {formatDate(exp.expense_date)}
                    </td>
                    <td className="table-cell font-medium text-slate-700">
                      {exp.description}
                    </td>
                    <td className="table-cell hidden sm:table-cell">
                      {exp.category && <span className="badge-info">{exp.category}</span>}
                    </td>
                    <td className="table-cell hidden sm:table-cell">
                      <span className="badge-neutral capitalize">{exp.payment_method}</span>
                    </td>
                    <td className="table-cell font-semibold text-red-600">
                      {formatCurrency(Number(exp.amount))}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Description *</label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input"
              placeholder="e.g. Shop rent for August"
            />
          </div>
          <div>
            <label className="label">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="input"
            >
              <option value="">Select category</option>
              {expenseCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount *</label>
              <input
                type="number"
                required
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              className="input"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
