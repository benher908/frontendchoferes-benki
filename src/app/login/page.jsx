'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Truck } from 'lucide-react';
import { api } from '@/lib/api';
import { saveSession, redirectByRole } from '@/lib/auth';
import { useToast } from '@/components/ToastProvider';

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      username: String(formData.get('username') || '').trim(),
      password: String(formData.get('password') || ''),
    };

    if (!payload.username || !payload.password) {
      toast.error('Escribe tu usuario y contraseña para continuar.');
      return;
    }

    try {
      setLoading(true);
      const data = await api.login(payload);
      saveSession(data.token, data.usuario);
      toast.success('Sesión iniciada correctamente.');
      router.replace(redirectByRole(data.usuario.rol));
    } catch (err) {
      toast.error(err.message || 'No se pudo iniciar sesión. Revisa tus datos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#07AE8B] via-[#128f7a] to-[#6A5492] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <section className="grid w-full overflow-hidden rounded-[2rem] bg-white shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden bg-gray-950 p-10 text-white lg:block">
            <div className="flex h-full flex-col justify-between">
              <div>
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#07AE8B] text-xl font-black">
                  D
                </div>
                <h1 className="mt-8 text-4xl font-black leading-tight">
                  Control claro para choferes, unidades e incentivos.
                </h1>
                <p className="mt-4 max-w-md text-lg leading-8 text-gray-300">
                  Una plataforma sencilla para registrar chequeos, revisar evidencias y calcular incentivos sin confusión.
                </p>
              </div>

              <div className="grid gap-3">
                <Feature icon={<Truck size={20} />} title="Chequeos con fotos" />
                <Feature icon={<ShieldCheck size={20} />} title="Alertas y validaciones" />
                <Feature icon={<Truck size={20} />} title="Diseñado para móvil" />
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <div className="mx-auto max-w-md">
              <div className="mb-8 text-center lg:text-left">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#07AE8B]/10 text-[#04745f] lg:mx-0">
                  <Truck size={32} />
                </div>
                <h2 className="mt-5 text-3xl font-black text-gray-950">Bienvenido</h2>
                <p className="mt-2 text-gray-600">Inicia sesión para entrar a tu panel.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-gray-800">Usuario</span>
                  <input
                    name="username"
                    className="h-13 w-full rounded-2xl border border-gray-300 px-4 text-base text-gray-950 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
                    placeholder="supervisor"
                    autoComplete="username"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-gray-800">Contraseña</span>
                  <input
                    name="password"
                    type="password"
                    className="h-13 w-full rounded-2xl border border-gray-300 px-4 text-base text-gray-950 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </label>

                <button
                  disabled={loading}
                  className="h-13 w-full rounded-2xl bg-[#07AE8B] px-4 font-black text-white shadow-sm transition hover:bg-[#069b7d] disabled:opacity-60"
                >
                  {loading ? 'Entrando...' : 'Entrar al sistema'}
                </button>
              </form>

              <div className="mt-7 rounded-3xl bg-gray-50 p-4 text-sm text-gray-600">
                <p className="font-black text-gray-950">Usuarios de prueba</p>
                <div className="mt-2 grid gap-1">
                  <p>supervisor / supervisor123</p>
                  <p>checador / checador123</p>
                  <p>jmaldonado / chofer123</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Feature({ icon, title }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-white/10 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-[#7df0d4]">{icon}</div>
      <p className="font-bold">{title}</p>
    </div>
  );
}
