import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type { Settings, Invoice, InvoiceItem } from '@/types';
import { formatCurrency } from './format';

export type PaperWidth = '58mm' | '80mm';
export type ReceiptMode = 'short' | 'detailed';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getBusinessInfo(settings: Settings | null) {
  return {
    name: settings?.business_name ?? 'Multan Auto Spare Parts',
    subtitle: 'AUTO SPARE PARTS',
    address: settings?.business_address ?? 'GT Road Sanawan',
    phone: settings?.business_phone ?? '03473502993',
    email: settings?.business_email ?? '',
    logoUrl: settings?.logo_url ?? '',
    terms: settings?.terms_conditions ?? 'Goods once sold are not returnable without original invoice.',
    symbol: settings?.currency_symbol ?? 'Rs.',
    printerWidth: (settings?.printer_width ?? '80mm') as PaperWidth,
    receiptMode: (settings?.receipt_mode ?? 'detailed') as ReceiptMode,
    autoPrint: settings?.auto_print ?? false,
    qrEnabled: settings?.qr_enabled ?? true,
  };
}

function getStatusInfo(status: string) {
  if (status === 'paid') return { label: 'PAID IN FULL' };
  if (status === 'partial') return { label: 'PARTIALLY PAID' };
  return { label: 'PAYMENT DUE' };
}

interface DimConfig {
  mm: number;
  printableMm: number;
  padMm: number;
  titleFont: number;
  subtitleFont: number;
  infoFont: number;
  itemFont: number;
  skuFont: number;
  priceFont: number;
  totalFont: number;
  grandTotalFont: number;
  statusFont: number;
  footerFont: number;
}

function getDimensions(width: PaperWidth): DimConfig {
  if (width === '58mm') {
    return {
      mm: 58, printableMm: 48, padMm: 3,
      titleFont: 14, subtitleFont: 10, infoFont: 11,
      itemFont: 11, skuFont: 9, priceFont: 11,
      totalFont: 11, grandTotalFont: 13, statusFont: 12, footerFont: 9,
    };
  }
  return {
    mm: 80, printableMm: 72, padMm: 4,
    titleFont: 17, subtitleFont: 12, infoFont: 12,
    itemFont: 12, skuFont: 10, priceFont: 12,
    totalFont: 12, grandTotalFont: 15, statusFont: 13, footerFont: 10,
  };
}

/* ============ QR CODE (kept for non-print use) ============ */

function generateQRDataUrlSync(invoice: Invoice): string {
  try {
    const qrText = [
      `Invoice: ${invoice.invoice_number}`,
      `Customer: ${invoice.customer_name ?? 'Walk-in'}`,
      `Total: ${invoice.total}`,
      `Paid: ${invoice.paid_amount}`,
      `Balance: ${invoice.remaining_balance}`,
      `Date: ${invoice.invoice_date}`,
    ].join('\n');
    return QRCode.toDataURL(qrText, { width: 150, margin: 1, errorCorrectionLevel: 'M' });
  } catch {
    return '';
  }
}

/* ============ THERMAL RECEIPT HTML ============ */

