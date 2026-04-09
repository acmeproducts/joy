/**
 * tb-transcribe.js
 * Real-time speech recognition with Web Speech API
 * Transcription is continuous and independent of mute state
 */

const tbTranscribe = {
  recognition: null,
  isListening: false,
  isMuted: false,
  interim: '',
  languages: {
    'en': 'en-US',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'it': 'it-IT',
    'pt': 'pt-BR',
    'ja': 'ja-JP',
    'zh': 'zh-CN',
    'ko': 'ko-KR',
    'th': 'th-TH',
    'ru': 'ru-RU',
    'ar': 'ar-SA',
    'hi': 'hi-IN'
  },

  init(myLang = 'en') {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      tbLog.warn('Speech Recognition not supported');
      return false;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.languages[myLang] || 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      tbLog.log('Speech recognition started');
    };

    this.recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i].transcript;
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      this.interim = interim;

      // Show interim subtitles on local video (mine)
      if (interim) {
        this.showSubtitle(interim, 'mine', true);
      }

      // Send final transcription to partner and transcript log
      if (final) {
        final = final.trim();
        tbLog.log('Final transcription', { text: final, lang: this.recognition.lang });
        tbApp.onMyTranscription(final);
      }
    };

    this.recognition.onerror = (event) => {
      tbLog.warn('Speech recognition error', event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      tbLog.log('Speech recognition ended');
      // Restart if call is still active
      if (tbApp.callActive) {
        setTimeout(() => this.start(), 1000);
      }
    };

    tbLog.log('Speech recognition initialized', { lang: this.recognition.lang });
    return true;
  },

  setLanguage(lang) {
    if (this.recognition) {
      this.recognition.lang = this.languages[lang] || 'en-US';
      tbLog.log('Recognition language set', { lang: this.recognition.lang });
    }
  },

  start() {
    if (this.recognition && !this.isListening) {
      this.recognition.start();
    }
  },

  stop() {
    if (this.recognition) {
      this.recognition.stop();
    }
  },

  showSubtitle(text, speaker = 'mine', interim = false) {
    const area = document.getElementById('subtitle-area');
    if (!area) return;

    // Clear existing subtitles of same speaker
    const existing = area.querySelector(`.subtitle-line.${speaker}`);
    if (existing) existing.remove();

    const line = document.createElement('div');
    line.className = `subtitle-line ${speaker}`;
    line.textContent = text;
    line.style.animation = 'none';
    setTimeout(() => {
      line.style.animation = interim ? '' : 'fadeOut 0.3s ease-out forwards';
    }, interim ? 3000 : 5000);

    area.appendChild(line);

    // Auto-remove after duration
    setTimeout(() => {
      if (line.parentElement) line.remove();
    }, interim ? 3000 : 5000);
  },

  destroy() {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
  }
};

// Add fade-out animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`;
document.head.appendChild(style);
