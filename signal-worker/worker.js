const MAX_HISTORY = 500;

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
    this.ready = this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get(['seq', 'messages']);
      this.seq = stored.seq || 0;
      this.messages = stored.messages || [];
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
      if (!sessionId) {
        return new Response('Missing session', { status: 400, headers: corsHeaders() });
      }
      this.sessionId = sessionId;
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
      message.seq = ++this.seq;
      this.messages.push(message);
      if (this.messages.length > MAX_HISTORY) {
        this.messages.splice(0, this.messages.length - MAX_HISTORY);
      }
      await this.state.storage.put({ seq: this.seq, messages: this.messages });
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
    data.seq = ++this.seq;
    this.messages.push(data);
    if (this.messages.length > MAX_HISTORY) {
      this.messages.splice(0, this.messages.length - MAX_HISTORY);
    }
    await this.state.storage.put({ seq: this.seq, messages: this.messages });
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
}
