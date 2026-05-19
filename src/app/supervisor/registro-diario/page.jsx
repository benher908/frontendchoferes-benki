'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import { fmtMoney, fmtDate } from '@/lib/formatters';

const tabs = [
  { id: 'rendimiento', label: 'Rendimiento' },
  { id: 'puntualidad', label: 'Puntualidad' },
  { id: 'servicio', label: 'Servicio' },
  { id: 'limpieza', label: 'Limpieza y cuidado' },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

const initialRendimiento = {
  fecha: today(),
  chofer_id: '',
  unidad_id: '',
  ruta_id: '',
  km_inicial: '',
  km_final: '',
  litros: '',
  precio_litro: '',
  total_mercancia: '',
  casetas: '',
  notas: '',
};

const initialPuntualidad = {
  fecha: today(),
  chofer_id: '',
  ruta_id: '',
  hora_programada: '06:00:00',
  hora_salida_real: '',
  tolerancia_minutos: 20,
  notas: '',
};

const initialServicio = {
  fecha: today(),
  chofer_id: '',
  ruta_id: '',
  clientes_esperados: '',
  clientes_visitados: '',
  incidencias: 0,
  comentarios: '',
};

const initialLimpieza = {
  fecha: today(),
  chofer_id: '',
  unidad_id: '',
  lavada_semana: false,
  reporto_falla: false,
  detalle_falla: '',
  mantenimiento_realizado: true,
  mantenimiento_a_tiempo: true,
  notas: '',
};

export default function RegistroDiarioPage() {
  const [activeTab, setActiveTab] = useState('rendimiento');
  const [catalogos, setCatalogos] = useState({
    choferes: [],
    unidades: [],
    rutas: [],
  });

  const [rendimiento, setRendimiento] = useState(initialRendimiento);
  const [puntualidad, setPuntualidad] = useState(initialPuntualidad);
  const [servicio, setServicio] = useState(initialServicio);
  const [limpieza, setLimpieza] = useState(initialLimpieza);

  const [historial, setHistorial] = useState({
    rendimiento: [],
    puntualidad: [],
    servicio: [],
    limpieza: [],
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function cargarTodo() {
    try {
      setLoading(true);
      setError('');

      const [
        catalogosRes,
        rendimientoRes,
        puntualidadRes,
        servicioRes,
        limpiezaRes,
      ] = await Promise.all([
        api.catalogos(),
        api.listarRendimiento(),
        api.listarPuntualidad(),
        api.listarServicio(),
        api.listarLimpieza(),
      ]);

      setCatalogos({
        choferes: catalogosRes.choferes || [],
        unidades: catalogosRes.unidades || [],
        rutas: catalogosRes.rutas || [],
      });

      setHistorial({
        rendimiento: rendimientoRes || [],
        puntualidad: puntualidadRes || [],
        servicio: servicioRes || [],
        limpieza: limpiezaRes || [],
      });
    } catch (err) {
      setError(err.message || 'No se pudo cargar la información');
    } finally {
      setLoading(false);
    }
  }

  function rutasDelChofer(choferId) {
    const chofer = catalogos.choferes.find(
      (c) => String(c.id) === String(choferId)
    );

    const rutasIds = Array.isArray(chofer?.rutas_ids)
      ? chofer.rutas_ids.map(Number)
      : [];

    if (rutasIds.length === 0) {
      return catalogos.rutas;
    }

    return catalogos.rutas.filter((ruta) =>
      rutasIds.includes(Number(ruta.id))
    );
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarTodo();
  }, []);

  async function cargarUltimoKm(unidadId) {
    if (!unidadId) return;

    try {
      const res = await api.ultimoKmUnidad(unidadId);
      setRendimiento((prev) => ({
        ...prev,
        km_inicial: res.kilometraje ?? '',
      }));
    } catch {
      // No bloqueamos el formulario si falla el autollenado.
    }
  }

  async function guardarRendimiento(e) {
    e.preventDefault();
    setSaving('rendimiento');
    setError('');
    setSuccess('');

    try {
      await api.crearRendimiento({
        ...rendimiento,
        chofer_id: Number(rendimiento.chofer_id),
        unidad_id: Number(rendimiento.unidad_id),
        ruta_id: Number(rendimiento.ruta_id),
        km_inicial: Number(rendimiento.km_inicial),
        km_final: Number(rendimiento.km_final),
        litros: Number(rendimiento.litros || 0),
        precio_litro: rendimiento.precio_litro === '' ? null : Number(rendimiento.precio_litro),
        total_mercancia: Number(rendimiento.total_mercancia || 0),
        casetas: Number(rendimiento.casetas || 0),
      });

      setSuccess('Rendimiento guardado correctamente');
      setRendimiento(initialRendimiento);
      await cargarTodo();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving('');
    }
  }

  async function guardarPuntualidad(e) {
    e.preventDefault();
    setSaving('puntualidad');
    setError('');
    setSuccess('');

    try {
      await api.crearPuntualidad({
        ...puntualidad,
        chofer_id: Number(puntualidad.chofer_id),
        ruta_id: Number(puntualidad.ruta_id),
        tolerancia_minutos: Number(puntualidad.tolerancia_minutos || 20),
      });

      setSuccess('Puntualidad guardada correctamente');
      setPuntualidad(initialPuntualidad);
      await cargarTodo();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving('');
    }
  }

  async function guardarServicio(e) {
    e.preventDefault();
    setSaving('servicio');
    setError('');
    setSuccess('');

    try {
      await api.crearServicio({
        ...servicio,
        chofer_id: Number(servicio.chofer_id),
        ruta_id: Number(servicio.ruta_id),
        clientes_esperados: Number(servicio.clientes_esperados || 0),
        clientes_visitados: Number(servicio.clientes_visitados || 0),
        incidencias: Number(servicio.incidencias || 0),
      });

      setSuccess('Servicio guardado correctamente');
      setServicio(initialServicio);
      await cargarTodo();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving('');
    }
  }

  async function guardarLimpieza(e) {
    e.preventDefault();
    setSaving('limpieza');
    setError('');
    setSuccess('');

    try {
      await api.crearLimpieza({
        ...limpieza,
        chofer_id: Number(limpieza.chofer_id),
        unidad_id: Number(limpieza.unidad_id),
      });

      setSuccess('Limpieza y cuidado guardado correctamente');
      setLimpieza(initialLimpieza);
      await cargarTodo();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving('');
    }
  }

  return (
    <ProtectedRoute allowedRoles={['supervisor']}>
      <AppShell role="supervisor">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Registro diario</h1>
          <p className="mt-1 text-gray-500">
            Captura diaria para calcular rendimiento, puntualidad, servicio y limpieza.
          </p>
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

        <div className="mb-5 flex flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === tab.id
                ? 'bg-[#F54927] text-white'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <Card>
            <p className="text-gray-500">Cargando información...</p>
          </Card>
        ) : (
          <>
            {activeTab === 'rendimiento' && (
              <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
                <Card title="Capturar rendimiento" subtitle="Kilometraje, combustible y mercancía por ruta.">
                  <form onSubmit={guardarRendimiento} className="space-y-4">
                    <Input
                      label="Fecha"
                      type="date"
                      value={rendimiento.fecha}
                      onChange={(v) => setRendimiento({ ...rendimiento, fecha: v })}
                    />

                    <Select
                      label="Chofer"
                      value={rendimiento.chofer_id}
                      onChange={(v) => setRendimiento({ ...rendimiento, chofer_id: v, ruta_id: '' })}
                      options={catalogos.choferes}
                      getLabel={(x) => `${x.nombre}${x.ruta_nombre ? ` - ${x.ruta_nombre}` : ''}`}
                    />

                    <Select
                      label="Unidad"
                      value={rendimiento.unidad_id}
                      onChange={(v) => {
                        setRendimiento({ ...rendimiento, unidad_id: v });
                        cargarUltimoKm(v);
                      }}
                      options={catalogos.unidades}
                      getLabel={(x) => `${x.nombre} - ${x.placas}`}
                    />

                    <Select
                      label="Ruta"
                      value={rendimiento.ruta_id}
                      onChange={(v) => setRendimiento({ ...rendimiento, ruta_id: v })}
                      options={rutasDelChofer(rendimiento.chofer_id)}
                      getLabel={(x) => `${x.nombre} (${x.km_por_litro_objetivo || 'sin factor'} km/l)`}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Km inicial" type="number" value={rendimiento.km_inicial} onChange={(v) => setRendimiento({ ...rendimiento, km_inicial: v })} />
                      <Input label="Km final" type="number" value={rendimiento.km_final} onChange={(v) => setRendimiento({ ...rendimiento, km_final: v })} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Litros" type="number" step="0.01" value={rendimiento.litros} onChange={(v) => setRendimiento({ ...rendimiento, litros: v })} />
                      <Input label="Precio litro" type="number" step="0.01" value={rendimiento.precio_litro} onChange={(v) => setRendimiento({ ...rendimiento, precio_litro: v })} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Mercancía $" type="number" step="0.01" value={rendimiento.total_mercancia} onChange={(v) => setRendimiento({ ...rendimiento, total_mercancia: v })} />
                      <Input label="Casetas $" type="number" step="0.01" value={rendimiento.casetas} onChange={(v) => setRendimiento({ ...rendimiento, casetas: v })} />
                    </div>

                    <Textarea
                      label="Notas"
                      value={rendimiento.notas}
                      onChange={(v) => setRendimiento({ ...rendimiento, notas: v })}
                    />

                    <Button loading={saving === 'rendimiento'}>Guardar rendimiento</Button>
                  </form>
                </Card>

                <RendimientoTable rows={historial.rendimiento} />
              </section>
            )}

            {activeTab === 'puntualidad' && (
              <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
                <Card title="Capturar puntualidad" subtitle="Salida programada contra salida real.">
                  <form onSubmit={guardarPuntualidad} className="space-y-4">
                    <Input label="Fecha" type="date" value={puntualidad.fecha} onChange={(v) => setPuntualidad({ ...puntualidad, fecha: v })} />
                    <Select
                      label="Chofer"
                      value={puntualidad.chofer_id}
                      onChange={(v) =>
                        setPuntualidad({
                          ...puntualidad,
                          chofer_id: v,
                          ruta_id: '',
                        })
                      }
                      options={catalogos.choferes}
                      getLabel={(x) => `${x.nombre}${x.ruta_nombre ? ` - ${x.ruta_nombre}` : ''}`}
                    />
                    <Select
                      label="Ruta"
                      value={puntualidad.ruta_id}
                      onChange={(v) => setPuntualidad({ ...puntualidad, ruta_id: v })}
                      options={rutasDelChofer(puntualidad.chofer_id)}
                      getLabel={(x) => x.nombre}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Hora programada" type="time" value={puntualidad.hora_programada} onChange={(v) => setPuntualidad({ ...puntualidad, hora_programada: v })} />
                      <Input label="Hora salida real" type="time" value={puntualidad.hora_salida_real} onChange={(v) => setPuntualidad({ ...puntualidad, hora_salida_real: v })} />
                    </div>

                    <Input label="Tolerancia minutos" type="number" value={puntualidad.tolerancia_minutos} onChange={(v) => setPuntualidad({ ...puntualidad, tolerancia_minutos: v })} />
                    <Textarea label="Notas" value={puntualidad.notas} onChange={(v) => setPuntualidad({ ...puntualidad, notas: v })} />

                    <Button loading={saving === 'puntualidad'}>Guardar puntualidad</Button>
                  </form>
                </Card>

                <SimpleTable
                  title="Historial de puntualidad"
                  rows={historial.puntualidad}
                  columns={[
                    ['fecha', 'Fecha'],
                    ['chofer_nombre', 'Chofer'],
                    ['ruta_nombre', 'Ruta'],
                    ['hora_programada', 'Programada'],
                    ['hora_salida_real', 'Real'],
                    ['a_tiempo', 'A tiempo'],
                  ]}
                />
              </section>
            )}

            {activeTab === 'servicio' && (
              <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
                <Card title="Capturar servicio" subtitle="Clientes esperados, visitados e incidencias.">
                  <form onSubmit={guardarServicio} className="space-y-4">
                    <Input label="Fecha" type="date" value={servicio.fecha} onChange={(v) => setServicio({ ...servicio, fecha: v })} />
                    <Select
                      label="Chofer"
                      value={servicio.chofer_id}
                      onChange={(v) =>
                        setServicio({
                          ...servicio,
                          chofer_id: v,
                          ruta_id: '',
                        })
                      }
                      options={catalogos.choferes}
                      getLabel={(x) => `${x.nombre}${x.ruta_nombre ? ` - ${x.ruta_nombre}` : ''}`}
                    />
                    <Select
                      label="Ruta"
                      value={servicio.ruta_id}
                      onChange={(v) => setServicio({ ...servicio, ruta_id: v })}
                      options={rutasDelChofer(servicio.chofer_id)}
                      getLabel={(x) => x.nombre}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Clientes esperados" type="number" value={servicio.clientes_esperados} onChange={(v) => setServicio({ ...servicio, clientes_esperados: v })} />
                      <Input label="Clientes visitados" type="number" value={servicio.clientes_visitados} onChange={(v) => setServicio({ ...servicio, clientes_visitados: v })} />
                    </div>

                    <Input label="Incidencias" type="number" min="0" value={servicio.incidencias} onChange={(v) => setServicio({ ...servicio, incidencias: v })} />
                    <Textarea label="Comentarios" value={servicio.comentarios} onChange={(v) => setServicio({ ...servicio, comentarios: v })} />

                    <Button loading={saving === 'servicio'}>Guardar servicio</Button>
                  </form>
                </Card>

                <SimpleTable
                  title="Historial de servicio"
                  rows={historial.servicio}
                  columns={[
                    ['fecha', 'Fecha'],
                    ['chofer_nombre', 'Chofer'],
                    ['ruta_nombre', 'Ruta'],
                    ['clientes_esperados', 'Esperados'],
                    ['clientes_visitados', 'Visitados'],
                    ['incidencias', 'Incidencias'],
                  ]}
                />
              </section>
            )}

            {activeTab === 'limpieza' && (
              <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
                <Card title="Capturar limpieza y cuidado" subtitle="Lavado, fallas y mantenimiento de unidad.">
                  <form onSubmit={guardarLimpieza} className="space-y-4">
                    <Input label="Fecha" type="date" value={limpieza.fecha} onChange={(v) => setLimpieza({ ...limpieza, fecha: v })} />
                    <Select label="Chofer" value={limpieza.chofer_id} onChange={(v) => setLimpieza({ ...limpieza, chofer_id: v })} options={catalogos.choferes} getLabel={(x) => x.nombre} />
                    <Select label="Unidad" value={limpieza.unidad_id} onChange={(v) => setLimpieza({ ...limpieza, unidad_id: v })} options={catalogos.unidades} getLabel={(x) => `${x.nombre} - ${x.placas}`} />

                    <Check label="Unidad lavada esta semana" checked={limpieza.lavada_semana} onChange={(v) => setLimpieza({ ...limpieza, lavada_semana: v })} />
                    <Check label="Chofer/supervisor reportó falla" checked={limpieza.reporto_falla} onChange={(v) => setLimpieza({ ...limpieza, reporto_falla: v })} />

                    {limpieza.reporto_falla && (
                      <Textarea label="Detalle de falla" value={limpieza.detalle_falla} onChange={(v) => setLimpieza({ ...limpieza, detalle_falla: v })} />
                    )}

                    <Check label="Mantenimiento realizado" checked={limpieza.mantenimiento_realizado} onChange={(v) => setLimpieza({ ...limpieza, mantenimiento_realizado: v })} />
                    <Check label="Mantenimiento a tiempo" checked={limpieza.mantenimiento_a_tiempo} onChange={(v) => setLimpieza({ ...limpieza, mantenimiento_a_tiempo: v })} />

                    <Textarea label="Notas" value={limpieza.notas} onChange={(v) => setLimpieza({ ...limpieza, notas: v })} />

                    <Button loading={saving === 'limpieza'}>Guardar limpieza</Button>
                  </form>
                </Card>

                <SimpleTable
                  title="Historial de limpieza y cuidado"
                  rows={historial.limpieza}
                  columns={[
                    ['fecha', 'Fecha'],
                    ['chofer_nombre', 'Chofer'],
                    ['unidad_nombre', 'Unidad'],
                    ['lavada_semana', 'Lavada'],
                    ['reporto_falla', 'Reportó falla'],
                    ['mantenimiento_a_tiempo', 'Mant. a tiempo'],
                  ]}
                />
              </section>
            )}
          </>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

async function apiFetchLocal(path) {
  const { apiFetch } = await import('@/lib/api');
  return apiFetch(path);
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

function Select({ label, value, onChange, options, getLabel }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
      >
        <option value="">Seleccionar...</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {getLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
      />
    </label>
  );
}

function Check({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 accent-[#07AE8B]"
      />
      {label}
    </label>
  );
}

function Button({ children, loading }) {
  return (
    <button
      disabled={loading}
      className="w-full rounded-xl bg-[#F54927] px-4 py-3 text-sm font-semibold text-white hover:bg-[#F26449] disabled:opacity-60"
    >
      {loading ? 'Guardando...' : children}
    </button>
  );
}

function RendimientoTable({ rows }) {
  return (
    <Card title="Historial de rendimiento">
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-left text-sm text-gray-900">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200 text-gray-800">
              <th className="px-3 py-3 font-semibold">Fecha</th>
              <th className="px-3 py-3 font-semibold">Chofer</th>
              <th className="px-3 py-3 font-semibold">Unidad</th>
              <th className="px-3 py-3 font-semibold">Ruta</th>
              <th className="px-3 py-3 text-right font-semibold">Km</th>
              <th className="px-3 py-3 text-right font-semibold">Litros</th>
              <th className="px-3 py-3 text-right font-semibold">Mercancía</th>
              <th className="px-3 py-3 text-center font-semibold">Cumple km/l objetivo</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-3 py-3 text-gray-900">
                  {fmtDate(r.fecha)}
                </td>

                <td className="px-3 py-3 font-medium text-gray-950">
                  {r.chofer_nombre}
                </td>

                <td className="px-3 py-3 text-gray-900">
                  <div className="font-medium">{r.unidad_nombre}</div>
                  <div className="text-xs text-gray-600">{r.placas || 'Sin placas'}</div>
                </td>

                <td className="whitespace-nowrap px-3 py-3 text-gray-900">
                  {r.ruta_nombre}
                </td>

                <td className="whitespace-nowrap px-3 py-3 text-right text-gray-900">
                  <div>{r.km_inicial}</div>
                  <div className="text-xs text-gray-600">a {r.km_final}</div>
                </td>

                <td className="whitespace-nowrap px-3 py-3 text-right text-gray-900">
                  {r.litros}
                </td>

                <td className="whitespace-nowrap px-3 py-3 text-right text-gray-900">
                  {fmtMoney(r.total_mercancia)}
                </td>

                <td className="whitespace-nowrap px-3 py-3 text-center">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${r.cumple_objetivo
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                      }`}
                  >
                    {r.cumple_objetivo ? 'Sí' : 'No'}
                  </span>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan="8" className="px-3 py-8 text-center text-gray-700">
                  Sin registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SimpleTable({ title, rows, columns }) {
  return (
    <Card title={title}>
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-left text-sm text-gray-900">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200 text-gray-800">
              {columns.map(([key, label]) => (
                <th key={key} className="px-3 py-3 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                {columns.map(([key]) => (
                  <td key={key} className="px-3 py-3 text-gray-900">
                    {formatCell(row[key])}
                  </td>
                ))}
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-gray-700">
                  Sin registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function formatCell(value) {
  if (value === true || value === 1) return 'Sí';
  if (value === false || value === 0) return 'No';
  if (!value) return '—';

  const str = String(value);

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return fmtDate(str);

  return str;
}