/**
 * tb-transport.js
 * Signaling and data channel communication
 */

const tbTransport = {
  socket: null,
  dataChannel: null,
  peerId: null,
  partnerId: null,
  signalingHttpUrl: null,
  signalingWsUrl: null,
  signalingQueue: [],

  async connect(signalingServer = 'https://api.talkbridge.io') {
    this.peerId = this.generateId();
    tbLog.log('Peer ID generated', { id: this.peerId.substring(0, 8) });

    const normalized = String(signalingServer || '').replace(/\/$/, '');
    this.signalingHttpUrl = normalized.endsWith('/signal') ? normalized : `${normalized}/signal`;
    this.signalingWsUrl = this.signalingHttpUrl.replace(/^http/i, 'ws');
    this.signalingQueue = [];

    await this.ensureSignalingChannel();
  },

  generateId() {
    return 'peer_' + Math.random().toString(36).substring(2, 15);
  },

  createRoom(roomName = '') {
    const roomId = 'room_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const roomData = {
      id: roomId,
      name: roomName || 'Unnamed Room',
      createdAt: new Date().toISOString(),
      creator: this.peerId
    };
    localStorage.setItem(`room_${roomId}`, JSON.stringify(roomData));
    tbLog.log('Room created', { id: roomId });
    return roomId;
  },

  getRoomUrl(roomId) {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?room=${roomId}`;
  },

  async joinRoom(roomId) {
    const roomData = localStorage.getItem(`room_${roomId}`);
    if (!roomData) {
      tbLog.error('Room not found', { id: roomId });
      throw new Error('Room not found');
    }
    this.partnerId = null;
    tbLog.log('Joined room', { id: roomId });
  },

  sendMessage(msg) {
    // Send via data channel or signaling
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(msg));
      tbLog.log('Data channel message sent', { type: msg.type });
    } else if (msg.type === 'offer' || msg.type === 'answer' || msg.type === 'ice-candidate') {
      this.storeSignalingMessage(msg).catch((err) => {
        tbLog.error('Failed to send signaling message', { type: msg.type, message: err.message });
      });
    }
  },

  async ensureSignalingChannel() {
    if (!this.signalingWsUrl || !this.peerId || typeof WebSocket === 'undefined') return;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;

    await new Promise((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(`${this.signalingWsUrl}?peerId=${encodeURIComponent(this.peerId)}`);

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        try { ws.close(); } catch (_) {}
        reject(new Error('Signaling WebSocket timeout'));
      }, 4000);

      ws.onopen = () => {
        this.socket = ws;
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve();
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (!msg || !msg.roomId || msg.from === this.peerId) return;
          this.signalingQueue.push(msg);
        } catch (_) {}
      };

      ws.onclose = () => {
        if (this.socket === ws) this.socket = null;
      };

      ws.onerror = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(new Error('Signaling WebSocket error'));
        }
      };
    }).catch(() => {
      // HTTP polling fallback path will be used by pollSignalingMessages.
    });
  },

  async storeSignalingMessage(msg) {
    const roomId = tbApp.roomId;
    if (!roomId) {
      throw new Error('Missing roomId for signaling');
    }

    const payload = {
      ...msg,
      from: this.peerId,
      roomId,
      timestamp: Date.now()
    };

    await this.ensureSignalingChannel();

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
      return;
    }

    const res = await fetch(`${this.signalingHttpUrl}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Signaling POST failed (${res.status})`);
    }
  },

  async pollSignalingMessages(roomId, callback) {
    await this.ensureSignalingChannel();

    // Server-side filter requirement: roomId scoped, and excludes sender peerId.
    if ((!this.socket || this.socket.readyState !== WebSocket.OPEN) && this.signalingHttpUrl) {
      const url = `${this.signalingHttpUrl}/messages?roomId=${encodeURIComponent(roomId)}&peerId=${encodeURIComponent(this.peerId)}`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) {
        throw new Error(`Signaling poll failed (${res.status})`);
      }

      const messages = await res.json();
      if (Array.isArray(messages)) {
        messages.forEach((msg) => {
          if (msg && msg.roomId === roomId && msg.from !== this.peerId) {
            this.signalingQueue.push(msg);
          }
        });
      }
    }

    const remaining = [];
    for (const msg of this.signalingQueue) {
      if (msg.roomId !== roomId || msg.from === this.peerId) {
        remaining.push(msg);
        continue;
      }
      callback(msg);
    }
    this.signalingQueue = remaining;
  },

  createDataChannel(label = 'default') {
    if (!tbMedia.peerConnection) return;
    this.dataChannel = tbMedia.peerConnection.createDataChannel(label);
    this.setupDataChannel();
  },

  handleDataChannel(event) {
    this.dataChannel = event.channel;
    this.setupDataChannel();
  },

  setupDataChannel() {
    this.dataChannel.onopen = () => {
      tbLog.log('Data channel opened');
    };

    this.dataChannel.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      tbApp.onDataChannelMessage(msg);
    };

    this.dataChannel.onerror = (err) => {
      tbLog.error('Data channel error', err);
    };

    this.dataChannel.onclose = () => {
      tbLog.log('Data channel closed');
    };
  }
};
