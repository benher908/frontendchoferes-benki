'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import { descargarExcelCombustibleDiario } from '@/lib/excel';
import { fmtDate, fmtMoney, todayMexicoInput } from '@/lib/formatters';

function today() {
  return todayMexicoInput();
}

const initialFiltros = {
  periodo: 'dia',
  fecha: today(),
  ruta_id: '',
  unidad_id: '',
  chofer_id: '',
};

export default function CombustiblePage() {
  const [filtros, setFiltros] = useState(initialFiltros);
  const [catalogos, setCatalogos] = useState({ rutas: [], unidades: [], choferes: [] });
  const [reporte, setReporte] = useState({ fecha: initialFiltros.fecha, periodo: initialFiltros.periodo, rows: [], resumen: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function cargar() {
    try {
      setLoading(true);
      setError('');

      const [catalogosRes, reporteRes] = await Promise.all([
        api.catalogos(),
        api.reporteCombustibleDiario(filtros),
      ]);

      setCatalogos({
        rutas: catalogosRes?.rutas || [],
        unidades: catalogosRes?.unidades || [],
        choferes: catalogosRes?.choferes || [],
      });
      setReporte(reporteRes || { fecha: filtros.fecha, periodo: filtros.periodo, rows: [], resumen: null });
    } catch (err) {
      setError(err.message || 'No se pudo cargar el reporte de combustible');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function consultar(e) {
    e?.preventDefault?.();
    await cargar();
  }

  function exportar() {
    descargarExcelCombustibleDiario({
      fecha: reporte.fecha,
      periodo: reporte.periodo || filtros.periodo,
      rows: reporte.rows || [],
    });
  }

  return (
    <ProtectedRoute allowedRoles={['supervisor']}>
      <AppShell role="supervisor">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Combustible</h1>
          <p className="mt-1 text-gray-500">
            Consulta el concentrado de combustible por dia, semana o mes con el formato operativo por unidad.
          </p>
        </header>

        {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <MetricCard title="Registros" value={reporte.resumen?.total_registros || 0} />
          <MetricCard title="KM recorridos" value={reporte.resumen?.total_km_recorridos || 0} />
          <MetricCard title="Litros cargados" value={Number(reporte.resumen?.total_litros_cargados || 0).toFixed(3)} />
          <MetricCard title="Total combustible" value={fmtMoney(reporte.resumen?.total_combustible || 0)} />
        </section>

        <section className="grid gap-5">
          <Card title="Filtros" subtitle="La consulta usa la fecha como base y permite concentrado por dia, semana o mes.">
            <form onSubmit={consultar} className="grid gap-4 lg:grid-cols-6">
              <Select
                label="Periodo"
                value={filtros.periodo}
                onChange={(value) => setFiltros({ ...filtros, periodo: value })}
                options={[
                  { id: 'dia', nombre: 'Dia' },
                  { id: 'semana', nombre: 'Semana' },
                  { id: 'mes', nombre: 'Mes' },
                ]}
              />
              <Input label="Fecha" type="date" value={filtros.fecha} onChange={(value) => setFiltros({ ...filtros, fecha: value })} />
              <Select label="Ruta" value={filtros.ruta_id} onChange={(value) => setFiltros({ ...filtros, ruta_id: value })} options={catalogos.rutas} />
              <Select label="Unidad" value={filtros.unidad_id} onChange={(value) => setFiltros({ ...filtros, unidad_id: value })} options={catalogos.unidades} getLabel={(item) => `${item.nombre} - ${item.placas}`} />
              <Select label="Chofer" value={filtros.chofer_id} onChange={(value) => setFiltros({ ...filtros, chofer_id: value })} options={catalogos.choferes} />
              <div className="flex items-end gap-2">
                <button type="submit" className="flex-1 rounded-xl bg-[#F54927] px-4 py-3 text-sm font-semibold text-white hover:bg-[#F26449]">
                  Consultar
                </button>
                <button type="button" onClick={exportar} className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                  Exportar Excel
                </button>
              </div>
            </form>
          </Card>

          <Card title={tituloReporte(reporte.periodo, reporte.fecha)} subtitle="Se alimenta del rendimiento diario ya capturado en operacion.">
            {loading ? (
              <p className="py-8 text-center text-gray-600">Cargando reporte...</p>
            ) : (
              <TablaCombustible rows={reporte.rows || []} />
            )}
          </Card>
        </section>
      </AppShell>
    </ProtectedRoute>
  );
}

function MetricCard({ title, value }) {
  return (
    <Card>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-gray-950">{value}</p>
    </Card>
  );
}

function tituloReporte(periodo, fecha) {
  if (periodo === 'mes') return `Reporte del mes de ${fmtDate(fecha)}`;
  if (periodo === 'semana') return `Reporte semanal con base en ${fmtDate(fecha)}`;
  return `Reporte del ${fmtDate(fecha)}`;
}

function TablaCombustible({ rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-left text-sm text-gray-900">
        <thead className="bg-gray-50">
          <tr className="border-b border-gray-200 text-gray-800">
            <th className="px-3 py-3 font-semibold">FECHA</th>
            <th className="px-3 py-3 font-semibold">UNIDAD</th>
            <th className="px-3 py-3 text-right font-semibold">KM.I</th>
            <th className="px-3 py-3 text-right font-semibold">KM.F</th>
            <th className="px-3 py-3 text-right font-semibold">KM.R</th>
            <th className="px-3 py-3 text-right font-semibold">PRECIO UNITARIO</th>
            <th className="px-3 py-3 text-right font-semibold">LITROS</th>
            <th className="px-3 py-3 text-right font-semibold">TOTAL</th>
            <th className="px-3 py-3 text-right font-semibold">CASETAS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="px-3 py-3">{fmtDate(row.fecha)}</td>
              <td className="px-3 py-3">
                <div className="font-medium">{row.unidad_nombre}</div>
                <div className="text-xs text-gray-600">{row.placas || 'Sin placas'}</div>
              </td>
              <td className="px-3 py-3 text-right">{row.km_inicial}</td>
              <td className="px-3 py-3 text-right">{row.km_final}</td>
              <td className="px-3 py-3 text-right">{row.km_recorridos}</td>
              <td className="px-3 py-3 text-right">{fmtMoney(row.precio_litro || 0)}</td>
              <td className="px-3 py-3 text-right">{Number(row.litros_consumidos || row.litros || 0).toFixed(3)}</td>
              <td className="px-3 py-3 text-right font-semibold">{fmtMoney(row.total_combustible || 0)}</td>
              <td className="px-3 py-3 text-right">{fmtMoney(row.casetas || 0)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan="9" className="px-3 py-8 text-center text-gray-600">
                No hay registros para esta consulta.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Input({ label, value, onChange, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
      />
    </label>
  );
}

function Select({ label, value, onChange, options, getLabel = (item) => item.nombre }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
      >
        <option value="">Todas</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {getLabel(item)}
          </option>
        ))}
      </select>
    </label>
  );
}
