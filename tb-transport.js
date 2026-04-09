/**
 * tb-transport.js
 * Signaling and data channel communication
 * Room metadata persists across URL/tab changes via dual-write to sessionStorage + localStorage
 */

const tbTransport = {
  socket: null,
  dataChannel: null,
  peerId: null,
  partnerId: null,
  signalingHttpUrl: null,
  signalingWsUrl: null,
  signalingQueue: [],
  signalingBackoffMs: 1000,

  async connect(signalingServer = 'https://api.talkbridge.io') {
    this.peerId = this.generateId();
    sessionStorage.setItem('tb_peerId', this.peerId);
    localStorage.setItem('tb_peerId', this.peerId);
    tbLog.log('Peer ID generated', { id: this.peerId.substring(0, 8) });

    const normalized = String(signalingServer || '').replace(/\/$/, '');
    this.signalingHttpUrl = normalized.endsWith('/signal') ? normalized : `${normalized}/signal`;
    this.signalingWsUrl = this.signalingHttpUrl.replace(/^http/i, 'ws');
    this.signalingQueue = [];

    await this.ensureSignalingChannel();
  },

  generateId() {
    return 'peer_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
  },

  createRoom(roomName = '', myLang = 'en', theirLang = 'en') {
    // Compact room ID: r + base36(timestamp) + random
    const roomId = 'r' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

    const roomData = {
      id: roomId,
      name: roomName || 'Unnamed Room',
      myLang: myLang,
      theirLang: theirLang,
      createdAt: new Date().toISOString(),
      creator: this.peerId,
      initiated: true
    };

    // Dual-write: both sessionStorage and localStorage
    const dataStr = JSON.stringify(roomData);
    sessionStorage.setItem(`tb_room_${roomId}`, dataStr);
    localStorage.setItem(`tb_room_${roomId}`, dataStr);

    tbLog.log('Room created', { id: roomId, name: roomName });
    return roomId;
  },

  persistRoom(roomId) {
    // When joining, ensure room persists in both storages
    const sessionData = sessionStorage.getItem(`tb_room_${roomId}`);
    if (sessionData) {
      localStorage.setItem(`tb_room_${roomId}`, sessionData);
    }
  },

  getRoomData(roomId) {
    // Try sessionStorage first, fall back to localStorage
    let data = sessionStorage.getItem(`tb_room_${roomId}`);
    if (!data) {
      data = localStorage.getItem(`tb_room_${roomId}`);
      if (data) {
        // Persist to sessionStorage for this tab
        sessionStorage.setItem(`tb_room_${roomId}`, data);
      }
    }
    return data ? JSON.parse(data) : null;
  },

  async joinRoom(roomId) {
    const roomData = this.getRoomData(roomId);
    if (!roomData) {
      tbLog.error('Room not found', { id: roomId });
      throw new Error('Room not found');
    }
    this.persistRoom(roomId);
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
    if (!this.signalingWsUrl || !this.peerId) return;

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    if (typeof WebSocket === 'undefined') {
      return;
    }

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
        this.signalingBackoffMs = 1000;
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
      try {
        const msg = JSON.parse(event.data);
        tbApp.onDataChannelMessage(msg);
      } catch (e) {
        tbLog.error('Data channel parse error', e);
      }
    };

    this.dataChannel.onerror = (err) => {
      tbLog.error('Data channel error', err);
    };

    this.dataChannel.onclose = () => {
      tbLog.log('Data channel closed');
    };
  }
};
