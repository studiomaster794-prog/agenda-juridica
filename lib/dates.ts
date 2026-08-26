import {
  addDays,
  differenceInCalendarDays,
  format,
  isToday,
  isTomorrow,
  isValid,
  isYesterday,
  parse,
  parseISO,
  startOfDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DATE_ISO = 'yyyy-MM-dd';
const TIME_ISO = 'HH:mm';

export function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function toIsoTime(hours: number, minutes: number): string {
  return `${pad2(hours)}:${pad2(minutes)}`;
}

export function parseIsoDate(value: string): Date | null {
  if (!value) return null;
  const parsed = parse(value, DATE_ISO, new Date());
  return isValid(parsed) ? parsed : null;
}

export function parseIsoDateTime(date: string, time: string): Date | null {
  const parsed = parse(`${date} ${time}`, `${DATE_ISO} ${TIME_ISO}`, new Date());
  return isValid(parsed) ? parsed : null;
}

export function todayIso(now = new Date()): string {
  return format(now, DATE_ISO);
}

export function formatDateLong(date: string | Date): string {
  const d = typeof date === 'string' ? parseIsoDate(date) : date;
  if (!d) return '';
  return format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? parseIsoDate(date) : date;
  if (!d) return '';
  return format(d, 'dd/MM/yyyy');
}

export function formatMonthYear(date: Date): string {
  const label = format(date, 'MMMM yyyy', { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatWeekdayLong(date: Date | string): string {
  const d = typeof date === 'string' ? parseIsoDate(date) : date;
  if (!d) return '';
  return format(d, 'EEEE', { locale: ptBR });
}

export function formatTimeBR(time: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return time;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${pad2(minutes)}`;
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function daysUntil(date: string, now = new Date()): number {
  const target = parseIsoDate(date);
  if (!target) return 0;
  return differenceInCalendarDays(startOfDay(target), startOfDay(now));
}

export function relativeAppointmentLabel(date: string, time: string, now = new Date()): string {
  const target = parseIsoDate(date);
  if (!target) return formatDateShort(date);
  const timeLabel = formatTimeBR(time);

  if (isToday(target)) return `Hoje, às ${timeLabel}`;
  if (isTomorrow(target)) return `Amanhã, às ${timeLabel}`;
  if (isYesterday(target)) return `Ontem, às ${timeLabel}`;

  const diff = daysUntil(date, now);
  if (diff > 1 && diff <= 30) return `Faltam ${diff} dias`;
  if (diff === 1) return `Amanhã, às ${timeLabel}`;
  if (diff < 0) {
    const past = Math.abs(diff);
    if (past === 1) return 'Há 1 dia';
    return `Há ${past} dias`;
  }
  return `${formatDateShort(date)}, ${timeLabel}`;
}

export function urgencyOf(date: string, status: string): 'today' | 'soon' | 'future' | 'done' | 'cancelled' | 'past' {
  if (status === 'concluido') return 'done';
  if (status === 'cancelado') return 'cancelled';
  const diff = daysUntil(date);
  if (diff === 0) return 'today';
  if (diff < 0) return 'past';
  if (diff <= 10) return 'soon';
  return 'future';
}

export function parseBrazilianDate(input: unknown): string | null {
  if (input === null || input === undefined || input === '') return null;

  if (input instanceof Date && isValid(input)) {
    return format(input, DATE_ISO);
  }

  if (typeof input === 'number' && Number.isFinite(input)) {
    return excelSerialToIso(input);
  }

  const raw = String(input).trim();
  if (!raw) return null;

  const iso = parseIsoDate(raw);
  if (iso) return format(iso, DATE_ISO);

  const br = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/.exec(raw);
  if (br) {
    const day = Number(br[1]);
    const month = Number(br[2]);
    let year = Number(br[3]);
    if (year < 100) year += year >= 50 ? 1900 : 2000;
    const candidate = new Date(year, month - 1, day);
    if (
      isValid(candidate) &&
      candidate.getFullYear() === year &&
      candidate.getMonth() === month - 1 &&
      candidate.getDate() === day
    ) {
      return toIsoDate(year, month, day);
    }
  }

  const parsed = parseISO(raw);
  if (isValid(parsed)) return format(parsed, DATE_ISO);

  return null;
}

export function parseBrazilianTime(input: unknown): string | null {
  if (input === null || input === undefined || input === '') return null;

  if (input instanceof Date && isValid(input)) {
    return format(input, TIME_ISO);
  }

  if (typeof input === 'number' && Number.isFinite(input)) {
    if (input >= 0 && input < 1) {
      const totalMinutes = Math.round(input * 24 * 60);
      const hours = Math.floor(totalMinutes / 60) % 24;
      const minutes = totalMinutes % 60;
      return toIsoTime(hours, minutes);
    }
  }

  const raw = String(input).trim().toLowerCase().replace(/\s+/g, '');
  if (!raw) return null;

  const hFormat = /^(\d{1,2})h(\d{2})?$/.exec(raw);
  if (hFormat) {
    const hours = Number(hFormat[1]);
    const minutes = hFormat[2] ? Number(hFormat[2]) : 0;
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return toIsoTime(hours, minutes);
    }
  }

  const colon = /^(\d{1,2})[:.](\d{2})(?::\d{2})?$/.exec(raw);
  if (colon) {
    const hours = Number(colon[1]);
    const minutes = Number(colon[2]);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return toIsoTime(hours, minutes);
    }
  }

  const onlyHour = /^(\d{1,2})$/.exec(raw);
  if (onlyHour) {
    const hours = Number(onlyHour[1]);
    if (hours >= 0 && hours <= 23) return toIsoTime(hours, 0);
  }

  return null;
}

export function excelSerialToIso(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1) return null;
  const utc = new Date(Math.round((serial - 25569) * 86400 * 1000));
  if (!isValid(utc)) return null;
  return format(utc, DATE_ISO);
}

export function combineDateAndTime(date: string, time: string): Date | null {
  return parseIsoDateTime(date, time);
}

export function addCalendarDaysIso(date: string, amount: number): string | null {
  const parsed = parseIsoDate(date);
  if (!parsed) return null;
  return format(addDays(parsed, amount), DATE_ISO);
}

export function isIsoDate(value: string): boolean {
  return parseIsoDate(value) !== null;
}

export function isIsoTime(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value) && parseBrazilianTime(value) === value;
}