function buildThermalHTML(
  invoice: Invoice,
  items: InvoiceItem[],
  settings: Settings | null,
  mode: ReceiptMode,
  width: PaperWidth
): string {
  const biz = getBusinessInfo(settings);
  const status = getStatusInfo(invoice.payment_status);
  const dim = getDimensions(width);
  const invDate = new Date(invoice.invoice_date);
  const dateStr = invDate.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = invDate.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

  // Build product rows
  let itemsHTML = '';
  if (mode === 'short') {
    itemsHTML = items.map((it) => {
      const name = escapeHtml(it.product_name ?? '');
      return `<div class="item">
        <div class="item-name">${name}</div>
        <div class="item-prices">
          <span class="qty-price">${it.quantity} x ${formatCurrency(Number(it.unit_price), biz.symbol)}</span>
          <span class="item-total">${formatCurrency(Number(it.total), biz.symbol)}</span>
        </div>
      </div>`;
    }).join('\n');
  } else {
    itemsHTML = items.map((it) => {
      const name = escapeHtml(it.product_name ?? '');
      const part = it.part_number ? escapeHtml(it.part_number) : '-';
      const disc = Number(it.discount) > 0 ? ` (-${formatCurrency(Number(it.discount), biz.symbol)})` : '';
      return `<div class="item">
        <div class="item-name">${name}</div>
        <div class="item-sku">SKU: ${part}</div>
        <div class="item-prices">
          <span class="qty-price">${it.quantity} x ${formatCurrency(Number(it.unit_price), biz.symbol)}${disc}</span>
          <span class="item-total">${formatCurrency(Number(it.total), biz.symbol)}</span>
        </div>
      </div>`;
    }).join('\n');
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(invoice.invoice_number)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100%;
    max-width: 100%;
  }
  body {
    background: #f0f0f0;
    font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .receipt {
    width: 100%;
    max-width: ${dim.printableMm}mm;
    margin: 0 auto;
    background: #fff;
    padding: ${dim.padMm}mm;
    color: #000;
    font-size: ${dim.infoFont}px;
    line-height: 1.5;
    overflow: hidden;
    box-sizing: border-box;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .divider {
    border-top: 1px dashed #000;
    margin: 6px 0;
    width: 100%;
    height: 0;
  }
  .biz-name {
    font-size: ${dim.titleFont}px;
    font-weight: bold;
    text-align: center;
    text-transform: uppercase;
    line-height: 1.25;
    margin-bottom: 2px;
    width: 100%;
    max-width: 100%;
    overflow-wrap: break-word;
    word-break: normal;
  }
  .biz-sub {
    font-size: ${dim.subtitleFont}px;
    font-weight: bold;
    text-align: center;
    letter-spacing: 1px;
    margin-bottom: 1px;
  }
  .biz-info {
    font-size: ${dim.subtitleFont}px;
    text-align: center;
    line-height: 1.4;
    margin-bottom: 1px;
  }
  .info-line {
    font-size: ${dim.infoFont}px;
    padding: 1px 0;
    width: 100%;
  }
  .info-line .label { font-weight: bold; }
  .item { padding: 3px 0; width: 100%; }
  .item-name {
    font-size: ${dim.itemFont}px;
    font-weight: bold;
    line-height: 1.3;
    overflow-wrap: break-word;
    word-break: normal;
    width: 100%;
  }
  .item-sku {
    font-size: ${dim.skuFont}px;
    color: #444;
    margin-bottom: 1px;
    width: 100%;
  }
  .item-prices {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 6px;
    font-size: ${dim.priceFont}px;
  }
  .qty-price { flex: 1; min-width: 0; }
  .item-total {
    font-weight: bold;
    text-align: right;
    white-space: nowrap;
  }
  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 8px;
    font-size: ${dim.totalFont}px;
    padding: 1px 0;
  }
  .total-row .val {
    text-align: right;
    white-space: nowrap;
  }
  .grand-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 8px;
    font-size: ${dim.grandTotalFont}px;
    font-weight: bold;
    padding: 4px 0;
  }
  .grand-total .val {
    text-align: right;
    white-space: nowrap;
  }
  .balance-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 8px;
    font-size: ${dim.totalFont + 1}px;
    font-weight: bold;
    padding: 2px 0;
  }
  .balance-row .val {
    text-align: right;
    white-space: nowrap;
  }
  .payment-line {
    font-size: ${dim.infoFont}px;
    padding: 1px 0;
    width: 100%;
  }
  .status-line {
    font-size: ${dim.statusFont}px;
    font-weight: bold;
    text-align: center;
    padding: 4px 0;
    width: 100%;
  }
  .footer {
    font-size: ${dim.footerFont}px;
    text-align: center;
    line-height: 1.5;
    width: 100%;
  }
  .footer .terms { margin-bottom: 4px; }
  .footer .thanks {
    font-weight: bold;
    font-size: ${dim.infoFont}px;
    margin: 2px 0;
  }
  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff;
      width: 100%;
      max-width: 100%;
    }
    .receipt {
      width: 100%;
      max-width: 100%;
      margin: 0;
      padding: ${dim.padMm}mm;
      box-shadow: none;
    }
    @page {
      size: ${width} auto;
      margin: 0;
    }
  }
