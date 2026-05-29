'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { fmtDate } from '@/lib/formatters';
import {
  Camera,
  Eye,
  Filter,
  Plus,
  RefreshCcw,
  Save,
  X,
} from 'lucide-react';

function today() {
  return new Date().toISOString().slice(0, 10);
}

const FOTO_TIPOS_BASE = [
  { key: 'frente', label: 'Frente' },
  { key: 'lado_derecho', label: 'Lado derecho' },
  { key: 'lado_izquierdo', label: 'Lado izquierdo' },
  { key: 'atras', label: 'Atrás' },
];

const initialForm = {
  tipo: 'checador',
  unidad_id: '',
  chofer_id: '',
  kilometraje: '',
  reporta_servicio_preventivo: false,
  detalle_servicio_preventivo: '',
  observaciones: '',
  observaciones_unidad: '',
};

export default function ChequeosSupervisorPage() {
  const [catalogos, setCatalogos] = useState({
    choferes: [],
    unidades: [],
  });

  const [catalogoItems, setCatalogoItems] = useState([]);
  const [items, setItems] = useState([]);

  const [form, setForm] = useState(initialForm);
  const [fotosBase, setFotosBase] = useState({});
  const [fotosExtra, setFotosExtra] = useState([]);

  const [chequeos, setChequeos] = useState([]);
  const [detalle, setDetalle] = useState(null);

  const [filtros, setFiltros] = useState({
    chofer_id: '',
    unidad_id: '',
    tipo: '',
    fecha_desde: '',
    fecha_hasta: '',
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const toast = useToast();

  const itemsAgrupados = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!acc[item.categoria]) acc[item.categoria] = [];
      acc[item.categoria].push(item);
      return acc;
    }, {});
  }, [items]);

  async function cargarBase() {
    try {
      setLoading(true);
      setError('');

      const [catalogosRes, catalogoChequeosRes] = await Promise.all([
        api.catalogos(),
        api.catalogoChequeos(),
      ]);

      setCatalogos({
        choferes: catalogosRes.choferes || [],
        unidades: catalogosRes.unidades || [],
      });

      setCatalogoItems(catalogoChequeosRes || []);
      setItems(
        (catalogoChequeosRes || []).map((item) => ({
          ...item,
          estado: 'bueno',
          comentario: '',
        }))
      );

      await cargarChequeos();
    } catch (err) {
      toast.error(err.message || 'No se pudo cargar la información');
      setError(err.message || 'No se pudo cargar la información');
    } finally {
      setLoading(false);
    }
  }

  async function cargarChequeos() {
    const params = new URLSearchParams();

    Object.entries(filtros).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    const query = params.toString() ? `?${params.toString()}` : '';

    const data = await api.listarChequeos(query);
    setChequeos(data || []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function aplicarFiltros(e) {
    e.preventDefault();

    try {
      setError('');
      await cargarChequeos();
    } catch (err) {
      setError(err.message || 'No se pudieron aplicar los filtros');
    }
  }

  function limpiarFiltros() {
    setFiltros({
      chofer_id: '',
      unidad_id: '',
      tipo: '',
      fecha_desde: '',
      fecha_hasta: '',
    });
  }

  useEffect(() => {
    if (
      !filtros.chofer_id &&
      !filtros.unidad_id &&
      !filtros.tipo &&
      !filtros.fecha_desde &&
      !filtros.fecha_hasta
    ) {
      cargarChequeos().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  function actualizarItem(index, field, value) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  async function cargarChequeoEspejo() {
    if (!form.unidad_id) {
      setError('Selecciona una unidad para cargar el chequeo espejo');
      return;
    }

    try {
      setError('');
      const data = await api.ultimoChequeoChofer({
        unidad_id: form.unidad_id,
        chofer_id: form.chofer_id || undefined,
      });

      if (!data) {
        toast.info('No hay chequeo previo para esta unidad');
        setSuccess('No hay chequeo previo para esta unidad');
        return;
      }

      const espejoItems = catalogoItems.map((base) => {
        const encontrado = data.items?.find(
          (x) => x.categoria === base.categoria && x.item === base.item
        );

        return {
          ...base,
          estado: encontrado?.estado || 'bueno',
          comentario: encontrado?.comentario || '',
        };
      });

      setItems(espejoItems);
      toast.success('Chequeo espejo cargado correctamente');
      setSuccess('Chequeo espejo cargado correctamente');
    } catch (err) {
      setError(err.message || 'No se pudo cargar el chequeo espejo');
    }
  }

  async function verDetalle(id) {
    try {
      setError('');
      const data = await api.obtenerChequeo(id);
      setDetalle(data);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el detalle');
    }
  }

  function limpiarFormulario() {
    setForm(initialForm);
    setFotosBase({});
    setFotosExtra([]);
    setItems(
      catalogoItems.map((item) => ({
        ...item,
        estado: 'bueno',
        comentario: '',
      }))
    );
  }

  async function guardarChequeo(e) {
    e.preventDefault();

    if (!form.unidad_id) {
      toast.error('La unidad es requerida');
      setError('La unidad es requerida');
      return;
    }

    if (form.tipo === 'checador' && !form.chofer_id) {
      toast.error('Selecciona el chofer relacionado al chequeo');
      setError('Selecciona el chofer relacionado al chequeo');
      return;
    }

    const faltanFotos = FOTO_TIPOS_BASE.filter((foto) => !fotosBase[foto.key]);

    if (faltanFotos.length > 0) {
      toast.error(`Faltan fotos obligatorias: ${faltanFotos.map((x) => x.label).join(', ')}`);
      setError(
        `Faltan fotos obligatorias: ${faltanFotos
          .map((x) => x.label)
          .join(', ')}`
      );
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const payload = {
        ...form,
        unidad_id: Number(form.unidad_id),
        chofer_id: form.chofer_id ? Number(form.chofer_id) : null,
        kilometraje: form.kilometraje === '' ? null : Number(form.kilometraje),
        items: items.map((item) => ({
          categoria: item.categoria,
          item: item.item,
          estado: item.estado,
          comentario: item.comentario || null,
        })),
      };

      const creado = await api.crearChequeo(payload);

      const formData = new FormData();

      FOTO_TIPOS_BASE.forEach((foto) => {
        const file = fotosBase[foto.key];
        if (file) {
          formData.append('fotos', file);
          formData.append('tipos', foto.key);
        }
      });

      fotosExtra.forEach((file) => {
        formData.append('fotos', file);
        formData.append('tipos', 'incidente');
      });

      await api.subirFotosChequeo(creado.id, formData);

      toast.success('Chequeo registrado correctamente');
      setSuccess('Chequeo registrado correctamente');
      limpiarFormulario();
      await cargarChequeos();
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar el chequeo');
      setError(err.message || 'No se pudo guardar el chequeo. Revisa que las fotos no pesen demasiado y que los items tengan estado válido');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedRoute allowedRoles={['supervisor']}>
      <AppShell role="supervisor">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Chequeos de unidad</h1>
          <p className="mt-1 text-gray-500">
            Registra chequeos, consulta historial y revisa evidencia fotográfica.
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

        <section className="grid gap-5 xl:grid-cols-[470px_1fr]">
          <Card
            title="Nuevo chequeo"
            subtitle="Captura checklist y fotos obligatorias de la unidad."
          >
            <form onSubmit={guardarChequeo} className="space-y-4">
              <Select
                label="Tipo"
                value={form.tipo}
                onChange={(v) => setForm({ ...form, tipo: v })}
                options={[
                  { id: 'checador', nombre: 'Checador / Supervisor' },
                  { id: 'chofer', nombre: 'Chofer' },
                ]}
                getLabel={(x) => x.nombre}
              />

              <Select
                label="Unidad"
                value={form.unidad_id}
                onChange={(v) => setForm({ ...form, unidad_id: v })}
                options={catalogos.unidades}
                getLabel={(x) => `${x.nombre} - ${x.placas}`}
              />

              <Select
                label="Chofer"
                value={form.chofer_id}
                onChange={(v) => setForm({ ...form, chofer_id: v })}
                options={catalogos.choferes}
                getLabel={(x) => `${x.nombre}${x.ruta_nombre ? ` - ${x.ruta_nombre}` : ''}`}
              />

              <Input
                label="Kilometraje"
                type="number"
                value={form.kilometraje}
                onChange={(v) => setForm({ ...form, kilometraje: v })}
              />

              <button
                type="button"
                onClick={cargarChequeoEspejo}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                <RefreshCcw size={16} />
                Cargar chequeo espejo
              </button>

              <Check
                label="Reporta servicio preventivo"
                checked={form.reporta_servicio_preventivo}
                onChange={(v) =>
                  setForm({
                    ...form,
                    reporta_servicio_preventivo: v,
                  })
                }
              />

              {form.reporta_servicio_preventivo && (
                <Textarea
                  label="Detalle del servicio preventivo"
                  value={form.detalle_servicio_preventivo}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      detalle_servicio_preventivo: v,
                    })
                  }
                />
              )}

              <Textarea
                label="Observaciones generales"
                value={form.observaciones}
                onChange={(v) => setForm({ ...form, observaciones: v })}
              />

              <Textarea
                label="Observaciones de unidad"
                value={form.observaciones_unidad}
                onChange={(v) => setForm({ ...form, observaciones_unidad: v })}
              />

              <FotosObligatorias
                fotosBase={fotosBase}
                setFotosBase={setFotosBase}
              />

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Fotos extra por incidente
                </span>

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                    multiple
                  onChange={(e) => setFotosExtra(Array.from(e.target.files || []))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900"
                />

                {fotosExtra.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    {fotosExtra.length} foto(s) extra seleccionada(s)
                  </p>
                )}
              </label>

              <Checklist
                itemsAgrupados={itemsAgrupados}
                items={items}
                actualizarItem={actualizarItem}
              />

              <button
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#07AE8B] px-4 py-3 text-sm font-semibold text-white hover:bg-[#069b7d] disabled:opacity-60"
              >
                <Save size={16} />
                {saving ? 'Guardando...' : 'Guardar chequeo'}
              </button>
            </form>
          </Card>

          <div className="space-y-5">
            <Card title="Filtros de historial">
              <form onSubmit={aplicarFiltros} className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                <Select
                  label="Chofer"
                  value={filtros.chofer_id}
                  onChange={(v) => setFiltros({ ...filtros, chofer_id: v })}
                  options={catalogos.choferes}
                  getLabel={(x) => x.nombre}
                  optional
                />

                <Select
                  label="Unidad"
                  value={filtros.unidad_id}
                  onChange={(v) => setFiltros({ ...filtros, unidad_id: v })}
                  options={catalogos.unidades}
                  getLabel={(x) => `${x.nombre} - ${x.placas}`}
                  optional
                />

                <Select
                  label="Tipo"
                  value={filtros.tipo}
                  onChange={(v) => setFiltros({ ...filtros, tipo: v })}
                  options={[
                    { id: 'chofer', nombre: 'Chofer' },
                    { id: 'checador', nombre: 'Checador' },
                  ]}
                  getLabel={(x) => x.nombre}
                  optional
                />

                <Input
                  label="Desde"
                  type="date"
                  value={filtros.fecha_desde}
                  onChange={(v) => setFiltros({ ...filtros, fecha_desde: v })}
                />

                <Input
                  label="Hasta"
                  type="date"
                  value={filtros.fecha_hasta}
                  onChange={(v) => setFiltros({ ...filtros, fecha_hasta: v })}
                />

                <div className="flex gap-2 md:col-span-3 xl:col-span-5">
                  <button className="inline-flex items-center gap-2 rounded-xl bg-[#07AE8B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#069b7d]">
                    <Filter size={16} />
                    Aplicar filtros
                  </button>

                  <button
                    type="button"
                    onClick={limpiarFiltros}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    <X size={16} />
                    Limpiar
                  </button>
                </div>
              </form>
            </Card>

            <Card title="Historial de chequeos">
              {loading ? (
                <p className="py-8 text-center text-gray-600">Cargando chequeos...</p>
              ) : (
                <ChequeosTable rows={chequeos} onDetalle={verDetalle} />
              )}
            </Card>

            {detalle && (
              <Card title="Detalle del chequeo">
                <DetalleChequeo data={detalle} onClose={() => setDetalle(null)} />
              </Card>
            )}
          </div>
        </section>
      </AppShell>
    </ProtectedRoute>
  );
}

function FotosObligatorias({ fotosBase, setFotosBase }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700">
        Fotos obligatorias
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {FOTO_TIPOS_BASE.map((foto) => (
          <label
            key={foto.key}
            className="rounded-xl border border-gray-200 p-3 text-sm"
          >
            <span className="mb-2 flex items-center gap-2 font-semibold text-gray-800">
              <Camera size={16} />
              {foto.label}
            </span>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              required
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (!file) return;

                setFotosBase((prev) => ({
                  ...prev,
                  [foto.key]: file,
                }));
              }}
              className="w-full text-xs text-gray-700"
            />

            {fotosBase[foto.key] && (
              <p className="mt-2 truncate text-xs text-[#04745f]">
                {fotosBase[foto.key].name}
              </p>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

function Checklist({ itemsAgrupados, items, actualizarItem }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-900">
        Checklist de unidad
      </p>

      {Object.entries(itemsAgrupados).map(([categoria, categoriaItems]) => (
        <details key={categoria} className="rounded-xl border border-gray-200">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-900">
            {labelize(categoria)}
          </summary>

          <div className="space-y-3 border-t border-gray-100 p-3">
            {categoriaItems.map((item) => {
              const index = items.findIndex(
                (x) => x.categoria === item.categoria && x.item === item.item
              );

              return (
                <div key={`${item.categoria}-${item.item}`} className="rounded-xl bg-gray-50 p-3">
                  <div className="mb-2 text-sm font-medium text-gray-900">
                    {item.item}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[130px_1fr]">
                    <select
                      value={item.estado}
                      onChange={(e) =>
                        actualizarItem(index, 'estado', e.target.value)
                      }
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    >
                      <option value="bueno">Bueno</option>
                      <option value="regular">Regular</option>
                      <option value="malo">Malo</option>
                      <option value="na">N/A</option>
                    </select>

                    <input
                      value={item.comentario}
                      onChange={(e) =>
                        actualizarItem(index, 'comentario', e.target.value)
                      }
                      placeholder="Comentario opcional"
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}

function ChequeosTable({ rows, onDetalle }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-left text-sm text-gray-900">
        <thead className="bg-gray-50">
          <tr className="border-b border-gray-200 text-gray-800">
            <th className="px-3 py-3 font-semibold">Fecha</th>
            <th className="px-3 py-3 font-semibold">Unidad</th>
            <th className="px-3 py-3 font-semibold">Chofer</th>
            <th className="px-3 py-3 font-semibold">Tipo</th>
            <th className="px-3 py-3 text-right font-semibold">Km</th>
            <th className="px-3 py-3 text-center font-semibold">Fotos</th>
            <th className="px-3 py-3 text-center font-semibold">Detalle</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="px-3 py-3">
                <div className="font-semibold text-gray-950">{fmtDate(row.fecha)}</div>
                <div className="text-xs text-gray-600">{row.hora || '—'}</div>
              </td>

              <td className="px-3 py-3 text-gray-900">
                <div className="font-medium">{row.unidad_nombre || '—'}</div>
                <div className="text-xs text-gray-600">{row.placas || 'Sin placas'}</div>
              </td>

              <td className="px-3 py-3 text-gray-900">{row.chofer_nombre || '—'}</td>

              <td className="px-3 py-3">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                  {row.tipo}
                </span>
              </td>

              <td className="px-3 py-3 text-right text-gray-900">
                {row.kilometraje || '—'}
              </td>

              <td className="px-3 py-3 text-center text-gray-900">
                {row.fotos_count || 0}
              </td>

              <td className="px-3 py-3 text-center">
                <button
                  onClick={() => onDetalle(row.id)}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-700 hover:bg-gray-100"
                >
                  <Eye size={16} />
                </button>
              </td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td colSpan="7" className="px-3 py-10 text-center text-gray-600">
                No hay chequeos registrados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DetalleChequeo({ data, onClose }) {
  const itemsMalos = data.items?.filter((item) =>
    ['malo', 'regular'].includes(item.estado)
  ) || [];

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          <X size={16} />
          Cerrar detalle
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <MiniMetric label="Unidad" value={data.unidad_nombre || '—'} />
        <MiniMetric label="Placas" value={data.placas || '—'} />
        <MiniMetric label="Chofer" value={data.chofer_nombre || '—'} />
        <MiniMetric label="Kilometraje" value={data.kilometraje || '—'} />
      </div>

      <div className="rounded-2xl bg-gray-50 p-4">
        <p className="text-sm font-semibold text-gray-950">Observaciones</p>
        <p className="mt-1 text-sm text-gray-700">
          {data.observaciones || data.observaciones_unidad || 'Sin observaciones'}
        </p>

        {data.reporta_servicio_preventivo ? (
          <div className="mt-3 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
            <strong>Servicio preventivo reportado:</strong>{' '}
            {data.detalle_servicio_preventivo || 'Sin detalle'}
          </div>
        ) : null}
      </div>

      <div>
        <h3 className="mb-3 font-semibold text-gray-950">
          Items con observación. (Solo se muestran los items que no sean reportados como 'Bueno').
        </h3>

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-left text-sm text-gray-900">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3">Categoría</th>
                <th className="px-3 py-3">Item</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Comentario</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {itemsMalos.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3">{labelize(item.categoria)}</td>
                  <td className="px-3 py-3 font-medium">{item.item}</td>
                  <td className="px-3 py-3">{item.estado}</td>
                  <td className="px-3 py-3">{item.comentario || '—'}</td>
                </tr>
              ))}

              {itemsMalos.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-3 py-8 text-center text-gray-600">
                    No hay items en regular o malo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-semibold text-gray-950">
          Evidencia fotográfica
        </h3>

        {data.fotos?.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.fotos.map((foto) => (
              <a
                key={foto.id}
                href={foto.url}
                target="_blank"
                className="group overflow-hidden rounded-2xl border border-gray-100 bg-gray-50"
              >
                <img
                  src={foto.url}
                  alt={foto.tipo}
                  className="h-44 w-full object-cover transition group-hover:scale-105"
                />

                <div className="px-3 py-2 text-sm font-semibold text-gray-800">
                  {labelize(foto.tipo)}
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
            Sin fotos registradas.
          </p>
        )}
      </div>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 font-bold text-gray-950">{value}</p>
    </div>
  );
}

function Input({ label, value, onChange, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </span>

      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  getLabel,
  optional = false,
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </span>

      <select
        value={value}
        required={!optional}
        onChange={(e) => onChange(e.target.value)}
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
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </span>

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
        className="h-4 w-4 accent-[#07AE8B]"
      />
      {label}
    </label>
  );
}

function labelize(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}