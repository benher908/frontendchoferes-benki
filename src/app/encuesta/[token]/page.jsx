'use client';

import { use, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Card from '@/components/Card';
import { Input, Textarea } from '@/components/FormControls';

const INITIAL_FORM = {
  folio_pedido: '',
  pedido_completo: 1,
  trato_chofer: 5,
  atencion_entrega: 5,
  satisfaccion_general: 5,
  comentarios: '',
};

function ScoreGroup({ label, value, onChange }) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-gray-800">{label}</p>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={`h-11 rounded-2xl border text-sm font-bold transition ${
              Number(value) === item
                ? 'border-[#07AE8B] bg-[#07AE8B] text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function EncuestaPublicaPage({ params }) {
  const resolvedParams = use(params);
  const token = resolvedParams?.token;
  const [encuesta, setEncuesta] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');
        const data = await api.obtenerEncuestaPublica(token);
        setEncuesta(data);
      } catch (err) {
        setError(err.message || 'No se pudo cargar la encuesta');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      load();
    }
  }, [token]);

  async function submit(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError('');
      await api.responderEncuestaPublica(token, form);
      setDone(true);
    } catch (err) {
      setError(err.message || 'No se pudo enviar la encuesta');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Card title="Encuesta de entrega" subtitle="Ayudanos a evaluar la entrega y la atencion del chofer.">
          {loading && <p className="py-8 text-center text-sm text-gray-600">Cargando encuesta...</p>}

          {!loading && error && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && encuesta && done && (
            <div className="rounded-2xl bg-emerald-50 px-4 py-6 text-center text-emerald-800">
              Gracias. Tu respuesta quedo registrada correctamente.
            </div>
          )}

          {!loading && !error && encuesta && !done && (
            <form onSubmit={submit} className="space-y-5">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                <p><span className="font-bold text-slate-900">Ruta:</span> {encuesta.ruta_nombre}</p>
                <p><span className="font-bold text-slate-900">Fecha:</span> {encuesta.fecha_servicio}</p>
                <p><span className="font-bold text-slate-900">Chofer:</span> {encuesta.chofer_nombre}</p>
              </div>

              <Input
                label="Folio de pedido"
                value={form.folio_pedido}
                onChange={(v) => setForm({ ...form, folio_pedido: v })}
              />

              <div>
                <p className="mb-2 text-sm font-bold text-gray-800">El pedido se entrego completo?</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 1, label: 'Si' },
                    { value: 0, label: 'No' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm({ ...form, pedido_completo: option.value })}
                      className={`h-11 rounded-2xl border text-sm font-bold transition ${
                        Number(form.pedido_completo) === option.value
                          ? 'border-[#07AE8B] bg-[#07AE8B] text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <ScoreGroup
                label="Trato del chofer"
                value={form.trato_chofer}
                onChange={(value) => setForm({ ...form, trato_chofer: value })}
              />

              <ScoreGroup
                label="Atencion durante la entrega"
                value={form.atencion_entrega}
                onChange={(value) => setForm({ ...form, atencion_entrega: value })}
              />

              <ScoreGroup
                label="Satisfaccion general con la entrega"
                value={form.satisfaccion_general}
                onChange={(value) => setForm({ ...form, satisfaccion_general: value })}
              />

              <Textarea
                label="Comentarios"
                rows={4}
                value={form.comentarios}
                onChange={(v) => setForm({ ...form, comentarios: v })}
              />

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-[#F54927] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#F7674A] disabled:opacity-60"
              >
                {saving ? 'Enviando...' : 'Enviar encuesta'}
              </button>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}
