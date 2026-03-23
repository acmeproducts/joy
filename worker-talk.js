/**
 * talk-signal — generic multi-app WebSocket relay
 * Uses Cloudflare Durable Objects with WebSocket Hibernation API.
 *
 * Session isolation: every session is namespaced as "appName::sessionId"
 * so talk-say-v1 sessions and camper sessions can never collide,
 * even if they share the same session ID string.
 *
 * URL contract (WebSocket):
 *   wss://talk-signal.myacctfortracking.workers.dev/signal
 *     ?app=talk-say-v1
 *     &session=<sessionId>
 *     &client=<clientId>
 *
 * URL contract (HTTP GET backfill):
 *   https://talk-signal.myacctfortracking.workers.dev/signal
 *     ?app=talk-say-v1
 *     &session=<sessionId>
 *     &client=<clientId>
 *     &since=<seq>
 */

const MAX_HISTORY    = 500;
const SESSION_TTL_MS = 12 * 60 * 1000;

const TRANSIENT_TYPES = new Set([
  'hello', 'ping', 'pong', 'typing', 'reattach', 'ack'
]);

function cors() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(), 'Content-Type': 'application/json' },
  });
}

function err(msg, status = 400) {
  return new Response(msg, { status, headers: cors() });
}

// ── Worker entry point ────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== '/signal') {
      return new Response('Not found', { status: 404, headers: cors() });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors() });
    }

    const app       = (url.searchParams.get('app')     || '').trim().slice(0, 64);
    const sessionId = (url.searchParams.get('session') || '').trim().slice(0, 128);

    if (!app)       return err('Missing app');
    if (!sessionId) return err('Missing session');

    // Full isolation: app::sessionId is the DO name
    const doName = `${app}::${sessionId}`;
    const id     = env.TALK_SESSION.idFromName(doName);
    const stub   = env.TALK_SESSION.get(id);

    return stub.fetch(request);
  },
};

// ── Durable Object ────────────────────────────────────────────────────────────
export class TalkSession {
  constructor(state, env) {
    this.state = state;
    this.env   = env;

    this.seq          = 0;
    this.messages     = [];
    this.lastActivity = 0;

    // Restore in-memory state from storage after hibernation
    this.ready = this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get(['seq', 'messages', 'lastActivity']);
      this.seq          = Number(stored.get('seq'))          || 0;
      this.messages     = stored.get('messages')             || [];
      this.lastActivity = Number(stored.get('lastActivity')) || 0;
    });
  }

  async _touchSession() {
    const now = Date.now();
    if (this.lastActivity && (now - this.lastActivity) > SESSION_TTL_MS) {
      this.seq      = 0;
      this.messages = [];
      await this.state.storage.put({ seq: 0, messages: [], lastActivity: now });
    } else {
      this.lastActivity = now;
      await this.state.storage.put({ lastActivity: now });
    }
  }

  async _persist(msg) {
    msg.seq = ++this.seq;
    this.messages.push(msg);
    if (this.messages.length > MAX_HISTORY) {
      this.messages = this.messages.slice(-MAX_HISTORY);
    }
    await this.state.storage.put({ seq: this.seq, messages: this.messages });
  }

  _broadcast(payload, skipClientId) {
    const text = JSON.stringify(payload);
    for (const ws of this.state.getWebSockets()) {
      const tag = ws.deserializeAttachment();
      if (tag && tag.clientId === skipClientId) continue;
      try { ws.send(text); } catch (_) {}
    }
  }

  async fetch(request) {
    await this.ready;
    await this._touchSession();

    const url      = new URL(request.url);
    const clientId = (url.searchParams.get('client') || '').trim();

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      if (!clientId) return err('Missing client', 400);

      const pair   = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];

      // Hibernation API — keeps DO alive across CF sleep cycles
      this.state.acceptWebSocket(server);
      server.serializeAttachment({ clientId });

      return new Response(null, { status: 101, webSocket: client });
    }

    // HTTP GET — backfill
    if (request.method === 'GET') {
      const since = Number(url.searchParams.get('since') || 0);
      const msgs  = this.messages.filter(m => {
        if (m.seq <= since) return false;
        if (m.to && m.to !== clientId) return false;
        if (clientId && m.from === clientId) return false;
        return true;
      });
      return json(msgs);
    }

    return err('Method not allowed', 405);
  }

  async webSocketMessage(ws, raw) {
    await this.ready;

    let msg;
    try { msg = JSON.parse(raw); } catch (_) { return; }

    if (!msg || !msg.type) return;

    const tag      = ws.deserializeAttachment() || {};
    const clientId = tag.clientId || msg.from || '';

    msg.from = msg.from || clientId;
    msg.ts   = msg.ts   || Date.now();

    const isTransient = msg.transient === true || TRANSIENT_TYPES.has(msg.type);

    await this._touchSession();

    if (!isTransient) {
      await this._persist(msg);
    } else {
      this.seq++;
      await this.state.storage.put({ seq: this.seq });
    }

    this._broadcast(msg, clientId);
  }

  async webSocketClose(ws, code, reason) {
    // Hibernation API manages socket lifecycle.
    // Client sends explicit 'leave' message before closing — no action needed here.
  }

  async webSocketError(ws, error) {
    try { ws.close(1011, 'error'); } catch (_) {}
  }
}
