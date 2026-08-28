const STORAGE_KEY = 'agenda-juridica-pwa-v1';
const APP_VERSION = '1.1.0';

const TYPES = [
  { value: 'audiencia', label: 'Audiência' },
  { value: 'prazo', label: 'Prazo processual' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'atendimento', label: 'Atendimento' },
  { value: 'pessoal', label: 'Compromisso pessoal' },
  { value: 'outro', label: 'Outro' },
];

const STATUSES = [
  { value: 'agendado', label: 'Agendado' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'adiado', label: 'Adiado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const SUBJECTS = [
  { name: 'Trabalhista', color: '#5B7C8A' },
  { name: 'Cível', color: '#4A90C3' },
  { name: 'Consumidor', color: '#3D8B6E' },
  { name: 'Criminal', color: '#C4453C' },
  { name: 'Dr. Samir', color: '#C4A35A' },
  { name: 'Dativo', color: '#8B6BB0' },
];

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const WEEKDAYS_LONG = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

const ONBOARDING = [
  {
    title: 'Organize suas audiências e compromissos.',
    text: 'Data, horário, processo, cliente, assunto e comarca — tudo no mesmo lugar, no computador e no celular.',
  },
  {
    title: 'Avisos 7 dias antes, 1 dia antes e no dia.',
    text: 'Ao abrir o aplicativo, a tela mostra o que precisa de atenção. Se você permitir, o celular também tenta avisar.',
  },
  {
    title: 'Os aparelhos podem ficar iguais.',
    text: 'Em Ajustes, crie um escritório e envie o código. A outra pessoa entra e passa a ver os mesmos processos, mesmo sem internet no momento.',
  },
];

const DEFAULT_SETTINGS = {
  onboardingDone: false,
  notificationsEnabled: true,
  defaultReminder10d: false,
  defaultReminder7d: true,
  defaultReminder1d: true,
  defaultReminderSameDay: true,
  defaultAlertTime: '08:00',
  pinEnabled: false,
  pinHash: '',
  theme: 'automatico',
  notificationPrivacy: 'completa',
};

const state = {
  appointments: [],
  settings: { ...DEFAULT_SETTINGS },
  customSubjects: [],
  shownAlerts: {},
  screen: 'home',
  tab: 'home',
  editingId: null,
  detailId: null,
  calMode: 'mes',
  calMonth: startOfMonth(new Date()),
  selectedDay: todayIso(),
  listPeriod: 'futuros',
  listStatus: 'todos',
  query: '',
  formType: 'audiencia',
  formSubject: '',
  importRows: [],
  pinBuffer: '',
  pinUnlock: '',
  deferredPrompt: null,
  alertTimer: null,
  office: { code: '', lastSyncAt: '', status: '', error: '' },
  tombstones: { appointments: {}, subjects: {} },
  syncing: false,
  pendingOfficeAction: '',
};

let syncTimer = null;

function pad(n) {
  return String(n).padStart(2, '0');
}

function todayIso(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function parseIso(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return null;
  return d;
}

function addDaysIso(date, amount) {
  const d = parseIso(date);
  if (!d) return null;
  d.setDate(d.getDate() + amount);
  return todayIso(d);
}

function daysUntil(date, now = new Date()) {
  const target = parseIso(date);
  if (!target) return 0;
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((b - a) / 86400000);
}

function formatDateShort(date) {
  const d = parseIso(date);
  if (!d) return date || '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatDateLong(date) {
  const d = typeof date === 'string' ? parseIso(date) : date;
  if (!d) return '';
  return `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatMonthYear(date) {
  const label = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatTimeBR(time) {
  const m = /^(\d{2}):(\d{2})$/.exec(time || '');
  if (!m) return time || '';
  const h = Number(m[1]);
  const min = Number(m[2]);
  return min === 0 ? `${h}h` : `${h}h${pad(min)}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function relativeLabel(date, time) {
  const diff = daysUntil(date);
  const t = formatTimeBR(time);
  if (diff === 0) return `Hoje, às ${t}`;
  if (diff === 1) return `Amanhã, às ${t}`;
  if (diff === -1) return 'Ontem';
  if (diff > 1 && diff <= 30) return `Faltam ${diff} dias`;
  if (diff < -1) return `Há ${Math.abs(diff)} dias`;
  return `${formatDateShort(date)}, ${t}`;
}

function urgency(item) {
  if (item.status === 'concluido') return 'done';
  if (item.status === 'cancelado') return 'cancelled';
  const diff = daysUntil(item.date);
  if (diff === 0) return 'today';
  if (diff < 0) return 'past';
  if (diff <= 7) return 'soon';
  return 'future';
}

function typeLabel(type) {
  return TYPES.find((item) => item.value === type)?.label || 'Compromisso';
}

function statusLabel(status) {
  return STATUSES.find((item) => item.value === status)?.label || status;
}

function stripAccents(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    state.appointments = Array.isArray(data.appointments) ? data.appointments : [];
    state.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
    state.customSubjects = Array.isArray(data.customSubjects) ? data.customSubjects : [];
    state.shownAlerts = data.shownAlerts && typeof data.shownAlerts === 'object' ? data.shownAlerts : {};
    if (data.office && typeof data.office === 'object') {
      state.office = {
        code: data.office.code || '',
        lastSyncAt: data.office.lastSyncAt || '',
        status: data.office.status || '',
        error: data.office.error || '',
      };
    }
    if (data.tombstones && typeof data.tombstones === 'object') {
      state.tombstones = {
        appointments: data.tombstones.appointments || {},
        subjects: data.tombstones.subjects || {},
      };
    }
  } catch {
    /* dados locais ilegíveis: começa vazio */
  }
}

function persistLocal() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      appointments: state.appointments,
      settings: state.settings,
      customSubjects: state.customSubjects,
      shownAlerts: state.shownAlerts,
      office: state.office,
      tombstones: state.tombstones,
      version: APP_VERSION,
    }),
  );
}

function save() {
  persistLocal();
  queueSync();
}

function queueSync() {
  if (!state.office.code) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncNow().catch(() => undefined);
  }, 700);
}

function cloudRowsFromLocal(items, tombstones) {
  const rows = (items || []).map((item) => ({
    id: item.id,
    payload: item,
    updated_at: item.updatedAt || new Date().toISOString(),
    deleted_at: null,
  }));
  Object.entries(tombstones || {}).forEach(([id, ts]) => {
    if (rows.some((row) => row.id === id)) return;
    rows.push({
      id,
      payload: {},
      updated_at: ts,
      deleted_at: ts,
    });
  });
  return rows;
}

function applyRemote(remote) {
  const appointments = AgendaCloud.mergeSide(state.appointments, remote.appointments, state.tombstones.appointments);
  const subjects = AgendaCloud.mergeSide(state.customSubjects, remote.subjects, state.tombstones.subjects);
  state.appointments = sortAppointments(appointments.items);
  state.customSubjects = subjects.items.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  state.tombstones = { appointments: appointments.tombstones, subjects: subjects.tombstones };
}

async function syncNow(options = {}) {
  if (!state.office.code || state.syncing) return false;
  if (typeof AgendaCloud === 'undefined' || !AgendaCloud.getConfig().ready) {
    state.office.status = 'error';
    state.office.error = 'A nuvem ainda não foi configurada.';
    persistLocal();
    renderOfficePanel();
    if (options.notify) toast(state.office.error, 'error');
    return false;
  }
  state.syncing = true;
  state.office.status = 'syncing';
  renderOfficePanel();
  try {
    const remote = await AgendaCloud.pullOffice(state.office.code);
    applyRemote(remote);
    await AgendaCloud.pushItems(
      state.office.code,
      cloudRowsFromLocal(state.appointments, state.tombstones.appointments),
      cloudRowsFromLocal(state.customSubjects, state.tombstones.subjects),
    );
    state.office.lastSyncAt = new Date().toISOString();
    state.office.status = 'ok';
    state.office.error = '';
    persistLocal();
    render();
    return true;
  } catch (err) {
    state.office.status = navigator.onLine === false ? 'offline' : 'error';
    state.office.error = err.message || 'Falha na sincronização';
    persistLocal();
    renderOfficePanel();
    if (options.notify) toast(state.office.status === 'offline' ? 'Sem internet. Tentamos de novo quando voltar.' : 'Não foi possível sincronizar agora.', 'error');
    return false;
  } finally {
    state.syncing = false;
    renderOfficePanel();
  }
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const input = document.createElement('textarea');
    input.value = value;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.select();
    const ok = document.execCommand('copy');
    input.remove();
    return ok;
  }
}

function formatSyncTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function officeStatusText() {
  if (!state.office.code) return '';
  if (state.syncing || state.office.status === 'syncing') return 'Sincronizando os aparelhos…';
  if (state.office.status === 'offline') return 'Sem internet. Os dados ficam neste celular até voltar a conexão.';
  if (state.office.status === 'error') return state.office.error || 'Não sincronizou. Toque em Atualizar agora.';
  if (state.office.lastSyncAt) return `Ligados. Última atualização às ${formatSyncTime(state.office.lastSyncAt)}.`;
  return 'Escritório ligado. Toque em Atualizar agora se a outra pessoa já cadastrou algo.';
}

function renderOfficePanel() {
  const connected = Boolean(state.office.code);
  $('#office-off')?.classList.toggle('hidden', connected);
  $('#office-on')?.classList.toggle('hidden', !connected);
  const help = $('#office-help');
  if (help) {
    help.textContent = connected
      ? 'Os aparelhos com este código veem os mesmos processos.'
      : 'Crie um escritório neste celular e entre com o código no outro. Os processos ficam iguais nos dois.';
  }
  if (connected) {
    const label = $('#office-code-label');
    if (label) label.textContent = state.office.code;
    const syncLabel = $('#office-sync-label');
    if (syncLabel) syncLabel.textContent = officeStatusText();
  }
  const home = $('#home-office');
  if (home) {
    if (connected) {
      home.textContent = state.syncing ? 'Sincronizando o escritório…' : `Escritório ${state.office.code}`;
      home.classList.remove('hidden');
    } else {
      home.textContent = '';
      home.classList.add('hidden');
    }
  }
}

async function ensureCloudReady(nextAction) {
  if (typeof AgendaCloud !== 'undefined' && AgendaCloud.getConfig().ready) return true;
  state.pendingOfficeAction = nextAction || '';
  const cfg = typeof AgendaCloud !== 'undefined' ? AgendaCloud.getConfig() : { url: '', key: '' };
  $('#cloud-url').value = cfg.url || '';
  $('#cloud-key').value = cfg.key || '';
  $('#office-cloud-modal').classList.add('show');
  return false;
}

async function createSharedOffice() {
  if (!(await ensureCloudReady('create'))) return;
  try {
    const created = await AgendaCloud.createOffice();
    state.office = { code: created.code, lastSyncAt: '', status: 'syncing', error: '' };
    persistLocal();
    renderOfficePanel();
    const ok = await syncNow({ notify: true });
    $('#office-created-code').textContent = created.code;
    $('#office-created-modal').classList.add('show');
    toast(ok ? 'Escritório criado. Envie o código para o outro celular.' : 'Escritório criado. A sincronização tenta de novo em instantes.');
  } catch (err) {
    toast(err.message || 'Não foi possível criar o escritório.', 'error');
  }
}

async function joinSharedOffice(rawCode) {
  if (!(await ensureCloudReady('join'))) return;
  const code = AgendaCloud.normalizeCode(rawCode);
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    toast('Digite o código no formato ABCD-EFGH.', 'error');
    return;
  }
  try {
    const joined = await AgendaCloud.joinOffice(code);
    state.office = { code: joined.code, lastSyncAt: '', status: 'syncing', error: '' };
    persistLocal();
    const ok = await syncNow({ notify: true });
    $('#office-join-modal').classList.remove('show');
    toast(ok ? 'Aparelhos ligados. Os processos passam a ser os mesmos.' : 'Entrou no escritório. A sincronização tenta de novo em instantes.');
    render();
  } catch (err) {
    toast(err.message === 'Código inválido' ? 'Esse código não existe. Confira com o outro aparelho.' : err.message || 'Não foi possível entrar.', 'error');
  }
}

function allSubjects() {
  return [...SUBJECTS, ...state.customSubjects];
}

function subjectColor(name) {
  const found = allSubjects().find((item) => item.name.toLowerCase() === String(name || '').toLowerCase());
  return found?.color || '#1A3A5C';
}

function sortAppointments(items) {
  return [...items].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}

function activeAppointments() {
  return state.appointments.filter((item) => item.status === 'agendado' || item.status === 'adiado');
}