</style>
</head>
<body>
<div class="receipt">
  <div class="biz-name">${escapeHtml(biz.name)}</div>
  ${mode === 'detailed' ? `<div class="biz-sub">${escapeHtml(biz.subtitle)}</div>` : ''}
  ${mode === 'detailed' ? `<div class="biz-info">${escapeHtml(biz.address)}</div>` : ''}
  <div class="biz-info">Phone: ${escapeHtml(biz.phone)}</div>
  <div class="divider"></div>
  <div class="info-line"><span class="label">Invoice No:</span> ${escapeHtml(invoice.invoice_number)}</div>
  <div class="info-line"><span class="label">Date:</span> ${dateStr}</div>
  <div class="info-line"><span class="label">Time:</span> ${timeStr}</div>
  <div class="info-line"><span class="label">Customer:</span> ${escapeHtml(invoice.customer_name ?? 'Walk-in Customer')}</div>
  ${invoice.customer_phone ? `<div class="info-line"><span class="label">Customer Phone:</span> ${escapeHtml(invoice.customer_phone)}</div>` : ''}
  <div class="divider"></div>
  ${itemsHTML}
  <div class="divider"></div>
  <div class="total-row"><span>Subtotal</span><span class="val">${formatCurrency(Number(invoice.subtotal), biz.symbol)}</span></div>
  ${Number(invoice.discount) > 0 ? `<div class="total-row"><span>Discount</span><span class="val">-${formatCurrency(Number(invoice.discount), biz.symbol)}</span></div>` : ''}
  ${Number(invoice.tax) > 0 ? `<div class="total-row"><span>Tax</span><span class="val">${formatCurrency(Number(invoice.tax), biz.symbol)}</span></div>` : ''}
  <div class="divider"></div>
  <div class="grand-total"><span>TOTAL</span><span class="val">${formatCurrency(Number(invoice.total), biz.symbol)}</span></div>
  <div class="divider"></div>
  <div class="total-row"><span>Paid</span><span class="val">${formatCurrency(Number(invoice.paid_amount), biz.symbol)}</span></div>
  ${Number(invoice.remaining_balance) > 0 ? `<div class="balance-row"><span>BALANCE</span><span class="val">${formatCurrency(Number(invoice.remaining_balance), biz.symbol)}</span></div>` : ''}
  ${mode === 'detailed' ? `<div class="payment-line"><span class="label">Payment:</span> <span style="text-transform:capitalize">${escapeHtml(invoice.payment_method)}</span></div>` : ''}
  <div class="status-line">${status.label}</div>
  <div class="divider"></div>
  <div class="footer">
    ${mode === 'detailed' ? `<div class="terms">${escapeHtml(biz.terms)}</div>` : ''}
    <div class="thanks">Thank you for your business!</div>
    <div>Contact: ${escapeHtml(biz.phone)}</div>
  </div>
