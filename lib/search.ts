import { addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import type { Appointment, AppointmentFilters } from '@/types';
import { parseIsoDate, stripAccents, todayIso } from '@/lib/dates';

function haystack(appointment: Appointment): string {
  return stripAccents(
    [
      appointment.clientName,
      appointment.processNumber,
      appointment.subject,
      appointment.courthouse,
      appointment.notes,
      appointment.location,
    ]
      .join(' ')
      .toLowerCase(),
  );
}

export function filterAppointments(appointments: Appointment[], filters: AppointmentFilters): Appointment[] {
  const query = stripAccents(filters.query.trim().toLowerCase());
  const today = todayIso();
  const todayDate = startOfDay(new Date());
  const in7 = addDays(todayDate, 7);
  const in30 = addDays(todayDate, 30);

  return appointments.filter((item) => {
    if (query && !haystack(item).includes(query)) return false;
    if (filters.status !== 'todos' && item.status !== filters.status) return false;
    if (filters.type !== 'todos' && item.type !== filters.type) return false;
    if (filters.subject !== 'todos' && item.subject !== filters.subject) return false;
    if (filters.courthouse !== 'todos' && item.courthouse !== filters.courthouse) return false;
    if (filters.client !== 'todos' && item.clientName !== filters.client) return false;

    const date = parseIsoDate(item.date);
    if (!date) return false;

    switch (filters.period) {
      case 'hoje':
        return item.date === today;
      case '7d':
        return !isBefore(date, todayDate) && !isAfter(date, in7);
      case '30d':
        return !isBefore(date, todayDate) && !isAfter(date, in30);
      case 'passados':
        return item.date < today;
      case 'futuros':
        return item.date >= today;
      default:
        return true;
    }
  });
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
