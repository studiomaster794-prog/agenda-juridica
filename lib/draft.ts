import { format } from 'date-fns';
import { DEFAULT_SETTINGS } from '@/constants';
import type { AppointmentDraft, AppSettings } from '@/types';

export function emptyDraft(settings: AppSettings = DEFAULT_SETTINGS, date?: string): AppointmentDraft {
  return {
    date: date ?? format(new Date(), 'yyyy-MM-dd'),
    time: '09:30',
    processNumber: '',
    clientName: '',
    subject: 'Cível',
    courthouse: '',
    location: '',
    notes: '',
    status: 'agendado',
    type: 'audiencia',
    reminder10d: settings.defaultReminder10d,
    reminder7d: settings.defaultReminder7d,
    reminder1d: settings.defaultReminder1d,
    reminderSameDay: settings.defaultReminderSameDay,
    reminderCustom: null,
  };
}
