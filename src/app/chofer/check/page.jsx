'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  ImagePlus,
  Loader2,
  Save,
  Truck,
} from 'lucide-react';

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
  const [savingStep, setSavingStep] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const toast = useToast();

  const fotosCompletas = FOTO_TIPOS_BASE.filter((foto) => fotosBase[foto.key]).length;
  const totalItems = items.length;
  const itemsConObservacion = items.filter((item) => ['regular', 'malo'].includes(item.estado)).length;

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
      toast.error(err.message || 'No se pudo cargar información');
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

  function validarAntesDeEnviar() {
    if (!form.unidad_id) return 'Selecciona la unidad';

    const faltanFotos = FOTO_TIPOS_BASE.filter((foto) => !fotosBase[foto.key]);

    if (faltanFotos.length > 0) {
      return `Faltan fotos obligatorias: ${faltanFotos.map((x) => x.label).join(', ')}`;
    }

    return '';
  }

  async function guardar(e) {
    e.preventDefault();

    const validationError = validarAntesDeEnviar();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      setSavingStep('Guardando datos del chequeo...');

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
          estado: item.estado || 'bueno',
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

      setSavingStep('Subiendo fotos. Puede tardar unos segundos si la señal está lenta...');
      await api.subirFotosChequeo(creado.id, formData);

      setSavingStep('Finalizando...');
      toast.success('Check enviado correctamente');
      setSuccess('Check enviado correctamente');
      limpiarFormulario();
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar el check');
      setError(err.message || 'No se pudo guardar el check');
    } finally {
      setSaving(false);
      setSavingStep('');
    }
  }

  return (
    <ProtectedRoute allowedRoles={['chofer']}>
      <AppShell role="chofer">
        <form onSubmit={guardar} className="pb-28 lg:pb-0">
          <header className="mb-4 rounded-3xl bg-gradient-to-br from-[#07AE8B] to-[#6A5492] p-5 text-white shadow-sm sm:p-6">
            <p className="text-sm font-semibold text-white/80">Aviso y Check</p>
            <h1 className="mt-1 text-2xl font-bold">Regreso de ruta</h1>
            <p className="mt-2 text-sm text-white/85">
              Captura el estado de la unidad. Las fotos pueden tardar en subir dependiendo de la señal.
            </p>
          </header>

          {error && (
            <div className="mb-4 flex gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 shrink-0" size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 flex gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
              <span>{success}</span>
            </div>
          )}

          <section className="grid gap-4 xl:grid-cols-[390px_1fr]">
            <div className="space-y-4">
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
                    <p className="text-sm text-gray-600">{user?.ruta_nombre || 'Sin ruta'}</p>
                  </div>
                </div>
              </Card>

              <Card title="Avance del check">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <MiniStatus label="Unidad" done={Boolean(form.unidad_id)} />
                  <MiniStatus label="Fotos" done={fotosCompletas === 4} value={`${fotosCompletas}/4`} />
                  <MiniStatus label="Items" done={totalItems > 0} value={totalItems || '—'} />
                </div>
              </Card>

              <Card title="Datos de la unidad">
                <div className="space-y-4">
                  <MobileSelect
                    label="Unidad"
                    value={form.unidad_id}
                    onChange={(v) => setForm({ ...form, unidad_id: v })}
                    options={unidades}
                    getLabel={(x) => `${x.nombre} - ${x.placas}`}
                  />

                  <MobileInput
                    label="Kilometraje"
                    type="number"
                    inputMode="numeric"
                    value={form.kilometraje}
                    onChange={(v) => setForm({ ...form, kilometraje: v })}
                    placeholder="Kilometraje actual"
                  />

                  <MobileToggle
                    label="La unidad necesita servicio preventivo"
                    checked={form.reporta_servicio_preventivo}
                    onChange={(v) => setForm({ ...form, reporta_servicio_preventivo: v })}
                  />

                  {form.reporta_servicio_preventivo && (
                    <MobileTextarea
                      label="Detalle del servicio preventivo"
                      value={form.detalle_servicio_preventivo}
                      onChange={(v) => setForm({ ...form, detalle_servicio_preventivo: v })}
                    />
                  )}

                  <MobileTextarea
                    label="Observaciones"
                    value={form.observaciones}
                    onChange={(v) => setForm({ ...form, observaciones: v })}
                  />

                  <MobileTextarea
                    label="Observaciones de unidad"
                    value={form.observaciones_unidad}
                    onChange={(v) => setForm({ ...form, observaciones_unidad: v })}
                  />
                </div>
              </Card>

              <Card title="Fotos obligatorias" subtitle="Toma una foto por cada lado de la unidad.">
                <FotosObligatorias fotosBase={fotosBase} setFotosBase={setFotosBase} />

                <div className="mt-4">
                  <ExtraPhotosInput fotosExtra={fotosExtra} setFotosExtra={setFotosExtra} />
                </div>
              </Card>
            </div>

            <Card
              title="Checklist de unidad"
              subtitle="En móvil usa los botones grandes para marcar rápido."
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

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 p-3 shadow-2xl backdrop-blur lg:hidden">
            <button
              disabled={saving || loading}
              className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#07AE8B] px-4 py-3 text-base font-bold text-white hover:bg-[#069b7d] disabled:opacity-60"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              {saving ? 'Enviando...' : 'Enviar check'}
            </button>
          </div>

          <button
            disabled={saving || loading}
            className="mt-5 hidden w-full items-center justify-center gap-2 rounded-2xl bg-[#07AE8B] px-4 py-3 text-base font-bold text-white hover:bg-[#069b7d] disabled:opacity-60 lg:inline-flex"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {saving ? 'Enviando...' : 'Enviar check'}
          </button>
        </form>

        {saving && <SavingOverlay text={savingStep} />}
      </AppShell>
    </ProtectedRoute>
  );
}

