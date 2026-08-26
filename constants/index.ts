import type { AppointmentStatus, AppointmentType } from '@/types';

export const APP_NAME = 'Agenda Jurídica';
export const APP_VERSION = '1.0.0';
export const TIME_ZONE = 'America/Sao_Paulo';

export const DEFAULT_ALERT_TIME = '08:00';

export const BUILT_IN_SUBJECTS: { name: string; color: string }[] = [
  { name: 'Trabalhista', color: '#5B7C8A' },
  { name: 'Cível', color: '#4A90C3' },
  { name: 'Consumidor', color: '#3D8B6E' },
  { name: 'Criminal', color: '#C4453C' },
  { name: 'Dr. Samir', color: '#C4A35A' },
  { name: 'Dativo', color: '#8B6BB0' },
];

export const APPOINTMENT_TYPES: { value: AppointmentType; label: string }[] = [
  { value: 'audiencia', label: 'Audiência' },
  { value: 'prazo', label: 'Prazo processual' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'atendimento', label: 'Atendimento' },
  { value: 'pessoal', label: 'Compromisso pessoal' },
  { value: 'outro', label: 'Outro' },
];

export const APPOINTMENT_STATUSES: { value: AppointmentStatus; label: string }[] = [
  { value: 'agendado', label: 'Agendado' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'adiado', label: 'Adiado' },
  { value: 'cancelado', label: 'Cancelado' },
];

export const WEEKDAYS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export const DEFAULT_SETTINGS = {
  onboardingDone: false,
  notificationsEnabled: true,
  defaultReminder10d: true,
  defaultReminder7d: true,
  defaultReminder1d: false,
  defaultReminderSameDay: false,
  defaultAlertTime: DEFAULT_ALERT_TIME,
  faceIdEnabled: false,
  theme: 'automatico' as const,
  notificationPrivacy: 'completa' as const,
};
