'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import { api } from '@/lib/api';

export default function EncuestaRutaResolverPage({ params }) {
  const resolvedParams = use(params);
  const rutaId = resolvedParams?.rutaId;
  const router = useRouter();
  const [estado, setEstado] = useState({ loading: true, error: '', data: null });

  useEffect(() => {
    async function resolver() {
      try {
        setEstado({ loading: true, error: '', data: null });
        const data = await api.resolverEncuestaPublicaPorRuta(rutaId);
        setEstado({ loading: false, error: '', data });
        router.replace(data.encuesta_url);
      } catch (err) {
        setEstado({
          loading: false,
          error: err.message || 'No hay entrega activa para esta ruta en este momento',
          data: null,
        });
      }
    }

    if (rutaId) {
      resolver();
    }
  }, [rutaId, router]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-xl">
        <Card
          title="Encuesta por ruta"
          subtitle="Estamos buscando la entrega activa del dia para esta ruta."
        >
          {estado.loading && (
            <p className="py-8 text-center text-sm text-gray-600">
              Buscando entrega activa...
            </p>
          )}

          {!estado.loading && estado.error && (
            <div className="rounded-2xl bg-amber-50 px-4 py-5 text-sm text-amber-800">
              {estado.error}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
