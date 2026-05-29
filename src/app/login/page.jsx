'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { api } from '@/lib/api';
import { saveSession, redirectByRole } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    const payload = {
      username: String(formData.get('username') || '').trim(),
      password: String(formData.get('password') || ''),
    };

    if (!payload.username || !payload.password) {
      toast.error('Usuario y contraseña requeridos');
      return;
    }

    setLoading(true);

    try {
      const data = await api.login(payload);

      saveSession(data.token, data.usuario);

      router.replace(redirectByRole(data.usuario.rol));
    } catch (err) {
      toast.error(err.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#B80000] to-[#002FB8] px-4">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#B80000] text-white">
            <Truck size={32} />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-gray-900">
            Sistema de Choferes
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Inicia sesión para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Usuario
            </span>

            <input
              name="username"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
              placeholder="supervisor"
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Contraseña
            </span>

            <input
              name="password"
              type="password"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          <button
            disabled={loading}
            className="w-full rounded-xl bg-[#B80000] px-4 py-3 font-semibold text-white transition hover:bg-[#FA2F2F] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
      </section>
    </main>
  );
}