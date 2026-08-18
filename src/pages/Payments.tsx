import { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Plus,
  Phone,
  MessageCircle,
  AlertCircle,
  CheckCircle,
  Search,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toast';
import type { Invoice, Customer, Payment } from '@/types';

export function Payments() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'due' | 'history'>('due');
  const [payModal, setPayModal] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [invRes, custRes, payRes] = await Promise.all([
      supabase.from('invoices').select('*').order('invoice_date', { ascending: false }),
      supabase.from('customers').select('*').order('name'),
      supabase.from('payments').select('*').order('payment_date', { ascending: false }),
    ]);
    setInvoices((invRes.data as Invoice[]) ?? []);
    setCustomers((custRes.data as Customer[]) ?? []);
    setPayments((payRes.data as Payment[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const dueInvoices = useMemo(
    () => invoices.filter((i) => Number(i.remaining_balance) > 0),
    [invoices]
  );

  const filteredDue = useMemo(() => {
    return dueInvoices.filter((i) => {
      const term = search.toLowerCase();
      return (
        (i.customer_name ?? '').toLowerCase().includes(term) ||
        (i.customer_phone ?? '').includes(term) ||
        i.invoice_number.toLowerCase().includes(term)
      );
    });
  }, [dueInvoices, search]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const inv = invoices.find((i) => i.id === p.invoice_id);
      const cust = customers.find((c) => c.id === p.customer_id);
      const name = cust?.name ?? inv?.customer_name ?? '';
      const term = search.toLowerCase();
      return name.toLowerCase().includes(term);
    });
  }, [payments, invoices, customers, search]);

  const totalDue = dueInvoices.reduce((s, i) => s + Number(i.remaining_balance), 0);

  const handlePayment = async () => {
    if (!payModal || Number(payAmount) <= 0) return;
    setSaving(true);
    try {
      const amount = Number(payAmount);
      await supabase.from('payments').insert({
        invoice_id: payModal.id,
        customer_id: payModal.customer_id,
        amount,
        payment_method: payMethod,
        notes: `Payment for ${payModal.invoice_number}`,
      });
      const newPaid = Number(payModal.paid_amount) + amount;
      const newRemaining = Math.max(0, Number(payModal.total) - newPaid);
      await supabase
        .from('invoices')
        .update({
          paid_amount: newPaid,
          remaining_balance: newRemaining,
          payment_status: newRemaining === 0 ? 'paid' : 'partial',
        })
        .eq('id', payModal.id);
      showToast('success', 'Payment recorded successfully');
      setPayModal(null);
      setPayAmount('');
      load();
    } catch {
      showToast('error', 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const sendWhatsAppReminder = (inv: Invoice) => {
    const phone = inv.customer_phone;
    if (!phone) {
      showToast('warning', 'No phone number for this customer');
      return;
    }
    const msg = `Dear ${inv.customer_name},\n\nThis is a reminder from Multan Auto Spare Parts that you have a pending payment of Rs. ${inv.remaining_balance} for Invoice ${inv.invoice_number}.\n\nPlease clear your dues at your earliest convenience.\n\nThank you!\nMultan Auto Spare Parts\nGT Road Sanawan\n03473502993`;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const waNumber = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, '_blank');
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
      {/* Summary Card */}
      <div className="card p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-sm text-amber-700">Total Pending Payments</p>
              <p className="text-2xl font-bold text-amber-800">
                {formatCurrency(totalDue)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-amber-600">{dueInvoices.length} unpaid invoices</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('due')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'due'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Pending Dues
            </button>
            <button
              onClick={() => setTab('history')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'history'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Payment History
            </button>
          </div>
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {tab === 'due' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header">Invoice #</th>
                  <th className="table-header">Customer</th>
                  <th className="table-header hidden sm:table-cell">Phone</th>
                  <th className="table-header hidden sm:table-cell">Date</th>
                  <th className="table-header">Total</th>
                  <th className="table-header">Balance</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDue.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      <CheckCircle size={32} className="mx-auto mb-2 text-emerald-400" />
                      No pending payments
                    </td>
                  </tr>
                ) : (
                  filteredDue.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="table-cell font-medium text-teal-700">
                        {inv.invoice_number}
                      </td>
                      <td className="table-cell font-medium text-slate-700">
                        {inv.customer_name ?? 'Walk-in'}
                      </td>
                      <td className="table-cell hidden sm:table-cell text-slate-500">
                        {inv.customer_phone ?? '-'}
                      </td>
                      <td className="table-cell hidden sm:table-cell text-slate-500">
                        {formatDate(inv.invoice_date)}
                      </td>
                      <td className="table-cell">{formatCurrency(Number(inv.total))}</td>
                      <td className="table-cell font-semibold text-amber-600">
                        {formatCurrency(Number(inv.remaining_balance))}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setPayModal(inv);
                              setPayAmount(String(inv.remaining_balance));
                            }}
                            className="btn-primary text-xs py-1.5 px-3"
                          >
                            <Plus size={14} /> Pay
                          </button>
                          {inv.customer_phone && (
                            <button
                              onClick={() => sendWhatsAppReminder(inv)}
                              className="p-1.5 rounded-lg hover:bg-green-50 text-green-600"
                              title="Send WhatsApp Reminder"
                            >
                              <MessageCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header">Date</th>
                  <th className="table-header">Customer</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header hidden sm:table-cell">Method</th>
                  <th className="table-header hidden sm:table-cell">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      <Wallet size={32} className="mx-auto mb-2" />
                      No payment history
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((pay) => {
                    const inv = invoices.find((i) => i.id === pay.invoice_id);
                    const cust = customers.find((c) => c.id === pay.customer_id);
                    return (
                      <tr key={pay.id} className="hover:bg-slate-50/50">
                        <td className="table-cell text-slate-500">
                          {formatDate(pay.payment_date)}
                        </td>
                        <td className="table-cell font-medium text-slate-700">
                          {cust?.name ?? inv?.customer_name ?? '-'}
                        </td>
                        <td className="table-cell font-semibold text-emerald-600">
                          {formatCurrency(Number(pay.amount))}
                        </td>
                        <td className="table-cell hidden sm:table-cell">
                          <span className="badge-neutral capitalize">{pay.payment_method}</span>
                        </td>
                        <td className="table-cell hidden sm:table-cell text-slate-500">
                          {inv?.invoice_number ?? '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <Modal
        open={!!payModal}
        onClose={() => setPayModal(null)}
        title="Record Payment"
        size="sm"
      >
        {payModal && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-sm text-slate-500">Invoice</p>
              <p className="font-semibold text-teal-700">{payModal.invoice_number}</p>
              <p className="text-sm text-slate-600">{payModal.customer_name}</p>
              <div className="flex justify-between mt-2 pt-2 border-t border-slate-200">
                <span className="text-sm text-slate-500">Outstanding</span>
                <span className="font-bold text-amber-600">
                  {formatCurrency(Number(payModal.remaining_balance))}
                </span>
              </div>
            </div>
            <div>
              <label className="label">Payment Amount</label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="input"
                autoFocus
              />
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="input"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </div>
            <button
              onClick={handlePayment}
              disabled={saving}
              className="btn-primary w-full"
            >
              {saving ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
