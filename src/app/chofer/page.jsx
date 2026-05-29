'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import Card from '@/components/Card';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/ToastProvider';
import { api } from '@/lib/api';
import { fmtDate, fmtMoney } from '@/lib/formatters';
import { Camera, ClipboardCheck, Route, Wallet } from 'lucide-react';

function periodoActual() {
  const now = new Date();
  return { anio: now.getFullYear(), mes: now.getMonth() + 1 };
}

export default function ChoferHomePage() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [chequeos, setChequeos] = useState([]);
  const [incentivo, setIncentivo] = useState(null);
  const [loading, setLoading] = useState(true);

  async function cargar() {
    try {
      setLoading(true);
      const me = await api.me();
      setUser(me);
      const checks = await api.misChequeos();
      setChequeos(checks || []);
      if (me?.chofer_id) {
        const periodo = periodoActual();
        try {
          const preview = await api.previewIncentivoChofer(me.chofer_id, periodo.anio, periodo.mes);
          setIncentivo(preview);
        } catch {
          setIncentivo(null);
        }
      }
    } catch (err) {
      toast.error(err.message || 'No se pudo cargar tu información.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ProtectedRoute allowedRoles={['chofer']}>
      <AppShell role="chofer">
        <header className="mb-5 rounded-[2rem] bg-gradient-to-br from-[#07AE8B] to-[#6A5492] p-5 text-white shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-white/75">Mi perfil</p>
          <h1 className="mt-1 text-2xl font-black">Hola, {firstName(user?.nombre_completo || user?.username)}</h1>
          <p className="mt-2 text-sm leading-6 text-white/85">Aquí puedes enviar tu check y revisar tu avance mensual.</p>

          <Link href="/chofer/check" className="mt-5 flex h-14 items-center justify-center gap-2 rounded-2xl bg-white font-black text-[#04745f] shadow-sm">
            <Camera size={21} /> Hacer Aviso y Check
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-[#07AE8B] text-xl font-black text-white">
                {user?.foto_url ? <img src={user.foto_url} alt={user.nombre_completo} className="h-full w-full object-cover" /> : user?.nombre_completo?.[0] || 'C'}
              </div>
              <div className="min-w-0"><p className="truncate font-black text-gray-950">{user?.nombre_completo || user?.username || 'Chofer'}</p><p className="truncate text-sm text-gray-600">{user?.ruta_nombre || 'Sin ruta asignada'}</p></div>
            </div>
          </Card>
          <Metric title="Ruta" value={user?.ruta_nombre || '—'} icon={<Route size={21} />} />
          <Metric title="Mis chequeos" value={chequeos.length} icon={<ClipboardCheck size={21} />} />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[380px_1fr]">
          <Card title="Incentivo estimado" subtitle="Avance del mes actual según registros capturados.">
            {incentivo ? (
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#07AE8B]/15 text-[#04745f]"><Wallet size={22} /></div>
                  <div><p className="text-2xl font-black text-gray-950">{fmtMoney(incentivo.monto)}</p><p className="text-sm font-bold text-gray-600">{incentivo.porcentaje}% de cumplimiento</p></div>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-[#07AE8B]" style={{ width: `${Math.min(100, Number(incentivo.porcentaje || 0))}%` }} /></div>
              </div>
            ) : (
              <EmptyState title="Sin cálculo todavía" message="Cuando existan registros suficientes, verás tu avance aquí." />
            )}
          </Card>

          <Card title="Mis chequeos recientes">
            {loading ? <p className="py-8 text-center text-gray-600">Cargando...</p> : chequeos.length ? <div className="grid gap-3">{chequeos.slice(0, 8).map((row) => <article key={row.id} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"><div className="flex justify-between gap-3"><div><p className="font-black text-gray-950">{row.unidad_nombre || 'Unidad'}</p><p className="text-sm text-gray-600">{row.placas || 'Sin placas'} · {fmtDate(row.fecha)} {row.hora || ''}</p></div><span className="h-fit rounded-full bg-gray-100 px-2.5 py-1 text-xs font-black text-gray-700">{row.fotos_count || 0} fotos</span></div></article>)}</div> : <EmptyState message="Aún no tienes chequeos registrados." />}
          </Card>
        </section>
      </AppShell>
    </ProtectedRoute>
  );
}

function Metric({ title, value, icon }) {
  return <Card><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#07AE8B]/15 text-[#04745f]">{icon}</div><div className="min-w-0"><p className="text-sm font-bold text-gray-500">{title}</p><p className="truncate text-lg font-black text-gray-950">{value}</p></div></div></Card>;
}

function firstName(value) {
  return String(value || 'Chofer').split(' ')[0];
}
