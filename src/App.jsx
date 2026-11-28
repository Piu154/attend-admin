import { useCallback, useEffect, useState } from 'react';
import { Building2, LayoutDashboard, LogOut, Menu } from 'lucide-react';
import { api } from './api';
import Logo from './ui/Logo';
// import ThemeToggle from './ui/ThemeToggle';
import Overview from './Overview';
import Venues from './Venues';
import VenueDetail from './VenueDetail';

const KEY = 'attend.adminKey';
const NAV = [
  ['overview', 'Overview', LayoutDashboard],
  ['venues', 'Venues', Building2],
];

export default function App() {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem(KEY) || '');
  const [input, setInput] = useState('');
  const [gateError, setGateError] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState('overview');
  const [openVenue, setOpenVenue] = useState(null);
  const [menu, setMenu] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const lock = useCallback((message = '') => {
    sessionStorage.removeItem(KEY);
    setAdminKey('');
    setOpenVenue(null);
    setData(null);
    setGateError(message);
  }, []);
  const onLocked = useCallback(() => lock('Your session ended. Enter the admin key again.'), [lock]);

  const reload = useCallback(async () => {
    try {
      setData(await api('/admin/venues', { adminKey }));
      setError('');
    } catch (e) {
      if (e.status === 401) onLocked();
      else setError(e.message);
    }
  }, [adminKey, onLocked]);

  useEffect(() => {
    if (adminKey) reload();
  }, [adminKey, reload]);

  async function unlock(e) {
    e.preventDefault();
    const key = input.trim();
    setBusy(true);
    setGateError('');
    try {
      await api('/admin/venues', { adminKey: key }); // proves the key is right before letting you in
      sessionStorage.setItem(KEY, key);
      setAdminKey(key);
      setInput('');
    } catch (err) {
      setGateError(err.status === 401 ? 'That admin key is not correct.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  const go = (p) => {
    setPage(p);
    setOpenVenue(null);
    setMenu(false);
  };

  if (!adminKey) {
    return (
      <main className="relative grid min-h-screen place-items-center px-5">
        {/* <ThemeToggle className="absolute right-5 top-5" /> */}
        <form onSubmit={unlock} className="rise w-full max-w-sm rounded-3xl border border-line bg-card p-8 shadow-sm">
          <Logo size={36} />
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight">Platform admin</h1>
          <p className="mt-1 text-sm text-muted">Enter your admin key to continue.</p>
          <label htmlFor="k" className="mt-6 block text-sm font-bold">
            Admin key
          </label>
          <input
            id="k"
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            autoFocus
            required
            className="mt-2 h-12 w-full rounded-xl border border-line bg-bg px-4 outline-none focus:border-accent"
          />
          {gateError && <p className="mt-4 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">{gateError}</p>}
          <button disabled={busy} className="mt-6 h-12 w-full rounded-xl bg-accent font-extrabold text-on-accent transition active:scale-[0.98] disabled:opacity-60">
            {busy ? 'Checking…' : 'Open admin'}
          </button>
        </form>
      </main>
    );
  }

  const shared = { data, error, reload, adminKey, onLocked, onOpen: setOpenVenue };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside
        className={
          'no-print fixed inset-y-0 left-0 z-30 flex w-[250px] flex-col bg-side p-5 text-white transition-transform lg:static lg:translate-x-0 ' +
          (menu ? 'translate-x-0' : '-translate-x-full')
        }
      >
        <div className="mb-8 mt-1 flex items-center gap-3">
          <Logo size={30} />
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/70">Admin</span>
        </div>
        <nav className="grid gap-1">
          {NAV.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => go(key)}
              className={'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-bold transition ' + (page === key ? 'bg-white/12 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white')}
            >
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2">
          {/* <ThemeToggle className="!border-white/15 !bg-white/5 !text-white/70" /> */}
          <button onClick={() => lock()} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-white/15 text-sm font-bold text-white/70 hover:text-white">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      {menu && <div className="no-print fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setMenu(false)} />}

      <div className="min-w-0">
        <header className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-card/90 px-5 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setMenu(true)} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-full border border-line">
            <Menu size={18} />
          </button>
          <Logo size={26} />
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8">
          {openVenue ? (
            <VenueDetail venue={openVenue} adminKey={adminKey} onBack={() => setOpenVenue(null)} onLocked={onLocked} reload={reload} />
          ) : page === 'overview' ? (
            <Overview {...shared} goVenues={() => go('venues')} />
          ) : (
            <Venues {...shared} />
          )}
        </main>
      </div>
    </div>
  );
}