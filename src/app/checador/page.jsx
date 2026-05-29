'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import Card from '@/components/Card';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/ToastProvider';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/formatters';
import { ClipboardCheck, PlusCircle, Truck, Users } from 'lucide-react';

export default function ChecadorHomePage() {
  const toast = useToast();
  const [data, setData] = useState({ choferes: [], unidades: [], chequeos: [] });
  const [loading, setLoading] = useState(true);

  async function cargar() {
    try {
      setLoading(true);
      const [catalogos, chequeos] = await Promise.all([api.catalogos(), api.listarChequeos('?limit=10')]);
      setData({ choferes: catalogos.choferes || [], unidades: catalogos.unidades || [], chequeos: chequeos || [] });
    } catch (err) {
      toast.error(err.message || 'No se pudo cargar la información.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ProtectedRoute allowedRoles={['checador_unidad']}>
      <AppShell role="checador_unidad">
        <header className="mb-5 rounded-[2rem] bg-gradient-to-br from-gray-950 to-[#6A5492] p-5 text-white shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-white/70">Inicio</p>
          <h1 className="mt-1 text-2xl font-black">Checador de unidades</h1>
          <p className="mt-2 text-sm leading-6 text-white/80">Acceso rápido para registrar chequeos y revisar historial.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Choferes" value={data.choferes.length} icon={<Users size={22} />} />
          <MetricCard title="Unidades" value={data.unidades.length} icon={<Truck size={22} />} />
          <MetricCard title="Chequeos recientes" value={data.chequeos.length} icon={<ClipboardCheck size={22} />} />
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[360px_1fr]">
          <Card title="Acción principal" subtitle="Usa este acceso para crear una revisión de unidad.">
            <Link href="/checador/chequeos" className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#07AE8B] font-black text-white shadow-sm">
              <PlusCircle size={21} /> Nuevo chequeo
            </Link>
            <p className="mt-3 rounded-2xl bg-gray-50 p-4 text-sm leading-6 text-gray-600">
              El formulario está optimizado para celular: botones grandes, fotos claras y checklist por secciones.
            </p>
          </Card>

          <Card title="Últimos chequeos" subtitle="Vista rápida de lo registrado recientemente.">
            {loading ? (
              <p className="py-8 text-center text-gray-600">Cargando...</p>
            ) : data.chequeos.length ? (
              <div className="grid gap-3">
                {data.chequeos.map((row) => (
                  <article key={row.id} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-gray-950">{row.unidad_nombre || 'Unidad'}</p>
                        <p className="text-sm text-gray-600">{row.placas || 'Sin placas'} · {fmtDate(row.fecha)} {row.hora || ''}</p>
                      </div>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-black text-gray-700">{row.fotos_count || 0} fotos</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700"><strong>Chofer:</strong> {row.chofer_nombre || '—'}</p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState message="Aún no hay chequeos registrados." />
            )}
          </Card>
        </section>
      </AppShell>
    </ProtectedRoute>
  );
}

function MetricCard({ title, value, icon }) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#07AE8B]/15 text-[#04745f]">{icon}</div>
        <div><p className="text-sm font-bold text-gray-500">{title}</p><p className="text-2xl font-black text-gray-950">{value}</p></div>
      </div>
    </Card>
  );
}