function applyTheme() {
  const pref = state.settings.theme;
  const dark = pref === 'escuro' || (pref === 'automatico' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0B1220' : '#0C2340');
}

function $(sel, root = document) {
  return root.querySelector(sel);
}

function $all(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

function showScreen(name) {
  state.screen = name;
  $all('[data-screen]').forEach((el) => el.classList.toggle('active', el.dataset.screen === name));
  const tabs = ['home', 'calendar', 'list', 'settings'];
  const showChrome = tabs.includes(name);
  $('#tabbar').classList.toggle('hidden', !showChrome);
  $('#fab').classList.toggle('hidden', !showChrome || name === 'settings');
  $all('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === name || (name === 'home' && tab.dataset.tab === 'home')));
  if (tabs.includes(name)) {
    state.tab = name;
    $all('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === name));
  }
  window.scrollTo(0, 0);
}

function toast(message, tone = 'ok') {
  const el = $('#toast');
  el.textContent = message;
  el.className = `toast show${tone === 'error' ? ' error' : ''}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

function confirmDialog(title, text, yesLabel = 'Excluir') {
  return new Promise((resolve) => {
    $('#confirm-title').textContent = title;
    $('#confirm-text').textContent = text;
    $('#confirm-yes').textContent = yesLabel;
    $('#confirm-modal').classList.add('show');
    const done = (ok) => {
      $('#confirm-modal').classList.remove('show');
      $('#confirm-yes').onclick = null;
      $('#confirm-no').onclick = null;
      resolve(ok);
    };
    $('#confirm-yes').onclick = () => done(true);
    $('#confirm-no').onclick = () => done(false);
  });
}

function appointmentCard(item, compact = false) {
  const tone = urgency(item);
  const accent = `var(--${tone === 'past' ? 'cancelled' : tone})`;
  return `<button class="card appt" type="button" data-open="${escapeHtml(item.id)}">
    <span class="appt-bar" style="background:${subjectColor(item.subject) || accent}"></span>
    <span class="appt-body">
      <span class="appt-top">
        <span class="caption tone-${tone === 'past' ? 'cancelled' : tone}">${escapeHtml(relativeLabel(item.date, item.time))}</span>
        <span class="pill bg-${tone === 'past' ? 'cancelled' : tone}" style="background:color-mix(in srgb, ${accent} 16%, transparent);color:${accent}">${escapeHtml(statusLabel(item.status))}</span>
      </span>
      <strong class="h3">${escapeHtml(item.clientName)}</strong>
      <span class="meta">
        <span>${escapeHtml(formatTimeBR(item.time))}</span>
        ${compact ? '' : `<span>${escapeHtml(formatDateShort(item.date))}</span>`}
        <span>${escapeHtml(item.subject || typeLabel(item.type))}</span>
        ${item.courthouse ? `<span>${escapeHtml(item.courthouse)}</span>` : ''}
      </span>
    </span>
  </button>`;
}

function emptyState(title, subtitle) {
  return `<div class="card empty"><div class="icon">📅</div><div class="h3">${title}</div><p class="caption" style="margin-top:6px">${subtitle}</p></div>`;
}

function isIncomplete(item) {
  return item.status === 'agendado' && (!item.processNumber.trim() || !item.courthouse.trim() || !item.location.trim());
}

function stats() {
  const today = todayIso();
  const active = activeAppointments();
  return {
    today: active.filter((item) => item.date === today).length,
    week: active.filter((item) => {
      const d = daysUntil(item.date);
      return d >= 0 && d <= 7;
    }).length,
    month: active.filter((item) => {
      const d = daysUntil(item.date);
      return d >= 0 && d <= 30;
    }).length,
  };
}

function dueAlerts(now = new Date()) {
  const results = [];
  for (const item of activeAppointments()) {
    const diff = daysUntil(item.date, now);
    const push = (kind, label) => {
      const key = `${item.id}:${kind}:${todayIso(now)}`;
      results.push({ item, kind, label, key, shown: Boolean(state.shownAlerts[key]) });
    };
    if (item.reminderSameDay && diff === 0) push('same_day', `${typeLabel(item.type)} hoje`);
    if (item.reminder1d && diff === 1) push('1d', `${typeLabel(item.type)} amanhã`);
    if (item.reminder7d && diff === 7) push('7d', `${typeLabel(item.type)} daqui a 7 dias`);
    if (item.reminder10d && diff === 10) push('10d', `${typeLabel(item.type)} daqui a 10 dias`);
  }
  return results;
}

function alertBody(item, kind) {
  if (state.settings.notificationPrivacy === 'privada') return 'Você possui um compromisso agendado.';
  if (kind === '1d' || kind === 'same_day') {
    return `${item.clientName} — ${formatTimeBR(item.time)}. Confira o processo e a comarca.`;
  }
  const subject = item.subject ? ` — Assunto: ${item.subject}.` : '.';
  return `Cliente: ${item.clientName} — ${formatDateShort(item.date)} às ${formatTimeBR(item.time)}${subject}`;
}

async function fireBrowserNotification(alert) {
  if (!state.settings.notificationsEnabled) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const title = alert.label;
  const body = alertBody(alert.item, alert.kind);
  const tag = alert.key;
  try {
    const ready = navigator.serviceWorker ? await navigator.serviceWorker.ready.catch(() => null) : null;
    if (ready?.active) {
      ready.active.postMessage({ type: 'notify', title, body, tag });
    } else {
      new Notification(title, { body, icon: './icons/icon-192.png', tag });
    }
  } catch {
    /* notificação do sistema indisponível */
  }
}

function markShown(alerts) {
  alerts.forEach((alert) => {
    state.shownAlerts[alert.key] = true;
  });
  const cutoff = Date.now() - 45 * 86400000;
  for (const key of Object.keys(state.shownAlerts)) {
    const parts = key.split(':');
    const day = parts[parts.length - 1];
    const d = parseIso(day);
    if (d && d.getTime() < cutoff) delete state.shownAlerts[key];
  }
  save();
}

function showAlertModal(alerts) {
  if (!alerts.length) return;
  $('#alert-list').innerHTML = alerts
    .map((alert) => {
      const cls = alert.kind === 'same_day' ? 'alert-today' : alert.kind === '1d' ? 'alert-soon' : 'alert-week';
      return `<div class="alert-banner ${cls}">
        <span class="alert-kicker">${escapeHtml(alert.label)}</span>
        <span class="alert-name">${escapeHtml(alert.item.clientName)}</span>
        <span class="alert-meta">${escapeHtml(relativeLabel(alert.item.date, alert.item.time))}${alert.item.courthouse ? ` · ${escapeHtml(alert.item.courthouse)}` : ''}</span>
      </div>`;
    })
    .join('');
  $('#alert-modal').classList.add('show');
}

async function processAlerts(fromUserOpen = false) {
  const alerts = dueAlerts();
  if (!alerts.length) return;
  const fresh = alerts.filter((alert) => !alert.shown);
  renderHome();
  if (!fresh.length) return;
  if (fromUserOpen) showAlertModal(fresh);
  for (const alert of fresh) await fireBrowserNotification(alert);
  markShown(fresh);
}

function scheduleAlertCheck() {
  clearTimeout(state.alertTimer);
  const [h, m] = (state.settings.defaultAlertTime || '08:00').split(':').map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(h || 8, m || 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  state.alertTimer = setTimeout(() => {
    processAlerts(true);
    scheduleAlertCheck();
  }, Math.min(next.getTime() - now.getTime(), 6 * 60 * 60 * 1000));
}

function renderHome() {
  if (state.screen !== 'home') return;
  $('#home-date').textContent = formatDateLong(new Date());
  $('#home-greet').textContent = greeting();
  const s = stats();
  const today = todayIso();
  const upcoming = sortAppointments(activeAppointments().filter((item) => item.date >= today));
  const next = upcoming[0];
  const attention = upcoming.filter(isIncomplete).slice(0, 5);
  const alerts = dueAlerts();
  const parts = [];

  if (alerts.length) {
    parts.push(`<div class="stack"><h3 class="h3">Avisos</h3>${alerts
      .map((alert) => {
        const cls = alert.kind === 'same_day' ? 'alert-today' : alert.kind === '1d' ? 'alert-soon' : 'alert-week';
        const when = alert.kind === 'same_day' ? 'Hoje' : alert.kind === '1d' ? 'Amanhã' : alert.kind === '7d' ? 'Em 7 dias' : 'Em 10 dias';
        const bits = [formatTimeBR(alert.item.time), alert.item.courthouse, alert.item.processNumber].filter(Boolean);
        return `<div class="alert-banner ${cls}" role="button" tabindex="0" data-open="${escapeHtml(alert.item.id)}">
          <div class="alert-kicker">${escapeHtml(when)}</div>
          <div class="alert-name">${escapeHtml(alert.item.clientName)}</div>
          <div class="alert-meta">${escapeHtml(bits.join(' · '))}</div>
        </div>`;
      })
      .join('')}</div>`);
  }

  const nextAlreadyInAlerts = next && alerts.some((alert) => alert.item.id === next.id);
  if (next && !nextAlreadyInAlerts) {
    parts.push(`<button class="card card-btn" type="button" data-open="${escapeHtml(next.id)}">
      <span class="caption" style="color:var(--gold-deep)">Próximo compromisso</span>
      <span class="h2" style="display:block;margin-top:6px">${escapeHtml(next.clientName)}</span>
      <span class="secondary" style="display:block;margin-top:4px">${escapeHtml(relativeLabel(next.date, next.time))}${next.courthouse ? ` · ${escapeHtml(next.courthouse)}` : ''}</span>
      <span class="meta"><span class="pill" style="background:var(--surface-alt)">${escapeHtml(formatTimeBR(next.time))}</span>${next.subject ? `<span class="pill" style="background:var(--surface-alt)">${escapeHtml(next.subject)}</span>` : ''}</span>
    </button>`);
  } else if (!next) {
    parts.push(emptyState('Nenhum compromisso cadastrado', 'Toque no + para registrar a próxima audiência, prazo ou reunião.'));
  }

  parts.push(`<div class="stats">
    <div class="stat"><div class="caption">Hoje</div><strong class="tone-today">${s.today}</strong></div>
    <div class="stat"><div class="caption">7 dias</div><strong class="tone-soon">${s.week}</strong></div>
    <div class="stat"><div class="caption">30 dias</div><strong class="tone-future">${s.month}</strong></div>
  </div>`);

  if (attention.length) {
    parts.push(`<div class="stack"><h3 class="h3">Precisa de atenção</h3>${attention.map((item) => appointmentCard(item, true)).join('')}</div>`);
  }
  if (upcoming.length) {
    parts.push(`<div class="stack"><h3 class="h3">Próximos compromissos</h3>${upcoming.slice(0, 12).map((item) => appointmentCard(item)).join('')}</div>`);
  }
  $('#home-content').innerHTML = parts.join('');
  maybeShowInstall();
}

function calendarDays(monthDate) {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const begin = new Date(start);
  begin.setDate(1 - start.getDay());
  const last = new Date(end);
  last.setDate(end.getDate() + (6 - end.getDay()));
  const days = [];
  for (let d = new Date(begin); d <= last; d.setDate(d.getDate() + 1)) days.push(new Date(d));
  return days;
}

function renderCalendar() {
  if (state.screen !== 'calendar') return;
  $all('[data-cal-mode]').forEach((btn) => btn.classList.toggle('active', btn.dataset.calMode === state.calMode));
  const selected = state.selectedDay;
  const dayItems = sortAppointments(state.appointments.filter((item) => item.date === selected));
  const monthKey = `${state.calMonth.getFullYear()}-${pad(state.calMonth.getMonth() + 1)}`;
  let html = '';

  if (state.calMode === 'mes') {
    const days = calendarDays(state.calMonth);
    html += `<div class="card"><div class="cal-head">
      <button class="icon-btn" type="button" id="cal-prev" aria-label="Mês anterior">‹</button>
      <div class="h3">${escapeHtml(formatMonthYear(state.calMonth))}</div>
      <button class="icon-btn" type="button" id="cal-next" aria-label="Próximo mês">›</button>
    </div>
    <div class="cal-grid" style="margin-top:8px">
      ${WEEKDAYS.map((d) => `<div class="cal-dow">${d}</div>`).join('')}
      ${days
        .map((day) => {
          const key = todayIso(day);
          const inMonth = day.getMonth() === state.calMonth.getMonth();
          const isToday = key === todayIso();
          const isSel = key === selected;
          const dots = state.appointments
            .filter((item) => item.date === key && item.status !== 'cancelado')
            .slice(0, 3)
            .map((item) => `<i class="dot" style="background:${subjectColor(item.subject)}"></i>`)
            .join('');
          return `<button class="cal-day${inMonth ? '' : ' out'}${isToday ? ' today' : ''}${isSel ? ' selected' : ''}" type="button" data-day="${key}">
            <span>${day.getDate()}</span><span class="dots">${dots}</span>
          </button>`;
        })
        .join('')}
    </div></div>`;
  }

  if (state.calMode === 'semana') {
    const base = parseIso(selected) || new Date();
    const start = new Date(base);
    start.setDate(base.getDate() - base.getDay());
    html += `<div class="week">${Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = todayIso(d);
      const count = state.appointments.filter((item) => item.date === key && item.status !== 'cancelado').length;
      return `<button class="week-day${key === selected ? ' active' : ''}" type="button" data-day="${key}">
        <div class="caption">${WEEKDAYS[i]}</div><div class="h3">${d.getDate()}</div>
        ${count ? '<div class="dot" style="margin:6px auto 0;background:var(--gold)"></div>' : '<div style="height:10px"></div>'}
      </button>`;
    }).join('')}</div>`;
  }

  if (state.calMode === 'lista') {
    const items = sortAppointments(state.appointments.filter((item) => item.date.startsWith(monthKey)));
    html += `<div class="cal-head card" style="margin-bottom:12px">
      <button class="icon-btn" type="button" id="cal-prev">‹</button>
      <div class="h3">${escapeHtml(formatMonthYear(state.calMonth))}</div>
      <button class="icon-btn" type="button" id="cal-next">›</button>
    </div>`;
    html += items.length
      ? `<div class="stack">${items.map((item) => appointmentCard(item)).join('')}</div>`
      : emptyState('Nenhum compromisso neste mês', 'Toque no + para agendar.');
  } else {
    html += `<div class="stack" style="margin-top:16px"><h3 class="h3">${escapeHtml(formatDateLong(selected))}</h3>${
      dayItems.length
        ? dayItems.map((item) => appointmentCard(item)).join('')
        : emptyState('Nenhum compromisso neste dia', 'Toque no + para agendar uma audiência nesta data.')
    }</div>`;
  }

  $('#calendar-wrap').innerHTML = html;
}

function filterList() {
  const query = stripAccents(state.query.trim().toLowerCase());
  const today = todayIso();
  return sortAppointments(
    state.appointments.filter((item) => {
      if (query) {
        const hay = stripAccents(
          [item.clientName, item.processNumber, item.subject, item.courthouse, item.notes, item.location].join(' ').toLowerCase(),
        );
        if (!hay.includes(query)) return false;
      }
      if (state.listStatus !== 'todos' && item.status !== state.listStatus) return false;
      const d = daysUntil(item.date);
      if (state.listPeriod === 'hoje') return item.date === today;
      if (state.listPeriod === '7d') return d >= 0 && d <= 7;
      if (state.listPeriod === 'futuros') return item.date >= today;
      if (state.listPeriod === 'passados') return item.date < today;
      return true;
    }),
  );
}

function renderList() {
  if (state.screen !== 'list') return;
  const periods = [
    ['futuros', 'Futuros'],
    ['hoje', 'Hoje'],
    ['7d', '7 dias'],
    ['todos', 'Todos'],
  ];
  $('#list-chips').innerHTML =
    periods.map(([value, label]) => `<button class="chip${state.listPeriod === value ? ' active' : ''}" type="button" data-period="${value}">${label}</button>`).join('') +
    STATUSES.map(
      (status) =>
        `<button class="chip${state.listStatus === status.value ? ' active' : ''}" type="button" data-status="${status.value}">${status.label}</button>`,
    ).join('');
  const items = filterList();
  $('#list-content').innerHTML = items.length
    ? items.map((item) => appointmentCard(item)).join('')
    : emptyState('Nenhum resultado encontrado', 'Ajuste a busca ou os filtros.');
}

function renderSettings() {
  if (state.screen !== 'settings') return;
  $('#set-notif').checked = state.settings.notificationsEnabled;
  $('#set-7d').checked = state.settings.defaultReminder7d;
  $('#set-1d').checked = state.settings.defaultReminder1d;
  $('#set-same').checked = state.settings.defaultReminderSameDay;
  $('#set-10d').checked = state.settings.defaultReminder10d;
  $('#set-time').value = state.settings.defaultAlertTime || '08:00';
  $('#set-pin-label').textContent = state.settings.pinEnabled ? 'Ativo' : 'Desativado';
  $('#priv-completa').textContent = state.settings.notificationPrivacy === 'completa' ? 'Ativa' : '';
  $('#priv-privada').textContent = state.settings.notificationPrivacy === 'privada' ? 'Ativa' : '';
  $('#th-auto').textContent = state.settings.theme === 'automatico' ? 'Selecionado' : '';
  $('#th-claro').textContent = state.settings.theme === 'claro' ? 'Selecionado' : '';
  $('#th-escuro').textContent = state.settings.theme === 'escuro' ? 'Selecionado' : '';
  renderOfficePanel();
}

function fillForm(item) {
  const form = $('#appt-form');
  form.clientName.value = item?.clientName || '';
  form.date.value = item?.date || state.selectedDay || todayIso();
  form.time.value = item?.time || '09:00';
  form.processNumber.value = item?.processNumber || '';
  form.courthouse.value = item?.courthouse || '';
  form.location.value = item?.location || '';
  form.notes.value = item?.notes || '';
  form.reminder7d.checked = item ? item.reminder7d : state.settings.defaultReminder7d;
  form.reminder1d.checked = item ? item.reminder1d : state.settings.defaultReminder1d;
  form.reminderSameDay.checked = item ? item.reminderSameDay : state.settings.defaultReminderSameDay;
  form.reminder10d.checked = item ? item.reminder10d : state.settings.defaultReminder10d;
  state.formType = item?.type || 'audiencia';
  state.formSubject = item?.subject || '';
  $('#form-title').textContent = item ? 'Editar compromisso' : 'Novo compromisso';
  $('#form-save').textContent = item ? 'Salvar alterações' : 'Salvar compromisso';
  $('#form-alert-time').textContent = state.settings.defaultAlertTime;
  $all('[data-error]').forEach((el) => {
    el.textContent = '';
  });
  renderFormChips();
}

function renderFormChips() {
  $('#form-subjects').innerHTML = allSubjects()
    .map(
      (subject) =>
        `<button class="chip${state.formSubject === subject.name ? ' active' : ''}" type="button" data-subject="${escapeHtml(subject.name)}">${escapeHtml(subject.name)}</button>`,
    )
    .join('');
  $('#form-types').innerHTML = TYPES.map(
    (type) =>
      `<button class="chip${state.formType === type.value ? ' active' : ''}" type="button" data-type="${type.value}">${type.label}</button>`,
  ).join('');
}

function renderDetail() {
  const item = state.appointments.find((appt) => appt.id === state.detailId);
  if (!item) {
    $('#detail-content').innerHTML = emptyState('Compromisso não encontrado', 'Volte à lista e tente de novo.');
    return;
  }
  const reminders = [
    item.reminder7d ? '7 dias antes' : null,
    item.reminder1d ? '1 dia antes' : null,
    item.reminderSameDay ? 'no mesmo dia' : null,
    item.reminder10d ? '10 dias antes' : null,
  ].filter(Boolean);
  $('#detail-content').innerHTML = `
    <div class="card stack">
      <div class="caption" style="color:var(--gold-deep)">${escapeHtml(relativeLabel(item.date, item.time))}</div>
      <h1 class="h1">${escapeHtml(item.clientName)}</h1>
      <p class="secondary">${escapeHtml(formatDateShort(item.date))} · ${escapeHtml(formatTimeBR(item.time))} · ${escapeHtml(statusLabel(item.status))}</p>
    </div>
    <div class="card" style="margin-top:12px">
      ${[
        ['Tipo', typeLabel(item.type)],
        ['Assunto', item.subject || '—'],
        ['Nº do processo', item.processNumber || '—'],
        ['Comarca', item.courthouse || '—'],
        ['Local', item.location || '—'],
        ['Observações', item.notes || '—'],
        ['Lembretes', reminders.join(', ') || 'Nenhum'],
      ]
        .map(([label, value]) => `<div class="info-line"><span>${label}</span><span>${escapeHtml(value)}</span></div>`)
        .join('')}
    </div>
    <div class="stack" style="margin-top:16px">
      ${item.status !== 'concluido' ? '<button class="btn btn-primary" type="button" data-status="concluido">Marcar como concluído</button>' : ''}
      ${item.status === 'agendado' ? '<div class="btn-row"><button class="btn" style="background:var(--warning-soft);color:var(--warning)" type="button" data-status="adiado">Adiar</button><button class="btn" style="background:var(--surface-alt)" type="button" data-status="cancelado">Cancelar</button></div>' : ''}
      <button class="btn btn-danger" type="button" id="detail-delete">Excluir compromisso</button>
    </div>`;
}

function renderSubjects() {
  $('#subject-list').innerHTML = state.customSubjects.length
    ? state.customSubjects
        .map(
          (subject) => `<div class="card row" style="justify-content:space-between">
            <span>${escapeHtml(subject.name)}</span>
            <button class="btn btn-danger" type="button" data-del-subject="${escapeHtml(subject.id)}" style="width:auto">Excluir</button>
          </div>`,
        )
        .join('')
    : '<p class="caption">Nenhum assunto personalizado ainda.</p>';
}

function renderOnboarding(index = 0) {
  state.onbIndex = index;
  const page = ONBOARDING[index];
  $('#onb-title').textContent = page.title;
  $('#onb-text').textContent = page.text;
  $('#onb-dots').innerHTML = ONBOARDING.map((_, i) => `<span class="${i === index ? 'on' : ''}"></span>`).join('');
  $('#onb-next').textContent = index === ONBOARDING.length - 1 ? 'Começar' : 'Continuar';
}

function render() {
  applyTheme();
  renderOfficePanel();
  if (state.screen === 'home') renderHome();
  if (state.screen === 'calendar') renderCalendar();
  if (state.screen === 'list') renderList();
  if (state.screen === 'settings') renderSettings();
  if (state.screen === 'detail') renderDetail();
  if (state.screen === 'subjects') renderSubjects();
  if (state.screen === 'form') renderFormChips();
}

function openForm(id) {
  state.editingId = id || null;
  const item = id ? state.appointments.find((appt) => appt.id === id) : null;
  fillForm(item);
  showScreen('form');
}

function openDetail(id) {
  state.detailId = id;
  showScreen('detail');
  renderDetail();
}

function readForm() {
  const form = $('#appt-form');
  return {
    id: state.editingId || createId(),
    clientName: form.clientName.value.trim(),
    date: form.date.value,
    time: form.time.value,
    processNumber: form.processNumber.value.trim(),
    subject: state.formSubject,
    courthouse: form.courthouse.value.trim(),
    location: form.location.value.trim(),
    notes: form.notes.value.trim(),
    type: state.formType,
    status: state.editingId ? state.appointments.find((item) => item.id === state.editingId)?.status || 'agendado' : 'agendado',
    reminder7d: form.reminder7d.checked,
    reminder1d: form.reminder1d.checked,
    reminderSameDay: form.reminderSameDay.checked,
    reminder10d: form.reminder10d.checked,
    reminderCustom: null,
  };
}

function validate(draft) {
  const errors = {};
  if (!draft.clientName) errors.clientName = 'Informe o nome do cliente ou um título para o compromisso.';
  if (!draft.date || !parseIso(draft.date)) errors.date = 'Escolha uma data válida.';
  if (!draft.time || !/^\d{2}:\d{2}$/.test(draft.time)) errors.time = 'Escolha um horário válido.';
  return errors;
}

function saveAppointment(draft) {
  const now = new Date().toISOString();
  const prev = state.appointments.find((item) => item.id === draft.id);
  const appointment = {
    ...draft,
    createdAt: prev?.createdAt || now,
    updatedAt: now,
  };
  state.appointments = sortAppointments([...state.appointments.filter((item) => item.id !== appointment.id), appointment]);
  Object.keys(state.shownAlerts)
    .filter((key) => key.startsWith(`${appointment.id}:`))
    .forEach((key) => delete state.shownAlerts[key]);
  save();
  processAlerts(false);
  return appointment;
}

function excelSerialToIso(serial) {
  if (!Number.isFinite(serial) || serial < 1) return '';
  const utc = new Date(Math.round((serial - 25569) * 86400 * 1000));
  if (Number.isNaN(utc.getTime())) return '';
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`;
}

function timeFromUnknown(input) {
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return `${pad(input.getHours())}:${pad(input.getMinutes())}`;
  }
  if (typeof input === 'number' && Number.isFinite(input)) {
    const fraction = input >= 1 ? input % 1 : input;
    if (fraction > 0) {
      const totalMinutes = Math.round(fraction * 24 * 60) % (24 * 60);
      return `${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`;
    }
  }
  return '';
}

function parseBrazilianDate(input) {
  if (input === null || input === undefined || input === '') return '';
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    const utcDay = `${input.getUTCFullYear()}-${pad(input.getUTCMonth() + 1)}-${pad(input.getUTCDate())}`;
    const localDay = todayIso(input);
    if (input.getUTCHours() <= 3 && localDay !== utcDay) return utcDay;
    return localDay;
  }
  if (typeof input === 'number' && Number.isFinite(input)) return excelSerialToIso(input);
  const raw = String(input).trim();
  if (!raw) return '';
  if (parseIso(raw)) return raw;
  const isoStamp = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
  if (isoStamp && parseIso(isoStamp[1])) return isoStamp[1];
  const br = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(raw);
  if (!br) return '';
  const day = Number(br[1]);
  const month = Number(br[2]);
  let year = Number(br[3]);
  if (year < 100) year += year >= 50 ? 1900 : 2000;
  const iso = `${year}-${pad(month)}-${pad(day)}`;
  return parseIso(iso) ? iso : '';
}

