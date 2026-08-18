import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Download,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, isSameDay } from '@/lib/format';
import type { Invoice, Expense, Payment, Purchase, Product } from '@/types';

type Period = 'daily' | 'monthly' | 'yearly';

const PIE_COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

export function Reports() {
  const [period, setPeriod] = useState<Period>('monthly');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [invRes, expRes, payRes, purRes, prodRes] = await Promise.all([
        supabase.from('invoices').select('*').order('invoice_date', { ascending: false }),
        supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
        supabase.from('payments').select('*').order('payment_date', { ascending: false }),
        supabase.from('purchases').select('*').order('purchase_date', { ascending: false }),
        supabase.from('products').select('*'),
      ]);
      setInvoices((invRes.data as Invoice[]) ?? []);
      setExpenses((expRes.data as Expense[]) ?? []);
      setPayments((payRes.data as Payment[]) ?? []);
      setPurchases((purRes.data as Purchase[]) ?? []);
      setProducts((prodRes.data as Product[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const reportData = useMemo(() => {
    const now = new Date();

    let filteredInvoices: Invoice[] = [];
    let filteredExpenses: Expense[] = [];
    let filteredPurchases: Purchase[] = [];
    let filteredPayments: Payment[] = [];
    let label = '';

    if (period === 'daily') {
      label = now.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
      filteredInvoices = invoices.filter((i) => isSameDay(i.invoice_date, now));
      filteredExpenses = expenses.filter((e) => isSameDay(e.expense_date, now));
      filteredPurchases = purchases.filter((p) => isSameDay(p.purchase_date, now));
      filteredPayments = payments.filter((p) => isSameDay(p.payment_date, now));
    } else if (period === 'monthly') {
      label = now.toLocaleDateString('en', { month: 'long', year: 'numeric' });
      filteredInvoices = invoices.filter((i) => {
        const d = new Date(i.invoice_date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      filteredExpenses = expenses.filter((e) => {
        const d = new Date(e.expense_date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      filteredPurchases = purchases.filter((p) => {
        const d = new Date(p.purchase_date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      filteredPayments = payments.filter((p) => {
        const d = new Date(p.payment_date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    } else {
      label = String(now.getFullYear());
      filteredInvoices = invoices.filter((i) => {
        const d = new Date(i.invoice_date);
        return d.getFullYear() === now.getFullYear();
      });
      filteredExpenses = expenses.filter((e) => {
        const d = new Date(e.expense_date);
        return d.getFullYear() === now.getFullYear();
      });
      filteredPurchases = purchases.filter((p) => {
        const d = new Date(p.purchase_date);
        return d.getFullYear() === now.getFullYear();
      });
      filteredPayments = payments.filter((p) => {
        const d = new Date(p.payment_date);
        return d.getFullYear() === now.getFullYear();
      });
    }

    const totalSales = filteredInvoices.reduce((s, i) => s + Number(i.total), 0);
    const totalProfit = filteredInvoices.reduce((s, i) => {
      const cost = filteredInvoices.length > 0
        ? Number(i.subtotal) * 0.65
        : 0;
      return s + Number(i.total) - cost;
    }, 0);
    const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalPurchases = filteredPurchases.reduce((s, p) => s + Number(p.total), 0);
    const cashReceived = filteredPayments.reduce((s, p) => s + Number(p.amount), 0);
    const creditSales = filteredInvoices
      .filter((i) => Number(i.remaining_balance) > 0)
      .reduce((s, i) => s + Number(i.remaining_balance), 0);
    const netProfit = totalProfit - totalExpenses;

    return {
      label,
      totalSales: Math.round(totalSales),
      totalProfit: Math.round(totalProfit),
      totalExpenses,
      totalPurchases,
      cashReceived,
      creditSales,
      netProfit: Math.round(netProfit),
      invoiceCount: filteredInvoices.length,
      filteredInvoices,
    };
  }, [period, invoices, expenses, payments, purchases]);

  const chartData = useMemo(() => {
    const now = new Date();
    const data: { name: string; sales: number; profit: number; expenses: number }[] = [];

    if (period === 'daily') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayInv = invoices.filter((inv) => isSameDay(inv.invoice_date, d));
        const dayExp = expenses.filter((e) => isSameDay(e.expense_date, d));
        data.push({
          name: d.toLocaleDateString('en', { weekday: 'short' }),
          sales: Math.round(dayInv.reduce((s, i) => s + Number(i.total), 0)),
          profit: Math.round(dayInv.reduce((s, i) => s + Number(i.total) * 0.35, 0)),
          expenses: Math.round(dayExp.reduce((s, e) => s + Number(e.amount), 0)),
        });
      }
    } else if (period === 'monthly') {
      for (let i = 0; i < now.getDate() && i < 31; i += Math.max(1, Math.ceil(now.getDate() / 6))) {
        const startDay = i;
        const endDay = Math.min(i + Math.ceil(now.getDate() / 6) - 1, now.getDate());
        const dStart = new Date(now.getFullYear(), now.getMonth(), startDay);
        const dEnd = new Date(now.getFullYear(), now.getMonth(), endDay);
        const rangeInv = invoices.filter((inv) => {
          const d = new Date(inv.invoice_date);
          return d >= dStart && d <= dEnd;
        });
        const rangeExp = expenses.filter((e) => {
          const d = new Date(e.expense_date);
          return d >= dStart && d <= dEnd;
        });
        data.push({
          name: `${startDay}-${endDay}`,
          sales: Math.round(rangeInv.reduce((s, i) => s + Number(i.total), 0)),
          profit: Math.round(rangeInv.reduce((s, i) => s + Number(i.total) * 0.35, 0)),
          expenses: Math.round(rangeExp.reduce((s, e) => s + Number(e.amount), 0)),
        });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthInv = invoices.filter((inv) => {
          const id = new Date(inv.invoice_date);
          return id.getMonth() === d.getMonth() && id.getFullYear() === d.getFullYear();
        });
        const monthExp = expenses.filter((e) => {
          const ed = new Date(e.expense_date);
          return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
        });
        data.push({
          name: d.toLocaleDateString('en', { month: 'short' }),
          sales: Math.round(monthInv.reduce((s, i) => s + Number(i.total), 0)),
          profit: Math.round(monthInv.reduce((s, i) => s + Number(i.total) * 0.35, 0)),
          expenses: Math.round(monthExp.reduce((s, e) => s + Number(e.amount), 0)),
        });
      }
    }
    return data;
  }, [period, invoices, expenses]);

  const topProducts = useMemo(() => {
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
    reportData.filteredInvoices.forEach((inv) => {
      const items = inv.invoice_items ?? [];
      items.forEach((item: any) => {
        const key = item.product_name;
        if (!productSales[key]) {
          productSales[key] = { name: item.product_name ?? key, qty: 0, revenue: 0 };
        }
        productSales[key].qty += Number(item.quantity);
        productSales[key].revenue += Number(item.total);
      });
    });
    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [reportData.filteredInvoices]);

  const stockDistribution = useMemo(() => {
    const cats: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.brand ?? 'Unknown';
      cats[cat] = (cats[cat] ?? 0) + p.quantity;
    });
    return Object.entries(cats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [products]);

  const exportCSV = () => {
    const headers = ['Invoice #', 'Date', 'Customer', 'Total', 'Paid', 'Balance', 'Status'];
    const rows = reportData.filteredInvoices.map((i) => [
      i.invoice_number,
      formatDate(i.invoice_date),
      i.customer_name ?? 'Walk-in',
      i.total,
      i.paid_amount,
      i.remaining_balance,
      i.payment_status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${period}-${reportData.label}.csv`;
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

  const statCards = [
    { label: 'Total Sales', value: formatCurrency(reportData.totalSales), icon: ShoppingCart, color: 'teal', bg: 'bg-teal-50', iconBg: 'bg-teal-600' },
    { label: 'Gross Profit', value: formatCurrency(reportData.totalProfit), icon: TrendingUp, color: 'emerald', bg: 'bg-emerald-50', iconBg: 'bg-emerald-600' },
    { label: 'Expenses', value: formatCurrency(reportData.totalExpenses), icon: TrendingDown, color: 'red', bg: 'bg-red-50', iconBg: 'bg-red-500' },
    { label: 'Net Profit', value: formatCurrency(reportData.netProfit), icon: DollarSign, color: 'blue', bg: 'bg-blue-50', iconBg: 'bg-blue-600' },
    { label: 'Purchases', value: formatCurrency(reportData.totalPurchases), icon: BarChart3, color: 'amber', bg: 'bg-amber-50', iconBg: 'bg-amber-500' },
    { label: 'Cash Received', value: formatCurrency(reportData.cashReceived), icon: DollarSign, color: 'slate', bg: 'bg-slate-100', iconBg: 'bg-slate-700' },
  ];

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex gap-2">
            {(['daily', 'monthly', 'yearly'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                  period === p
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar size={16} />
              <span className="font-medium text-slate-700">{reportData.label}</span>
            </div>
            <button onClick={exportCSV} className="btn-secondary text-sm">
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-4">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.iconBg} text-white mb-3`}>
                <Icon size={18} />
              </div>
              <p className="text-xs text-slate-500 mb-1">{card.label}</p>
              <p className="text-lg font-bold text-slate-800">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Sales/Profit/Expenses Chart */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-800 mb-4">
          {period === 'daily' ? 'Last 7 Days' : period === 'monthly' ? 'This Month' : 'Last 12 Months'} — Sales, Profit & Expenses
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="sales" fill="#0d9488" radius={[4, 4, 0, 0]} name="Sales" />
            <Bar dataKey="profit" fill="#34d399" radius={[4, 4, 0, 0]} name="Profit" />
            <Bar dataKey="expenses" fill="#f87171" radius={[4, 4, 0, 0]} name="Expenses" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Top Selling Parts</h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No sales data for this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={100} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="revenue" fill="#0d9488" radius={[0, 4, 4, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Stock Distribution */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Stock by Brand</h3>
          {stockDistribution.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No stock data</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stockDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {stockDistribution.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Sales Trend Line Chart */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Sales Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
            />
            <Line type="monotone" dataKey="sales" stroke="#0d9488" strokeWidth={2} dot={{ r: 4 }} name="Sales" />
            <Line type="monotone" dataKey="profit" stroke="#34d399" strokeWidth={2} dot={{ r: 4 }} name="Profit" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
