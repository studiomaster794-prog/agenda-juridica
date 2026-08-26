import type { AppointmentDraft } from '@/types';
import { isIsoDate, isIsoTime } from '@/lib/dates';

export function validateAppointment(draft: AppointmentDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.clientName.trim()) {
    errors.clientName = 'Informe o nome do cliente ou um título para o compromisso.';
  }
  if (!draft.date || !isIsoDate(draft.date)) {
    errors.date = 'Escolha uma data válida.';
  }
  if (!draft.time || !isIsoTime(draft.time)) {
    errors.time = 'Escolha um horário válido.';
  }
  return errors;
}
