import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(() => {});

export function useToast() {
  return useContext(ToastContext);
}

// A quiet message in the corner that disappears by itself: toast('Saved') or toast('Failed', 'bad')
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((list) => [...list, { id, message, kind }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="no-print fixed bottom-4 right-4 z-[80] grid gap-2" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={'rise max-w-sm rounded-2xl px-4 py-3 text-sm font-bold shadow-lg ' + (t.kind === 'bad' ? 'bg-danger text-white' : 'bg-ink text-bg')}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}