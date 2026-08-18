import { Menu, Plus, LogOut, ShieldCheck } from 'lucide-react';
import type { PageKey } from '@/App';
import type { Settings } from '@/types';

const pageTitles: Record<PageKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Business overview at a glance' },
  pos: { title: 'New Sale', subtitle: 'Create a new invoice and sell parts' },
  inventory: { title: 'Inventory', subtitle: 'Manage your spare parts stock' },
  invoices: { title: 'Invoices', subtitle: 'View and manage all sales invoices' },
  customers: { title: 'Customers', subtitle: 'Manage customer profiles and ledgers' },
  suppliers: { title: 'Suppliers', subtitle: 'Manage supplier profiles and balances' },
  purchases: { title: 'Purchases', subtitle: 'Record stock purchases from suppliers' },
  payments: { title: 'Payments / Udhaar', subtitle: 'Track customer payments and dues' },
  expenses: { title: 'Expenses', subtitle: 'Record and track business expenses' },
  reports: { title: 'Reports', subtitle: 'Daily, monthly, and yearly analytics' },
  settings: { title: 'Settings', subtitle: 'Configure your business settings' },
};

interface TopBarProps {
  page: PageKey;
  onMenuClick: () => void;
  navigate: (p: PageKey) => void;
  settings: Settings | null;
  onLogout: () => void;
}

export function TopBar({ page, onMenuClick, navigate, settings, onLogout }: TopBarProps) {
  const { title, subtitle } = pageTitles[page];

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-4 bg-white border-b border-slate-200">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600"
        >
          <Menu size={22} />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-500 hidden sm:block">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {page !== 'pos' && (
          <button
            onClick={() => navigate('pos')}
            className="btn-primary text-xs sm:text-sm"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Sale</span>
          </button>
        )}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={14} className="text-teal-600" />
          <span className="font-medium text-slate-700">
            {settings?.admin_username ?? 'Admin'}
          </span>
        </div>
        <button
          onClick={onLogout}
          className="btn-secondary text-xs sm:text-sm"
          title="Sign out"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
