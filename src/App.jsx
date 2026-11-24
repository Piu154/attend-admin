import { useCallback, useState } from 'react';
import { api } from './api';
import Logo from './ui/Logo';
import Venues from './Venues';
import VenueDetail from './VenueDetail';

const KEY = 'attend.adminKey';

export default function App() {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem(KEY) || '');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [openVenue, setOpenVenue] = useState(null); // the venue whose branches and tables are open

  const lock = useCallback((message = '') => {
    sessionStorage.removeItem(KEY);
    setAdminKey('');
    setOpenVenue(null);
    setError(message);
  }, []);
  const onLocked = useCallback(() => lock('Your session ended. Enter the admin key again.'), [lock]);

  async function unlock(e) {
    e.preventDefault();
    const key = input.trim();
    setBusy(true);
    setError('');
    try {
      await api('/admin/venues', { adminKey: key }); // proves the key is right before letting you in
      sessionStorage.setItem(KEY, key);
      setAdminKey(key);
      setInput('');
    } catch (err) {
      setError(err.status === 401 ? 'That admin key is not correct.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!adminKey) {
    return (
      <main className="gate">
        <form className="gate-card" onSubmit={unlock}>
          <Logo size={36} />
          <div>
            <h1>Platform admin</h1>
            <p className="muted">Enter your admin key to continue.</p>
          </div>
          <label className="field">
            Admin key
            <input
              className="input"
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              autoFocus
              required
            />
          </label>
          {error && <p className="err">{error}</p>}
          <button className="btn" disabled={busy}>
            {busy ? 'Checking…' : 'Open admin'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <>
      <header className="top no-print">
        <div className="top-in">
          <div>
            <Logo />
            <span className="pill">Admin</span>
          </div>
          <button className="btn ghost sm" onClick={() => lock()}>
            Sign out
          </button>
        </div>
      </header>
      {openVenue ? (
        <VenueDetail venue={openVenue} adminKey={adminKey} onBack={() => setOpenVenue(null)} onLocked={onLocked} />
      ) : (
        <Venues adminKey={adminKey} onOpen={setOpenVenue} onLocked={onLocked} />
      )}
    </>
  );
}