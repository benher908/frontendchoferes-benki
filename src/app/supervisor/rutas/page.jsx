'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import Card from '@/components/Card';
import { Input, Select, Textarea } from '@/components/FormControls';
import { api } from '@/lib/api';
import { fmtDate, fmtDateTime, todayMexicoInput } from '@/lib/formatters';

function today() {
  return todayMexicoInput();
}

const initialForm = {
  fecha: today(),
  chofer_id: '',
  unidad_id: '',
  ruta_id: '',
  observaciones_inicio: '',
  detalles: [],
};

export default function SupervisorRutasPage() {
  const [form, setForm] = useState(initialForm);
  const [catalogos, setCatalogos] = useState({ choferes: [], unidades: [], rutas: [] });
  const [viajes, setViajes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function detallesIniciales() {
    return [{ tipo: 'COMPLEMENTARIA', ruta_id: '', descripcion: '', observaciones: '' }];
  }

  function rutasDelChofer(choferId) {
    const chofer = catalogos.choferes.find((item) => String(item.id) === String(choferId));
    const rutasIds = Array.isArray(chofer?.rutas_ids) ? chofer.rutas_ids.map(Number) : [];

    if (rutasIds.length === 0) return catalogos.rutas;

    return catalogos.rutas.filter((ruta) => rutasIds.includes(Number(ruta.id)));
  }

  function rutasDisponiblesAdicionales(detalleActualId = '') {
    const usadas = new Set([
      String(form.ruta_id || ''),
      ...(form.detalles || [])
        .map((detalle) => String(detalle.ruta_id || ''))
        .filter((rutaId) => rutaId && rutaId !== String(detalleActualId)),
    ]);

    return catalogos.rutas.filter((ruta) => !usadas.has(String(ruta.id)));
  }

  function combinarRutasSinDuplicados(...listas) {
    const mapa = new Map();

    for (const lista of listas) {
      for (const ruta of lista || []) {
        if (!ruta?.id) continue;
        mapa.set(String(ruta.id), ruta);
      }
    }

    return Array.from(mapa.values());
  }

  async function cargar() {
    try {
      setLoading(true);
      setError('');

      const [catalogosRes, viajesRes] = await Promise.all([
        api.catalogos(),
        api.listarViajes({ fecha: form.fecha }),
      ]);

      setCatalogos({
        choferes: catalogosRes?.choferes || [],
        unidades: catalogosRes?.unidades || [],
        rutas: catalogosRes?.rutas || [],
      });
      setViajes(viajesRes || []);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las rutas del día');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.fecha]);

  async function guardar(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.asignarViaje({
        fecha: form.fecha,
        chofer_id: Number(form.chofer_id),
        unidad_id: Number(form.unidad_id),
        ruta_id: Number(form.ruta_id),
        observaciones_inicio: form.observaciones_inicio || null,
        detalles: (form.detalles || []).filter((item) => Number(item.ruta_id) > 0),
      });

      setSuccess('Ruta asignada correctamente');
      setForm((prev) => ({
        ...initialForm,
        fecha: prev.fecha,
      }));
      await cargar();
    } catch (err) {
      setError(err.message || 'No se pudo asignar la ruta');
    } finally {
      setSaving(false);
    }
  }

  async function cancelar(viaje) {
    try {
      setError('');
      setSuccess('');
      await api.cancelarViaje(viaje.id, {
        motivo: 'Cancelada por supervisor desde control de rutas',
      });
      setSuccess('Ruta cancelada');
      await cargar();
    } catch (err) {
      setError(err.message || 'No se pudo cancelar la ruta');
    }
  }

  return (
    <ProtectedRoute allowedRoles={['supervisor']}>
      <AppShell role="supervisor">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Rutas del día</h1>
          <p className="mt-1 text-gray-500">
            Aquí el supervisor asigna la ruta y el chofer únicamente la inicia y la finaliza.
          </p>
        </header>

        {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <Card title="Asignar ruta" subtitle="Se crea la ruta del día y el chofer luego la opera desde su app.">
            <form onSubmit={guardar} className="space-y-4">
              <Input
                label="Fecha operativa"
                type="date"
                value={form.fecha}
                onChange={(value) => setForm({ ...form, fecha: value })}
              />

              <Select
                label="Chofer"
                value={form.chofer_id}
                onChange={(value) => {
                  const chofer = catalogos.choferes.find((item) => String(item.id) === String(value));
                  setForm({
                    ...form,
                    chofer_id: value,
                    ruta_id: '',
                    unidad_id: chofer?.unidad_default_id ? String(chofer.unidad_default_id) : '',
                    detalles: [],
                  });
                }}
                options={catalogos.choferes}
                getLabel={(x) => `${x.nombre}${x.ruta_nombre ? ` - ${x.ruta_nombre}` : ''}`}
              />

              <Select
                label="Unidad"
                value={form.unidad_id}
                onChange={(value) => setForm({ ...form, unidad_id: value })}
                options={catalogos.unidades}
                getLabel={(x) => `${x.nombre} - ${x.placas}`}
              />

              <Select
                label="Ruta"
                value={form.ruta_id}
                onChange={(value) => setForm({ ...form, ruta_id: value })}
                options={rutasDelChofer(form.chofer_id)}
                getLabel={(x) => x.nombre}
              />

              <Textarea
                label="Observaciones de salida"
                value={form.observaciones_inicio}
                onChange={(value) => setForm({ ...form, observaciones_inicio: value })}
              />

              <div className="space-y-3 rounded-2xl border border-gray-200 p-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Rutas adicionales</h3>
                  <p className="text-xs text-gray-500">La ruta principal se agrega sola. Aquí capturas rutas extra que el chofer también debe cubrir ese mismo día.</p>
                </div>

                {(form.detalles || []).map((detalle, index) => (
                  <div key={index} className="grid gap-3 rounded-xl border border-gray-100 p-3">
                    <Select
                      label="Tipo"
                      value={detalle.tipo}
                      onChange={(value) => {
                        const next = [...(form.detalles || [])];
                        next[index] = { ...next[index], tipo: value };
                        setForm({ ...form, detalles: next });
                      }}
                      options={[
                        { id: 'DESVIO', nombre: 'Desvío' },
                        { id: 'COMPLEMENTARIA', nombre: 'Complementaria' },
                      ]}
                    />
                    <Select
                      label="Ruta adicional"
                      value={detalle.ruta_id || ''}
                      onChange={(value) => {
                        const ruta = catalogos.rutas.find((item) => String(item.id) === String(value));
                        const next = [...(form.detalles || [])];
                        next[index] = {
                          ...next[index],
                          ruta_id: value,
                          descripcion: ruta?.nombre || '',
                        };
                        setForm({ ...form, detalles: next });
                      }}
                      options={detalle.ruta_id
                        ? combinarRutasSinDuplicados(
                          catalogos.rutas.filter((ruta) => String(ruta.id) === String(detalle.ruta_id)),
                          rutasDisponiblesAdicionales(detalle.ruta_id),
                        )
                        : rutasDisponiblesAdicionales()}
                      getLabel={(x) => x.nombre}
                      optional
                    />
                    <Textarea
                      label="Observaciones de la ruta adicional"
                      value={detalle.observaciones}
                      onChange={(value) => {
                        const next = [...(form.detalles || [])];
                        next[index] = { ...next[index], observaciones: value };
                        setForm({ ...form, detalles: next });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, detalles: (form.detalles || []).filter((_, itemIndex) => itemIndex !== index) })}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      Quitar ruta adicional
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setForm({ ...form, detalles: [...(form.detalles || []), { tipo: 'COMPLEMENTARIA', ruta_id: '', descripcion: '', observaciones: '' }] })}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                >
                  Agregar ruta adicional
                </button>
              </div>

              <button
                disabled={saving}
                className="w-full rounded-xl bg-[#F54927] px-4 py-3 text-sm font-semibold text-white hover:bg-[#F26449] disabled:opacity-60"
              >
                {saving ? 'Asignando...' : 'Asignar ruta'}
              </button>
            </form>
          </Card>

          <Card title="Seguimiento" subtitle={`Rutas registradas para ${fmtDate(form.fecha)}`}>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-left text-sm text-gray-900">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200 text-gray-800">
                    <th className="px-3 py-3 font-semibold">Ruta</th>
                    <th className="px-3 py-3 font-semibold">Chofer</th>
                    <th className="px-3 py-3 font-semibold">Unidad</th>
                    <th className="px-3 py-3 font-semibold">Estado</th>
                    <th className="px-3 py-3 font-semibold">Horario</th>
                    <th className="px-3 py-3 font-semibold">Inicio</th>
                    <th className="px-3 py-3 font-semibold">Fin</th>
                    <th className="px-3 py-3 text-right font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {viajes.map((viaje) => (
                    <tr key={viaje.id}>
                      <td className="px-3 py-3 font-medium">
                        <div>{viaje.ruta_nombre}</div>
                        {Array.isArray(viaje.detalles) && viaje.detalles.length > 1 && (
                          <div className="mt-1 space-y-1 text-xs font-normal text-gray-600">
                            {viaje.detalles
                              .filter((detalle) => detalle.secuencia !== 1)
                              .map((detalle) => (
                                <div key={detalle.id}>
                                  {detalle.secuencia}. {detalle.descripcion}
                                </div>
                              ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">{viaje.chofer_nombre}</td>
                      <td className="px-3 py-3">
                        <div>{viaje.unidad_nombre}</div>
                        <div className="text-xs text-gray-600">{viaje.placas || 'Sin placas'}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${estadoClass(viaje.estado)}`}>
                          {labelEstado(viaje.estado)}
                        </span>
                      </td>
                      <td className="px-3 py-3">{viaje.hora_programada || '—'}</td>
                      <td className="px-3 py-3">{fmtDateTime(viaje.hora_inicio)}</td>
                      <td className="px-3 py-3">{fmtDateTime(viaje.hora_fin)}</td>
                      <td className="px-3 py-3 text-right">
                        {viaje.estado !== 'FINALIZADA' && viaje.estado !== 'CANCELADA' ? (
                          <button
                            type="button"
                            onClick={() => cancelar(viaje)}
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Cancelar
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500">Sin acción</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {viajes.length === 0 && (
                    <tr>
                      <td colSpan="8" className="px-3 py-8 text-center text-gray-600">
                        Todavía no hay rutas asignadas para esta fecha.
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

function labelEstado(estado) {
  if (!estado) return 'Sin estado';
  return String(estado).replaceAll('_', ' ');
}

function estadoClass(estado) {
  if (estado === 'FINALIZADA') return 'bg-emerald-100 text-emerald-800';
  if (estado === 'EN_RUTA') return 'bg-blue-100 text-blue-800';
  if (estado === 'LISTA_PARA_RUTA') return 'bg-amber-100 text-amber-800';
  if (estado === 'CANCELADA') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
}


