import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import type { Appointment, ImportPreview } from '@/types';
import { parseSpreadsheetBuffer } from '@/lib/parseSpreadsheet';
import { formatDateShort, formatTimeBR } from '@/lib/dates';
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from '@/constants';

function decodeBase64(base64: string): ArrayBuffer {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function pickSpreadsheet(
  existing: Appointment[] = [],
): Promise<ImportPreview | { error: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'text/csv',
      'text/comma-separated-values',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'public.comma-separated-values-text',
      '*/*',
    ],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return readSpreadsheetFromUri(result.assets[0].uri, existing);
}

export async function readSpreadsheetFromUri(
  uri: string,
  existing: Appointment[],
): Promise<ImportPreview | { error: string }> {
  try {
    if (Platform.OS === 'web') {
      const buffer = await fetch(uri).then((response) => response.arrayBuffer());
      return parseSpreadsheetBuffer(buffer, existing);
    }
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const buffer = decodeBase64(base64);
    return parseSpreadsheetBuffer(buffer, existing);
  } catch {
    return { error: 'Não foi possível ler o arquivo. Tente um CSV ou XLSX.' };
  }
}

function csvEscape(value: string): string {
  if (/[",\n;]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function appointmentsToCsv(appointments: Appointment[]): string {
  const header = [
    'Data',
    'Horário',
    'Nº do processo',
    'Cliente',
    'Assunto',
    'Comarca',
    'Local',
    'Tipo',
    'Status',
    'Observações',
  ];
  const lines = appointments.map((item) =>
    [
      formatDateShort(item.date),
      formatTimeBR(item.time),
      item.processNumber,
      item.clientName,
      item.subject,
      item.courthouse,
      item.location,
      APPOINTMENT_TYPES.find((type) => type.value === item.type)?.label ?? item.type,
      APPOINTMENT_STATUSES.find((status) => status.value === item.status)?.label ?? item.status,
      item.notes,
    ]
      .map(csvEscape)
      .join(';'),
  );
  return `\uFEFF${[header.join(';'), ...lines].join('\n')}`;
}

export function appointmentsToBackup(appointments: Appointment[]): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), appointments }, null, 2);
}

export async function shareTextFile(fileName: string, contents: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([contents], { type: `${mimeType};charset=utf-8` });
    const uri = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = uri;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(uri);
    return;
  }
  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new Error('Armazenamento indisponível');
  const uri = `${directory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, contents, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Compartilhamento indisponível neste aparelho');
  await Sharing.shareAsync(uri, { mimeType, UTI: mimeType, dialogTitle: fileName });
}

export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  if (Platform.OS === 'web') {
    return fetch(result.assets[0].uri).then((response) => response.text());
  }
  return FileSystem.readAsStringAsync(result.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

export function parseBackupJson(raw: string): Appointment[] {
  const parsed = JSON.parse(raw) as { appointments?: Appointment[] } | Appointment[];
  const list = Array.isArray(parsed) ? parsed : parsed.appointments;
  if (!Array.isArray(list)) throw new Error('Arquivo de cópia inválido.');
  return list.filter((item) => item && typeof item.id === 'string' && item.date && item.time && item.clientName);
}
