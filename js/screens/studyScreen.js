import dataSyncService from '../services/dataSyncService.js';
import speechService from '../utils/speechService.js';
import TextUtils from '../utils/textUtils.js';
import AppInfoModal from '../utils/appInfoModal.js';

class StudyScreen {
  constructor(container, languagePairId, reverseDirection, onBack, searchResults = null, deckFilter = null) {
    this.container = container;
    this.languagePairId = languagePairId;
    this.reverseDirection = reverseDirection;
    this.onBack = onBack;
    this.searchResults = searchResults;
    this.deckFilter = deckFilter;
    this.cards = [];
    this.languagePair = null;
    this.currentCardIndex = 0;
    this.isFlipped = false;
    this.languagePairName = '';
    this.languagePairs = [];
    this.cardCheckAttempts = new Map(); // Track check attempts per card
    this.cardRecommendations = new Map(); // Track recommendation level per card
    this.isListView = false; // Toggle between card and list view
  }

  checkResponsiveLayout() {
    // Check if previous/next buttons are visible
    const prevBtn = this.container.querySelector('#prev-btn');
    const nextBtn = this.container.querySelector('#next-btn');
    const difficultyButtons = this.container.querySelector('.difficulty-buttons');
    
    if (prevBtn && nextBtn && difficultyButtons) {
      const prevBtnRect = prevBtn.getBoundingClientRect();
      const nextBtnRect = nextBtn.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // If either button bottom is below viewport fold, arrange difficulty buttons horizontally
      if (prevBtnRect.bottom > viewportHeight || nextBtnRect.bottom > viewportHeight) {
        difficultyButtons.style.flexDirection = 'row';
        difficultyButtons.style.gap = '0.5rem';
        difficultyButtons.style.justifyContent = 'center';
        console.log('Difficulty buttons arranged horizontally - nav buttons not visible');
      } else {
        difficultyButtons.style.flexDirection = 'column';
        difficultyButtons.style.gap = '0.5rem';
        console.log('Difficulty buttons arranged vertically - nav buttons visible');
      }
    }
  }

  getTimeFilter() {
    const savedTimeFilter = localStorage.getItem('timeFilter');
    if (!savedTimeFilter) return null;
    
    try {
      const filter = JSON.parse(savedTimeFilter);
      // Only return filter if a period is selected
      if (filter && filter.period) {
        return filter;
      }
    } catch (e) {
      console.error('Error parsing time filter:', e);
    }
    return null;
  }

  async loadCards() {
    try {
      // Load language pairs using existing methods
      if (this.languagePairs.length === 0) {
        // Initialize language pair metadata from metadata.json if needed
        await dataSyncService.initializeLanguagePairMetadata();

        // Get all language pairs with metadata
        this.languagePairs = await dataSyncService.getAllLanguagePairMetadata();
        
        // Sort alphabetically by name
        this.languagePairs.sort((a, b) => a.name.localeCompare(b.name));
      }
      
      // Get the current language pair name
      const currentPair = this.languagePairs.find(pair => pair.id === this.languagePairId);
      this.languagePairName = currentPair ? currentPair.name : this.languagePairId;
      
      // Load language pair metadata for display
      try {
        // Get metadata from IndexedDB
        const metadata = await dataSyncService.getLanguagePairMetadata(this.languagePairId);
        if (metadata) {
          this.languagePair = metadata;
        } else {
          // Create minimal metadata if not found
          console.warn(`Language pair metadata not found for ${this.languagePairId}, using fallback`);
          this.languagePair = {
            id: this.languagePairId,
            name: this.languagePairId.split('-').map(lang => lang.charAt(0).toUpperCase() + lang.slice(1)).join(' - '),
            sourceLang: this.languagePairId.split('-')[0].charAt(0).toUpperCase() + this.languagePairId.split('-')[0].slice(1),
            targetLang: this.languagePairId.split('-')[1].charAt(0).toUpperCase() + this.languagePairId.split('-')[1].slice(1)
          };
        }
      } catch (error) {
        console.error('Error loading language pair metadata:', error);
        // Create minimal metadata on error
        this.languagePair = {
          id: this.languagePairId,
          name: this.languagePairId.split('-').map(lang => lang.charAt(0).toUpperCase() + lang.slice(1)).join(' - '),
          sourceLang: this.languagePairId.split('-')[0].charAt(0).toUpperCase() + this.languagePairId.split('-')[0].slice(1),
          targetLang: this.languagePairId.split('-')[1].charAt(0).toUpperCase() + this.languagePairId.split('-')[1].slice(1)
        };
      }

      const defaultDifficultyFilters = {
        new: true,
        hard: true,
        medium: false,
        easy: false,
      };

      let difficultyFilters = defaultDifficultyFilters;
      const savedDifficultyFilters = localStorage.getItem('difficultyFilters');
      if (savedDifficultyFilters) {
        try {
          const parsed = JSON.parse(savedDifficultyFilters);
          difficultyFilters = {
            ...defaultDifficultyFilters,
            ...parsed,
          };
        } catch (e) {
          difficultyFilters = defaultDifficultyFilters;
        }
      }

      const anyEnabled = Object.values(difficultyFilters).some(Boolean);
      const effectiveFilters = anyEnabled ? difficultyFilters : {
        new: true,
        hard: true,
        medium: true,
        easy: true,
      };

      // Get time filter settings
      const timeFilter = this.getTimeFilter();

      // Use search results if available, otherwise load filtered cards
      if (this.searchResults && this.searchResults.length > 0) {
        this.cards = this.searchResults;
        console.log(`Using search results: ${this.cards.length} words`);
      } else {
        // Load cards from IndexedDB with automatic sync and time filter
        this.cards = await dataSyncService.getFilteredCards(this.languagePairId, effectiveFilters, timeFilter, this.deckFilter);
      }

      this.currentCardIndex = 0;
      this.isFlipped = false;
      this.shuffleCards();
      this.render();
    } catch (error) {
      console.error('Error loading data:', error);
      // Show error state to user
      this.container.innerHTML = `
        <div class="error-state">
          <p>Error loading flashcard data. Please try again later.</p>
          <button id="back-btn" class="btn btn-secondary">Back to Menu</button>
        </div>
      `;
      this.setupEventListeners();
    }
  }

