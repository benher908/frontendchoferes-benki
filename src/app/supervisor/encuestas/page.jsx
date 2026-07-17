'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import Card from '@/components/Card';
import { Input, Select } from '@/components/FormControls';
import { api } from '@/lib/api';
import { todayMexicoInput } from '@/lib/formatters';

function todayDate() {
  return todayMexicoInput();
}

function scoreText(value) {
  const n = Number(value || 0);
  return n ? n.toFixed(2) : '0.00';
}

export default function SupervisorEncuestasPage() {
  const [filters, setFilters] = useState({ fecha: todayDate(), chofer_id: '', ruta_id: '' });
  const [catalogos, setCatalogos] = useState({ choferes: [], rutas: [] });
  const [data, setData] = useState({ encuestas: [], resumen_choferes: [], comentarios: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrRutaId, setQrRutaId] = useState('');

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const [catalogoRes, encuestasRes] = await Promise.all([
        api.catalogos(),
        api.listarEncuestasInternas(filters),
      ]);

      setCatalogos({
        choferes: catalogoRes?.choferes || [],
        rutas: catalogoRes?.rutas || [],
      });
      setData(encuestasRes || { encuestas: [], resumen_choferes: [], comentarios: [] });
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las encuestas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyLink(token) {
    if (!token || !baseUrl) return;
    await navigator.clipboard.writeText(`${baseUrl}/encuesta/${token}`);
  }

  async function copyRouteQrLink() {
    if (!qrRutaId || !baseUrl) return;
    await navigator.clipboard.writeText(`${baseUrl}/encuesta/ruta/${qrRutaId}`);
  }

  function printQr() {
    if (typeof window === 'undefined') return;
    window.print();
  }

  const rutaQrUrl = qrRutaId && baseUrl ? `${baseUrl}/encuesta/ruta/${qrRutaId}` : '';
  const rutaQrImagen = rutaQrUrl
    ? `https://quickchart.io/qr?size=280&margin=2&text=${encodeURIComponent(rutaQrUrl)}`
    : '';
  const rutaSeleccionada = catalogos.rutas.find((ruta) => String(ruta.id) === String(qrRutaId));

  return (
    <ProtectedRoute allowedRoles={['supervisor']}>
      <AppShell role="supervisor">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Encuestas de entrega</h1>
          <p className="mt-1 text-gray-500">
            Consulta el resultado por ruta y el acumulado de calificacion por chofer.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="mb-6">
          <Card title="Filtros">
            <div className="grid gap-4 md:grid-cols-4">
              <Input
                label="Fecha"
                type="date"
                value={filters.fecha}
                onChange={(v) => setFilters({ ...filters, fecha: v })}
              />
              <Select
                label="Chofer"
                optional
                value={filters.chofer_id}
                onChange={(v) => setFilters({ ...filters, chofer_id: v })}
                options={catalogos.choferes}
                getLabel={(x) => x.nombre}
              />
              <Select
                label="Ruta"
                optional
                value={filters.ruta_id}
                onChange={(v) => setFilters({ ...filters, ruta_id: v })}
                options={catalogos.rutas}
                getLabel={(x) => x.nombre}
              />
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={load}
                  className="h-12 w-full rounded-2xl bg-[#F54927] px-4 text-sm font-bold text-white hover:bg-[#F7674A]"
                >
                  Consultar
                </button>
              </div>
            </div>
          </Card>
        </section>

        <section className="mb-6 print:mb-0">
          <Card title="QR fijo por ruta" subtitle="Imprime un QR permanente por ruta. El sistema resolvera el chofer actual segun el viaje del dia.">
            <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
              <div className="space-y-4">
                <Select
                  label="Ruta para QR"
                  value={qrRutaId}
                  onChange={setQrRutaId}
                  options={catalogos.rutas}
                  getLabel={(x) => x.nombre}
                />

                <Input
                  label="Liga fija"
                  value={rutaQrUrl}
                  onChange={() => {}}
                  readOnly
                />

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <button
                    type="button"
                    onClick={copyRouteQrLink}
                    disabled={!rutaQrUrl}
                    className="h-12 rounded-2xl border border-gray-300 px-4 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Copiar liga fija
                  </button>
                  <button
                    type="button"
                    onClick={printQr}
                    disabled={!rutaQrUrl}
                    className="h-12 rounded-2xl bg-[#F54927] px-4 text-sm font-bold text-white hover:bg-[#F7674A] disabled:opacity-50"
                  >
                    Imprimir QR
                  </button>
                </div>
              </div>

              <div className="print:block">
                <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-dashed border-gray-300 bg-white p-6 text-center print:border-0 print:p-0">
                  {rutaQrImagen ? (
                    <>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                        Encuesta de entrega
                      </p>
                      <h2 className="mt-2 text-3xl font-black text-gray-950">
                        {rutaSeleccionada?.nombre || 'Ruta'}
                      </h2>
                      <p className="mt-2 max-w-xs text-sm text-gray-600">
                        Escanea este codigo para responder la encuesta de entrega de esta ruta.
                      </p>
                      <img
                        src={rutaQrImagen}
                        alt={`QR de ${rutaSeleccionada?.nombre || 'ruta'}`}
                        className="mt-5 h-72 w-72 rounded-3xl border border-gray-200 bg-white p-3"
                      />
                      <p className="mt-4 break-all text-xs text-gray-500">{rutaQrUrl}</p>
                    </>
                  ) : (
                    <div className="py-16 text-sm text-gray-500">
                      Selecciona una ruta para generar su QR fijo.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card title="Encuestas por ruta">
            {loading ? (
              <p className="py-8 text-center text-sm text-gray-600">Cargando encuestas...</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-left text-sm text-gray-900">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200 text-gray-800">
                      <th className="px-3 py-3 font-semibold">Fecha</th>
                      <th className="px-3 py-3 font-semibold">Ruta</th>
                      <th className="px-3 py-3 font-semibold">Chofer</th>
                      <th className="px-3 py-3 text-center font-semibold">Resp.</th>
                      <th className="px-3 py-3 text-center font-semibold">Promedio</th>
                      <th className="px-3 py-3 text-center font-semibold">Liga</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {(data.encuestas || []).map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-3">{String(row.fecha_servicio || '').slice(0, 10)}</td>
                        <td className="px-3 py-3">{row.ruta_nombre}</td>
                        <td className="px-3 py-3">{row.chofer_nombre}</td>
                        <td className="px-3 py-3 text-center">{row.respuestas || 0}</td>
                        <td className="px-3 py-3 text-center">{scoreText(row.promedio_general)}</td>
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => copyLink(row.token_publico)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                          >
                            Copiar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(data.encuestas || []).length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-3 py-8 text-center text-gray-600">
                          No hay encuestas para los filtros seleccionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Acumulado por chofer">
            <div className="space-y-3">
              {(data.resumen_choferes || []).map((row) => (
                <div key={row.chofer_id} className="rounded-2xl bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-950">{row.chofer_nombre}</p>
                      <p className="text-xs text-gray-600">{row.respuestas} respuestas</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                      {scoreText(row.promedio_general)}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-700">
                    <div>Pedido completo: {scoreText(row.promedio_pedido_completo)}%</div>
                    <div>Trato: {scoreText(row.promedio_trato_chofer)}</div>
                    <div>Atencion: {scoreText(row.promedio_atencion_entrega)}</div>
                    <div>Satisfaccion: {scoreText(row.promedio_satisfaccion_general)}</div>
                  </div>
                </div>
              ))}
              {(data.resumen_choferes || []).length === 0 && (
                <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
                  Aun no hay respuestas para mostrar acumulado por chofer.
                </div>
              )}
            </div>
          </Card>
        </section>

        <section className="mt-6">
          <Card title="Comentarios recientes">
            <div className="space-y-3">
              {(data.comentarios || []).map((row) => (
                <div key={row.id} className="rounded-2xl border border-gray-100 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span>{row.chofer_nombre}</span>
                    <span>{row.ruta_nombre}</span>
                    <span>{String(row.fecha_servicio || '').slice(0, 10)}</span>
                    {row.folio_pedido && <span>Folio: {row.folio_pedido}</span>}
                  </div>
                  <p className="mt-2 text-sm text-gray-800">{row.comentarios}</p>
                </div>
              ))}
              {(data.comentarios || []).length === 0 && (
                <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
                  No hay comentarios registrados todavia.
                </div>
              )}
            </div>
          </Card>
        </section>
      </AppShell>
    </ProtectedRoute>
  );
}
