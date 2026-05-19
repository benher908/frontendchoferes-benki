'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import { fmtMoney, fmtPercent, fmtDate } from '@/lib/formatters';

const MESES = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

export default function SupervisorDashboardPage() {
  const now = new Date();

  const [periodo, setPeriodo] = useState({
    anio: now.getFullYear(),
    mes: now.getMonth() + 1,
  });

  const [data, setData] = useState(null);
  const [verificaciones, setVerificaciones] = useState([]);
  const [error, setError] = useState('');

  async function cargar() {
    try {
      setError('');

      const [resumenRes, verificacionesRes] = await Promise.all([
        api.dashboardResumen(periodo.anio, periodo.mes),
        api.verificacionesProximas(60),
      ]);

      setData(resumenRes);
      setVerificaciones(verificacionesRes || []);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el dashboard');
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo.anio, periodo.mes]);

  return (
    <ProtectedRoute allowedRoles={['supervisor']}>
      <AppShell role="supervisor">
        <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-gray-500">
              Resumen general de choferes, unidades, chequeos, verificaciones e incentivos.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              value={periodo.anio}
              onChange={(e) =>
                setPeriodo({ ...periodo, anio: Number(e.target.value) })
              }
              className="w-24 rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
            />

            <select
              value={periodo.mes}
              onChange={(e) =>
                setPeriodo({ ...periodo, mes: Number(e.target.value) })
              }
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
            >
              {MESES.map((mes) => (
                <option key={mes.value} value={mes.value}>
                  {mes.label}
                </option>
              ))}
            </select>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card title="Choferes activos">
            <p className="text-3xl font-bold text-gray-950">
              {data?.totales?.choferes ?? '—'}
            </p>
          </Card>

          <Card title="Unidades activas">
            <p className="text-3xl font-bold text-gray-950">
              {data?.totales?.unidades ?? '—'}
            </p>
          </Card>

          <Card title="Chequeos hoy">
            <p className="text-3xl font-bold text-gray-950">
              {data?.totales?.chequeos_hoy ?? '—'}
            </p>
          </Card>
        </section>

        <section className="mt-6">
          <Card
            title="Verificaciones próximas"
            subtitle="Amarillo: faltan 20 días o menos. Rojo: faltan 5 días o menos, vencida o sin registro."
          >
            <VerificacionesTable rows={verificaciones} />
          </Card>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card
            title="Registros del mes"
            subtitle="Capturas usadas para calcular incentivos"
          >
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Rendimiento" value={data?.registros_mes?.rendimiento} />
              <Metric label="Puntualidad" value={data?.registros_mes?.puntualidad} />
              <Metric label="Servicio" value={data?.registros_mes?.servicio} />
              <Metric label="Limpieza" value={data?.registros_mes?.limpieza} />
            </div>
          </Card>

          <Card title="Incentivos" subtitle="Resumen mensual calculado">
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Calculados" value={data?.incentivos?.total_calculados} />
              <Metric
                label="Promedio"
                value={fmtPercent(data?.incentivos?.porcentaje_promedio || 0)}
              />
              <Metric
                label="Monto total"
                value={fmtMoney(data?.incentivos?.monto_total || 0)}
              />
            </div>
          </Card>
        </section>

        <section className="mt-6">
          <Card title="Top incentivos">
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-left text-sm text-gray-900">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200 text-gray-800">
                    <th className="px-3 py-3 font-semibold">Chofer</th>
                    <th className="px-3 py-3 font-semibold">Ruta</th>
                    <th className="px-3 py-3 text-right font-semibold">Porcentaje</th>
                    <th className="px-3 py-3 text-right font-semibold">Monto</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {(data?.incentivos?.top || []).map((item) => (
                    <tr key={item.chofer_id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium text-gray-950">
                        {item.chofer_nombre}
                      </td>

                      <td className="px-3 py-3 text-gray-900">
                        {item.ruta_nombre || '—'}
                      </td>

                      <td className="px-3 py-3 text-right text-gray-900">
                        {fmtPercent(Number(item.porcentaje || 0))}
                      </td>

                      <td className="px-3 py-3 text-right font-semibold text-gray-950">
                        {fmtMoney(item.monto)}
                      </td>
                    </tr>
                  ))}

                  {(data?.incentivos?.top || []).length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-3 py-8 text-center text-gray-600">
                        Todavía no hay incentivos calculados para este periodo.
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

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-gray-950">{value ?? '—'}</p>
    </div>
  );
}

function VerificacionesTable({ rows }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100">
      <div className="max-h-[330px] overflow-y-auto overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-900">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr className="border-b border-gray-200 text-gray-800">
              <th className="px-3 py-3 font-semibold">Unidad</th>
              <th className="px-3 py-3 font-semibold">Placas</th>
              <th className="px-3 py-3 font-semibold">Próxima verificación</th>
              <th className="px-3 py-3 text-center font-semibold">Estado</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((row) => (
              <tr
                key={`${row.unidad_id}-${row.verificacion_id || 'sin'}`}
                className={rowClass(row.dias_restantes)}
              >
                <td className="px-3 py-3 font-semibold text-gray-950">
                  {row.unidad_nombre}
                </td>

                <td className="px-3 py-3 text-gray-900">
                  {row.placas || 'Sin placas'}
                </td>

                <td className="px-3 py-3 font-medium text-gray-900">
                  {fmtDate(row.proxima_verificacion)}
                </td>

                <td className="px-3 py-3 text-center">
                  <EstadoVerificacion dias={row.dias_restantes} />
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan="4" className="px-3 py-8 text-center text-gray-600">
                  No hay verificaciones próximas en los siguientes 60 días.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 5 && (
        <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
          Mostrando 5 registros visibles. Desplázate para ver los demás.
        </div>
      )}
    </div>
  );
}

function rowClass(dias) {
  if (dias === null || dias === undefined) {
    return 'bg-red-50 hover:bg-red-100';
  }

  const n = Number(dias);

  if (n <= 5) {
    return 'bg-red-50 hover:bg-red-100';
  }

  if (n <= 20) {
    return 'bg-yellow-50 hover:bg-yellow-100';
  }

  return 'hover:bg-gray-50';
}

function EstadoVerificacion({ dias }) {
  if (dias === null || dias === undefined) {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-800">
        Sin registro
      </span>
    );
  }

  const n = Number(dias);

  if (n < 0) {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-800">
        Vencida
      </span>
    );
  }

  if (n <= 5) {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-800">
        {n} días
      </span>
    );
  }

  if (n <= 20) {
    return (
      <span className="inline-flex rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-bold text-yellow-800">
        {n} días
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
      {n} días
    </span>
  );
}