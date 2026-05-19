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
  return String(value).slice(0, 10);
}

export function fmtDateTime(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}