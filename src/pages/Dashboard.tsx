import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  Wallet,
  Users,
  ArrowRight,
  Bike,
  FileText,
  ShoppingBag,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { formatCurrency, isSameDay } from '@/lib/format';
import type { PageKey } from '@/App';
import type { Settings, Invoice, Product, Expense, Payment } from '@/types';

interface DashboardProps {
  navigate: (p: PageKey) => void;
  settings: Settings | null;
}

export function Dashboard({ navigate, settings }: DashboardProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const symbol = settings?.currency_symbol ?? 'Rs.';

  useEffect(() => {
    async function load() {
      const [invRes, prodRes, expRes, payRes] = await Promise.all([
        supabase.from('invoices').select('*').order('invoice_date', { ascending: false }).limit(200),
        supabase.from('products').select('*'),
        supabase.from('expenses').select('*').order('expense_date', { ascending: false }).limit(100),
        supabase.from('payments').select('*').order('payment_date', { ascending: false }).limit(100),
      ]);
      setInvoices((invRes.data as Invoice[]) ?? []);
      setProducts((prodRes.data as Product[]) ?? []);
      setExpenses((expRes.data as Expense[]) ?? []);
      setPayments((payRes.data as Payment[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const stats = useMemo(() => {
    const today = new Date();
    const todayInvoices = invoices.filter((i) => isSameDay(i.invoice_date, today));
    const todaySales = todayInvoices.reduce((s, i) => s + Number(i.total), 0);
    const todayPaid = todayInvoices.reduce((s, i) => s + Number(i.paid_amount), 0);
    const todayProfit = todayInvoices.reduce((s, i) => {
      return s + Number(i.total) - Number(i.total) * 0.7;
    }, 0);
    const todayExpenses = expenses
      .filter((e) => isSameDay(e.expense_date, today))
      .reduce((s, e) => s + Number(e.amount), 0);
    const todayPayments = payments
      .filter((p) => isSameDay(p.payment_date, today))
      .reduce((s, p) => s + Number(p.amount), 0);

    const pendingPayments = invoices
      .filter((i) => Number(i.remaining_balance) > 0)
      .reduce((s, i) => s + Number(i.remaining_balance), 0);

    const lowStock = products.filter(
      (p) => p.quantity > 0 && p.quantity <= p.min_stock_level
    );
    const outOfStock = products.filter((p) => p.quantity <= 0);

    const cashInHand =
      todayPaid + todayPayments - todayExpenses;

    return {
      todaySales,
      todayProfit: Math.round(todayProfit),
      todayExpenses,
      cashInHand,
      pendingPayments,
      todayInvoices: todayInvoices.length,
      lowStock,
      outOfStock,
    };
  }, [invoices, products, expenses, payments]);

  const monthlyData = useMemo(() => {
    const months: { name: string; sales: number; profit: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleDateString('en', { month: 'short' });
      const monthInvoices = invoices.filter((inv) => {
        const id = new Date(inv.invoice_date);
        return id.getMonth() === d.getMonth() && id.getFullYear() === d.getFullYear();
      });
      const sales = monthInvoices.reduce((s, i) => s + Number(i.total), 0);
      const profit = sales * 0.3;
      months.push({ name: monthName, sales: Math.round(sales), profit: Math.round(profit) });
    }
    return months;
  }, [invoices]);

  const weeklyData = useMemo(() => {
    const days: { name: string; sales: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString('en', { weekday: 'short' });
      const dayInvoices = invoices.filter((inv) => isSameDay(inv.invoice_date, d));
      const sales = dayInvoices.reduce((s, i) => s + Number(i.total), 0);
      days.push({ name: dayName, sales: Math.round(sales) });
    }
    return days;
  }, [invoices]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Today's Sales",
      value: formatCurrency(stats.todaySales, symbol),
      icon: ShoppingCart,
      color: 'teal',
      bg: 'bg-teal-50',
      iconBg: 'bg-teal-600',
    },
    {
      label: "Today's Profit",
      value: formatCurrency(stats.todayProfit, symbol),
      icon: TrendingUp,
      color: 'emerald',
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-600',
    },
    {
      label: "Today's Expenses",
      value: formatCurrency(stats.todayExpenses, symbol),
      icon: TrendingDown,
      color: 'red',
      bg: 'bg-red-50',
      iconBg: 'bg-red-500',
    },
    {
      label: 'Cash in Hand',
      value: formatCurrency(stats.cashInHand, symbol),
      icon: Wallet,
      color: 'blue',
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-600',
    },
    {
      label: 'Pending Payments',
      value: formatCurrency(stats.pendingPayments, symbol),
      icon: DollarSign,
      color: 'amber',
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-500',
    },
    {
      label: "Today's Invoices",
      value: String(stats.todayInvoices),
      icon: FileText,
      color: 'slate',
      bg: 'bg-slate-100',
      iconBg: 'bg-slate-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.iconBg} text-white`}>
                  <Icon size={18} />
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-1">{card.label}</p>
              <p className="text-lg font-bold text-slate-800">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800">Weekly Sales</h3>
              <p className="text-xs text-slate-500">Last 7 days</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#0d9488"
                strokeWidth={2}
                fill="url(#colorSales)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800">Monthly Sales & Profit</h3>
              <p className="text-xs text-slate-500">Last 6 months</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="sales" fill="#0d9488" radius={[4, 4, 0, 0]} name="Sales" />
              <Bar dataKey="profit" fill="#34d399" radius={[4, 4, 0, 0]} name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              <h3 className="font-semibold text-slate-800">Stock Alerts</h3>
            </div>
            <button
              onClick={() => navigate('inventory')}
              className="text-xs text-teal-600 font-medium hover:text-teal-700 flex items-center gap-1"
            >
              View All <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {stats.outOfStock.length === 0 && stats.lowStock.length === 0 && (
              <p className="text-sm text-slate-400 py-4 text-center">All items well stocked</p>
            )}
            {stats.outOfStock.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-50 border border-red-100"
              >
                <div className="flex items-center gap-2">
                  <span className="badge-danger">Out of Stock</span>
                  <span className="text-sm font-medium text-slate-700">{p.name}</span>
                </div>
                <span className="text-xs text-slate-500">{p.part_number}</span>
              </div>
            ))}
            {stats.lowStock.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 border border-amber-100"
              >
                <div className="flex items-center gap-2">
                  <span className="badge-warning">Low Stock</span>
                  <span className="text-sm font-medium text-slate-700">{p.name}</span>
                </div>
                <span className="text-xs text-slate-500">{p.quantity} left</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Payments */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign size={18} className="text-amber-500" />
              <h3 className="font-semibold text-slate-800">Pending Customer Payments</h3>
            </div>
            <button
              onClick={() => navigate('payments')}
              className="text-xs text-teal-600 font-medium hover:text-teal-700 flex items-center gap-1"
            >
              View All <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {invoices.filter((i) => Number(i.remaining_balance) > 0).length === 0 && (
              <p className="text-sm text-slate-400 py-4 text-center">No pending payments</p>
            )}
            {invoices
              .filter((i) => Number(i.remaining_balance) > 0)
              .slice(0, 8)
              .map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 border border-amber-100"
                >
                  <div>
                    <span className="text-sm font-medium text-slate-700">
                      {inv.customer_name ?? 'Walk-in Customer'}
                    </span>
                    <span className="text-xs text-slate-400 ml-2">{inv.invoice_number}</span>
                  </div>
                  <span className="text-sm font-semibold text-amber-700">
                    {formatCurrency(Number(inv.remaining_balance), symbol)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('pos')}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all"
          >
            <ShoppingCart size={24} className="text-teal-600" />
            <span className="text-sm font-medium text-slate-700">New Sale</span>
          </button>
          <button
            onClick={() => navigate('inventory')}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all"
          >
            <Package size={24} className="text-teal-600" />
            <span className="text-sm font-medium text-slate-700">Add Product</span>
          </button>
          <button
            onClick={() => navigate('purchases')}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all"
          >
            <ShoppingBag size={24} className="text-teal-600" />
            <span className="text-sm font-medium text-slate-700">New Purchase</span>
          </button>
          <button
            onClick={() => navigate('customers')}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all"
          >
            <Users size={24} className="text-teal-600" />
            <span className="text-sm font-medium text-slate-700">Add Customer</span>
          </button>
        </div>
      </div>
    </div>
  );
}