function parseBrazilianTime(input) {
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return `${pad(input.getHours())}:${pad(input.getMinutes())}`;
  }
  if (typeof input === 'number' && Number.isFinite(input)) {
    const fromSerial = timeFromUnknown(input);
    if (fromSerial) return fromSerial;
    if (input >= 0 && input < 24 && Number.isInteger(input)) return `${pad(input)}:00`;
  }
  const raw = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  if (!raw) return '09:00';
  const h = /^(\d{1,2})h(\d{2})?$/.exec(raw);
  if (h) return `${pad(Number(h[1]))}:${pad(Number(h[2] || 0))}`;
  const c = /^(\d{1,2})[:.](\d{2})/.exec(raw);
  if (c) return `${pad(Number(c[1]))}:${pad(Number(c[2]))}`;
  if (/^\d{1,2}$/.test(raw)) return `${pad(Number(raw))}:00`;
  return /^\d{2}:\d{2}$/.test(raw) ? raw : '';
}

function cellToString(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return todayIso(value);
  return String(value).trim();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    const next = src[i + 1];
    if (q) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ';' || ch === ',') {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows.filter((item) => item.some(Boolean));
}

function mapHeader(value) {
  const n = stripAccents(value)
    .toLowerCase()
    .replace(/[ºª°]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const map = {
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
  return map[n] || null;
}

function duplicateKey(item) {
  const process = item.processNumber.trim().toLowerCase();
  const client = stripAccents(item.clientName.trim().toLowerCase());
  return process ? `${item.date}|${item.time}|${process}` : `${item.date}|${item.time}|${client}`;
}

function previewMatrix(matrix) {
  const headerIndex = matrix.findIndex((row) =>
    (row || []).some((cell) => ['date', 'clientName'].includes(mapHeader(cellToString(cell)))),
  );
  if (headerIndex < 0) return [];
  const headers = (matrix[headerIndex] || []).map((cell) => mapHeader(cellToString(cell)));
  const existing = new Set(state.appointments.map(duplicateKey));
  const seen = new Set();
  const rows = [];
  for (let index = headerIndex + 1; index < matrix.length; index += 1) {
    const cells = matrix[index] || [];
    if (cells.every((cell) => cellToString(cell) === '')) continue;
    const row = {
      rowNumber: index + 1,
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
    headers.forEach((key, i) => {
      if (!key) return;
      const value = cells[i];
      if (key === 'date') {
        row.date = parseBrazilianDate(value);
        const implied = timeFromUnknown(value);
        if (implied && implied !== '00:00') row.time = implied;
      } else if (key === 'time') {
        const parsed = parseBrazilianTime(value);
        if (cellToString(value) !== '' || parsed !== '09:00') row.time = parsed;
      } else {
        row[key] = cellToString(value);
      }
    });
    if (!row.time) row.time = '09:00';
    if (!row.clientName) row.errors.push('Falta o cliente');
    if (!row.date) row.errors.push('Data inválida');
    if (!row.time) row.errors.push('Horário inválido');
    const key = duplicateKey(row);
    row.isDuplicate = existing.has(key) || seen.has(key);
    if (row.isDuplicate) row.errors.push('Duplicado');
    if (!row.errors.length) seen.add(key);
    row.selected = row.errors.length === 0;
    rows.push(row);
  }
  return rows;
}

function previewCsv(text) {
  return previewMatrix(parseCsv(text));
}

function previewExcel(buffer) {
  if (typeof XLSX === 'undefined') return [];
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const workbook = XLSX.read(data, { type: 'array', cellDates: true, raw: true, codepage: 65001 });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: true,
  });
  return previewMatrix(matrix);
}

async function parseImportFile(file) {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt') || file.type === 'text/csv') {
    return previewCsv(await file.text());
  }
  const buffer = await file.arrayBuffer();
  try {
    return previewExcel(buffer);
  } catch {
    try {
      return previewCsv(new TextDecoder('utf-8').decode(buffer));
    } catch {
      return [];
    }
  }
}

