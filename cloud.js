(function (global) {
  const LOCAL_CONFIG_KEY = 'agenda-juridica-cloud-config';

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
    const url = String(file.supabaseUrl || local.supabaseUrl || '').trim();
    const key = String(file.supabaseAnonKey || local.supabaseAnonKey || '').trim();
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
      const message = String(raw).replace(/^ERROR:\s*/i, '').split('\n')[0];
      throw new Error(message || 'Falha na sincronização');
    }
    return data;
  }

  function createOffice() {
    return rpc('create_office', {});
  }

  function joinOffice(code) {
    return rpc('join_office', { p_code: normalizeCode(code) });
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
      const payload = row.payload && typeof row.payload === 'object' ? { ...row.payload } : {};
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
    createOffice,
    joinOffice,
    pullOffice,
    pushItems,
    mergeSide,
  };
})(window);
