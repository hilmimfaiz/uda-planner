/**
 * Utility untuk memformat tanggal dan waktu ke Zona Waktu Indonesia Barat (WIB / UTC+7)
 * Memastikan tampilan waktu konsisten dengan label eksplisit "WIB".
 */
export function formatWibDate(dateVal?: string | Date | number | null): string {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '-';

  const str = d.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${str.replace(':', '.')} WIB`;
}

export function formatWibTime(dateVal?: string | Date | number | null): string {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '-';

  const str = d.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${str.replace(':', '.')} WIB`;
}
