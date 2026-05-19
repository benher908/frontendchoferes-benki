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

  crearPuntualidad: (payload) =>
    apiFetch('/puntualidad', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listarPuntualidad: () => apiFetch('/puntualidad'),

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
  
  misChequeos: () => apiFetch('/mis-chequeos'),

  miUltimoChequeo: () => apiFetch('/mis-chequeos/ultimo'),
};