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
  X,
  Bike,
} from 'lucide-react';
import type { PageKey } from '@/App';

import type { LucideIcon } from 'lucide-react';

interface NavItem {
  key: PageKey;
  label: string;
  icon: LucideIcon;
  group?: string;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Main' },
  { key: 'pos', label: 'New Sale / POS', icon: ShoppingCart, group: 'Main' },
  { key: 'inventory', label: 'Inventory', icon: Package, group: 'Inventory' },
  { key: 'purchases', label: 'Purchases', icon: ShoppingBag, group: 'Inventory' },
  { key: 'suppliers', label: 'Suppliers', icon: Truck, group: 'Inventory' },
  { key: 'invoices', label: 'Invoices', icon: FileText, group: 'Sales' },
  { key: 'customers', label: 'Customers', icon: Users, group: 'Sales' },
  { key: 'payments', label: 'Payments / Udhaar', icon: Wallet, group: 'Sales' },
  { key: 'expenses', label: 'Expenses', icon: Receipt, group: 'Sales' },
  { key: 'reports', label: 'Reports', icon: BarChart3, group: 'Reports' },
  { key: 'settings', label: 'Settings', icon: Settings, group: 'Reports' },
];

interface SidebarProps {
  currentPage: PageKey;
  navigate: (p: PageKey) => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ currentPage, navigate, open, onClose }: SidebarProps) {
  const groups = [...new Set(navItems.map((i) => i.group))];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed z-40 inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-white">
              <Bike size={22} />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-tight">
                Multan Auto
              </h1>
              <p className="text-slate-400 text-xs">Spare Parts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {groups.map((group) => (
            <div key={group}>
              <p className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {group}
              </p>
              <div className="space-y-1">
                {navItems
                  .filter((i) => i.group === group)
                  .map((item) => {
                    const Icon = item.icon;
                    const active = currentPage === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => navigate(item.key)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                          active
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <Icon size={18} />
                        {item.label}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-slate-800">
          <p className="text-xs text-slate-500">
            GT Road Sanawan
            <br />
            03473502993
          </p>
        </div>
      </aside>
    </>
  );
}
