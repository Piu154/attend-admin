import { useState } from 'react';
import { api } from './api';
import { useToast } from './ui/Toast';

const VENUE_APP = import.meta.env.VITE_VENUE_APP_URL || 'http://localhost:5173';
const PLANS = {
  RESTAURANT: [
    ['STANDARD_3K', 'Standard', '₹3,000 / month · 1 branch · 25 tables'],
    ['PRO_5K', 'Pro / in-mall outlet', '₹5,000 / month · 1 branch · 40 tables'],
  ],
  MALL_FOOD_COURT: [['MALL_15K', 'Mall food court', '₹15,000 / month · 1 food court · 150 tables']],
};
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
const makePassword = () => Array.from(crypto.getRandomValues(new Uint32Array(10)), (n) => ALPHABET[n % ALPHABET.length]).join('');

export default function NewVenue({ adminKey, onClose, onCreated, onLocked }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', tenantType: 'RESTAURANT', planTier: 'STANDARD_3K', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const chooseType = (tenantType) => setForm({ ...form, tenantType, planTier: PLANS[tenantType][0][0] });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body = { ...form, password: form.password || undefined };
      setCreated(await api('/admin/venues', { method: 'POST', body, adminKey }));
      onCreated();
    } catch (err) {
      if (err.status === 401) onLocked();
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy(text, message) {
    try {
      await navigator.clipboard.writeText(text);
      toast(message);
    } catch {
      toast('Could not copy. Select the text and copy it by hand.', 'bad');
    }
  }

  if (created) {
    const loginUrl = `${VENUE_APP}/login`;
    const { email, password } = created.login;
    const message = `Your ATTEND screen is ready.\nOpen: ${loginUrl}\nEmail: ${email}\nPassword: ${password}`;
    return (
      <div className="back" role="dialog" aria-modal="true">
        <div className="modal">
          <h2>{created.venue.name} is live</h2>
          <p className="muted">Give these login details to the venue. The password is shown only now, so copy it before you close this.</p>
          <div className="creds">
            <div><span className="muted">Open</span><code>{loginUrl}</code></div>
            <div><span className="muted">Email</span><code>{email}</code></div>
            <div><span className="muted">Password</span><code>{password}</code></div>
          </div>
          <div className="actions">
            <button className="btn soft" onClick={() => copy(message, 'Login details copied')}>
              Copy login details
            </button>
            <button className="btn" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="back" role="dialog" aria-modal="true">
      <form className="modal" onSubmit={submit}>
        <h2>New venue</h2>

        <div className="seg" role="group" aria-label="Venue type">
          <button type="button" className={form.tenantType === 'RESTAURANT' ? 'on' : ''} onClick={() => chooseType('RESTAURANT')}>
            Restaurant
          </button>
          <button type="button" className={form.tenantType === 'MALL_FOOD_COURT' ? 'on' : ''} onClick={() => chooseType('MALL_FOOD_COURT')}>
            Mall food court
          </button>
        </div>

        <label className="field">
          Venue name
          <input className="input" value={form.name} onChange={set('name')} required minLength={2} maxLength={120} autoFocus />
        </label>
        <label className="field">
          Login email (the venue’s shared screen login)
          <input className="input" type="email" value={form.email} onChange={set('email')} required autoComplete="off" />
        </label>

        <div className="plans" role="group" aria-label="Plan">
          {PLANS[form.tenantType].map(([value, label, detail]) => (
            <button type="button" key={value} className={'plan' + (form.planTier === value ? ' on' : '')} onClick={() => setForm({ ...form, planTier: value })}>
              <b>{label}</b>
              <small>{detail}</small>
            </button>
          ))}
        </div>

        <label className="field">
          Password (leave empty to generate one)
          <span className="row-2">
            <input className="input" value={form.password} onChange={set('password')} minLength={8} maxLength={100} autoComplete="off" />
            <button type="button" className="btn ghost" onClick={() => setForm({ ...form, password: makePassword() })}>
              Generate
            </button>
          </span>
        </label>

        {error && <p className="err">{error}</p>}
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" disabled={busy}>
            {busy ? 'Creating…' : 'Create venue'}
          </button>
        </div>
      </form>
    </div>
  );
}