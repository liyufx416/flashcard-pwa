class SpeechService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.voicesLoaded = false;
    
    // Language mapping for voice selection
    this.languageMap = {
      'es': 'es-ES',
      'es-MX': 'es-MX',
      'es-AR': 'es-AR',
      'fr': 'fr-FR',
      'fr-CA': 'fr-CA',
      'de': 'de-DE',
      'de-AT': 'de-AT',
      'de-CH': 'de-CH',
      'it': 'it-IT',
      'pt': 'pt-PT',
      'pt-BR': 'pt-BR',
      'ru': 'ru-RU',
      'ja': 'ja-JP',
      'zh': 'zh-CN',
      'zh-TW': 'zh-TW',
      'ko': 'ko-KR',
      'ar': 'ar-SA',
      'hi': 'hi-IN',
      'th': 'th-TH',
      'vi': 'vi-VN',
      'nl': 'nl-NL',
      'sv': 'sv-SE',
      'no': 'no-NO',
      'da': 'da-DK',
      'fi': 'fi-FI',
      'pl': 'pl-PL',
      'cs': 'cs-CZ',
      'hu': 'hu-HU',
      'ro': 'ro-RO',
      'bg': 'bg-BG',
      'hr': 'hr-HR',
      'sr': 'sr-RS',
      'sl': 'sl-SI',
      'sk': 'sk-SK',
      'et': 'et-EE',
      'lv': 'lv-LV',
      'lt': 'lt-LT',
      'el': 'el-GR',
      'tr': 'tr-TR',
      'he': 'he-IL',
      'fa': 'fa-IR',
      'ur': 'ur-PK',
      'bn': 'bn-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'ml': 'ml-IN',
      'kn': 'kn-IN',
      'gu': 'gu-IN',
      'pa': 'pa-IN',
      'mr': 'mr-IN',
      'ne': 'ne-NP',
      'si': 'si-LK',
      'my': 'my-MM',
      'km': 'km-KH',
      'lo': 'lo-LA',
      'ka': 'ka-GE',
      'am': 'am-ET',
      'sw': 'sw-KE',
      'zu': 'zu-ZA',
      'af': 'af-ZA',
      'is': 'is-IS',
      'mt': 'mt-MT',
      'cy': 'cy-GB',
      'ga': 'ga-IE',
      'gd': 'gd-GB',
      'eu': 'eu-ES',
      'ca': 'ca-ES',
      'gl': 'gl-ES',
      'ast': 'ast-ES',
      'en': 'en-US',
      'en-GB': 'en-GB',
      'en-AU': 'en-AU',
      'en-CA': 'en-CA',
      'en-IE': 'en-IE',
      'en-ZA': 'en-ZA',
      'en-IN': 'en-IN'
    };
    
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

    const targetLang = this.languageMap[languageCode] || languageCode;
    
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
      utterance.lang = this.languageMap[languageCode] || 'en-US';
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

  // Method to add new language mappings dynamically
  addLanguageMapping(languageCode, localeCode) {
    this.languageMap[languageCode] = localeCode;
  }

  // Method to get all supported language codes
  getSupportedLanguages() {
    return Object.keys(this.languageMap);
  }

  // Method to get full language mapping
  getLanguageMap() {
    return { ...this.languageMap };
  }
}

const speechService = new SpeechService();
export default speechService;
