import { addDays, isValid, parse } from 'date-fns';
import type { Appointment, ReminderKind, ScheduledReminder } from '@/types';
import { combineDateAndTime, parseIsoDate } from '@/lib/dates';

function atTimeOnDate(date: Date, time: string): Date | null {
  const parsed = parse(time, 'HH:mm', date);
  if (!isValid(parsed)) return null;
  const result = new Date(date);
  result.setHours(parsed.getHours(), parsed.getMinutes(), 0, 0);
  return result;
}

function subtractHour(date: Date): Date {
  return new Date(date.getTime() - 60 * 60 * 1000);
}

export function computeScheduledReminders(
  appointment: Pick<
    Appointment,
    | 'date'
    | 'time'
    | 'reminder10d'
    | 'reminder7d'
    | 'reminder1d'
    | 'reminderSameDay'
    | 'reminderCustom'
  >,
  defaultAlertTime: string,
  now = new Date(),
): ScheduledReminder[] {
  const appointmentAt = combineDateAndTime(appointment.date, appointment.time);
  const day = parseIsoDate(appointment.date);
  if (!appointmentAt || !day) return [];

  const results: ScheduledReminder[] = [];
  const seen = new Set<string>();

  const push = (kind: ReminderKind, fireAt: Date | null) => {
    if (!fireAt || !isValid(fireAt)) return;
    if (fireAt.getTime() <= now.getTime()) return;
    if (fireAt.getTime() >= appointmentAt.getTime() && kind !== 'custom') return;
    const key = `${kind}-${fireAt.toISOString()}`;
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ kind, fireAt });
  };

  if (appointment.reminder10d) {
    push('10d', atTimeOnDate(addDays(day, -10), defaultAlertTime));
  }
  if (appointment.reminder7d) {
    push('7d', atTimeOnDate(addDays(day, -7), defaultAlertTime));
  }
  if (appointment.reminder1d) {
    push('1d', atTimeOnDate(addDays(day, -1), defaultAlertTime));
  }
  if (appointment.reminderSameDay) {
    let sameDay = atTimeOnDate(day, defaultAlertTime);
    if (sameDay && sameDay.getTime() >= appointmentAt.getTime()) {
      sameDay = subtractHour(appointmentAt);
    }
    push('same_day', sameDay);
  }
  if (appointment.reminderCustom) {
    const custom = new Date(appointment.reminderCustom);
    push('custom', custom);
  }

  return results.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}

export function reminderTitle(kind: ReminderKind, typeLabel: string): string {
  switch (kind) {
    case '10d':
      return `${typeLabel} daqui a 10 dias`;
    case '7d':
      return `${typeLabel} daqui a 7 dias`;
    case '1d':
      return `${typeLabel} amanhã`;
    case 'same_day':
      return `${typeLabel} hoje`;
    case 'custom':
      return `Lembrete: ${typeLabel}`;
  }
}

export function isAppointmentIncomplete(appointment: Appointment): boolean {
  if (appointment.status !== 'agendado') return false;
  const missingCore =
    !appointment.processNumber.trim() ||
    !appointment.courthouse.trim() ||
    !appointment.location.trim();
  return missingCore;
}
