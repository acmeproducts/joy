/**
 * tb-app.js
 * Main application orchestration
 * AUTO-ENTER CALL AFTER ROOM CREATION
 * CC TRANSCRIBES IMMEDIATELY
 */

// Global logging system
const tbLog = {
  logs: [],
  maxLogs: 500,

  log(msg, data = {}) {
    const entry = {
      ts: new Date().toLocaleTimeString(),
      type: 'log',
      msg,
      data
    };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs.shift();
    this.render();
  },

  warn(msg, data = {}) {
    const entry = {
      ts: new Date().toLocaleTimeString(),
      type: 'warn',
      msg,
      data
    };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs.shift();
    this.render();
  },

  error(msg, data = {}) {
    const entry = {
      ts: new Date().toLocaleTimeString(),
      type: 'error',
      msg,
      data
    };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs.shift();
    this.render();
  },

  render() {
    const logBody = document.getElementById('log-body');
    if (!logBody) return;
    logBody.innerHTML = this.logs.map(entry => `
      <div class="log-row ${entry.type}">
        <span class="ts">${entry.ts}</span>
        <span class="ev">${entry.msg}</span>
        ${Object.keys(entry.data).length ? '<span style="color:#666"> ' + JSON.stringify(entry.data) + '</span>' : ''}
      </div>
    `).join('');
    logBody.scrollTop = logBody.scrollHeight;
  }
};

