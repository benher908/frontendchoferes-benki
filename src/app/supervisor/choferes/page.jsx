'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import { fmtDate, fmtMoney } from '@/lib/formatters';
import { Eye, Pencil, Plus, Save, Trash2, X, Download } from 'lucide-react';
import { descargarExcelChofer } from '@/lib/excel';
const MESES = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];


function todayPeriodo() {
  const now = new Date();

  return {
    anio: now.getFullYear(),
    mes: now.getMonth() + 1,
  };
}

const initialForm = {
  nombre: '',
  username: '',
  password: 'chofer123',
  numero_licencia: '',
  tipo_licencia: '',
  vigencia_licencia: '',
  telefono: '',
  rutas_ids: [],
  notas: '',
};

export default function ChoferesPage() {
  const [choferes, setChoferes] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editando, setEditando] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [periodo, setPeriodo] = useState(todayPeriodo());

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function descargarRegistroChofer(id) {
    try {
      setError('');

      const data = await api.resumenChofer(id, periodo.anio, periodo.mes);

      descargarExcelChofer({
        resumen: data,
      });
    } catch (err) {
      setError(err.message || 'No se pudo descargar el registro del chofer');
    }
  }

  const choferesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    if (!q) return choferes;

    return choferes.filter((c) =>
      [
        c.nombre,
        c.username,
        c.ruta_nombre,
        c.telefono,
        c.numero_licencia,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [choferes, busqueda]);

  async function cargar() {
    try {
      setLoading(true);
      setError('');

      const [choferesRes, catalogosRes] = await Promise.all([
        api.choferes(),
        api.catalogos(),
      ]);

      setChoferes(choferesRes || []);
      setRutas(catalogosRes.rutas || []);
    } catch (err) {
      setError(err.message || 'No se pudo cargar choferes');
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
    setEditando(null);
  }

  function editarChofer(chofer) {
    setEditando(chofer);

    setForm({
      nombre: chofer.nombre || '',
      username: chofer.username || '',
      password: '',
      numero_licencia: chofer.numero_licencia || '',
      tipo_licencia: chofer.tipo_licencia || '',
      vigencia_licencia: chofer.vigencia_licencia
        ? String(chofer.vigencia_licencia).slice(0, 10)
        : '',
      telefono: chofer.telefono || '',
      rutas_ids: Array.isArray(chofer.rutas_ids)
        ? chofer.rutas_ids.map(Number)
        : [],
      notas: chofer.notas || '',
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function guardarChofer(e) {
    e.preventDefault();

    if (!form.nombre.trim()) {
      setError('El nombre del chofer es requerido');
      return;
    }

    if (!editando && !form.username.trim()) {
      setError('El usuario es requerido');
      return;
    }

    if (!Array.isArray(form.rutas_ids) || form.rutas_ids.length === 0) {
      setError('Debes asignar al menos una ruta al chofer');
      return;
    }

    if (form.rutas_ids.length > 3) {
      setError('Solo puedes asignar máximo 3 rutas por chofer');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (editando) {
        await api.actualizarChofer(editando.id, {
          nombre: form.nombre,
          numero_licencia: form.numero_licencia || null,
          tipo_licencia: form.tipo_licencia || null,
          vigencia_licencia: form.vigencia_licencia || null,
          telefono: form.telefono || null,
          rutas_ids: form.rutas_ids.map(Number),
          notas: form.notas || null,
        });

        setSuccess('Chofer actualizado correctamente');
      } else {
        await api.crearChofer({
          nombre: form.nombre,
          username: form.username,
          password: form.password || 'chofer123',
          numero_licencia: form.numero_licencia || null,
          tipo_licencia: form.tipo_licencia || null,
          vigencia_licencia: form.vigencia_licencia || null,
          telefono: form.telefono || null,
          rutas_ids: form.rutas_ids.map(Number),
          notas: form.notas || null,
        });

        setSuccess('Chofer creado correctamente');
      }

      limpiarFormulario();
      await cargar();
    } catch (err) {
      setError(err.message || 'No se pudo guardar el chofer');
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(id) {
    const ok = window.confirm('¿Seguro que deseas desactivar este chofer?');

    if (!ok) return;

    try {
      setError('');
      setSuccess('');

      await api.eliminarChofer(id);

      setSuccess('Chofer desactivado correctamente');

      if (resumen?.chofer?.id === id) {
        setResumen(null);
      }

      await cargar();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el chofer');
    }
  }

  async function verResumen(id) {
    try {
      setError('');
      const data = await api.resumenChofer(id, periodo.anio, periodo.mes);
      setResumen(data);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el resumen del chofer');
    }
  }

  useEffect(() => {
    if (resumen?.chofer?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      verResumen(resumen.chofer.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo.anio, periodo.mes]);

  return (
    <ProtectedRoute allowedRoles={['supervisor']}>
      <AppShell role="supervisor">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Perfil de choferes</h1>
          <p className="mt-1 text-gray-500">
            Administra choferes, asigna hasta 3 rutas y consulta sus registros.
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

        <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <Card
            title={editando ? 'Editar chofer' : 'Agregar chofer'}
            subtitle={
              editando
                ? 'Actualiza la información y rutas asignadas.'
                : 'Crea el usuario y perfil del chofer.'
            }
          >
            <form onSubmit={guardarChofer} className="space-y-4">
              <Input
                label="Nombre completo"
                value={form.nombre}
                onChange={(v) => setForm({ ...form, nombre: v })}
                required
              />

              {!editando && (
                <>
                  <Input
                    label="Usuario"
                    value={form.username}
                    onChange={(v) => setForm({ ...form, username: v })}
                    required
                  />

                  <Input
                    label="Contraseña inicial"
                    value={form.password}
                    onChange={(v) => setForm({ ...form, password: v })}
                    required
                  />
                </>
              )}

              {editando && (
                <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  Usuario:{' '}
                  <span className="font-semibold text-gray-950">
                    {form.username}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="No. licencia"
                  value={form.numero_licencia}
                  onChange={(v) => setForm({ ...form, numero_licencia: v })}
                />

                <Input
                  label="Tipo"
                  value={form.tipo_licencia}
                  onChange={(v) => setForm({ ...form, tipo_licencia: v })}
                  placeholder="A, B, C..."
                />
              </div>

              <Input
                label="Vigencia licencia"
                type="date"
                value={form.vigencia_licencia}
                onChange={(v) => setForm({ ...form, vigencia_licencia: v })}
              />

              <Input
                label="Teléfono"
                value={form.telefono}
                onChange={(v) => setForm({ ...form, telefono: v })}
              />

              <MultiRutaSelect
                label="Rutas asignadas"
                value={form.rutas_ids}
                onChange={(value) => setForm({ ...form, rutas_ids: value })}
                options={rutas}
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
                  {saving ? 'Guardando...' : editando ? 'Actualizar' : 'Crear chofer'}
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

          <Card title="Lista de choferes" subtitle="Choferes activos registrados en el sistema.">
            <div className="mb-4">
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, usuario, ruta, teléfono..."
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
              />
            </div>

            {loading ? (
              <p className="py-8 text-center text-gray-600">Cargando choferes...</p>
            ) : (
              <ChoferesTable
                rows={choferesFiltrados}
                onEdit={editarChofer}
                onDelete={eliminar}
                onResumen={verResumen}
                onDownload={descargarRegistroChofer}
              />
            )}
          </Card>
        </section>

        <section className="mt-6">
          <Card
            title="Resumen del chofer"
            subtitle="Información mensual registrada a nombre del chofer seleccionado."
          >
            <div className="mb-4 flex flex-wrap gap-2">
              <input
                type="number"
                value={periodo.anio}
                onChange={(e) => setPeriodo({ ...periodo, anio: Number(e.target.value) })}
                className="w-28 rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />

              <select
                value={periodo.mes}
                onChange={(e) => setPeriodo({ ...periodo, mes: Number(e.target.value) })}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900"
              >
                {MESES.map((mes) => (
                <option key={mes.value} value={mes.value}>
                  {mes.label}
                </option>
              ))}
              </select>
            </div>

            {resumen ? (
              <ResumenChofer data={resumen} />
            ) : (
              <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600">
                Selecciona un chofer de la tabla para visualizar sus registros.
              </div>
            )}
          </Card>
        </section>
      </AppShell>
    </ProtectedRoute>
  );
}

function ChoferesTable({ rows, onEdit, onDelete, onResumen, onDownload }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-left text-sm text-gray-900">
        <thead className="bg-gray-50">
          <tr className="border-b border-gray-200 text-gray-800">
            <th className="px-3 py-3 font-semibold">Chofer</th>
            <th className="px-3 py-3 font-semibold">Usuario</th>
            <th className="px-3 py-3 font-semibold">Rutas</th>
            <th className="px-3 py-3 font-semibold">Licencia</th>
            <th className="px-3 py-3 font-semibold">Teléfono</th>
            <th className="px-3 py-3 text-center font-semibold">Acciones</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="px-3 py-3">
                <div className="font-semibold text-gray-950">{row.nombre}</div>
                <div className="text-xs text-gray-600">
                  Ingreso: {fmtDate(row.fecha_ingreso)}
                </div>
              </td>

              <td className="px-3 py-3 text-gray-900">{row.username || '—'}</td>

              <td className="px-3 py-3 text-gray-900">
                <div className="flex max-w-[260px] flex-wrap gap-1">
                  {(row.rutas || []).length > 0 ? (
                    row.rutas.map((ruta) => (
                      <span
                        key={ruta.ruta_id}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ruta.es_principal
                          ? 'bg-[#07AE8B]/15 text-[#04745f]'
                          : 'bg-gray-100 text-gray-700'
                          }`}
                      >
                        {ruta.ruta_nombre}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">Sin ruta</span>
                  )}
                </div>
              </td>

              <td className="px-3 py-3 text-gray-900">
                <div>{row.numero_licencia || '—'}</div>
                <div className="text-xs text-gray-600">
                  Vigencia: {fmtDate(row.vigencia_licencia)}
                </div>
              </td>

              <td className="px-3 py-3 text-gray-900">{row.telefono || '—'}</td>

              <td className="px-3 py-3">
                <div className="flex justify-center gap-2">
                  <IconButton title="Ver resumen" onClick={() => onResumen(row.id)}>
                    <Eye size={16} />
                  </IconButton>
                  
                  <IconButton title="Descargar Excel" onClick={() => onDownload(row.id)}>
                    <Download size={16} />
                  </IconButton>

                  <IconButton title="Editar" onClick={() => onEdit(row)}>
                    <Pencil size={16} />
                  </IconButton>

                  <IconButton title="Eliminar" onClick={() => onDelete(row.id)} danger>
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td colSpan="6" className="px-3 py-10 text-center text-gray-600">
                No hay choferes registrados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ResumenChofer({ data }) {
  const incentivo = data.incentivo;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Chofer</p>
          <p className="mt-1 font-bold text-gray-950">{data.chofer.nombre}</p>
          <p className="text-sm text-gray-600">{data.chofer.ruta_nombre || 'Sin ruta'}</p>
        </div>

        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Periodo</p>
          <p className="mt-1 font-bold text-gray-950">
            {data.periodo.mes}/{data.periodo.anio}
          </p>
          <p className="text-sm text-gray-600">Resumen mensual</p>
        </div>

        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Incentivo</p>
          <p className="mt-1 font-bold text-gray-950">
            {incentivo ? fmtMoney(incentivo.monto) : 'Sin cálculo'}
          </p>
          <p className="text-sm text-gray-600">
            {incentivo
              ? `${(Number(incentivo.score_total || 0) * 100).toFixed(2)}%`
              : 'Recalcular incentivos'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <MiniTable
          title="Rendimiento"
          rows={data.rendimiento}
          columns={['fecha', 'unidad_nombre', 'ruta_nombre', 'km_inicial', 'km_final', 'litros']}
        />

        <MiniTable
          title="Puntualidad"
          rows={data.puntualidad}
          columns={['fecha', 'ruta_nombre', 'hora_programada', 'hora_salida_real', 'a_tiempo']}
        />

        <MiniTable
          title="Servicio"
          rows={data.servicio}
          columns={['fecha', 'ruta_nombre', 'clientes_esperados', 'clientes_visitados', 'incidencias']}
        />

        <MiniTable
          title="Limpieza"
          rows={data.limpieza}
          columns={['fecha', 'unidad_nombre', 'lavada_semana', 'mantenimiento_a_tiempo']}
        />
      </div>

      <MiniTable
        title="Chequeos recientes"
        rows={data.chequeos_recientes}
        columns={['fecha', 'hora', 'tipo', 'unidad_nombre', 'kilometraje']}
      />
    </div>
  );
}

function MiniTable({ title, rows, columns }) {
  return (
    <div className="rounded-2xl border border-gray-100">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="font-semibold text-gray-950">{title}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-900">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 font-semibold text-gray-700">
                  {labelize(col)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2 text-gray-900">
                    {formatValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-5 text-center text-gray-500">
                  Sin registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MultiRutaSelect({ label, value = [], onChange, options }) {
  const selected = value.map(Number);

  function toggle(rutaId) {
    const id = Number(rutaId);

    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
      return;
    }

    if (selected.length >= 3) {
      alert('Solo puedes asignar máximo 3 rutas por chofer');
      return;
    }

    onChange([...selected, id]);
  }

  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-gray-700">{label}</span>

      <div className="grid max-h-72 gap-2 overflow-y-auto rounded-xl border border-gray-200 p-2">
        {options.map((ruta) => {
          const checked = selected.includes(Number(ruta.id));
          const orden = selected.indexOf(Number(ruta.id));

          return (
            <label
              key={ruta.id}
              className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-sm ${checked
                ? 'border-[#07AE8B] bg-[#07AE8B]/10 text-gray-950'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
            >
              <div>
                <span className="font-medium">{ruta.nombre}</span>
                {checked && orden === 0 && (
                  <span className="ml-2 rounded-full bg-[#07AE8B] px-2 py-0.5 text-[10px] font-bold text-white">
                    Principal
                  </span>
                )}
              </div>

              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(ruta.id)}
                className="h-4 w-4 accent-[#07AE8B]"
              />
            </label>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Puedes asignar de 1 a 3 rutas. La primera seleccionada será la ruta principal.
      </p>
    </div>
  );
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

function IconButton({ children, onClick, title, danger = false }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-lg border p-2 transition ${danger
        ? 'border-red-200 text-red-700 hover:bg-red-50'
        : 'border-gray-200 text-gray-700 hover:bg-gray-100'
        }`}
    >
      {children}
    </button>
  );
}

function formatValue(value) {
  if (value === true || value === 1) return 'Sí';
  if (value === false || value === 0) return 'No';
  if (value === null || value === undefined || value === '') return '—';

  const str = String(value);

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return fmtDate(str);

  return str;
}

function labelize(value) {
  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}