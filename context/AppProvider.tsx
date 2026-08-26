import { addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, Appearance, type ColorSchemeName } from 'react-native';
import { BUILT_IN_SUBJECTS, DEFAULT_SETTINGS } from '@/constants';
import { authenticateWithBiometrics, isBiometricAvailable } from '@/lib/auth';
import {
  addCustomSubject,
  deleteAppointment as dbDeleteAppointment,
  deleteCustomSubject,
  listAppointments,
  listCustomSubjects,
  loadSettings,
  replaceAllAppointments,
  saveSetting,
  updateCustomSubject,
  upsertAppointment,
} from '@/lib/db';
import { createId } from '@/lib/ids';
import { rescheduleAllNotifications, syncAppointmentNotifications } from '@/lib/notifications';
import { isAppointmentIncomplete } from '@/lib/reminders';
import { todayIso } from '@/lib/dates';
import { getColors, type ThemeColors } from '@/theme';
import type {
  Appointment,
  AppointmentDraft,
  AppSettings,
  CustomSubject,
} from '@/types';

interface ToastState {
  message: string;
  tone: 'success' | 'error' | 'info';
}

interface AppContextValue {
  ready: boolean;
  appointments: Appointment[];
  settings: AppSettings;
  customSubjects: CustomSubject[];
  subjects: { name: string; color: string; custom?: boolean; id?: string }[];
  colors: ThemeColors;
  scheme: 'light' | 'dark';
  locked: boolean;
  toast: ToastState | null;
  saveAppointment: (draft: AppointmentDraft) => Promise<Appointment>;
  removeAppointment: (id: string) => Promise<void>;
  updateSettings: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  createSubject: (name: string, color: string) => Promise<void>;
  editSubject: (id: string, name: string, color: string) => Promise<void>;
  removeSubject: (id: string) => Promise<void>;
  importAppointments: (items: AppointmentDraft[]) => Promise<number>;
  restoreBackup: (items: Appointment[]) => Promise<void>;
  unlock: () => Promise<boolean>;
  showToast: (message: string, tone?: ToastState['tone']) => void;
  hideToast: () => void;
  stats: { today: number; week: number; month: number };
  nextAppointment: Appointment | null;
  attentionItems: Appointment[];
  upcoming: Appointment[];
  subjectColor: (name: string) => string;
}

const AppContext = createContext<AppContextValue | null>(null);

