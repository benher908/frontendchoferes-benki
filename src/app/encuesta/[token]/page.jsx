'use client';

import { use, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Card from '@/components/Card';
import { Input, Textarea } from '@/components/FormControls';

const INITIAL_FORM = {
  folio_pedido: '',
  pedido_completo: 1,
  amabilidad_chofer: 5,
  claridad_comunicacion: 5,
  cuidado_entrega: 5,
  facilidad_recepcion: 5,
  servicio_general: 5,
  comentarios: '',
};

const PREGUNTAS_FALLBACK = [
  {
    codigo: 'pedido_completo',
    pregunta: 'La mercancia fue entregada completa y sin faltantes?',
    tipo: 'SI_NO',
  },
  {
    codigo: 'amabilidad_chofer',
    pregunta: 'El chofer mostro respeto y cortesia durante el servicio brindado?',
    tipo: 'ESCALA_1_5',
  },
  {
    codigo: 'cuidado_entrega',
    pregunta: 'La mercancia fue entregada sin danos por parte del chofer?',
    tipo: 'ESCALA_1_5',
  },
  {
    codigo: 'facilidad_recepcion',
    pregunta: 'La documentacion, factura, remision o ticket fue entregada correctamente por parte del chofer?',
    tipo: 'ESCALA_1_5',
  },
  {
    codigo: 'servicio_general',
    pregunta: 'Que tan probable es que vuelva a recibir un servicio con el chofer asignado para la entrega de la mercancia?',
    tipo: 'ESCALA_1_5',
  },
];

const MONTHS_EN = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatSurveyDate(encuesta) {
  if (encuesta?.fecha_servicio_mx) return encuesta.fecha_servicio_mx;

  const raw = String(encuesta?.fecha_servicio ?? encuesta?.fecha ?? encuesta?.created_at ?? '').trim();
  if (!raw) return '-';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }

  const englishMatch = raw.match(/^(?:[A-Za-z]{3}\s)?([A-Za-z]{3})\s(\d{1,2})(?:\s(\d{4}))?$/);
  if (englishMatch) {
    const [, monthText, day, year = '2026'] = englishMatch;
    const month = MONTHS_EN[monthText.toLowerCase()];
    if (month) return `${pad2(day)}/${month}/${year}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(parsed);

    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${map.day}/${map.month}/${map.year}`;
  }

  return raw;
}

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

function YesNoGroup({ label, value, onChange }) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-gray-800">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { value: 1, label: 'Si' },
          { value: 0, label: 'No' },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`h-11 rounded-2xl border text-sm font-bold transition ${
              Number(value) === option.value
                ? 'border-[#07AE8B] bg-[#07AE8B] text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {option.label}
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

    if (token) load();
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

  const preguntasActivas = Array.isArray(encuesta?.preguntas) && encuesta.preguntas.length
    ? encuesta.preguntas
    : PREGUNTAS_FALLBACK;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Card title="Encuesta de entrega" subtitle="Ayudanos a evaluar la entrega y la atencion del chofer.">
          {loading && <p className="py-8 text-center text-sm text-gray-600">Cargando encuesta...</p>}

          {!loading && error && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
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
                <p><span className="font-bold text-slate-900">Fecha:</span> {formatSurveyDate(encuesta)}</p>
                <p><span className="font-bold text-slate-900">Chofer:</span> {encuesta.chofer_nombre}</p>
              </div>

              <Input
                label="Folio de pedido"
                value={form.folio_pedido}
                onChange={(value) => setForm({ ...form, folio_pedido: value })}
              />

              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-bold text-slate-900">Escala de respuesta</p>
                <p className="mt-2">1 = Muy insatisfecho</p>
                <p>2 = Insatisfecho</p>
                <p>3 = Neutral</p>
                <p>4 = Satisfecho</p>
                <p>5 = Muy satisfecho</p>
              </div>

              {preguntasActivas.map((pregunta) => (
                pregunta.tipo === 'SI_NO' ? (
                  <YesNoGroup
                    key={pregunta.codigo}
                    label={pregunta.pregunta}
                    value={form[pregunta.codigo]}
                    onChange={(value) => setForm({ ...form, [pregunta.codigo]: value })}
                  />
                ) : (
                  <ScoreGroup
                    key={pregunta.codigo}
                    label={pregunta.pregunta}
                    value={form[pregunta.codigo]}
                    onChange={(value) => setForm({ ...form, [pregunta.codigo]: value })}
                  />
                )
              ))}

              <Textarea
                label="Comentarios"
                rows={4}
                value={form.comentarios}
                onChange={(value) => setForm({ ...form, comentarios: value })}
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
