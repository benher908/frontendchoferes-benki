export function fmtMoney(value) {
  const amount = Number(value || 0);

  return amount.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
  });
}

export function fmtPercent(value) {
  const n = Number(value || 0);
  return `${n.toFixed(2)}%`;
}

export function fmtDate(value) {
  if (!value) return '—';

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(value);

    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  const text = String(value).trim();
  const ymdMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (ymdMatch) return ymdMatch[1];

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(parsed);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function todayMexicoInput() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function parseMysqlDateTime(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return value;
  }

  const text = String(value).trim();
  const match = text.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (!match) {
    const nativeDate = new Date(text);
    return Number.isNaN(nativeDate.getTime()) ? null : nativeDate;
  }

  const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;

  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    )
  );
}

export function fmtDateTime(value) {
  if (!value) return '—';

  const date = parseMysqlDateTime(value);

  if (!date || Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  });
}

