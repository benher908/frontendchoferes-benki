'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import { Camera, Save } from 'lucide-react';

const FOTO_TIPOS_BASE = [
  { key: 'frente', label: 'Frente' },
  { key: 'lado_derecho', label: 'Lado derecho' },
  { key: 'lado_izquierdo', label: 'Lado izquierdo' },
  { key: 'atras', label: 'Atrás' },
];

const initialForm = {
  unidad_id: '',
  kilometraje: '',
  reporta_servicio_preventivo: false,
  detalle_servicio_preventivo: '',
  observaciones: '',
  observaciones_unidad: '',
};

export default function ChoferCheckPage() {
  const [user, setUser] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [catalogoItems, setCatalogoItems] = useState([]);
  const [items, setItems] = useState([]);

  const [form, setForm] = useState(initialForm);
  const [fotosBase, setFotosBase] = useState({});
  const [fotosExtra, setFotosExtra] = useState([]);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const itemsAgrupados = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!acc[item.categoria]) acc[item.categoria] = [];
      acc[item.categoria].push(item);
      return acc;
    }, {});
  }, [items]);

  async function cargar() {
    try {
      setLoading(true);
      setError('');

      const [me, unidadesRes, catalogo] = await Promise.all([
        api.me(),
        api.unidades(),
        api.catalogoChequeos(),
      ]);

      setUser(me);
      setUnidades(unidadesRes || []);
      setCatalogoItems(catalogo || []);

      setItems(
        (catalogo || []).map((item) => ({
          ...item,
          estado: 'bueno',
          comentario: '',
        }))
      );
    } catch (err) {
      setError(err.message || 'No se pudo cargar información');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, []);

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

  async function guardar(e) {
    e.preventDefault();

    if (!form.unidad_id) {
      setError('Selecciona la unidad');
      return;
    }

    const faltanFotos = FOTO_TIPOS_BASE.filter((foto) => !fotosBase[foto.key]);

    if (faltanFotos.length > 0) {
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
        tipo: 'chofer',
        unidad_id: Number(form.unidad_id),
        kilometraje: form.kilometraje === '' ? null : Number(form.kilometraje),
        reporta_servicio_preventivo: form.reporta_servicio_preventivo,
        detalle_servicio_preventivo: form.detalle_servicio_preventivo || null,
        observaciones: form.observaciones || null,
        observaciones_unidad: form.observaciones_unidad || null,
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

      setSuccess('Check enviado correctamente');
      limpiarFormulario();
    } catch (err) {
      setError(err.message || 'No se pudo guardar el check. Revisa que las fotos no pesen demasiado y que los items tengan estado válido');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedRoute allowedRoles={['chofer']}>
      <AppShell role="chofer">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Aviso y Check</h1>
          <p className="mt-1 text-gray-500">
            Registra el estado de la unidad al regresar de ruta.
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

        <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
          <div className="space-y-5">
            <Card title="Información del chofer">
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
                    {user?.ruta_nombre || 'Sin ruta'}
                  </p>
                </div>
              </div>
            </Card>

            <Card title="Datos generales">
              <form onSubmit={guardar} className="space-y-4">
                <Select
                  label="Unidad"
                  value={form.unidad_id}
                  onChange={(v) => setForm({ ...form, unidad_id: v })}
                  options={unidades}
                  getLabel={(x) => `${x.nombre} - ${x.placas}`}
                />

                <Input
                  label="Kilometraje"
                  type="number"
                  value={form.kilometraje}
                  onChange={(v) => setForm({ ...form, kilometraje: v })}
                  placeholder="Kilometraje actual"
                />

                <Check
                  label="La unidad necesita servicio preventivo"
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
                  label="Observaciones"
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

                <button
                  disabled={saving || loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#07AE8B] px-4 py-3 text-sm font-semibold text-white hover:bg-[#069b7d] disabled:opacity-60"
                >
                  <Save size={16} />
                  {saving ? 'Enviando...' : 'Enviar check'}
                </button>
              </form>
            </Card>
          </div>

          <Card
            title="Checklist de unidad"
            subtitle="Marca el estado de documentos, luces, neumáticos, accesorios y partes de la unidad."
          >
            {loading ? (
              <p className="py-8 text-center text-gray-600">Cargando checklist...</p>
            ) : (
              <Checklist
                itemsAgrupados={itemsAgrupados}
                items={items}
                actualizarItem={actualizarItem}
              />
            )}
          </Card>
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
      {Object.entries(itemsAgrupados).map(([categoria, categoriaItems]) => (
        <details
          key={categoria}
          open={categoria === 'documentos'}
          className="rounded-xl border border-gray-200"
        >
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-900">
            {labelize(categoria)}
          </summary>

          <div className="space-y-3 border-t border-gray-100 p-3">
            {categoriaItems.map((item) => {
              const index = items.findIndex(
                (x) => x.categoria === item.categoria && x.item === item.item
              );

              return (
                <div
                  key={`${item.categoria}-${item.item}`}
                  className="rounded-xl bg-gray-50 p-3"
                >
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

function Select({ label, value, onChange, options, getLabel }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </span>

      <select
        value={value}
        required
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