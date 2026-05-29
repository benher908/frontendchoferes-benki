import { Loader2 } from 'lucide-react';

export default function ConfirmOverlay({ open, title = 'Procesando', message = 'Espera un momento...', progressLabel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-950/55 p-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#07AE8B]/10 text-[#04745f]">
          <Loader2 size={30} className="animate-spin" />
        </div>
        <h3 className="mt-4 text-xl font-bold text-gray-950">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-gray-600">{message}</p>
        {progressLabel && (
          <p className="mt-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800">
            {progressLabel}
          </p>
        )}
      </div>
    </div>
  );
}
