import { useEffect } from 'react';

export default function Modal({ onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="no-print fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'rise w-full rounded-3xl bg-card p-7 shadow-2xl ' + (wide ? 'max-w-xl' : 'max-w-md')}>{children}</div>
    </div>
  );
}