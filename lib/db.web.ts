import { DEFAULT_SETTINGS } from '@/constants';
import { createId } from '@/lib/ids';
import type { Appointment, AppSettings, CustomSubject } from '@/types';

const KEYS = {
  appointments: 'agenda-juridica:appointments',
  settings: 'agenda-juridica:settings',
  subjects: 'agenda-juridica:subjects',
  notifications: 'agenda-juridica:notifications',
};

function read<T>(key: string, fallback: T): T {
  try {
    const value = globalThis.localStorage?.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  globalThis.localStorage?.setItem(key, JSON.stringify(value));
}

export async function listAppointments(): Promise<Appointment[]> {
  return read<Appointment[]>(KEYS.appointments, []).sort((a, b) =>
    `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
  );
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  return (await listAppointments()).find((item) => item.id === id) ?? null;
}

export async function upsertAppointment(appointment: Appointment): Promise<void> {
  const current = await listAppointments();
  const next = current.filter((item) => item.id !== appointment.id);
  next.push(appointment);
  write(KEYS.appointments, next);
}

export async function deleteAppointment(id: string): Promise<void> {
  const current = await listAppointments();
  write(KEYS.appointments, current.filter((item) => item.id !== id));
  await clearNotificationIds(id);
}

export async function replaceAllAppointments(appointments: Appointment[]): Promise<void> {
  write(KEYS.appointments, appointments);
  write(KEYS.notifications, {});
}

export async function listCustomSubjects(): Promise<CustomSubject[]> {
  return read<CustomSubject[]>(KEYS.subjects, []).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export async function addCustomSubject(name: string, color: string): Promise<CustomSubject> {
  const current = await listCustomSubjects();
  const subject: CustomSubject = {
    id: createId(),
    name: name.trim(),
    color,
    createdAt: new Date().toISOString(),
  };
  write(KEYS.subjects, [...current, subject]);
  return subject;
}

export async function updateCustomSubject(id: string, name: string, color: string): Promise<void> {
  const current = await listCustomSubjects();
  write(
    KEYS.subjects,
    current.map((item) => (item.id === id ? { ...item, name: name.trim(), color } : item)),
  );
}

export async function deleteCustomSubject(id: string): Promise<void> {
  const current = await listCustomSubjects();
  write(KEYS.subjects, current.filter((item) => item.id !== id));
}

export async function loadSettings(): Promise<AppSettings> {
  return { ...DEFAULT_SETTINGS, ...read<Partial<AppSettings>>(KEYS.settings, {}) };
}

export async function saveSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K],
): Promise<void> {
  const current = await loadSettings();
  write(KEYS.settings, { ...current, [key]: value });
}

type StoredNotifications = Record<string, string[]>;

export async function saveNotificationIds(
  appointmentId: string,
  items: { expoId: string; kind: string; fireAt: string }[],
): Promise<void> {
  const current = read<StoredNotifications>(KEYS.notifications, {});
  write(KEYS.notifications, { ...current, [appointmentId]: items.map((item) => item.expoId) });
}

export async function listNotificationIds(appointmentId: string): Promise<string[]> {
  return read<StoredNotifications>(KEYS.notifications, {})[appointmentId] ?? [];
}

export async function clearNotificationIds(appointmentId: string): Promise<void> {
  const current = read<StoredNotifications>(KEYS.notifications, {});
  delete current[appointmentId];
  write(KEYS.notifications, current);
}
