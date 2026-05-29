'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((type, message, title) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, message, title }].slice(-4));
    window.setTimeout(() => remove(id), 4200);
  }, [remove]);

  const value = useMemo(() => ({
    success: (message, title = 'Listo') => push('success', message, title),
    error: (message, title = 'Revisa esto') => push('error', message, title),
    info: (message, title = 'Aviso') => push('info', message, title),
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={() => remove(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      success: () => {},
      error: () => {},
      info: () => {},
    };
  }
  return ctx;
}

function Toast({ toast, onClose }) {
  const styles = {
    success: {
      icon: CheckCircle2,
      box: 'border-emerald-100 bg-white',
      iconBox: 'bg-emerald-50 text-emerald-700',
    },
    error: {
      icon: AlertTriangle,
      box: 'border-red-100 bg-white',
      iconBox: 'bg-red-50 text-red-700',
    },
    info: {
      icon: Info,
      box: 'border-blue-100 bg-white',
      iconBox: 'bg-blue-50 text-blue-700',
    },
  }[toast.type] || {};

  const Icon = styles.icon || Info;

  return (
    <div className={`flex gap-3 rounded-2xl border p-4 shadow-xl shadow-slate-900/10 ${styles.box}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.iconBox}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-950">{toast.title}</p>
        <p className="mt-0.5 text-sm leading-5 text-slate-600">{toast.message}</p>
      </div>
      <button onClick={onClose} className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar notificación">
        <X size={16} />
      </button>
    </div>
  );
}
