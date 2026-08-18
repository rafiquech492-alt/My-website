import { useState, useEffect } from 'react';
import { Download, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Settings } from '@/types';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Dashboard } from '@/pages/Dashboard';
import { POS } from '@/pages/POS';
import { Inventory } from '@/pages/Inventory';
import { Invoices } from '@/pages/Invoices';
import { Customers } from '@/pages/Customers';
import { Suppliers } from '@/pages/Suppliers';
import { Purchases } from '@/pages/Purchases';
import { Payments } from '@/pages/Payments';
import { Expenses } from '@/pages/Expenses';
import { Reports } from '@/pages/Reports';
import { SettingsPage } from '@/pages/SettingsPage';
import { LoginPage } from '@/pages/LoginPage';
import { ToastContainer } from '@/components/ui/Toast';

export type PageKey =
  | 'dashboard'
  | 'pos'
  | 'inventory'
  | 'invoices'
  | 'customers'
  | 'suppliers'
  | 'purchases'
  | 'payments'
  | 'expenses'
  | 'reports'
  | 'settings';

const SESSION_KEY = 'masp_admin_session';

function App() {
  const [page, setPage] = useState<PageKey>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [bootLoading, setBootLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);
  const [installEvent, setInstallEvent] = useState<any>(null);

  useEffect(() => {
    supabase
      .from('settings')
      .select('*')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSettings(data as Settings);
        setBootLoading(false);
      });

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const navigate = (p: PageKey) => {
    setPage(p);
    setSidebarOpen(false);
  };

  const handleLogin = (s: Settings) => {
    setSettings(s);
    sessionStorage.setItem(SESSION_KEY, '1');
    setAuthed(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
    setPage('dashboard');
  };

  const handleInstall = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard navigate={navigate} settings={settings} />;
      case 'pos':
        return <POS settings={settings} navigate={navigate} />;
      case 'inventory':
        return <Inventory />;
      case 'invoices':
        return <Invoices settings={settings} />;
      case 'customers':
        return <Customers />;
      case 'suppliers':
        return <Suppliers />;
      case 'purchases':
        return <Purchases />;
      case 'payments':
        return <Payments />;
      case 'expenses':
        return <Expenses />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <SettingsPage settings={settings} setSettings={setSettings} />;
      default:
        return <Dashboard navigate={navigate} settings={settings} />;
    }
  };

  if (bootLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin h-8 w-8 border-2 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!authed) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        currentPage={page}
        navigate={navigate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          page={page}
          onMenuClick={() => setSidebarOpen(true)}
          navigate={navigate}
          settings={settings}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
          <div className="mx-auto max-w-7xl animate-fade-in">{renderPage()}</div>
        </main>
      </div>
      <BottomNav currentPage={page} navigate={navigate} />

      {/* Floating status bar */}
      <div className="fixed top-16 right-4 z-20 flex flex-col gap-2 items-end">
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${
            online ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {online ? <Wifi size={12} /> : <WifiOff size={12} />}
          {online ? 'Online' : 'Offline'}
        </div>
        {installEvent && (
          <button
            onClick={handleInstall}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-teal-600 text-white shadow-sm hover:bg-teal-700"
          >
            <Download size={12} /> Install App
          </button>
        )}
      </div>

      <ToastContainer />
    </div>
  );
}

export default App;
