import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Copy, KeyRound, Power, Printer, QrCode, Users } from 'lucide-react';
import { api } from './api';
import { useToast } from './ui/Toast';
import Modal from './ui/Modal';
import Badge from './ui/Badge';
import QrSheet from './QrSheet';

const VENUE_APP = import.meta.env.VITE_VENUE_APP_URL || 'http://localhost:5173';
const btn = 'rounded-xl px-3.5 py-2 text-sm font-bold transition disabled:opacity-50';
const ghost = btn + ' border border-line bg-card hover:border-accent';
const solid = btn + ' bg-accent text-on-accent hover:bg-accent-dark';

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

// shows a branch's staff login ONCE, right after it is created or reset
function Credentials({ creds, onClose }) {
  const toast = useToast();
  const url = `${VENUE_APP}/staff/login`;
  const message = `Your ATTEND staff login is ready.\nOpen: ${url}\nUsername: ${creds.username}\nPassword: ${creds.password}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      toast('Login details copied');
    } catch {
      toast('Could not copy. Select the text and copy it by hand.', 'bad');
    }
  }
  return (
    <Modal onClose={onClose}>
      <h2 className="text-2xl font-extrabold tracking-tight">Staff login ready</h2>
      <p className="mt-1 text-sm text-muted">
        {creds.venue} · {creds.branch}. Give this to the branch. The password is shown only now, so copy it before you close this.
      </p>
      <dl className="mt-5 grid gap-3 rounded-2xl bg-bg p-4 text-sm">
        {[['Open', url], ['Username', creds.username], ['Password', creds.password]].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3">
            <dt className="text-muted">{k}</dt>
            <dd className="break-all font-mono font-bold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={copy} className={ghost + ' inline-flex items-center gap-2'}>
          <Copy size={16} /> Copy login details
        </button>
        <button onClick={onClose} className={solid}>
          Done
        </button>
      </div>
    </Modal>
  );
}

export default function VenueDetail({ venue, adminKey, onBack, onLocked, reload }) {
  const toast = useToast();
  const [branches, setBranches] = useState(null);
  const [staff, setStaff] = useState({});
  const [error, setError] = useState('');
  const [branchForm, setBranchForm] = useState({ branchName: '', address: '' });
  const [tableText, setTableText] = useState({});
  const [busy, setBusy] = useState('');
  const [sheet, setSheet] = useState(null);
  const [creds, setCreds] = useState(null);

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
      const [b, s] = await Promise.all([call(`/admin/venues/${venue.id}/branches`), call(`/admin/venues/${venue.id}/staff`)]);
      setBranches(b);
      setStaff(Object.fromEntries(s.map((x) => [x.branchId, x])));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [call, venue.id]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    await load();
    reload();
  };

  async function guarded(key, fn) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast(e.message, 'bad');
    } finally {
      setBusy('');
    }
  }

  const addBranch = (e) => {
    e.preventDefault();
    guarded('branch', async () => {
      await call(`/admin/venues/${venue.id}/branches`, { method: 'POST', body: branchForm });
      setBranchForm({ branchName: '', address: '' });
      toast('Branch added');
      await refresh();
    });
  };

  const addTables = (e, branch) => {
    e.preventDefault();
    const parsed = parseTables(tableText[branch.id] || '');
    if (parsed.error) return toast(parsed.error, 'bad');
    guarded(branch.id, async () => {
      const res = await call(`/admin/branches/${branch.id}/tables`, { method: 'POST', body: { tableNumbers: parsed.numbers } });
      setTableText({ ...tableText, [branch.id]: '' });
      const skipped = res.skipped.length ? ` · ${res.skipped.length} already existed (${res.skipped.join(', ')})` : '';
      toast(`${res.created.length} table${res.created.length === 1 ? '' : 's'} created${skipped}`, res.created.length ? 'ok' : 'bad');
      if (res.created.length) setSheet({ venue: res.venue, branch: res.branch, items: res.created });
      await refresh();
    });
  };

  const toggleTable = (t) =>
    guarded(t.id, async () => {
      await call(`/admin/tables/${t.id}`, { method: 'PATCH', body: { isActive: !t.isActive } });
      toast(t.isActive ? `Table ${t.tableNumber} disabled. Its QR stops working.` : `Table ${t.tableNumber} enabled`);
      await refresh();
    });

  const newQr = (t, branch) => {
    if (!window.confirm(`Create a new QR for table ${t.tableNumber}? The QR already printed for it will stop working.`)) return;
    guarded(t.id, async () => {
      const res = await call(`/admin/tables/${t.id}/qr`, { method: 'POST' });
      setSheet({ venue: venue.name, branch: branch.branchName, items: [{ tableNumber: res.tableNumber, qr: res.qr }] });
    });
  };

  const printSheet = (branch) => {
    const active = branch.tables.filter((t) => t.isActive).length;
    if (active === 0) return toast('This branch has no active tables.', 'bad');
    const ok = window.confirm(`Create NEW QR codes for all ${active} active tables of ${branch.branchName}?\n\nEvery QR already printed for these tables will stop working, so only do this when you are about to print and replace them.`);
    if (!ok) return;
    guarded(branch.id, async () => {
      const res = await call(`/admin/branches/${branch.id}/qr-sheet`, { method: 'POST' });
      setSheet({ venue: res.venue, branch: res.branch, items: res.items, note: 'all active tables' });
    });
  };

  const createStaff = (branch) =>
    guarded('s' + branch.id, async () => {
      setCreds(await call(`/admin/branches/${branch.id}/staff`, { method: 'POST' }));
      await refresh();
    });

  const resetStaff = (branch) => {
    if (!window.confirm(`Create a new password for ${branch.branchName}? The current password stops working immediately.`)) return;
    guarded('s' + branch.id, async () => {
      setCreds(await call(`/admin/branches/${branch.id}/staff/reset`, { method: 'POST' }));
      await refresh();
    });
  };

  const toggleStaff = (branch, isActive) =>
    guarded('s' + branch.id, async () => {
      await call(`/admin/branches/${branch.id}/staff`, { method: 'PATCH', body: { isActive } });
      toast(isActive ? 'Staff login enabled' : 'Staff login disabled. Nobody can sign in with it.');
      await refresh();
    });

  const activeTotal = branches ? branches.reduce((n, b) => n + b.tables.filter((t) => t.isActive).length, 0) : 0;
  const limit = venue.usage.includedTables;

  return (
    <div className="rise">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink">
        <ArrowLeft size={16} /> All venues
      </button>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{venue.name}</h1>
          <p className="mt-1 text-muted">
            {venue.planLabel} · {venue.email}
          </p>
        </div>
        {branches && (
          <div className="text-right">
            <p className={'text-3xl font-extrabold tracking-tight ' + (activeTotal > limit ? 'text-danger' : '')}>
              {activeTotal} / {limit}
            </p>
            <p className="text-xs text-muted">active tables included in the plan</p>
          </div>
        )}
      </div>

      {error && <p className="mt-4 rounded-2xl bg-danger-soft p-3 font-bold text-danger">{error}</p>}
      {!branches && !error && <p className="mt-8 text-muted">Loading…</p>}

      {branches && (
        <form onSubmit={addBranch} className="mt-6 rounded-3xl border border-line bg-card p-5">
          <h2 className="font-extrabold">Add a branch</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              placeholder="Branch name, e.g. Park Street"
              value={branchForm.branchName}
              onChange={(e) => setBranchForm({ ...branchForm, branchName: e.target.value })}
              required
              className="h-11 min-w-48 flex-1 rounded-xl border border-line bg-bg px-4 text-sm outline-none focus:border-accent"
            />
            <input
              placeholder="Address"
              value={branchForm.address}
              onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
              required
              className="h-11 min-w-48 flex-[2] rounded-xl border border-line bg-bg px-4 text-sm outline-none focus:border-accent"
            />
            <button disabled={busy === 'branch'} className={solid}>
              Add branch
            </button>
          </div>
        </form>
      )}

      {branches?.map((b) => {
        const s = staff[b.id];
        const sBusy = busy === 's' + b.id;
        return (
          <section key={b.id} className="mt-5 rounded-3xl border border-line bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">{b.branchName}</h2>
                <p className="text-sm text-muted">
                  {b.address} · {b.tables.filter((t) => t.isActive).length} active of {b.tables.length} tables
                </p>
              </div>
              <button className={ghost + ' inline-flex items-center gap-2'} disabled={busy === b.id} onClick={() => printSheet(b)}>
                <Printer size={16} /> Print QR sheet
              </button>
            </div>

            {/* the ONE shared staff login of this branch */}
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-bg p-4">
              <Users size={20} className="text-accent" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold">Staff login</p>
                {s?.username ? (
                  <p className="text-sm text-muted">
                    <span className="font-mono font-bold text-ink">{s.username}</span> ·{' '}
                    {s.lastLoginAt ? `last signed in ${new Date(s.lastLoginAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : 'never signed in'}
                  </p>
                ) : (
                  <p className="text-sm text-muted">No login yet. One shared login serves the whole branch.</p>
                )}
              </div>
              {s?.username ? (
                <>
                  <Badge tone={s.isActive ? 'ok' : 'danger'}>{s.isActive ? 'Enabled' : 'Disabled'}</Badge>
                  <button className={ghost + ' inline-flex items-center gap-2'} disabled={sBusy} onClick={() => resetStaff(b)}>
                    <KeyRound size={15} /> Reset password
                  </button>
                  <button className={ghost + ' inline-flex items-center gap-2'} disabled={sBusy} onClick={() => toggleStaff(b, !s.isActive)}>
                    <Power size={15} /> {s.isActive ? 'Disable' : 'Enable'}
                  </button>
                </>
              ) : (
                <button className={solid} disabled={sBusy} onClick={() => createStaff(b)}>
                  Create staff login
                </button>
              )}
            </div>

            {b.tables.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {b.tables.map((t) => (
                  <div key={t.id} className={'rounded-2xl border p-3.5 ' + (t.isActive ? 'border-line' : 'border-line bg-bg')}>
                    <p className={'text-2xl font-extrabold tracking-tight ' + (t.isActive ? '' : 'text-muted line-through')}>{t.tableNumber}</p>
                    <p className={'text-xs font-bold ' + (t.isActive ? 'text-ok' : 'text-danger')}>{t.isActive ? 'Active' : 'Disabled'}</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <button className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold hover:border-accent" disabled={busy === t.id} onClick={() => newQr(t, b)}>
                        <QrCode size={13} /> New QR
                      </button>
                      <button className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold hover:border-accent" disabled={busy === t.id} onClick={() => toggleTable(t)}>
                        {t.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={(e) => addTables(e, b)} className="mt-4">
              <div className="flex flex-wrap gap-2">
                <input
                  placeholder="Table numbers"
                  aria-label={`Table numbers for ${b.branchName}`}
                  value={tableText[b.id] || ''}
                  onChange={(e) => setTableText({ ...tableText, [b.id]: e.target.value })}
                  className="h-11 min-w-48 flex-1 rounded-xl border border-line bg-bg px-4 text-sm outline-none focus:border-accent"
                />
                <button disabled={busy === b.id} className={solid}>
                  {busy === b.id ? 'Working…' : 'Add tables + QR codes'}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-muted">Examples: 1-20 · A1, A2, B1 · T01-T12. The QR codes appear right after, ready to print.</p>
            </form>
          </section>
        );
      })}

      {branches && branches.length === 0 && <p className="mt-8 text-center text-muted">No branches yet. Add the first one above.</p>}

      {creds && <Credentials creds={creds} onClose={() => setCreds(null)} />}
      {sheet && <QrSheet sheet={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}