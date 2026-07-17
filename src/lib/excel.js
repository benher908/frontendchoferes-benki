import * as XLSX from 'xlsx';

function safe(value) {
  if (value === null || value === undefined || value === '') return '';
  return value;
}

function dateOnly(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function boolText(value) {
  if (value === true || value === 1) return 'Si';
  if (value === false || value === 0) return 'No';
  return '';
}

function sortByDateDesc(rows, field = 'fecha') {
  return [...(rows || [])].sort((a, b) => {
    const av = String(a?.[field] || '');
    const bv = String(b?.[field] || '');
    return bv.localeCompare(av);
  });
}

function autoSizeColumns(worksheet, rows) {
  if (!rows || rows.length === 0) return;

  const keys = Object.keys(rows[0]);

  worksheet['!cols'] = keys.map((key) => {
    const maxLength = Math.max(
      key.length,
      ...rows.map((row) => String(row[key] ?? '').length)
    );

    return {
      wch: Math.min(Math.max(maxLength + 2, 12), 35),
    };
  });
}

function addSheet(workbook, sheetName, rows) {
  const safeRows = rows.length > 0 ? rows : [{ Mensaje: 'Sin registros' }];
  const worksheet = XLSX.utils.json_to_sheet(safeRows);

  autoSizeColumns(worksheet, safeRows);

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
}

export function descargarExcelIncentivos({ rows, periodo }) {
  const workbook = XLSX.utils.book_new();

  const data = rows.map((item) => ({
    Chofer: safe(item.chofer_nombre),
    Ruta: safe(item.ruta_nombre),
    'Dias trabajados': safe(item.dias_trabajados),
    'Rendimiento %': Number(item.score_rendimiento || 0) * 100,
    'Puntualidad %': Number(item.score_puntualidad || 0) * 100,
    'Servicio %': Number(item.score_servicio || 0) * 100,
    'Limpieza %': Number(item.score_limpieza || 0) * 100,
    'Chequeos diarios %': Number(item.score_chequeos || 0) * 100,
    'Total %': Number(item.score_total || 0) * 100,
    'Monto maximo': Number(item.monto_maximo || 0),
    Monto: Number(item.monto || 0),
    'Calculado en': safe(item.calculado_at),
  }));

  const resumen = [
    {
      Anio: periodo.anio,
      Mes: periodo.mes,
      'Choferes calculados': rows.length,
      'Monto total': rows.reduce((sum, item) => sum + Number(item.monto || 0), 0),
      'Promedio %':
        rows.length > 0
          ? (rows.reduce((sum, item) => sum + Number(item.score_total || 0), 0) / rows.length) * 100
          : 0,
    },
  ];

  addSheet(workbook, 'Resumen', resumen);
  addSheet(workbook, 'Incentivos', data);

  XLSX.writeFile(
    workbook,
    `incentivos_${periodo.anio}_${String(periodo.mes).padStart(2, '0')}.xlsx`
  );
}

export function descargarExcelChofer({ resumen }) {
  const workbook = XLSX.utils.book_new();

  const chofer = resumen.chofer || {};
  const periodo = resumen.periodo || {};
  const incentivo = resumen.incentivo || null;

  addSheet(workbook, 'Informacion', [
    {
      ID: safe(chofer.id),
      Nombre: safe(chofer.nombre),
      Usuario: safe(chofer.username),
      Rutas: safe(chofer.ruta_nombre),
      Telefono: safe(chofer.telefono),
      'Numero licencia': safe(chofer.numero_licencia),
      'Tipo licencia': safe(chofer.tipo_licencia),
      'Vigencia licencia': dateOnly(chofer.vigencia_licencia),
      'Fecha ingreso': dateOnly(chofer.fecha_ingreso),
      Periodo: `${safe(periodo.mes)}/${safe(periodo.anio)}`,
      'Incentivo monto': incentivo ? Number(incentivo.monto || 0) : '',
      'Incentivo %': incentivo ? Number(incentivo.score_total || 0) * 100 : '',
    },
  ]);

  addSheet(
    workbook,
    'Rendimiento',
    sortByDateDesc(resumen.rendimiento || []).map((r) => ({
      Fecha: dateOnly(r.fecha),
      Unidad: safe(r.unidad_nombre),
      Placas: safe(r.placas),
      Ruta: safe(r.ruta_nombre),
      'Km inicial': safe(r.km_inicial),
      'Km final': safe(r.km_final),
      Litros: safe(r.litros),
      Rendimiento: safe(r.rendimiento),
      'Cumple objetivo': boolText(r.cumple_objetivo),
      'Precio litro': safe(r.precio_litro),
      'Total mercancia': safe(r.total_mercancia),
      Casetas: safe(r.casetas),
      Notas: safe(r.notas),
    }))
  );

  addSheet(
    workbook,
    'Puntualidad',
    sortByDateDesc(resumen.puntualidad || []).map((p) => ({
      Fecha: dateOnly(p.fecha),
      Ruta: safe(p.ruta_nombre),
      'Hora llegada esperada': safe(p.hora_programada),
      'Hora llegada CEDIS': safe(p.hora_llegada),
      'Hora salida real': safe(p.hora_inicio_ruta),
      'Tolerancia minutos': safe(p.tolerancia_minutos),
      'A tiempo': boolText(p.a_tiempo),
      Notas: safe(p.notas),
    }))
  );

  addSheet(
    workbook,
    'Servicio',
    sortByDateDesc(resumen.servicio || []).map((s) => ({
      Fecha: dateOnly(s.fecha),
      Ruta: safe(s.ruta_nombre),
      'Clientes esperados': safe(s.clientes_esperados),
      'Clientes visitados': safe(s.clientes_visitados),
      Incidencias: safe(s.incidencias),
      Comentarios: safe(s.comentarios),
    }))
  );

  addSheet(
    workbook,
    'Limpieza',
    sortByDateDesc(resumen.limpieza || []).map((l) => ({
      Fecha: dateOnly(l.fecha),
      Unidad: safe(l.unidad_nombre),
      Placas: safe(l.placas),
      'Lavada semana': boolText(l.lavada_semana),
      'Reporto falla': boolText(l.reporto_falla),
      'Detalle falla': safe(l.detalle_falla),
      'Mantenimiento realizado': boolText(l.mantenimiento_realizado),
      'Mantenimiento a tiempo': boolText(l.mantenimiento_a_tiempo),
      'Chofer reporto preventivo': boolText(l.chofer_reporto_preventivo),
      Notas: safe(l.notas),
    }))
  );

  addSheet(
    workbook,
    'Chequeos recientes',
    sortByDateDesc(resumen.chequeos_recientes || []).map((c) => ({
      Fecha: dateOnly(c.fecha),
      Hora: safe(c.hora),
      Tipo: safe(c.tipo),
      Unidad: safe(c.unidad_nombre),
      Placas: safe(c.placas),
      Kilometraje: safe(c.kilometraje),
    }))
  );

  const nombreArchivo = String(chofer.nombre || 'chofer')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  XLSX.writeFile(
    workbook,
    `registro_chofer_${nombreArchivo || chofer.id}_${periodo.anio}_${String(periodo.mes).padStart(2, '0')}.xlsx`
  );
}

export function descargarExcelCombustibleDiario({ fecha, periodo = 'dia', rows }) {
  const workbook = XLSX.utils.book_new();

  addSheet(
    workbook,
    'Combustible diario',
    sortByDateDesc(rows || []).map((r) => ({
      FECHA: dateOnly(r.fecha),
      UNIDAD: safe(r.unidad_nombre),
      'KM.I': Number(r.km_inicial || 0),
      'KM.F': Number(r.km_final || 0),
      'KM.R': Number(r.km_recorridos || 0),
      'PRECIO UNITARIO': Number(r.precio_litro || 0),
      LITROS: Number(r.litros_consumidos || r.litros || 0),
      TOTAL: Number(r.total_combustible || 0),
      CASETAS: Number(r.casetas || 0),
    }))
  );

  XLSX.writeFile(workbook, `combustible_${periodo}_${dateOnly(fecha)}.xlsx`);
}
