'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import { fmtDate, fmtMoney, todayMexicoInput } from '@/lib/formatters';
import { CalendarCheck, Pencil, Plus, Save, Trash2, X } from 'lucide-react';

function today() {
  return todayMexicoInput();
}

const initialForm = {
  unidad_id: '',
  fecha_verificacion: today(),
  proxima_verificacion: '',
  folio: '',
  costo: '',
  notas: '',
};

export default function VerificacionesPage() {
  const router = useRouter();
  const [unidades, setUnidades] = useState([]);
  const [verificaciones, setVerificaciones] = useState([]);
  const [proximas, setProximas] = useState([]);

  const [form, setForm] = useState(initialForm);
  const [editando, setEditando] = useState(null);

  const [diasFiltro, setDiasFiltro] = useState(30);
  const [busqueda, setBusqueda] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const verificacionesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    if (!q) return verificaciones;

    return verificaciones.filter((v) =>
      [
        v.unidad_nombre,
        v.placas,
        v.folio,
        v.notas,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [verificaciones, busqueda]);

  async function cargar() {
    try {
      setLoading(true);
      setError('');

      const [catalogosRes, verificacionesRes, proximasRes] = await Promise.all([
        api.catalogos(),
        api.verificaciones(),
        api.verificacionesProximas(diasFiltro),
      ]);

      setUnidades(catalogosRes.unidades || []);
      setVerificaciones(verificacionesRes || []);
      setProximas(proximasRes || []);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar verificaciones');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diasFiltro]);

  function limpiarFormulario() {
    setForm(initialForm);
    setEditando(null);
  }

  function editar(verificacion) {
    setEditando(verificacion);

    setForm({
      unidad_id: verificacion.unidad_id || '',
      fecha_verificacion: verificacion.fecha_verificacion
        ? String(verificacion.fecha_verificacion).slice(0, 10)
        : '',
      proxima_verificacion: verificacion.proxima_verificacion
        ? String(verificacion.proxima_verificacion).slice(0, 10)
        : '',
      folio: verificacion.folio || '',
      costo: verificacion.costo ?? '',
      notas: verificacion.notas || '',
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function guardar(e) {
    e.preventDefault();

    if (!form.unidad_id || !form.fecha_verificacion || !form.proxima_verificacion) {
      setError('Unidad, fecha de verificación y próxima verificación son requeridas');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const payload = {
        unidad_id: Number(form.unidad_id),
        fecha_verificacion: form.fecha_verificacion,
        proxima_verificacion: form.proxima_verificacion,
        folio: form.folio || null,
        costo: form.costo === '' ? null : Number(form.costo),
        notas: form.notas || null,
      };

      if (editando) {
        await api.actualizarVerificacion(editando.id, payload);
        setSuccess('Verificación actualizada correctamente');
      } else {
        await api.crearVerificacion(payload);
        setSuccess('Verificación creada correctamente');
      }

      limpiarFormulario();
      await cargar();
    } catch (err) {
      setError(err.message || 'No se pudo guardar la verificación');
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(id) {
    const ok = window.confirm('¿Seguro que deseas eliminar esta verificación?');

    if (!ok) return;

    try {
      setError('');
      setSuccess('');

      await api.eliminarVerificacion(id);

      setSuccess('Verificación eliminada correctamente');

      if (editando?.id === id) {
        limpiarFormulario();
      }

      await cargar();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la verificación');
    }
  }

  return (
    <ProtectedRoute allowedRoles={['supervisor']}>
      <AppShell role="supervisor">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Verificaciones</h1>
          <p className="mt-1 text-gray-500">
            Administra verificaciones vehiculares y próximas fechas por unidad.
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

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Unidades"
            value={unidades.length}
            subtitle="Activas en catálogo"
          />

          <MetricCard
            title="Verificaciones"
            value={verificaciones.length}
            subtitle="Registros cargados"
          />

          <MetricCard
            title="Próximas verificaciones"
            value={proximas.length}
            subtitle={`Dentro de ${diasFiltro} días`}
            danger={proximas.length > 0}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <Card
            title={editando ? 'Editar verificación' : 'Agregar verificación'}
            subtitle="Registra fecha actual y próxima verificación de la unidad."
          >
            <form onSubmit={guardar} className="space-y-4">
              <Select
                label="Unidad"
                value={form.unidad_id}
                onChange={(v) => setForm({ ...form, unidad_id: v })}
                options={unidades}
                getLabel={(u) => `${u.nombre} - ${u.placas}`}
                disabled={Boolean(editando)}
              />

              <Input
                label="Fecha de verificación"
                type="date"
                value={form.fecha_verificacion}
                onChange={(v) => setForm({ ...form, fecha_verificacion: v })}
                required
              />

              <Input
                label="Próxima verificación"
                type="date"
                value={form.proxima_verificacion}
                onChange={(v) => setForm({ ...form, proxima_verificacion: v })}
                required
              />

              <Input
                label="Folio"
                value={form.folio}
                onChange={(v) => setForm({ ...form, folio: v })}
                placeholder="Ej. VERIF-001"
              />

              <Input
                label="Costo"
                type="number"
                step="0.01"
                value={form.costo}
                onChange={(v) => setForm({ ...form, costo: v })}
                placeholder="0.00"
              />

              <Textarea
                label="Notas"
                value={form.notas}
                onChange={(v) => setForm({ ...form, notas: v })}
              />

              <div className="flex gap-2">
                <button
                  disabled={saving}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#07AE8B] px-4 py-3 text-sm font-semibold text-white hover:bg-[#069b7d] disabled:opacity-60"
                >
                  {editando ? <Save size={16} /> : <Plus size={16} />}
                  {saving ? 'Guardando...' : editando ? 'Actualizar' : 'Crear verificación'}
                </button>

                {editando && (
                  <button
                    type="button"
                    onClick={limpiarFormulario}
                    className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </form>
          </Card>

          <div className="space-y-5">
            <Card
              title="Alertas de verificación"
              subtitle="Unidades sin verificación, vencidas o próximas."
            >
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Rango:</span>

                {[15, 30, 60, 90, 180].map((dias) => (
                  <button
                    key={dias}
                    onClick={() => setDiasFiltro(dias)}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                      diasFiltro === dias
                        ? 'bg-[#07AE8B] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {dias} días
                  </button>
                ))}
              </div>

              <AlertasTable rows={proximas} />
            </Card>

            <Card title="Historial de verificaciones">
              <div className="mb-4">
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por unidad, placas, folio o notas..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
                />
              </div>

              {loading ? (
                <p className="py-8 text-center text-gray-600">Cargando verificaciones...</p>
              ) : (
                <VerificacionesTable
                  rows={verificacionesFiltradas}
                  onEdit={editar}
                  onDelete={eliminar}
                  onCreateMaintenance={(row) =>
                    router.push(
                      `/supervisor/mantenimientos?unidad_id=${row.unidad_id}&verificacion_id=${row.id}`
                    )
                  }
                />
              )}
            </Card>
          </div>
        </section>
      </AppShell>
    </ProtectedRoute>
  );
}

function MetricCard({ title, value, subtitle, danger = false }) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
            danger ? 'bg-red-100 text-red-700' : 'bg-[#07AE8B]/15 text-[#04745f]'
          }`}
        >
          <CalendarCheck size={22} />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-950">{value}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
    </Card>
  );
}

function AlertasTable({ rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-left text-sm text-gray-900">
        <thead className="bg-gray-50">
          <tr className="border-b border-gray-200 text-gray-800">
            <th className="px-3 py-3 font-semibold">Unidad</th>
            <th className="px-3 py-3 font-semibold">Placas</th>
            <th className="px-3 py-3 font-semibold">Próxima</th>
            <th className="px-3 py-3 text-center font-semibold">Estado</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row) => (
            <tr key={`${row.unidad_id}-${row.verificacion_id || 'sin'}`}>
              <td className="px-3 py-3 font-semibold text-gray-950">
                {row.unidad_nombre}
              </td>
              <td className="px-3 py-3 text-gray-900">{row.placas || '—'}</td>
              <td className="px-3 py-3 text-gray-900">
                {fmtDate(row.proxima_verificacion)}
              </td>
              <td className="px-3 py-3 text-center">
                <EstadoVerificacion dias={row.dias_restantes} />
              </td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td colSpan="4" className="px-3 py-8 text-center text-gray-600">
                No hay verificaciones próximas en este rango.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function VerificacionesTable({ rows, onEdit, onDelete, onCreateMaintenance }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-left text-sm text-gray-900">
        <thead className="bg-gray-50">
          <tr className="border-b border-gray-200 text-gray-800">
            <th className="px-3 py-3 font-semibold">Unidad</th>
            <th className="px-3 py-3 font-semibold">Actual</th>
            <th className="px-3 py-3 font-semibold">Próxima</th>
            <th className="px-3 py-3 font-semibold">Folio</th>
            <th className="px-3 py-3 text-right font-semibold">Costo</th>
            <th className="px-3 py-3 text-center font-semibold">Mantenimiento</th>
            <th className="px-3 py-3 text-center font-semibold">Estado</th>
            <th className="px-3 py-3 text-center font-semibold">Acciones</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="px-3 py-3">
                <div className="font-semibold text-gray-950">{row.unidad_nombre}</div>
                <div className="text-xs text-gray-600">{row.placas || 'Sin placas'}</div>
              </td>

              <td className="px-3 py-3 text-gray-900">
                {fmtDate(row.fecha_verificacion)}
              </td>

              <td className="px-3 py-3 text-gray-900">
                {fmtDate(row.proxima_verificacion)}
              </td>

              <td className="px-3 py-3 text-gray-900">{row.folio || '—'}</td>

              <td className="px-3 py-3 text-right text-gray-900">
                {row.costo !== null && row.costo !== undefined ? fmtMoney(row.costo) : '—'}
              </td>

              <td className="px-3 py-3 text-center">
                {row.mantenimiento_id ? (
                  <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                    {row.mantenimiento_estado || 'Relacionado'}
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                    Sin mantenimiento
                  </span>
                )}
              </td>

              <td className="px-3 py-3 text-center">
                <EstadoVerificacion dias={diasRestantes(row.proxima_verificacion)} />
              </td>

              <td className="px-3 py-3">
                <div className="flex justify-center gap-2">
                  <IconButton title="Crear mantenimiento" onClick={() => onCreateMaintenance(row)}>
                    <CalendarCheck size={16} />
                  </IconButton>

                  <IconButton title="Editar" onClick={() => onEdit(row)}>
                    <Pencil size={16} />
                  </IconButton>

                  <IconButton title="Eliminar" danger onClick={() => onDelete(row.id)}>
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td colSpan="8" className="px-3 py-10 text-center text-gray-600">
                No hay verificaciones registradas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function EstadoVerificacion({ dias }) {
  if (dias === null || dias === undefined) {
    return (
      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
        Sin registro
      </span>
    );
  }

  const n = Number(dias);

  if (n < 0) {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-800">
        Vencida {Math.abs(n)} días
      </span>
    );
  }

  if (n <= 30) {
    return (
      <span className="inline-flex rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-bold text-yellow-800">
        {n} días
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
      {n} días
    </span>
  );
}

function diasRestantes(dateValue) {
  if (!dateValue) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fecha = new Date(String(dateValue).slice(0, 10));
  fecha.setHours(0, 0, 0, 0);

  if (Number.isNaN(fecha.getTime())) return null;

  const diffMs = fecha.getTime() - hoy.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
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

function Select({ label, value, onChange, options, getLabel, disabled = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required
        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10 disabled:bg-gray-100 disabled:text-gray-500"
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

function IconButton({ children, onClick, title, danger = false }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-lg border p-2 transition ${
        danger
          ? 'border-red-200 text-red-700 hover:bg-red-50'
          : 'border-gray-200 text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}
