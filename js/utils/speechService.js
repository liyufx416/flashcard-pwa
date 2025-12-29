class SpeechService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.voicesLoaded = false;
    this.voiceLoadPromise = null;
    this.useResponsiveVoice = false;
    this.responsiveVoiceLoaded = false;
    this.apiKey = null;
    this.scriptLoaded = false;
    this.responsiveVoiceTemporarilyUnavailable = false;
    
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

    // ResponsiveVoice language mapping
    this.responsiveVoiceMap = {
      'es': 'Spanish Female',
      'es-MX': 'Spanish Latin American Female',
      'es-AR': 'Spanish Latin American Female',
      'fr': 'French Female',
      'fr-CA': 'French Canadian Female',
      'de': 'Deustch Female',
      'de-AT': 'Deustch Female',
      'de-CH': 'Deustch Female',
      'it': 'Italian Female',
      'pt': 'Portuguese Female',
      'pt-BR': 'Portuguese Brazilian Female',
      'pt-PT': 'Portuguese Female',
      'ru': 'Russian Female',
      'ja': 'Japanese Female',
      'zh': 'Chinese Female',
      'zh-CN': 'Chinese Female',
      'zh-TW': 'Chinese Female',
      'ko': 'Korean Female',
      'ar': 'Arabic Female',
      'hi': 'Hindi Female',
      'th': 'Thai Female',
      'vi': 'Vietnamese Female',
      'nl': 'Dutch Female',
      'sv': 'Swedish Female',
      'no': 'Norwegian Female',
      'da': 'Danish Female',
      'fi': 'Finnish Female',
      'pl': 'Polish Female',
      'cs': 'Czech Female',
      'hu': 'Hungarian Female',
      'ro': 'Romanian Female',
      'bg': 'Bulgarian Female',
      'hr': 'Croatian Female',
      'sr': 'Serbian Female',
      'sl': 'Slovenian Female',
      'sk': 'Slovak Female',
      'et': 'Estonian Female',
      'lv': 'Latvian Female',
      'lt': 'Lithuanian Female',
      'el': 'Greek Female',
      'tr': 'Turkish Female',
      'he': 'Hebrew Female',
      'fa': 'Persian Female',
      'ur': 'Urdu Female',
      'bn': 'Bengali Female',
      'ta': 'Tamil Female',
      'te': 'Telugu Female',
      'ml': 'Malayalam Female',
      'kn': 'Kannada Female',
      'gu': 'Gujarati Female',
      'pa': 'Punjabi Female',
      'mr': 'Marathi Female',
      'ne': 'Nepali Female',
      'si': 'Sinhala Female',
      'my': 'Myanmar Female',
      'km': 'Khmer Female',
      'lo': 'Lao Female',
      'ka': 'Georgian Female',
      'am': 'Amharic Female',
      'sw': 'Swahili Female',
      'zu': 'Zulu Female',
      'af': 'Afrikaans Female',
      'is': 'Icelandic Female',
      'mt': 'Maltese Female',
      'cy': 'Welsh Female',
      'ga': 'Irish Female',
      'gd': 'Scottish Gaelic Female',
      'eu': 'Basque Female',
      'ca': 'Catalan Female',
      'gl': 'Galician Female',
      'en': 'US English Female',
      'en-GB': 'UK English Female',
      'en-AU': 'Australian Female',
      'en-CA': 'Canadian Female',
      'en-IE': 'Irish Female',
      'en-ZA': 'South African Female',
      'en-IN': 'Indian English Female'
    };

    this.init();
  }

  init() {
    // Load API key from localStorage
    this.apiKey = localStorage.getItem('responsiveVoiceApiKey') || null;
    this.useResponsiveVoice = !!this.apiKey;
    
    console.log('SpeechService init - API key found:', !!this.apiKey);
    console.log('SpeechService init - useResponsiveVoice:', this.useResponsiveVoice);
    
    if (this.synth) {
      this.voiceLoadPromise = this.waitForVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }

    // Load ResponsiveVoice if API key is available
    if (this.useResponsiveVoice) {
      console.log('Loading ResponsiveVoice with API key...');
      this.responsiveVoicePromise = this.loadResponsiveVoiceWithKey().catch(error => {
        console.warn('ResponsiveVoice temporarily unavailable:', error.message);
        this.responsiveVoiceLoaded = false;
        this.responsiveVoiceTemporarilyUnavailable = true;
        // Don't clear the API key - it's still configured, just temporarily unavailable
      });
    } else {
      console.log('No API key found, ResponsiveVoice will not be loaded');
      this.responsiveVoicePromise = Promise.resolve();
    }
  }

  async waitForVoices() {
    return new Promise((resolve) => {
      const checkVoices = () => {
        const voices = this.synth.getVoices();
        if (voices.length > 0) {
          this.voices = voices;
          this.voicesLoaded = true;
          console.log('Voices loaded:', voices.length, 'voices available');
          resolve(voices);
        } else {
          setTimeout(checkVoices, 100);
        }
      };
      checkVoices();
    });
  }

  loadVoices() {
    this.voices = this.synth.getVoices();
    this.voicesLoaded = true;
  }

  async loadResponsiveVoiceWithKey(forceReload = false) {
    console.log(`loadResponsiveVoiceWithKey called - forceReload: ${forceReload}`);
    
    if (!this.apiKey) {
      console.error('No API key available for ResponsiveVoice');
      throw new Error('No API key available for ResponsiveVoice');
    }

    // If script is already loaded and not forcing reload, just check status
    if (this.scriptLoaded && !forceReload) {
      console.log('Script already loaded and not forcing reload, checking status...');
      if (typeof responsiveVoice !== 'undefined') {
        this.responsiveVoiceLoaded = true;
        console.log('ResponsiveVoice already available');
        return;
      }
    }

    // Remove existing script if forcing reload
    if (forceReload) {
      console.log('Force reload requested, removing existing script...');
      window.location.reload();
    }

    return new Promise((resolve, reject) => {
      // Create and inject the script
      const script = document.createElement('script');
      script.src = `https://code.responsivevoice.org/responsivevoice.js?key=${this.apiKey}`;
      script.async = true;
      script.id = 'responsivevoice-script'; // Add ID for easy removal
      
      script.onload = () => {
        this.scriptLoaded = true;
        
        // Wait for responsiveVoice to be available
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds timeout
        
        const checkResponsiveVoice = () => {
          attempts++;
          
          if (typeof responsiveVoice !== 'undefined') {
            this.responsiveVoiceLoaded = true;
            console.log('ResponsiveVoice loaded successfully');
            console.log('Available methods:', Object.keys(responsiveVoice));
            resolve();
          } else if (attempts < maxAttempts) {
            setTimeout(checkResponsiveVoice, 100);
          } else {
            console.error('ResponsiveVoice failed to initialize after script load');
            reject(new Error('ResponsiveVoice failed to initialize - invalid API key or network error'));
          }
        };
        checkResponsiveVoice();
      };
      
      script.onerror = () => {
        console.error('Failed to load ResponsiveVoice script');
        reject(new Error('Failed to load ResponsiveVoice script - check network connection'));
      };
      
      document.head.appendChild(script);
    });
  }

  // Test ResponsiveVoice API key
  async testResponsiveVoiceKey(apiKey) {
    console.log(`Testing ResponsiveVoice API key...`);
    try {
      // Test speaking with ResponsiveVoice
      await this.speakWithResponsiveVoice('This sentence is read by ResponsiveVoice', 'en');
      
      console.log('ResponsiveVoice API key test successful');
      return true;
    } catch (error) {
      console.error('ResponsiveVoice API key test failed:', error);
      throw error;
    }
  }

  getVoiceForLanguage(languageCode) {
    if (!this.voicesLoaded || this.voices.length === 0) {
      this.loadVoices();
    }

    const targetLang = this.languageMap[languageCode] || languageCode;
    
    // Try exact match first
    let voice = this.voices.find(v => v.lang === targetLang);
    
    // If no exact match, try prefix match
    if (!voice) {
      const langPrefix = targetLang.split('-')[0];
      voice = this.voices.find(v => v.lang.startsWith(langPrefix));
    }
    
    // If still no match, try the original language code
    if (!voice) {
      voice = this.voices.find(v => v.lang.startsWith(languageCode));
    }
    
    return voice || this.voices[0];
  }

  // Check if a language is supported by local voices
  isLanguageSupportedLocally(languageCode) {
    if (!this.voicesLoaded || this.voices.length === 0) {
      return false;
    }

    const targetLang = this.languageMap[languageCode] || languageCode;
    
    // Check exact match
    if (this.voices.some(v => v.lang === targetLang)) {
      return true;
    }
    
    // Check prefix match
    const langPrefix = targetLang.split('-')[0];
    if (this.voices.some(v => v.lang.startsWith(langPrefix))) {
      return true;
    }
    
    // Check original language code
    if (this.voices.some(v => v.lang.startsWith(languageCode))) {
      return true;
    }
    
    return false;
  }

  // ResponsiveVoice TTS fallback
  async speakWithResponsiveVoice(text, languageCode) {
    console.log(`speakWithResponsiveVoice() called with text: "${text}", language: ${languageCode}`);
    
    if (!this.useResponsiveVoice || !this.responsiveVoiceLoaded) {
      console.error('ResponsiveVoice not available or not loaded');
      throw new Error('ResponsiveVoice not available or not loaded');
    }

    const responsiveVoiceName = this.responsiveVoiceMap[languageCode] || 'US English Female';
    console.log(`Using ResponsiveVoice voice: ${responsiveVoiceName}`);
    console.log('responsiveVoice object available:', typeof responsiveVoice !== 'undefined');
    
    return new Promise((resolve, reject) => {
      try {
        console.log('Calling responsiveVoice.speak()...');
        responsiveVoice.speak(text, responsiveVoiceName, {
          onstart: () => console.log('ResponsiveVoice started speaking'),
          onend: () => {
            console.log('ResponsiveVoice finished speaking');
            resolve();
          },
          onerror: (error) => {
            console.error('ResponsiveVoice error:', error);
            reject(new Error('ResponsiveVoice error: ' + error));
          }
        });
      } catch (error) {
        console.error('ResponsiveVoice failed with exception:', error);
        reject(new Error('ResponsiveVoice failed: ' + error.message));
      }
    });
  }

  async speak(text, languageCode = 'es') {
    console.log(`speak() called with text: "${text}", language: ${languageCode}`);
    
    if (!this.synth) {
      console.warn('Speech synthesis not supported');
      return 'local';
    }
    
    // Wait for voices to be loaded
    if (!this.voicesLoaded) {
      console.log('Waiting for local voices to load...');
      await this.voiceLoadPromise;
    }

    // PREFER ResponsiveVoice when configured and working
    if (this.useResponsiveVoice) {
      console.log('ResponsiveVoice is configured, waiting for it to load...');
      // Wait for ResponsiveVoice to be loaded
      await this.responsiveVoicePromise;
      
      if (this.responsiveVoiceLoaded) {
        console.log('ResponsiveVoice loaded, attempting to speak...');
        try {
          await this.speakWithResponsiveVoice(text, languageCode);
          console.log('ResponsiveVoice speech completed successfully');
          return 'responsive';
        } catch (error) {
          console.warn('ResponsiveVoice failed, falling back to local voice:', error.message);
          // Continue to local voice fallback
        }
      } else {
        console.warn('ResponsiveVoice temporarily unavailable, falling back to local voice');
        // Continue to local voice fallback
      }
    }
    
    // Check if language is supported locally
    const localSupport = this.isLanguageSupportedLocally(languageCode);
    console.log(`Local support for ${languageCode}:`, localSupport);
    
    if (!localSupport) {
      console.log(`Language ${languageCode} not supported locally and ResponsiveVoice unavailable`);
      
      if (!this.useResponsiveVoice) {
        console.log('ResponsiveVoice not configured, showing prompt dialog...');
        // Show dialog to get API key or suggest local voice installation
        const shouldRetry = await this.promptForApiKey(languageCode, false);
        if (shouldRetry) {
          console.log('User provided API key, retrying speech...');
          // Wait a moment for the new ResponsiveVoice to be fully loaded
          if (this.responsiveVoicePromise) {
            await this.responsiveVoicePromise;
          }
          // Retry speaking with the newly configured API key
          return await this.speak(text, languageCode);
        }
      }
      
      // If we get here, neither ResponsiveVoice nor local voice is available
      console.warn('No speech synthesis available for this language');
      return 'local';
    }
    
    // Use local speech synthesis
    console.log('Using local speech synthesis...');
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.getVoiceForLanguage(languageCode);
    
    console.log('Selected voice:', voice ? voice.name : 'default');
    
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = this.languageMap[languageCode] || 'en-US';
    }
    
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    console.log('Speaking with local synthesis...');
    this.synth.speak(utterance);
    return 'local';
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

  // Prompt user for API key when fallback is needed
  async promptForApiKey(languageCode, isReconfiguration = false) {
    return new Promise((resolve) => {
      // Create modal dialog
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      `;

      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: white;
        padding: 2rem;
        padding-top: 1rem;
        border-radius: 8px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        position: relative;
      `;

      const languageName = this.getLanguageName(languageCode);
      const hasExistingKey = !!this.apiKey;
      const backupKey = localStorage.getItem('responsiveVoiceApiKey_backup');
      
      let title, message, option2Text, placeholder, saveText;
      
      if (isReconfiguration) {
        title = 'Configure ResponsiveVoice';
        message = `Configure ResponsiveVoice for <strong>${languageName}</strong> speech synthesis.`;
        option2Text = hasExistingKey ? 
          `Replace ResponsiveVoice API Key (current: ***${this.apiKey.slice(-4)})` : 
          `Enter ResponsiveVoice API Key`;
        placeholder = hasExistingKey ? 'Enter new API key (optional)' : 'Enter ResponsiveVoice API Key';
        saveText = hasExistingKey ? 'Update API Key' : 'Save API Key';
      } else {
        title = 'Voice Support Needed';
        message = `Your browser doesn't have local voice support for <strong>${languageName}</strong>. You have two options:`;
        option2Text = 'Use ResponsiveVoice';
        placeholder = 'Enter ResponsiveVoice API Key';
        saveText = 'Save & Retry';
      }
      
      dialog.innerHTML = `
        <button id="close-btn" style="position: absolute; top: 0.5rem; right: 0.5rem; background: none; border: none; font-size: 1.5rem; color: #666; cursor: pointer; padding: 0.25rem; line-height: 1;">×</button>
        <h3 style="margin-top: 0; color: #333;">${title}</h3>
        <p style="color: #666; line-height: 1.5;">
          ${message}
        </p>
        <div style="margin: 1rem 0;">
          <h4 style="margin-bottom: 0.5rem; color: #333;">Option 1: Install Local Voice Package</h4>
          <p style="color: #666; font-size: 0.9rem; margin-top: 0.25rem;">
            Install the ${languageName} voice package through your operating system's language settings.
          </p>
        </div>
        <div style="margin: 1rem 0;">
          <h4 style="margin-bottom: 0.5rem; color: #333;">Option 2: ${option2Text}</h4>
          <p style="color: #666; font-size: 0.9rem; margin-top: 0.25rem;">
            ${isReconfiguration ? 'Enter a new API key to reconfigure ResponsiveVoice, or leave empty to keep existing key.' : 
                'Enter your ResponsiveVoice API key to get high-quality ' + languageName + ' speech synthesis.'}
          </p>
          <p style="color: #666; font-size: 0.9rem; margin-top: 0.25rem;">
            <b>After you reconfigure the API Key the application will reload.</b>
          </p>
          <input type="password" id="api-key-input" placeholder="${placeholder}" 
                   style="width: 100%; padding: 0.5rem; margin: 0.5rem 0; border: 1px solid #ddd; border-radius: 4px; color: black;">
          ${hasExistingKey ? `<div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;"><small style="color: #666; flex: 1;">Current key: ***${this.apiKey.slice(-4)}</small><button class="copy-key-btn" data-key="${this.apiKey}" style="background: none; border: none; color: #666; cursor: pointer; padding: 0.25rem; display: flex; align-items: center;" title="Copy full API key"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg></button></div>` : ''}
          ${!hasExistingKey && backupKey ? `<div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;"><small style="color: #666; flex: 1;">Backup key available: ***${backupKey.slice(-4)}</small><button class="copy-key-btn" data-key="${backupKey}" style="background: none; border: none; color: #666; cursor: pointer; padding: 0.25rem; display: flex; align-items: center;" title="Copy full API key"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg></button></div>` : ''}
        </div>
        <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
          <button id="clear-btn" style="flex: 1; padding: 0.5rem 1rem; border: 1px solid #ddd; background: #6c757d; color: white; border-radius: 4px; cursor: pointer;">Clear API Key</button>
          <button id="save-btn" style="flex: 1; padding: 0.5rem 1rem; border: none; background: #007bff; color: white; border-radius: 4px; cursor: pointer;">${saveText}</button>
        </div>
      `;

      modal.appendChild(dialog);
      document.body.appendChild(modal);

      const apiKeyInput = dialog.querySelector('#api-key-input');
      const closeBtn = dialog.querySelector('#close-btn');
      const clearBtn = dialog.querySelector('#clear-btn');
      const saveBtn = dialog.querySelector('#save-btn');
      const copyBtns = dialog.querySelectorAll('.copy-key-btn');

      const cleanup = () => {
        document.body.removeChild(modal);
      };

      closeBtn.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      clearBtn.addEventListener('click', () => {
        // Save current API key as backup before clearing
        if (this.apiKey) {
          localStorage.setItem('responsiveVoiceApiKey_backup', this.apiKey);
          console.log('API key saved as backup before clearing');
        }
        
        // Clear current API key configuration
        localStorage.removeItem('responsiveVoiceApiKey');
        this.apiKey = null;
        this.useResponsiveVoice = false;
        
        cleanup();
        resolve(false); // Use local voice (fallback)
      });

      // Add copy functionality to copy buttons
      copyBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
          const keyToCopy = btn.dataset.key;
          
          try {
            await navigator.clipboard.writeText(keyToCopy);
            
            // Also paste into the input field and show it
            apiKeyInput.value = keyToCopy;
            apiKeyInput.type = 'text';
            
            // Show temporary success feedback
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
            btn.style.color = '#28a745';
            
            // Hide after 5 seconds
            setTimeout(() => {
              apiKeyInput.type = 'password';
              btn.innerHTML = originalHTML;
              btn.style.color = '#666';
            }, 4000);
          } catch (error) {
            console.error('Failed to copy API key:', error);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = keyToCopy;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            // Also paste into the input field and show it
            apiKeyInput.value = keyToCopy;
            apiKeyInput.type = 'text';
            
            // Show temporary success feedback
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
            btn.style.color = '#28a745';
            
            // Hide after 5 seconds
            setTimeout(() => {
              apiKeyInput.type = 'password';
              btn.innerHTML = originalHTML;
              btn.style.color = '#666';
            }, 5000);
          }
        });
      });

      saveBtn.addEventListener('click', async () => {
        let newApiKey = apiKeyInput.value.trim();
        
        console.log('Save button clicked:', {
          isReconfiguration,
          newApiKey: newApiKey || '(empty)',
          hasExistingKey,
          condition: isReconfiguration && !newApiKey && hasExistingKey
        });
        
        // If no new key provided, use existing or backup key
        if (!newApiKey) {
          if (this.apiKey) {
            console.log('Using existing API key for configuration');
            newApiKey = this.apiKey;
          } else {
            const backupKey = localStorage.getItem('responsiveVoiceApiKey_backup');
            if (backupKey) {
              console.log('Using backup API key for configuration');
              newApiKey = backupKey;
              apiKeyInput.value = backupKey; // Show the backup key in input
            }
          }
        }
        
        if (newApiKey) {
          try {
            await this.setApiKey(newApiKey);
            cleanup();
            resolve(true);
          } catch (error) {
            alert('Invalid API key: ' + error.message);
          }
        } else {
          alert('Please enter a valid API key');
        }
      });

      // Close on outside click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          cleanup();
          resolve(false);
        }
      });

      // Focus on input
      setTimeout(() => apiKeyInput.focus(), 100);
    });
  }

  // Set API key and load ResponsiveVoice
  async setApiKey(apiKey) {
    // Validate API key format (basic check)
    if (!apiKey || apiKey.length < 8) {
      throw new Error('Invalid API key format');
    }

    const isNewKey = apiKey !== this.apiKey;

    if (isNewKey) {
      localStorage.setItem('responsiveVoiceApiKey_backup', this.apiKey);
    }
    this.apiKey = apiKey;
    this.useResponsiveVoice = true;
    localStorage.setItem('responsiveVoiceApiKey', apiKey);

    if (isNewKey()) {
      // Use windows.reload() to reload ResponsiveVoice with new API key (force reload if it's a new key)
      try {
        this.responsiveVoicePromise = this.loadResponsiveVoiceWithKey(isNewKey);
        await this.responsiveVoicePromise;
        this.responsiveVoiceTemporarilyUnavailable = false;
      } catch (error) {
        // If loading fails, don't remove the API key - it might be a temporary issue
        this.responsiveVoiceTemporarilyUnavailable = true;
        throw error;
      }
    }
  }

  // Retry loading ResponsiveVoice (for temporary failures)
  async retryResponsiveVoice() {
    console.log('retryResponsiveVoice called - checking API key...');
    
    if (!this.apiKey) {
      console.error('No API key available for retry');
      throw new Error('No API key available for retry');
    }

    console.log('Force reloading ResponsiveVoice with key:', '***' + this.apiKey.slice(-4));
    this.responsiveVoiceTemporarilyUnavailable = false;
    
    try {
      // Force reload the script
      console.log('Calling loadResponsiveVoiceWithKey(true)...');
      this.responsiveVoicePromise = this.loadResponsiveVoiceWithKey(true);
      await this.responsiveVoicePromise;
      console.log('ResponsiveVoice force reload successful');
    } catch (error) {
      console.warn('ResponsiveVoice force reload failed:', error.message);
      this.responsiveVoiceTemporarilyUnavailable = true;
      throw error;
    }
  }

  // Get language name for display
  getLanguageName(languageCode) {
    const names = {
      'es': 'Spanish',
      'es-MX': 'Spanish (Latin American)',
      'es-AR': 'Spanish (Latin American)',
      'fr': 'French',
      'fr-CA': 'French (Canadian)',
      'de': 'German',
      'de-AT': 'German (Austrian)',
      'de-CH': 'German (Swiss)',
      'it': 'Italian',
      'pt': 'Portuguese',
      'pt-BR': 'Portuguese (Brazilian)',
      'pt-PT': 'Portuguese (European)',
      'ru': 'Russian',
      'ja': 'Japanese',
      'zh': 'Chinese',
      'zh-CN': 'Chinese (Simplified)',
      'zh-TW': 'Chinese (Traditional)',
      'ko': 'Korean',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'th': 'Thai',
      'vi': 'Vietnamese',
      'nl': 'Dutch',
      'sv': 'Swedish',
      'no': 'Norwegian',
      'da': 'Danish',
      'fi': 'Finnish',
      'pl': 'Polish',
      'cs': 'Czech',
      'hu': 'Hungarian',
      'ro': 'Romanian',
      'bg': 'Bulgarian',
      'hr': 'Croatian',
      'sr': 'Serbian',
      'sl': 'Slovenian',
      'sk': 'Slovak',
      'et': 'Estonian',
      'lv': 'Latvian',
      'lt': 'Lithuanian',
      'el': 'Greek',
      'tr': 'Turkish',
      'he': 'Hebrew',
      'fa': 'Persian',
      'ur': 'Urdu',
      'bn': 'Bengali',
      'ta': 'Tamil',
      'te': 'Telugu',
      'ml': 'Malayalam',
      'kn': 'Kannada',
      'gu': 'Gujarati',
      'pa': 'Punjabi',
      'mr': 'Marathi',
      'ne': 'Nepali',
      'si': 'Sinhala',
      'my': 'Myanmar',
      'km': 'Khmer',
      'lo': 'Lao',
      'ka': 'Georgian',
      'am': 'Amharic',
      'sw': 'Swahili',
      'zu': 'Zulu',
      'af': 'Afrikaans',
      'is': 'Icelandic',
      'mt': 'Maltese',
      'cy': 'Welsh',
      'ga': 'Irish',
      'gd': 'Scottish Gaelic',
      'eu': 'Basque',
      'ca': 'Catalan',
      'gl': 'Galician',
      'en': 'English',
      'en-GB': 'English (British)',
      'en-AU': 'English (Australian)',
      'en-CA': 'English (Canadian)',
      'en-IE': 'English (Irish)',
      'en-ZA': 'English (South African)',
      'en-IN': 'English (Indian)'
    };
    return names[languageCode] || languageCode;
  }

  // Get ResponsiveVoice status
  getResponsiveVoiceStatus() {
    let status = 'Not configured';
    if (this.useResponsiveVoice && this.responsiveVoiceLoaded) {
      status = 'Configured and loaded';
    } else if (this.useResponsiveVoice && this.responsiveVoiceTemporarilyUnavailable) {
      status = 'Temporarily unavailable';
    } else if (this.useResponsiveVoice && !this.responsiveVoiceLoaded) {
      status = 'Loading...';
    } else if (!this.useResponsiveVoice) {
      status = 'Not configured';
    }

    return {
      enabled: this.useResponsiveVoice,
      loaded: this.responsiveVoiceLoaded,
      temporarilyUnavailable: this.responsiveVoiceTemporarilyUnavailable,
      apiKey: this.apiKey ? '***' + this.apiKey.slice(-4) : null,
      available: typeof responsiveVoice !== 'undefined',
      status: status
    };
  }

  // Clear API key
  clearApiKey() {
    this.apiKey = null;
    this.useResponsiveVoice = false;
    this.responsiveVoiceLoaded = false;
    this.scriptLoaded = false;
    localStorage.removeItem('responsiveVoiceApiKey');
  }

  // Test ResponsiveVoice
  async testResponsiveVoice(text = 'Hello world, this is a test of ResponsiveVoice.', languageCode = 'en') {
    if (!this.useResponsiveVoice) {
      throw new Error('ResponsiveVoice not enabled');
    }
    
    // Wait for ResponsiveVoice to be loaded
    await this.responsiveVoicePromise;
    
    if (!this.responsiveVoiceLoaded) {
      throw new Error('ResponsiveVoice failed to load');
    }
    
    try {
      await this.speakWithResponsiveVoice(text, languageCode);
      return true;
    } catch (error) {
      throw error;
    }
  }
}

const speechService = new SpeechService();
export default speechService;
