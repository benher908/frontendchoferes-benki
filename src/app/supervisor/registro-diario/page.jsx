'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import { fmtMoney, fmtDate, fmtDateTime, todayMexicoInput } from '@/lib/formatters';

const tabs = [
  { id: 'rendimiento', label: 'Rendimiento' },
  { id: 'puntualidad', label: 'Puntualidad' },
  { id: 'servicio', label: 'Servicio de entrega' },
  { id: 'limpieza', label: 'Limpieza y cuidado' },
];

function today() {
  return todayMexicoInput();
}

const initialRendimiento = {
  fecha: today(),
  chofer_id: '',
  unidad_id: '',
  ruta_id: '',
  km_inicial: '',
  km_final: '',
  litros_encontrados: '',
  litros: '',
  litros_dejados: '',
  precio_litro: '',
  total_mercancia: '',
  casetas: '',
  notas: '',
};

const initialServicio = {
  fecha: today(),
  chofer_id: '',
  ruta_id: '',
};

const initialLimpieza = {
  fecha: today(),
  chofer_id: '',
  unidad_id: '',
  lavada_semana: false,
  tipo_limpieza: 'TOTAL',
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
  const [servicio, setServicio] = useState(initialServicio);
  const [limpieza, setLimpieza] = useState(initialLimpieza);
  const [fotosLimpieza, setFotosLimpieza] = useState([]);

  const [historial, setHistorial] = useState({
    rendimiento: [],
    puntualidad: [],
    servicio: { encuestas: [], resumen_choferes: [], comentarios: [] },
    limpieza: [],
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const cierreChoferRendimiento = historial.rendimiento.find((item) => {
    if (!rendimiento.fecha || !rendimiento.chofer_id) return false;

    return (
      String(item.fecha).slice(0, 10) === String(rendimiento.fecha).slice(0, 10) &&
      String(item.chofer_id) === String(rendimiento.chofer_id) &&
      (!rendimiento.unidad_id || String(item.unidad_id) === String(rendimiento.unidad_id)) &&
      (!rendimiento.ruta_id || String(item.ruta_id) === String(rendimiento.ruta_id))
    );
  }) || null;

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
        api.listarEncuestasInternas({ fecha: today() }),
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
        servicio: servicioRes || { encuestas: [], resumen_choferes: [], comentarios: [] },
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

  function obtenerChofer(choferId) {
    return catalogos.choferes.find((c) => String(c.id) === String(choferId)) || null;
  }

  function obtenerUltimoRendimientoUnidad(unidadId) {
    return historial.rendimiento.find(
      (item) => String(item.unidad_id) === String(unidadId)
    ) || null;
  }

  function limpiarCamposDependientesRendimiento() {
    return {
      km_inicial: '',
      km_final: '',
      litros_encontrados: '',
      litros: '',
      litros_dejados: '',
      precio_litro: '',
      total_mercancia: '',
      casetas: '',
      notas: '',
    };
  }

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

  function precargarRendimientoPorUnidad(unidadId) {
    const ultimo = obtenerUltimoRendimientoUnidad(unidadId);

    setRendimiento((prev) => ({
      ...prev,
      ...limpiarCamposDependientesRendimiento(),
      unidad_id: unidadId ? String(unidadId) : '',
      km_inicial:
        ultimo?.km_final !== undefined && ultimo?.km_final !== null
          ? String(ultimo.km_final)
          : '',
      litros_encontrados:
        ultimo?.litros_dejados !== undefined && ultimo?.litros_dejados !== null
          ? String(ultimo.litros_dejados)
          : '',
      precio_litro:
        ultimo?.precio_litro !== undefined && ultimo?.precio_litro !== null
          ? String(ultimo.precio_litro)
          : '',
    }));

    if (unidadId) {
      cargarUltimoKm(unidadId);
    }
  }

  function seleccionarChoferRendimiento(choferId) {
    const chofer = obtenerChofer(choferId);
    const rutas = rutasDelChofer(choferId);
    const rutaPrincipal = chofer?.ruta_asignada_id || rutas[0]?.id || '';
    const unidadDefault = chofer?.unidad_default_id ? String(chofer.unidad_default_id) : '';

    setRendimiento((prev) => ({
      ...prev,
      ...limpiarCamposDependientesRendimiento(),
      chofer_id: choferId,
      ruta_id: rutaPrincipal ? String(rutaPrincipal) : '',
      unidad_id: unidadDefault,
    }));

    if (unidadDefault) {
      precargarRendimientoPorUnidad(unidadDefault);
    }
  }

  function seleccionarChoferLimpieza(choferId) {
    const chofer = obtenerChofer(choferId);
    const unidadDefault = chofer?.unidad_default_id ? String(chofer.unidad_default_id) : '';

    setLimpieza((prev) => ({
      ...prev,
      chofer_id: choferId,
      unidad_id: unidadDefault,
    }));
  }

  useEffect(() => {
    if (!cierreChoferRendimiento) return;

    setRendimiento((prev) => ({
      ...prev,
      km_final: cierreChoferRendimiento.km_final !== undefined && cierreChoferRendimiento.km_final !== null
        ? String(cierreChoferRendimiento.km_final)
        : prev.km_final,
      litros: cierreChoferRendimiento.litros_cargados !== undefined && cierreChoferRendimiento.litros_cargados !== null
        ? String(cierreChoferRendimiento.litros_cargados)
        : prev.litros,
      litros_dejados: cierreChoferRendimiento.litros_dejados !== undefined && cierreChoferRendimiento.litros_dejados !== null
        ? String(cierreChoferRendimiento.litros_dejados)
        : prev.litros_dejados,
      total_mercancia: cierreChoferRendimiento.total_mercancia !== undefined && cierreChoferRendimiento.total_mercancia !== null
        ? String(cierreChoferRendimiento.total_mercancia)
        : prev.total_mercancia,
      casetas: cierreChoferRendimiento.casetas !== undefined && cierreChoferRendimiento.casetas !== null
        ? String(cierreChoferRendimiento.casetas)
        : prev.casetas,
    }));
  }, [cierreChoferRendimiento]);

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

  async function consultarServicioEntrega() {
    try {
      setSaving('servicio');
      setError('');
      const servicioRes = await api.listarEncuestasInternas({
        fecha: servicio.fecha,
        chofer_id: servicio.chofer_id || undefined,
        ruta_id: servicio.ruta_id || undefined,
      });

      setHistorial((prev) => ({
        ...prev,
        servicio: servicioRes || { encuestas: [], resumen_choferes: [], comentarios: [] },
      }));
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
      const creado = await api.crearLimpieza({
        ...limpieza,
        chofer_id: Number(limpieza.chofer_id),
        unidad_id: Number(limpieza.unidad_id),
      });

      if (fotosLimpieza.length > 0) {
        const formData = new FormData();
        fotosLimpieza.forEach((file) => formData.append('fotos', file));
        await api.subirFotosLimpieza(creado.id, formData);
      }

      setSuccess('Limpieza y cuidado guardado correctamente');
      setLimpieza(initialLimpieza);
      setFotosLimpieza([]);
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
                      onChange={seleccionarChoferRendimiento}
                      options={catalogos.choferes}
                      getLabel={(x) => `${x.nombre}${x.ruta_nombre ? ` - ${x.ruta_nombre}` : ''}`}
                    />

                    <Select
                      label="Unidad"
                      value={rendimiento.unidad_id}
                      onChange={(v) => {
                        if (!v) {
                          setRendimiento((prev) => ({
                            ...prev,
                            unidad_id: '',
                            ...limpiarCamposDependientesRendimiento(),
                          }));
                          return;
                        }

                        precargarRendimientoPorUnidad(v);
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
                      <Input label="Km final" type="number" value={rendimiento.km_final} onChange={(v) => setRendimiento({ ...rendimiento, km_final: v })} disabled />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Litros encontrados" type="number" step="0.01" value={rendimiento.litros_encontrados} onChange={(v) => setRendimiento({ ...rendimiento, litros_encontrados: v })} />
                      <Input label="Litros cargados" type="number" step="0.01" value={rendimiento.litros} onChange={(v) => setRendimiento({ ...rendimiento, litros: v })} disabled />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Litros dejados" type="number" step="0.01" value={rendimiento.litros_dejados} onChange={(v) => setRendimiento({ ...rendimiento, litros_dejados: v })} disabled />
                      <Input label="Precio litro" type="number" step="0.01" value={rendimiento.precio_litro} onChange={(v) => setRendimiento({ ...rendimiento, precio_litro: v })} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Mercancía $" type="number" step="0.01" value={rendimiento.total_mercancia} onChange={(v) => setRendimiento({ ...rendimiento, total_mercancia: v })} disabled />
                      <Input label="Casetas $" type="number" step="0.01" value={rendimiento.casetas} onChange={(v) => setRendimiento({ ...rendimiento, casetas: v })} disabled />
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                      <p className="font-semibold text-gray-950">Cierre del chofer</p>
                      {cierreChoferRendimiento ? (
                        <div className="mt-2 space-y-1">
                          <p>Km final: {cierreChoferRendimiento.km_final ?? '—'}</p>
                          <p>Litros cargados: {cierreChoferRendimiento.litros_cargados ?? '—'}</p>
                          <p>Litros dejados: {cierreChoferRendimiento.litros_dejados ?? '—'}</p>
                          <p>Gasto km/litro: {cierreChoferRendimiento.gasto_km_litro ? Number(cierreChoferRendimiento.gasto_km_litro).toFixed(3) : '—'}</p>
                          <p>Mercancía: {fmtMoney(cierreChoferRendimiento.total_mercancia || 0)}</p>
                          <p>Casetas: {fmtMoney(cierreChoferRendimiento.casetas || 0)}</p>
                          <p>
                            Foto tablero:{' '}
                            {cierreChoferRendimiento.foto_tablero_gasolina_url ? (
                              <a
                                href={cierreChoferRendimiento.foto_tablero_gasolina_url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-[#1F6FEB]"
                              >
                                Ver foto
                              </a>
                            ) : 'Sin foto'}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-2 text-gray-600">
                          Aún no hay cierre registrado por el chofer para esta fecha, unidad y ruta.
                        </p>
                      )}
                    </div>

                    {cierreChoferRendimiento && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Este rendimiento ya fue generado al finalizar la ruta y aquí solo se consulta.
                      </div>
                    )}

                    <Textarea
                      label="Notas"
                      value={rendimiento.notas}
                      onChange={(v) => setRendimiento({ ...rendimiento, notas: v })}
                    />

                    <Button loading={saving === 'rendimiento'} disabled={Boolean(cierreChoferRendimiento)}>
                      Guardar rendimiento
                    </Button>
                  </form>
                </Card>

                <RendimientoTable rows={historial.rendimiento} />
              </section>
            )}

            {activeTab === 'puntualidad' && (
              <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
                <Card title="Puntualidad del chofer" subtitle="El chofer registra su llegada al CEDIS y el sistema toma la salida real cuando inicia la ruta.">
                  <div className="space-y-3 text-sm text-gray-700">
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="font-semibold text-gray-950">Cómo se calcula ahora</p>
                      <p className="mt-2">1. Hora programada: horario asignado a la ruta.</p>
                      <p>2. Llegada al CEDIS: la registra el chofer desde su dashboard.</p>
                      <p>3. Salida real: se toma automáticamente cuando el chofer inicia la ruta.</p>
                      <p>4. Tolerancia: 5 minutos.</p>
                    </div>
                    <div className="rounded-2xl border border-[#07AE8B]/25 bg-[#07AE8B]/5 p-4 text-[#075c4d]">
                      Esta sección ya no se captura manualmente por supervisor; aquí solo se consulta el resultado.
                    </div>
                  </div>
                </Card>

                <SimpleTable
                  title="Historial de puntualidad"
                  rows={historial.puntualidad}
                  columns={[
                    ['fecha', 'Fecha'],
                    ['chofer_nombre', 'Chofer'],
                    ['ruta_nombre', 'Ruta'],
                    ['hora_programada', 'Llegada esperada'],
                    ['hora_llegada', 'Llegada CEDIS'],
                    ['hora_inicio_ruta', 'Salida real'],
                    ['tolerancia_minutos', 'Tol.'],
                    ['a_tiempo', 'A tiempo'],
                  ]}
                />
              </section>
            )}

            {activeTab === 'servicio' && (
              <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
                <Card title="Servicio de entrega" subtitle="Vista de encuestas respondidas por clientes atendidos en el día.">
                  <div className="space-y-4">
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

                    <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
                      <p className="font-semibold text-gray-950">Resumen del servicio</p>
                      <p className="mt-2">Encuestas por ruta y opiniones de clientes atendidos.</p>
                      <p className="mt-1">Esta vista ya no se captura manualmente.</p>
                    </div>

                    <Button
                      type="button"
                      loading={saving === 'servicio'}
                      onClick={consultarServicioEntrega}
                    >
                      Consultar servicio
                    </Button>
                  </div>
                </Card>

                <ServicioEntregaView data={historial.servicio} />
              </section>
            )}

            {activeTab === 'limpieza' && (
              <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
                <Card title="Capturar limpieza y cuidado" subtitle="Limpieza diaria, fallas y mantenimiento de unidad.">
                  <form onSubmit={guardarLimpieza} className="space-y-4">
                    <Input label="Fecha" type="date" value={limpieza.fecha} onChange={(v) => setLimpieza({ ...limpieza, fecha: v })} />
                    <Select label="Chofer" value={limpieza.chofer_id} onChange={seleccionarChoferLimpieza} options={catalogos.choferes} getLabel={(x) => x.nombre} />
                    <Select label="Unidad" value={limpieza.unidad_id} onChange={(v) => setLimpieza({ ...limpieza, unidad_id: v })} options={catalogos.unidades} getLabel={(x) => `${x.nombre} - ${x.placas}`} />

                    <Check label="Limpieza realizada en el día" checked={limpieza.lavada_semana} onChange={(v) => setLimpieza({ ...limpieza, lavada_semana: v })} />
                    <Select
                      label="Tipo de limpieza"
                      value={limpieza.tipo_limpieza}
                      onChange={(v) => setLimpieza({ ...limpieza, tipo_limpieza: v })}
                      options={[
                        { id: 'TOTAL', nombre: 'Limpieza total' },
                        { id: 'EXTERIOR', nombre: 'Solo exterior' },
                        { id: 'INTERIOR', nombre: 'Solo interior' },
                      ]}
                      getLabel={(x) => x.nombre}
                    />

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-gray-700">Fotos de evidencia</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => setFotosLimpieza(Array.from(e.target.files || []))}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
                      />
                      <span className="mt-1 block text-xs text-gray-500">
                        Adjunta fotos que respalden si fue total, exterior o interior.
                      </span>
                    </label>

                    {fotosLimpieza.length > 0 && (
                      <div className="rounded-2xl bg-gray-50 p-3 text-sm text-gray-700">
                        {fotosLimpieza.length} foto(s) listas para subir.
                      </div>
                    )}

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
                    ['tipo_limpieza', 'Tipo limpieza'],
                    ['lavada_semana', 'Limpieza del día'],
                    ['fotos_count', 'Fotos'],
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

function Button({ children, loading, onClick, type = 'submit', disabled = false }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
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
              <th className="px-3 py-3 text-right font-semibold">Encontrados</th>
              <th className="px-3 py-3 text-right font-semibold">Dejados</th>
              <th className="px-3 py-3 text-right font-semibold">Mercancía</th>
              <th className="px-3 py-3 text-right font-semibold">Gasto km/litro</th>
              <th className="px-3 py-3 text-center font-semibold">Tablero</th>
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
                  {r.litros_encontrados ?? 0}
                </td>

                <td className="whitespace-nowrap px-3 py-3 text-right text-gray-900">
                  {r.litros_dejados ?? 0}
                </td>

                <td className="whitespace-nowrap px-3 py-3 text-right text-gray-900">
                  {fmtMoney(r.total_mercancia)}
                </td>

                <td className="whitespace-nowrap px-3 py-3 text-right text-gray-900">
                  {r.gasto_km_litro !== undefined && r.gasto_km_litro !== null
                    ? Number(r.gasto_km_litro).toFixed(3)
                    : '—'}
                </td>

                <td className="whitespace-nowrap px-3 py-3 text-center text-gray-900">
                  {r.foto_tablero_gasolina_url ? (
                    <a
                      href={r.foto_tablero_gasolina_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[#1F6FEB]"
                    >
                      Ver foto
                    </a>
                  ) : '—'}
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
                <td colSpan="12" className="px-3 py-8 text-center text-gray-700">
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

function ServicioEntregaView({ data }) {
  const encuestas = data?.encuestas || [];
  const resumenChoferes = data?.resumen_choferes || [];
  const comentarios = data?.comentarios || [];

  return (
    <div className="space-y-5">
      <Card title="Encuestas por ruta">
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-left text-sm text-gray-900">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200 text-gray-800">
                <th className="px-3 py-3 font-semibold">Fecha</th>
                <th className="px-3 py-3 font-semibold">Ruta</th>
                <th className="px-3 py-3 font-semibold">Chofer</th>
                <th className="px-3 py-3 text-center font-semibold">Resp.</th>
                <th className="px-3 py-3 text-center font-semibold">Promedio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {encuestas.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-3">{fmtDate(row.fecha_servicio)}</td>
                  <td className="px-3 py-3">{row.ruta_nombre}</td>
                  <td className="px-3 py-3">{row.chofer_nombre}</td>
                  <td className="px-3 py-3 text-center">{row.respuestas || 0}</td>
                  <td className="px-3 py-3 text-center">{Number(row.promedio_general || 0).toFixed(2)}</td>
                </tr>
              ))}
              {encuestas.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-3 py-8 text-center text-gray-700">
                    No hay encuestas para los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Acumulado por chofer">
        <div className="space-y-3">
          {resumenChoferes.map((row) => (
            <div key={row.chofer_id} className="rounded-2xl bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-950">{row.chofer_nombre}</p>
                  <p className="text-xs text-gray-600">{row.respuestas} respuestas</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                  {Number(row.promedio_general || 0).toFixed(2)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-700">
                <div>Pedido completo: {Number(row.promedio_pedido_completo || 0).toFixed(2)}%</div>
                <div>Amabilidad: {Number(row.promedio_amabilidad_chofer || 0).toFixed(2)}</div>
                <div>Comunicación: {Number(row.promedio_claridad_comunicacion || 0).toFixed(2)}</div>
                <div>Cuidado entrega: {Number(row.promedio_cuidado_entrega || 0).toFixed(2)}</div>
                <div>Recepción correcta: {Number(row.promedio_facilidad_recepcion || 0).toFixed(2)}</div>
                <div>Servicio general: {Number(row.promedio_servicio_general || 0).toFixed(2)}</div>
              </div>
            </div>
          ))}
          {resumenChoferes.length === 0 && (
            <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
              Aún no hay respuestas para mostrar acumulado por chofer.
            </div>
          )}
        </div>
      </Card>

      <Card title="Comentarios recientes">
        <div className="space-y-3">
          {comentarios.map((row) => (
            <div key={row.id} className="rounded-2xl border border-gray-100 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span>{row.chofer_nombre}</span>
                <span>{row.ruta_nombre}</span>
                <span>{fmtDate(row.fecha_servicio)}</span>
                {row.folio_pedido && <span>Folio: {row.folio_pedido}</span>}
              </div>
              <p className="mt-2 text-sm text-gray-800">{row.comentarios}</p>
            </div>
          ))}
          {comentarios.length === 0 && (
            <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
              No hay comentarios registrados todavía.
            </div>
          )}
        </div>
      </Card>
    </div>
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

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(str)) return fmtDateTime(str);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return fmtDate(str);

  return str;
}

