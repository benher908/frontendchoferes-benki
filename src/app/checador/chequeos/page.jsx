"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import ConfirmOverlay from "@/components/ConfirmOverlay";
import { Input, Select, Textarea, ToggleCard } from "@/components/FormControls";
import { useToast } from "@/components/ToastProvider";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/formatters";
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Filter,
  History,
  ImagePlus,
  RefreshCcw,
  Save,
  Search,
  Truck,
  X,
} from "lucide-react";

const FOTO_TIPOS_BASE = [
  { key: "frente", label: "Frente", help: "Foto frontal" },
  { key: "lado_derecho", label: "Lado derecho", help: "Costado derecho" },
  { key: "lado_izquierdo", label: "Lado izquierdo", help: "Costado izquierdo" },
  { key: "atras", label: "Atrás", help: "Parte trasera" },
];

const ESTADOS = [
  {
    value: "bueno",
    label: "Bueno",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  {
    value: "regular",
    label: "Regular",
    className: "border-yellow-200 bg-yellow-50 text-yellow-800",
  },
  {
    value: "malo",
    label: "Malo",
    className: "border-red-200 bg-red-50 text-red-800",
  },
  {
    value: "na",
    label: "N/A",
    className: "border-gray-200 bg-gray-50 text-gray-700",
  },
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
  const toast = useToast();
  const [catalogos, setCatalogos] = useState({ choferes: [], unidades: [] });
  const [catalogoItems, setCatalogoItems] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [fotosBase, setFotosBase] = useState({});
  const [fotosExtra, setFotosExtra] = useState([]);
  const [chequeos, setChequeos] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [activeTab, setActiveTab] = useState("nuevo");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filtros, setFiltros] = useState({
    chofer_id: "",
    unidad_id: "",
    tipo: "",
    fecha_desde: "",
    fecha_hasta: "",
  });

  const itemsAgrupados = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!acc[item.categoria]) acc[item.categoria] = [];
      acc[item.categoria].push(item);
      return acc;
    }, {});
  }, [items]);

  const fotosCompletas = FOTO_TIPOS_BASE.filter(
    (foto) => fotosBase[foto.key],
  ).length;
  const puedeGuardar =
    Boolean(form.unidad_id && form.chofer_id) &&
    fotosCompletas === 4 &&
    !saving;

  async function cargarBase() {
    try {
      setLoading(true);
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
      toast.error(err.message || "No se pudo cargar la información.");
    } finally {
      setLoading(false);
    }
  }

  async function cargarChequeos(nextFiltros = filtros) {
    const params = new URLSearchParams();
    Object.entries(nextFiltros).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const query = params.toString() ? `?${params.toString()}` : "";
    const data = await api.listarChequeos(query);
    setChequeos(data || []);
  }

  useEffect(() => {
    cargarBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function actualizarItem(index, field, value) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  async function cargarChequeoEspejo() {
    if (!form.unidad_id) {
      toast.error("Primero selecciona una unidad.");
      return;
    }

    try {
      const data = await api.ultimoChequeoChofer({
        unidad_id: form.unidad_id,
        chofer_id: form.chofer_id || undefined,
      });
      if (!data) {
        toast.info("No hay chequeo previo para esta unidad.");
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
      toast.success("Chequeo espejo cargado.");
    } catch (err) {
      toast.error(err.message || "No se pudo cargar el chequeo espejo.");
    }
  }

  async function aplicarFiltros(e) {
    e.preventDefault();
    try {
      await cargarChequeos();
      toast.success("Filtros aplicados.");
    } catch (err) {
      toast.error(err.message || "No se pudieron aplicar los filtros.");
    }
  }

  async function limpiarFiltros() {
    const clean = {
      chofer_id: "",
      unidad_id: "",
      tipo: "",
      fecha_desde: "",
      fecha_hasta: "",
    };
    setFiltros(clean);
    try {
      await cargarChequeos(clean);
    } catch {}
  }

  async function verDetalle(id) {
    try {
      const data = await api.obtenerChequeo(id);
      setDetalle(data);
    } catch (err) {
      toast.error(err.message || "No se pudo cargar el detalle.");
    }
  }

  function validar() {
    if (!form.unidad_id) {
      toast.error("Selecciona una unidad.");
      return false;
    }
    if (!form.chofer_id) {
      toast.error("Selecciona el chofer relacionado al chequeo.");
      return false;
    }
    const faltanFotos = FOTO_TIPOS_BASE.filter((foto) => !fotosBase[foto.key]);
    if (faltanFotos.length > 0) {
      toast.error(
        `Faltan fotos: ${faltanFotos.map((x) => x.label).join(", ")}.`,
      );
      return false;
    }
    return true;
  }

  async function guardarChequeo(e) {
    e.preventDefault();
    if (!validar()) return;

    try {
      setSaving(true);
      const payload = {
        ...form,
        unidad_id: Number(form.unidad_id),
        chofer_id: Number(form.chofer_id),
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
      await api.subirFotosChequeo(creado.id, formData);
      toast.success("Chequeo registrado correctamente.");
      limpiarFormulario();
      await cargarChequeos();
      setActiveTab("historial");
    } catch (err) {
      toast.error(
        err.message ||
          "No se pudo guardar el chequeo. Revisa la conexión y el tamaño de las fotos.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedRoute allowedRoles={["checador_unidad"]}>
      <AppShell role="checador_unidad">
        <ConfirmOverlay
          open={saving}
          title="Guardando chequeo"
          message="Estamos subiendo fotos. En móvil puede tardar por la señal. Mantén esta pantalla abierta."
          progressLabel="Subiendo evidencia..."
        />

        <header className="mb-5 rounded-[2rem] bg-gradient-to-br from-gray-950 to-[#6A5492] p-5 text-white shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-white/70">
            Checador de unidad
          </p>
          <h1 className="mt-1 text-2xl font-black">
            Chequeos claros y rápidos
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/80">
            Registra una revisión o consulta el historial sin perderte entre
            tablas.
          </p>
        </header>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-3xl bg-white p-2 shadow-sm lg:hidden">
          <TabButton
            active={activeTab === "nuevo"}
            onClick={() => setActiveTab("nuevo")}
            icon={<ClipboardCheck size={18} />}
            label="Nuevo"
          />
          <TabButton
            active={activeTab === "historial"}
            onClick={() => setActiveTab("historial")}
            icon={<History size={18} />}
            label="Historial"
          />
        </div>

        <section className="grid gap-5 xl:grid-cols-[470px_1fr]">
          <div className={`${activeTab !== "nuevo" ? "hidden lg:block" : ""}`}>
            <Card
              title="Nuevo chequeo"
              subtitle="Paso a paso para registrar unidad, fotos y checklist."
            >
              <form onSubmit={guardarChequeo} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
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
                    getLabel={(x) =>
                      `${x.nombre}${x.ruta_nombre ? ` - ${x.ruta_nombre}` : ""}`
                    }
                  />
                </div>

                <Input
                  label="Kilometraje"
                  type="number"
                  inputMode="numeric"
                  value={form.kilometraje}
                  onChange={(v) => setForm({ ...form, kilometraje: v })}
                />

                <button
                  type="button"
                  onClick={cargarChequeoEspejo}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white font-black text-gray-800"
                >
                  <RefreshCcw size={18} /> Cargar chequeo espejo
                </button>

                <ToggleCard
                  label="Reporta servicio preventivo"
                  description="Úsalo cuando la unidad necesite revisión o mantenimiento."
                  checked={form.reporta_servicio_preventivo}
                  onChange={(v) =>
                    setForm({ ...form, reporta_servicio_preventivo: v })
                  }
                />

                {form.reporta_servicio_preventivo && (
                  <Textarea
                    label="Detalle preventivo"
                    value={form.detalle_servicio_preventivo}
                    onChange={(v) =>
                      setForm({ ...form, detalle_servicio_preventivo: v })
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
                  onChange={(v) =>
                    setForm({ ...form, observaciones_unidad: v })
                  }
                />

                <PhotoGrid
                  fotosBase={fotosBase}
                  setFotosBase={setFotosBase}
                  fotosExtra={fotosExtra}
                  setFotosExtra={setFotosExtra}
                />

                <Checklist
                  itemsAgrupados={itemsAgrupados}
                  items={items}
                  actualizarItem={actualizarItem}
                  loading={loading}
                />

                <button
                  disabled={!puedeGuardar}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#07AE8B] font-black text-white disabled:bg-gray-300 disabled:text-gray-500"
                >
                  <Save size={20} />{" "}
                  {saving ? "Guardando..." : "Guardar chequeo"}
                </button>
              </form>
            </Card>
          </div>

          <div
            className={`${activeTab !== "historial" ? "hidden lg:block" : ""} space-y-5`}
          >
            <Card
              title="Buscar en historial"
              subtitle="Filtra solo lo necesario para encontrar el chequeo correcto."
            >
              <form
                onSubmit={aplicarFiltros}
                className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"
              >
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
                <div className="flex items-end gap-2">
                  <button className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-950 font-black text-white">
                    <Search size={18} />
                    Buscar
                  </button>
                  <button
                    type="button"
                    onClick={limpiarFiltros}
                    className="h-12 rounded-2xl border border-gray-300 px-4 font-black text-gray-800"
                  >
                    Limpiar
                  </button>
                </div>
              </form>
            </Card>

            <Card title="Historial de chequeos">
              <div className="grid gap-3 lg:hidden">
                {chequeos.map((row) => (
                  <ChequeoCard key={row.id} row={row} onDetalle={verDetalle} />
                ))}
                {chequeos.length === 0 && (
                  <EmptyState message="No hay chequeos con estos filtros." />
                )}
              </div>
              <div className="hidden lg:block">
                <ChequeosTable rows={chequeos} onDetalle={verDetalle} />
              </div>
            </Card>

            {detalle && (
              <DetalleChequeo data={detalle} onClose={() => setDetalle(null)} />
            )}
          </div>
        </section>
      </AppShell>
    </ProtectedRoute>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 items-center justify-center gap-2 rounded-2xl font-black ${active ? "bg-[#07AE8B] text-white" : "text-gray-700"}`}
    >
      {icon}
      {label}
    </button>
  );
}

function PhotoGrid({ fotosBase, setFotosBase, fotosExtra, setFotosExtra }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {FOTO_TIPOS_BASE.map((foto) => (
          <PhotoButton
            key={foto.key}
            foto={foto}
            file={fotosBase[foto.key]}
            onChange={(file) =>
              setFotosBase((prev) => ({ ...prev, [foto.key]: file }))
            }
          />
        ))}
      </div>
      <label className="block rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 p-4">
        <span className="flex items-center gap-2 font-black text-gray-950">
          <ImagePlus size={20} />
          Fotos extra por incidente
        </span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(e) => setFotosExtra(Array.from(e.target.files || []))}
          className="mt-3 w-full text-sm text-gray-800"
        />
        {fotosExtra.length > 0 && (
          <span className="mt-2 block text-sm font-bold text-[#04745f]">
            {fotosExtra.length} foto(s) extra seleccionada(s)
          </span>
        )}
      </label>
    </div>
  );
}

function PhotoButton({ foto, file, onChange }) {
  const id = `checador-${foto.key}`;
  return (
    <label
      htmlFor={id}
      className={`block cursor-pointer rounded-3xl border-2 p-4 ${file ? "border-[#07AE8B] bg-[#07AE8B]/10" : "border-dashed border-gray-200 bg-white"}`}
    >
      <input
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        required
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange(file);
        }}
      />
      <div className="flex items-center gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${file ? "bg-[#07AE8B] text-white" : "bg-gray-100 text-gray-600"}`}
        >
          {file ? <CheckCircle2 size={23} /> : <Camera size={23} />}
        </div>
        <div className="min-w-0">
          <p className="font-black text-gray-950">{foto.label}</p>
          <p className="truncate text-sm text-gray-600">
            {file ? file.name : foto.help}
          </p>
        </div>
      </div>
    </label>
  );
}

function Checklist({ itemsAgrupados, items, actualizarItem, loading }) {
  if (loading)
    return (
      <p className="py-8 text-center text-gray-600">Cargando checklist...</p>
    );
  return (
    <div className="space-y-3">
      <p className="font-black text-gray-950">Checklist de unidad</p>
      {Object.entries(itemsAgrupados).map(
        ([categoria, categoriaItems], catIndex) => (
          <details
            key={categoria}
            open={catIndex === 0}
            className="overflow-hidden rounded-3xl border border-gray-200 bg-white"
          >
            <summary className="cursor-pointer bg-gray-50 px-4 py-4 font-black text-gray-950">
              {labelize(categoria)}
            </summary>
            <div className="space-y-4 p-4">
              {categoriaItems.map((item) => {
                const index = items.findIndex(
                  (x) => x.categoria === item.categoria && x.item === item.item,
                );
                return (
                  <div
                    key={`${item.categoria}-${item.item}`}
                    className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm"
                  >
                    <p className="font-black text-gray-950">{item.item}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {ESTADOS.map((estado) => (
                        <button
                          key={estado.value}
                          type="button"
                          onClick={() =>
                            actualizarItem(index, "estado", estado.value)
                          }
                          className={`rounded-2xl border px-3 py-2 text-sm font-black ${item.estado === estado.value ? estado.className : "border-gray-200 bg-gray-50 text-gray-600"}`}
                        >
                          {estado.label}
                        </button>
                      ))}
                    </div>
                    {["regular", "malo"].includes(item.estado) && (
                      <input
                        value={item.comentario}
                        onChange={(e) =>
                          actualizarItem(index, "comentario", e.target.value)
                        }
                        placeholder="Describe el problema"
                        className="mt-3 h-12 w-full rounded-2xl border border-gray-300 px-4 text-base text-gray-950 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        ),
      )}
    </div>
  );
}

function ChequeoCard({ row, onDetalle }) {
  return (
    <article className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-gray-950">
            {row.unidad_nombre || "Unidad"}
          </p>
          <p className="text-sm text-gray-600">
            {row.placas || "Sin placas"} · {fmtDate(row.fecha)} {row.hora || ""}
          </p>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-black text-gray-700">
          {row.fotos_count || 0} fotos
        </span>
      </div>
      <p className="mt-3 text-sm text-gray-700">
        <strong>Chofer:</strong> {row.chofer_nombre || "—"}
      </p>
      <button
        type="button"
        onClick={() => onDetalle(row.id)}
        className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 font-black text-gray-800"
      >
        <Eye size={18} />
        Ver detalle
      </button>
    </article>
  );
}

function ChequeosTable({ rows, onDetalle }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100">
      <table className="w-full text-left text-sm text-gray-900">
        <thead className="bg-gray-50">
          <tr className="border-b border-gray-200 text-gray-800">
            <th className="px-3 py-3">Fecha</th>
            <th className="px-3 py-3">Unidad</th>
            <th className="px-3 py-3">Chofer</th>
            <th className="px-3 py-3 text-center">Fotos</th>
            <th className="px-3 py-3 text-center">Detalle</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-3 py-3 font-semibold">
                {fmtDate(row.fecha)}
                <div className="text-xs text-gray-600">{row.hora || "—"}</div>
              </td>
              <td className="px-3 py-3">
                {row.unidad_nombre || "—"}
                <div className="text-xs text-gray-600">
                  {row.placas || "Sin placas"}
                </div>
              </td>
              <td className="px-3 py-3">{row.chofer_nombre || "—"}</td>
              <td className="px-3 py-3 text-center">{row.fotos_count || 0}</td>
              <td className="px-3 py-3 text-center">
                <button
                  onClick={() => onDetalle(row.id)}
                  className="rounded-xl border border-gray-200 p-2"
                >
                  <Eye size={16} />
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan="5" className="px-3 py-8 text-center text-gray-600">
                Sin registros.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DetalleChequeo({ data, onClose }) {
  const itemsMalos =
    data.items?.filter((item) => ["malo", "regular"].includes(item.estado)) ||
    [];
  return (
    <Card
      title="Detalle del chequeo"
      action={
        <button
          onClick={onClose}
          className="rounded-2xl border border-gray-200 px-3 py-2 font-black text-gray-800"
        >
          <X size={17} />
        </button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Mini label="Unidad" value={data.unidad_nombre || "—"} />
        <Mini label="Placas" value={data.placas || "—"} />
        <Mini label="Chofer" value={data.chofer_nombre || "—"} />
        <Mini label="Km" value={data.kilometraje || "—"} />
      </div>
      <div className="mt-4 rounded-3xl bg-gray-50 p-4">
        <p className="font-black">Observaciones</p>
        <p className="mt-1 text-sm text-gray-700">
          {data.observaciones ||
            data.observaciones_unidad ||
            "Sin observaciones"}
        </p>
      </div>
      <div className="mt-4">
        <p className="mb-3 font-black text-gray-950">Items con observación</p>
        {itemsMalos.length ? (
          <div className="grid gap-2">
            {itemsMalos.map((item) => (
              <div key={item.id} className="rounded-2xl bg-gray-50 p-3 text-sm">
                <strong>{item.item}</strong> · {item.estado}
                <p>{item.comentario || "Sin comentario"}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sin observaciones"
            message="No hay items en regular o malo."
          />
        )}
      </div>
      <div className="mt-4">
        <p className="mb-3 font-black text-gray-950">Fotos</p>
        {data.fotos?.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.fotos.map((foto) => (
              <a
                key={foto.id}
                href={foto.url}
                target="_blank"
                className="overflow-hidden rounded-3xl border border-gray-100 bg-gray-50"
              >
                <img
                  src={foto.url}
                  alt={foto.tipo}
                  className="h-44 w-full object-cover"
                />
                <div className="px-3 py-2 text-sm font-black text-gray-800">
                  {labelize(foto.tipo)}
                </div>
              </a>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sin fotos"
            message="No hay evidencia fotográfica."
          />
        )}
      </div>
    </Card>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-3xl bg-gray-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 font-black text-gray-950">{value}</p>
    </div>
  );
}

function labelize(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
