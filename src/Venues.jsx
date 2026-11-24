import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { useToast } from './ui/Toast';
import NewVenue from './NewVenue';

const rupees = (n) => '₹' + Number(n).toLocaleString('en-IN');
const STATUS = { approved: ['Active', 'ok'], pending: ['Pending', 'warn'], suspended: ['Suspended', 'red'], rejected: ['Rejected', ''] };
const PAY = { paid: ['Paid', 'ok'], due: ['Payment due', 'warn'], overdue: ['Overdue', 'red'] };
const PLANS = {
  RESTAURANT: [['STANDARD_3K', 'Standard · ₹3,000'], ['PRO_5K', 'Pro · ₹5,000']],
  MALL_FOOD_COURT: [['MALL_15K', 'Mall food court · ₹15,000']],
};
const niceDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function Meter({ label, used, limit }) {
  const over = used > limit;
  return (
    <div className={'meter' + (over ? ' over' : '')}>
      <div className="meter-top">
        <span>{label}</span>
        <b>
          {used} / {limit}
          {over ? ' · over limit' : ''}
        </b>
      </div>
      <div className="meter-bar">
        <i style={{ width: Math.min(100, (used / Math.max(1, limit)) * 100) + '%' }} />
      </div>
    </div>
  );
}

export default function Venues({ adminKey, onOpen, onLocked }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api('/admin/venues', { adminKey }));
      setError('');
    } catch (e) {
      if (e.status === 401) onLocked();
      else setError(e.message);
    }
  }, [adminKey, onLocked]);

  useEffect(() => {
    load();
  }, [load]);

  // one helper for every button: call the API, show a toast, refresh the list
  async function run(id, path, options, doneMessage) {
    setBusyId(id);
    try {
      await api(path, { ...options, adminKey });
      toast(doneMessage);
      await load();
    } catch (e) {
      if (e.status === 401) onLocked();
      else toast(e.message, 'bad');
    } finally {
      setBusyId('');
    }
  }

  const status = (v, action, message) => run(v.id, `/admin/restaurants/${v.id}/${action}`, { method: 'PATCH' }, message);

  function suspend(v) {
    if (window.confirm(`Suspend ${v.name}? All of its QR codes and its screens stop working immediately.`)) {
      status(v, 'suspend', `${v.name} suspended`);
    }
  }

  const totals = data?.totals;

  return (
    <main className="wrap">
      <div className="page-head">
        <div>
          <h1>Venues</h1>
          <p className="muted">Restaurants and mall food courts you have onboarded.</p>
        </div>
        <div className="row-2">
          <button className="btn ghost" onClick={load}>
            Refresh
          </button>
          <button className="btn" onClick={() => setCreating(true)}>
            + New venue
          </button>
        </div>
      </div>

      {error && <p className="err">{error}</p>}

      {totals && (
        <section className="stats">
          <div className="stat">
            <span>Active venues</span>
            <strong>{totals.active}</strong>
          </div>
          <div className="stat">
            <span>Monthly revenue</span>
            <strong>{rupees(totals.monthlyRevenue)}</strong>
          </div>
          <div className="stat">
            <span>Collected</span>
            <strong>{rupees(totals.collectedAmount)}</strong>
          </div>
          <div className={'stat' + (totals.unpaidAmount > 0 ? ' hot' : '')}>
            <span>Pending</span>
            <strong>{rupees(totals.unpaidAmount)}</strong>
          </div>
        </section>
      )}

      {!data && !error && <p className="muted">Loading…</p>}
      {data && data.venues.length === 0 && <p className="muted">No venues yet. Click “New venue” to onboard your first one.</p>}

      <section className="venues">
        {data?.venues.map((v) => {
          const [statusLabel, statusClass] = STATUS[v.status];
          const [payLabel, payClass] = PAY[v.payment];
          const mall = v.tenantType === 'MALL_FOOD_COURT';
          const busy = busyId === v.id;
          const owes = v.status === 'approved' && v.payment !== 'paid';
          return (
            <article key={v.id} className={'venue' + (v.status === 'approved' ? '' : ' off')}>
              <div className="venue-head">
                <div>
                  <h3>
                    {v.name} <span className={'badge ' + statusClass}>{statusLabel}</span>
                  </h3>
                  <p className="muted">
                    {mall ? 'Mall food court' : 'Restaurant'} · {v.email} · /{v.slug || 'no-slug-yet'}
                  </p>
                </div>
                <div className="bill">
                  <strong>{rupees(v.bill.total)}</strong>
                  <span>
                    per month
                    {v.bill.extraTables > 0 && ` · ${rupees(v.bill.base)} + ${v.bill.extraTables} extra tables`}
                    {v.bill.extraBranches > 0 && ` · ${v.bill.extraBranches} extra branch`}
                  </span>
                </div>
              </div>

              <div className="meters">
                <Meter label="Branches" used={v.usage.branches} limit={v.usage.includedBranches} />
                <Meter label="Active tables" used={v.usage.activeTables} limit={v.usage.includedTables} />
                {mall && (
                  <div className="meter">
                    <div className="meter-top">
                      <span>Food stalls</span>
                      <b>{v.usage.vendors}</b>
                    </div>
                  </div>
                )}
                <div className="meter">
                  <div className="meter-top">
                    <span>Open requests</span>
                    <b>{v.usage.openRequests}</b>
                  </div>
                </div>
              </div>

              <div className="venue-foot">
                <span className={'badge ' + payClass}>
                  {payLabel}
                  {v.payment === 'paid' && v.paidUntil ? ' until ' + niceDate(v.paidUntil) : ''}
                </span>
                {owes && <span className="due">{rupees(v.bill.total)} pending this month</span>}
                <select
                  className="select"
                  value={v.planTier}
                  disabled={busy}
                  aria-label={`Plan for ${v.name}`}
                  onChange={(e) => run(v.id, `/admin/venues/${v.id}`, { method: 'PATCH', body: { planTier: e.target.value } }, 'Plan updated')}
                >
                  {PLANS[v.tenantType].map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <span className="spacer" />
                <button className="btn ghost sm" onClick={() => onOpen(v)}>
                  Tables &amp; QR codes
                </button>
                {v.payment === 'paid' ? (
                  <button
                    className="btn ghost sm"
                    disabled={busy}
                    onClick={() => run(v.id, `/admin/venues/${v.id}/payment`, { method: 'PATCH', body: { action: 'due' } }, 'Marked as unpaid')}
                  >
                    Mark unpaid
                  </button>
                ) : (
                  <button
                    className="btn soft sm"
                    disabled={busy}
                    onClick={() => run(v.id, `/admin/venues/${v.id}/payment`, { method: 'PATCH', body: { action: 'paid' } }, 'Marked as paid for 1 month')}
                  >
                    Mark as paid
                  </button>
                )}
                {v.status === 'pending' && (
                  <>
                    <button className="btn sm" disabled={busy} onClick={() => status(v, 'approve', `${v.name} approved`)}>
                      Approve
                    </button>
                    <button className="btn ghost sm" disabled={busy} onClick={() => status(v, 'reject', `${v.name} rejected`)}>
                      Reject
                    </button>
                  </>
                )}
                {v.status === 'approved' && (
                  <button className="btn ghost sm" disabled={busy} onClick={() => suspend(v)}>
                    Suspend
                  </button>
                )}
                {(v.status === 'suspended' || v.status === 'rejected') && (
                  <button className="btn sm" disabled={busy} onClick={() => status(v, 'approve', `${v.name} is active again`)}>
                    Reactivate
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {creating && <NewVenue adminKey={adminKey} onClose={() => setCreating(false)} onCreated={load} onLocked={onLocked} />}
    </main>
  );
}