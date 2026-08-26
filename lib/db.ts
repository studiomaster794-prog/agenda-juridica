import * as SQLite from 'expo-sqlite';
import { DEFAULT_SETTINGS } from '@/constants';
import { createId } from '@/lib/ids';
import type { Appointment, AppSettings, CustomSubject } from '@/types';

let database: SQLite.SQLiteDatabase | null = null;

interface AppointmentRow {
  id: string;
  date: string;
  time: string;
  process_number: string;
  client_name: string;
  subject: string;
  courthouse: string;
  location: string;
  notes: string;
  status: Appointment['status'];
  type: Appointment['type'];
  reminder_10d: number;
  reminder_7d: number;
  reminder_1d: number;
  reminder_same_day: number;
  reminder_custom: string | null;
  created_at: string;
  updated_at: string;
}

function mapAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    processNumber: row.process_number ?? '',
    clientName: row.client_name,
    subject: row.subject ?? '',
    courthouse: row.courthouse ?? '',
    location: row.location ?? '',
    notes: row.notes ?? '',
    status: row.status,
    type: row.type,
    reminder10d: Boolean(row.reminder_10d),
    reminder7d: Boolean(row.reminder_7d),
    reminder1d: Boolean(row.reminder_1d),
    reminderSameDay: Boolean(row.reminder_same_day),
    reminderCustom: row.reminder_custom,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (database) return database;
  database = await SQLite.openDatabaseAsync('agenda-juridica.db');
  await database.execAsync(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
  `);
  await migrate(database);
  return database;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      process_number TEXT NOT NULL DEFAULT '',
      client_name TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT '',
      courthouse TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'agendado',
      type TEXT NOT NULL DEFAULT 'audiencia',
      reminder_10d INTEGER NOT NULL DEFAULT 1,
      reminder_7d INTEGER NOT NULL DEFAULT 1,
      reminder_1d INTEGER NOT NULL DEFAULT 0,
      reminder_same_day INTEGER NOT NULL DEFAULT 0,
      reminder_custom TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_subjects (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scheduled_notifications (
      id TEXT PRIMARY KEY NOT NULL,
      appointment_id TEXT NOT NULL,
      expo_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      fire_at TEXT NOT NULL,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date, time);
    CREATE INDEX IF NOT EXISTS idx_notifications_appointment ON scheduled_notifications(appointment_id);
  `);

  const existing = await db.getAllAsync<{ key: string }>('SELECT key FROM settings');
  if (existing.length === 0) {
    const entries = Object.entries(DEFAULT_SETTINGS);
    for (const [key, value] of entries) {
      await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', key, JSON.stringify(value));
    }
  }
}

export async function listAppointments(): Promise<Appointment[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<AppointmentRow>(
    'SELECT * FROM appointments ORDER BY date ASC, time ASC',
  );
  return rows.map(mapAppointment);
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<AppointmentRow>('SELECT * FROM appointments WHERE id = ?', id);
  return row ? mapAppointment(row) : null;
}

export async function upsertAppointment(appointment: Appointment): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO appointments (
      id, date, time, process_number, client_name, subject, courthouse, location, notes,
      status, type, reminder_10d, reminder_7d, reminder_1d, reminder_same_day, reminder_custom,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      date = excluded.date,
      time = excluded.time,
      process_number = excluded.process_number,
      client_name = excluded.client_name,
      subject = excluded.subject,
      courthouse = excluded.courthouse,
      location = excluded.location,
      notes = excluded.notes,
      status = excluded.status,
      type = excluded.type,
      reminder_10d = excluded.reminder_10d,
      reminder_7d = excluded.reminder_7d,
      reminder_1d = excluded.reminder_1d,
      reminder_same_day = excluded.reminder_same_day,
      reminder_custom = excluded.reminder_custom,
      updated_at = excluded.updated_at`,
    appointment.id,
    appointment.date,
    appointment.time,
    appointment.processNumber,
    appointment.clientName,
    appointment.subject,
    appointment.courthouse,
    appointment.location,
    appointment.notes,
    appointment.status,
    appointment.type,
    appointment.reminder10d ? 1 : 0,
    appointment.reminder7d ? 1 : 0,
    appointment.reminder1d ? 1 : 0,
    appointment.reminderSameDay ? 1 : 0,
    appointment.reminderCustom,
    appointment.createdAt,
    appointment.updatedAt,
  );
}

export async function deleteAppointment(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM scheduled_notifications WHERE appointment_id = ?', id);
  await db.runAsync('DELETE FROM appointments WHERE id = ?', id);
}

export async function replaceAllAppointments(appointments: Appointment[]): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM scheduled_notifications; DELETE FROM appointments;');
  for (const appointment of appointments) {
    await upsertAppointment(appointment);
  }
}

export async function listCustomSubjects(): Promise<CustomSubject[]> {
  const db = await getDb();
  return db.getAllAsync<CustomSubject>(
    'SELECT id, name, color, created_at as createdAt FROM custom_subjects ORDER BY name COLLATE NOCASE',
  );
}

export async function addCustomSubject(name: string, color: string): Promise<CustomSubject> {
  const db = await getDb();
  const subject: CustomSubject = {
    id: createId(),
    name: name.trim(),
    color,
    createdAt: new Date().toISOString(),
  };
  await db.runAsync(
    'INSERT INTO custom_subjects (id, name, color, created_at) VALUES (?, ?, ?, ?)',
    subject.id,
    subject.name,
    subject.color,
    subject.createdAt,
  );
  return subject;
}

export async function updateCustomSubject(id: string, name: string, color: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE custom_subjects SET name = ?, color = ? WHERE id = ?', name.trim(), color, id);
}

export async function deleteCustomSubject(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM custom_subjects WHERE id = ?', id);
}

export async function loadSettings(): Promise<AppSettings> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const parsed: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    try {
      parsed[row.key] = JSON.parse(row.value);
    } catch {
      parsed[row.key] = row.value;
    }
  }
  return parsed as unknown as AppSettings;
}

export async function saveSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    JSON.stringify(value),
  );
}

export async function saveNotificationIds(
  appointmentId: string,
  items: { expoId: string; kind: string; fireAt: string }[],
): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM scheduled_notifications WHERE appointment_id = ?', appointmentId);
  for (const item of items) {
    await db.runAsync(
      'INSERT INTO scheduled_notifications (id, appointment_id, expo_id, kind, fire_at) VALUES (?, ?, ?, ?, ?)',
      createId(),
      appointmentId,
      item.expoId,
      item.kind,
      item.fireAt,
    );
  }
}

export async function listNotificationIds(appointmentId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ expo_id: string }>(
    'SELECT expo_id FROM scheduled_notifications WHERE appointment_id = ?',
    appointmentId,
  );
  return rows.map((row) => row.expo_id);
}

export async function clearNotificationIds(appointmentId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM scheduled_notifications WHERE appointment_id = ?', appointmentId);
}
