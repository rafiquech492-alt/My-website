export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  part_number: string | null;
  barcode: string | null;
  category_id: string | null;
  brand: string | null;
  vehicle_model: string | null;
  purchase_price: number;
  sale_price: number;
  wholesale_price: number;
  quantity: number;
  min_stock_level: number;
  supplier_id: string | null;
  rack_location: string | null;
  image_url: string | null;
  warranty: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  categories?: Category | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  vehicle: string | null;
  registration_number: string | null;
  credit_limit: number;
  opening_balance: number;
  notes: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  company: string | null;
  opening_balance: number;
  notes: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid_amount: number;
  remaining_balance: number;
  payment_method: string;
  payment_status: string;
  notes: string | null;
  invoice_date: string;
  created_at: string;
  invoice_items?: InvoiceItem[];
  customer?: Customer | null;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  product_name: string;
  part_number: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  created_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string | null;
  customer_id: string | null;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string | null;
  created_at: string;
}

export interface Purchase {
  id: string;
  purchase_number: string;
  supplier_id: string | null;
  supplier_name: string | null;
  subtotal: number;
  discount: number;
  total: number;
  paid_amount: number;
  remaining_balance: number;
  payment_status: string;
  notes: string | null;
  purchase_date: string;
  created_at: string;
  purchase_items?: PurchaseItem[];
  supplier?: Supplier | null;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string | null;
  product_name: string;
  part_number: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
}

export interface SupplierPayment {
  id: string;
  supplier_id: string | null;
  purchase_id: string | null;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  category: string | null;
  description: string;
  amount: number;
  payment_method: string;
  expense_date: string;
  created_at: string;
}

export interface Settings {
  id: string;
  business_name: string;
  business_address: string;
  business_phone: string;
  business_email: string | null;
  currency: string;
  currency_symbol: string;
  tax_rate: number;
  tax_enabled: boolean;
  invoice_prefix: string;
  invoice_counter: number;
  purchase_prefix: string;
  purchase_counter: number;
  logo_url: string | null;
  terms_conditions: string;
  low_stock_threshold: number;
  admin_username: string | null;
  admin_password: string | null;
  printer_width: string | null;
  receipt_mode: string | null;
  auto_print: boolean | null;
  qr_enabled: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
}