function SavingOverlay({ text }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
        <Loader2 className="mx-auto animate-spin text-[#07AE8B]" size={38} />
        <h2 className="mt-4 text-lg font-bold text-gray-950">Enviando check</h2>
        <p className="mt-2 text-sm text-gray-600">
          {text || 'Estamos guardando la información. No cierres esta pantalla.'}
        </p>
        <div className="mt-4 rounded-2xl bg-yellow-50 p-3 text-xs font-medium text-yellow-800">
          Si estás con datos móviles, la subida de fotos puede tardar un poco.
        </div>
      </div>
    </div>
  );
}

function MiniStatus({ label, done, value }) {
  return (
    <div className={`rounded-2xl p-3 ${done ? 'bg-emerald-50' : 'bg-gray-50'}`}>
      <p className={`text-lg font-bold ${done ? 'text-emerald-700' : 'text-gray-500'}`}>
        {value || (done ? '✓' : '—')}
      </p>
      <p className="text-xs font-semibold text-gray-600">{label}</p>
    </div>
  );
}

function FotosObligatorias({ fotosBase, setFotosBase }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {FOTO_TIPOS_BASE.map((foto) => (
        <PhotoPicker
          key={foto.key}
          label={foto.label}
          file={fotosBase[foto.key]}
          onChange={(file) => setFotosBase((prev) => ({ ...prev, [foto.key]: file }))}
        />
      ))}
    </div>
  );
}

function PhotoPicker({ label, file, onChange }) {
  const inputRef = useRef(null);

  return (
    <div className={`rounded-2xl border p-3 ${file ? 'border-[#07AE8B] bg-[#07AE8B]/5' : 'border-gray-200 bg-white'}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <Camera size={17} />
          {label}
        </span>
        {file && <CheckCircle2 size={18} className="text-[#07AE8B]" />}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) onChange(selected);
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-3 py-2 text-sm font-bold text-white"
      >
        <ImagePlus size={18} />
        {file ? 'Cambiar foto' : 'Tomar foto'}
      </button>

      {file && <p className="mt-2 truncate text-xs font-medium text-[#04745f]">{file.name}</p>}
    </div>
  );
}

function ExtraPhotosInput({ fotosExtra, setFotosExtra }) {
  const inputRef = useRef(null);

  return (
    <div className="rounded-2xl border border-dashed border-gray-300 p-3">
      <p className="mb-2 text-sm font-bold text-gray-800">Fotos extra por incidente</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => setFotosExtra(Array.from(e.target.files || []))}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-800"
      >
        <ImagePlus size={18} />
        Agregar fotos extra
      </button>
      {fotosExtra.length > 0 && (
        <p className="mt-2 text-xs font-medium text-gray-600">
          {fotosExtra.length} foto(s) extra seleccionada(s)
        </p>
      )}
    </div>
  );
}

function Checklist({ itemsAgrupados, items, actualizarItem }) {
  return (
    <div className="space-y-3">
      {Object.entries(itemsAgrupados).map(([categoria, categoriaItems]) => (
        <details key={categoria} open={categoria === 'documentos'} className="rounded-2xl border border-gray-200 bg-white">
          <summary className="cursor-pointer px-4 py-4 text-base font-bold text-gray-900">
            <div className="inline-flex items-center gap-2">
              <ClipboardCheck size={18} />
              {labelize(categoria)}
            </div>
          </summary>

          <div className="space-y-3 border-t border-gray-100 p-3">
            {categoriaItems.map((item) => {
              const index = items.findIndex((x) => x.categoria === item.categoria && x.item === item.item);

              return (
                <div key={`${item.categoria}-${item.item}`} className="rounded-2xl bg-gray-50 p-3">
                  <div className="mb-3 text-sm font-bold text-gray-950">{item.item}</div>

                  <SegmentedEstado
                    value={item.estado}
                    onChange={(value) => actualizarItem(index, 'estado', value)}
                  />

                  <input
                    value={item.comentario}
                    onChange={(e) => actualizarItem(index, 'comentario', e.target.value)}
                    placeholder="Comentario opcional"
                    className="mt-3 min-h-11 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
                  />
                </div>
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}

function SegmentedEstado({ value, onChange }) {
  const options = [
    { value: 'bueno', label: 'Bueno' },
    { value: 'regular', label: 'Regular' },
    { value: 'malo', label: 'Malo' },
    { value: 'na', label: 'N/A' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold transition ${
              active
                ? option.value === 'bueno'
                  ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                  : option.value === 'regular'
                    ? 'border-yellow-300 bg-yellow-100 text-yellow-800'
                    : option.value === 'malo'
                      ? 'border-red-300 bg-red-100 text-red-800'
                      : 'border-gray-300 bg-gray-200 text-gray-800'
                : 'border-gray-200 bg-white text-gray-700'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function MobileInput({ label, value, onChange, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-gray-800">{label}</span>
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-12 w-full rounded-2xl border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
      />
    </label>
  );
}

function MobileSelect({ label, value, onChange, options, getLabel }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-gray-800">{label}</span>
      <select
        value={value}
        required
        onChange={(e) => onChange(e.target.value)}
        className="min-h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
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

function MobileTextarea({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-gray-800">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
      />
    </label>
  );
}

function MobileToggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left text-sm font-bold ${
        checked ? 'border-yellow-300 bg-yellow-50 text-yellow-900' : 'border-gray-200 bg-white text-gray-800'
      }`}
    >
      <span>{label}</span>
      <span className={`h-6 w-11 rounded-full p-1 transition ${checked ? 'bg-yellow-500' : 'bg-gray-300'}`}>
        <span className={`block h-4 w-4 rounded-full bg-white transition ${checked ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  );
}

function labelize(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
