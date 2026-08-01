'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import Card from '@/components/Card';
import { Input, Textarea, ToggleCard } from '@/components/FormControls';
import { api } from '@/lib/api';
import { fmtDate, fmtDateTime, fmtMoney, todayMexicoInput } from '@/lib/formatters';
import { Camera, ImagePlus } from 'lucide-react';

const initialCierre = {
  km_inicial: '',
  km_final: '',
  litros_encontrados: '',
  litros_cargados: '',
  litros_dejados: '',
  precio_litro: '',
  total_mercancia: '',
  casetas: '',
  limpieza_realizada: true,
  tipo_limpieza: 'TOTAL',
  reporto_falla: false,
  detalle_falla: '',
  notas_limpieza: '',
  observaciones_fin: '',
};

function calcularGastoKmLitro(cierre) {
  const kmInicial = Number(cierre.km_inicial || 0);
  const kmFinal = Number(cierre.km_final || 0);
  const litrosEncontrados = Number(cierre.litros_encontrados || 0);
  const litrosCargados = Number(cierre.litros_cargados || 0);
  const litrosDejados = Number(cierre.litros_dejados || 0);
  const litrosConsumidos = litrosEncontrados + litrosCargados - litrosDejados;
  const kmRecorridos = kmFinal - kmInicial;

  if (kmRecorridos <= 0 || litrosConsumidos <= 0) return null;
  return kmRecorridos / litrosConsumidos;
}

