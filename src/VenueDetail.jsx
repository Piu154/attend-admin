import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { useToast } from './ui/Toast';
import QrSheet from './QrSheet';

// "1-20" -> 1,2,3...20   "T01-T12" -> T01...T12   "A1, A2 B1" -> A1,A2,B1
function parseTables(text) {
  const out = [];
  for (const part of text.split(/[\s,;]+/).filter(Boolean)) {
    const m = part.match(/^(\D*?)(\d+)-(\D*?)(\d+)$/);
    if (m && (m[3] === '' || m[3] === m[1])) {
      const [, prefix, a, , b] = m;
      const from = Number(a);
      const to = Number(b);
      if (to < from || to - from > 199) return { error: `The range ${part} is too big. Use up to 200 tables at a time.` };
      const width = a.length > 1 && a.startsWith('0') ? a.length : 0;
      for (let n = from; n <= to; n++) out.push(prefix + String(n).padStart(width, '0'));
    } else {
      out.push(part);
    }
  }
  const numbers = [...new Set(out)];
  if (numbers.length === 0) return { error: 'Enter at least one table number.' };
  if (numbers.length > 200) return { error: 'Add up to 200 tables at a time.' };
  return { numbers };
}

export default function VenueDetail({ venue, adminKey, onBack, onLocked }) {
  const toast = useToast();
  const [branches, setBranches] = useState(null);
  const [error, setError] = useState('');
  const [branchForm, setBranchForm] = useState({ branchName: '', address: '' });
  const [tableText, setTableText] = useState({});
  const [busy, setBusy] = useState('');
  const [sheet, setSheet] = useState(null);

  const call = useCallback(
    async (path, options) => {
      try {
        return await api(path, { ...options, adminKey });
      } catch (e) {
        if (e.status === 401) onLocked();
        throw e;
      }
    },
    [adminKey, onLocked],
  );

  const load = useCallback(async () => {
    try {
      setBranches(await call(`/admin/venues/${venue.id}/branches`));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [call, venue.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function addBranch(e) {
    e.preventDefault();
    setBusy('branch');
    try {
      await call(`/admin/venues/${venue.id}/branches`, { method: 'POST', body: branchForm });
      setBranchForm({ branchName: '', address: '' });
      toast('Branch added');
      await load();
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      setBusy('');
    }
  }

  async function addTables(e, branch) {
    e.preventDefault();
    const parsed = parseTables(tableText[branch.id] || '');
    if (parsed.error) return toast(parsed.error, 'bad');
    setBusy(branch.id);
    try {
      const res = await call(`/admin/branches/${branch.id}/tables`, { method: 'POST', body: { tableNumbers: parsed.numbers } });
      setTableText({ ...tableText, [branch.id]: '' });
      const skipped = res.skipped.length ? ` · ${res.skipped.length} already existed (${res.skipped.join(', ')})` : '';
      toast(`${res.created.length} table${res.created.length === 1 ? '' : 's'} created${skipped}`, res.created.length ? 'ok' : 'bad');
      if (res.created.length) setSheet({ venue: res.venue, branch: res.branch, items: res.created });
      await load();
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      setBusy('');
    }
  }

  async function toggleTable(t) {
    try {
      await call(`/admin/tables/${t.id}`, { method: 'PATCH', body: { isActive: !t.isActive } });
      toast(t.isActive ? `Table ${t.tableNumber} disabled. Its QR stops working.` : `Table ${t.tableNumber} enabled`);
      await load();
    } catch (err) {
      toast(err.message, 'bad');
    }
  }

  async function newQr(t, branch) {
    if (!window.confirm(`Create a new QR for table ${t.tableNumber}? The QR already printed for it will stop working.`)) return;
    try {
      const res = await call(`/admin/tables/${t.id}/qr`, { method: 'POST' });
      setSheet({ venue: venue.name, branch: branch.branchName, items: [{ tableNumber: res.tableNumber, qr: res.qr }] });
    } catch (err) {
      toast(err.message, 'bad');
    }
  }

  async function printSheet(branch) {
    const active = branch.tables.filter((t) => t.isActive).length;
    if (active === 0) return toast('This branch has no active tables.', 'bad');
    const ok = window.confirm(
      `Create NEW QR codes for all ${active} active tables of ${branch.branchName}?\n\nEvery QR already printed for these tables will stop working, so only do this when you are about to print and replace them.`,
    );
    if (!ok) return;
    setBusy(branch.id);
    try {
      const res = await call(`/admin/branches/${branch.id}/qr-sheet`, { method: 'POST' });
      setSheet({ venue: res.venue, branch: res.branch, items: res.items, note: 'all active tables' });
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      setBusy('');
    }
  }

  const activeTotal = branches ? branches.reduce((n, b) => n + b.tables.filter((t) => t.isActive).length, 0) : 0;
  const limit = venue.usage.includedTables;

  return (
    <main className="wrap">
      <button className="back-link" onClick={onBack}>
        ← All venues
      </button>
      <div className="page-head">
        <div>
          <h1>{venue.name}</h1>
          <p className="muted">
            {venue.planLabel} · {venue.email}
          </p>
        </div>
        {branches && (
          <div className="bill">
            <strong className={activeTotal > limit ? 'due' : ''}>
              {activeTotal} / {limit}
            </strong>
            <span>active tables included in the plan</span>
          </div>
        )}
      </div>

      {error && <p className="err">{error}</p>}
      {!branches && !error && <p className="muted">Loading…</p>}

      {branches && (
        <form className="branch" onSubmit={addBranch}>
          <h3>Add a branch</h3>
          <div className="row-2">
            <input
              className="input"
              placeholder="Branch name, e.g. Park Street"
              value={branchForm.branchName}
              onChange={(e) => setBranchForm({ ...branchForm, branchName: e.target.value })}
              required
            />
            <input
              className="input"
              placeholder="Address"
              value={branchForm.address}
              onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
              required
            />
            <button className="btn" disabled={busy === 'branch'}>
              Add branch
            </button>
          </div>
        </form>
      )}

      {branches?.map((b) => (
        <section key={b.id} className="branch">
          <div className="branch-head">
            <div>
              <h3>{b.branchName}</h3>
              <p className="muted">
                {b.address} · {b.tables.filter((t) => t.isActive).length} active of {b.tables.length} tables
              </p>
            </div>
            <button className="btn soft sm" disabled={busy === b.id} onClick={() => printSheet(b)}>
              Print QR sheet
            </button>
          </div>

          {b.tables.length > 0 && (
            <div className="tiles">
              {b.tables.map((t) => (
                <div key={t.id} className={'tile' + (t.isActive ? '' : ' off')}>
                  <b>{t.tableNumber}</b>
                  <span>{t.isActive ? 'Active' : 'Disabled'}</span>
                  <div className="tile-actions">
                    <button className="btn ghost sm" onClick={() => newQr(t, b)}>
                      New QR
                    </button>
                    <button className="btn ghost sm" onClick={() => toggleTable(t)}>
                      {t.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={(e) => addTables(e, b)}>
            <div className="row-2">
              <input
                className="input"
                placeholder="Table numbers"
                value={tableText[b.id] || ''}
                onChange={(e) => setTableText({ ...tableText, [b.id]: e.target.value })}
                aria-label={`Table numbers for ${b.branchName}`}
              />
              <button className="btn" disabled={busy === b.id}>
                {busy === b.id ? 'Working…' : 'Add tables + QR codes'}
              </button>
            </div>
            <p className="hint">Examples: 1-20 · A1, A2, B1 · T01-T12. QR codes appear right after, ready to print.</p>
          </form>
        </section>
      ))}

      {branches && branches.length === 0 && <p className="muted">No branches yet. Add the first one above.</p>}

      {sheet && <QrSheet sheet={sheet} onClose={() => setSheet(null)} />}
    </main>
  );
}