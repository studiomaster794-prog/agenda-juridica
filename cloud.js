(function (global) {
  const LOCAL_CONFIG_KEY = 'agenda-juridica-cloud-config';
  const FALLBACK = {
    supabaseUrl: 'https://dfbjrpokaspdtjkonubg.supabase.co',
    supabaseAnonKey: 'sb_publishable_FVh5az2pjXg3zF7Hs7iywA_PTBaQaSq',
  };

  function readLocalConfig() {
    try {
      return JSON.parse(global.localStorage.getItem(LOCAL_CONFIG_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function getConfig() {
    const file = global.AGENDA_CLOUD || {};
    const local = readLocalConfig() || {};
    const url = String(file.supabaseUrl || local.supabaseUrl || FALLBACK.supabaseUrl || '').trim();
    const key = String(file.supabaseAnonKey || local.supabaseAnonKey || FALLBACK.supabaseAnonKey || '').trim();
    return {
      url,
      key,
      ready: Boolean(url && key),
      fromFile: Boolean(String(file.supabaseUrl || '').trim() && String(file.supabaseAnonKey || '').trim()),
    };
  }

  function setLocalConfig(url, key) {
    global.localStorage.setItem(
      LOCAL_CONFIG_KEY,
      JSON.stringify({ supabaseUrl: String(url || '').trim(), supabaseAnonKey: String(key || '').trim() }),
    );
  }

  function normalizeCode(value) {
    let normalized = String(value || '')
      .toUpperCase()
      .replace(/[\s–—]/g, '')
      .replace(/[^A-Z0-9-]/g, '');
    if (!normalized.includes('-') && normalized.length === 8) {
      normalized = `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
    }
    return normalized;
  }

  async function rpc(name, args) {
    const { url, key, ready } = getConfig();
    if (!ready) throw new Error('A nuvem ainda não foi configurada.');
    const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args || {}),
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: text };
    }
    if (!res.ok) {
      const raw = data?.message || data?.hint || 'Falha na sincronização';
      let message = String(raw).replace(/^ERROR:\s*/i, '').split('\n')[0];
      if (/argument of NOT must be type boolean/i.test(message) || /type offices/i.test(message)) {
        message = 'Código inválido';
      }
      if (/could not find the function/i.test(message) && /create_office_with_code/i.test(message)) {
        message = 'Atualize o SQL no Supabase para usar o código de 8 dígitos.';
      }
      throw new Error(message || 'Falha na sincronização');
    }
    return data;
  }

  function isDigitCode(value) {
    return /^[0-9]{4}-[0-9]{4}$/.test(normalizeCode(value));
  }

  function generateDigitCode() {
    let digits = '';
    const cryptoObj = global.crypto;
    if (cryptoObj && cryptoObj.getRandomValues) {
      const buf = new Uint8Array(8);
      cryptoObj.getRandomValues(buf);
      digits = Array.from(buf, (n) => n % 10).join('');
    } else {
      for (let i = 0; i < 8; i += 1) digits += String(Math.floor(Math.random() * 10));
    }
    if (/^(\d)\1{7}$/.test(digits)) return generateDigitCode();
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  function createOffice() {
    return rpc('create_office', {});
  }

  function createOfficeWithCode(code) {
    return rpc('create_office_with_code', { p_code: normalizeCode(code) });
  }

  async function joinOffice(code) {
    const normalized = normalizeCode(code);
    await rpc('pull_office', { p_code: normalized });
    return { code: normalized };
  }

  function pullOffice(code) {
    return rpc('pull_office', { p_code: normalizeCode(code) });
  }

  function pushItems(code, appointments, subjects) {
    return rpc('push_office_items', {
      p_code: normalizeCode(code),
      p_appointments: appointments || [],
      p_subjects: subjects || [],
    });
  }

  function mergeSide(localItems, remoteRows, tombstones) {
    const byId = new Map((localItems || []).map((item) => [item.id, item]));
    const tombs = { ...(tombstones || {}) };
    for (const row of remoteRows || []) {
      const id = row.id;
      if (!id) continue;
      const remoteUpdated = row.updated_at || row.payload?.updatedAt || '';
      const local = byId.get(id);
      const localUpdated = local?.updatedAt || tombs[id] || '';
      if (row.deleted_at) {
        if (String(remoteUpdated) >= String(localUpdated)) {
          byId.delete(id);
          tombs[id] = remoteUpdated;
        }
        continue;
      }
      let payload = row.payload;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          payload = null;
        }
      }
      payload = payload && typeof payload === 'object' ? { ...payload } : {};
      payload.id = payload.id || id;
      if (!payload.updatedAt) payload.updatedAt = remoteUpdated;
      if (!local || String(remoteUpdated) > String(localUpdated)) {
        byId.set(id, payload);
        delete tombs[id];
      }
    }
    return { items: [...byId.values()], tombstones: tombs };
  }

  global.AgendaCloud = {
    getConfig,
    setLocalConfig,
    normalizeCode,
    isDigitCode,
    generateDigitCode,
    createOffice,
    createOfficeWithCode,
    joinOffice,
    pullOffice,
    pushItems,
    mergeSide,
  };
})(window);
