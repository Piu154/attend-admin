import { useState } from 'react';
import { api } from './api';
import Modal from './ui/Modal';
import { PLANS } from './lib';

export default function NewVenue({ adminKey, onClose, onCreated, onLocked }) {
  const [form, setForm] = useState({ name: '', email: '', tenantType: 'RESTAURANT', planTier: 'STANDARD_3K' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const chooseType = (tenantType) => setForm({ ...form, tenantType, planTier: PLANS[tenantType][0][0] });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api('/admin/venues', { method: 'POST', body: form, adminKey });
      onCreated(res.venue);
    } catch (err) {
      if (err.status === 401) onLocked();
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit}>
        <h2 className="text-2xl font-extrabold tracking-tight">New venue</h2>
        <p className="mt-1 text-sm text-muted">After this you add its branches, tables and staff login.</p>

        <div className="mt-5 grid grid-cols-2 gap-1.5 rounded-2xl bg-bg p-1.5" role="group" aria-label="Venue type">
          {[['RESTAURANT', 'Restaurant'], ['MALL_FOOD_COURT', 'Mall food court']].map(([value, label]) => (
            <button type="button" key={value} onClick={() => chooseType(value)} className={'rounded-xl py-2.5 text-sm font-bold transition ' + (form.tenantType === value ? 'bg-card shadow-sm' : 'text-muted')}>
              {label}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-sm font-bold" htmlFor="vn">
          Venue name
        </label>
        <input id="vn" value={form.name} onChange={set('name')} required minLength={2} maxLength={120} autoFocus className="mt-2 h-12 w-full rounded-xl border border-line bg-bg px-4 outline-none focus:border-accent" />

        <label className="mt-4 block text-sm font-bold" htmlFor="ve">
          Contact email
        </label>
        <input id="ve" type="email" value={form.email} onChange={set('email')} required autoComplete="off" className="mt-2 h-12 w-full rounded-xl border border-line bg-bg px-4 outline-none focus:border-accent" />

        <p className="mt-4 text-sm font-bold">Plan</p>
        <div className="mt-2 grid gap-2">
          {PLANS[form.tenantType].map(([value, label, detail]) => (
            <button type="button" key={value} onClick={() => setForm({ ...form, planTier: value })} className={'rounded-2xl border p-3.5 text-left transition ' + (form.planTier === value ? 'border-accent bg-accent-soft' : 'border-line')}>
              <span className="block font-extrabold">{label}</span>
              <span className="block text-xs text-muted">{detail}</span>
            </button>
          ))}
        </div>

        {error && <p className="mt-4 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold">
            Cancel
          </button>
          <button disabled={busy} className="rounded-xl bg-accent px-5 py-2.5 text-sm font-extrabold text-on-accent disabled:opacity-60">
            {busy ? 'Creating…' : 'Create venue'}
          </button>
        </div>
      </form>
    </Modal>
  );
}