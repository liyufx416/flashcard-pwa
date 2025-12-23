import dataSyncService from '../services/dataSyncService.js';
import speechService from '../utils/speechService.js';

class StudyScreen {
  constructor(container, languagePairId, reverseDirection, onBack) {
    this.container = container;
    this.languagePairId = languagePairId;
    this.reverseDirection = reverseDirection;
    this.onBack = onBack;
    this.cards = [];
    this.languagePair = null;
    this.currentCardIndex = 0;
    this.isFlipped = false;
    this.languagePairName = '';
    this.languagePairs = [];
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
      // Load language pairs first if not already loaded
      if (this.languagePairs.length === 0) {
        const pairsResponse = await fetch('/data/metadata.json');
        const pairsData = await pairsResponse.json();
        this.languagePairs = pairsData.languagePairs || [];
      }
      
      // Get the current language pair name
      const currentPair = this.languagePairs.find(pair => pair.id === this.languagePairId);
      this.languagePairName = currentPair ? currentPair.name : this.languagePairId;
      
      // Load language pair metadata for display
      const response = await fetch(`/data/${this.languagePairId}.json`);
      const data = await response.json();
      this.languagePair = data;

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

      // Load cards from IndexedDB with automatic sync and time filter
      this.cards = await dataSyncService.getFilteredCards(this.languagePairId, effectiveFilters, timeFilter);

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
      this.container.innerHTML = `
      <div class="study-container">
        <header class="app-header">
        <header class="app-header">
          <button id="back-btn" class="btn-icon" aria-label="Back to menu" title="Back to menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div class="header-content">
            <h1>FlashCard</h1>
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

    const currentCard = this.cards[this.currentCardIndex];
    
    // Determine front and back content based on direction
    const displayWord = currentCard.originalWord || currentCard.word;
    const frontText = this.reverseDirection ? currentCard.translation : displayWord;
    const backText = this.reverseDirection ? displayWord : currentCard.translation;
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
            <h1>FlashCard</h1>
          </div>
          <div class="language-pair">${languagePairName}</div>
        </header>
        
        <div class="screen-content">
          <div class="progress">
            Card ${this.currentCardIndex + 1} of ${this.cards.length}
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
                <div class="hint">Tap to flip</div>
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
              <button class="difficulty-btn easy" data-difficulty="1">Easy</button>
              <button class="difficulty-btn medium" data-difficulty="2">Medium</button>
              <button class="difficulty-btn hard" data-difficulty="3">Hard</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  setupEventListeners() {
    const flashcard = this.container.querySelector('#flashcard');
    const difficultyBtns = this.container.querySelectorAll('.difficulty-btn');
    const backBtn = this.container.querySelector('#back-btn');
    const speakerBtns = this.container.querySelectorAll('.speaker-btn');

    if (flashcard) {
      flashcard.addEventListener('click', (e) => {
        if (!e.target.closest('.speaker-btn')) {
          this.toggleCard();
        }
      });
    }

    speakerBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const text = btn.dataset.text;
        const lang = btn.dataset.lang;
        await speechService.speak(text, lang);
      });
    });

    difficultyBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const difficulty = parseInt(e.target.dataset.difficulty);
        this.handleDifficulty(difficulty);
      });
    });

    if (backBtn) {
      backBtn.addEventListener('click', () => this.onBack());
    }
  }

  toggleCard() {
    const flashcard = this.container.querySelector('#flashcard');
    if (flashcard) {
      flashcard.classList.toggle('flipped');
    }
  }

  async handleDifficulty(difficulty) {
    // Store the difficulty and last_reviewed timestamp in IndexedDB
    const currentCard = this.cards[this.currentCardIndex];
    
    try {
      await dataSyncService.updateCardProgress(this.languagePairId, currentCard.word, difficulty);
    } catch (error) {
      console.error('Error updating card progress:', error);
    }
    
    // Move to the next card
    this.currentCardIndex++;
    this.isFlipped = false;
    
    if (this.currentCardIndex < this.cards.length) {
      this.render();
    } else {
      // All cards reviewed
      this.container.innerHTML = `
        <div class="study-container">
          <h2>Great job!</h2>
          <p>You've reviewed all the cards.</p>
          <button id="restart-btn" class="btn btn-primary">Start Over</button>
          <button id="back-btn" class="btn btn-secondary">Back to Menu</button>
        </div>
      `;
      
      const restartBtn = this.container.querySelector('#restart-btn');
      const backBtn = this.container.querySelector('#back-btn');
      
      if (restartBtn) {
        restartBtn.addEventListener('click', () => {
          this.currentCardIndex = 0;
          this.shuffleCards();
          this.render();
        });
      }
      
      if (backBtn) {
        backBtn.addEventListener('click', () => this.onBack());
      }
    }
  }
}

export default StudyScreen;
