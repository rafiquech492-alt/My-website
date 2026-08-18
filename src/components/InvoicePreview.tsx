import { useState, useEffect, useRef } from 'react';
import { Printer, FileDown, MessageCircle, X } from 'lucide-react';
import { printReceipt, downloadThermalPDF, sharePDFOnWhatsApp, buildPreviewHTML, getBusinessInfo } from '@/lib/receipt';
import type { Settings, Invoice, InvoiceItem } from '@/types';

interface InvoicePreviewProps {
  invoice: Invoice;
  items: InvoiceItem[];
  settings: Settings | null;
  onClose: () => void;
}

export function InvoicePreview({ invoice, items, settings, onClose }: InvoicePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const biz = getBusinessInfo(settings);
  const [previewMode, setPreviewMode] = useState<'58mm' | '80mm'>(biz.printerWidth === '58mm' ? '58mm' : '80mm');

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(buildPreviewHTML(invoice, items, settings, biz.receiptMode, previewMode));
    doc.close();
  }, [invoice, items, settings, previewMode, biz.receiptMode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-slate-800">Receipt Preview — {invoice.invoice_number}</h3>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => setPreviewMode('58mm')}
                className={`px-3 py-1 text-xs font-medium ${previewMode === '58mm' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600'}`}
              >
                58mm
              </button>
              <button
                onClick={() => setPreviewMode('80mm')}
                className={`px-3 py-1 text-xs font-medium ${previewMode === '80mm' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600'}`}
              >
                80mm
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Preview iframe */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 flex justify-center">
          <iframe
            ref={iframeRef}
            title="Receipt Preview"
            className="bg-white rounded-lg border border-slate-200 shadow-sm"
            style={{ width: previewMode === '58mm' ? '220px' : '320px', minHeight: '500px' }}
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 px-5 py-4 border-t border-slate-200 bg-white">
          <button
            onClick={() => printReceipt(invoice, items, settings, biz.receiptMode, previewMode)}
            className="btn-secondary flex-1 justify-center"
          >
            <Printer size={18} /> Print Receipt
          </button>
          <button
            onClick={() => downloadThermalPDF(invoice, items, settings, biz.receiptMode, previewMode)}
            className="btn-secondary flex-1 justify-center"
          >
            <FileDown size={18} /> Download PDF
          </button>
          <button
            onClick={() => sharePDFOnWhatsApp(invoice, items, settings)}
            className="btn-primary flex-1 justify-center"
          >
            <MessageCircle size={18} /> Share PDF on WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
