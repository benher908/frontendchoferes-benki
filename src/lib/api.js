import { getToken, clearSession } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (response.status === 401) {
    clearSession();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Error en la petición');
  }

  return data;
}

export async function publicApiFetch(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Error en la petición');
  }

  return data;
}

export const api = {
  login: ({ username, password }) =>
    apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: String(username || '').trim(),
        password: String(password || ''),
      }),
    }),

  me: () => apiFetch('/auth/me'),

  catalogos: () => apiFetch('/catalogos'),

  dashboardResumen: (anio, mes) =>
    apiFetch(`/dashboard/resumen?anio=${anio}&mes=${mes}`),

  choferes: () => apiFetch('/choferes'),

  unidades: () => apiFetch('/unidades'),

  rutas: () => apiFetch('/rutas'),

  chequeos: (params = '') => apiFetch(`/chequeos${params}`),

  misChequeos: () => apiFetch('/mis-chequeos'),

  miEstadoRuta: () => apiFetch('/rutas-viajes/mi-estado'),

  obtenerEncuestaPublica: (token) => publicApiFetch(`/encuestas/${token}`),

  resolverEncuestaPublicaPorRuta: (rutaId) => publicApiFetch(`/encuestas-ruta/${rutaId}`),

  responderEncuestaPublica: (token, payload) =>
    publicApiFetch(`/encuestas/${token}/responder`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listarEncuestasInternas: (params = {}) => {
    const search = new URLSearchParams();

    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    });

    const suffix = search.toString() ? `?${search.toString()}` : '';
    return apiFetch(`/encuestas-internas${suffix}`);
  },

  listarViajes: (params = {}) => {
    const search = new URLSearchParams();

    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    });

    const suffix = search.toString() ? `?${search.toString()}` : '';
    return apiFetch(`/rutas-viajes${suffix}`);
  },

  asignarViaje: (payload) =>
    apiFetch('/rutas-viajes/asignar', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  actualizarDetalleViaje: (viajeId, detalleId, payload) =>
    apiFetch(`/rutas-viajes/${viajeId}/detalles/${detalleId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  prepararViaje: (payload) =>
    apiFetch('/rutas-viajes/preparar', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  iniciarViaje: (id) =>
    apiFetch(`/rutas-viajes/${id}/iniciar`, {
      method: 'POST',
    }),

  finalizarViaje: (id, payload) =>
    apiFetch(`/rutas-viajes/${id}/finalizar`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  subirFotoTableroGasolina: (id, formData) =>
    apiFetch(`/rutas-viajes/${id}/foto-tablero-gasolina`, {
      method: 'POST',
      body: formData,
    }),

  subirFotoUltimaCaseta: (id, formData) =>
    apiFetch(`/rutas-viajes/${id}/foto-ultima-caseta`, {
      method: 'POST',
      body: formData,
    }),

  cancelarViaje: (id, payload = {}) =>
    apiFetch(`/rutas-viajes/${id}/cancelar`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  incentivos: (anio, mes) => apiFetch(`/incentivos?anio=${anio}&mes=${mes}`),

  recalcularIncentivos: (payload) =>
    apiFetch('/incentivos/recalcular', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  previewIncentivoChofer: (choferId, anio, mes) =>
    apiFetch(`/incentivos/preview/${choferId}?anio=${anio}&mes=${mes}`),

  crearRendimiento: (payload) =>
    apiFetch('/rendimiento', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listarRendimiento: () => apiFetch('/rendimiento'),

  reporteCombustibleDiario: (params = {}) => {
    const search = new URLSearchParams();

    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    });

    const suffix = search.toString() ? `?${search.toString()}` : '';
    return apiFetch(`/rendimiento/combustible-diario${suffix}`);
  },

  crearPuntualidad: (payload) =>
    apiFetch('/puntualidad', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listarPuntualidad: () => apiFetch('/puntualidad'),

  miPuntualidadHoy: () => apiFetch('/mis-puntualidad/hoy'),

  registrarLlegadaCedis: (payload = {}) =>
    apiFetch('/mis-puntualidad/llegada-cedis', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  crearServicio: (payload) =>
    apiFetch('/servicio', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listarServicio: () => apiFetch('/servicio'),

  crearLimpieza: (payload) =>
    apiFetch('/limpieza', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  subirFotosLimpieza: (id, formData) =>
    apiFetch(`/limpieza/${id}/fotos`, {
      method: 'POST',
      body: formData,
    }),

  listarLimpieza: () => apiFetch('/limpieza'),

  ultimoKmUnidad: (unidadId) => apiFetch(`/unidades/${unidadId}/ultimo-km`),

  crearChofer: (payload) =>
    apiFetch('/choferes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  actualizarChofer: (id, payload) =>
    apiFetch(`/choferes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  eliminarChofer: (id) =>
    apiFetch(`/choferes/${id}`, {
      method: 'DELETE',
    }),

  resumenChofer: (id, anio, mes) =>
    apiFetch(`/choferes/${id}/resumen?anio=${anio}&mes=${mes}`),
  verificaciones: () => apiFetch('/verificaciones'),

  verificacionesProximas: (dias = 30) =>
    apiFetch(`/verificaciones/proximas?dias=${dias}`),

  crearVerificacion: (payload) =>
    apiFetch('/verificaciones', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  actualizarVerificacion: (id, payload) =>
    apiFetch(`/verificaciones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  eliminarVerificacion: (id) =>
    apiFetch(`/verificaciones/${id}`, {
      method: 'DELETE',
    }),

  mantenimientos: (params = {}) => {
    const search = new URLSearchParams();

    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    });

    const suffix = search.toString() ? `?${search.toString()}` : '';
    return apiFetch(`/mantenimientos${suffix}`);
  },

  obtenerMantenimiento: (id) => apiFetch(`/mantenimientos/${id}`),

  crearMantenimiento: (payload) =>
    apiFetch('/mantenimientos', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  registrarEntradaMantenimiento: (id, payload) =>
    apiFetch(`/mantenimientos/${id}/entrada`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  registrarSalidaMantenimiento: (id, payload) =>
    apiFetch(`/mantenimientos/${id}/salida`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  solicitarProrrogaMantenimiento: (id, payload) =>
    apiFetch(`/mantenimientos/${id}/prorrogas`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  cancelarMantenimiento: (id, payload = {}) =>
    apiFetch(`/mantenimientos/${id}/cancelar`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  catalogoChequeos: () => apiFetch('/chequeos/catalogo'),

  listarChequeos: (params = '') => apiFetch(`/chequeos${params}`),

  obtenerChequeo: (id) => apiFetch(`/chequeos/${id}`),

  crearChequeo: (payload) =>
    apiFetch('/chequeos', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  subirFotosChequeo: (id, formData) =>
    apiFetch(`/chequeos/${id}/fotos`, {
      method: 'POST',
      body: formData,
    }),

  ultimoChequeoChofer: ({ unidad_id, chofer_id }) => {
    const params = new URLSearchParams();
    if (unidad_id) params.set('unidad_id', unidad_id);
    if (chofer_id) params.set('chofer_id', chofer_id);

    return apiFetch(`/chequeos/ultimo-chofer?${params.toString()}`);
  },
  
  miUltimoChequeo: () => apiFetch('/mis-chequeos/ultimo'),
};
