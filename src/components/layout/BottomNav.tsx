import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  Users,
  Truck,
  ShoppingBag,
  Wallet,
  Receipt,
  BarChart3,
  Settings,
  Bike,
} from 'lucide-react';
import type { PageKey } from '@/App';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  key: PageKey;
  label: string;
  icon: LucideIcon;
}

const mainNav: NavItem[] = [
  { key: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { key: 'pos', label: 'POS', icon: ShoppingCart },
  { key: 'inventory', label: 'Stock', icon: Package },
  { key: 'invoices', label: 'Sales', icon: FileText },
  { key: 'customers', label: 'Customers', icon: Users },
];

const moreNav: NavItem[] = [
  { key: 'purchases', label: 'Purchases', icon: ShoppingBag },
  { key: 'suppliers', label: 'Suppliers', icon: Truck },
  { key: 'payments', label: 'Payments', icon: Wallet },
  { key: 'expenses', label: 'Expenses', icon: Receipt },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'settings', label: 'Settings', icon: Settings },
];

interface BottomNavProps {
  currentPage: PageKey;
  navigate: (p: PageKey) => void;
}

export function BottomNav({ currentPage, navigate }: BottomNavProps) {
  const isMain = mainNav.some((n) => n.key === currentPage);
  const showMore = !isMain;

  if (showMore) {
    return (
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-900 border-t border-slate-800 px-2 py-2">
        <div className="grid grid-cols-6 gap-1">
          {mainNav.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.key)}
                className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium ${
                  active ? 'text-teal-400' : 'text-slate-400'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
          {moreNav.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.key)}
                className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium ${
                  active ? 'text-teal-400' : 'text-slate-400'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-900 border-t border-slate-800 px-2 py-2">
      <div className="grid grid-cols-6 gap-1">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const active = currentPage === item.key;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.key)}
              className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium ${
                active ? 'text-teal-400' : 'text-slate-400'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
        <button
          onClick={() => navigate('settings')}
          className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium ${
            currentPage === 'settings' ? 'text-teal-400' : 'text-slate-400'
          }`}
        >
          <Settings size={18} />
          More
        </button>
      </div>
    </nav>
  );
}

export function MobileTopBar() {
  return (
    <div className="lg:hidden flex items-center gap-2 px-4 py-3 bg-slate-900 text-white">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600">
        <Bike size={18} />
      </div>
      <div>
        <h1 className="text-sm font-bold leading-tight">Multan Auto</h1>
        <p className="text-xs text-slate-400">Spare Parts POS</p>
      </div>
    </div>
  );
}
