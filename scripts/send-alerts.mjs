import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const webpush = require('web-push');

const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_ANON_KEY || '';
const vapidPublic = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivate = process.env.VAPID_PRIVATE_KEY || '';
const subject = process.env.VAPID_SUBJECT || 'mailto:wagnermsouza0@gmail.com';
const codes = (process.env.OFFICE_CODES || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

if (!url || !key || !vapidPublic || !vapidPrivate || !codes.length) {
  console.log('Avisos: faltam a nuvem ou os códigos do escritório. Nada enviado.');
  process.exit(0);
}

webpush.setVapidDetails(subject, vapidPublic, vapidPrivate);

function saoPauloNow(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function minutesOf(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(value || '');
  if (!match) return 8 * 60;
  return Number(match[1]) * 60 + Number(match[2]);
}

function parseIso(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || '').slice(0, 10));
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function daysUntil(date, today) {
  const target = parseIso(date);
  const base = parseIso(today);
  if (target == null || base == null) return null;
  return Math.round((target - base) / 86400000);
}

function on(value) {
  return value === undefined || value === null ? true : Boolean(value);
}

function dueItems(appointments, today) {
  const due = [];
  for (const row of appointments || []) {
    if (row.deleted_at) continue;
    const item = row.payload || {};
    const status = item.status || 'agendado';
    if (status !== 'agendado' && status !== 'adiado') continue;
    const diff = daysUntil(item.date, today);
    if (diff == null || diff < 0) continue;
    const kind =
      diff === 0 && on(item.reminderSameDay)
        ? 'same_day'
        : diff === 1 && on(item.reminder1d)
          ? '1d'
          : diff === 7 && on(item.reminder7d)
            ? '7d'
            : diff === 10 && item.reminder10d
              ? '10d'
              : '';
    if (!kind) continue;
    const label =
      kind === 'same_day' ? 'Compromisso hoje' : kind === '1d' ? 'Compromisso amanhã' : kind === '7d' ? 'Compromisso em 7 dias' : 'Compromisso em 10 dias';
    const body = item.clientName
      ? `${item.clientName}${item.courthouse ? ` · ${item.courthouse}` : ''}`
      : 'Você tem um compromisso na agenda.';
    due.push({ id: row.id || item.id, kind, label, body, tag: `${row.id || item.id}:${kind}:${today}` });
  }
  return due.slice(0, 8);
}

async function rpc(name, args) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || `Falha ${response.status}`);
  return data;
}

async function sendOffice(code, clock) {
  const remote = await rpc('pull_office', { p_code: code });
  const devices = (remote.subjects || [])
    .filter((row) => !row.deleted_at && row.payload?.kind === 'push-device' && row.payload.endpoint)
    .map((row) => ({ id: row.id, ...row.payload }));
  const ready = devices.filter((device) => {
    const target = minutesOf(device.alertTime);
    return device.lastSentOn !== clock.day && clock.minutes >= target && clock.minutes < target + 15;
  });
  if (!ready.length) return 0;
  const due = dueItems(remote.appointments, clock.day);
  if (!due.length) return 0;
  let sent = 0;
  const touched = [];
  for (const device of ready) {
    const subscription = {
      endpoint: device.endpoint,
      keys: { p256dh: device.p256dh, auth: device.auth },
    };
    let ok = true;
    for (const alert of due) {
      try {
        await webpush.sendNotification(subscription, JSON.stringify({ title: alert.label, body: alert.body, tag: alert.tag }), {
          TTL: 6 * 60 * 60,
        });
        sent += 1;
      } catch (error) {
        const status = error?.statusCode;
        if (status === 404 || status === 410) ok = false;
      }
    }
    if (ok) {
      touched.push({
        id: device.id,
        payload: { ...device, lastSentOn: clock.day, updatedAt: new Date().toISOString() },
        updated_at: new Date().toISOString(),
        deleted_at: null,
      });
    }
  }
  if (touched.length) {
    await rpc('push_office_items', { p_code: code, p_appointments: [], p_subjects: touched });
  }
  return sent;
}

const clock = saoPauloNow();
let total = 0;
for (const code of codes) {
  try {
    total += await sendOffice(code, clock);
  } catch (error) {
    console.log(`Escritório não enviado: ${error.message}`);
  }
}
console.log(`Avisos enviados: ${total}`);
