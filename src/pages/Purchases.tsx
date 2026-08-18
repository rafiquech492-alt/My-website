import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Eye,
  Trash2,
  ShoppingBag,
  X,
  Minus,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toast';
import type { Settings, Product, Supplier, Purchase, PurchaseItem } from '@/types';

interface PurchasesProps {
  settings?: Settings | null;
}

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
}

export function Purchases({ settings }: PurchasesProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null);
  const [viewItems, setViewItems] = useState<PurchaseItem[]>([]);

  // Form state
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const symbol = settings?.currency_symbol ?? 'Rs.';

  const load = async () => {
    setLoading(true);
    const [purRes, prodRes, supRes] = await Promise.all([
      supabase.from('purchases').select('*').order('purchase_date', { ascending: false }),
      supabase.from('products').select('*').order('name'),
      supabase.from('suppliers').select('*').order('name'),
    ]);
    setPurchases((purRes.data as Purchase[]) ?? []);
    setProducts((prodRes.data as Product[]) ?? []);
    setSuppliers((supRes.data as Supplier[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      const term = search.toLowerCase();
      return (
        p.purchase_number.toLowerCase().includes(term) ||
        (p.supplier_name ?? '').toLowerCase().includes(term)
      );
    });
  }, [purchases, search]);

  const filteredProducts = products.filter((p) => {
    const term = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.part_number ?? '').toLowerCase().includes(term)
    );
  });

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { product, quantity: 1, unitPrice: Number(product.purchase_price) }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === id
          ? { ...i, quantity: Math.max(1, i.quantity + delta) }
          : i
      )
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== id));
  };

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const total = subtotal - discount;
  const paid = paidAmount === '' ? total : Number(paidAmount);
  const remaining = Math.max(0, total - paid);

  const resetForm = () => {
    setSelectedSupplier(null);
    setCart([]);
    setProductSearch('');
    setDiscount(0);
    setPaidAmount('');
    setPaymentMethod('cash');
    setNotes('');
  };

  const handleSave = async () => {
    if (cart.length === 0) {
      showToast('warning', 'Add at least one product');
      return;
    }
    setSaving(true);
    try {
      const purNumber = `${settings?.purchase_prefix ?? 'PUR'}-${String(
        (settings?.purchase_counter ?? 1)
      ).padStart(5, '0')}`;

      const paymentStatus =
        remaining === 0 ? 'paid' : paid === 0 ? 'unpaid' : 'partial';

      const { data: purData, error: purError } = await supabase
        .from('purchases')
        .insert({
          purchase_number: purNumber,
          supplier_id: selectedSupplier?.id ?? null,
          supplier_name: selectedSupplier?.name ?? 'Unknown Supplier',
          subtotal,
          discount,
          total,
          paid_amount: paid,
          remaining_balance: remaining,
          payment_status: paymentStatus,
          notes,
        })
        .select()
        .single();

      if (purError) throw purError;
      const purchase = purData as Purchase;

      const items = cart.map((i) => ({
        purchase_id: purchase.id,
        product_id: i.product.id,
        product_name: i.product.name,
        part_number: i.product.part_number,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        total: i.unitPrice * i.quantity,
      }));

      await supabase.from('purchase_items').insert(items);

      for (const item of cart) {
        await supabase
          .from('products')
          .update({
            quantity: item.product.quantity + item.quantity,
            purchase_price: item.unitPrice,
          })
          .eq('id', item.product.id);
      }

      if (paid > 0) {
        await supabase.from('supplier_payments').insert({
          supplier_id: selectedSupplier?.id ?? null,
          purchase_id: purchase.id,
          amount: paid,
          payment_method: paymentMethod,
          notes: `Payment for ${purNumber}`,
        });
      }

      await supabase
        .from('settings')
        .update({ purchase_counter: (settings?.purchase_counter ?? 1) + 1 })
        .eq('id', settings?.id);

      showToast('success', 'Purchase recorded and stock updated');
      resetForm();
      setCreateOpen(false);
      load();
    } catch (err) {
      showToast('error', 'Failed to record purchase');
    } finally {
      setSaving(false);
    }
  };

  const openView = async (p: Purchase) => {
    const { data } = await supabase
      .from('purchase_items')
      .select('*')
      .eq('purchase_id', p.id);
    setViewItems((data as PurchaseItem[]) ?? []);
    setViewPurchase(p);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this purchase record? Stock will NOT be reversed.')) return;
    const { error } = await supabase.from('purchases').delete().eq('id', id);
    if (error) {
      showToast('error', 'Failed to delete');
    } else {
      showToast('success', 'Purchase deleted');
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

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search purchases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <button
            onClick={() => {
              resetForm();
              setCreateOpen(true);
            }}
            className="btn-primary"
          >
            <Plus size={16} /> New Purchase
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header">Purchase #</th>
                <th className="table-header">Date</th>
                <th className="table-header">Supplier</th>
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
                    <ShoppingBag size={32} className="mx-auto mb-2" />
                    No purchases found
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="table-cell font-medium text-blue-700">
                      {p.purchase_number}
                    </td>
                    <td className="table-cell text-slate-500">
                      {formatDate(p.purchase_date)}
                    </td>
                    <td className="table-cell font-medium text-slate-700">
                      {p.supplier_name ?? '-'}
                    </td>
                    <td className="table-cell hidden sm:table-cell font-medium">
                      {formatCurrency(Number(p.total), symbol)}
                    </td>
                    <td className="table-cell hidden sm:table-cell text-emerald-600">
                      {formatCurrency(Number(p.paid_amount), symbol)}
                    </td>
                    <td className="table-cell hidden md:table-cell text-amber-600">
                      {Number(p.remaining_balance) > 0
                        ? formatCurrency(Number(p.remaining_balance), symbol)
                        : '-'}
                    </td>
                    <td className="table-cell">
                      {p.payment_status === 'paid' && <span className="badge-success">Paid</span>}
                      {p.payment_status === 'partial' && <span className="badge-warning">Partial</span>}
                      {p.payment_status === 'unpaid' && <span className="badge-danger">Unpaid</span>}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openView(p)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
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

      {/* Create Purchase Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Purchase"
        size="xl"
      >
        <div className="space-y-4">
          {/* Supplier Selection */}
          <div>
            <label className="label">Supplier</label>
            {selectedSupplier ? (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-sm font-medium text-slate-700">
                  {selectedSupplier.name}
                  {selectedSupplier.company && ` — ${selectedSupplier.company}`}
                </span>
                <button
                  onClick={() => setSelectedSupplier(null)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <select
                value=""
                onChange={(e) => {
                  const s = suppliers.find((s) => s.id === e.target.value);
                  if (s) setSelectedSupplier(s);
                }}
                className="input"
              >
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.company ? ` — ${s.company}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Product Search */}
          <div>
            <label className="label">Add Products</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products to add..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="input pl-9"
              />
            </div>
            {productSearch && (
              <div className="mt-2 max-h-32 overflow-y-auto border border-slate-200 rounded-lg">
                {filteredProducts.slice(0, 5).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      addToCart(p);
                      setProductSearch('');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                  >
                    <p className="text-sm font-medium text-slate-700">{p.name}</p>
                    <p className="text-xs text-slate-400">
                      {p.part_number} · Stock: {p.quantity}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No items added yet</p>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-slate-400">{item.product.part_number}</p>
                  </div>
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) =>
                      setCart((prev) =>
                        prev.map((i) =>
                          i.product.id === item.product.id
                            ? { ...i, unitPrice: Number(e.target.value) }
                            : i
                        )
                      )
                    }
                    className="w-20 text-right text-sm border border-slate-200 rounded px-2 py-1"
                    placeholder="Price"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.product.id, -1)}
                      className="p-1 rounded hover:bg-slate-200 text-slate-600"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.product.id, 1)}
                      className="p-1 rounded hover:bg-slate-200 text-slate-600"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-slate-700 w-20 text-right">
                    {formatCurrency(item.unitPrice * item.quantity, symbol)}
                  </span>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="p-1 rounded hover:bg-red-50 text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal, symbol)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Discount</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-24 text-right input py-1.5 text-sm"
                />
              </div>
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-blue-700">{formatCurrency(total, symbol)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="input"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="credit">Credit (Udhaar)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Paid Amount</label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="input"
                    placeholder={String(total)}
                  />
                </div>
              </div>
              {remaining > 0 && (
                <p className="text-xs text-amber-600">
                  Remaining: {formatCurrency(remaining, symbol)}
                </p>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary w-full"
              >
                {saving ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} /> Record Purchase & Update Stock
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* View Purchase Modal */}
      <Modal
        open={!!viewPurchase}
        onClose={() => setViewPurchase(null)}
        title="Purchase Details"
        size="lg"
      >
        {viewPurchase && (
          <div className="space-y-4">
            <div className="flex justify-between items-start pb-4 border-b border-slate-200">
              <div>
                <p className="text-lg font-bold text-blue-700">{viewPurchase.purchase_number}</p>
                <p className="text-sm text-slate-500">{formatDate(viewPurchase.purchase_date)}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-slate-700">{viewPurchase.supplier_name}</p>
              </div>
            </div>
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-header">Item</th>
                  <th className="table-header text-center">Qty</th>
                  <th className="table-header text-right">Price</th>
                  <th className="table-header text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {viewItems.map((item) => (
                  <tr key={item.id}>
                    <td className="table-cell font-medium">{item.product_name}</td>
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
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span>{formatCurrency(Number(viewPurchase.subtotal), symbol)}</span>
                </div>
                {Number(viewPurchase.discount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Discount</span>
                    <span>-{formatCurrency(Number(viewPurchase.discount), symbol)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-2 border-t border-slate-200">
                  <span>Total</span>
                  <span className="text-blue-700">
                    {formatCurrency(Number(viewPurchase.total), symbol)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Paid</span>
                  <span>{formatCurrency(Number(viewPurchase.paid_amount), symbol)}</span>
                </div>
                {Number(viewPurchase.remaining_balance) > 0 && (
                  <div className="flex justify-between text-sm text-amber-600 font-medium">
                    <span>Remaining</span>
                    <span>{formatCurrency(Number(viewPurchase.remaining_balance), symbol)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
