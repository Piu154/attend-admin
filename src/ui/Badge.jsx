const TONE = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  muted: 'bg-line text-muted',
  accent: 'bg-accent-soft text-accent',
};

export default function Badge({ tone = 'muted', children }) {
  return <span className={'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ' + TONE[tone]}>{children}</span>;
}