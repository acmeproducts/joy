const PING_INTERVAL_MS = 20000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/connect") {
      return new Response("Bad Request", { status: 400 });
    }

    const upgrade = request.headers.get("Upgrade");
    if (!upgrade || upgrade.toLowerCase() !== "websocket") {
      return new Response("Bad Request", { status: 400 });
    }

    const roomId = env.ROOM.idFromName("shared");
    const room = env.ROOM.get(roomId);
    return room.fetch(request);
  },
};

export class Room {
  constructor(state) {
    this.state = state;
    this.clients = new Map();
    this.pingInterval = null;
  }

  async fetch(request) {
    const upgrade = request.headers.get("Upgrade");
    if (!upgrade || upgrade.toLowerCase() !== "websocket") {
      return new Response("Bad Request", { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();

    this.clients.set(server, { clientId: null, name: null });
    this.updatePresence();
    this.ensurePing();

    server.addEventListener("message", (event) => {
      this.handleMessage(server, event.data);
    });

    const cleanup = () => {
      this.clients.delete(server);
      this.updatePresence();
      this.maybeStopPing();
    };

    server.addEventListener("close", cleanup);
    server.addEventListener("error", cleanup);

    return new Response(null, { status: 101, webSocket: client });
  }

  ensurePing() {
    if (this.pingInterval || this.clients.size === 0) {
      return;
    }

    this.pingInterval = setInterval(() => {
      for (const socket of this.clients.keys()) {
        try {
          socket.send(JSON.stringify({ type: "ping", ts: Date.now() }));
        } catch (error) {
          this.clients.delete(socket);
        }
      }
      this.updatePresence();
      this.maybeStopPing();
    }, PING_INTERVAL_MS);
  }

  maybeStopPing() {
    if (this.clients.size === 0 && this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  updatePresence() {
    const message = JSON.stringify({ type: "presence", count: this.clients.size });
    this.broadcastRaw(message);
  }

  handleMessage(socket, raw) {
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      return;
    }

    if (!payload || typeof payload !== "object") {
      return;
    }

    if (payload.type === "ping") {
      socket.send(JSON.stringify({ type: "pong", ts: Date.now() }));
      return;
    }

    if (payload.type === "pong") {
      return;
    }

    if (payload.type === "hello") {
      const entry = this.clients.get(socket);
      if (entry) {
        entry.clientId = payload.clientId || null;
        entry.name = payload.name || null;
      }
      return;
    }

    if (payload.type === "message") {
      const message = JSON.stringify({
        type: "message",
        clientId: payload.clientId,
        name: payload.name || "Unnamed",
        text: payload.text || "",
        clientMessageId: payload.clientMessageId || null,
        ts: payload.ts || Date.now(),
      });
      this.broadcastRaw(message);
    }
  }

  broadcastRaw(message) {
    for (const socket of this.clients.keys()) {
      try {
        socket.send(message);
      } catch (error) {
        this.clients.delete(socket);
      }
    }
  }
}
