import { Download, Printer, X } from 'lucide-react';

// Shows QR codes in a print-ready layout. "Print" prints only the QR cards, not the rest of the page.
export default function QrSheet({ sheet, onClose }) {
  const one = sheet.items.length === 1 ? sheet.items[0] : null;
  return (
    <div className="sheet-back fixed inset-0 z-[60] overflow-auto bg-white text-black" role="dialog" aria-modal="true">
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white px-5 py-3">
        <div>
          <p className="font-extrabold">
            {sheet.items.length} QR code{sheet.items.length === 1 ? '' : 's'}
          </p>
          <p className="text-sm text-neutral-500">
            {sheet.venue} · {sheet.branch}
            {sheet.note ? ' · ' + sheet.note : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {one && (
            <a href={one.qr.imageDataUrl} download={`table-${one.tableNumber}.png`} className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-4 py-2 text-sm font-bold">
              <Download size={16} /> PNG
            </a>
          )}
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white">
            <Printer size={16} /> Print
          </button>
          <button onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-xl border border-neutral-300">
            <X size={18} />
          </button>
        </div>
      </div>
      <p className="no-print bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-800">Print or download these now. For security a QR cannot be shown again later, only replaced with a new one.</p>
      <section className="mx-auto grid max-w-4xl grid-cols-2 p-4 sm:grid-cols-3">
        {sheet.items.map((item) => (
          <figure key={item.tableNumber} className="m-0 break-inside-avoid border border-dashed border-neutral-400 px-2.5 py-4 text-center">
            <figcaption className="text-sm font-extrabold">{sheet.venue}</figcaption>
            <img src={item.qr.imageDataUrl} alt={`QR code for table ${item.tableNumber}`} className="mx-auto my-2 w-full max-w-[210px]" />
            <div className="text-3xl font-extrabold tracking-tight">Table {item.tableNumber}</div>
            <div className="text-xs text-neutral-600">Scan for assistance</div>
            <a href={item.qr.url} target="_blank" rel="noreferrer" className="no-print mt-1.5 block text-xs font-bold text-teal-700">
              Open link (test)
            </a>
          </figure>
        ))}
      </section>
    </div>
  );
}