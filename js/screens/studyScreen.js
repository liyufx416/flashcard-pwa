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
  }

  setupEventListeners() {
    const flashcard = this.container.querySelector('#flashcard');
    const difficultyBtns = this.container.querySelectorAll('.difficulty-btn');
    const backBtn = this.container.querySelector('#back-btn');
    const speakerBtns = this.container.querySelectorAll('.speaker-btn');
    const prevBtn = this.container.querySelector('#prev-btn');
    const nextBtn = this.container.querySelector('#next-btn');

    if (flashcard) {
      flashcard.addEventListener('click', (e) => {
        const yesBtn = document.querySelector('#prompt-yes');
        if (!yesBtn) {
          if (!e.target.closest('.speaker-btn') && !e.target.closest('.difficulty-btn') && !e.target.closest('.nav-btn')) {
            this.toggleCard();
          }
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
        e.stopPropagation();
        const difficulty = parseInt(e.currentTarget.dataset.difficulty);
        this.handleDifficulty(difficulty);
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
      currentCard.stats.difficulty = difficulty;
      const difficultyBtns = this.container.querySelectorAll('.difficulty-btn');
      difficultyBtns.forEach(btn => {
        btn.classList.remove('active');
        if (difficulty === parseInt(btn.dataset.difficulty)) {
          btn.classList.add('active');
        }
      });
      await dataSyncService.updateCardProgress(this.languagePairId, currentCard.word, difficulty);
    } catch (error) {
      console.error('Error updating card progress:', error);
    }
    
    // Move to the next card
    this.handleNext();
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
          <button class="btn" id="prompt-no">No</button>
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
          <button class="btn" id="prompt-no">No</button>
        </div>
      </div>
    `;
    
    // Add event listeners for prompt buttons
    const yesBtn = cardContent.querySelector('#prompt-yes');
    const noBtn = cardContent.querySelector('#prompt-no');
    
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
    // Add flip-out animation
    flashcard.classList.add('flip-out');
    
    // Wait for the flip-out animation to complete
    await new Promise(resolve => {
      flashcard.addEventListener('animationend', resolve, { once: true });
    });
    // Update the card content
    this.currentCardIndex = nextCard;
    
    // Re-render the card
    this.isFlipped = false;
    this.render();
    
    // Get the new flashcard element
    const newFlashcard = this.container.querySelector('#flashcard');
    if (newFlashcard) {
      // Add flip-in animation
      newFlashcard.classList.add('flip-in');
      
      // Clean up the animation classes after completion
      newFlashcard.addEventListener('animationend', () => {
        newFlashcard.classList.remove('flip-in');
      }, { once: true });
    }
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
