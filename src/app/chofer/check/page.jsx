'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import Card from '@/components/Card';
import ConfirmOverlay from '@/components/ConfirmOverlay';
import { Input, Select, Textarea, ToggleCard } from '@/components/FormControls';
import { useToast } from '@/components/ToastProvider';
import { api } from '@/lib/api';
import { Camera, CheckCircle2, ClipboardCheck, ImagePlus, Save, Truck, X } from 'lucide-react';

const FOTO_TIPOS_BASE = [
  { key: 'frente', label: 'Frente', help: 'Foto de la parte frontal' },
  { key: 'lado_derecho', label: 'Lado derecho', help: 'Costado derecho completo' },
  { key: 'lado_izquierdo', label: 'Lado izquierdo', help: 'Costado izquierdo completo' },
  { key: 'atras', label: 'Atrás', help: 'Parte trasera de la unidad' },
];

const initialForm = {
  unidad_id: '',
  kilometraje: '',
  reporta_servicio_preventivo: false,
  detalle_servicio_preventivo: '',
  observaciones: '',
  observaciones_unidad: '',
};

const ESTADOS = [
  { value: 'bueno', label: 'Bueno', short: 'Bien', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  { value: 'regular', label: 'Regular', short: 'Regular', className: 'border-yellow-200 bg-yellow-50 text-yellow-800' },
  { value: 'malo', label: 'Malo', short: 'Malo', className: 'border-red-200 bg-red-50 text-red-800' },
  { value: 'na', label: 'N/A', short: 'N/A', className: 'border-gray-200 bg-gray-50 text-gray-700' },
];

export default function ChoferCheckPage() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [catalogoItems, setCatalogoItems] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [fotosBase, setFotosBase] = useState({});
  const [fotosExtra, setFotosExtra] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState('datos');

  const itemsAgrupados = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!acc[item.categoria]) acc[item.categoria] = [];
      acc[item.categoria].push(item);
      return acc;
    }, {});
  }, [items]);

  const fotosObligatoriasCompletas = FOTO_TIPOS_BASE.filter((foto) => fotosBase[foto.key]).length;
  const itemsConObservacion = items.filter((item) => ['regular', 'malo'].includes(item.estado)).length;
  const puedeEnviar = Boolean(form.unidad_id) && fotosObligatoriasCompletas === FOTO_TIPOS_BASE.length && !saving;

  async function cargar() {
    try {
      setLoading(true);
      const [me, unidadesRes, catalogo] = await Promise.all([api.me(), api.unidades(), api.catalogoChequeos()]);
      setUser(me);
      setUnidades(unidadesRes || []);
      setCatalogoItems(catalogo || []);
      setItems((catalogo || []).map((item) => ({ ...item, estado: 'bueno', comentario: '' })));
    } catch (err) {
      toast.error(err.message || 'No se pudo cargar la pantalla.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function limpiarFormulario() {
    setForm(initialForm);
    setFotosBase({});
    setFotosExtra([]);
    setItems(catalogoItems.map((item) => ({ ...item, estado: 'bueno', comentario: '' })));
    setStep('datos');
  }

  function actualizarItem(index, field, value) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function validar() {
    if (!form.unidad_id) {
      toast.error('Selecciona la unidad antes de continuar.');
      setStep('datos');
      return false;
    }

    const faltanFotos = FOTO_TIPOS_BASE.filter((foto) => !fotosBase[foto.key]);
    if (faltanFotos.length > 0) {
      toast.error(`Faltan fotos: ${faltanFotos.map((x) => x.label).join(', ')}.`);
      setStep('fotos');
      return false;
    }

    return true;
  }

  async function guardar(e) {
    e.preventDefault();
    if (!validar()) return;

    try {
      setSaving(true);
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

      await api.subirFotosChequeo(creado.id, formData);
      toast.success('Tu check fue enviado correctamente.');
      limpiarFormulario();
    } catch (err) {
      toast.error(err.message || 'No se pudo enviar el check. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedRoute allowedRoles={['chofer']}>
      <AppShell role="chofer">
        <ConfirmOverlay
          open={saving}
          title="Enviando check"
          message="Estamos subiendo las fotos. En celular puede tardar según la señal. No cierres esta pantalla."
          progressLabel="Guardando datos y evidencia..."
        />

        <div className="mobile-bottom-space">
          <header className="mb-5 rounded-[2rem] bg-gradient-to-br from-[#07AE8B] to-[#6A5492] p-5 text-white shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wide text-white/80">Aviso y Check</p>
            <h1 className="mt-1 text-2xl font-black">Reporta tu unidad</h1>
            <p className="mt-2 text-sm leading-6 text-white/85">
              Sigue los pasos. El sistema te avisará si falta información antes de enviar.
            </p>

            <div className="mt-5 flex items-center gap-3 rounded-3xl bg-white/12 p-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-xl font-black">
                {user?.nombre_completo?.[0] || 'C'}
              </div>
              <div className="min-w-0">
                <p className="truncate font-black">{user?.nombre_completo || user?.username || 'Chofer'}</p>
                <p className="truncate text-sm text-white/80">{user?.ruta_nombre || 'Sin ruta asignada'}</p>
              </div>
            </div>
          </header>

          <StepNav step={step} setStep={setStep} fotos={fotosObligatoriasCompletas} items={itemsConObservacion} />

          <form onSubmit={guardar} className="mt-5 space-y-5">
            {step === 'datos' && (
              <Card title="1. Datos generales" subtitle="Selecciona la unidad y escribe observaciones importantes.">
                <div className="space-y-4">
                  <Select
                    label="Unidad"
                    value={form.unidad_id}
                    onChange={(v) => setForm({ ...form, unidad_id: v })}
                    options={unidades}
                    getLabel={(x) => `${x.nombre} - ${x.placas}`}
                  />

                  <Input
                    label="Kilometraje actual"
                    type="number"
                    inputMode="numeric"
                    value={form.kilometraje}
                    onChange={(v) => setForm({ ...form, kilometraje: v })}
                    placeholder="Ej. 845120"
                  />

                  <ToggleCard
                    label="La unidad necesita servicio preventivo"
                    description="Actívalo si quieres dejar aviso y evitar penalización por no reportar."
                    checked={form.reporta_servicio_preventivo}
                    onChange={(v) => setForm({ ...form, reporta_servicio_preventivo: v })}
                  />

                  {form.reporta_servicio_preventivo && (
                    <Textarea
                      label="Detalle del servicio preventivo"
                      value={form.detalle_servicio_preventivo}
                      onChange={(v) => setForm({ ...form, detalle_servicio_preventivo: v })}
                      placeholder="Describe qué servicio o revisión necesita."
                    />
                  )}

                  <Textarea
                    label="Observaciones generales"
                    value={form.observaciones}
                    onChange={(v) => setForm({ ...form, observaciones: v })}
                    placeholder="Ej. Unidad entregada sin novedad."
                  />

                  <Textarea
                    label="Observaciones de unidad"
                    value={form.observaciones_unidad}
                    onChange={(v) => setForm({ ...form, observaciones_unidad: v })}
                    placeholder="Ej. Golpe, fuga, llanta baja, ruido, etc."
                  />

                  <NextButton onClick={() => setStep('fotos')} label="Continuar a fotos" />
                </div>
              </Card>
            )}

            {step === 'fotos' && (
              <Card title="2. Fotos obligatorias" subtitle="Toma las 4 fotos principales. Los botones son grandes para celular.">
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {FOTO_TIPOS_BASE.map((foto) => (
                      <PhotoButton
                        key={foto.key}
                        foto={foto}
                        file={fotosBase[foto.key]}
                        onChange={(file) => setFotosBase((prev) => ({ ...prev, [foto.key]: file }))}
                      />
                    ))}
                  </div>

                  <label className="block rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 p-4">
                    <span className="flex items-center gap-2 font-black text-gray-950">
                      <ImagePlus size={20} /> Fotos extra por incidente
                    </span>
                    <span className="mt-1 block text-sm text-gray-600">Opcional. Agrega evidencias adicionales si hay una falla.</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={(e) => setFotosExtra(Array.from(e.target.files || []))}
                      className="mt-3 w-full text-sm text-gray-800"
                    />
                    {fotosExtra.length > 0 && <span className="mt-2 block text-sm font-bold text-[#04745f]">{fotosExtra.length} foto(s) extra seleccionada(s)</span>}
                  </label>

                  <NextButton onClick={() => setStep('checklist')} label="Continuar al checklist" />
                </div>
              </Card>
            )}

            {step === 'checklist' && (
              <Card title="3. Checklist de unidad" subtitle="Solo cambia lo que esté regular, malo o no aplique.">
                {loading ? (
                  <p className="py-8 text-center text-gray-600">Cargando checklist...</p>
                ) : (
                  <Checklist itemsAgrupados={itemsAgrupados} items={items} actualizarItem={actualizarItem} />
                )}
              </Card>
            )}
          </form>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 p-3 shadow-2xl backdrop-blur lg:left-[19rem] lg:hidden safe-bottom">
          <button
            type="button"
            onClick={guardar}
            disabled={!puedeEnviar}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#07AE8B] font-black text-white disabled:bg-gray-300 disabled:text-gray-500"
          >
            <Save size={20} />
            {saving ? 'Enviando...' : 'Enviar check'}
          </button>
          {!puedeEnviar && <p className="mt-2 text-center text-xs font-semibold text-gray-500">Completa unidad y 4 fotos para enviar.</p>}
        </div>

        <div className="mt-5 hidden lg:block">
          <button
            type="button"
            onClick={guardar}
            disabled={!puedeEnviar}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#07AE8B] font-black text-white disabled:bg-gray-300 disabled:text-gray-500"
          >
            <Save size={20} />
            {saving ? 'Enviando...' : 'Enviar check'}
          </button>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

function StepNav({ step, setStep, fotos, items }) {
  const steps = [
    { id: 'datos', label: 'Datos', icon: Truck, detail: 'Unidad' },
    { id: 'fotos', label: 'Fotos', icon: Camera, detail: `${fotos}/4` },
    { id: 'checklist', label: 'Check', icon: ClipboardCheck, detail: `${items} obs.` },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {steps.map((item) => {
        const Icon = item.icon;
        const active = step === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setStep(item.id)}
            className={`rounded-3xl border p-3 text-left transition ${active ? 'border-[#07AE8B] bg-[#07AE8B]/10' : 'border-gray-200 bg-white'}`}
          >
            <Icon size={19} className={active ? 'text-[#04745f]' : 'text-gray-500'} />
            <p className="mt-2 text-sm font-black text-gray-950">{item.label}</p>
            <p className="text-xs font-semibold text-gray-500">{item.detail}</p>
          </button>
        );
      })}
    </div>
  );
}

function PhotoButton({ foto, file, onChange }) {
  const inputId = `foto-${foto.key}`;

  return (
    <label
      htmlFor={inputId}
      className={`block cursor-pointer rounded-3xl border-2 p-4 transition ${file ? 'border-[#07AE8B] bg-[#07AE8B]/10' : 'border-dashed border-gray-200 bg-white hover:bg-gray-50'}`}
    >
      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        required
        onChange={(e) => {
          const nextFile = e.target.files?.[0];
          if (nextFile) onChange(nextFile);
        }}
        className="sr-only"
      />
      <div className="flex items-center gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${file ? 'bg-[#07AE8B] text-white' : 'bg-gray-100 text-gray-600'}`}>
          {file ? <CheckCircle2 size={23} /> : <Camera size={23} />}
        </div>
        <div className="min-w-0">
          <p className="font-black text-gray-950">{foto.label}</p>
          <p className="truncate text-sm text-gray-600">{file ? file.name : foto.help}</p>
        </div>
      </div>
    </label>
  );
}

function Checklist({ itemsAgrupados, items, actualizarItem }) {
  return (
    <div className="space-y-3">
      {Object.entries(itemsAgrupados).map(([categoria, categoriaItems], catIndex) => (
        <details key={categoria} open={catIndex === 0} className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
          <summary className="cursor-pointer bg-gray-50 px-4 py-4 text-base font-black text-gray-950">{labelize(categoria)}</summary>
          <div className="space-y-4 p-4">
            {categoriaItems.map((item) => {
              const index = items.findIndex((x) => x.categoria === item.categoria && x.item === item.item);
              return (
                <div key={`${item.categoria}-${item.item}`} className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="font-black text-gray-950">{item.item}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {ESTADOS.map((estado) => (
                      <button
                        key={estado.value}
                        type="button"
                        onClick={() => actualizarItem(index, 'estado', estado.value)}
                        className={`rounded-2xl border px-3 py-2 text-sm font-black ${item.estado === estado.value ? estado.className : 'border-gray-200 bg-gray-50 text-gray-600'}`}
                      >
                        {estado.short}
                      </button>
                    ))}
                  </div>
                  {['regular', 'malo'].includes(item.estado) && (
                    <div className="mt-3 flex gap-2">
                      <input
                        value={item.comentario}
                        onChange={(e) => actualizarItem(index, 'comentario', e.target.value)}
                        placeholder="Describe el problema"
                        className="h-12 flex-1 rounded-2xl border border-gray-300 px-4 text-base text-gray-950 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
                      />
                      {item.comentario && (
                        <button type="button" onClick={() => actualizarItem(index, 'comentario', '')} className="h-12 w-12 rounded-2xl border border-gray-200 text-gray-600">
                          <X size={18} className="mx-auto" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}

function NextButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-13 w-full rounded-2xl border border-gray-200 bg-gray-950 px-4 font-black text-white shadow-sm lg:hidden"
    >
      {label}
    </button>
  );
}

function labelize(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