const tbApp = {
  myLang: 'en',
  theirLang: 'en',
  myName: 'You',
  roomId: null,
  roomData: null,
  callActive: false,
  transcript: [],
  audioMuted: false,
  videoDisabled: false,
  transcriptTtsEnabled: false,
  shouldListen: false,

  async init() {
    tbLog.log('Initializing TalkBridge');

    // Populate language selects
    this.populateLanguages();

    // Check for room param
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('r');
    const sharedData = params.get('d');

    if (roomId && !tbTransport.getRoomData(roomId) && sharedData) {
      try {
        const decoded = decodeURIComponent(escape(atob(sharedData)));
        const payload = JSON.parse(decoded);
        if (payload?.id === roomId && payload.myLang && payload.theirLang) {
          const roomData = {
            id: roomId,
            name: payload.name || 'Shared Room',
            myLang: payload.myLang,
            theirLang: payload.theirLang,
            createdAt: new Date().toISOString(),
            creator: payload.creator || 'shared-link',
            initiated: true
          };
          const dataStr = JSON.stringify(roomData);
          sessionStorage.setItem(`tb_room_${roomId}`, dataStr);
          localStorage.setItem(`tb_room_${roomId}`, dataStr);
          tbLog.log('Recovered room from share link', { id: roomId });
        }
      } catch (err) {
        tbLog.warn('Invalid share-link room payload', { id: roomId });
      }
    }

    if (roomId) {
      this.joinRoomPhase(roomId);
    } else {
      // Show lobby for room creation
      document.getElementById('lobby').classList.remove('hidden');
    }

    // Enable create button when languages selected
    document.getElementById('my-lang').addEventListener('change', () => this.checkCreateBtn());
    document.getElementById('their-lang').addEventListener('change', () => this.checkCreateBtn());
    this.checkCreateBtn();
  },

  populateLanguages() {
    const langSelect = (id) => document.getElementById(id);
    const mySelect = langSelect('my-lang');
    const theirSelect = langSelect('their-lang');

    Object.entries(tbTranscribe.languages).forEach(([code, name]) => {
      const opt1 = document.createElement('option');
      opt1.value = code;
      opt1.textContent = name;
      mySelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = code;
      opt2.textContent = name;
      theirSelect.appendChild(opt2);
    });

    mySelect.value = 'en';
    theirSelect.value = 'en';
    this.myLang = 'en';
    this.theirLang = 'en';
  },

  checkCreateBtn() {
    const myLang = document.getElementById('my-lang').value;
    const theirLang = document.getElementById('their-lang').value;
    document.getElementById('create-btn').disabled = !myLang || !theirLang;
  },

  async createRoom() {
    this.myLang = document.getElementById('my-lang').value;
    this.theirLang = document.getElementById('their-lang').value;
    const roomName = document.getElementById('room-name').value;

    tbLog.log('Creating room', { name: roomName, langs: `${this.myLang}-${this.theirLang}` });

    try {
      await tbTransport.connect();
      this.roomId = tbTransport.createRoom(roomName, this.myLang, this.theirLang);
      this.roomData = tbTransport.getRoomData(this.roomId);

      // Initialize media
      await tbMedia.initLocalStream(true, true);

      // Update lobby UI to show waiting screen
      document.getElementById('lobby-setup').style.display = 'none';
      document.getElementById('lobby-waiting').style.display = 'block';
      document.getElementById('room-name-display').textContent = roomName || 'Unnamed Room';
      document.getElementById('lobby-link').textContent = this.getShareLink();

      // AUTO-ENTER CALL IMMEDIATELY (no waiting on lobby screen)
      await this.enterCall();

      tbLog.log('Room ready and call started');
    } catch (err) {
      tbLog.error('Failed to create room', err);
      alert('Failed to create room: ' + err.message);
    }
  },

  getShareLink() {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareData = {
      id: this.roomId,
      name: this.roomData?.name || '',
      myLang: this.roomData?.myLang || this.myLang,
      theirLang: this.roomData?.theirLang || this.theirLang,
      creator: this.roomData?.creator || ''
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(shareData))));
    return `${baseUrl}?r=${this.roomId}&d=${encodeURIComponent(encoded)}`;
  },

  async joinRoomPhase(roomId) {
    this.roomId = roomId;
    document.getElementById('lobby').classList.add('hidden');
    document.getElementById('joining-screen').classList.add('show');

    tbLog.log('Joining room', { id: roomId });

    try {
      // Verify room exists
      const roomData = tbTransport.getRoomData(roomId);
      if (!roomData) {
        throw new Error('Room not found');
      }

      this.roomData = roomData;
      // Use room's preset language pair
      this.myLang = roomData.theirLang;
      this.theirLang = roomData.myLang;

      await tbTransport.connect();
      await tbTransport.joinRoom(roomId);

      // Initialize media
      await tbMedia.initLocalStream(true, true);

      // AUTO-ENTER CALL (no language dialog)
      await this.enterCall();

      tbLog.log('Joined room and call started');
    } catch (err) {
      tbLog.error('Failed to join room', err);
      alert('Failed to join room: ' + err.message);
      window.location.href = window.location.pathname;
    }
  },

  async enterCall() {
    // Hide joining screen, show call screen
    document.getElementById('joining-screen').classList.remove('show');
    document.getElementById('lobby').classList.add('hidden');
    document.getElementById('lobby-waiting').style.display = 'none';

    tbLog.log('Entering call', { myLang: this.myLang, theirLang: this.theirLang });

    this.callActive = true;
    document.getElementById('call-screen').classList.add('active');

    try {
      // Create peer connection
      tbMedia.createPeerConnection();

      // Setup data channel
      tbTransport.createDataChannel('messages');
      tbMedia.peerConnection.ondatachannel = (e) => tbTransport.handleDataChannel(e);

      // START TRANSCRIPTION IMMEDIATELY (CC active from start)
      this.startTranscription();

      // If I created the room, wait for partner
      if (this.roomData.creator === tbTransport.peerId) {
        tbLog.log('Waiting for partner to join...');
        this.startSignalingPoll();
        return;
      }

      // I'm the joiner, create offer
      const offer = await tbMedia.createOffer();
      tbTransport.sendMessage({ type: 'offer', offer });
      this.startSignalingPoll();

      tbLog.log('Call started');
    } catch (err) {
      tbLog.error('Failed to start call', err);
      this.hangUp();
    }
  },

  startTranscription() {
    this.shouldListen = true;
    if (tbTranscribe.init(this.myLang)) {
      tbTranscribe.start();
      tbLog.log('Transcription started', { lang: this.myLang });
    }
  },

  startSignalingPoll() {
    // Poll for signaling messages every 500ms
    this.signalingInterval = setInterval(() => {
      tbTransport.pollSignalingMessages(this.roomId, (msg) => {
        this.handleSignalingMessage(msg);
      });
    }, 500);
  },

  async handleSignalingMessage(msg) {
    try {
      if (msg.type === 'offer') {
        tbLog.log('Received offer from partner');
        await tbMedia.handleOffer(msg.offer);
        const answer = await tbMedia.createAnswer();
        tbTransport.sendMessage({ type: 'answer', answer });
      } else if (msg.type === 'answer') {
        tbLog.log('Received answer from partner');
        await tbMedia.handleAnswer(msg.answer);
        tbMedia.flushIceCandidates();
      } else if (msg.type === 'ice-candidate') {
        await tbMedia.addIceCandidate(msg.candidate);
      } else if (msg.type === 'transcription') {
        this.onPartnerTranscription(msg.text, msg.translated);
      }
    } catch (err) {
      tbLog.error('Signaling message error', err);
    }
  },

  onMyTranscription(text) {
    // Translate to partner's language
    tbTranslate.translate(text, this.myLang, this.theirLang).then(translated => {
      // Add to transcript
      this.addTranscriptEntry(this.myName, text, translated, this.myLang, this.theirLang);

      // Send to partner if connected
      if (this.callActive && tbMedia.peerConnection && tbMedia.peerConnection.connectionState === 'connected') {
        tbTransport.sendMessage({
          type: 'transcription',
          speaker: this.myName,
          text,
          translated
        });
      }

      // Show my subtitle (translated view for partner)
      tbTranscribe.showSubtitle(translated, 'mine', false);
    });
  },

  onPartnerTranscription(text, translated) {
    // Show partner's original speech as subtitle
    tbTranscribe.showSubtitle(text, 'partner', false);

    // Add to transcript
    this.addTranscriptEntry('Partner', text, translated, this.theirLang, this.myLang);
  },

  addTranscriptEntry(speaker, original, translated, originalLang, translatedLang) {
    const entry = {
      speaker,
      original,
      translated,
      originalLang: tbTranscribe.languages[originalLang] || originalLang,
      translatedLang: tbTranscribe.languages[translatedLang] || translatedLang,
      timestamp: new Date().toLocaleTimeString()
    };
    this.transcript.push(entry);
    this.renderTranscript();

    tbLog.log('Transcript entry added', { speaker });
  },

  renderTranscript() {
    const body = document.getElementById('transcript-body');
    if (!body) return;

    if (this.transcript.length === 0) {
      body.innerHTML = '<div class="tr-empty">Speak to see transcript here.</div>';
      return;
    }

    body.innerHTML = this.transcript.map((entry) => `
      <div class="tr-entry">
        <div class="tr-bubble">
          <div class="tr-head">
            <span class="tr-who ${entry.speaker === this.myName ? 'mine' : ''}">${entry.speaker}</span>
            <span class="tr-time">${entry.timestamp}</span>
          </div>
          <div class="tr-body">
            <div class="tr-col source">
              <span class="tr-label">${entry.originalLang}</span>
              <span class="tr-text">${entry.original}</span>
            </div>
            <div class="tr-divider"></div>
            <div class="tr-col">
              <span class="tr-label">${entry.translatedLang}</span>
              <span class="tr-text">${entry.translated}</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    body.scrollTop = body.scrollHeight;
  },

  onDataChannelMessage(msg) {
    if (msg.type === 'transcription') {
      this.onPartnerTranscription(msg.text, msg.translated);
    }
  },

  hangUp() {
    tbLog.log('Call ended');
    this.callActive = false;

    // Clean up
    if (this.signalingInterval) clearInterval(this.signalingInterval);
    tbTranscribe.stop();
    tbMedia.closePeerConnection();
    tbMedia.stopLocalStream();

    // Reset to lobby
    document.getElementById('call-screen').classList.remove('active');
    document.getElementById('lobby').classList.remove('hidden');
    document.getElementById('lobby-setup').style.display = 'block';
    document.getElementById('lobby-waiting').style.display = 'none';
    document.getElementById('subtitle-area').innerHTML = '';
    this.transcript = [];
    this.renderTranscript();
    this.shouldListen = false;
  }
};

// UI Functions
function createRoom() {
  tbApp.createRoom();
}

function backToSetup() {
  tbApp.shouldListen = false;
  tbTranscribe.stop();
  if (tbMedia.localStream) {
    tbMedia.stopLocalStream();
  }
  document.getElementById('lobby-setup').style.display = 'block';
  document.getElementById('lobby-waiting').style.display = 'none';
}

function copyLink() {
  const link = tbApp.getShareLink();
  navigator.clipboard.writeText(link);
  showToast('Link copied');
}

function shareLink() {
  const link = tbApp.getShareLink();
  if (navigator.share) {
    navigator.share({ 
      title: 'TalkBridge', 
      text: 'Join my call on TalkBridge', 
      url: link 
    });
  } else {
    copyLink();
  }
}

function toggleMic() {
  tbApp.audioMuted = !tbApp.audioMuted;
  tbMedia.setAudioEnabled(!tbApp.audioMuted);
  document.getElementById('mic-btn').classList.toggle('off', tbApp.audioMuted);
  document.getElementById('mic-on').style.display = tbApp.audioMuted ? 'none' : 'block';
  document.getElementById('mic-off').style.display = tbApp.audioMuted ? 'block' : 'none';
  showToast(tbApp.audioMuted ? 'Microphone muted' : 'Microphone unmuted');
}

function toggleCam() {
  tbApp.videoDisabled = !tbApp.videoDisabled;
  tbMedia.setVideoEnabled(!tbApp.videoDisabled);
  document.getElementById('cam-btn').classList.toggle('off', tbApp.videoDisabled);
  document.getElementById('cam-on').style.display = tbApp.videoDisabled ? 'none' : 'block';
  document.getElementById('cam-off').style.display = tbApp.videoDisabled ? 'block' : 'none';
  showToast(tbApp.videoDisabled ? 'Camera off' : 'Camera on');
}

function hangUp() {
  tbApp.hangUp();
}

function toggleTranscript() {
  document.getElementById('call-screen').classList.toggle('transcript-collapsed');
}

function toggleTranscriptTts() {
  tbApp.transcriptTtsEnabled = !tbApp.transcriptTtsEnabled;
  document.getElementById('transcript-tts-toggle').setAttribute('aria-pressed', tbApp.transcriptTtsEnabled);
  showToast(tbApp.transcriptTtsEnabled ? 'TTS enabled' : 'TTS disabled');
}

function copyTr() {
  let text = '';
  tbApp.transcript.forEach(entry => {
    text += `[${entry.timestamp}] ${entry.speaker}\n`;
    text += `${entry.originalLang}: ${entry.original}\n`;
    text += `${entry.translatedLang}: ${entry.translated}\n\n`;
  });
  navigator.clipboard.writeText(text);
  showToast('Transcript copied');
}

function exportTxt() {
  let text = 'TalkBridge Transcript\n';
  text += `Generated: ${new Date().toLocaleString()}\n`;
  text += `Room: ${tbApp.roomId}\n\n`;
  text += '='.repeat(50) + '\n\n';

  tbApp.transcript.forEach(entry => {
    text += `[${entry.timestamp}] ${entry.speaker}\n`;
    text += `${entry.originalLang}: ${entry.original}\n`;
    text += `${entry.translatedLang}: ${entry.translated}\n\n`;
  });

  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `talkbridge-${tbApp.roomId}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function copyRoomTr() {
  copyTr();
}

function closeRoomTr() {
  document.getElementById('room-tr-overlay').classList.remove('show');
}

function openLog() {
  document.getElementById('log-overlay').classList.add('show');
}

function closeLog() {
  document.getElementById('log-overlay').classList.remove('show');
}

function copyLogText() {
  const text = tbLog.logs.map(l => `${l.ts} [${l.type}] ${l.msg}`).join('\n');
  navigator.clipboard.writeText(text);
  showToast('Log copied');
}

function clearLogText() {
  tbLog.logs = [];
  tbLog.render();
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => tbApp.init());
