import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { api } from './api';
import { useToast } from './ui/Toast';
import Badge from './ui/Badge';
import NewVenue from './NewVenue';
import { PAY, PLANS, STATUS, niceDate, rupees } from './lib';

function Meter({ label, used, limit }) {
  const over = used > limit;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs font-bold">
        <span className="text-muted">{label}</span>
        <span className={over ? 'text-danger' : ''}>
          {used} / {limit}
          {over ? ' · over' : ''}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line">
        <div className={'h-full rounded-full ' + (over ? 'bg-danger' : 'bg-accent')} style={{ width: Math.min(100, (used / Math.max(1, limit)) * 100) + '%' }} />
      </div>
    </div>
  );
}

const btn = 'rounded-xl px-3.5 py-2 text-sm font-bold transition disabled:opacity-50';
const ghost = btn + ' border border-line bg-card hover:border-accent';
const solid = btn + ' bg-accent text-on-accent hover:bg-accent-dark';

export default function Venues({ data, error, reload, adminKey, onLocked, onOpen }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState('');
  const [creating, setCreating] = useState(false);

  const venues = data?.venues || [];
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return venues.filter((v) => (filter === 'all' || v.status === filter) && (!term || `${v.name} ${v.email} ${v.slug || ''}`.toLowerCase().includes(term)));
  }, [venues, q, filter]);
  const count = (s) => (s === 'all' ? venues.length : venues.filter((v) => v.status === s).length);

  // one helper for every button: call the API, show a toast, refresh the list
  async function run(id, path, options, message) {
    setBusyId(id);
    try {
      await api(path, { ...options, adminKey });
      toast(message);
      await reload();
    } catch (e) {
      if (e.status === 401) onLocked();
      else toast(e.message, 'bad');
    } finally {
      setBusyId('');
    }
  }

  const status = (v, action, message) => run(v.id, `/admin/restaurants/${v.id}/${action}`, { method: 'PATCH' }, message);
  const suspend = (v) => window.confirm(`Suspend ${v.name}? All of its QR codes and its staff screens stop working immediately.`) && status(v, 'suspend', `${v.name} suspended`);

  return (
    <div className="rise" style={{
      height:"100vh"
    }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Venues</h1>
          <p className="mt-1 text-muted">Restaurants and mall food courts you have onboarded.</p>
        </div>
        <button onClick={() => setCreating(true)} className={solid + ' inline-flex items-center gap-2'}>
          <Plus size={18} /> New venue
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {[['all', 'All'], ['approved', 'Active'], ['pending', 'Pending'], ['suspended', 'Suspended']].map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} className={'rounded-full px-4 py-2 text-sm font-bold transition ' + (filter === key ? 'bg-accent text-on-accent' : 'border border-line bg-card text-muted hover:text-ink')}>
              {label} <span className="opacity-70">{count(key)}</span>
            </button>
          ))}
        </div>
        <label className="relative ml-auto w-full sm:w-64">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search venues" className="h-11 w-full rounded-full border border-line bg-card pl-10 pr-4 text-sm outline-none focus:border-accent" />
        </label>
      </div>

      {error && <p className="mt-4 rounded-2xl bg-danger-soft p-3 font-bold text-danger">{error}</p>}
      {!data && !error && <p className="mt-8 text-muted">Loading…</p>}
      {data && list.length === 0 && <p className="mt-10 text-center text-muted">{venues.length === 0 ? 'No venues yet. Click “New venue” to onboard your first one.' : 'No venues match.'}</p>}

      <div className="mt-5 grid gap-4">
        {list.map((v) => {
          const [statusLabel, statusTone] = STATUS[v.status];
          const [payLabel, payTone] = PAY[v.payment];
          const mall = v.tenantType === 'MALL_FOOD_COURT';
          const busy = busyId === v.id;
          const owes = v.status === 'approved' && v.payment !== 'paid';
          return (
            <article key={v.id} className={'rounded-3xl border border-line bg-card p-5 shadow-sm ' + (v.status === 'approved' ? '' : 'opacity-80')}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-lg font-extrabold text-accent">{v.name[0]}</span>
                  <div>
                    <h3 className="flex flex-wrap items-center gap-2 text-lg font-extrabold">
                      {v.name} <Badge tone={statusTone}>{statusLabel}</Badge>
                    </h3>
                    <p className="text-sm text-muted">
                      {mall ? 'Mall food court' : 'Restaurant'} · {v.email} · /{v.slug || 'no-slug-yet'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold tracking-tight">{rupees(v.bill.total)}</p>
                  <p className="text-xs text-muted">
                    per month
                    {v.bill.extraTables > 0 && ` · ${rupees(v.bill.base)} + ${v.bill.extraTables} extra tables`}
                    {v.bill.extraBranches > 0 && ` · ${v.bill.extraBranches} extra branch`}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <Meter label="Branches" used={v.usage.branches} limit={v.usage.includedBranches} />
                <Meter label="Active tables" used={v.usage.activeTables} limit={v.usage.includedTables} />
                <div>
                  <p className="text-xs font-bold text-muted">Open requests</p>
                  <p className="text-lg font-extrabold leading-tight">{v.usage.openRequests}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <Badge tone={payTone}>
                  {payLabel}
                  {v.payment === 'paid' && v.paidUntil ? ' until ' + niceDate(v.paidUntil) : ''}
                </Badge>
                {owes && <span className="text-sm font-extrabold text-danger">{rupees(v.bill.total)} pending</span>}
                <select
                  value={v.planTier}
                  disabled={busy}
                  aria-label={`Plan for ${v.name}`}
                  onChange={(e) => run(v.id, `/admin/venues/${v.id}`, { method: 'PATCH', body: { planTier: e.target.value } }, 'Plan updated')}
                  className="rounded-xl border border-line bg-card px-3 py-2 text-sm font-bold"
                >
                  {PLANS[v.tenantType].map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <span className="flex-1" />
                <button className={ghost} onClick={() => onOpen(v)}>
                  Branches &amp; QR codes
                </button>
                {v.payment === 'paid' ? (
                  <button className={ghost} disabled={busy} onClick={() => run(v.id, `/admin/venues/${v.id}/payment`, { method: 'PATCH', body: { action: 'due' } }, 'Marked as unpaid')}>
                    Mark unpaid
                  </button>
                ) : (
                  <button className={ghost} disabled={busy} onClick={() => run(v.id, `/admin/venues/${v.id}/payment`, { method: 'PATCH', body: { action: 'paid' } }, 'Marked as paid for 1 month')}>
                    Mark as paid
                  </button>
                )}
                {v.status === 'pending' && (
                  <>
                    <button className={solid} disabled={busy} onClick={() => status(v, 'approve', `${v.name} approved`)}>
                      Approve
                    </button>
                    <button className={ghost} disabled={busy} onClick={() => status(v, 'reject', `${v.name} rejected`)}>
                      Reject
                    </button>
                  </>
                )}
                {v.status === 'approved' && (
                  <button className={ghost} disabled={busy} onClick={() => suspend(v)}>
                    Suspend
                  </button>
                )}
                {(v.status === 'suspended' || v.status === 'rejected') && (
                  <button className={solid} disabled={busy} onClick={() => status(v, 'approve', `${v.name} is active again`)}>
                    Reactivate
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {creating && (
        <NewVenue
          adminKey={adminKey}
          onLocked={onLocked}
          onClose={() => setCreating(false)}
          onCreated={async (venue) => {
            setCreating(false);
            await reload();
            toast(`${venue.name} created`);
            onOpen(venue);
          }}
        />
      )}
    </div>
  );
}