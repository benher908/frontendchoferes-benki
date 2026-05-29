"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import { api } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { fmtDate } from "@/lib/formatters";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Filter,
  History,
  ImagePlus,
  Loader2,
  RefreshCcw,
  Save,
  X,
} from "lucide-react";

const FOTO_TIPOS_BASE = [
  { key: "frente", label: "Frente" },
  { key: "lado_derecho", label: "Lado derecho" },
  { key: "lado_izquierdo", label: "Lado izquierdo" },
  { key: "atras", label: "Atrás" },
];

const initialForm = {
  tipo: "checador",
  unidad_id: "",
  chofer_id: "",
  kilometraje: "",
  reporta_servicio_preventivo: false,
  detalle_servicio_preventivo: "",
  observaciones: "",
  observaciones_unidad: "",
};

export default function ChecadorChequeosPage() {
  const [activeTab, setActiveTab] = useState("nuevo");
  const [catalogos, setCatalogos] = useState({ choferes: [], unidades: [] });
  const [catalogoItems, setCatalogoItems] = useState([]);
  const [items, setItems] = useState([]);

  const [form, setForm] = useState(initialForm);
  const [fotosBase, setFotosBase] = useState({});
  const [fotosExtra, setFotosExtra] = useState([]);

  const [chequeos, setChequeos] = useState([]);
  const [detalle, setDetalle] = useState(null);

  const [filtros, setFiltros] = useState({
    chofer_id: "",
    unidad_id: "",
    tipo: "",
    fecha_desde: "",
    fecha_hasta: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingStep, setSavingStep] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const toast = useToast();

  const fotosCompletas = FOTO_TIPOS_BASE.filter(
    (foto) => fotosBase[foto.key],
  ).length;

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
      setError("");

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
          estado: "bueno",
          comentario: "",
        })),
      );

      await cargarChequeos();
    } catch (err) {
      toast.error(err.message || "No se pudo cargar la información");
      setError(err.message || "No se pudo cargar la información");
    } finally {
      setLoading(false);
    }
  }

  async function cargarChequeos() {
    const params = new URLSearchParams();

    Object.entries(filtros).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    const query = params.toString() ? `?${params.toString()}` : "";
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
      setError("");
      await cargarChequeos();
      setActiveTab("historial");
    } catch (err) {
      setError(err.message || "No se pudieron aplicar los filtros");
    }
  }

  function limpiarFiltros() {
    setFiltros({
      chofer_id: "",
      unidad_id: "",
      tipo: "",
      fecha_desde: "",
      fecha_hasta: "",
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
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  async function cargarChequeoEspejo() {
    if (!form.unidad_id) {
      setError("Selecciona una unidad para cargar el chequeo espejo");
      return;
    }

    try {
      setError("");
      const data = await api.ultimoChequeoChofer({
        unidad_id: form.unidad_id,
        chofer_id: form.chofer_id || undefined,
      });

      if (!data) {
        toast.info("No hay chequeo previo para esta unidad");
        setSuccess("No hay chequeo previo para esta unidad");
        return;
      }

      const espejoItems = catalogoItems.map((base) => {
        const encontrado = data.items?.find(
          (x) => x.categoria === base.categoria && x.item === base.item,
        );
        return {
          ...base,
          estado: encontrado?.estado || "bueno",
          comentario: encontrado?.comentario || "",
        };
      });

      setItems(espejoItems);
      toast.success("Chequeo espejo cargado correctamente");
      setSuccess("Chequeo espejo cargado correctamente");
    } catch (err) {
      setError(err.message || "No se pudo cargar el chequeo espejo");
    }
  }

  async function verDetalle(id) {
    try {
      setError("");
      const data = await api.obtenerChequeo(id);
      setDetalle(data);
      setActiveTab("historial");
    } catch (err) {
      setError(err.message || "No se pudo cargar el detalle");
    }
  }

  function limpiarFormulario() {
    setForm(initialForm);
    setFotosBase({});
    setFotosExtra([]);
    setItems(
      catalogoItems.map((item) => ({
        ...item,
        estado: "bueno",
        comentario: "",
      })),
    );
  }

  function validarAntesDeEnviar() {
    if (!form.unidad_id) return "La unidad es requerida";
    if (form.tipo === "checador" && !form.chofer_id)
      return "Selecciona el chofer relacionado al chequeo";

    const faltanFotos = FOTO_TIPOS_BASE.filter((foto) => !fotosBase[foto.key]);
    if (faltanFotos.length > 0)
      return `Faltan fotos obligatorias: ${faltanFotos.map((x) => x.label).join(", ")}`;

    return "";
  }

  async function guardarChequeo(e) {
    e.preventDefault();

    const validationError = validarAntesDeEnviar();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      setSavingStep("Guardando datos del chequeo...");

      const payload = {
        ...form,
        unidad_id: Number(form.unidad_id),
        chofer_id: form.chofer_id ? Number(form.chofer_id) : null,
        kilometraje: form.kilometraje === "" ? null : Number(form.kilometraje),
        items: items.map((item) => ({
          categoria: item.categoria,
          item: item.item,
          estado: item.estado || "bueno",
          comentario: item.comentario || null,
        })),
      };

      const creado = await api.crearChequeo(payload);

      const formData = new FormData();
      FOTO_TIPOS_BASE.forEach((foto) => {
        const file = fotosBase[foto.key];
        if (file) {
          formData.append("fotos", file);
          formData.append("tipos", foto.key);
        }
      });

      fotosExtra.forEach((file) => {
        formData.append("fotos", file);
        formData.append("tipos", "incidente");
      });

      setSavingStep(
        "Subiendo fotos. Puede tardar unos segundos si la señal está lenta...",
      );
      await api.subirFotosChequeo(creado.id, formData);

      setSavingStep("Actualizando historial...");
      toast.success("Chequeo registrado correctamente");
      setSuccess("Chequeo registrado correctamente");
      limpiarFormulario();
      await cargarChequeos();
      setActiveTab("historial");
    } catch (err) {
      setError(err.message || "No se pudo guardar el chequeo");
    } finally {
      setSaving(false);
      setSavingStep("");
    }
  }

  return (
    <ProtectedRoute allowedRoles={["checador_unidad"]}>
      <AppShell role="checador_unidad">
        <header className="mb-4 rounded-3xl bg-gradient-to-br from-[#07AE8B] to-[#6A5492] p-5 text-white shadow-sm sm:p-6">
          <p className="text-sm font-semibold text-white/80">
            Checador de unidades
          </p>
          <h1 className="mt-1 text-2xl font-bold">Chequeos</h1>
          <p className="mt-2 text-sm text-white/85">
            Interfaz optimizada para móvil: botones grandes, avance claro y
            confirmación durante la subida.
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

        <div className="sticky top-[65px] z-20 mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm lg:static">
          <button
            type="button"
            onClick={() => setActiveTab("nuevo")}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold ${activeTab === "nuevo" ? "bg-[#07AE8B] text-white" : "text-gray-700 hover:bg-gray-50"}`}
          >
            <Camera size={18} />
            Nuevo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("historial")}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold ${activeTab === "historial" ? "bg-[#07AE8B] text-white" : "text-gray-700 hover:bg-gray-50"}`}
          >
            <History size={18} />
            Historial
          </button>
        </div>

        <section className="grid gap-5 xl:grid-cols-[470px_1fr]">
          <div className={activeTab === "nuevo" ? "block" : "hidden xl:block"}>
            <form onSubmit={guardarChequeo} className="space-y-4 pb-28 lg:pb-0">
              <Card title="Avance del chequeo">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <MiniStatus label="Unidad" done={Boolean(form.unidad_id)} />
                  <MiniStatus label="Chofer" done={Boolean(form.chofer_id)} />
                  <MiniStatus
                    label="Fotos"
                    done={fotosCompletas === 4}
                    value={`${fotosCompletas}/4`}
                  />
                </div>
              </Card>

              <Card title="Datos generales">
                <div className="space-y-4">
                  <MobileSelect
                    label="Tipo"
                    value={form.tipo}
                    onChange={(v) => setForm({ ...form, tipo: v })}
                    options={[
                      { id: "checador", nombre: "Checador / Supervisor" },
                      { id: "chofer", nombre: "Chofer" },
                    ]}
                    getLabel={(x) => x.nombre}
                  />

                  <MobileSelect
                    label="Unidad"
                    value={form.unidad_id}
                    onChange={(v) => setForm({ ...form, unidad_id: v })}
                    options={catalogos.unidades}
                    getLabel={(x) => `${x.nombre} - ${x.placas}`}
                  />

                  <MobileSelect
                    label="Chofer"
                    value={form.chofer_id}
                    onChange={(v) => setForm({ ...form, chofer_id: v })}
                    options={catalogos.choferes}
                    getLabel={(x) =>
                      `${x.nombre}${x.ruta_nombre ? ` - ${x.ruta_nombre}` : ""}`
                    }
                  />

                  <MobileInput
                    label="Kilometraje"
                    type="number"
                    inputMode="numeric"
                    value={form.kilometraje}
                    onChange={(v) => setForm({ ...form, kilometraje: v })}
                  />

                  <button
                    type="button"
                    onClick={cargarChequeoEspejo}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-800 hover:bg-gray-50"
                  >
                    <RefreshCcw size={18} />
                    Cargar chequeo espejo
                  </button>

                  <MobileToggle
                    label="Reporta servicio preventivo"
                    checked={form.reporta_servicio_preventivo}
                    onChange={(v) =>
                      setForm({ ...form, reporta_servicio_preventivo: v })
                    }
                  />

                  {form.reporta_servicio_preventivo && (
                    <MobileTextarea
                      label="Detalle del servicio preventivo"
                      value={form.detalle_servicio_preventivo}
                      onChange={(v) =>
                        setForm({ ...form, detalle_servicio_preventivo: v })
                      }
                    />
                  )}

                  <MobileTextarea
                    label="Observaciones generales"
                    value={form.observaciones}
                    onChange={(v) => setForm({ ...form, observaciones: v })}
                  />

                  <MobileTextarea
                    label="Observaciones de unidad"
                    value={form.observaciones_unidad}
                    onChange={(v) =>
                      setForm({ ...form, observaciones_unidad: v })
                    }
                  />
                </div>
              </Card>

              <Card
                title="Fotos obligatorias"
                subtitle="Toca cada botón para abrir la cámara."
              >
                <FotosObligatorias
                  fotosBase={fotosBase}
                  setFotosBase={setFotosBase}
                />
                <div className="mt-4">
                  <ExtraPhotosInput
                    fotosExtra={fotosExtra}
                    setFotosExtra={setFotosExtra}
                  />
                </div>
              </Card>

              <Card title="Checklist de unidad">
                <Checklist
                  itemsAgrupados={itemsAgrupados}
                  items={items}
                  actualizarItem={actualizarItem}
                />
              </Card>

              <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 p-3 shadow-2xl backdrop-blur lg:hidden">
                <button
                  disabled={saving || loading}
                  className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#07AE8B] px-4 py-3 text-base font-bold text-white hover:bg-[#069b7d] disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Save size={20} />
                  )}
                  {saving ? "Guardando..." : "Guardar chequeo"}
                </button>
              </div>

              <button
                disabled={saving || loading}
                className="hidden w-full items-center justify-center gap-2 rounded-2xl bg-[#07AE8B] px-4 py-3 text-base font-bold text-white hover:bg-[#069b7d] disabled:opacity-60 lg:inline-flex"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Save size={20} />
                )}
                {saving ? "Guardando..." : "Guardar chequeo"}
              </button>
            </form>
          </div>

          <div
            className={
              activeTab === "historial"
                ? "block space-y-5"
                : "hidden space-y-5 xl:block"
            }
          >
            <Card title="Filtros de historial">
              <form
                onSubmit={aplicarFiltros}
                className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"
              >
                <MobileSelect
                  label="Chofer"
                  value={filtros.chofer_id}
                  onChange={(v) => setFiltros({ ...filtros, chofer_id: v })}
                  options={catalogos.choferes}
                  getLabel={(x) => x.nombre}
                  optional
                />
                <MobileSelect
                  label="Unidad"
                  value={filtros.unidad_id}
                  onChange={(v) => setFiltros({ ...filtros, unidad_id: v })}
                  options={catalogos.unidades}
                  getLabel={(x) => `${x.nombre} - ${x.placas}`}
                  optional
                />
                <MobileSelect
                  label="Tipo"
                  value={filtros.tipo}
                  onChange={(v) => setFiltros({ ...filtros, tipo: v })}
                  options={[
                    { id: "chofer", nombre: "Chofer" },
                    { id: "checador", nombre: "Checador" },
                  ]}
                  getLabel={(x) => x.nombre}
                  optional
                />
                <MobileInput
                  label="Desde"
                  type="date"
                  value={filtros.fecha_desde}
                  onChange={(v) => setFiltros({ ...filtros, fecha_desde: v })}
                />
                <MobileInput
                  label="Hasta"
                  type="date"
                  value={filtros.fecha_hasta}
                  onChange={(v) => setFiltros({ ...filtros, fecha_hasta: v })}
                />

                <div className="flex gap-2 md:col-span-2 xl:col-span-5">
                  <button className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#07AE8B] px-4 py-3 text-sm font-bold text-white hover:bg-[#069b7d]">
                    <Filter size={18} />
                    Aplicar
                  </button>

                  <button
                    type="button"
                    onClick={limpiarFiltros}
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-800 hover:bg-gray-50"
                  >
                    <X size={18} />
                    Limpiar
                  </button>
                </div>
              </form>
            </Card>

            <Card title="Historial de chequeos">
              {loading ? (
                <p className="py-8 text-center text-gray-600">
                  Cargando chequeos...
                </p>
              ) : (
                <ChequeosTable rows={chequeos} onDetalle={verDetalle} />
              )}
            </Card>

            {detalle && (
              <Card title="Detalle del chequeo">
                <DetalleChequeo
                  data={detalle}
                  onClose={() => setDetalle(null)}
                />
              </Card>
            )}
          </div>
        </section>

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
        <h2 className="mt-4 text-lg font-bold text-gray-950">
          Guardando chequeo
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {text || "No cierres esta pantalla."}
        </p>
        <div className="mt-4 rounded-2xl bg-yellow-50 p-3 text-xs font-medium text-yellow-800">
          Las fotos pueden tardar más con señal débil o datos móviles.
        </div>
      </div>
    </div>
  );
}

