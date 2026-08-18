import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  X,
  ScanLine,
  ShoppingCart,
  User,
  Printer,
  CheckCircle,
  Package,
  MessageCircle,
  FileDown,
  Eye,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/format';
import { printReceipt, sharePDFOnWhatsApp, downloadThermalPDF } from '@/lib/receipt';
import { InvoicePreview } from '@/components/InvoicePreview';
import type { PageKey } from '@/App';
import type { Settings, Product, Customer, CartItem, Invoice, InvoiceItem } from '@/types';

interface POSProps {
  settings: Settings | null;
  navigate: (p: PageKey) => void;
}

export function POS({ settings, navigate }: POSProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customCustomerName, setCustomCustomerName] = useState('');
  const [customCustomerPhone, setCustomCustomerPhone] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const symbol = settings?.currency_symbol ?? 'Rs.';

  useEffect(() => {
    supabase.from('products').select('*, categories(*)').order('name').then(({ data }) => {
      setProducts((data as Product[]) ?? []);
    });
    supabase.from('customers').select('*').order('name').then(({ data }) => {
      setCustomers((data as Customer[]) ?? []);
    });
  }, []);

  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.part_number ?? '').toLowerCase().includes(term) ||
      (p.barcode ?? '').toLowerCase().includes(term) ||
      (p.brand ?? '').toLowerCase().includes(term)
    );
  });

  const filteredCustomers = customers.filter((c) => {
    const term = customerSearch.toLowerCase();
    return c.name.toLowerCase().includes(term) || (c.phone ?? '').includes(term);
  });

  const addToCart = useCallback((product: Product) => {
    if (product.quantity <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) return prev;
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: Number(product.sale_price),
          discount: 0,
        },
      ];
    });
  }, []);

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.product.id !== productId) return i;
        const newQty = i.quantity + delta;
        if (newQty <= 0) return i;
        if (newQty > i.product.quantity) return i;
        return { ...i, quantity: newQty };
      })
    );
  };

  const setQty = (productId: string, qty: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.product.id !== productId) return i;
        const clamped = Math.min(Math.max(1, qty), i.product.quantity);
        return { ...i, quantity: clamped };
      })
    );
  };

  const updatePrice = (productId: string, price: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, unitPrice: price } : i
      )
    );
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity - i.discount, 0);
  const taxAmount = settings?.tax_enabled ? (subtotal - discount) * (Number(settings.tax_rate) / 100) : 0;
  const total = subtotal - discount + taxAmount;
  const paid = paidAmount === '' ? total : Number(paidAmount);
  const remaining = Math.max(0, total - paid);

  const handleScanResult = useCallback(
    (decodedText: string) => {
      const product = products.find(
        (p) => p.barcode === decodedText || p.part_number === decodedText
      );
      if (product) {
        addToCart(product);
        stopScanner();
      }
    },
    [products, addToCart]
  );

  const startScanner = async () => {
    setScannerOpen(true);
    setTimeout(async () => {
      try {
        const html5Qrcode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5Qrcode;
        await html5Qrcode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          handleScanResult,
          () => {}
        );
      } catch (err) {
        console.error('Scanner error:', err);
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setScannerOpen(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
      }
    };
  }, []);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setProcessing(true);

    try {
      const invNumber = `${settings?.invoice_prefix ?? 'INV'}-${String(
        (settings?.invoice_counter ?? 1)
      ).padStart(5, '0')}`;

      const paymentStatus =
        remaining === 0 ? 'paid' : paid === 0 ? 'unpaid' : 'partial';

      const { data: invData, error: invError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invNumber,
          customer_id: selectedCustomer?.id ?? null,
          customer_name: selectedCustomer?.name ?? (customCustomerName.trim() || 'Walk-in Customer'),
          customer_phone: selectedCustomer?.phone ?? (customCustomerPhone.trim() || null),
          subtotal,
          discount,
          tax: taxAmount,
          total,
          paid_amount: paid,
          remaining_balance: remaining,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          notes,
        })
        .select()
        .single();

      if (invError) throw invError;
      const invoice = invData as Invoice;

      const items = cart.map((i) => ({
        invoice_id: invoice.id,
        product_id: i.product.id,
        product_name: i.product.name,
        part_number: i.product.part_number,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        discount: i.discount,
        total: i.unitPrice * i.quantity - i.discount,
      }));

      await supabase.from('invoice_items').insert(items);

      for (const item of cart) {
        await supabase
          .from('products')
          .update({
            quantity: item.product.quantity - item.quantity,
          })
          .eq('id', item.product.id);
      }

      if (paid > 0) {
        await supabase.from('payments').insert({
          invoice_id: invoice.id,
          customer_id: selectedCustomer?.id ?? null,
          customer_name: selectedCustomer?.name ?? (customCustomerName.trim() || 'Walk-in Customer'),
          amount: paid,
          payment_method: paymentMethod,
          notes: `Payment for ${invNumber}`,
        });
      }

      await supabase
        .from('settings')
        .update({ invoice_counter: (settings?.invoice_counter ?? 1) + 1 })
        .eq('id', settings?.id);

      setLastInvoice({ ...invoice, invoice_items: items as any });
      setShowSuccess(true);
      setCart([]);
      setSelectedCustomer(null);
      setCustomCustomerName('');
      setCustomCustomerPhone('');
      setDiscount(0);
      setPaidAmount('');
      setNotes('');
      setCustomerSearch('');

      const refreshed = await supabase.from('products').select('*, categories(*)').order('name');
      if (refreshed.data) setProducts(refreshed.data as Product[]);

      // Auto-print if enabled
      if (settings?.auto_print) {
        setTimeout(() => {
          printReceipt(invoice, items as any, settings);
        }, 500);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Failed to create invoice. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (showSuccess && lastInvoice) {
    return (
      <>
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle size={36} className="text-emerald-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Invoice Created!</h2>
          <p className="text-slate-500 mb-1">
            Invoice <span className="font-semibold">{lastInvoice.invoice_number}</span> has been created successfully.
          </p>
          <p className="text-sm text-slate-400 mb-6">
            Stock has been automatically deducted.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
            <button
              onClick={() => setShowPreview(true)}
              className="btn-ghost"
            >
              <Eye size={16} /> Preview Receipt
            </button>
            <button
              onClick={() => {
                const items = (lastInvoice.invoice_items ?? []) as InvoiceItem[];
                printReceipt(lastInvoice, items, settings);
              }}
              className="btn-secondary"
            >
              <Printer size={16} /> Print Receipt
            </button>
            <button
              onClick={() => {
                const items = (lastInvoice.invoice_items ?? []) as InvoiceItem[];
                downloadThermalPDF(lastInvoice, items, settings);
              }}
              className="btn-secondary"
            >
              <FileDown size={16} /> Download PDF
            </button>
            <button
              onClick={() => {
                const items = (lastInvoice.invoice_items ?? []) as InvoiceItem[];
                sharePDFOnWhatsApp(lastInvoice, items, settings);
              }}
              className="btn-primary"
            >
              <MessageCircle size={16} /> Share PDF on WhatsApp
            </button>
            <button
              onClick={() => {
                setShowSuccess(false);
                setLastInvoice(null);
              }}
              className="btn-ghost"
            >
              <Plus size={16} /> New Sale
            </button>
          </div>
        </div>
      </div>
      {showPreview && lastInvoice && (
        <InvoicePreview
          invoice={lastInvoice}
          items={(lastInvoice.invoice_items ?? []) as InvoiceItem[]}
          settings={settings}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Product Search & List */}
      <div className="lg:col-span-3 space-y-4">
        <div className="card p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, part number, or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
                autoFocus
              />
            </div>
            <button
              onClick={scannerOpen ? stopScanner : startScanner}
              className={`btn ${scannerOpen ? 'btn-danger' : 'btn-secondary'}`}
            >
              <ScanLine size={18} />
              <span className="hidden sm:inline">{scannerOpen ? 'Stop' : 'Scan'}</span>
            </button>
          </div>

          {scannerOpen && (
            <div className="mt-4 animate-scale-in">
              <div id="qr-reader" className="w-full max-w-sm mx-auto rounded-lg overflow-hidden border border-slate-200" />
              <p className="text-center text-sm text-slate-500 mt-2">
                Point camera at a barcode or QR code
              </p>
            </div>
          )}
        </div>

        <div className="card p-4">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Package size={40} className="mb-2" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[calc(100vh-320px)] overflow-y-auto">
              {filteredProducts.map((p) => {
                const out = p.quantity <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={out}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      out
                        ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                        : 'border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 active:scale-[0.98]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-semibold text-slate-800 line-clamp-2">{p.name}</p>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">
                      {p.part_number} · {p.brand}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-teal-700">
                        {formatCurrency(Number(p.sale_price), symbol)}
                      </span>
                      <span className={`text-xs ${out ? 'text-red-500' : p.quantity <= p.min_stock_level ? 'text-amber-500' : 'text-slate-400'}`}>
                        {out ? 'Out' : `${p.quantity} left`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart & Checkout */}
      <div className="lg:col-span-2">
        <div className="card p-4 sticky top-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-teal-600" />
              <h3 className="font-semibold text-slate-800">Current Sale</h3>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-red-500 hover:text-red-600 font-medium"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Customer Selection */}
          <div className="mb-4 relative">
            <label className="label">Customer</label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{selectedCustomer.name}</p>
                    {selectedCustomer.phone && (
                      <p className="text-xs text-slate-400">{selectedCustomer.phone}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerSearch('');
                  }}
                  className="text-slate-400 hover:text-red-500"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search existing customer or type name below"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="input pl-9"
                  />
                </div>
                {showCustomerDropdown && customerSearch && (
                  <div className="absolute z-10 mt-1 w-full bg-white rounded-lg border border-slate-200 shadow-lg max-h-48 overflow-y-auto">
                    {filteredCustomers.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-slate-400">No customers found - use the name field below</p>
                    ) : (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomer(c);
                            setCustomerSearch('');
                            setShowCustomerDropdown(false);
                            setCustomCustomerName('');
                            setCustomCustomerPhone('');
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                        >
                          <p className="text-sm font-medium text-slate-700">{c.name}</p>
                          {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                        </button>
                      ))
                    )}
                  </div>
                )}
                {!selectedCustomer && (
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      placeholder="Customer name (e.g. Muhammad Ali)"
                      value={customCustomerName}
                      onChange={(e) => setCustomCustomerName(e.target.value)}
                      className="input"
                    />
                    <input
                      type="text"
                      placeholder="Customer phone (optional)"
                      value={customCustomerPhone}
                      onChange={(e) => setCustomCustomerPhone(e.target.value)}
                      className="input"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Cart Items */}
          <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <ShoppingCart size={32} className="mb-2" />
                <p className="text-sm">Cart is empty</p>
                <p className="text-xs">Search or scan products to add</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{item.product.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs text-slate-400">
                        {formatCurrency(item.unitPrice, symbol)} × {item.quantity}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        = {formatCurrency(item.unitPrice * item.quantity, symbol)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.product.id, -1)}
                      className="p-1 rounded hover:bg-slate-200 text-slate-600"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => setQty(item.product.id, Number(e.target.value))}
                      className="w-10 text-center text-sm border border-slate-200 rounded py-1"
                    />
                    <button
                      onClick={() => updateQty(item.product.id, 1)}
                      className="p-1 rounded hover:bg-slate-200 text-slate-600"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="p-1 rounded hover:bg-red-50 text-red-500 ml-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals & Payment */}
          {cart.length > 0 && (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-700">{formatCurrency(subtotal, symbol)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Discount</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-24 text-right input py-1.5 text-sm"
                  placeholder="0"
                />
              </div>
              {settings?.tax_enabled && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tax ({settings.tax_rate}%)</span>
                  <span className="font-medium text-slate-700">{formatCurrency(taxAmount, symbol)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-100">
                <span className="text-slate-800">Total</span>
                <span className="text-teal-700">{formatCurrency(total, symbol)}</span>
              </div>

              {/* Payment Method */}
              <div>
                <label className="label">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {['cash', 'card', 'credit'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                        paymentMethod === m
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {m === 'credit' ? 'Udhaar' : m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paid Amount */}
              <div>
                <label className="label">Paid Amount</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="input"
                  placeholder={String(total)}
                />
                {remaining > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Remaining: {formatCurrency(remaining, symbol)}
                  </p>
                )}
              </div>

              <button
                onClick={handleCheckout}
                disabled={processing}
                className="btn-primary w-full"
              >
                {processing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Complete Sale
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
