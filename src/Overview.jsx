import { ArrowRight, CircleAlert, Loader2 } from 'lucide-react';
import Badge from './ui/Badge';
import { rupees } from './lib';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function Stat({ label, value, hot }) {
  return (
    <div className="rounded-3xl border border-line bg-card p-5">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className={'mt-1 text-3xl font-extrabold tracking-tight ' + (hot ? 'text-danger' : '')}>{value}</p>
    </div>
  );
}

export default function Overview({ data, error, onOpen, goVenues }) {
  if (error) return <p className="rounded-2xl bg-danger-soft p-4 font-bold text-danger">{error}</p>;
  if (!data) return <Loader2 className="animate-spin text-muted" />;

  const { totals, venues } = data;

  // things that need your attention, all from real records
  const attention = [];
  venues.forEach((v) => {
    if (v.status === 'pending') attention.push({ v, text: 'Waiting for your approval', tone: 'warn' });
    if (v.status === 'approved' && v.payment !== 'paid') {
      attention.push({ v, text: `${rupees(v.bill.total)} ${v.payment === 'overdue' ? 'payment overdue' : 'payment pending'}`, tone: v.payment === 'overdue' ? 'danger' : 'warn' });
    }
    if (v.usage.activeTables > v.usage.includedTables) {
      attention.push({ v, text: `${v.usage.activeTables - v.usage.includedTables} tables over the plan limit`, tone: 'warn' });
    }
  });

  return (
    <div className="rise">
      <p className="text-sm font-semibold text-muted">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{greeting()}</h1>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active venues" value={totals.active} />
        <Stat label="Monthly revenue" value={rupees(totals.monthlyRevenue)} />
        <Stat label="Collected" value={rupees(totals.collectedAmount)} />
        <Stat label="Pending" value={rupees(totals.unpaidAmount)} hot={totals.unpaidAmount > 0} />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-3xl border border-line bg-card p-6">
          <h2 className="font-extrabold">Needs your attention</h2>
          {attention.length === 0 && <p className="mt-4 text-sm text-muted">Nothing needs attention right now.</p>}
          <ul className="mt-3 divide-y divide-line">
            {attention.map((a, i) => (
              <li key={i}>
                <button onClick={() => onOpen(a.v)} className="flex w-full items-center gap-3 py-3 text-left">
                  <CircleAlert size={18} className={a.tone === 'danger' ? 'text-danger' : 'text-warn'} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{a.v.name}</span>
                    <span className="block text-sm text-muted">{a.text}</span>
                  </span>
                  <ArrowRight size={16} className="text-muted" />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-line bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold">Latest venues</h2>
            <button onClick={goVenues} className="text-sm font-bold text-accent">
              See all
            </button>
          </div>
          {venues.length === 0 && <p className="mt-4 text-sm text-muted">No venues yet. Add your first one in Venues.</p>}
          <ul className="mt-3 divide-y divide-line">
            {venues.slice(0, 5).map((v) => (
              <li key={v.id}>
                <button onClick={() => onOpen(v)} className="flex w-full items-center gap-3 py-3 text-left">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft font-extrabold text-accent">{v.name[0]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{v.name}</span>
                    <span className="block text-xs text-muted">
                      {v.usage.branches} branch{v.usage.branches === 1 ? '' : 'es'} · {v.usage.activeTables} tables · {v.usage.openRequests} open requests
                    </span>
                  </span>
                  <Badge tone={v.status === 'approved' ? 'ok' : 'warn'}>{v.status === 'approved' ? 'Active' : v.status}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}