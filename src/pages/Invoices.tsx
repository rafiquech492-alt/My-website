import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Eye,
  Printer,
  FileText,
  FileDown,
  MessageCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/format';
import { printReceipt, sharePDFOnWhatsApp, downloadThermalPDF } from '@/lib/receipt';
import { InvoicePreview } from '@/components/InvoicePreview';
import { Modal } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toast';
import type { Settings, Invoice, InvoiceItem } from '@/types';

interface InvoicesProps {
  settings: Settings | null;
}

export function Invoices({ settings }: InvoicesProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [viewItems, setViewItems] = useState<InvoiceItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const symbol = settings?.currency_symbol ?? 'Rs.';

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .order('invoice_date', { ascending: false });
    setInvoices((data as Invoice[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        (inv.customer_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (inv.customer_phone ?? '').includes(search);
      const matchStatus =
        statusFilter === 'all' || inv.payment_status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter]);

  const openInvoice = async (inv: Invoice) => {
    const { data } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', inv.id);
    setViewItems((data as InvoiceItem[]) ?? []);
    setViewInvoice(inv);
  };

  const recordPayment = async (inv: Invoice, amount: number) => {
    if (amount <= 0) return;
    await supabase.from('payments').insert({
      invoice_id: inv.id,
      customer_id: inv.customer_id,
      amount,
      payment_method: 'cash',
      notes: `Payment for ${inv.invoice_number}`,
    });
    const newPaid = Number(inv.paid_amount) + amount;
    const newRemaining = Math.max(0, Number(inv.total) - newPaid);
    await supabase
      .from('invoices')
      .update({
        paid_amount: newPaid,
        remaining_balance: newRemaining,
        payment_status: newRemaining === 0 ? 'paid' : 'partial',
      })
      .eq('id', inv.id);
    showToast('success', 'Payment recorded');
    load();
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
              placeholder="Search by invoice #, customer name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input sm:w-40"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header">Invoice #</th>
                <th className="table-header">Date</th>
                <th className="table-header">Customer</th>
                <th className="table-header hidden sm:table-cell">Total</th>
                <th className="table-header hidden sm:table-cell">Paid</th>
                <th className="table-header hidden md:table-cell">Balance</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <FileText size={32} className="mx-auto mb-2" />
                    No invoices found
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50">
                    <td className="table-cell font-medium text-teal-700">
                      {inv.invoice_number}
                    </td>
                    <td className="table-cell text-slate-500">
                      {formatDate(inv.invoice_date)}
                    </td>
                    <td className="table-cell">
                      <p className="font-medium text-slate-700">
                        {inv.customer_name ?? 'Walk-in'}
                      </p>
                      {inv.customer_phone && (
                        <p className="text-xs text-slate-400">{inv.customer_phone}</p>
                      )}
                    </td>
                    <td className="table-cell hidden sm:table-cell font-medium">
                      {formatCurrency(Number(inv.total), symbol)}
                    </td>
                    <td className="table-cell hidden sm:table-cell text-emerald-600">
                      {formatCurrency(Number(inv.paid_amount), symbol)}
                    </td>
                    <td className="table-cell hidden md:table-cell text-amber-600">
                      {Number(inv.remaining_balance) > 0
                        ? formatCurrency(Number(inv.remaining_balance), symbol)
                        : '-'}
                    </td>
                    <td className="table-cell">
                      {inv.payment_status === 'paid' && <span className="badge-success">Paid</span>}
                      {inv.payment_status === 'partial' && <span className="badge-warning">Partial</span>}
                      {inv.payment_status === 'unpaid' && <span className="badge-danger">Unpaid</span>}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openInvoice(inv)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                        >
                          <Eye size={16} />
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

      {/* Invoice Detail Modal */}
      <Modal
        open={!!viewInvoice}
        onClose={() => setViewInvoice(null)}
        title="Invoice Details"
        size="lg"
      >
        {viewInvoice && (
          <InvoiceDetail
            invoice={viewInvoice}
            items={viewItems}
            settings={settings}
            onRecordPayment={recordPayment}
          />
        )}
      </Modal>
    </div>
  );
}

function InvoiceDetail({
  invoice,
  items,
  settings,
  onRecordPayment,
}: {
  invoice: Invoice;
  items: InvoiceItem[];
  settings: Settings | null;
  onRecordPayment: (inv: Invoice, amount: number) => void;
}) {
  const symbol = settings?.currency_symbol ?? 'Rs.';
  const [payAmount, setPayAmount] = useState('');

  return (
    <div className="space-y-4">
      <div>
        {/* Invoice Header */}
        <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {settings?.business_name ?? 'Multan Auto Spare Parts'}
            </h2>
            <p className="text-sm text-slate-500">
              {settings?.business_address ?? 'GT Road Sanawan'}
            </p>
            <p className="text-sm text-slate-500">
              {settings?.business_phone ?? '03473502993'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-teal-700">{invoice.invoice_number}</p>
            <p className="text-sm text-slate-500">{formatDateTime(invoice.invoice_date)}</p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mb-4">
          <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Bill To</p>
          <p className="font-medium text-slate-700">
            {invoice.customer_name ?? 'Walk-in Customer'}
          </p>
          {invoice.customer_phone && (
            <p className="text-sm text-slate-500">{invoice.customer_phone}</p>
          )}
        </div>

        {/* Items */}
        <table className="w-full mb-4">
          <thead className="bg-slate-50">
            <tr>
              <th className="table-header">Item</th>
              <th className="table-header">Part #</th>
              <th className="table-header text-center">Qty</th>
              <th className="table-header text-right">Price</th>
              <th className="table-header text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="table-cell font-medium">{item.product_name}</td>
                <td className="table-cell text-slate-500">{item.part_number ?? '-'}</td>
                <td className="table-cell text-center">{item.quantity}</td>
                <td className="table-cell text-right">
                  {formatCurrency(Number(item.unit_price), symbol)}
                </td>
                <td className="table-cell text-right font-medium">
                  {formatCurrency(Number(item.total), symbol)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span>{formatCurrency(Number(invoice.subtotal), symbol)}</span>
            </div>
            {Number(invoice.discount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Discount</span>
                <span>-{formatCurrency(Number(invoice.discount), symbol)}</span>
              </div>
            )}
            {Number(invoice.tax) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tax</span>
                <span>{formatCurrency(Number(invoice.tax), symbol)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-2 border-t border-slate-200">
              <span>Total</span>
              <span className="text-teal-700">{formatCurrency(Number(invoice.total), symbol)}</span>
            </div>
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Paid</span>
              <span>{formatCurrency(Number(invoice.paid_amount), symbol)}</span>
            </div>
            {Number(invoice.remaining_balance) > 0 && (
              <div className="flex justify-between text-sm text-amber-600 font-medium">
                <span>Remaining Balance</span>
                <span>{formatCurrency(Number(invoice.remaining_balance), symbol)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Terms */}
        <div className="pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-400">
            {settings?.terms_conditions ?? 'Goods once sold are not returnable without original invoice.'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
        {Number(invoice.remaining_balance) > 0 && (
          <div className="flex gap-2 flex-1">
            <input
              type="number"
              placeholder="Payment amount"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="input flex-1"
            />
            <button
              onClick={() => {
                onRecordPayment(invoice, Number(payAmount));
                setPayAmount('');
              }}
              className="btn-primary"
            >
              Record Payment
            </button>
          </div>
        )}
        <button
          onClick={() => setShowPreview(true)}
          className="btn-ghost"
        >
          <Eye size={16} /> Preview
        </button>
        <button
          onClick={() => printReceipt(invoice, items, settings)}
          className="btn-secondary"
        >
          <Printer size={16} /> Print Receipt
        </button>
        <button
          onClick={() => downloadThermalPDF(invoice, items, settings)}
          className="btn-secondary"
        >
          <FileDown size={16} /> Download PDF
        </button>
        <button
          onClick={() => sharePDFOnWhatsApp(invoice, items, settings)}
          className="btn-primary"
        >
          <MessageCircle size={16} /> Share PDF on WhatsApp
        </button>
      </div>
      {showPreview && (
        <InvoicePreview
          invoice={invoice}
          items={items}
          settings={settings}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