  shuffleCards() {
    // Fisher-Yates shuffle algorithm
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  render() {
    if (this.cards.length === 0) {
      const languagePairName = this.languagePair ? 
        (this.reverseDirection ? 
          `${this.languagePair.targetLang} - ${this.languagePair.sourceLang}` : 
          `${this.languagePair.sourceLang} - ${this.languagePair.targetLang}`) : 
        '';
      
      this.container.innerHTML = `
      <div class="study-container">
        <header class="app-header">
          <button id="back-btn" class="btn-icon" aria-label="Back to menu" title="Back to menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div class="header-content">
            <h1 class="app-title clickable">FlashCard</h1>
          </div>
          <div class="language-pair">${languagePairName}</div>
        </header>
        <div class="screen-content">
          <p>No cards available for this language pair.</p>
        </div>
      </div>
      `;
      this.setupEventListeners();
      return;
    }

    const languagePairName = this.languagePair ? 
      (this.reverseDirection ? 
        `${this.languagePair.targetLang} - ${this.languagePair.sourceLang}` : 
        `${this.languagePair.sourceLang} - ${this.languagePair.targetLang}`) : 
      '';

    // Render based on view mode
    if (this.isListView) {
      this.renderListView(languagePairName);
    } else {
      this.renderCardView(languagePairName);
    }
  }

  renderCardView(languagePairName) {
    const currentCard = this.cards[this.currentCardIndex];
    
    // Determine front and back content based on direction
    const displayWord = currentCard.originalWord || currentCard.word;
    const frontText = this.reverseDirection ? currentCard.translation : displayWord;
    const backText = this.reverseDirection ? displayWord : currentCard.translation;
    
    this.container.innerHTML = `
      <div class="study-container">
        <header class="app-header">
          <button id="back-btn" class="btn-icon" aria-label="Back to menu" title="Back to menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div class="header-content">
            <h1 class="app-title clickable">FlashCard</h1>
          </div>
          <div class="language-pair">${languagePairName}</div>
        </header>
        
        <div class="screen-content">
          <div class="progress">
            <span>Card ${this.currentCardIndex + 1} of ${this.cards.length}</span>
            <button id="view-toggle-btn" class="btn-icon" aria-label="Switch to list view" title="Switch to list view">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div class="flashcard" id="flashcard" ${this.isFlipped ? 'flipped' : ''}>
            <div class="card-face card-front">
              <div class="card-content">
                <div class="text-with-speaker">
                  <h2>${frontText}</h2>
                  <button class="speaker-btn" data-text="${frontText}" data-lang="${this.reverseDirection ? 'en' : this.languagePairId.split('-')[0]}" aria-label="Speak" title="Speak">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                  </button>
                </div>
                ${currentCard.type ? `<div class="card-type">(${currentCard.type})</div>` : ''}
                <div class="hint">Tap to flip</div>
                
                <!-- Translation Practice Section -->
                <div class="translation-practice">
                  <div class="translation-input-container">
                    <input type="text" 
                           id="translation-input" 
                           class="translation-input" 
                           placeholder="Type your translation..." 
                           autocomplete="off"
                           spellcheck="false">
                    <button id="check-translation-btn" class="check-translation-btn" title="Check translation">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div class="card-face card-back">
              <div class="card-content">
                <div class="text-with-speaker">
                  <h2>${backText}</h2>
                  <button class="speaker-btn" data-text="${backText}" data-lang="${this.reverseDirection ? this.languagePairId.split('-')[0] : 'en'}" aria-label="Speak" title="Speak">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                  </button>
                </div>
                ${currentCard.type ? `<div class="card-type">(${currentCard.type})</div>` : ''}
                ${currentCard.notes && currentCard.notes.length > 0 ? `<div class="card-notes">${currentCard.notes.map(note => `<div class="note-item">${note}</div>`).join('')}</div>` : ''}
                <div class="hint">Tap to flip</div>
                ${currentCard.example ? `<div class="text-with-speaker example-container">
                  <p class="example">${currentCard.example}</p>
                  <button class="speaker-btn speaker-btn-small" data-text="${currentCard.example}" data-lang="${this.reverseDirection ? this.languagePairId.split('-')[0] : this.languagePairId.split('-')[0]}" aria-label="Speak example" title="Speak example">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                  </button>
                </div>` : ''}
              </div>
            </div>
          </div>
          
          <div class="card-actions">
            <div class="difficulty-buttons">
              <button class="difficulty-btn easy ${currentCard.stats?.difficulty === 1 ? 'active' : ''}" data-difficulty="1">
                <span class="btn-text">Easy</span>
              </button>
              <button class="difficulty-btn medium ${currentCard.stats?.difficulty === 2 ? 'active' : ''}" data-difficulty="2">
                <span class="btn-text">Medium</span>
              </button>
              <button class="difficulty-btn hard ${currentCard.stats?.difficulty === 3 ? 'active' : ''}" data-difficulty="3">
                <span class="btn-text">Hard</span>
              </button>
            </div>
            <div class="navigation-buttons">
              <button class="nav-btn prev-btn" id="prev-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                <span class="btn-text">Previous</span>
              </button>
              <button class="nav-btn next-btn" id="next-btn">
                <span class="btn-text">Next</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
    
    // Add responsive layout check
    this.checkResponsiveLayout();
    
    // Add resize listener for responsive behavior
    window.addEventListener('resize', () => {
      this.checkResponsiveLayout();
    });
  }

  renderListView(languagePairName) {
    this.container.innerHTML = `
      <div class="study-container">
        <header class="app-header">
          <button id="back-btn" class="btn-icon" aria-label="Back to menu" title="Back to menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div class="header-content">
            <h1 class="app-title clickable">FlashCard</h1>
          </div>
          <div class="language-pair">${languagePairName}</div>
        </header>
        <div class="screen-content">
          <div class="progress">
            <span>Card ${this.currentCardIndex + 1} of ${this.cards.length}</span>
            <button id="view-toggle-btn" class="btn-icon" aria-label="Switch to card view" title="Switch to card view">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect>
                <line x1="7" y1="8" x2="17" y2="8"></line>
                <line x1="7" y1="12" x2="14" y2="12"></line>
                <line x1="7" y1="16" x2="12" y2="16"></line>
              </svg>
            </button>
          </div>
          <div class="cards-table-wrapper">
            <table class="cards-table">
              <thead>
                <tr>
                  <th class="front-cell">Front</th>
                  <th class="back-cell"  text-align="center">Translation</th>
                  <th class="difficulty-col"></th>
                </tr>
              </thead>
              <tbody>
                ${this.cards.map((card, index) => {
                  const displayWord = card.originalWord || card.word;
                  const frontText = this.reverseDirection ? card.translation : displayWord;
                  const backText = this.reverseDirection ? displayWord : card.translation;
                  
                  return `
                    <tr data-index="${index}" class="card-row ${index === this.currentCardIndex ? 'current-row' : ''}">
                      <td class="front-cell">
                        <span>${frontText}</span>
                        ${card.type ? `<div class="card-type">(${card.type})</div>` : ''}
                        ${card.notes && card.notes.length > 0 ? `<div class="card-notes">${card.notes.map(note => `<div class="note-item">${note}</div>`).join('')}</div>` : ''}
                      </td>
                      <td class="back-cell">
                        <div class="translation-mask" data-index="${index}">
                          <span class="masked-text">Click to reveal</span>
                          <span class="revealed-text" style="display: none;">${backText}</span>
                        </div>
                      </td>
                      <td class="difficulty-col">
                        ${this.getDifficultyIcon(card.stats?.difficulty)}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
    
    // Scroll to current card in list view
    if (this.isListView) {
      this.scrollToCurrentCard();
    }
  }

  setupEventListeners() {
    const flashcard = this.container.querySelector('#flashcard');
    const difficultyBtns = this.container.querySelectorAll('.difficulty-btn');
    const backBtn = this.container.querySelector('#back-btn');
    const speakerBtns = this.container.querySelectorAll('.speaker-btn');
    const prevBtn = this.container.querySelector('#prev-btn');
    const nextBtn = this.container.querySelector('#next-btn');
    const appTitle = this.container.querySelector('.app-title');
    const translationInput = this.container.querySelector('#translation-input');
    const checkTranslationBtn = this.container.querySelector('#check-translation-btn');
    const viewToggleBtn = this.container.querySelector('#view-toggle-btn');
    const translationMasks = this.container.querySelectorAll('.translation-mask');

    // Set initial speaker button classes based on ResponsiveVoice availability
    speakerBtns.forEach(btn => {
      if (speechService.useResponsiveVoice && speechService.responsiveVoiceLoaded) {
        btn.classList.add('responsive-voice');
      } else {
        btn.classList.add('local-voice');
      }
    });

    if (flashcard) {
      flashcard.addEventListener('click', (e) => {
        const yesBtn = document.querySelector('#prompt-yes');
        if (!yesBtn) {
          if (!e.target.closest('.speaker-btn') && 
              !e.target.closest('.difficulty-btn') && 
              !e.target.closest('.nav-btn') &&
              !e.target.closest('.translation-practice')) {
            this.toggleCard();
          }
        }
      });
    }

    speakerBtns.forEach(btn => {
      let pressTimer;
      let isLongPress = false;
      
      const handleSpeech = async (e) => {
        e.stopPropagation();
        const text = btn.dataset.text;
        const lang = btn.dataset.lang;
        
        // Remove existing service classes
        btn.classList.remove('local-voice', 'responsive-voice');
        
        // Speak and get the service used
        const serviceUsed = await speechService.speak(text, lang);
        
        // Add the appropriate class to indicate which service was used
        if (serviceUsed === 'responsive') {
          btn.classList.add('responsive-voice');
        } else {
          btn.classList.add('local-voice');
        }
      };
      
      const startPress = (e) => {
        e.preventDefault();
        isLongPress = false;
        
        pressTimer = setTimeout(() => {
          isLongPress = true;
          speechService.promptForApiKey('en', true); // Show configuration dialog
        }, 500); // 500ms for long press
      };
      
      const endPress = (e) => {
        clearTimeout(pressTimer);
        
        if (!isLongPress) {
          // Regular click - speak the text
          handleSpeech(e);
        }
      };
      
      // Mouse events
      btn.addEventListener('mousedown', startPress);
      btn.addEventListener('mouseup', endPress);
      btn.addEventListener('mouseleave', endPress);
      
      // Touch events
      btn.addEventListener('touchstart', startPress, { passive: false });
      btn.addEventListener('touchend', endPress);
      btn.addEventListener('touchcancel', endPress);
      
      // Prevent context menu on long press
      btn.addEventListener('contextmenu', (e) => {
        if (isLongPress) {
          e.preventDefault();
        }
      });
    });

    difficultyBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const difficulty = parseInt(e.currentTarget.dataset.difficulty);
        const cardIndex = e.currentTarget.dataset.index;
        
        if (cardIndex !== undefined) {
          // List view - handle specific card and reveal translation
          this.handleListDifficulty(parseInt(cardIndex), difficulty);
          this.revealTranslation(parseInt(cardIndex));
        } else {
          // Card view - handle current card with card view logic
          this.handleDifficulty(difficulty);
        }
      });
    });

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handlePrevious();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleNext();
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => this.onBack());
    }

    // Add click listener for app title
    if (appTitle) {
      appTitle.addEventListener('click', () => {
        AppInfoModal.show();
      });
    }

    // Translation practice event listeners
    if (translationInput && checkTranslationBtn) {
      // Check translation on button click
      checkTranslationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.checkTranslation();
      });

      // Check translation on Enter key
      translationInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.stopPropagation();
          this.checkTranslation();
        }
      });

      // Reset check button and update disabled state when user starts typing
      translationInput.addEventListener('input', () => {
        this.resetCheckButton();
        this.updateCheckButtonState();
      });
      
      // Initialize check button state
      this.updateCheckButtonState();
    }

    // View toggle button
    if (viewToggleBtn) {
      viewToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isListView = !this.isListView;
        
        // When switching to card view, use last clicked card as current
        if (!this.isListView) {
          this.render();
        }
        // When switching to list view, set current card as current row to show action row
        else {
          this.render();
          this.setCurrentCard(this.currentCardIndex);
        }
        
      });
    }

    // Translation mask click handlers for list view
    translationMasks.forEach(mask => {
      mask.addEventListener('click', e => {
        e.stopPropagation();
        const cardIndex = parseInt(mask.dataset.index);
        
        const revealedText = mask.querySelector('.revealed-text');
        if (revealedText) {
          // Toggle between masked and revealed states
          this.revealTranslation(cardIndex, revealedText.style.display === 'none');
        }
        if (this.currentCardIndex !== cardIndex) {
          this.setCurrentCard(cardIndex);
        }
      });
    });
    
    // Card row click handlers for tracking last clicked card
    const cardRows = this.container.querySelectorAll('.card-row');
    cardRows.forEach(row => {
      row.addEventListener('click', (e) => {
        // Don't track clicks on difficulty buttons or translation masks
        if (!e.target.closest('.difficulty-btn') && !e.target.closest('.translation-mask')) {
          const cardIndex = parseInt(row.dataset.index);
          if (cardIndex !== this.currentCardIndex) {
            this.setCurrentCard(cardIndex);
          }
        }
      });
      
      // Add double-click listener to switch to card view
      row.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const cardIndex = parseInt(row.dataset.index);
        this.currentCardIndex = cardIndex;
        this.isListView = false;
        this.render();
      });
    });
  }

  toggleCard() {
    const flashcard = this.container.querySelector('#flashcard');
    if (flashcard) {
      flashcard.classList.toggle('flipped');
      
      // Remove accent warning when flipping the card
      this.removeAccentWarning(false);
      
      // Clear translation input when flipping the card
      this.clearTranslationInput();
    }
  }

  checkTranslation(isList = false) {
    const inputId = isList ? '#translation-input-list' : '#translation-input';
    const btnId = isList ? '#check-translation-btn-list' : '#check-translation-btn';
    
    const translationInput = this.container.querySelector(inputId);
    const checkBtn = this.container.querySelector(btnId);
    
    if (!translationInput || !checkBtn) return;

    const userInput = translationInput.value.trim();
    if (!userInput) {
      this.resetCheckButton(isList);
      return;
    }

    const currentCard = this.cards[this.currentCardIndex];
    const correctTranslation = this.reverseDirection ? currentCard.word : currentCard.translation;
    
    // Second comparison: without accents
    const userInputNoAccents = TextUtils.removeAccents(userInput);
    const correctTranslationNoAccents = TextUtils.removeAccents(correctTranslation);

    // First, check for exact match (accent-insensitive)
    const exactMatchRegex = TextUtils.createAccentInsensitiveRegex(userInputNoAccents);
    const isExactMatch = exactMatchRegex.test(correctTranslationNoAccents);
    
    console.log(`Exact match check: "${userInputNoAccents}" vs "${correctTranslationNoAccents}" = ${isExactMatch}`);
    
    // Create a Fuse instance for fuzzy matching
    const options = {
      includeScore: true,
      threshold: 0.25, // Lower threshold = more strict matching
      ignoreLocation: true,
      keys: ['translation']
    };

    // First comparison: with accents
    const translationsWithAccents = [{ translation: correctTranslation }];
    const fuseWithAccents = new Fuse(translationsWithAccents, options);
    const resultWithAccents = fuseWithAccents.search(userInput);
    
    let similarityWithAccents = 0;
    if (resultWithAccents.length > 0) {
      const score = resultWithAccents[0].score;
      similarityWithAccents = Math.round((1 - score) * 100);
    }
    
    const translationsNoAccents = [{ translation: correctTranslationNoAccents }];
    const fuseNoAccents = new Fuse(translationsNoAccents, options);
    const resultNoAccents = fuseNoAccents.search(userInputNoAccents);
    
    let similarityNoAccents = 0;
    if (resultNoAccents.length > 0) {
      const score = resultNoAccents[0].score;
      similarityNoAccents = Math.round((1 - score) * 100);
    }
    
    console.log(`Comparison with accents: ${similarityWithAccents}%, without accents: ${similarityNoAccents}%`);
    
    // Check if accent-free comparison is significantly better
    const accentDifference = similarityNoAccents - similarityWithAccents;
    const needsAccentCheck = accentDifference >= 10 && similarityNoAccents >= 90;
    
    // Use the higher similarity score from fuzzy matching, but cap at 90
    const fuzzySimilarity = Math.max(similarityWithAccents, similarityNoAccents);
    const finalSimilarity = isExactMatch ? 100 : Math.min(fuzzySimilarity, 90);
    
    console.log(`Fuzzy similarity: ${fuzzySimilarity}%, final similarity: ${finalSimilarity}%`);
    
    // Show feedback on button
    if (isExactMatch) {
      this.showCheckButtonFeedback('100%', 'perfect', isList);
    } else if (finalSimilarity > 0) {
      this.showCheckButtonFeedback(`${finalSimilarity}%`, 'partial', isList);
    } else {
      this.showCheckButtonFeedback('', 'nomatch', isList);
    }
    
    // Show accent warning if needed
    if (needsAccentCheck) {
      this.showAccentWarning(isList);
    }
    
    // Show difficulty recommendation based on accent-free comparison
    const recommendation = this.getDifficultyRecommendation(similarityNoAccents);
    console.log(`Calling showDifficultyRecommendation with: ${recommendation}`);
    this.showDifficultyRecommendation(recommendation, isList);
  }

  showAccentWarning(isList = false) {
    if (isList) {
      // For list view, find the translation mask in the current row
      this.revealTranslation(this.currentCardIndex, false);
      const translationMaskDiv = this.container.querySelector(`.translation-mask[data-index="${this.currentCardIndex}"]`);
      if (translationMaskDiv) {
        const translationMask = translationMaskDiv.querySelector(`.masked-text`);
        if (translationMask) {
          translationMask.className = 'accent-warning';
          translationMask.textContent = 'Check accent';
        }
      }
    } else {
      // For card view, find the translation input container on the front card
      const translationInputContainer = this.container.querySelector('.card-front .translation-input-container');
      if (translationInputContainer) {
        this.addCardAccentWarningToElement(translationInputContainer);
      }
    }
  }

  addCardAccentWarningToElement(container) {
    // Remove any existing accent warning
    const existingWarning = container.parentNode.querySelector('.card-accent-warning');
    if (existingWarning) {
      existingWarning.remove();
    }
    
    // Create and add the accent warning in a new row
    const warningDiv = document.createElement('div');
    warningDiv.className = 'card-accent-warning';
    warningDiv.textContent = 'Check accent';
    warningDiv.style.cursor = 'pointer';
    
    // Add click handler to flip the card
    warningDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCard();
    });
    
    // Insert after the translation input container (as a new row)
    container.parentNode.insertBefore(warningDiv, container.nextSibling);
  }

  showCheckButtonFeedback(text, feedbackType, isList = false) {
    const btnId = isList ? '#check-translation-btn-list' : '#check-translation-btn';
    const checkBtn = this.container.querySelector(btnId);
    if (!checkBtn) return;

    // Remove all feedback classes
    checkBtn.classList.remove('perfect', 'partial', 'nomatch');
    
    // Add the appropriate feedback class
    checkBtn.classList.add(feedbackType);
    
    if (feedbackType === 'nomatch') {
      // Show X icon for no match
      checkBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
    } else {
      // Show percentage text
      checkBtn.innerHTML = `<span style="font-size: 0.7rem; font-weight: bold;">${text}</span>`;
    }
  }

  resetCheckButton(isList = false) {
    const btnId = isList ? '#check-translation-btn-list' : '#check-translation-btn';
    const checkBtn = this.container.querySelector(btnId);
    if (!checkBtn) return;

    // Remove all feedback classes
    checkBtn.classList.remove('perfect', 'partial', 'nomatch');
    
    // Reset to original checkmark icon
    checkBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;
    
    // Remove accent warning
    this.removeAccentWarning(isList);
  }

  removeAccentWarning(isList = false) {
    if (isList) {
      // For list view, find and remove accent warning in the current row
      const translationMask = this.container.querySelector(`.translation-mask[data-index="${this.currentCardIndex}"]`);
      if (translationMask) {
        const accentWarning = translationMask.querySelector(`.accent-warning`);
        if (accentWarning) {
          accentWarning.className = "masked-text";
          accentWarning.textContent = "Click to reveal";
        }
      }
    } else {
      // For card view, find and remove accent warning after the translation input container
      const translationInputContainer = this.container.querySelector('.card-front .translation-input-container');
      if (translationInputContainer) {
        // Also check within the container for any existing warnings
        const accentWarning = translationInputContainer.parentNode.querySelector('.card-accent-warning');
        if (accentWarning) {
          accentWarning.remove();
        }
      }
    }
  }

  clearTranslationInput() {
    const translationInput = this.container.querySelector('#translation-input');
    
    if (translationInput) {
      translationInput.value = '';
    }
    
    // Reset check button to original state
    this.resetCheckButton();
    this.updateCheckButtonState();
  }

  updateCheckButtonState() {
    const translationInput = this.container.querySelector('#translation-input');
    const checkBtn = this.container.querySelector('#check-translation-btn');
    
    if (!translationInput || !checkBtn) return;
    
    const hasText = translationInput.value.trim().length > 0;
    checkBtn.disabled = !hasText;
  }

  getDifficultyRecommendation(similarity) {
    const currentCard = this.cards[this.currentCardIndex];
    const cardId = `${currentCard.word}-${currentCard.translation}`;
    
    // Get current attempt count for this card
    let attempts = this.cardCheckAttempts.get(cardId) || 0;
    attempts++;
    this.cardCheckAttempts.set(cardId, attempts);
    
    // Get or set the current recommendation level for this card
    let currentRecommendation = this.cardRecommendations.get(cardId);
    
    // If we already have a recommendation and this is a 100% match, keep the same level
    if (currentRecommendation && currentRecommendation!=='3' && similarity === 100) {
      return currentRecommendation;
    }
    
    // Determine new recommendation based on attempt number and similarity
    let newRecommendation;
    if (attempts === 1) {
      // First attempt
      if (similarity === 100) newRecommendation = '1'; // Easy
      else if (similarity >= 90) newRecommendation = '2'; // Medium
      else newRecommendation = '3'; // Hard
    } else if (attempts === 2) {
      // Second attempt
      if (similarity === 100) newRecommendation = '2'; // Medium
      else newRecommendation = '3'; // Hard
    } else {
      // Third or more attempts
      newRecommendation = '3'; // Hard
    }
    
    // Store the recommendation for this card
    this.cardRecommendations.set(cardId, newRecommendation);
    
    console.log(`New recommendation: ${newRecommendation}`);
    return newRecommendation;
  }

  showDifficultyRecommendation(recommendation, isList = false) {
    let containerToUse = this.container;

    // For list view, find difficulty buttons in the action row
    if (isList) {
      containerToUse = this.container.querySelector('.action-row');
    }

    const difficultyBtns = containerToUse.querySelectorAll('.difficulty-btn');
    
    console.log(`Found ${difficultyBtns.length} difficulty buttons:`, 
      Array.from(difficultyBtns).map(btn => `${btn.textContent.trim()} (${btn.dataset.difficulty})`));
    
    // Remove any existing recommendations
    difficultyBtns.forEach(btn => btn.classList.remove('recommendation'));
    
    // Add recommendation to the appropriate button
    const targetBtn = Array.from(difficultyBtns).find(btn => 
      btn.dataset.difficulty === recommendation
    );
    
    console.log(`Target button found:`, targetBtn ? targetBtn.textContent.trim() : 'None');
    
    if (targetBtn) {
      targetBtn.classList.add('recommendation');
      console.log(`Added recommendation class to: ${targetBtn.textContent.trim()}`);
      // Recommendation will stay until user moves to another card
    } else {
      console.error(`No button found for difficulty recommendation: ${recommendation}`);
    }
  }

  async handleDifficulty(difficulty) {
    // Store the difficulty and last_reviewed timestamp in IndexedDB
    const currentCard = this.cards[this.currentCardIndex];
    
    try {
      currentCard.stats.difficulty = difficulty;
      const difficultyBtns = this.container.querySelectorAll('.difficulty-btn');
      difficultyBtns.forEach(btn => {
        btn.classList.remove('active');
        if (difficulty === parseInt(btn.dataset.difficulty)) {
          btn.classList.add('active');
        }
      });
      await dataSyncService.updateCardProgress(this.languagePairId, currentCard.word, currentCard.type, difficulty);
    } catch (error) {
      console.error('Error updating card progress:', error);
    }
    
    // Move to the next card
    this.handleNext();
  }

  async handleListDifficulty(cardIndex, difficulty) {
    const card = this.cards[cardIndex];
    try {
      card.stats.difficulty = difficulty;
      const cardRow = this.container.querySelector(`tr[data-index="${cardIndex}"]`);
      if (cardRow) {
        // Update the difficulty column icon
        const difficultyCol = cardRow.querySelector('.difficulty-col');
        if (difficultyCol) {
          difficultyCol.innerHTML = this.getDifficultyIcon(difficulty);
        }
        
        // Update action row button states
        const difficultyBtns = cardRow.nextElementSibling.querySelectorAll('.difficulty-btn');
        difficultyBtns.forEach(btn => {
          btn.classList.remove('active');
          if (difficulty === parseInt(btn.dataset.difficulty)) {
            btn.classList.add('active');
          }
        });
      }
      await dataSyncService.updateCardProgress(this.languagePairId, card.word, card.type, difficulty);
    } catch (error) {
      console.error('Error updating card progress:', error);
    }
  }

  revealTranslation(cardIndex, reveal = true) {
    const translationMask = this.container.querySelector(`.translation-mask[data-index="${cardIndex}"]`);
    if (translationMask) {
      // Remove accent warning when revealing translation
      this.removeAccentWarning(true);
      const maskedText = translationMask.querySelector('.masked-text');
      const revealedText = translationMask.querySelector('.revealed-text');
      if (maskedText && revealedText) {
        maskedText.style.display = reveal ? 'none' : 'inline';
        revealedText.style.display = reveal ? 'inline' : 'none';
      }     
    }
  }

  scrollToCurrentCard() {
    // Find the current card row in the list
    const currentCardRow = this.container.querySelector(`tr[data-index="${this.currentCardIndex}"]`);
    if (currentCardRow) {
      // Scroll the row into view with smooth behavior
      currentCardRow.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }

  getDifficultyIcon(difficulty) {
    if (!difficulty) {
      return '<span class="difficulty-icon none">—</span>';
    }
    
    const icons = {
      1: '<span class="difficulty-icon easy">😊</span>',
      2: '<span class="difficulty-icon medium">😐</span>',
      3: '<span class="difficulty-icon hard">😓</span>'
    };
    
    return icons[difficulty] || icons[0];
  }

  setCurrentCard(cardIndex) {
    // Remove current-row class from all rows
    const allRows = this.container.querySelectorAll('.card-row');
    allRows.forEach(row => {
      row.classList.remove('current-row');
    });
    
    const allActionRows = this.container.querySelectorAll('.action-row');
    allActionRows.forEach(row => {
        row.remove();
    });

    // Add current-row class to new current row
    const newCurrentRow = this.container.querySelector(`tr[data-index="${cardIndex}"]`);
    if (newCurrentRow) {
      newCurrentRow.classList.add('current-row');
      this.currentCardIndex = cardIndex;
      
      // Update progress text
      this.updateProgressText();
      
      // Remove accent warning when changing rows
      this.removeAccentWarning(true);
      
      // Append action row after the current row (only in list view)
      if (this.isListView) {
        this.appendActionRow(newCurrentRow, cardIndex);
      }
      
      // Scroll row into view if needed
      newCurrentRow.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }

  updateProgressText() {
    const progressElement = this.container.querySelector('.progress span');
    if (progressElement) {
      progressElement.textContent = `Card ${this.currentCardIndex + 1} of ${this.cards.length}`;
    }
  }

  moveToNextCard() {
    const nextIndex = this.currentCardIndex + 1;
    if (nextIndex < this.cards.length) {
      this.setCurrentCard(nextIndex);
    }
  }

  appendActionRow(currentRow, cardIndex) {
    const card = this.cards[cardIndex];
    const displayWord = card.originalWord || card.word;
    const frontText = this.reverseDirection ? card.translation : displayWord;
    const backText = this.reverseDirection ? displayWord : card.translation;
    
    // Create action row HTML
    const actionRowHTML = `
      <div class="translation-practice">
        <div class="translation-input-container">
          <input type="text" 
                   id="translation-input-list"
                   class="translation-input" 
                   data-index="${cardIndex}"
                   placeholder="Type your translation..." 
                   autocomplete="off"
                   spellcheck="false">
          <button id="check-translation-btn-list" class="check-translation-btn" data-index="${cardIndex}" title="Check translation" disabled>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
        </div>
        <div class="action-buttons">
          <button class="speaker-btn action-speaker" data-type="front" data-index="${cardIndex}" title="Speak front word">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          </button>
          <button class="difficulty-btn easy ${card.stats?.difficulty === 1 ? 'active' : ''}" data-index="${cardIndex}" data-difficulty="1" title="Easy">
          </button>
          <button class="difficulty-btn medium ${card.stats?.difficulty === 2 ? 'active' : ''}" data-index="${cardIndex}" data-difficulty="2" title="Medium">
          </button>
          <button class="difficulty-btn hard ${card.stats?.difficulty === 3 ? 'active' : ''}" data-index="${cardIndex}" data-difficulty="3" title="Hard">
          </button>
          <button class="speaker-btn action-speaker" data-type="back" data-index="${cardIndex}" title="Speak translation">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
    
    // Create a temporary container and insert after current row
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = actionRowHTML;
    const actionRow = tempDiv.firstElementChild;
    
    // Insert the action row after the current row
    let newRow = currentRow.parentNode.insertRow(currentRow.rowIndex);
    newRow.classList.add('action-row');
    let newCell = newRow.insertCell(0);
    newCell.colSpan = 3;
    newCell.innerHTML = actionRowHTML; 

    // Setup event listeners for the action row buttons
    this.setupActionRowEventListeners(newRow);
  }

  setupActionRowEventListeners(actionRow) {
    // Setup difficulty button listeners
    const difficultyBtns = actionRow.querySelectorAll('.difficulty-btn');
    difficultyBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const difficulty = parseInt(e.currentTarget.dataset.difficulty);
        const cardIndex = parseInt(e.currentTarget.dataset.index);
        
        // Handle list view difficulty
        this.handleListDifficulty(cardIndex, difficulty);
        this.revealTranslation(cardIndex);
        // Move to next card after setting difficulty
        this.moveToNextCard();
      });
    });
    
    // Setup speaker button listeners
    const speakerBtns = actionRow.querySelectorAll('.action-speaker');
    speakerBtns.forEach(btn => {
      let pressTimer;
      let isLongPress = false;
      
      const handleSpeech = async (e) => {
        const type = e.currentTarget.dataset.type;
        const cardIndex = parseInt(e.currentTarget.dataset.index);
        const card = this.cards[cardIndex];
        
        const displayWord = card.originalWord || card.word;
        const frontText = this.reverseDirection ? card.translation : displayWord;
        const backText = this.reverseDirection ? displayWord : card.translation;
        
        const textToSpeak = type === 'front' ? frontText : backText;
        const lang = type === 'front' 
          ? (this.reverseDirection ? 'en' : this.languagePairId.split('-')[0])
          : (this.reverseDirection ? this.languagePairId.split('-')[0] : 'en');
        
        // Remove existing service classes
        btn.classList.remove('local-voice', 'responsive-voice');
        
        // Speak and get the service used
        const serviceUsed = await speechService.speak(textToSpeak, lang);
        
        // Add the appropriate class to indicate which service was used
        if (serviceUsed === 'responsive') {
          btn.classList.add('responsive-voice');
        } else {
          btn.classList.add('local-voice');
        }
      };
      
      btn.addEventListener('mousedown', (e) => {
        isLongPress = false;
        pressTimer = setTimeout(() => {
          isLongPress = true;
          // Long press - handle speech with speed control
          handleSpeech(e);
        }, 500);
      });
      
      btn.addEventListener('mouseup', (e) => {
        clearTimeout(pressTimer);
        
        if (!isLongPress) {
          // Regular click - speak the text
          handleSpeech(e);
        }
      });
      
      btn.addEventListener('mouseleave', () => {
        clearTimeout(pressTimer);
      });
    });
    
    // Setup translation input and check button listeners
    const translationInput = actionRow.querySelector('.translation-input');
    const checkBtn = actionRow.querySelector('.check-translation-btn');
    
    if (translationInput && checkBtn) {
      // Input event listener to update check button state
      translationInput.addEventListener('input', () => {
        const hasText = translationInput.value.trim().length > 0;
        
        // Reset check button when user starts typing
        this.resetCheckButton(true);
        checkBtn.disabled = !hasText;
      });
      
      // Check button click listener
      checkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardIndex = parseInt(e.currentTarget.dataset.index);
        
        // Temporarily set current card index for existing checkTranslation method
        const originalCardIndex = this.currentCardIndex;
        this.currentCardIndex = cardIndex;
        
        // Call existing checkTranslation method with isList parameter
        this.checkTranslation(true);
        
        // Restore original card index
        this.currentCardIndex = originalCardIndex;
      });
      
