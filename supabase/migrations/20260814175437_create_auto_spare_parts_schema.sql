/*
# Auto Spare Parts Shop Management Schema

## Overview
Complete database schema for "Multan Auto Spare Parts" — a motorbike spare parts shop management system.
This is a single-tenant app (no sign-in), so all policies allow anon + authenticated CRUD.

## Tables
1. `categories` — product categories (Honda, Yamaha, Suzuki, etc.)
2. `suppliers` — supplier profiles with outstanding balances
3. `products` — spare parts inventory with stock, prices, barcode, QR, warranty
4. `customers` — customer profiles with ledger balances
5. `invoices` — sales invoices (cash, credit, partial payment)
6. `invoice_items` — line items per invoice
7. `payments` — customer payments against invoices
8. `purchases` — purchase orders from suppliers
9. `purchase_items` — line items per purchase
10. `supplier_payments` — payments made to suppliers
11. `expenses` — business expense records
12. `settings` — business configuration (single row)

## Security
- RLS enabled on all tables.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is a single-tenant, no-auth app where all data is intentionally shared.
*/

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_categories" ON categories;
CREATE POLICY "anon_crud_categories" ON categories FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  address text,
  company text,
  opening_balance numeric(12,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_suppliers" ON suppliers;
CREATE POLICY "anon_crud_suppliers" ON suppliers FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- PRODUCTS (Inventory)
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  part_number text,
  barcode text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  brand text,
  vehicle_model text,
  purchase_price numeric(12,2) DEFAULT 0,
  sale_price numeric(12,2) DEFAULT 0,
  wholesale_price numeric(12,2) DEFAULT 0,
  quantity integer DEFAULT 0,
  min_stock_level integer DEFAULT 5,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  rack_location text,
  image_url text,
  warranty text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_products" ON products;
CREATE POLICY "anon_crud_products" ON products FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  address text,
  vehicle text,
  registration_number text,
  credit_limit numeric(12,2) DEFAULT 0,
  opening_balance numeric(12,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_customers" ON customers;
CREATE POLICY "anon_crud_customers" ON customers FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- INVOICES (Sales)
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text,
  customer_phone text,
  subtotal numeric(12,2) DEFAULT 0,
  discount numeric(12,2) DEFAULT 0,
  tax numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  paid_amount numeric(12,2) DEFAULT 0,
  remaining_balance numeric(12,2) DEFAULT 0,
  payment_method text DEFAULT 'cash',
  payment_status text DEFAULT 'paid',
  notes text,
  invoice_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_invoices" ON invoices;
CREATE POLICY "anon_crud_invoices" ON invoices FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- INVOICE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  part_number text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_invoice_items" ON invoice_items;
CREATE POLICY "anon_crud_invoice_items" ON invoice_items FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- PAYMENTS (Customer payments)
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'cash',
  payment_date timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_payments" ON payments;
CREATE POLICY "anon_crud_payments" ON payments FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- PURCHASES
-- ============================================================
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number text NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name text,
  subtotal numeric(12,2) DEFAULT 0,
  discount numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  paid_amount numeric(12,2) DEFAULT 0,
  remaining_balance numeric(12,2) DEFAULT 0,
  payment_status text DEFAULT 'paid',
  notes text,
  purchase_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_purchases" ON purchases;
CREATE POLICY "anon_crud_purchases" ON purchases FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- PURCHASE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  part_number text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_purchase_items" ON purchase_items;
CREATE POLICY "anon_crud_purchase_items" ON purchase_items FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- SUPPLIER PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  purchase_id uuid REFERENCES purchases(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'cash',
  payment_date timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_supplier_payments" ON supplier_payments;
CREATE POLICY "anon_crud_supplier_payments" ON supplier_payments FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'cash',
  expense_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_expenses" ON expenses;
CREATE POLICY "anon_crud_expenses" ON expenses FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- SETTINGS (single row)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text DEFAULT 'Multan Auto Spare Parts',
  business_address text DEFAULT 'GT Road Sanawan',
  business_phone text DEFAULT '03473502993',
  business_email text,
  currency text DEFAULT 'PKR',
  currency_symbol text DEFAULT 'Rs.',
  tax_rate numeric(5,2) DEFAULT 0,
  tax_enabled boolean DEFAULT false,
  invoice_prefix text DEFAULT 'INV',
  invoice_counter integer DEFAULT 1,
  purchase_prefix text DEFAULT 'PUR',
  purchase_counter integer DEFAULT 1,
  logo_url text,
  terms_conditions text DEFAULT 'Goods once sold are not returnable without original invoice.',
  low_stock_threshold integer DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_settings" ON settings;
CREATE POLICY "anon_crud_settings" ON settings FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_part_number ON products(part_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO categories (name, description)
SELECT * FROM (VALUES
  ('Honda', 'Honda bike parts'),
  ('Yamaha', 'Yamaha bike parts'),
  ('Suzuki', 'Suzuki bike parts'),
  ('United', 'United bike parts'),
  ('Road Prince', 'Road Prince bike parts'),
  ('Super Power', 'Super Power bike parts'),
  ('Unique', 'Unique bike parts'),
  ('Chinese Bikes', 'Chinese bike parts'),
  ('Universal Parts', 'Universal parts for all bikes')
) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM categories LIMIT 1);

-- Seed default settings row
INSERT INTO settings (business_name, business_address, business_phone)
SELECT 'Multan Auto Spare Parts', 'GT Road Sanawan', '03473502993'
WHERE NOT EXISTS (SELECT 1 FROM settings LIMIT 1);

-- Seed sample products
INSERT INTO products (name, part_number, barcode, brand, vehicle_model, purchase_price, sale_price, wholesale_price, quantity, min_stock_level, warranty, notes)
SELECT * FROM (VALUES
  ('Clutch Plate', 'CP-001', '8901234567890', 'Honda', 'CD 70', 500, 850, 750, 25, 5, '1 Month', 'Honda CD 70 clutch plate'),
  ('Brake Pad Front', 'BP-001', '8901234567891', 'Honda', 'CG 125', 350, 600, 500, 15, 5, '1 Month', 'Front brake pad'),
  ('Spark Plug', 'SP-001', '8901234567892', 'NGK', 'Universal', 120, 250, 200, 50, 10, 'No Warranty', 'Standard spark plug'),
  ('Air Filter', 'AF-001', '8901234567893', 'Honda', 'CD 70', 150, 350, 280, 30, 5, 'No Warranty', 'Air filter element'),
  ('Chain Sprocket Set', 'CS-001', '8901234567894', 'Honda', 'CG 125', 800, 1500, 1200, 10, 3, '3 Months', 'Complete chain sprocket set'),
  ('Engine Oil 1L', 'EO-001', '8901234567895', 'Castrol', 'Universal', 450, 700, 600, 40, 10, 'No Warranty', '20W-50 engine oil'),
  ('Headlight Assembly', 'HL-001', '8901234567896', 'Honda', 'CD 70', 600, 1100, 900, 8, 3, '1 Month', 'Complete headlight'),
  ('Rear Brake Shoe', 'BS-001', '8901234567897', 'Honda', 'CD 70', 200, 400, 320, 20, 5, '1 Month', 'Rear brake shoe set'),
  ('Piston Kit', 'PK-001', '8901234567898', 'Honda', 'CG 125', 1200, 2200, 1800, 5, 2, '3 Months', 'Piston ring kit'),
  ('Carburetor', 'CB-001', '8901234567899', 'Honda', 'CD 70', 1500, 2800, 2400, 3, 2, '1 Month', 'Original carburetor')
) AS v(name, part_number, barcode, brand, vehicle_model, purchase_price, sale_price, wholesale_price, quantity, min_stock_level, warranty, notes)
WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1);

-- Link seed products to Honda category
UPDATE products SET category_id = (SELECT id FROM categories WHERE name = 'Honda' LIMIT 1)
WHERE brand = 'Honda' AND category_id IS NULL;

UPDATE products SET category_id = (SELECT id FROM categories WHERE name = 'Universal Parts' LIMIT 1)
WHERE brand IN ('NGK', 'Castrol') AND category_id IS NULL;

-- ============================================================
-- updated_at trigger for products
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_settings_updated_at ON settings;
CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();