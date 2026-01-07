'use strict';

const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 10000;
const MAX_HISTORY = 500;

const sessions = new Map();

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      clients: new Map(),
      messages: [],
      seq: 0
    });
  }
  return sessions.get(sessionId);
}

function pushMessage(session, message) {
  session.messages.push(message);
  if (session.messages.length > MAX_HISTORY) {
    session.messages.splice(0, session.messages.length - MAX_HISTORY);
  }
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname !== '/signal') {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  if (req.method === 'OPTIONS') {
    setCors(res);
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === 'GET') {
    setCors(res);
    const sessionId = (url.searchParams.get('session') || '').trim();
    const clientId = (url.searchParams.get('client') || '').trim();
    const since = Number(url.searchParams.get('since') || 0);
    if (!sessionId) {
      res.statusCode = 400;
      res.end('Missing session');
      return;
    }
    const session = getSession(sessionId);
    const messages = session.messages.filter(msg => {
      if (msg.seq <= since) return false;
      if (msg.to && msg.to !== clientId) return false;
      if (clientId && msg.from === clientId) return false;
      return true;
    });
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(messages));
    return;
  }

  if (req.method === 'POST') {
    setCors(res);
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const message = JSON.parse(body || '{}');
        const sessionId = (message.session || '').trim();
        if (!sessionId) {
          res.statusCode = 400;
          res.end('Missing session');
          return;
        }
        const session = getSession(sessionId);
        message.seq = ++session.seq;
        pushMessage(session, message);
        const payload = JSON.stringify(message);
        session.clients.forEach((client, clientId) => {
          if (message.to && message.to !== clientId) return;
          if (client.readyState === client.OPEN) {
            client.send(payload);
          }
        });
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, seq: message.seq }));
      } catch (error) {
        res.statusCode = 400;
        res.end('Invalid JSON');
      }
    });
    return;
  }

  res.statusCode = 405;
  res.end('Method not allowed');
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname !== '/signal') {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, ws => {
    wss.emit('connection', ws, req, url);
  });
});

wss.on('connection', (ws, req, url) => {
  const sessionId = (url.searchParams.get('session') || '').trim();
  const clientId = (url.searchParams.get('client') || '').trim();
  if (!sessionId || !clientId) {
    ws.close();
    return;
  }
  const session = getSession(sessionId);
  session.clients.set(clientId, ws);

  ws.on('message', data => {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch (_) {
      return;
    }
    message.session = message.session || sessionId;
    message.from = message.from || clientId;
    message.seq = ++session.seq;
    pushMessage(session, message);
    const payload = JSON.stringify(message);
    session.clients.forEach((client, targetId) => {
      if (message.to && message.to !== targetId) return;
      if (targetId === clientId) return;
      if (client.readyState === client.OPEN) {
        client.send(payload);
      }
    });
  });

  ws.on('close', () => {
    session.clients.delete(clientId);
  });
});

server.listen(PORT, () => {
  console.log(`Signaling server listening on ${PORT}`);
});
