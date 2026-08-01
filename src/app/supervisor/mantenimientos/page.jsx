'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import { fmtDate, fmtMoney } from '@/lib/formatters';
import { Save, Wrench } from 'lucide-react';

const initialForm = {
  unidad_id: '',
  verificacion_id: '',
  tipo: 'PREVENTIVO',
  fecha_programada: '',
  fecha_salida_estimada: '',
  motivo: '',
  diagnostico: '',
  costo: '',
};

export default function MantenimientosPage() {
  return (
    <Suspense fallback={<MantenimientosPageFallback />}>
      <MantenimientosPageContent />
    </Suspense>
  );
}

function MantenimientosPageContent() {
  const searchParams = useSearchParams();
  const [unidades, setUnidades] = useState([]);
  const [verificaciones, setVerificaciones] = useState([]);
  const [mantenimientos, setMantenimientos] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const verificacionIdPreseleccionada = searchParams.get('verificacion_id') || '';
  const unidadIdPreseleccionada = searchParams.get('unidad_id') || '';

  async function cargar() {
    try {
      setLoading(true);
      setError('');

      const [catalogosRes, verificacionesRes, mantenimientosRes] = await Promise.all([
        api.catalogos(),
        api.verificaciones(),
        api.mantenimientos(),
      ]);

      setUnidades(catalogosRes.unidades || []);
      setVerificaciones(verificacionesRes || []);
      setMantenimientos(mantenimientosRes || []);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los mantenimientos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    if (!verificaciones.length) return;

    const verificacion = verificaciones.find(
      (item) => String(item.id) === String(verificacionIdPreseleccionada)
    );

    if (verificacion) {
      setForm((prev) => ({
        ...prev,
        unidad_id: String(verificacion.unidad_id),
        verificacion_id: String(verificacion.id),
        fecha_programada: prev.fecha_programada || String(verificacion.proxima_verificacion || '').slice(0, 10),
        motivo: prev.motivo || `Mantenimiento derivado de verificación ${verificacion.folio || verificacion.id}`,
      }));
      return;
    }

    if (unidadIdPreseleccionada) {
      setForm((prev) => ({
        ...prev,
        unidad_id: String(unidadIdPreseleccionada),
      }));
    }
  }, [verificaciones, verificacionIdPreseleccionada, unidadIdPreseleccionada]);

  async function guardar(e) {
    e.preventDefault();

    if (!form.unidad_id) {
      setError('Selecciona una unidad');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await api.crearMantenimiento({
        unidad_id: Number(form.unidad_id),
        verificacion_id: form.verificacion_id ? Number(form.verificacion_id) : null,
        tipo: form.tipo,
        fecha_programada: form.fecha_programada || null,
        fecha_salida_estimada: form.fecha_salida_estimada || null,
        motivo: form.motivo || null,
        diagnostico: form.diagnostico || null,
        costo: form.costo === '' ? null : Number(form.costo),
      });

      setSuccess('Mantenimiento creado correctamente');
      setForm(initialForm);
      await cargar();
    } catch (err) {
      setError(err.message || 'No se pudo crear el mantenimiento');
    } finally {
      setSaving(false);
    }
  }

  async function cambiarEstado(tipoAccion, id) {
    try {
      setError('');
      setSuccess('');

      if (tipoAccion === 'entrada') {
        await api.registrarEntradaMantenimiento(id, {});
        setSuccess('Entrada a taller registrada');
      } else if (tipoAccion === 'salida') {
        await api.registrarSalidaMantenimiento(id, {});
        setSuccess('Salida de taller registrada');
      } else if (tipoAccion === 'cancelar') {
        await api.cancelarMantenimiento(id, { motivo: 'Cancelado desde supervisor' });
        setSuccess('Mantenimiento cancelado');
      }

      await cargar();
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el mantenimiento');
    }
  }

  return (
    <ProtectedRoute allowedRoles={['supervisor']}>
      <AppShell role="supervisor">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mantenimientos</h1>
          <p className="mt-1 text-gray-500">
            Crea y da seguimiento a mantenimientos por unidad.
          </p>
        </header>

        {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        <section className="mb-6 grid gap-4 md:grid-cols-2">
          <MetricCard title="Unidades" value={unidades.length} subtitle="Disponibles para mantenimiento" icon={<Wrench size={22} />} />
          <MetricCard title="Mantenimientos" value={mantenimientos.length} subtitle="Registros actuales" icon={<Wrench size={22} />} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <Card title="Crear mantenimiento" subtitle="Registra el mantenimiento de la unidad.">
            <form onSubmit={guardar} className="space-y-4">
              <Select
                label="Unidad"
                value={form.unidad_id}
                onChange={(value) => setForm({ ...form, unidad_id: value })}
                options={unidades}
                getLabel={(item) => `${item.nombre} - ${item.placas}`}
              />

              <Select
                label="Tipo"
                value={form.tipo}
                onChange={(value) => setForm({ ...form, tipo: value })}
                options={[
                  { id: 'PREVENTIVO', nombre: 'PREVENTIVO' },
                  { id: 'CORRECTIVO', nombre: 'CORRECTIVO' },
                  { id: 'OTRO', nombre: 'OTRO' },
                ]}
                getValue={(item) => item.id}
                getLabel={(item) => item.nombre}
              />

              <Input label="Fecha programada" type="date" value={form.fecha_programada} onChange={(value) => setForm({ ...form, fecha_programada: value })} />
              <Input label="Salida estimada" type="date" value={form.fecha_salida_estimada} onChange={(value) => setForm({ ...form, fecha_salida_estimada: value })} />
              <Input label="Costo estimado" type="number" step="0.01" value={form.costo} onChange={(value) => setForm({ ...form, costo: value })} />
              <Textarea label="Motivo" value={form.motivo} onChange={(value) => setForm({ ...form, motivo: value })} />
              <Textarea label="Diagnóstico" value={form.diagnostico} onChange={(value) => setForm({ ...form, diagnostico: value })} />

              <button
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#07AE8B] px-4 py-3 text-sm font-semibold text-white hover:bg-[#069b7d] disabled:opacity-60"
              >
                <Save size={16} />
                {saving ? 'Guardando...' : 'Crear mantenimiento'}
              </button>
            </form>
          </Card>

          <Card title="Seguimiento de mantenimientos" subtitle="Consulta el estado y actúa según el avance en taller.">
            {loading ? (
              <p className="py-8 text-center text-gray-600">Cargando mantenimientos...</p>
            ) : (
              <MantenimientosTable rows={mantenimientos} onAction={cambiarEstado} />
            )}
          </Card>
        </section>
      </AppShell>
    </ProtectedRoute>
  );
}

function MantenimientosPageFallback() {
  return (
    <ProtectedRoute allowedRoles={['supervisor']}>
      <AppShell role="supervisor">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mantenimientos</h1>
          <p className="mt-1 text-gray-500">
            Cargando vista de mantenimientos...
          </p>
        </header>
      </AppShell>
    </ProtectedRoute>
  );
}

function MetricCard({ title, value, subtitle, icon }) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#07AE8B]/15 text-[#04745f]">
          {icon}
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

function MantenimientosTable({ rows, onAction }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-left text-sm text-gray-900">
        <thead className="bg-gray-50">
          <tr className="border-b border-gray-200 text-gray-800">
            <th className="px-3 py-3 font-semibold">Unidad</th>
            <th className="px-3 py-3 font-semibold">Tipo</th>
            <th className="px-3 py-3 font-semibold">Estado</th>
            <th className="px-3 py-3 font-semibold">Programada</th>
            <th className="px-3 py-3 text-right font-semibold">Costo</th>
            <th className="px-3 py-3 text-center font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-3 py-3">
                <div className="font-semibold">{row.unidad_nombre}</div>
                <div className="text-xs text-gray-600">{row.placas || 'Sin placas'}</div>
              </td>
              <td className="px-3 py-3">{row.tipo}</td>
              <td className="px-3 py-3"><EstadoBadge estado={row.estado} /></td>
              <td className="px-3 py-3">{fmtDate(row.fecha_programada)}</td>
              <td className="px-3 py-3 text-right">{row.costo !== null && row.costo !== undefined ? fmtMoney(row.costo) : '—'}</td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap justify-center gap-2">
                  {row.estado === 'PROGRAMADO' && (
                    <ActionButton label="Entrada" onClick={() => onAction('entrada', row.id)} />
                  )}
                  {(row.estado === 'EN_TALLER' || row.estado === 'PRORROGA') && (
                    <ActionButton label="Salida" onClick={() => onAction('salida', row.id)} />
                  )}
                  {row.estado !== 'FINALIZADO' && row.estado !== 'CANCELADO' && (
                    <ActionButton label="Cancelar" danger onClick={() => onAction('cancelar', row.id)} />
                  )}
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan="6" className="px-3 py-10 text-center text-gray-600">
                No hay mantenimientos registrados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function EstadoBadge({ estado }) {
  const styles = {
    PROGRAMADO: 'bg-slate-100 text-slate-700',
    EN_TALLER: 'bg-blue-100 text-blue-800',
    PRORROGA: 'bg-yellow-100 text-yellow-800',
    FINALIZADO: 'bg-emerald-100 text-emerald-800',
    CANCELADO: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${styles[estado] || 'bg-gray-100 text-gray-800'}`}>
      {estado || 'SIN ESTADO'}
    </span>
  );
}

function ActionButton({ label, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-xs font-semibold ${danger ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
    >
      {label}
    </button>
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
        rows={3}
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
  getLabel = (item) => item.nombre,
  getValue = (item) => item.id,
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
      >
        <option value="">Seleccionar...</option>
        {options.map((item) => (
          <option key={getValue(item)} value={getValue(item)}>
            {getLabel(item)}
          </option>
        ))}
      </select>
    </label>
  );
}
