'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import { fmtMoney, fmtDateTime } from '@/lib/formatters';
import { RefreshCcw, Search, Eye, Download } from 'lucide-react';
import { descargarExcelIncentivos } from '@/lib/excel';

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

function currentPeriodo() {
  const now = new Date();

  return {
    anio: now.getFullYear(),
    mes: now.getMonth() + 1,
  };
}

function fmtPercentFromScore(score) {
  return `${(Number(score || 0) * 100).toFixed(2)}%`;
}

const SCORE_MINIMO_INCENTIVO = 0.8;

export default function IncentivosPage() {
  const [periodo, setPeriodo] = useState(currentPeriodo());
  const [rows, setRows] = useState([]);
  const [preview, setPreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resumen = useMemo(() => {
    const totalChoferes = rows.length;
    const montoTotal = rows.reduce((sum, item) => sum + Number(item.monto || 0), 0);
    const promedio =
      totalChoferes > 0
        ? rows.reduce((sum, item) => sum + Number(item.score_total || 0), 0) / totalChoferes
        : 0;

    const mejor = rows[0] || null;

    return {
      totalChoferes,
      montoTotal,
      promedio,
      mejor,
    };
  }, [rows]);

  async function cargar() {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const data = await api.incentivos(periodo.anio, periodo.mes);
      setRows(data.incentivos || []);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los incentivos');
    } finally {
      setLoading(false);
    }
  }

  async function recalcular() {
    try {
      setRecalculando(true);
      setError('');
      setSuccess('');
      setPreview(null);

      const data = await api.recalcularIncentivos({
        anio: periodo.anio,
        mes: periodo.mes,
      });

      setSuccess(`Incentivos recalculados correctamente. Choferes procesados: ${data.total}`);
      await cargar();
    } catch (err) {
      setError(err.message || 'No se pudieron recalcular los incentivos');
    } finally {
      setRecalculando(false);
    }
  }

  async function verDetalle(choferId) {
    try {
      setError('');
      const data = await api.previewIncentivoChofer(choferId, periodo.anio, periodo.mes);
      setPreview(data);
    } catch (err) {
      setError(err.message || 'No se pudo obtener el detalle');
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
        <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Incentivos</h1>
            <p className="mt-1 text-gray-500">
              Consulta y recalcula el progreso mensual de incentivos por chofer.
            </p>
            <p className="mt-2 text-sm font-medium text-amber-700">
              Los choferes con menos de 80% no generan incentivo.
            </p>
          </div>

          <div className="grid w-full gap-2 sm:grid-cols-2 xl:flex xl:w-auto xl:flex-wrap">
            <select
              value={periodo.mes}
              onChange={(e) => setPeriodo({ ...periodo, mes: Number(e.target.value) })}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10 xl:w-auto"
            >
              {MESES.map((mes) => (
                <option key={mes.value} value={mes.value}>
                  {mes.label}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={periodo.anio}
              onChange={(e) => setPeriodo({ ...periodo, anio: Number(e.target.value) })}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10 sm:w-28"
            />
            <button
              type="button"
              onClick={() =>
                descargarExcelIncentivos({
                  rows,
                  periodo,
                })
              }
              disabled={rows.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 xl:w-auto"
            >
              <Download size={16} />
              Descargar Excel
            </button>

            <button
              onClick={cargar}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60 xl:w-auto"
            >
              <Search size={16} />
              Consultar
            </button>

            <button
              onClick={recalcular}
              disabled={recalculando}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F54927] px-4 py-2 text-sm font-semibold text-white hover:bg-[#F7674A] disabled:opacity-60 xl:w-auto"
            >
              <RefreshCcw size={16} />
              {recalculando ? 'Recalculando...' : 'Recalcular'}
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card title="Choferes calculados">
            <p className="text-3xl font-bold text-gray-950">{resumen.totalChoferes}</p>
          </Card>

          <Card title="Promedio general">
            <p className="text-3xl font-bold text-gray-950">
              {fmtPercentFromScore(resumen.promedio)}
            </p>
          </Card>

          <Card title="Monto total">
            <p className="text-3xl font-bold text-gray-950">
              {fmtMoney(resumen.montoTotal)}
            </p>
          </Card>

          <Card title="Mejor resultado">
            <p className="text-lg font-bold text-gray-950">
              {resumen.mejor?.chofer_nombre || '—'}
            </p>
            <p className="mt-1 text-sm font-semibold text-[#07AE8B]">
              {resumen.mejor ? fmtPercentFromScore(resumen.mejor.score_total) : '—'}
            </p>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_390px]">
          <Card
            title="Tabla mensual de incentivos"
            subtitle="El porcentaje total se calcula con rendimiento 15%, puntualidad 15%, servicio 30%, limpieza 20% y chequeos diarios 20%."
          >
            {loading ? (
              <p className="py-8 text-center text-gray-600">Cargando incentivos...</p>
            ) : (
              <IncentivosTable rows={rows} onPreview={verDetalle} />
            )}
          </Card>

          <Card
            title="Detalle del chofer"
            subtitle="Vista previa del cálculo sin guardar cambios."
          >
            {preview ? (
              <DetallePreview data={preview} />
            ) : (
              <div className="rounded-2xl bg-gray-50 p-5 text-sm text-gray-600">
                Selecciona un chofer de la tabla para ver el desglose por rubro.
              </div>
            )}
          </Card>
        </section>
      </AppShell>
    </ProtectedRoute>
  );
}

function IncentivosTable({ rows, onPreview }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-left text-sm text-gray-900">
        <thead className="bg-gray-50">
          <tr className="border-b border-gray-200 text-gray-800">
            <th className="px-3 py-3 font-semibold">Chofer</th>
            <th className="px-3 py-3 font-semibold">Ruta</th>
            <th className="px-3 py-3 text-center font-semibold">Días</th>
            <th className="px-3 py-3 text-center font-semibold">Rend.</th>
            <th className="px-3 py-3 text-center font-semibold">Punt.</th>
            <th className="px-3 py-3 text-center font-semibold">Serv.</th>
            <th className="px-3 py-3 text-center font-semibold">Limp.</th>
            <th className="px-3 py-3 text-center font-semibold">Checks</th>
            <th className="px-3 py-3 text-center font-semibold">Total</th>
            <th className="px-3 py-3 text-right font-semibold">Monto</th>
            <th className="px-3 py-3 text-center font-semibold">Detalle</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row) => (
            <tr key={row.id || row.chofer_id} className="hover:bg-gray-50">
              <td className="px-3 py-3">
                <div className="font-semibold text-gray-950">{row.chofer_nombre}</div>
                <div className="text-xs text-gray-600">
                  Calculado: {fmtDateTime(row.calculado_at)}
                </div>
              </td>

              <td className="px-3 py-3 text-gray-900">{row.ruta_nombre || '—'}</td>

              <td className="px-3 py-3 text-center text-gray-900">
                {row.dias_trabajados || 0}
              </td>

              <td className="px-3 py-3 text-center">
                {fmtPercentFromScore(row.score_rendimiento)}
              </td>

              <td className="px-3 py-3 text-center">
                {fmtPercentFromScore(row.score_puntualidad)}
              </td>

              <td className="px-3 py-3 text-center">
                {fmtPercentFromScore(row.score_servicio)}
              </td>

              <td className="px-3 py-3 text-center">
                {fmtPercentFromScore(row.score_limpieza)}
              </td>

              <td className="px-3 py-3 text-center">
                {fmtPercentFromScore(row.score_chequeos)}
              </td>

              <td className="px-3 py-3 text-center">
                <span className={badgeClass(row.score_total)}>
                  {fmtPercentFromScore(row.score_total)}
                </span>
              </td>

              <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-gray-950">
                <div>{fmtMoney(row.monto)}</div>
                {Number(row.score_total || 0) < SCORE_MINIMO_INCENTIVO && (
                  <div className="text-xs font-medium text-rose-600">Bloqueado por bajo desempeño</div>
                )}
              </td>

              <td className="px-3 py-3 text-center">
                <button
                  onClick={() => onPreview(row.chofer_id)}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-700 hover:bg-gray-100"
                  title="Ver detalle"
                >
                  <Eye size={16} />
                </button>
              </td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td colSpan="11" className="px-3 py-10 text-center text-gray-600">
                No hay incentivos calculados para este periodo. Presiona "Recalcular".
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DetallePreview({ data }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gray-50 p-4">
        <p className="text-sm text-gray-600">Chofer</p>
        <p className="font-bold text-gray-950">{data.chofer_nombre}</p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <MiniMetric label="Total" value={`${data.porcentaje}%`} />
          <MiniMetric label="Monto" value={fmtMoney(data.monto)} />
        </div>
        {Number(data.score_total || 0) < SCORE_MINIMO_INCENTIVO && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            Este chofer no genera incentivo porque su resultado quedó por debajo del 80%.
          </div>
        )}
      </div>

      <Rubro
        title="Rendimiento"
        peso="15%"
        score={data.rendimiento?.score}
        aporte={data.rendimiento?.aporte}
        detail={`${data.rendimiento?.cumplidos || 0} de ${data.rendimiento?.dias || 0} días cumplieron`}
      />

      <Rubro
        title="Puntualidad"
        peso="15%"
        score={data.puntualidad?.score}
        aporte={data.puntualidad?.aporte}
        detail={`${data.puntualidad?.a_tiempo || 0} de ${data.puntualidad?.dias || 0} salidas a tiempo`}
      />

      <Rubro
        title="Servicio"
        peso="30%"
        score={data.servicio?.score}
        aporte={data.servicio?.aporte}
        detail={
          data.servicio?.origen === 'encuestas'
            ? `${data.servicio?.respuestas || 0} respuestas de encuesta en el mes`
            : `${data.servicio?.incidencias_total || 0} incidencias en el mes`
        }
      />

      <Rubro
        title="Limpieza y cuidado"
        peso="20%"
        score={data.limpieza?.score}
        aporte={data.limpieza?.aporte}
        detail={`${data.limpieza?.dias_penalizados_total || 0} días con penalización total y ${data.limpieza?.dias_sin_registro || 0} días sin registro`}
      />

      <Rubro
        title="Chequeos diarios"
        peso="20%"
        score={data.chequeos?.score}
        aporte={data.chequeos?.aporte}
        detail={`${data.chequeos?.dias_con_chequeo || 0} de ${data.chequeos?.dias || 0} días con chequeo`}
      />
    </div>
  );
}
function Rubro({ title, peso, score, aporte, detail }) {
  return (
    <div className="rounded-2xl border border-gray-100 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-950">{title}</p>
          <p className="text-xs text-gray-500">Peso: {peso}</p>
        </div>

        <span className={badgeClass(score)}>
          {fmtPercentFromScore(score)}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-[#07AE8B]"
          style={{ width: `${Math.min(100, Number(score || 0) * 100)}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-gray-600">{detail}</span>
        <span className="font-semibold text-gray-900">
          Aporte: {fmtPercentFromScore(aporte)}
        </span>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 font-bold text-gray-950">{value}</p>
    </div>
  );
}

function badgeClass(score) {
  const value = Number(score || 0);

  if (value >= 0.85) {
    return 'inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800';
  }

  if (value >= 0.65) {
    return 'inline-flex rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-bold text-yellow-800';
  }

  return 'inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-800';
}

