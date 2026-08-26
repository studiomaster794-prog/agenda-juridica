import * as XLSX from 'xlsx';
import type { Appointment, ImportPreview, ImportRow } from '@/types';
import { parseBrazilianDate, parseBrazilianTime, stripAccents } from '@/lib/dates';

function normalizeHeader(value: string): string {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[ºª°]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const HEADER_MAP: Record<string, keyof Pick<
  ImportRow,
  'date' | 'time' | 'processNumber' | 'clientName' | 'subject' | 'courthouse'
>> = {
  data: 'date',
  horario: 'time',
  hora: 'time',
  'n do processo': 'processNumber',
  'no do processo': 'processNumber',
  'numero do processo': 'processNumber',
  processo: 'processNumber',
  cliente: 'clientName',
  nome: 'clientName',
  assunto: 'subject',
  comarca: 'courthouse',
};

function mapHeader(header: string): keyof ImportRow | null {
  const normalized = normalizeHeader(header);
  return HEADER_MAP[normalized] ?? null;
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

export function appointmentDuplicateKey(input: {
  date: string;
  time: string;
  processNumber: string;
  clientName: string;
}): string {
  const process = input.processNumber.trim().toLowerCase();
  const client = stripAccents(input.clientName.trim().toLowerCase());
  if (process) return `${input.date}|${input.time}|${process}`;
  return `${input.date}|${input.time}|${client}`;
}

export function parseSpreadsheetBuffer(buffer: ArrayBuffer | string, existing: Appointment[]): ImportPreview {
  const workbook =
    typeof buffer === 'string'
      ? XLSX.read(buffer, { type: 'string', cellDates: true, codepage: 65001 })
      : XLSX.read(buffer, { type: 'array', cellDates: true, codepage: 65001 });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  });

  const headerIndex = matrix.findIndex((row) =>
    row.some((cell) => {
      const mapped = mapHeader(cellToString(cell));
      return mapped === 'date' || mapped === 'clientName';
    }),
  );

  if (headerIndex < 0) {
    return { total: 0, valid: 0, invalid: 0, duplicates: 0, rows: [] };
  }

  const headers = (matrix[headerIndex] ?? []).map((cell) => mapHeader(cellToString(cell)));
  const existingKeys = new Set(existing.map(appointmentDuplicateKey));
  const seenInFile = new Set<string>();
  const rows: ImportRow[] = [];

  for (let i = headerIndex + 1; i < matrix.length; i += 1) {
    const raw = matrix[i] ?? [];
    const isEmpty = raw.every((cell) => cellToString(cell) === '');
    if (isEmpty) continue;

    const draft: ImportRow = {
      rowNumber: i + 1,
      date: '',
      time: '',
      processNumber: '',
      clientName: '',
      subject: '',
      courthouse: '',
      errors: [],
      isDuplicate: false,
      selected: true,
    };

    headers.forEach((field, columnIndex) => {
      if (!field) return;
      const value = raw[columnIndex];
      if (field === 'date') {
        draft.date = parseBrazilianDate(value) ?? '';
        if (!draft.date && cellToString(value)) draft.errors.push('Data inválida');
      } else if (field === 'time') {
        draft.time = parseBrazilianTime(value) ?? '';
        if (!draft.time && cellToString(value)) draft.errors.push('Horário inválido');
      } else if (field === 'processNumber') {
        draft.processNumber = cellToString(value);
      } else if (field === 'clientName') {
        draft.clientName = cellToString(value);
      } else if (field === 'subject') {
        draft.subject = cellToString(value);
      } else if (field === 'courthouse') {
        draft.courthouse = cellToString(value);
      }
    });

    if (!draft.date) draft.errors.push('Informe a data');
    if (!draft.time) draft.errors.push('Informe o horário');
    if (!draft.clientName) draft.errors.push('Informe o nome do cliente');

    const key = appointmentDuplicateKey(draft);
    if (existingKeys.has(key) || seenInFile.has(key)) {
      draft.isDuplicate = true;
    }
    seenInFile.add(key);

    draft.selected = draft.errors.length === 0 && !draft.isDuplicate;
    rows.push(draft);
  }

  return {
    total: rows.length,
    valid: rows.filter((row) => row.errors.length === 0 && !row.isDuplicate).length,
    invalid: rows.filter((row) => row.errors.length > 0).length,
    duplicates: rows.filter((row) => row.isDuplicate).length,
    rows,
  };
}

export function parseCsvText(text: string, existing: Appointment[]): ImportPreview {
  return parseSpreadsheetBuffer(text, existing);
}
