class SpeechService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.voicesLoaded = false;
    
    if (this.synth) {
      this.loadVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  loadVoices() {
    this.voices = this.synth.getVoices();
    this.voicesLoaded = true;
  }

  getVoiceForLanguage(languageCode) {
    if (!this.voicesLoaded || this.voices.length === 0) {
      this.loadVoices();
    }

    const langMap = {
      'es': 'es-ES',
      'de': 'de-DE',
      'en': 'en-US'
    };

    const targetLang = langMap[languageCode] || languageCode;
    
    const voice = this.voices.find(v => v.lang.startsWith(targetLang.split('-')[0]));
    return voice || this.voices[0];
  }

  speak(text, languageCode = 'es') {
    if (!this.synth) {
      console.warn('Speech synthesis not supported');
      return;
    }

    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.getVoiceForLanguage(languageCode);
    
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = languageCode === 'es' ? 'es-ES' : 
                       languageCode === 'de' ? 'de-DE' : 'en-US';
    }
    
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  isSupported() {
    return !!this.synth;
  }
}

const speechService = new SpeechService();
export default speechService;