      // Enter key press in input
      translationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && translationInput.value.trim().length > 0) {
          e.preventDefault();
          e.stopPropagation();
          const cardIndex = parseInt(translationInput.dataset.index);
          
          // Temporarily set current card index for existing checkTranslation method
          const originalCardIndex = this.currentCardIndex;
          this.currentCardIndex = cardIndex;
          
          // Call existing checkTranslation method with isList parameter
          this.checkTranslation(true);
          
          // Restore original card index
          this.currentCardIndex = originalCardIndex;
        }
      });
    }
  }

  showFirstCardPrompt() {
    const flashcard = this.container.querySelector('#flashcard');
    const cardContent = flashcard.querySelector('.card-content');
    
    // Disable navigation and difficulty buttons
    this.disableNavigationButtons(true);
    
    // Disable flip functionality by adding a class
    flashcard.classList.remove('flipped');
    
    // Replace card content with prompt
    cardContent.innerHTML = `
      <div class="prompt-card">
        <h3>This is the first card to review</h3>
        <p>Do you wish to move to the last card of the pile?</p>
        <div class="prompt-buttons">
          <button class="btn btn-primary" id="prompt-yes">Yes</button>
          <button class="btn btn-secondary-white-bg" id="prompt-no">No</button>
        </div>
      </div>
    `;
    
    // Add event listeners for prompt buttons
    const yesBtn = cardContent.querySelector('#prompt-yes');
    const noBtn = cardContent.querySelector('#prompt-no');
    
    yesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.animateCardTransition(this.cards.length - 1);
      this.disableNavigationButtons(false);
    });
    
    noBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isFlipped = false;
      flashcard.classList.remove('flipped');
      this.render(); // Just re-render the current card
      this.disableNavigationButtons(false);
    });
  }

  showLastCardPrompt() {
    const flashcard = this.container.querySelector('#flashcard');
    const cardContent = flashcard.querySelector('.card-content');
    
    // Disable navigation and difficulty buttons
    this.disableNavigationButtons(true);
    
    // Disable flip functionality by adding a class
    flashcard.classList.remove('flipped');
    
    // Replace card content with prompt
    cardContent.innerHTML = `
      <div class="prompt-card">
        <h3>You have completed reviewing the cards</h3>
        <p>Do you wish to move to the first card of the pile?</p>
        <div class="prompt-buttons">
          <button class="btn btn-primary" id="prompt-yes">Yes</button>
          <button class="btn btn-secondary-white-bg" id="prompt-no">No</button>
          <button class="btn btn-success" id="prompt-done">Done</button>
        </div>
      </div>
    `;
    
    // Add event listeners for prompt buttons
    const yesBtn = cardContent.querySelector('#prompt-yes');
    const noBtn = cardContent.querySelector('#prompt-no');
    const doneBtn = cardContent.querySelector('#prompt-done');
    
    yesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.animateCardTransition(0);
      this.disableNavigationButtons(false);
    });
    
    noBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isFlipped = false;
      flashcard.classList.remove('flipped');
      this.render();
      this.disableNavigationButtons(false);
    });
    
    doneBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onBack();
    });
  }

  disableNavigationButtons(disabled) {
    const prevBtn = this.container.querySelector('#prev-btn');
    const nextBtn = this.container.querySelector('#next-btn');
    const difficultyBtns = this.container.querySelectorAll('.difficulty-btn');
    
    if (prevBtn) prevBtn.disabled = disabled;
    if (nextBtn) nextBtn.disabled = disabled;
    difficultyBtns.forEach(btn => btn.disabled = disabled);
  }

  // Add this method to your StudyScreen class
  async animateCardTransition(nextCard = 0) {
    const flashcard = this.container.querySelector('#flashcard');
    if (!flashcard) return;
    
    // Remove accent warning when moving to different card
    this.removeAccentWarning(false);
    
    // Add flip-out animation
    flashcard.classList.add('flip-out');
    
    // Wait for flip-out animation to complete
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Update current card index
    this.currentCardIndex = nextCard;
    
    // Update progress text
    this.updateProgressText();
    
    // Update card content
    this.render();
    
    // Remove flip-out and add flip-in animation
    flashcard.classList.remove('flip-out');
    flashcard.classList.add('flip-in');
    
    // Wait for flip-in animation to complete
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Remove flip-in animation class
    flashcard.classList.remove('flip-in');
  }

  // Update the handleNext and handlePrevious methods to use the new animation
  handlePrevious() {
    if (this.currentCardIndex === 0) {
      this.showFirstCardPrompt();
    } else {
      this.animateCardTransition(this.currentCardIndex-1);
    }
  }

  handleNext() {
    if (this.currentCardIndex === this.cards.length - 1) {
      this.showLastCardPrompt();
    } else {
      this.animateCardTransition(this.currentCardIndex+1);
    }
  }
}

export default StudyScreen;