</div>
</body>
</html>`;
}

/* ============ PRINT ============ */

export function printReceipt(
  invoice: Invoice,
  items: InvoiceItem[],
  settings: Settings | null,
  mode?: ReceiptMode,
  width?: PaperWidth
) {
  const biz = getBusinessInfo(settings);
  const rMode = mode ?? biz.receiptMode;
  const rWidth = width ?? biz.printerWidth;
  const html = buildThermalHTML(invoice, items, settings, rMode, rWidth);
  const win = window.open('', '_blank', `width=${rWidth === '58mm' ? 240 : 340},height=600`);
  if (!win) {
    alert('Please allow popups to print the receipt.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 500);
}

export function testPrint(settings: Settings | null) {
  const biz = getBusinessInfo(settings);
  const rWidth = biz.printerWidth;
  const dim = getDimensions(rWidth);
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Test Print</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { margin: 0 !important; padding: 0 !important; width: 100%; max-width: 100%; }
  body { background: #f0f0f0; font-family: Arial, Helvetica, sans-serif; }
  .receipt { width: 100%; max-width: ${dim.printableMm}mm; margin: 0 auto; background: #fff; padding: ${dim.padMm}mm; color: #000; font-size: ${dim.infoFont}px; line-height: 1.5; overflow: hidden; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; width: 100%; height: 0; }
  @media print {
    html, body { margin: 0 !important; padding: 0 !important; background: #fff; }
    .receipt { width: 100%; max-width: 100%; margin: 0; box-shadow: none; }
    @page { size: ${rWidth} auto; margin: 0; }
  }
</style></head><body>
<div class="receipt">
  <div class="center bold" style="font-size:${dim.titleFont}px;overflow-wrap:break-word">${escapeHtml(biz.name)}</div>
  <div class="center" style="font-size:${dim.subtitleFont}px">${escapeHtml(biz.subtitle)}</div>
  <div class="center" style="font-size:${dim.subtitleFont}px">${escapeHtml(biz.address)}</div>
  <div class="center" style="font-size:${dim.subtitleFont}px">Phone: ${escapeHtml(biz.phone)}</div>
  <div class="divider"></div>
  <div class="center bold" style="font-size:${dim.statusFont}px">TEST PRINT</div>
  <div class="center">Printer: ${rWidth}</div>
  <div class="center">Mode: ${biz.receiptMode}</div>
  <div class="center">Date: ${new Date().toLocaleString()}</div>
  <div class="divider"></div>
  <div class="center">Sample Item 1 - Qty 1 - Rs. 500</div>
  <div class="center">Sample Item 2 - Qty 2 - Rs. 1,000</div>
  <div class="divider"></div>
  <div class="center bold" style="font-size:${dim.grandTotalFont}px">Total: Rs. 1,500</div>
  <div class="divider"></div>
  <div class="center bold">Printer is working correctly!</div>
  <div class="center">Thank you for your business!</div>
</div>
</body></html>`;
  const win = window.open('', '_blank', `width=${rWidth === '58mm' ? 240 : 340},height=600`);
  if (!win) {
    alert('Please allow popups to print.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 500);
}

/* ============ THERMAL PDF ============ */

function buildThermalPDF(
  invoice: Invoice,
  items: InvoiceItem[],
  settings: Settings | null,
  mode: ReceiptMode,
  width: PaperWidth
): jsPDF {
  const biz = getBusinessInfo(settings);
  const status = getStatusInfo(invoice.payment_status);
  const pageW = width === '58mm' ? 58 : 80;
  const margin = width === '58mm' ? 4 : 4;
  const contentW = pageW - margin * 2;
  let y = margin + 4;

  const doc = new jsPDF('p', 'mm', [pageW, 200]);
  const invDate = new Date(invoice.invoice_date);
  const dateStr = invDate.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = invDate.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

  const fontSize = width === '58mm' ? 9 : 10;
  const titleSize = width === '58mm' ? 13 : 15;
  const subtitleSize = width === '58mm' ? 8 : 9;
  const infoSize = width === '58mm' ? 9 : 10;
  const itemSize = width === '58mm' ? 9 : 10;
  const skuSize = width === '58mm' ? 7 : 8;
  const priceSize = width === '58mm' ? 9 : 10;
  const totalSize = width === '58mm' ? 9 : 10;
  const grandTotalSize = width === '58mm' ? 11 : 13;
  const statusSize = width === '58mm' ? 10 : 11;
  const footerSize = width === '58mm' ? 7 : 8;

  const lineH = (fs: number) => fs * 0.4 + 0.8;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(titleSize);
  const nameLines = doc.splitTextToSize(biz.name.toUpperCase(), contentW);
  doc.text(nameLines, pageW / 2, y, { align: 'center' });
  y += nameLines.length * lineH(titleSize);

  if (mode === 'detailed') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(subtitleSize);
    doc.text(biz.subtitle, pageW / 2, y, { align: 'center' });
    y += lineH(subtitleSize);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(subtitleSize);
    doc.text(biz.address, pageW / 2, y, { align: 'center' });
    y += lineH(subtitleSize);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(subtitleSize);
  doc.text(`Phone: ${biz.phone}`, pageW / 2, y, { align: 'center' });
  y += lineH(subtitleSize) + 1;

  // Separator
  drawSeparator(doc, margin, y, contentW);
  y += 2.5;

  // Invoice info - each field on its own line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(infoSize);
  doc.text(`Invoice No: ${invoice.invoice_number}`, margin, y);
  y += lineH(infoSize);
  doc.text(`Date: ${dateStr}`, margin, y);
  y += lineH(infoSize);
  doc.text(`Time: ${timeStr}`, margin, y);
  y += lineH(infoSize);
  doc.text(`Customer: ${invoice.customer_name ?? 'Walk-in Customer'}`, margin, y);
  y += lineH(infoSize);
  if (invoice.customer_phone) {
    doc.text(`Customer Phone: ${invoice.customer_phone}`, margin, y);
    y += lineH(infoSize);
  }

  y += 1;
  drawSeparator(doc, margin, y, contentW);
  y += 2.5;

  // Items
  for (const it of items) {
    const name = it.product_name ?? '';
    const itNameLines = doc.splitTextToSize(name, contentW);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(itemSize);
    doc.text(itNameLines, margin, y);
    y += itNameLines.length * lineH(itemSize);

    if (mode === 'detailed' && it.part_number) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(skuSize);
      doc.text(`SKU: ${it.part_number}`, margin, y);
      y += lineH(skuSize);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(priceSize);
    const disc = Number(it.discount) > 0 ? ` (-${formatCurrency(Number(it.discount), biz.symbol)})` : '';
    const leftText = `${it.quantity} x ${formatCurrency(Number(it.unit_price), biz.symbol)}${disc}`;
    const rightText = formatCurrency(Number(it.total), biz.symbol);
    doc.text(leftText, margin, y);
    doc.text(rightText, pageW - margin, y, { align: 'right' });
    y += lineH(priceSize) + 0.5;
  }

  y += 1;
  drawSeparator(doc, margin, y, contentW);
  y += 2.5;

  // Totals
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(totalSize);
  doc.text('Subtotal', margin, y);
  doc.text(formatCurrency(Number(invoice.subtotal), biz.symbol), pageW - margin, y, { align: 'right' });
  y += lineH(totalSize);

  if (Number(invoice.discount) > 0) {
    doc.text('Discount', margin, y);
    doc.text(`-${formatCurrency(Number(invoice.discount), biz.symbol)}`, pageW - margin, y, { align: 'right' });
    y += lineH(totalSize);
  }
  if (Number(invoice.tax) > 0) {
    doc.text('Tax', margin, y);
    doc.text(formatCurrency(Number(invoice.tax), biz.symbol), pageW - margin, y, { align: 'right' });
    y += lineH(totalSize);
  }

  // Separator before grand total
  drawSeparator(doc, margin, y, contentW);
  y += 2.5;

  // Grand total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(grandTotalSize);
  doc.text('TOTAL', margin, y);
  doc.text(formatCurrency(Number(invoice.total), biz.symbol), pageW - margin, y, { align: 'right' });
  y += lineH(grandTotalSize) + 1;

  // Separator after grand total
  drawSeparator(doc, margin, y, contentW);
  y += 2.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(totalSize);
  doc.text('Paid', margin, y);
  doc.text(formatCurrency(Number(invoice.paid_amount), biz.symbol), pageW - margin, y, { align: 'right' });
  y += lineH(totalSize);

  if (Number(invoice.remaining_balance) > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(totalSize + 1);
    doc.text('BALANCE', margin, y);
    doc.text(formatCurrency(Number(invoice.remaining_balance), biz.symbol), pageW - margin, y, { align: 'right' });
    y += lineH(totalSize + 1);
  }

  if (mode === 'detailed') {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(infoSize);
    doc.text(`Payment: ${invoice.payment_method}`, margin, y);
    y += lineH(infoSize) + 1;
  }

  // Status
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(statusSize);
  doc.text(status.label, pageW / 2, y, { align: 'center' });
  y += lineH(statusSize) + 1;

  // Separator
  drawSeparator(doc, margin, y, contentW);
  y += 2.5;

  // Footer
  if (mode === 'detailed') {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(footerSize);
    const termsLines = doc.splitTextToSize(biz.terms, contentW);
    doc.text(termsLines, pageW / 2, y, { align: 'center' });
    y += termsLines.length * lineH(footerSize) + 1;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(infoSize);
  doc.text('Thank you for your business!', pageW / 2, y, { align: 'center' });
  y += lineH(infoSize);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(footerSize);
  doc.text(`Contact: ${biz.phone}`, pageW / 2, y, { align: 'center' });

  return doc;
}

function drawSeparator(doc: jsPDF, x: number, y: number, w: number) {
  doc.setLineDashPattern([0.5, 0.5], 0);
  doc.setLineWidth(0.2);
  doc.line(x, y, x + w, y);
  doc.setLineDashPattern([], 0);
}

export async function downloadThermalPDF(
  invoice: Invoice,
  items: InvoiceItem[],
  settings: Settings | null,
  mode?: ReceiptMode,
  width?: PaperWidth
) {
  const biz = getBusinessInfo(settings);
  const rMode = mode ?? biz.receiptMode;
  const rWidth = width ?? biz.printerWidth;
  const doc = buildThermalPDF(invoice, items, settings, rMode, rWidth);
  doc.save(`${invoice.invoice_number}.pdf`);
}

/* ============ WHATSAPP PDF SHARING ============ */

export async function sharePDFOnWhatsApp(
  invoice: Invoice,
  items: InvoiceItem[],
  settings: Settings | null
) {
  const biz = getBusinessInfo(settings);

  const doc = buildThermalPDF(invoice, items, settings, biz.receiptMode, biz.printerWidth);
  const pdfBlob = doc.output('blob');

  if (!pdfBlob) {
    alert('Failed to generate PDF. Please try Download PDF instead.');
    return;
  }

  const file = new File([pdfBlob], `${invoice.invoice_number}.pdf`, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `${biz.name} - ${invoice.invoice_number}`,
      });
      return;
    } catch {
      // user cancelled - fall through to download
    }
  }

  // Desktop fallback: download PDF
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${invoice.invoice_number}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);

  alert('PDF downloaded. Please attach it manually in WhatsApp Web.');
}

/* ============ PREVIEW HTML ============ */

export function buildPreviewHTML(
  invoice: Invoice,
  items: InvoiceItem[],
  settings: Settings | null,
  mode?: ReceiptMode,
  width?: PaperWidth
): string {
  const biz = getBusinessInfo(settings);
  return buildThermalHTML(invoice, items, settings, mode ?? biz.receiptMode, width ?? biz.printerWidth);
}