export default function ChoferRutaPage() {
  const [data, setData] = useState(null);
  const [puntualidadHoy, setPuntualidadHoy] = useState(null);
  const [cierre, setCierre] = useState(initialCierre);
  const [mercanciaRevisada, setMercanciaRevisada] = useState(true);
  const [fotoMercancia, setFotoMercancia] = useState(null);
  const [fotoTableroGasolina, setFotoTableroGasolina] = useState(null);
  const [fotoUltimaCaseta, setFotoUltimaCaseta] = useState(null);
  const [fotosLimpieza, setFotosLimpieza] = useState([null, null, null]);
  const [observacionesInicio, setObservacionesInicio] = useState('');
  const [notasLlegada, setNotasLlegada] = useState('');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [registeringArrival, setRegisteringArrival] = useState(false);
  const [uploadingUltimaCaseta, setUploadingUltimaCaseta] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const viajeActual = useMemo(() => {
    const viajes = data?.viajes_hoy || [];
    return viajes.find((item) => item.estado !== 'FINALIZADA' && item.estado !== 'CANCELADA') || null;
  }, [data]);

  const ultimoCheck = useMemo(() => {
    const checks = data?.checks_hoy || [];
    return checks[0] || null;
  }, [data]);

  const ultimoCierreOperativo = data?.ultimo_cierre_operativo || null;
  const horaEsperadaLlegada = puntualidadHoy?.hora_programada || viajeActual?.hora_programada || 'Sin horario asignado';
  const toleranciaLlegada = `${puntualidadHoy?.tolerancia_minutos ?? 5} minutos`;
  const llegadaRegistrada = Boolean(puntualidadHoy?.hora_llegada);
  const kmActualSugerido =
    ultimoCheck?.kilometraje ??
    viajeActual?.kilometraje_check ??
    ultimoCierreOperativo?.km_final ??
    '';
  const origenKmActual = ultimoCheck?.kilometraje
    ? 'Se toma del check diario que capturaste hoy.'
    : viajeActual?.kilometraje_check
      ? 'Se toma del check ligado a tu ruta.'
      : ultimoCierreOperativo?.km_final
        ? 'Se toma del último cierre operativo registrado.'
        : 'Sin historial';

  async function cargar() {
    try {
      setLoading(true);
      setError('');
      const [res, puntualidadRes] = await Promise.all([
        api.miEstadoRuta(),
        api.miPuntualidadHoy().catch(() => null),
      ]);
      setData(res);
      setPuntualidadHoy(puntualidadRes);
    } catch (err) {
      setError(err.message || 'No se pudo cargar tu ruta del día');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    if (!data) return;

    setCierre((prev) => ({
      ...prev,
      km_inicial: prev.km_inicial || String(kmActualSugerido || ''),
      litros_encontrados: prev.litros_encontrados || String(ultimoCierreOperativo?.litros_dejados || ''),
      precio_litro: prev.precio_litro || String(ultimoCierreOperativo?.precio_litro || ''),
    }));
  }, [
    data,
    kmActualSugerido,
    ultimoCierreOperativo?.litros_dejados,
    ultimoCierreOperativo?.precio_litro,
  ]);

  function obtenerUbicacionActual() {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        reject(new Error('Tu dispositivo no soporta geolocalización'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        () => reject(new Error('Debes permitir tu ubicación para registrar tu llegada')),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }


  async function iniciarRuta() {
    if (!viajeActual) {
      setError('No tienes una ruta asignada para hoy');
      return;
    }

    setStarting(true);
    setError('');
    setSuccess('');

    try {
      let viaje = viajeActual;

      if (viaje.estado === 'PENDIENTE_CHECK') {
        if (!ultimoCheck?.id) {
          throw new Error('Primero debes enviar tu check diario');
        }

        if (fotoMercancia) {
          const formData = new FormData();
          formData.append('fotos', fotoMercancia);
          formData.append('tipos', 'mercancia_facturas');
          await api.subirFotosChequeo(ultimoCheck.id, formData);
        }

        viaje = await api.prepararViaje({
          unidad_id: Number(viaje.unidad_id),
          ruta_id: Number(viaje.ruta_id),
          check_id: Number(ultimoCheck.id),
          mercancia_facturas_revisadas: mercanciaRevisada,
          observaciones_inicio: observacionesInicio || null,
        });
      }

      await api.iniciarViaje(viaje.id);
      setSuccess('Ruta iniciada correctamente');
      setFotoMercancia(null);
      await cargar();
    } catch (err) {
      setError(err.message || 'No se pudo iniciar la ruta');
    } finally {
      setStarting(false);
    }
  }

  async function registrarLlegadaCedis() {
    setRegisteringArrival(true);
    setError('');
    setSuccess('');

    try {
      const position = await obtenerUbicacionActual();

      await api.registrarLlegadaCedis({
        fecha: viajeActual?.fecha || todayMexicoInput(),
        hora_programada: viajeActual?.hora_programada || '06:00:00',
        tolerancia_minutos: 5,
        latitud: position.coords.latitude,
        longitud: position.coords.longitude,
        precision_metros: position.coords.accuracy,
        notas: notasLlegada || null,
      });
      setSuccess('Llegada al CEDIS registrada correctamente');
      setNotasLlegada('');
      await cargar();
    } catch (err) {
      setError(err.message || 'No se pudo registrar la llegada al CEDIS');
    } finally {
      setRegisteringArrival(false);
    }
  }

  async function finalizarRuta(e) {
    e.preventDefault();

    if (!viajeActual?.id || viajeActual.estado !== 'EN_RUTA') {
      setError('Solo puedes finalizar una ruta que esté en curso');
      return;
    }

    setFinishing(true);
    setError('');
    setSuccess('');

    try {
      const position = await obtenerUbicacionActual();

      await api.finalizarViaje(viajeActual.id, {
        km_inicial: cierre.km_inicial ? Number(cierre.km_inicial) : null,
        km_final: Number(cierre.km_final),
        litros_encontrados: Number(cierre.litros_encontrados || 0),
        litros_cargados: Number(cierre.litros_cargados || 0),
        litros_dejados: Number(cierre.litros_dejados || 0),
        precio_litro: Number(cierre.precio_litro || 0),
        total_mercancia: Number(cierre.total_mercancia || 0),
        casetas: Number(cierre.casetas || 0),
        limpieza_realizada: cierre.limpieza_realizada,
        tipo_limpieza: cierre.tipo_limpieza,
        reporto_falla: cierre.reporto_falla,
        detalle_falla: cierre.detalle_falla || null,
        notas_limpieza: cierre.notas_limpieza || null,
        observaciones_fin: cierre.observaciones_fin || null,
        latitud: position.coords.latitude,
        longitud: position.coords.longitude,
      });

      let successMessage = 'Ruta finalizada correctamente';

      if (fotoTableroGasolina) {
        try {
          const formData = new FormData();
          formData.append('foto', fotoTableroGasolina);
          await api.subirFotoTableroGasolina(viajeActual.id, formData);
          successMessage = 'Ruta finalizada y foto del tablero guardada correctamente';
        } catch (uploadErr) {
          successMessage = `Ruta finalizada, pero no se pudo subir la foto del tablero: ${uploadErr.message}`;
        }
      }

      const fotosLimpiezaSeleccionadas = fotosLimpieza.filter(Boolean);
      if (fotosLimpiezaSeleccionadas.length > 0) {
        try {
          const formData = new FormData();
          fotosLimpiezaSeleccionadas.forEach((file) => formData.append('fotos', file));
          await api.subirFotosLimpiezaViaje(viajeActual.id, formData);
          successMessage = `${successMessage}. Evidencia de limpieza guardada correctamente`;
        } catch (uploadErr) {
          successMessage = `${successMessage}. No se pudo subir evidencia de limpieza: ${uploadErr.message}`;
        }
      }

      setSuccess(successMessage);
      setCierre(initialCierre);
      setFotoTableroGasolina(null);
      setFotosLimpieza([null, null, null]);
      await cargar();
    } catch (err) {
      setError(err.message || 'No se pudo finalizar la ruta');
    } finally {
      setFinishing(false);
    }
  }

  async function registrarFotoUltimaCaseta() {
    if (!viajeActual?.id || viajeActual.estado !== 'EN_RUTA') {
      setError('Solo puedes registrar la última caseta cuando la ruta está en curso');
      return;
    }

    if (!fotoUltimaCaseta) {
      setError('Primero toma la foto de la última caseta');
      return;
    }

    setUploadingUltimaCaseta(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('foto', fotoUltimaCaseta);
      await api.subirFotoUltimaCaseta(viajeActual.id, formData);
      setSuccess('Foto de última caseta registrada correctamente');
      setFotoUltimaCaseta(null);
      await cargar();
    } catch (err) {
      setError(err.message || 'No se pudo registrar la foto de la última caseta');
    } finally {
      setUploadingUltimaCaseta(false);
    }
  }

  return (
    <ProtectedRoute allowedRoles={['chofer']}>
      <AppShell role="chofer">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mi ruta del día</h1>
          <p className="mt-1 text-gray-500">
            Aquí ves la ruta que te asignó el supervisor y desde aquí la inicias o la finalizas.
          </p>
        </header>

        {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        {loading ? (
          <Card>
            <p className="text-gray-500">Cargando ruta...</p>
          </Card>
        ) : !viajeActual ? (
          <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
            <div className="space-y-4">
              <Card
                title="Llegada al CEDIS"
                subtitle="Puedes registrar tu llegada aunque la ruta todavía no esté asignada."
              >
                <div className="space-y-3">
                  <Info label="Hora esperada de llegada" value={horaEsperadaLlegada} />
                  <Info label="Tolerancia" value={toleranciaLlegada} />
                  <Info
                    label="Llegada registrada"
                    value={puntualidadHoy?.hora_llegada ? fmtDateTime(`${todayMexicoInput()} ${puntualidadHoy.hora_llegada}`) : 'Pendiente'}
                  />
                  <Info
                    label="Resultado"
                    value={
                      puntualidadHoy
                        ? puntualidadHoy.a_tiempo
                          ? 'A tiempo'
                          : 'Retardo'
                        : 'Sin registro'
                    }
                  />
                  {puntualidadHoy?.horario_notas && (
                    <Info label="Detalle del horario" value={puntualidadHoy.horario_notas} />
                  )}
                  {!llegadaRegistrada && (
                    <>
                      <Textarea
                        label="Notas de llegada"
                        value={notasLlegada}
                        onChange={setNotasLlegada}
                      />
                      <button
                        type="button"
                        onClick={registrarLlegadaCedis}
                        disabled={registeringArrival}
                        className="w-full rounded-xl bg-[#1F6FEB] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1859be] disabled:opacity-60"
                      >
                        {registeringArrival ? 'Registrando...' : 'Registrar llegada al CEDIS'}
                      </button>
                    </>
                  )}
                </div>
              </Card>
            </div>

            <Card title="Sin ruta asignada">
              <p className="text-sm text-gray-600">
                Aún no tienes una ruta del día asignada. Tu llegada al CEDIS sí puede registrarse desde aquí y el supervisor enlazará la ruta después.
              </p>
            </Card>
          </section>
        ) : (
          <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
            <div className="space-y-4">
              <Card title="Ruta asignada">
                <div className="space-y-3 text-sm text-gray-700">
                  <Info label="Fecha" value={fmtDate(viajeActual.fecha)} />
                  <Info label="Ruta" value={viajeActual.ruta_nombre} />
                  <Info label="Unidad" value={`${viajeActual.unidad_nombre} - ${viajeActual.placas || 'Sin placas'}`} />
                  <Info label="Horario" value={viajeActual.hora_programada || 'Sin horario'} />
                  <Info label="Estado" value={viajeActual.estado} />
                  <Info label="Inicio" value={fmtDateTime(viajeActual.hora_inicio)} />
                  <Info label="Fin" value={fmtDateTime(viajeActual.hora_fin)} />
                </div>
              </Card>

              <Card
                title="Llegada al CEDIS"
                subtitle="Este registro se usa para medir tu puntualidad antes de salir a ruta."
              >
                <div className="space-y-3">
                  <Info label="Hora esperada de llegada" value={horaEsperadaLlegada} />
                  <Info label="Tolerancia" value={toleranciaLlegada} />
                  <Info
                    label="Llegada registrada"
                    value={puntualidadHoy?.hora_llegada ? fmtDateTime(`${viajeActual.fecha} ${puntualidadHoy.hora_llegada}`) : 'Pendiente'}
                  />
                  <Info
                    label="Resultado"
                    value={
                      puntualidadHoy
                        ? puntualidadHoy.a_tiempo
                          ? 'A tiempo'
                          : 'Retardo'
                        : 'Sin registro'
                    }
                  />
                  {puntualidadHoy?.horario_notas && (
                    <Info label="Detalle del horario" value={puntualidadHoy.horario_notas} />
                  )}
                  {!llegadaRegistrada && (
                    <>
                      <Textarea
                        label="Notas de llegada"
                        value={notasLlegada}
                        onChange={setNotasLlegada}
                      />
                      <button
                        type="button"
                        onClick={registrarLlegadaCedis}
                        disabled={registeringArrival}
                        className="w-full rounded-xl bg-[#1F6FEB] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1859be] disabled:opacity-60"
                      >
                        {registeringArrival ? 'Registrando...' : 'Registrar llegada al CEDIS'}
                      </button>
                    </>
                  )}
                </div>
              </Card>

              <Card
                title="Datos precargados"
                subtitle="Se toman del último cierre operativo registrado."
              >
                <div className="space-y-3 text-sm text-gray-700">
                  <Info label="Km actual sugerido" value={cierre.km_inicial || 'Sin dato'} />
                  <Info label="Origen km actual" value={origenKmActual} />
                  <Info label="Litros iniciales sugeridos" value={cierre.litros_encontrados || 'Sin dato'} />
                  <Info label="Precio litro sugerido" value={cierre.precio_litro ? fmtMoney(cierre.precio_litro) : 'Sin dato'} />
                  <Info label="Gasto km/litro anterior" value={ultimoCierreOperativo?.rendimiento ? `${Number(ultimoCierreOperativo.rendimiento).toFixed(3)} km/l` : 'Sin dato'} />
                  <Info label="Último cierre" value={ultimoCierreOperativo ? `${fmtDate(ultimoCierreOperativo.fecha)} - ${ultimoCierreOperativo.ruta_nombre}` : 'Sin historial'} />
                </div>
              </Card>

              <Card
                title="Rutas asignadas"
                subtitle="Estas son las rutas que debes cubrir durante la jornada."
              >
                <div className="space-y-3">
                  {(viajeActual.detalles?.length
                    ? viajeActual.detalles
                    : [{
                      id: `principal-${viajeActual.id}`,
                      secuencia: 1,
                      descripcion: viajeActual.ruta_nombre,
                      tipo: 'PRINCIPAL',
                      ruta_nombre: viajeActual.ruta_nombre,
                      observaciones: null,
                    }]).map((detalle) => (
                    <div key={detalle.id} className="rounded-2xl border border-gray-200 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-950">
                            {detalle.secuencia}. {detalle.descripcion}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                            {detalle.tipo}
                            {detalle.ruta_nombre ? ` • ${detalle.ruta_nombre}` : ''}
                          </p>
                          {detalle.observaciones && (
                            <p className="mt-2 text-sm text-gray-600">{detalle.observaciones}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card
                title="Última caseta"
                subtitle="Registra esta evidencia antes de regresar al CEDIS. No finaliza la ruta."
              >
                <div className="space-y-3">
                  <Info
                    label="Estado de evidencia"
                    value={viajeActual.foto_ultima_caseta_url ? 'Registrada' : 'Pendiente'}
                  />
                  <Info
                    label="Hora registrada"
                    value={fmtDateTime(viajeActual.foto_ultima_caseta_at)}
                  />
                  {viajeActual.foto_ultima_caseta_url && (
                    <a
                      href={viajeActual.foto_ultima_caseta_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-xl border border-gray-200 px-3 py-2 text-center text-sm font-semibold text-[#1F6FEB]"
                    >
                      Ver foto registrada
                    </a>
                  )}
                  {!viajeActual.foto_ultima_caseta_url && (
                    <>
                      <CameraOnlyPicker
                        label="Foto de última caseta"
                        file={fotoUltimaCaseta}
                        onChange={setFotoUltimaCaseta}
                        description="Captura esta evidencia directamente con la cámara antes de volver al CEDIS."
                      />
                      <button
                        type="button"
                        onClick={registrarFotoUltimaCaseta}
                        disabled={uploadingUltimaCaseta || viajeActual.estado !== 'EN_RUTA'}
                        className="w-full rounded-xl bg-[#1F6FEB] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1859be] disabled:opacity-60"
                      >
                        {uploadingUltimaCaseta ? 'Guardando evidencia...' : 'Registrar última caseta'}
                      </button>
                    </>
                  )}
                </div>
              </Card>

              <Card title="Checklist previo">
                <div className="space-y-3">
                  <Info label="Check del día" value={ultimoCheck ? `Sí (#${ultimoCheck.id})` : 'No'} />
                  <Info label="Fotos obligatorias" value={ultimoCheck ? `${ultimoCheck.fotos_obligatorias_count || 0}/4` : '0/4'} />
                  <ToggleCard
                    label="Mercancía y facturas revisadas"
                    description="Debes confirmar esto antes de poder iniciar la ruta."
                    checked={mercanciaRevisada}
                    onChange={setMercanciaRevisada}
                  />
                  <EvidencePicker
                    label="Foto de mercancía y facturas"
                    file={fotoMercancia}
                    onChange={setFotoMercancia}
                    description="Puedes tomarla con cámara o elegirla desde galería."
                  />
                  <Textarea
                    label="Observaciones de salida"
                    value={observacionesInicio}
                    onChange={setObservacionesInicio}
                  />
                  <button
                    type="button"
                    onClick={iniciarRuta}
                    disabled={starting || viajeActual.estado === 'EN_RUTA' || viajeActual.estado === 'FINALIZADA'}
                    className="w-full rounded-xl bg-[#07AE8B] px-4 py-3 text-sm font-semibold text-white hover:bg-[#069b7d] disabled:opacity-60"
                  >
                    {starting ? 'Iniciando...' : 'Iniciar ruta'}
                  </button>
                </div>
              </Card>
            </div>

            <Card title="Finalizar ruta" subtitle="Captura los datos finales del recorrido.">
              <form onSubmit={finalizarRuta} className="space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  Para finalizar la ruta debes estar dentro del radio permitido del CEDIS y permitir tu ubicación.
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Input label="Km actual" type="number" value={cierre.km_inicial} onChange={(value) => setCierre({ ...cierre, km_inicial: value })} />
                  <Input label="Km final" type="number" value={cierre.km_final} onChange={(value) => setCierre({ ...cierre, km_final: value })} />
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <Input label="Litros iniciales" type="number" step="0.01" value={cierre.litros_encontrados} onChange={(value) => setCierre({ ...cierre, litros_encontrados: value })} />
                  <Input label="Litros cargados" type="number" step="0.01" value={cierre.litros_cargados} onChange={(value) => setCierre({ ...cierre, litros_cargados: value })} />
                  <Input label="Litros finales" type="number" step="0.01" value={cierre.litros_dejados} onChange={(value) => setCierre({ ...cierre, litros_dejados: value })} />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Input label="Precio litro" type="number" step="0.01" value={cierre.precio_litro} onChange={(value) => setCierre({ ...cierre, precio_litro: value })} />
                  <Input label="Total mercancía" type="number" step="0.01" value={cierre.total_mercancia} onChange={(value) => setCierre({ ...cierre, total_mercancia: value })} />
                </div>

                <div className="grid gap-3 md:grid-cols-1">
                  <Input label="Casetas" type="number" step="0.01" value={cierre.casetas} onChange={(value) => setCierre({ ...cierre, casetas: value })} />
                </div>

                <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
                  <p>Gasto km/litro calculado: {calcularGastoKmLitro(cierre) ? `${calcularGastoKmLitro(cierre).toFixed(3)} km/l` : 'Completa km y litros para calcularlo'}</p>
                </div>

                <EvidencePicker
                  label="Foto del tablero de gasolina"
                  file={fotoTableroGasolina}
                  onChange={setFotoTableroGasolina}
                  description="Toma o adjunta la foto del tablero para respaldar el cierre de combustible."
                />

                <ToggleCard
                  label="Limpieza realizada"
                  checked={cierre.limpieza_realizada}
                  onChange={(value) => setCierre({ ...cierre, limpieza_realizada: value })}
                />

                {cierre.limpieza_realizada && (
                  <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="block">
                      <span className="mb-1 block text-sm font-semibold text-gray-950">Tipo de limpieza</span>
                      <select
                        value={cierre.tipo_limpieza}
                        onChange={(e) => setCierre({ ...cierre, tipo_limpieza: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#07AE8B] focus:ring-4 focus:ring-[#07AE8B]/10"
                      >
                        <option value="TOTAL">Limpieza total</option>
                        <option value="EXTERIOR">Solo exterior</option>
                        <option value="INTERIOR">Solo interior</option>
                      </select>
                    </label>

                    <div>
                      <p className="text-sm font-semibold text-gray-950">Fotos de evidencia de limpieza</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Toma o adjunta fotos para que el supervisor pueda revisarlas después.
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      {fotosLimpieza.map((foto, index) => (
                        <EvidencePicker
                          key={index}
                          label={`Foto limpieza ${index + 1}`}
                          file={foto}
                          onChange={(file) => {
                            setFotosLimpieza((prev) => {
                              const next = [...prev];
                              next[index] = file;
                              return next;
                            });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <ToggleCard
                  label="Reporto falla"
                  checked={cierre.reporto_falla}
                  onChange={(value) => setCierre({ ...cierre, reporto_falla: value })}
                />

                {cierre.reporto_falla && (
                  <Textarea
                    label="Detalle de falla"
                    value={cierre.detalle_falla}
                    onChange={(value) => setCierre({ ...cierre, detalle_falla: value })}
                  />
                )}

                <Textarea
                  label="Notas de limpieza"
                  value={cierre.notas_limpieza}
                  onChange={(value) => setCierre({ ...cierre, notas_limpieza: value })}
                />

                <Textarea
                  label="Observaciones finales"
                  value={cierre.observaciones_fin}
                  onChange={(value) => setCierre({ ...cierre, observaciones_fin: value })}
                />

                <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
                  <p>Mercancía capturada: {fmtMoney(cierre.total_mercancia || 0)}</p>
                  <p>Casetas capturadas: {fmtMoney(cierre.casetas || 0)}</p>
                </div>

                <button
                  disabled={finishing || viajeActual.estado !== 'EN_RUTA'}
                  className="w-full rounded-xl bg-[#F54927] px-4 py-3 text-sm font-semibold text-white hover:bg-[#F26449] disabled:opacity-60"
                >
                  {finishing ? 'Finalizando...' : 'Finalizar ruta'}
                </button>
              </form>
            </Card>
          </section>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 font-semibold text-gray-950">{value || '—'}</p>
    </div>
  );
}

function EvidencePicker({ label, file, onChange, description }) {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  return (
    <div className={`rounded-2xl border p-4 ${file ? 'border-[#07AE8B] bg-[#07AE8B]/5' : 'border-gray-200 bg-white'}`}>
      <div className="mb-3">
        <p className="text-sm font-semibold text-gray-950">{label}</p>
        {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) onChange(selected);
        }}
      />

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) onChange(selected);
        }}
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-3 py-2 text-sm font-bold text-white"
        >
          <Camera size={18} />
          {file ? 'Cambiar cámara' : 'Tomar foto'}
        </button>

        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-800"
        >
          <ImagePlus size={18} />
          Elegir galería
        </button>
      </div>

      {file && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs text-[#04745f]">
          <span className="truncate font-medium">{file.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 rounded-lg border border-gray-200 px-2 py-1 text-gray-700"
          >
            Quitar
          </button>
        </div>
      )}
    </div>
  );
}

function CameraOnlyPicker({ label, file, onChange, description }) {
  const cameraInputRef = useRef(null);

  return (
    <div className={`rounded-2xl border p-4 ${file ? 'border-[#07AE8B] bg-[#07AE8B]/5' : 'border-gray-200 bg-white'}`}>
      <div className="mb-3">
        <p className="text-sm font-semibold text-gray-950">{label}</p>
        {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) onChange(selected);
        }}
      />

      <button
        type="button"
        onClick={() => cameraInputRef.current?.click()}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-3 py-2 text-sm font-bold text-white"
      >
        <Camera size={18} />
        {file ? 'Tomar otra foto' : 'Tomar foto'}
      </button>

      {file && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs text-[#04745f]">
          <span className="truncate font-medium">{file.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 rounded-lg border border-gray-200 px-2 py-1 text-gray-700"
          >
            Quitar
          </button>
        </div>
      )}
    </div>
  );
}

