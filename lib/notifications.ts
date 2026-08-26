import { Linking, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { APPOINTMENT_TYPES } from '@/constants';
import { formatDateShort, formatTimeBR } from '@/lib/dates';
import { clearNotificationIds, listNotificationIds, saveNotificationIds } from '@/lib/db';
import { computeScheduledReminders, reminderTitle } from '@/lib/reminders';
import type { Appointment, AppSettings, NotificationPrivacy } from '@/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function getNotificationPermission(): Promise<Notifications.PermissionStatus> {
  if (Platform.OS === 'web') return Notifications.PermissionStatus.UNDETERMINED;
  const settings = await Notifications.getPermissionsAsync();
  return settings.status;
}

export async function requestNotificationPermission(): Promise<Notifications.PermissionStatus> {
  if (Platform.OS === 'web') return Notifications.PermissionStatus.UNDETERMINED;
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return current.status;
  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return requested.status;
}

export async function openSystemNotificationSettings(): Promise<void> {
  await Linking.openSettings();
}

export function canScheduleOnDevice(): boolean {
  return Platform.OS !== 'web' && Device.isDevice;
}

function typeLabel(type: Appointment['type']): string {
  return APPOINTMENT_TYPES.find((item) => item.value === type)?.label ?? 'Compromisso';
}

function notificationBody(appointment: Appointment, privacy: NotificationPrivacy, kind: string): string {
  if (privacy === 'privada') {
    return 'Você possui um compromisso agendado.';
  }
  const when = `${formatDateShort(appointment.date)} às ${formatTimeBR(appointment.time)}`;
  if (kind === '1d' || kind === 'same_day') {
    const extras = [appointment.processNumber, appointment.courthouse].filter(Boolean).join(' · ');
    return extras
      ? `${appointment.clientName} — ${formatTimeBR(appointment.time)}. Confira o processo e a comarca.`
      : `${appointment.clientName} — ${formatTimeBR(appointment.time)}.`;
  }
  const subject = appointment.subject ? ` — Assunto: ${appointment.subject}.` : '.';
  return `Cliente: ${appointment.clientName} — ${when}${subject}`;
}

export async function cancelAppointmentNotifications(appointmentId: string): Promise<void> {
  const ids = await listNotificationIds(appointmentId);
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
  await clearNotificationIds(appointmentId);
}

export async function syncAppointmentNotifications(
  appointment: Appointment,
  settings: AppSettings,
): Promise<void> {
  await cancelAppointmentNotifications(appointment.id);

  const shouldSkip =
    !settings.notificationsEnabled ||
    appointment.status === 'cancelado' ||
    appointment.status === 'concluido';

  if (shouldSkip || !canScheduleOnDevice()) return;

  const permission = await getNotificationPermission();
  if (permission !== 'granted') return;

  const reminders = computeScheduledReminders(appointment, settings.defaultAlertTime);
  const stored: { expoId: string; kind: string; fireAt: string }[] = [];
  const label = typeLabel(appointment.type);

  for (const reminder of reminders) {
    const expoId = await Notifications.scheduleNotificationAsync({
      content: {
        title: reminderTitle(reminder.kind, label),
        body: notificationBody(appointment, settings.notificationPrivacy, reminder.kind),
        sound: true,
        data: { appointmentId: appointment.id, kind: reminder.kind },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.fireAt,
      },
    });
    stored.push({
      expoId,
      kind: reminder.kind,
      fireAt: reminder.fireAt.toISOString(),
    });
  }

  await saveNotificationIds(appointment.id, stored);
}

export async function rescheduleAllNotifications(
  appointments: Appointment[],
  settings: AppSettings,
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const appointment of appointments) {
    await clearNotificationIds(appointment.id);
    await syncAppointmentNotifications(appointment, settings);
  }
}
