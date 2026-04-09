/**
 * tb-media.js
 * WebRTC peer-to-peer video/audio stream management
 */

const tbMedia = {
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  iceCandidatesQueue: [],
  config: {
    iceServers: [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
    ]
  },

  async initLocalStream(audioEnabled = true, videoEnabled = true) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: audioEnabled,
        video: videoEnabled ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
      });
      const localVideo = document.getElementById('local-video');
      const previewVideo = document.getElementById('preview-video');
      if (localVideo) localVideo.srcObject = this.localStream;
      if (previewVideo) previewVideo.srcObject = this.localStream;
      tbLog.log('Local stream initialized', { audio: audioEnabled, video: videoEnabled });
      return this.localStream;
    } catch (err) {
      tbLog.error('Failed to get user media', err);
      throw err;
    }
  },

  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
      tbLog.log('Local stream stopped');
    }
  },

  createPeerConnection() {
    this.peerConnection = new RTCPeerConnection({ iceServers: this.config.iceServers });

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      tbLog.log('Remote track received', { kind: event.track.kind });
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        document.getElementById('remote-video').srcObject = this.remoteStream;
        document.getElementById('no-video-msg').style.display = 'none';
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        tbLog.log('ICE candidate generated');
        tbTransport.sendMessage({ type: 'ice-candidate', candidate: event.candidate });
      }
    };

    // Connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      tbLog.log('Connection state', this.peerConnection.connectionState);
      if (this.peerConnection.connectionState === 'failed') {
        this.peerConnection.restartIce();
      }
    };

    tbLog.log('Peer connection created');
    return this.peerConnection;
  },

  async createOffer() {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    tbLog.log('Offer created');
    return offer;
  },

  async createAnswer() {
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    tbLog.log('Answer created');
    return answer;
  },

  async handleOffer(offer) {
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    tbLog.log('Remote offer set');
  },

  async handleAnswer(answer) {
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    tbLog.log('Remote answer set');
  },

  async addIceCandidate(candidate) {
    try {
      if (this.peerConnection.remoteDescription) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        this.iceCandidatesQueue.push(candidate);
      }
    } catch (err) {
      tbLog.error('ICE candidate error', err);
    }
  },

  flushIceCandidates() {
    while (this.iceCandidatesQueue.length) {
      const candidate = this.iceCandidatesQueue.shift();
      this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(tbLog.error);
    }
  },

  setAudioEnabled(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
      tbLog.log('Audio track', enabled ? 'enabled' : 'disabled');
    }
  },

  setVideoEnabled(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
      tbLog.log('Video track', enabled ? 'enabled' : 'disabled');
    }
  },

  closePeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream = null;
    tbLog.log('Peer connection closed');
  }
};