function MiniStatus({ label, done, value }) {
  return (
    <div className={`rounded-2xl p-3 ${done ? "bg-emerald-50" : "bg-gray-50"}`}>
      <p
        className={`text-lg font-bold ${done ? "text-emerald-700" : "text-gray-500"}`}
      >
        {value || (done ? "✓" : "—")}
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
          onChange={(file) =>
            setFotosBase((prev) => ({ ...prev, [foto.key]: file }))
          }
        />
      ))}
    </div>
  );
}

function PhotoPicker({ label, file, onChange }) {
  const inputRef = useRef(null);

  return (
    <div
      className={`rounded-2xl border p-3 ${file ? "border-[#07AE8B] bg-[#07AE8B]/5" : "border-gray-200 bg-white"}`}
    >
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
        {file ? "Cambiar foto" : "Tomar foto"}
      </button>
      {file && (
        <p className="mt-2 truncate text-xs font-medium text-[#04745f]">
          {file.name}
        </p>
      )}
    </div>
  );
}

function ExtraPhotosInput({ fotosExtra, setFotosExtra }) {
  const inputRef = useRef(null);
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 p-3">
      <p className="mb-2 text-sm font-bold text-gray-800">
        Fotos extra por incidente
      </p>
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
        <details
          key={categoria}
          className="rounded-2xl border border-gray-200 bg-white"
        >
          <summary className="cursor-pointer px-4 py-4 text-base font-bold text-gray-900">
            <div className="inline-flex items-center gap-2">
              <ClipboardCheck size={18} />
              {labelize(categoria)}
            </div>
          </summary>
          <div className="space-y-3 border-t border-gray-100 p-3">
            {categoriaItems.map((item) => {
              const index = items.findIndex(
                (x) => x.categoria === item.categoria && x.item === item.item,
              );
              return (
                <div
                  key={`${item.categoria}-${item.item}`}
                  className="rounded-2xl bg-gray-50 p-3"
                >
                  <div className="mb-3 text-sm font-bold text-gray-950">
                    {item.item}
                  </div>
                  <SegmentedEstado
                    value={item.estado}
                    onChange={(value) => actualizarItem(index, "estado", value)}
                  />
                  <input
                    value={item.comentario}
                    onChange={(e) =>
                      actualizarItem(index, "comentario", e.target.value)
                    }
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
    { value: "bueno", label: "Bueno" },
    { value: "regular", label: "Regular" },
    { value: "malo", label: "Malo" },
    { value: "na", label: "N/A" },
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
            className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold transition ${active ? (option.value === "bueno" ? "border-emerald-300 bg-emerald-100 text-emerald-800" : option.value === "regular" ? "border-yellow-300 bg-yellow-100 text-yellow-800" : option.value === "malo" ? "border-red-300 bg-red-100 text-red-800" : "border-gray-300 bg-gray-200 text-gray-800") : "border-gray-200 bg-white text-gray-700"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ChequeosTable({ rows, onDetalle }) {
  return (
    <>
      <div className="space-y-3 lg:hidden">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onDetalle(row.id)}
            className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-gray-950">
                  {row.unidad_nombre || "—"}
                </p>
                <p className="text-sm text-gray-600">
                  {row.placas || "Sin placas"} ·{" "}
                  {row.chofer_nombre || "Sin chofer"}
                </p>
              </div>
              <Eye size={18} className="text-gray-500" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-700">
              <InfoPill label="Fecha" value={fmtDate(row.fecha)} />
              <InfoPill label="Km" value={row.kilometraje || "—"} />
              <InfoPill label="Fotos" value={row.fotos_count || 0} />
            </div>
          </button>
        ))}
        {rows.length === 0 && (
          <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-600">
            No hay chequeos registrados.
          </p>
        )}
      </div>
      <DesktopTable rows={rows} onDetalle={onDetalle} />
    </>
  );
}

function DesktopTable({ rows, onDetalle }) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-gray-100 lg:block">
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
                <div className="font-semibold text-gray-950">
                  {fmtDate(row.fecha)}
                </div>
                <div className="text-xs text-gray-600">{row.hora || "—"}</div>
              </td>
              <td className="px-3 py-3 text-gray-900">
                <div className="font-medium">{row.unidad_nombre || "—"}</div>
                <div className="text-xs text-gray-600">
                  {row.placas || "Sin placas"}
                </div>
              </td>
              <td className="px-3 py-3 text-gray-900">
                {row.chofer_nombre || "—"}
              </td>
              <td className="px-3 py-3 text-gray-900">{row.tipo}</td>
              <td className="px-3 py-3 text-right text-gray-900">
                {row.kilometraje || "—"}
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

function InfoPill({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 p-2">
      <p className="font-semibold text-gray-500">{label}</p>
      <p className="font-bold text-gray-950">{value}</p>
    </div>
  );
}

function DetalleChequeo({ data, onClose }) {
  const itemsMalos =
    data.items?.filter((item) => ["malo", "regular"].includes(item.estado)) ||
    [];

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm font-bold text-gray-800 hover:bg-gray-50"
        >
          <X size={16} />
          Cerrar detalle
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <MiniMetric label="Unidad" value={data.unidad_nombre || "—"} />
        <MiniMetric label="Placas" value={data.placas || "—"} />
        <MiniMetric label="Chofer" value={data.chofer_nombre || "—"} />
        <MiniMetric label="Kilometraje" value={data.kilometraje || "—"} />
      </div>
      <div className="rounded-2xl bg-gray-50 p-4">
        <p className="text-sm font-semibold text-gray-950">Observaciones</p>
        <p className="mt-1 text-sm text-gray-700">
          {data.observaciones ||
            data.observaciones_unidad ||
            "Sin observaciones"}
        </p>
        {data.reporta_servicio_preventivo ? (
          <div className="mt-3 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
            <strong>Servicio preventivo reportado:</strong>{" "}
            {data.detalle_servicio_preventivo || "Sin detalle"}
          </div>
        ) : null}
      </div>
      <div>
        <h3 className="mb-3 font-semibold text-gray-950">
          Items con observación
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
                  <td className="px-3 py-3">{item.comentario || "—"}</td>
                </tr>
              ))}
              {itemsMalos.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    className="px-3 py-8 text-center text-gray-600"
                  >
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

function MobileInput({ label, value, onChange, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-gray-800">
        {label}
      </span>
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-12 w-full rounded-2xl border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
      />
    </label>
  );
}

function MobileSelect({
  label,
  value,
  onChange,
  options,
  getLabel,
  optional = false,
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-gray-800">
        {label}
      </span>
      <select
        value={value}
        required={!optional}
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
      <span className="mb-1 block text-sm font-bold text-gray-800">
        {label}
      </span>
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
      className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left text-sm font-bold ${checked ? "border-yellow-300 bg-yellow-50 text-yellow-900" : "border-gray-200 bg-white text-gray-800"}`}
    >
      <span>{label}</span>
      <span
        className={`h-6 w-11 rounded-full p-1 transition ${checked ? "bg-yellow-500" : "bg-gray-300"}`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white transition ${checked ? "translate-x-5" : ""}`}
        />
      </span>
    </button>
  );
}

function labelize(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
