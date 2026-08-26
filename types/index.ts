export type AppointmentStatus = 'agendado' | 'concluido' | 'adiado' | 'cancelado';

export type AppointmentType =
  | 'audiencia'
  | 'prazo'
  | 'reuniao'
  | 'atendimento'
  | 'pessoal'
  | 'outro';

export type ReminderKind = '10d' | '7d' | '1d' | 'same_day' | 'custom';

export type ThemePreference = 'claro' | 'escuro' | 'automatico';

export type NotificationPrivacy = 'completa' | 'privada';

export interface AppointmentReminders {
  reminder10d: boolean;
  reminder7d: boolean;
  reminder1d: boolean;
  reminderSameDay: boolean;
  reminderCustom: string | null;
}

export interface Appointment extends AppointmentReminders {
  id: string;
  date: string;
  time: string;
  processNumber: string;
  clientName: string;
  subject: string;
  courthouse: string;
  location: string;
  notes: string;
  status: AppointmentStatus;
  type: AppointmentType;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentDraft = Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

export interface CustomSubject {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface AppSettings {
  onboardingDone: boolean;
  notificationsEnabled: boolean;
  defaultReminder10d: boolean;
  defaultReminder7d: boolean;
  defaultReminder1d: boolean;
  defaultReminderSameDay: boolean;
  defaultAlertTime: string;
  faceIdEnabled: boolean;
  theme: ThemePreference;
  notificationPrivacy: NotificationPrivacy;
}

export interface ScheduledReminder {
  kind: ReminderKind;
  fireAt: Date;
}

export interface ImportRow {
  rowNumber: number;
  date: string;
  time: string;
  processNumber: string;
  clientName: string;
  subject: string;
  courthouse: string;
  errors: string[];
  isDuplicate: boolean;
  selected: boolean;
}

export interface ImportPreview {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  rows: ImportRow[];
}

export interface AppointmentFilters {
  query: string;
  status: AppointmentStatus | 'todos';
  type: AppointmentType | 'todos';
  subject: string | 'todos';
  courthouse: string | 'todos';
  client: string | 'todos';
  period: 'todos' | 'hoje' | '7d' | '30d' | 'passados' | 'futuros';
}
