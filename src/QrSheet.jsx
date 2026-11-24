// Shows QR codes in a print-ready layout. "Print" prints only the QR cards, not the rest of the page.
export default function QrSheet({ sheet, onClose }) {
  const one = sheet.items.length === 1 ? sheet.items[0] : null;
  return (
    <div className="sheet-back" role="dialog" aria-modal="true">
      <div className="sheet-bar no-print">
        <div>
          <b>
            {sheet.items.length} QR code{sheet.items.length === 1 ? '' : 's'}
          </b>
          <div className="muted">
            {sheet.venue} · {sheet.branch}
            {sheet.note ? ' · ' + sheet.note : ''}
          </div>
        </div>
        <div className="row-2">
          {one && (
            <a className="btn ghost" href={one.qr.imageDataUrl} download={`table-${one.tableNumber}.png`}>
              Download PNG
            </a>
          )}
          <button className="btn" onClick={() => window.print()}>
            Print
          </button>
          <button className="btn ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <div className="sheet-warn no-print">
        Print or download these now. For security a QR cannot be shown again later, only replaced with a new one.
      </div>
      <section className="sheet">
        {sheet.items.map((item) => (
          <figure key={item.tableNumber} className="qr-card">
            <figcaption className="qr-venue">{sheet.venue}</figcaption>
            <img src={item.qr.imageDataUrl} alt={`QR code for table ${item.tableNumber}`} />
            <div className="qr-num">Table {item.tableNumber}</div>
            <div className="qr-hint">Scan for assistance</div>
            <a className="qr-link no-print" href={item.qr.url} target="_blank" rel="noreferrer">
              Open link (test)
            </a>
          </figure>
        ))}
      </section>
    </div>
  );
}