'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import { fmtDate, fmtMoney } from '@/lib/formatters';
import { ClipboardCheck, Route, Truck, Wallet } from 'lucide-react';

function periodoActual() {
  const now = new Date();

  return {
    anio: now.getFullYear(),
    mes: now.getMonth() + 1,
  };
}

export default function ChoferHomePage() {
  const [user, setUser] = useState(null);
  const [chequeos, setChequeos] = useState([]);
  const [incentivo, setIncentivo] = useState(null);
  const [error, setError] = useState('');

  async function cargar() {
    try {
      setError('');

      const me = await api.me();
      setUser(me);

      const checks = await api.misChequeos();
      setChequeos(checks || []);

      if (me?.chofer_id) {
        const periodo = periodoActual();

        try {
          const preview = await api.previewIncentivoChofer(
            me.chofer_id,
            periodo.anio,
            periodo.mes
          );

          setIncentivo(preview);
        } catch {
          setIncentivo(null);
        }
      }
    } catch (err) {
      setError(err.message || 'No se pudo cargar tu información');
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, []);

  return (
    <ProtectedRoute allowedRoles={['chofer']}>
      <AppShell role="chofer">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
          <p className="mt-1 text-gray-500">
            Consulta tu información, chequeos recientes e incentivo estimado.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-2xl bg-gray-100">
                {user?.foto_url ? (
                  <img
                    src={user.foto_url}
                    alt={user.nombre_completo}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#07AE8B] text-xl font-bold text-white">
                    {user?.nombre_completo?.[0] || 'C'}
                  </div>
                )}
              </div>

              <div>
                <p className="font-bold text-gray-950">
                  {user?.nombre_completo || user?.username || 'Chofer'}
                </p>
                <p className="text-sm text-gray-600">
                  {user?.ruta_nombre || 'Sin ruta asignada'}
                </p>
              </div>
            </div>
          </Card>

          <MetricCard
            title="Ruta"
            value={user?.ruta_nombre || '—'}
            icon={<Route size={22} />}
          />

          <MetricCard
            title="Chequeos recientes"
            value={chequeos.length}
            icon={<ClipboardCheck size={22} />}
          />
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[380px_1fr]">
          <Card title="Incentivo estimado del mes">
            {incentivo ? (
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#07AE8B]/15 text-[#04745f]">
                    <Wallet size={22} />
                  </div>

                  <div>
                    <p className="text-2xl font-bold text-gray-950">
                      {fmtMoney(incentivo.monto)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {incentivo.porcentaje}% de cumplimiento
                    </p>
                  </div>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-[#07AE8B]"
                    style={{
                      width: `${Math.min(100, Number(incentivo.porcentaje || 0))}%`,
                    }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Mini label="Rendimiento" value={`${(Number(incentivo.rendimiento?.score || 0) * 100).toFixed(1)}%`} />
                  <Mini label="Puntualidad" value={`${(Number(incentivo.puntualidad?.score || 0) * 100).toFixed(1)}%`} />
                  <Mini label="Servicio" value={`${(Number(incentivo.servicio?.score || 0) * 100).toFixed(1)}%`} />
                  <Mini label="Limpieza" value={`${(Number(incentivo.limpieza?.score || 0) * 100).toFixed(1)}%`} />
                </div>
              </div>
            ) : (
              <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
                Todavía no hay información suficiente para calcular tu incentivo.
              </p>
            )}
          </Card>

          <Card title="Mis chequeos recientes">
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-left text-sm text-gray-900">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200 text-gray-800">
                    <th className="px-3 py-3 font-semibold">Fecha</th>
                    <th className="px-3 py-3 font-semibold">Unidad</th>
                    <th className="px-3 py-3 font-semibold">Tipo</th>
                    <th className="px-3 py-3 text-right font-semibold">Fotos</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {chequeos.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-gray-950">{fmtDate(row.fecha)}</div>
                        <div className="text-xs text-gray-600">{row.hora || '—'}</div>
                      </td>

                      <td className="px-3 py-3 text-gray-900">
                        <div className="font-medium">{row.unidad_nombre || '—'}</div>
                        <div className="text-xs text-gray-600">{row.placas || 'Sin placas'}</div>
                      </td>

                      <td className="px-3 py-3 text-gray-900">{row.tipo}</td>
                      <td className="px-3 py-3 text-right text-gray-900">{row.fotos_count || 0}</td>
                    </tr>
                  ))}

                  {chequeos.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-3 py-8 text-center text-gray-600">
                        Aún no tienes chequeos registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#07AE8B]/15 text-[#04745f]">
          {icon}
        </div>

        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-lg font-bold text-gray-950">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-bold text-gray-950">{value}</p>
    </div>
  );
}