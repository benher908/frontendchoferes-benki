'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/formatters';
import { ClipboardCheck, Truck, Users } from 'lucide-react';

export default function ChecadorHomePage() {
  const [data, setData] = useState({
    choferes: [],
    unidades: [],
    chequeos: [],
  });

  const [error, setError] = useState('');

  async function cargar() {
    try {
      setError('');

      const [catalogos, chequeos] = await Promise.all([
        api.catalogos(),
        api.listarChequeos('?limit=10'),
      ]);

      setData({
        choferes: catalogos.choferes || [],
        unidades: catalogos.unidades || [],
        chequeos: chequeos || [],
      });
    } catch (err) {
      setError(err.message || 'No se pudo cargar información');
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, []);

  return (
    <ProtectedRoute allowedRoles={['checador_unidad']}>
      <AppShell role="checador_unidad">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Checador de unidades</h1>
          <p className="mt-1 text-gray-500">
            Consulta historial y registra chequeos de unidad.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Choferes"
            value={data.choferes.length}
            icon={<Users size={22} />}
          />

          <MetricCard
            title="Unidades"
            value={data.unidades.length}
            icon={<Truck size={22} />}
          />

          <MetricCard
            title="Chequeos recientes"
            value={data.chequeos.length}
            icon={<ClipboardCheck size={22} />}
          />
        </section>

        <Card title="Últimos chequeos" className="mt-6">
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-left text-sm text-gray-900">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200 text-gray-800">
                  <th className="px-3 py-3 font-semibold">Fecha</th>
                  <th className="px-3 py-3 font-semibold">Unidad</th>
                  <th className="px-3 py-3 font-semibold">Chofer</th>
                  <th className="px-3 py-3 font-semibold">Tipo</th>
                  <th className="px-3 py-3 text-right font-semibold">Fotos</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {data.chequeos.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-gray-950">{fmtDate(row.fecha)}</div>
                      <div className="text-xs text-gray-600">{row.hora || '—'}</div>
                    </td>

                    <td className="px-3 py-3 text-gray-900">
                      <div className="font-medium">{row.unidad_nombre || '—'}</div>
                      <div className="text-xs text-gray-600">{row.placas || 'Sin placas'}</div>
                    </td>

                    <td className="px-3 py-3 text-gray-900">{row.chofer_nombre || '—'}</td>
                    <td className="px-3 py-3 text-gray-900">{row.tipo}</td>
                    <td className="px-3 py-3 text-right text-gray-900">{row.fotos_count || 0}</td>
                  </tr>
                ))}

                {data.chequeos.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-3 py-8 text-center text-gray-600">
                      Sin chequeos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </AppShell>
    </ProtectedRoute>
  );
}

function MetricCard({ title, value, icon }) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#07AE8B]/15 text-[#04745f]">
          {icon}
        </div>

        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-950">{value}</p>
        </div>
      </div>
    </Card>
  );
}