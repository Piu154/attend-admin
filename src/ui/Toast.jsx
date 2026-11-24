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
      <div className="toasts no-print" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={'toast ' + t.kind}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}