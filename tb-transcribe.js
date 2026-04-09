/**
 * tb-transcribe.js
 * Real-time speech recognition with Web Speech API
 * Transcription is continuous and independent of mute state or connection
 */

const tbTranscribe = {
  recognition: null,
  isListening: false,
  interim: '',
  languages: {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ja': 'Japanese',
    'zh': 'Chinese',
    'ko': 'Korean',
    'th': 'Thai',
    'ru': 'Russian',
    'ar': 'Arabic',
    'hi': 'Hindi'
  },
  
  langCodes: {
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
    this.recognition.lang = this.langCodes[myLang] || 'en-US';

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

      // Show interim subtitles
      if (interim) {
        this.showSubtitle(interim, 'mine', true);
      }

      // Process final transcription
      if (final) {
        final = final.trim();
        tbLog.log('Final transcription', { text: final, lang: myLang });
        // Only send if call is active, otherwise just log locally
        if (tbApp.callActive) {
          tbApp.onMyTranscription(final);
        } else {
          // Still add to transcript for CC even without partner
          tbApp.addTranscriptEntry('You', final, final, myLang, myLang);
        }
      }
    };

    this.recognition.onerror = (event) => {
      tbLog.warn('Speech recognition error', event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      tbLog.log('Speech recognition ended');
      // Auto-restart if we should be listening
      if (tbApp.shouldListen) {
        setTimeout(() => this.start(), 1000);
      }
    };

    tbLog.log('Speech recognition initialized', { lang: this.langCodes[myLang] });
    return true;
  },

  setLanguage(lang) {
    if (this.recognition) {
      this.recognition.lang = this.langCodes[lang] || 'en-US';
      tbLog.log('Recognition language set', { lang: this.langCodes[lang] });
    }
  },

  start() {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
      } catch (e) {
        tbLog.warn('Recognition already running');
      }
    }
  },

  stop() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
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
      try {
        this.recognition.stop();
      } catch (e) {}
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
