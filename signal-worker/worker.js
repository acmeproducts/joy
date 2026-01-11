const MAX_HISTORY = 2000;
const SNAPSHOT_KEY = 'snapshot';

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
    this.host = null;
    this.hostUpdatedAt = 0;
    this.approvedClients = new Set();
    this.ready = this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get([
        'seq',
        'messages',
        'host',
        'hostUpdatedAt',
        'approvedClients'
      ]);
      this.seq = stored.seq || 0;
      this.messages = stored.messages || [];
      this.host = stored.host || null;
      this.hostUpdatedAt = stored.hostUpdatedAt || 0;
      this.approvedClients = new Set(stored.approvedClients || []);
    });
  }

  async fetch(request) {
    await this.ready;
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
      this.clients.set(clientId, server);
      this.clientIds.set(server, clientId);
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
        if (!clientId) {
          return new Response('Missing client', { status: 400, headers: corsHeaders() });
        }
        if (!this.isClientApproved(clientId)) {
          return new Response('Join approval required', { status: 403, headers: corsHeaders() });
        }
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
      if (message.type === 'host-claim' && message.from) {
        await this.handleHostClaim(message.from, message.ts || Date.now());
      }
      if (message.type === 'join-accept' || message.type === 'join-deny') {
        await this.handleJoinApproval(message);
      }
      if (this.host && message.from === this.host) {
        this.hostUpdatedAt = message.ts || Date.now();
        await this.state.storage.put({ hostUpdatedAt: this.hostUpdatedAt });
      }
      if (message.type === 'snapshot') {
        await this.state.storage.put(SNAPSHOT_KEY, message);
      }
      message.seq = ++this.seq;
      if (!isTransient) {
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
        if (message.from && message.from === clientId) continue;
        try {
          socket.send(payload);
        } catch (_) {
          // ignore send errors
        }
      }
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
    if (data.type === 'host-claim') {
      await this.handleHostClaim(data.from, data.ts || Date.now());
    }
    if (data.type === 'join-accept' || data.type === 'join-deny') {
      await this.handleJoinApproval(data);
    }
    if (this.host && data.from === this.host) {
      this.hostUpdatedAt = data.ts || Date.now();
      await this.state.storage.put({ hostUpdatedAt: this.hostUpdatedAt });
    }
    if (data.type === 'snapshot') {
      await this.state.storage.put(SNAPSHOT_KEY, data);
    }
    data.seq = ++this.seq;
    if (!isTransient) {
      this.messages.push(data);
      if (this.messages.length > MAX_HISTORY) {
        this.messages.splice(0, this.messages.length - MAX_HISTORY);
      }
      await this.state.storage.put({ seq: this.seq, messages: this.messages });
    } else {
      await this.state.storage.put({ seq: this.seq });
    }
    const payload = JSON.stringify(data);
    for (const [targetId, socket] of this.clients.entries()) {
      if (data.to && data.to !== targetId) continue;
      if (targetId === clientId) continue;
      try {
        socket.send(payload);
      } catch (_) {
        // ignore send errors
      }
    }
  }

  webSocketClose(ws) {
    const clientId = this.clientIds.get(ws);
    if (clientId) {
      this.clients.delete(clientId);
      this.clientIds.delete(ws);
    }
  }

  async handleHostClaim(clientId, ts) {
    const now = ts || Date.now();
    const hostStale = !this.host || (now - this.hostUpdatedAt > 45000);
    if (hostStale || this.host === clientId) {
      this.host = clientId;
      this.hostUpdatedAt = now;
      this.approvedClients.add(clientId);
      await this.state.storage.put({ host: this.host, hostUpdatedAt: this.hostUpdatedAt });
      await this.persistApprovedClients();
    }
    const ack = {
      session: this.sessionId,
      from: 'server',
      to: clientId,
      ts: now,
      type: 'host-ack',
      hostId: this.host,
      granted: this.host === clientId
    };
    ack.seq = ++this.seq;
    this.messages.push(ack);
    if (this.messages.length > MAX_HISTORY) {
      this.messages.splice(0, this.messages.length - MAX_HISTORY);
    }
    await this.state.storage.put({ seq: this.seq, messages: this.messages });
    const payload = JSON.stringify(ack);
    const targetSocket = this.clients.get(clientId);
    if (targetSocket) {
      try {
        targetSocket.send(payload);
      } catch (_) {}
    }
  }

  isClientApproved(clientId) {
    if (!clientId) return false;
    if (this.host && clientId === this.host) return true;
    return this.approvedClients.has(clientId);
  }

  async handleJoinApproval(message) {
    const targetId = (message.to || '').trim();
    if (!targetId) return;
    if (this.host && message.from && message.from !== this.host) return;
    if (message.type === 'join-accept') {
      this.approvedClients.add(targetId);
    } else if (message.type === 'join-deny') {
      this.approvedClients.delete(targetId);
    }
    await this.persistApprovedClients();
  }

  async persistApprovedClients() {
    await this.state.storage.put({ approvedClients: Array.from(this.approvedClients) });
  }
}
