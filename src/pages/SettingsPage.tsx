import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Plus, Trash2, Tag, ShieldCheck, Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { testPrint } from '@/lib/receipt';
import type { Settings, Category } from '@/types';

interface SettingsPageProps {
  settings: Settings | null;
  setSettings: (s: Settings | null) => void;
}

export function SettingsPage({ settings, setSettings }: SettingsPageProps) {
  const [form, setForm] = useState<Settings | null>(settings);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(({ data }) => {
      setCategories((data as Category[]) ?? []);
    });
  }, []);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .update({
          business_name: form.business_name,
          business_address: form.business_address,
          business_phone: form.business_phone,
          business_email: form.business_email,
          currency: form.currency,
          currency_symbol: form.currency_symbol,
          tax_rate: form.tax_rate,
          tax_enabled: form.tax_enabled,
          invoice_prefix: form.invoice_prefix,
          purchase_prefix: form.purchase_prefix,
          terms_conditions: form.terms_conditions,
          low_stock_threshold: form.low_stock_threshold,
          admin_username: form.admin_username,
          admin_password: form.admin_password,
          printer_width: form.printer_width,
          receipt_mode: form.receipt_mode,
          auto_print: form.auto_print,
          qr_enabled: form.qr_enabled,
        })
        .eq('id', form.id)
        .select()
        .single();
      if (error) throw error;
      setSettings(data as Settings);
      showToast('success', 'Settings saved');
    } catch {
      showToast('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    const { error } = await supabase
      .from('categories')
      .insert({ name: newCatName, description: newCatDesc });
    if (error) {
      showToast('error', 'Failed to add category');
    } else {
      showToast('success', 'Category added');
      setNewCatName('');
      setNewCatDesc('');
      setCatModalOpen(false);
      const { data } = await supabase.from('categories').select('*').order('name');
      setCategories((data as Category[]) ?? []);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category? Products in it will be uncategorized.')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      showToast('error', 'Failed to delete category');
    } else {
      showToast('success', 'Category deleted');
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
  };

  if (!form) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Business Info */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon size={20} className="text-teal-600" />
          <h3 className="font-semibold text-slate-800">Business Information</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Business Name</label>
            <input
              type="text"
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              type="text"
              value={form.business_phone}
              onChange={(e) => setForm({ ...form, business_phone: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Address</label>
            <input
              type="text"
              value={form.business_address}
              onChange={(e) => setForm({ ...form, business_address: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={form.business_email ?? ''}
              onChange={(e) => setForm({ ...form, business_email: e.target.value })}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Currency & Tax */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Currency & Tax</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Currency Code</label>
            <input
              type="text"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Currency Symbol</label>
            <input
              type="text"
              value={form.currency_symbol}
              onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Tax Rate (%)</label>
            <input
              type="number"
              step="0.01"
              value={form.tax_rate}
              onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })}
              className="input"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.tax_enabled}
              onChange={(e) => setForm({ ...form, tax_enabled: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-700">Enable tax on invoices</span>
          </label>
        </div>
      </div>

      {/* Invoice Settings */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Invoice Settings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Invoice Prefix</label>
            <input
              type="text"
              value={form.invoice_prefix}
              onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Purchase Prefix</label>
            <input
              type="text"
              value={form.purchase_prefix}
              onChange={(e) => setForm({ ...form, purchase_prefix: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Low Stock Threshold (default)</label>
            <input
              type="number"
              value={form.low_stock_threshold}
              onChange={(e) => setForm({ ...form, low_stock_threshold: Number(e.target.value) })}
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Terms & Conditions</label>
            <textarea
              value={form.terms_conditions}
              onChange={(e) => setForm({ ...form, terms_conditions: e.target.value })}
              className="input"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Printer Settings */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Printer size={20} className="text-teal-600" />
          <h3 className="font-semibold text-slate-800">Printer Settings</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Paper Width</label>
            <select
              value={form.printer_width ?? '80mm'}
              onChange={(e) => setForm({ ...form, printer_width: e.target.value })}
              className="input"
            >
              <option value="58mm">58mm (Small Thermal Printer)</option>
              <option value="80mm">80mm (Standard Thermal Printer)</option>
            </select>
          </div>
          <div>
            <label className="label">Receipt Mode</label>
            <select
              value={form.receipt_mode ?? 'detailed'}
              onChange={(e) => setForm({ ...form, receipt_mode: e.target.value })}
              className="input"
            >
              <option value="detailed">Detailed (Full invoice with all info)</option>
              <option value="short">Short (Compact quick receipt)</option>
            </select>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.auto_print ?? false}
              onChange={(e) => setForm({ ...form, auto_print: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-700">Auto Print After Sale</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.qr_enabled ?? true}
              onChange={(e) => setForm({ ...form, qr_enabled: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-700">Show QR Code on Receipt</span>
          </label>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => testPrint(form)}
            className="btn-secondary text-sm"
          >
            <Printer size={16} /> Test Print
          </button>
        </div>
      </div>

      {/* Admin Credentials */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={20} className="text-teal-600" />
          <h3 className="font-semibold text-slate-800">Admin Login Credentials</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Admin Username</label>
            <input
              type="text"
              value={form.admin_username ?? ''}
              onChange={(e) => setForm({ ...form, admin_username: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Admin Password</label>
            <input
              type="text"
              value={form.admin_password ?? ''}
              onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
              className="input"
            />
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          These credentials are used to log in to the system. Save settings after changing.
        </p>
      </div>

      {/* Categories */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tag size={20} className="text-teal-600" />
            <h3 className="font-semibold text-slate-800">Product Categories</h3>
          </div>
          <button onClick={() => setCatModalOpen(true)} className="btn-secondary text-sm">
            <Plus size={16} /> Add Category
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200"
            >
              <span className="text-sm font-medium text-slate-700">{c.name}</span>
              <button
                onClick={() => deleteCategory(c.id)}
                className="text-slate-400 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Saving...
            </>
          ) : (
            <>
              <Save size={18} /> Save Settings
            </>
          )}
        </button>
      </div>

      {/* Add Category Modal */}
      <Modal open={catModalOpen} onClose={() => setCatModalOpen(false)} title="Add Category" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Category Name *</label>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="input"
              placeholder="e.g. Honda"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Description</label>
            <input
              type="text"
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              className="input"
              placeholder="Optional description"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setCatModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button onClick={addCategory} className="btn-primary">
              Add
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
