const MAX_HISTORY = 2000;
const SNAPSHOT_KEY = 'snapshot';
const HOST_KEY = 'host';
const HOST_UPDATED_AT_KEY = 'hostUpdatedAt';
const LAST_ACTIVITY_KEY = 'lastActivity';
const SESSION_RESUME_WINDOW_MS = 12 * 60 * 1000;
const HOST_STALE_MS = SESSION_RESUME_WINDOW_MS;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/signal') {
      return new Response('Not found', { status: 404 });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    let sessionId = '';
    if (request.method === 'POST') {
      let body;
      try {
        body = await request.clone().json();
      } catch (_) {
        return new Response('Invalid JSON', { status: 400, headers: corsHeaders() });
      }
      sessionId = (body.session || '').trim();
    } else {
      sessionId = (url.searchParams.get('session') || '').trim();
    }

    if (!sessionId) {
      return new Response('Missing session', { status: 400, headers: corsHeaders() });
    }

    const id = env.SIGNAL_SESSION.idFromName(sessionId);
    const stub = env.SIGNAL_SESSION.get(id);
    return stub.fetch(request);
  }
};

export class SignalSession {
  constructor(state) {
    this.state = state;
    this.clients = new Map();
    this.clientIds = new Map();
    this.seq = 0;
    this.messages = [];
    this.sessionId = '';
    this.hostId = null;
    this.hostUpdatedAt = 0;
    this.lastActivity = 0;
    this.ready = this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get(['seq', 'messages', HOST_KEY, HOST_UPDATED_AT_KEY, LAST_ACTIVITY_KEY]);
      this.seq = stored.seq || 0;
      this.messages = stored.messages || [];
      this.hostId = stored[HOST_KEY] || null;
      this.hostUpdatedAt = stored[HOST_UPDATED_AT_KEY] || 0;
      this.lastActivity = stored[LAST_ACTIVITY_KEY] || 0;
    });
  }

  isHostStale(now = Date.now()) {
    if (!this.hostId) return true;
    if (!this.hostUpdatedAt) return true;
    return now - this.hostUpdatedAt > HOST_STALE_MS;
  }

  async claimHost(clientId, now = Date.now()) {
    const stale = this.isHostStale(now);
    if (!this.hostId || stale || this.hostId === clientId) {
      this.hostId = clientId;
      this.hostUpdatedAt = now;
      await this.state.storage.put({
        [HOST_KEY]: this.hostId,
        [HOST_UPDATED_AT_KEY]: this.hostUpdatedAt
      });
      return { granted: true, hostId: this.hostId };
    }
    return { granted: false, hostId: this.hostId };
  }

  async refreshHostActivity(clientId, now = Date.now()) {
    if (!clientId || clientId !== this.hostId) return;
    this.hostUpdatedAt = now;
    await this.state.storage.put({
      [HOST_KEY]: this.hostId,
      [HOST_UPDATED_AT_KEY]: this.hostUpdatedAt
    });
  }

  async ensureSessionActive(now = Date.now()) {
    if (!this.lastActivity) {
      this.lastActivity = now;
      await this.state.storage.put({ [LAST_ACTIVITY_KEY]: this.lastActivity });
      return;
    }
    if (now - this.lastActivity <= SESSION_RESUME_WINDOW_MS) return;
    this.seq = 0;
    this.messages = [];
    this.hostId = null;
    this.hostUpdatedAt = 0;
    this.lastActivity = now;
    await this.state.storage.put({
      seq: this.seq,
      messages: this.messages,
      [HOST_KEY]: this.hostId,
      [HOST_UPDATED_AT_KEY]: this.hostUpdatedAt,
      [LAST_ACTIVITY_KEY]: this.lastActivity
    });
    await this.state.storage.delete(SNAPSHOT_KEY);
  }

  async touchSession(now = Date.now()) {
    this.lastActivity = now;
    await this.state.storage.put({ [LAST_ACTIVITY_KEY]: this.lastActivity });
  }

  attachClient(clientId, socket) {
    const existing = this.clients.get(clientId);
    if (existing && existing !== socket) {
      this.clientIds.delete(existing);
      try {
        existing.close(1012, 'Reattached');
      } catch (_) {
        // ignore close errors
      }
    }
    this.clients.set(clientId, socket);
    this.clientIds.set(socket, clientId);
  }

  async persistAndBroadcast(message, options = {}) {
    const { transient = false, skipSenderId } = options;
    message.seq = ++this.seq;
    await this.touchSession();
    if (!transient) {
      this.messages.push(message);
      if (this.messages.length > MAX_HISTORY) {
        this.messages.splice(0, this.messages.length - MAX_HISTORY);
      }
      await this.state.storage.put({ seq: this.seq, messages: this.messages });
    } else {
      await this.state.storage.put({ seq: this.seq });
    }
    const payload = JSON.stringify(message);
    for (const [clientId, socket] of this.clients.entries()) {
      if (message.to && message.to !== clientId) continue;
      if (skipSenderId && clientId === skipSenderId) continue;
      if (message.from && message.from === clientId) continue;
      try {
        socket.send(payload);
      } catch (_) {
        // ignore send errors
      }
    }
  }

  async fetch(request) {
    await this.ready;
    const now = Date.now();
    await this.ensureSessionActive(now);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.headers.get('Upgrade') === 'websocket') {
      const sessionId = (url.searchParams.get('session') || '').trim();
      const clientId = (url.searchParams.get('client') || '').trim();
      if (!sessionId || !clientId) {
        return new Response('Missing session or client', { status: 400, headers: corsHeaders() });
      }
      this.sessionId = sessionId;
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      this.state.acceptWebSocket(server);
      this.attachClient(clientId, server);
      await this.touchSession(now);
      return new Response(null, { status: 101, webSocket: client });
    }

    if (request.method === 'GET') {
      const sessionId = (url.searchParams.get('session') || '').trim();
      const clientId = (url.searchParams.get('client') || '').trim();
      const since = Number(url.searchParams.get('since') || 0);
      const wantsSnapshot = url.searchParams.get('snapshot') === '1';
      if (!sessionId) {
        return new Response('Missing session', { status: 400, headers: corsHeaders() });
      }
      this.sessionId = sessionId;
      if (wantsSnapshot) {
        const snapshot = await this.state.storage.get(SNAPSHOT_KEY);
        return new Response(JSON.stringify(snapshot || null), {
          status: 200,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
        });
      }
      const messages = this.messages.filter(msg => {
        if (msg.seq <= since) return false;
        if (msg.to && msg.to !== clientId) return false;
        if (clientId && msg.from === clientId) return false;
        return true;
      });
      return new Response(JSON.stringify(messages), {
        status: 200,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'POST') {
      let message;
      try {
        message = await request.json();
      } catch (_) {
        return new Response('Invalid JSON', { status: 400, headers: corsHeaders() });
      }
      const sessionId = (message.session || '').trim();
      if (!sessionId) {
        return new Response('Missing session', { status: 400, headers: corsHeaders() });
      }
      this.sessionId = sessionId;
      message.session = sessionId;
      const isTransient = message.transient === true;
      if (message.type === 'snapshot') {
        await this.state.storage.put(SNAPSHOT_KEY, message);
      }
      const now = Date.now();
      if (message.type === 'host-claim' && message.from) {
        const claim = await this.claimHost(message.from, now);
        await this.persistAndBroadcast({
          session: sessionId,
          type: 'host-ack',
          to: message.from,
          hostId: claim.hostId,
          granted: claim.granted,
          ts: now,
          from: 'server'
        });
      }
      await this.refreshHostActivity(message.from, now);
      await this.persistAndBroadcast(message, { transient: isTransient });
      return new Response(JSON.stringify({ ok: true, seq: message.seq }), {
        status: 200,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
      });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders() });
  }

  async webSocketMessage(ws, message) {
    let data;
    try {
      data = JSON.parse(message);
    } catch (_) {
      return;
    }
    const clientId = this.clientIds.get(ws);
    const sessionId = this.sessionId || data.session;
    if (!clientId || !sessionId) return;
    data.session = data.session || sessionId;
    data.from = data.from || clientId;
    const isTransient = data.transient === true;
    if (data.type === 'snapshot') {
      await this.state.storage.put(SNAPSHOT_KEY, data);
    }
    const now = Date.now();
    await this.ensureSessionActive(now);
    if (data.type === 'reattach') {
      this.attachClient(clientId, ws);
      await this.refreshHostActivity(clientId, now);
      await this.touchSession(now);
      return;
    }
    if (data.type === 'host-claim') {
      const claim = await this.claimHost(clientId, now);
      await this.persistAndBroadcast({
        session: sessionId,
        type: 'host-ack',
        to: clientId,
        hostId: claim.hostId,
        granted: claim.granted,
        ts: now,
        from: 'server'
      });
    }
    await this.refreshHostActivity(clientId, now);
    await this.persistAndBroadcast(data, { transient: isTransient, skipSenderId: clientId });
  }

  webSocketClose(ws) {
    const clientId = this.clientIds.get(ws);
    if (clientId) {
      this.clientIds.delete(ws);
      if (this.clients.get(clientId) === ws) {
        this.clients.delete(clientId);
      }
    }
  }
}
