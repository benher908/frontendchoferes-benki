import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'Sin registros', message = 'Cuando exista información, aparecerá aquí.' }) {
  return (
    <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-gray-500 shadow-sm">
        <Inbox size={22} />
      </div>
      <p className="mt-3 font-bold text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-600">{message}</p>
    </div>
  );
}