function appointmentsToCsv() {
  const header = ['Data', 'Horário', 'Nº do processo', 'Cliente', 'Assunto', 'Comarca', 'Local', 'Tipo', 'Status', 'Observações'];
  const lines = [header.join(';')];
  for (const item of state.appointments) {
    const cells = [
      formatDateShort(item.date),
      formatTimeBR(item.time),
      item.processNumber,
      item.clientName,
      item.subject,
      item.courthouse,
      item.location,
      typeLabel(item.type),
      statusLabel(item.status),
      item.notes,
    ].map((value) => {
      const text = String(value || '');
      return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    });
    lines.push(cells.join(';'));
  }
  return `\uFEFF${lines.join('\n')}`;
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function hashPin(pin) {
  try {
    const data = new TextEncoder().encode(`agenda-juridica:${pin}`);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let hash = 0;
    const text = `agenda-juridica:${pin}`;
    for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    return `fallback-${hash.toString(16)}`;
  }
}

function renderPinDots(value, el = '#pin-dots') {
  $all(`${el} i`).forEach((dot, i) => dot.classList.toggle('on', i < value.length));
}

async function requestNotifications() {
  if (!('Notification' in window)) return false;
  try {
    const perm = await Notification.requestPermission();
    state.settings.notificationsEnabled = perm === 'granted';
    save();
    renderSettings();
    return perm === 'granted';
  } catch {
    return false;
  }
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function maybeShowInstall() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const banner = $('#install-banner');
  if (standalone) {
    banner.classList.remove('show');
    return;
  }
  if (state.deferredPrompt || isIos()) banner.classList.add('show');
}

function startApp() {
  if (!state.settings.onboardingDone) {
    renderOnboarding(0);
    showScreen('onboarding');
    return;
  }
  if (state.settings.pinEnabled && state.settings.pinHash) {
    state.pinUnlock = '';
    renderPinDots('');
    $('#pin-error').classList.add('hidden');
    showScreen('lock');
    return;
  }
  showScreen(state.tab || 'home');
  render();
  processAlerts(true);
  scheduleAlertCheck();
  syncNow().catch(() => undefined);
}

function bind() {
  $all('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      showScreen(tab.dataset.tab);
      render();
    });
  });
  $('#fab').addEventListener('click', () => openForm(null));
  $all('[data-back]').forEach((btn) =>
    btn.addEventListener('click', () => {
      showScreen(state.tab || 'home');
      render();
    }),
  );

  document.addEventListener('click', (event) => {
    const open = event.target.closest('[data-open]');
    if (open) openDetail(open.dataset.open);
    const day = event.target.closest('[data-day]');
    if (day) {
      state.selectedDay = day.dataset.day;
      const d = parseIso(day.dataset.day);
      if (d) state.calMonth = startOfMonth(d);
      renderCalendar();
    }
    const calMode = event.target.closest('[data-cal-mode]');
    if (calMode) {
      state.calMode = calMode.dataset.calMode;
      renderCalendar();
    }
    const period = event.target.closest('[data-period]');
    if (period) {
      state.listPeriod = period.dataset.period;
      renderList();
    }
    const statusChip = event.target.closest('[data-status]');
    if (statusChip && state.screen === 'list') {
      state.listStatus = state.listStatus === statusChip.dataset.status ? 'todos' : statusChip.dataset.status;
      renderList();
    }
    const subject = event.target.closest('[data-subject]');
    if (subject && state.screen === 'form') {
      state.formSubject = state.formSubject === subject.dataset.subject ? '' : subject.dataset.subject;
      renderFormChips();
    }
    const type = event.target.closest('[data-type]');
    if (type && state.screen === 'form') {
      state.formType = type.dataset.type;
      renderFormChips();
    }
    const themePref = event.target.closest('[data-theme-pref]');
    if (themePref) {
      state.settings.theme = themePref.dataset.themePref;
      save();
      render();
    }
    const privacy = event.target.closest('[data-privacy]');
    if (privacy) {
      state.settings.notificationPrivacy = privacy.dataset.privacy;
      save();
      renderSettings();
    }
    const delSub = event.target.closest('[data-del-subject]');
    if (delSub) {
      const subjectId = delSub.dataset.delSubject;
      state.customSubjects = state.customSubjects.filter((item) => item.id !== subjectId);
      state.tombstones.subjects[subjectId] = new Date().toISOString();
      save();
      renderSubjects();
    }
  });

  $('#calendar-wrap').addEventListener('click', (event) => {
    if (event.target.id === 'cal-prev') {
      state.calMonth = new Date(state.calMonth.getFullYear(), state.calMonth.getMonth() - 1, 1);
      renderCalendar();
    }
    if (event.target.id === 'cal-next') {
      state.calMonth = new Date(state.calMonth.getFullYear(), state.calMonth.getMonth() + 1, 1);
      renderCalendar();
    }
  });

  $('#search').addEventListener('input', (event) => {
    state.query = event.target.value;
    renderList();
  });

  $('#onb-next').addEventListener('click', () => {
    if (state.onbIndex < ONBOARDING.length - 1) {
      renderOnboarding(state.onbIndex + 1);
      return;
    }
    state.settings.onboardingDone = true;
    try {
      save();
    } catch {
      /* continua mesmo se o armazenamento local falhar */
    }
    showScreen('home');
    render();
    maybeShowInstall();
    processAlerts(true);
    scheduleAlertCheck();
    requestNotifications().catch(() => undefined);
    syncNow().catch(() => undefined);
  });

  $('#appt-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const draft = readForm();
    const errors = validate(draft);
    $all('[data-error]').forEach((el) => {
      el.textContent = errors[el.dataset.error] || '';
    });
    if (Object.keys(errors).length) return;
    saveAppointment(draft);
    toast(state.editingId ? 'Compromisso atualizado.' : 'Compromisso salvo.');
    showScreen('home');
    render();
  });

  $('#custom-subject').addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const name = event.target.value.trim();
    if (!name) return;
    if (!allSubjects().some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      const now = new Date().toISOString();
      state.customSubjects.push({ id: createId(), name, color: '#8B6BB0', createdAt: now, updatedAt: now });
      save();
    }
    state.formSubject = name;
    event.target.value = '';
    renderFormChips();
  });

  $('#detail-edit').addEventListener('click', () => openForm(state.detailId));
  $('#detail-content').addEventListener('click', async (event) => {
    const item = state.appointments.find((appt) => appt.id === state.detailId);
    if (!item) return;
    const statusBtn = event.target.closest('[data-status]');
    if (statusBtn && state.screen === 'detail') {
      saveAppointment({ ...item, status: statusBtn.dataset.status });
      toast(statusBtn.dataset.status === 'concluido' ? 'Compromisso concluído.' : 'Compromisso atualizado.');
      renderDetail();
      return;
    }
    if (event.target.id === 'detail-delete') {
      const ok = await confirmDialog('Excluir compromisso', `Excluir o compromisso de ${item.clientName}? Esta ação não pode ser desfeita.`);
      if (!ok) return;
      state.appointments = state.appointments.filter((appt) => appt.id !== item.id);
      state.tombstones.appointments[item.id] = new Date().toISOString();
      save();
      toast('Compromisso excluído.');
      showScreen('home');
      render();
    }
  });

  $('#set-notif').addEventListener('change', async (event) => {
    if (event.target.checked) {
      const ok = await requestNotifications();
      event.target.checked = ok;
    } else {
      state.settings.notificationsEnabled = false;
      save();
    }
  });
  $('#set-7d').addEventListener('change', (e) => {
    state.settings.defaultReminder7d = e.target.checked;
    save();
  });
  $('#set-1d').addEventListener('change', (e) => {
    state.settings.defaultReminder1d = e.target.checked;
    save();
  });
  $('#set-same').addEventListener('change', (e) => {
    state.settings.defaultReminderSameDay = e.target.checked;
    save();
  });
  $('#set-10d').addEventListener('change', (e) => {
    state.settings.defaultReminder10d = e.target.checked;
    save();
  });
  $('#set-time').addEventListener('change', (e) => {
    state.settings.defaultAlertTime = e.target.value || '08:00';
    save();
    scheduleAlertCheck();
  });

  $('#set-pin-btn').addEventListener('click', async () => {
    if (state.settings.pinEnabled) {
      const ok = await confirmDialog('Remover PIN', 'Desativar a proteção por PIN neste aparelho?', 'Remover');
      if (!ok) return;
      state.settings.pinEnabled = false;
      state.settings.pinHash = '';
      save();
      renderSettings();
      toast('PIN desativado.');
      return;
    }
    $('#pin-setup-input').value = '';
    $('#pin-setup-title').textContent = 'Criar PIN de 4 dígitos';
    $('#pin-setup-modal').classList.add('show');
  });
  $('#pin-setup-cancel').addEventListener('click', () => $('#pin-setup-modal').classList.remove('show'));
  $('#pin-setup-ok').addEventListener('click', async () => {
    const pin = $('#pin-setup-input').value.trim();
    if (!/^\d{4}$/.test(pin)) {
      toast('Use exatamente 4 números.', 'error');
      return;
    }
    state.settings.pinHash = await hashPin(pin);
    state.settings.pinEnabled = true;
    save();
    $('#pin-setup-modal').classList.remove('show');
    renderSettings();
    toast('PIN ativado.');
  });

  $('#pin-pad').addEventListener('click', async (event) => {
    const key = event.target.dataset.pin;
    if (key == null) return;
    if (key === 'del') state.pinUnlock = state.pinUnlock.slice(0, -1);
    else if (state.pinUnlock.length < 4) state.pinUnlock += key;
    renderPinDots(state.pinUnlock);
    if (state.pinUnlock.length < 4) return;
    const hash = await hashPin(state.pinUnlock);
    if (hash !== state.settings.pinHash) {
      $('#pin-error').classList.remove('hidden');
      state.pinUnlock = '';
      renderPinDots('');
      return;
    }
    $('#pin-error').classList.add('hidden');
    showScreen('home');
    render();
    processAlerts(true);
    scheduleAlertCheck();
    syncNow().catch(() => undefined);
  });

  $('#btn-office-create').addEventListener('click', () => {
    createSharedOffice().catch(() => undefined);
  });
  $('#btn-office-join').addEventListener('click', async () => {
    if (!(await ensureCloudReady('join'))) return;
    $('#office-join-input').value = '';
    $('#office-join-modal').classList.add('show');
    setTimeout(() => $('#office-join-input').focus(), 50);
  });
  $('#office-join-cancel').addEventListener('click', () => $('#office-join-modal').classList.remove('show'));
  $('#office-join-ok').addEventListener('click', () => {
    joinSharedOffice($('#office-join-input').value).catch(() => undefined);
  });
  $('#office-join-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      joinSharedOffice($('#office-join-input').value).catch(() => undefined);
    }
  });
  $('#office-code-row').addEventListener('click', async () => {
    if (!state.office.code) return;
    const ok = await copyText(state.office.code);
    toast(ok ? 'Código copiado. Envie para o outro celular.' : 'Não foi possível copiar. Anote o código na tela.');
  });
  $('#btn-office-sync').addEventListener('click', () => {
    syncNow({ notify: true }).catch(() => undefined);
  });
  $('#btn-office-leave').addEventListener('click', async () => {
    const ok = await confirmDialog(
      'Sair do escritório',
      'Este celular para de receber as atualizações. Os compromissos continuam neste aparelho.',
      'Sair',
    );
    if (!ok) return;
    state.office = { code: '', lastSyncAt: '', status: '', error: '' };
    persistLocal();
    render();
    toast('Este aparelho saiu do escritório.');
  });
  $('#office-created-ok').addEventListener('click', () => $('#office-created-modal').classList.remove('show'));
  $('#office-created-copy').addEventListener('click', async () => {
    if (!state.office.code) return;
    const ok = await copyText(state.office.code);
    toast(ok ? 'Código copiado.' : 'Anote o código na tela.');
  });
  $('#office-copy-sql').addEventListener('click', async () => {
    try {
      const sql = await fetch('./sync.sql').then((res) => {
        if (!res.ok) throw new Error('sql');
        return res.text();
      });
      const ok = await copyText(sql);
      toast(ok ? 'SQL copiado. Cole no SQL Editor do Supabase e clique em Run.' : 'Não foi possível copiar o SQL.');
    } catch {
      toast('Abra o arquivo sync.sql na pasta do aplicativo e copie o texto.', 'error');
    }
  });
  $('#office-cloud-cancel').addEventListener('click', () => {
    state.pendingOfficeAction = '';
    $('#office-cloud-modal').classList.remove('show');
  });
  $('#office-cloud-ok').addEventListener('click', async () => {
    const url = $('#cloud-url').value.trim();
    const key = $('#cloud-key').value.trim();
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url.replace(/\/$/, ''))) {
      toast('Cole o Project URL do Supabase, no formato https://xxxx.supabase.co.', 'error');
      return;
    }
    if (key.length < 20) {
      toast('Cole a chave anon public completa.', 'error');
      return;
    }
    AgendaCloud.setLocalConfig(url.replace(/\/$/, ''), key);
    $('#office-cloud-modal').classList.remove('show');
    const next = state.pendingOfficeAction;
    state.pendingOfficeAction = '';
    if (next === 'create') {
      await createSharedOffice();
    } else if (next === 'join') {
      $('#office-join-input').value = '';
      $('#office-join-modal').classList.add('show');
      setTimeout(() => $('#office-join-input').focus(), 50);
    } else {
      toast('Nuvem ligada neste aparelho.');
    }
  });

  $('#btn-howto').addEventListener('click', () => $('#howto-modal').classList.add('show'));
  $('#howto-ok').addEventListener('click', () => $('#howto-modal').classList.remove('show'));
  $('#alert-ok').addEventListener('click', () => $('#alert-modal').classList.remove('show'));

  $('#btn-subjects').addEventListener('click', () => {
    showScreen('subjects');
    renderSubjects();
  });
  $('#subject-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = $('#subject-name').value.trim();
    if (!name) return;
    const now = new Date().toISOString();
    state.customSubjects.push({ id: createId(), name, color: '#8B6BB0', createdAt: now, updatedAt: now });
    $('#subject-name').value = '';
    save();
    renderSubjects();
    toast('Assunto adicionado.');
  });

  $('#btn-export-csv').addEventListener('click', () => {
    download('agenda-juridica.csv', appointmentsToCsv(), 'text/csv;charset=utf-8');
    toast('CSV pronto.');
  });
  $('#btn-export-json').addEventListener('click', () => {
    download(
      'agenda-juridica-backup.json',
      JSON.stringify(
        {
          appointments: state.appointments,
          customSubjects: state.customSubjects,
          settings: state.settings,
          office: { code: state.office.code },
          tombstones: state.tombstones,
          version: APP_VERSION,
        },
        null,
        2,
      ),
      'application/json',
    );
    toast('Cópia de segurança gerada.');
  });
  $('#btn-import').addEventListener('click', () => $('#file-csv').click());
  $('#btn-import-json').addEventListener('click', () => $('#file-json').click());
  $('#file-csv').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      state.importRows = await parseImportFile(file);
    } catch {
      toast('Não foi possível ler o arquivo. Tente um Excel (.xlsx) ou CSV.', 'error');
      return;
    }
    if (!state.importRows.length) {
      toast('Não encontrei as colunas Data e Cliente. Confira a primeira linha da planilha.', 'error');
      return;
    }
    showScreen('import');
    const valid = state.importRows.filter((row) => row.selected).length;
    $('#import-preview').innerHTML = `
      <div class="card">Encontrados ${state.importRows.length} registros · ${valid} prontos para importar.</div>
      ${state.importRows
        .map(
          (row, i) => `<label class="card row" style="justify-content:space-between">
            <span><strong>${escapeHtml(row.clientName || '(sem cliente)')}</strong><br><span class="caption">${escapeHtml(row.date || '—')} ${escapeHtml(row.time || '')} ${row.errors.length ? ' · ' + escapeHtml(row.errors.join(', ')) : ''}</span></span>
            <input type="checkbox" data-imp="${i}" ${row.selected ? 'checked' : ''} />
          </label>`,
        )
        .join('')}
      <button class="btn btn-primary" type="button" id="import-go">Importar selecionados</button>`;
  });
  $('#import-preview').addEventListener('change', (event) => {
    const box = event.target.closest('[data-imp]');
    if (!box) return;
    const row = state.importRows[Number(box.dataset.imp)];
    if (row) row.selected = box.checked;
  });
  $('#import-preview').addEventListener('click', (event) => {
    if (event.target.id !== 'import-go') return;
    const selected = state.importRows.filter((row) => row.selected && !row.errors.length);
    selected.forEach((row) => {
      saveAppointment({
        id: createId(),
        date: row.date,
        time: row.time || '09:00',
        processNumber: row.processNumber,
        clientName: row.clientName,
        subject: row.subject,
        courthouse: row.courthouse,
        location: '',
        notes: '',
        status: 'agendado',
        type: 'audiencia',
        reminder7d: state.settings.defaultReminder7d,
        reminder1d: state.settings.defaultReminder1d,
        reminderSameDay: state.settings.defaultReminderSameDay,
        reminder10d: state.settings.defaultReminder10d,
        reminderCustom: null,
      });
    });
    toast(selected.length ? `Importação concluída: ${selected.length} compromisso(s).` : 'Nenhuma linha válida selecionada.');
    showScreen('home');
    render();
  });
  $('#file-json').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const items = Array.isArray(data) ? data : data.appointments;
      if (!Array.isArray(items)) throw new Error('invalid');
      const ok = await confirmDialog(
        'Importar cópia de segurança',
        `Isso substitui os ${state.appointments.length} compromissos atuais por ${items.length} registros. Continuar?`,
        'Substituir',
      );
      if (!ok) return;
      state.appointments = sortAppointments(items);
      if (Array.isArray(data.customSubjects)) state.customSubjects = data.customSubjects;
      save();
      toast('Cópia de segurança restaurada.');
      render();
    } catch {
      toast('Arquivo de cópia inválido.', 'error');
    }
  });

  $('#install-btn').addEventListener('click', async () => {
    if (state.deferredPrompt) {
      state.deferredPrompt.prompt();
      await state.deferredPrompt.userChoice;
      state.deferredPrompt = null;
      $('#install-banner').classList.remove('show');
      return;
    }
    $('#howto-modal').classList.add('show');
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.deferredPrompt = event;
    maybeShowInstall();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      processAlerts(true);
      syncNow().catch(() => undefined);
    }
  });
  window.addEventListener('online', () => {
    syncNow().catch(() => undefined);
  });

  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'open-alerts') processAlerts(true);
    });
  }
}

async function registerWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js');
  } catch {
    /* file:// ou ambiente sem SW */
  }
}

load();
applyTheme();
bind();
registerWorker();
startApp();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
setInterval(() => {
  if (document.visibilityState === 'visible') {
    processAlerts(false);
    syncNow().catch(() => undefined);
  }
}, 45 * 1000);
