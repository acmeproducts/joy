/**
 * tb-transport.js
 * Signaling and data channel communication
 */

const tbTransport = {
  socket: null,
  dataChannel: null,
  peerId: null,
  partnerId: null,

  connect(signalingServer = 'https://api.talkbridge.io') {
    return new Promise((resolve, reject) => {
      // For demo: use localStorage + polling or WebSocket
      // In production: use actual signaling server
      this.peerId = this.generateId();
      tbLog.log('Peer ID generated', { id: this.peerId.substring(0, 8) });
      resolve();
    });
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
    const roomDataRaw = localStorage.getItem(`room_${roomId}`);
    let encodedPayload = '';

    if (roomDataRaw) {
      try {
        const roomData = JSON.parse(roomDataRaw);
        const shareData = {
          id: roomId,
          name: roomData.name || '',
          myLang: roomData.myLang || 'en',
          theirLang: roomData.theirLang || 'en',
          creator: roomData.creator || ''
        };
        encodedPayload = encodeURIComponent(
          btoa(unescape(encodeURIComponent(JSON.stringify(shareData))))
        );
      } catch (err) {
        tbLog.warn('Failed to encode room payload for URL', { id: roomId });
      }
    }

    return encodedPayload
      ? `${baseUrl}?room=${roomId}&d=${encodedPayload}`
      : `${baseUrl}?room=${roomId}`;
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
      // For signaling messages, use localStorage polling (demo)
      this.storeSignalingMessage(msg);
    }
  },

  storeSignalingMessage(msg) {
    const key = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem(key, JSON.stringify({
      ...msg,
      from: this.peerId,
      timestamp: Date.now()
    }));
  },

  pollSignalingMessages(roomId, callback, interval = 1000) {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('sig_')) {
        const msgStr = localStorage.getItem(key);
        const msg = JSON.parse(msgStr);
        if (msg.from !== this.peerId && !msg.read) {
          callback(msg);
          msg.read = true;
          localStorage.setItem(key, JSON.stringify(msg));
        }
      }
    });
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