function sortAppointments(items: Appointment[]): Appointment[] {
  return [...items].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [customSubjects, setCustomSubjects] = useState<CustomSubject[]>([]);
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme() ?? 'light');
  const [locked, setLocked] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const scheme: 'light' | 'dark' =
    settings.theme === 'automatico' ? (systemScheme === 'dark' ? 'dark' : 'light') : settings.theme === 'escuro' ? 'dark' : 'light';
  const colors = getColors(scheme);

  const refresh = useCallback(async () => {
    const [items, storedSettings, subjects] = await Promise.all([
      listAppointments(),
      loadSettings(),
      listCustomSubjects(),
    ]);
    setAppointments(sortAppointments(items));
    setSettings(storedSettings);
    setCustomSubjects(subjects);
    if (storedSettings.faceIdEnabled) {
      const available = await isBiometricAvailable();
      setLocked(available);
    } else {
      setLocked(false);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    refresh().catch(() => setReady(true));
  }, [refresh]);

  useEffect(() => {
    const appearance = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme ?? 'light');
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'background' && settings.faceIdEnabled) {
        setLocked(true);
      }
    });
    return () => {
      appearance.remove();
      appState.remove();
    };
  }, [settings.faceIdEnabled]);

  const showToast = useCallback((message: string, tone: ToastState['tone'] = 'success') => {
    setToast({ message, tone });
  }, []);

  const hideToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const saveAppointment = useCallback(
    async (draft: AppointmentDraft) => {
      const now = new Date().toISOString();
      const appointment: Appointment = {
        ...draft,
        id: draft.id ?? createId(),
        clientName: draft.clientName.trim(),
        processNumber: draft.processNumber.trim(),
        subject: draft.subject.trim(),
        courthouse: draft.courthouse.trim(),
        location: draft.location.trim(),
        notes: draft.notes.trim(),
        createdAt: draft.id
          ? appointments.find((item) => item.id === draft.id)?.createdAt ?? now
          : now,
        updatedAt: now,
      };
      await upsertAppointment(appointment);
      await syncAppointmentNotifications(appointment, settings);
      setAppointments((current) => {
        const without = current.filter((item) => item.id !== appointment.id);
        return sortAppointments([...without, appointment]);
      });
      return appointment;
    },
    [appointments, settings],
  );

  const removeAppointment = useCallback(
    async (id: string) => {
      const current = appointments.find((item) => item.id === id);
      if (current) {
        await syncAppointmentNotifications({ ...current, status: 'cancelado' }, settings);
      }
      await dbDeleteAppointment(id);
      setAppointments((items) => items.filter((item) => item.id !== id));
    },
    [appointments, settings],
  );

  const updateSettings = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    await saveSetting(key, value);
    setSettings((current) => {
      const next = { ...current, [key]: value };
      if (key === 'faceIdEnabled') {
        setLocked(Boolean(value));
      }
      if (
        key === 'notificationsEnabled' ||
        key === 'defaultAlertTime' ||
        key === 'notificationPrivacy' ||
        key === 'defaultReminder10d' ||
        key === 'defaultReminder7d' ||
        key === 'defaultReminder1d' ||
        key === 'defaultReminderSameDay'
      ) {
        rescheduleAllNotifications(appointments, next).catch(() => undefined);
      }
      return next;
    });
  }, [appointments]);

  const createSubject = useCallback(async (name: string, color: string) => {
    const created = await addCustomSubject(name, color);
    setCustomSubjects((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
  }, []);

  const editSubject = useCallback(async (id: string, name: string, color: string) => {
    await updateCustomSubject(id, name, color);
    setCustomSubjects((current) =>
      current.map((item) => (item.id === id ? { ...item, name, color } : item)),
    );
  }, []);

  const removeSubject = useCallback(async (id: string) => {
    await deleteCustomSubject(id);
    setCustomSubjects((current) => current.filter((item) => item.id !== id));
  }, []);

  const importAppointments = useCallback(
    async (items: AppointmentDraft[]) => {
      let count = 0;
      for (const item of items) {
        await saveAppointment({
          ...item,
          type: item.type ?? 'audiencia',
          status: item.status ?? 'agendado',
          reminder10d: settings.defaultReminder10d,
          reminder7d: settings.defaultReminder7d,
          reminder1d: settings.defaultReminder1d,
          reminderSameDay: settings.defaultReminderSameDay,
          reminderCustom: null,
          location: item.location ?? '',
          notes: item.notes ?? '',
        });
        count += 1;
      }
      return count;
    },
    [saveAppointment, settings],
  );

  const restoreBackup = useCallback(
    async (items: Appointment[]) => {
      await replaceAllAppointments(items);
      setAppointments(sortAppointments(items));
      await rescheduleAllNotifications(items, settings);
    },
    [settings],
  );

  const unlock = useCallback(async () => {
    const ok = await authenticateWithBiometrics();
    if (ok) setLocked(false);
    return ok;
  }, []);

  const subjects = useMemo(
    () => [
      ...BUILT_IN_SUBJECTS.map((item) => ({ ...item, custom: false })),
      ...customSubjects.map((item) => ({
        name: item.name,
        color: item.color,
        custom: true,
        id: item.id,
      })),
    ],
    [customSubjects],
  );

  const subjectColor = useCallback(
    (name: string) =>
      subjects.find((item) => item.name.toLowerCase() === name.toLowerCase())?.color ?? colors.navyMid,
    [subjects, colors],
  );

  const today = todayIso();
  const todayDate = startOfDay(new Date());
  const weekEnd = addDays(todayDate, 7);
  const monthEnd = addDays(todayDate, 30);

  const active = appointments.filter((item) => item.status === 'agendado' || item.status === 'adiado');

  const stats = {
    today: active.filter((item) => item.date === today).length,
    week: active.filter((item) => {
      const date = new Date(`${item.date}T00:00:00`);
      return !isBefore(date, todayDate) && !isAfter(date, weekEnd);
    }).length,
    month: active.filter((item) => {
      const date = new Date(`${item.date}T00:00:00`);
      return !isBefore(date, todayDate) && !isAfter(date, monthEnd);
    }).length,
  };

  const upcoming = active.filter((item) => item.date >= today);
  const nextAppointment = upcoming[0] ?? null;
  const attentionItems = upcoming.filter((item) => isAppointmentIncomplete(item)).slice(0, 5);

  const value: AppContextValue = {
    ready,
    appointments,
    settings,
    customSubjects,
    subjects,
    colors,
    scheme,
    locked,
    toast,
    saveAppointment,
    removeAppointment,
    updateSettings,
    createSubject,
    editSubject,
    removeSubject,
    importAppointments,
    restoreBackup,
    unlock,
    showToast,
    hideToast,
    stats,
    nextAppointment,
    attentionItems,
    upcoming,
    subjectColor,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider');
  return ctx;
}
