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

  connect(signalingServer = 'https://api.talkbridge.io') {
    return new Promise((resolve, reject) => {
      this.peerId = this.generateId();
      sessionStorage.setItem('tb_peerId', this.peerId);
      localStorage.setItem('tb_peerId', this.peerId);
      tbLog.log('Peer ID generated', { id: this.peerId.substring(0, 8) });
      resolve();
    });
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
      // For signaling messages, use localStorage polling (demo)
      this.storeSignalingMessage(msg);
    }
  },

  storeSignalingMessage(msg) {
    const roomId = tbApp.roomId;
    const key = `tb_sig_${roomId}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`;
    const data = {
      ...msg,
      from: this.peerId,
      roomId: roomId,
      timestamp: Date.now(),
      read: false
    };
    sessionStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(key, JSON.stringify(data));
  },

  pollSignalingMessages(roomId, callback) {
    // Check both storages
    const checkStorage = (storage) => {
      const keys = Object.keys(storage);
      keys.forEach(key => {
        if (key.startsWith(`tb_sig_${roomId}_`)) {
          const msgStr = storage.getItem(key);
          if (!msgStr) return;
          
          try {
            const msg = JSON.parse(msgStr);
            if (msg.from !== this.peerId && !msg.read) {
              msg.read = true;
              storage.setItem(key, JSON.stringify(msg));
              callback(msg);
            }
          } catch (e) {}
        }
      });
    };
    
    checkStorage(sessionStorage);
    checkStorage(localStorage);
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
