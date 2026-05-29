'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, Loader2 } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  function remove(id) {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }

  function showToast({ type = 'info', title, message, duration = 4200 }) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const toast = { id, type, title, message };

    setToasts((prev) => [toast, ...prev].slice(0, 5));

    if (duration > 0) {
      window.setTimeout(() => remove(id), duration);
    }

    return id;
  }

  const value = useMemo(
    () => ({
      toast: showToast,
      success: (message, title = 'Listo') => showToast({ type: 'success', title, message }),
      error: (message, title = 'Revisa esto') => showToast({ type: 'error', title, message, duration: 6500 }),
      info: (message, title = 'Aviso') => showToast({ type: 'info', title, message }),
      loading: (message, title = 'Procesando') => showToast({ type: 'loading', title, message, duration: 0 }),
      dismiss: remove,
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="fixed right-3 top-3 z-[100] flex w-[calc(100vw-1.5rem)] max-w-sm flex-col gap-3 sm:right-5 sm:top-5 sm:w-full">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={() => remove(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider');
  }

  return context;
}

function Toast({ toast, onClose }) {
  const styles = {
    success: {
      icon: <CheckCircle2 size={22} />,
      box: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      iconBox: 'bg-emerald-100 text-emerald-700',
    },
    error: {
      icon: <AlertTriangle size={22} />,
      box: 'border-red-200 bg-red-50 text-red-900',
      iconBox: 'bg-red-100 text-red-700',
    },
    info: {
      icon: <Info size={22} />,
      box: 'border-sky-200 bg-sky-50 text-sky-900',
      iconBox: 'bg-sky-100 text-sky-700',
    },
    loading: {
      icon: <Loader2 size={22} className="animate-spin" />,
      box: 'border-[#07AE8B]/30 bg-white text-gray-900',
      iconBox: 'bg-[#07AE8B]/10 text-[#04745f]',
    },
  }[toast.type] || {};

  return (
    <div className={`rounded-2xl border p-4 shadow-xl backdrop-blur ${styles.box}`}>
      <div className="flex gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.iconBox}`}>
          {styles.icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-bold leading-5">{toast.title}</p>
          {toast.message && <p className="mt-1 text-sm leading-5 opacity-90">{toast.message}</p>}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-black/5"
          aria-label="Cerrar notificación"
        >
          <X size={17} />
        </button>
      </div>
    </div>
  );
}
