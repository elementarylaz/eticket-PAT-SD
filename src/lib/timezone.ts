import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Asia/Jakarta';

export function formatToWIB(date: Date | string, formatStr: string = 'yyyy-MM-dd HH:mm:ss') {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return formatInTimeZone(d, TIMEZONE, formatStr);
  } catch (e) {
    return '';
  }
}

export function parseWIB(dateStr: string) {
  if (!dateStr) return new Date(NaN);
  
  // Normalize whitespace
  const trimmed = dateStr.trim();
  
  // If no timezone provided, assume WIB (+07:00)
  // Check if it's a date-time string without TZ
  if (!trimmed.includes('Z') && !trimmed.includes('+') && trimmed.length >= 10) {
    // Replace space with T for ISO compliance if needed, but Date constructor handles it usually
    const isoLike = trimmed.includes(' ') ? trimmed.replace(' ', 'T') : trimmed;
    // Append offset
    const date = new Date(`${isoLike}+07:00`);
    if (!isNaN(date.getTime())) return date;
  }
  
  const date = new Date(trimmed);
  return date;
}

export function displayWIB(date: Date | string | undefined | null) {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Format tanggal tidak valid';
    return formatInTimeZone(d, TIMEZONE, 'EEEE, d MMMM yyyy, HH:mm') + ' WIB';
  } catch (e) {
    return 'Format tanggal tidak valid';
  }
}
