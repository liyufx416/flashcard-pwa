import dataSyncService from '../services/dataSyncService.js';
import speechService from '../utils/speechService.js';
import AppInfoModal from '../utils/appInfoModal.js';
import TextUtils from '../utils/textUtils.js';

class WelcomeScreen {
  constructor(container, onStartStudy, onManageCards) {
    this.container = container;
    this.onStartStudy = onStartStudy;
    this.onManageCards = onManageCards;
    this.languagePairs = [];
    this.selectedLanguagePair = null;
  }

  checkResponsiveLayout() {
    // Check if manage button is visible
    const manageBtn = this.container.querySelector('#manage-cards');
    const statsSection = this.container.querySelector('.stats-section');
    
    if (manageBtn && statsSection) {
      const manageBtnRect = manageBtn.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // If manage button bottom is below viewport fold, hide stats panel
      if (manageBtnRect.bottom > viewportHeight) {
        statsSection.style.display = 'none';
        console.log('Stats panel hidden - manage button not visible');
      } else {
        statsSection.style.display = 'block';
        console.log('Stats panel visible - manage button visible');
      }
    }
  }

  show() {
    this.container.style.display = 'block';
    
    // Check if user came from search and reopen search panel
    if (this.cameFromSearch) {
      this.cameFromSearch = false; // Reset flag
      // Small delay to ensure the welcome screen is fully rendered
      setTimeout(() => {
        this.showSearchPanel();
      }, 100);
    }
  }

  getTimeFilter() {
    const savedTimeFilter = localStorage.getItem('timeFilter');
    if (!savedTimeFilter) return null;
    
    try {
      const filter = JSON.parse(savedTimeFilter);
      return filter; // Return the filter even if no period is selected
    } catch (e) {
      console.error('Error parsing time filter:', e);
    }
    return null;
  }

  async updateTimePeriodCounts() {
    if (!this.selectedLanguagePair) return;

    const timePeriodButtons = this.container.querySelectorAll('.time-period-btn');
    if (!timePeriodButtons || timePeriodButtons.length === 0) return;

    try {
      // Get current difficulty filter settings
      const difficultyFilters = this.getDifficultyFilters();
      
      // Get current time filter mode
      const currentTimeFilter = this.getTimeFilter();
      const mode = currentTimeFilter?.mode || 'only';
      
      // Get all time periods
      const periods = ['week', 'month', 'quarter', 'year'];
      
      for (const period of periods) {
        // Create time filter for each period with current mode
        const timeFilter = { mode, period };
        
        // Load counts from IndexedDB with automatic sync and time filter
        const selectedDeck = this.getSelectedDeck();
        const counts = await dataSyncService.getDifficultyCounts(this.selectedLanguagePair, timeFilter, selectedDeck);
        
        // Calculate total count based on difficulty filters
        const filteredCount =
          (difficultyFilters.new ? counts.new : 0) +
          (difficultyFilters.hard ? counts.hard : 0) +
          (difficultyFilters.medium ? counts.medium : 0) +
          (difficultyFilters.easy ? counts.easy : 0);
        
        // Find the button for this period and update its count
        const btn = Array.from(timePeriodButtons).find(b => b.dataset.period === period);
        if (btn) {
          const countSpan = btn.querySelector('.count');
          if (countSpan) {
            countSpan.textContent = filteredCount;
          }
        }
      }
    } catch (error) {
      console.error('Error updating time period counts:', error);
    }
  }

  getDifficultyFilters() {
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
    return difficultyFilters;
  }

  async updateStats() {
    if (!this.selectedLanguagePair) return;

    const totalWordsEl = this.container.querySelector('#total-words');
    const masteredWordsEl = this.container.querySelector('#mastered-words');

    if (!totalWordsEl || !masteredWordsEl) return;

    try {
      // Get counts with deck filter
      const selectedDeck = this.getSelectedDeck();
      const counts = await dataSyncService.getDifficultyCounts(this.selectedLanguagePair, null, selectedDeck);
      
      // Total words is sum of all difficulties
      const totalWords = counts.new + counts.hard + counts.medium + counts.easy;
      
      // Mastered words are those marked as easy
      const masteredWords = counts.easy;
      
      totalWordsEl.textContent = totalWords;
      masteredWordsEl.textContent = masteredWords;
    } catch (error) {
      console.error('Error updating stats:', error);
      totalWordsEl.textContent = '0';
      masteredWordsEl.textContent = '0';
    }
  }

  async updateSearchScopeCounts() {
    if (!this.selectedLanguagePair) return;

    try {
      // Get current filters with null checks
      const difficultyFilters = this.getDifficultyFilters() || {};
      const timeFilter = this.getTimeFilter(); // This can be null and that's OK
      const savedDeckKey = `selectedDeck_${this.selectedLanguagePair}`;
      let selectedDeck = localStorage.getItem(savedDeckKey) || 'all';

      // Ensure difficultyFilters is a valid object
      const safeDifficultyFilters = difficultyFilters && typeof difficultyFilters === 'object' ? difficultyFilters : {};

      let filteredCountNumber = 0;
      let deckCountNumber = 0;
      let allCountNumber = 0;

      // Get filtered count (with difficulty and time filters applied)
      try {
        const filteredCount = await dataSyncService.getFilteredCards(this.selectedLanguagePair, safeDifficultyFilters, timeFilter, selectedDeck === 'all' ? null : selectedDeck);
        filteredCountNumber = filteredCount ? filteredCount.length : 0;
      } catch (error) {
        console.error('Error getting filtered count:', error);
        filteredCountNumber = 0;
      }

      // Get deck count (all cards in selected deck)
      try {
        const deckCount = await dataSyncService.getFilteredCards(this.selectedLanguagePair, null, null, selectedDeck === 'all' ? null : selectedDeck);
        deckCountNumber = deckCount ? deckCount.length : 0;
      } catch (error) {
        console.error('Error getting deck count:', error);
        // Fallback: use filtered count if deck is 'all', otherwise 0
        if (selectedDeck === 'all') {
          deckCountNumber = filteredCountNumber;
        } else {
          deckCountNumber = 0;
        }
      }

      // Get all count (all cards in language pair)
      try {
        const allCount = await dataSyncService.getAllWords(this.selectedLanguagePair);
        allCountNumber = allCount ? allCount.length : 0;
      } catch (error) {
        console.error('Error getting all count:', error);
        // Fallback: use filtered count as approximation
        allCountNumber = filteredCountNumber;
      }

      // Update the UI
      const filteredBtn = this.container.querySelector('#search-scope-filtered .count');
      const deckBtn = this.container.querySelector('#search-scope-deck .count');
      const allBtn = this.container.querySelector('#search-scope-all .count');

      if (filteredBtn) filteredBtn.textContent = filteredCountNumber;
      if (deckBtn) deckBtn.textContent = deckCountNumber;
      if (allBtn) allBtn.textContent = allCountNumber;

    } catch (error) {
      console.error('Error updating search scope counts:', error);
    }
  }

  async updateDifficultyCounts(forceSync = false) {
    if (!this.selectedLanguagePair) return;

    const buttons = this.container.querySelectorAll('.difficulty-filter-btn');
    if (!buttons || buttons.length === 0) return;

    const startStudyBtn = this.container.querySelector('#start-study');

    try {
      // Show spinner when force syncing
      if (forceSync) {
        this.showLoadingSpinner();
      }

      // Load counts from IndexedDB with automatic sync and time filter
      const selectedDeck = this.getSelectedDeck();
      const counts = forceSync 
        ? await dataSyncService.forceSyncLanguagePair(this.selectedLanguagePair).then(() => dataSyncService.getDifficultyCounts(this.selectedLanguagePair, null, selectedDeck))
        : await dataSyncService.getDifficultyCounts(this.selectedLanguagePair, null, selectedDeck);

      buttons.forEach((btn) => {
        const key = btn.dataset.filter;
        const label = btn.dataset.label;
        if (!key || !label) return;
        const count = counts[key] ?? 0;
        const countSpan = btn.querySelector('.count');
        if (countSpan) {
          countSpan.textContent = count;
        }
      });

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

      // Also update time period counts
      this.updateTimePeriodCounts();
      
      // Update stats
      this.updateStats();

      // Get counts with time filter applied
      const timeFilter = this.getTimeFilter();
      const timeFilteredCounts = timeFilter 
        ? await dataSyncService.getDifficultyCounts(this.selectedLanguagePair, timeFilter, selectedDeck)
        : counts;

      // Calculate filtered count based on both difficulty and time filters
      const filteredCount =
        (difficultyFilters.new ? (timeFilteredCounts.new || 0) : 0) +
        (difficultyFilters.hard ? (timeFilteredCounts.hard || 0) : 0) +
        (difficultyFilters.medium ? (timeFilteredCounts.medium || 0) : 0) +
        (difficultyFilters.easy ? (timeFilteredCounts.easy || 0) : 0);
      if (startStudyBtn) {
        startStudyBtn.disabled = !this.selectedLanguagePair || filteredCount === 0;
      }
    } catch (error) {
      console.error('Error loading card counts:', error);
    } finally {
      // Always hide spinner when done
      if (forceSync) {
        this.hideLoadingSpinner();
      }
    }
  }

  async loadLanguagePairs() {
    try {
      // Initialize language pair metadata from metadata.json if needed
      await dataSyncService.initializeLanguagePairMetadata();

      // Get all language pairs with metadata
      this.languagePairs = await dataSyncService.getAllLanguagePairMetadata();
      
      // Sort alphabetically by name
      this.languagePairs.sort((a, b) => a.name.localeCompare(b.name));
      
      // Get saved language pair or use the first one
      const savedLanguagePair = localStorage.getItem('selectedLanguagePair');
      this.selectedLanguagePair = savedLanguagePair || 
        (this.languagePairs.length > 0 ? this.languagePairs[0].id : null);
      
      this.render();
      
      // Load decks after rendering
      this.loadDecks();
    } catch (error) {
      console.error('Error loading language pairs:', error);
    }
  }

  
  getAvailableLanguagePairs() {
    return this.languagePairs ? this.languagePairs.map(pair => pair.id) : [];
  }

  getSelectedLanguagePair() {
    return this.selectedLanguagePair;
  }

  getSelectedDeck() {
    const deckSelect = this.container.querySelector('#deck-select');
    return deckSelect ? deckSelect.value : 'all';
  }

  async loadDecks() {
    if (!this.selectedLanguagePair) return;

    try {
      // Ensure data is loaded first
      await dataSyncService.ensureDataLoaded(this.selectedLanguagePair);
      
      // Get all decks for the current language pair
      const decks = await dataSyncService.getAllDecks(this.selectedLanguagePair);
      const deckSelector = this.container.querySelector('#deck-selector');
      const deckSelect = this.container.querySelector('#deck-select');

      if (decks.length > 0 && deckSelector && deckSelect) {
        // Show deck selector
        deckSelector.style.display = 'block';
        
        // Get total card count for "All Cards"
        const totalCards = await dataSyncService.getDifficultyCounts(this.selectedLanguagePair);
        const totalCardCount = totalCards.new + totalCards.hard + totalCards.medium + totalCards.easy;
        
        // Clear existing options and add "All Cards" with count
        deckSelect.innerHTML = `<option value="all">Deck: All Cards (${totalCardCount} cards)</option>`;
        
        // Add deck options with card counts
        for (const deck of decks) {
          const option = document.createElement('option');
          option.value = deck.deckName;
          
          let cardCount;
          if (deck.startRank !== undefined) {
            // Rank-based deck - get count by filtering cards by rank range
            const deckCounts = await dataSyncService.getDifficultyCounts(this.selectedLanguagePair, null, deck.deckName);
            cardCount = deckCounts.new + deckCounts.hard + deckCounts.medium + deckCounts.easy;
          } else {
            // Card-based deck - use explicit card list
            cardCount = deck.cards ? deck.cards.length : 0;
          }
          
          option.textContent = `Deck: ${deck.deckName} (${cardCount} cards)`;
          deckSelect.appendChild(option);
        }

        // Restore saved deck selection for current language pair
        const savedDeckKey = `selectedDeck_${this.selectedLanguagePair}`;
        let savedDeck = localStorage.getItem(savedDeckKey);
        
        // Migrate old global deck selection if this is the first load for this language pair
        if (!savedDeck) {
          const oldGlobalDeck = localStorage.getItem('selectedDeck');
          if (oldGlobalDeck && oldGlobalDeck !== 'all') {
            // Check if the old deck exists for this language pair
            if (decks.some(deck => deck.deckName === oldGlobalDeck)) {
              savedDeck = oldGlobalDeck;
              localStorage.setItem(savedDeckKey, savedDeck);
            }
          }
          // Clean up old global deck selection
          localStorage.removeItem('selectedDeck');
        }
        
        if (savedDeck && decks.some(deck => deck.deckName === savedDeck)) {
          deckSelect.value = savedDeck;
        } else {
          // Default to "All Cards" if no saved deck for this language pair
          deckSelect.value = 'all';
        }
        
        // Update all counts to reflect the selected deck
        this.updateDifficultyCounts();
        this.updateStats();
        this.updateTimePeriodCounts();
      } else if (deckSelector) {
        // Hide deck selector if no decks
        deckSelector.style.display = 'none';
        
        // Still update counts for "All Cards" (which is the default)
        this.updateDifficultyCounts();
        this.updateStats();
        this.updateTimePeriodCounts();
      }
    } catch (error) {
      console.error('Error loading decks:', error);
      // Retry after a short delay
      /*
      setTimeout(() => {
        this.loadDecks();
      }, 1000);
      */
    }
  }

  render() {
    const savedReverseDirection = localStorage.getItem('reverseDirection');
    const reverseDirectionChecked = savedReverseDirection === 'true';

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
    this.container.innerHTML = `
      <div class="welcome-container">
        <header class="app-header">
          <div class="header-placeholder"></div>
          <div class="header-content">
            <h1 class="app-title clickable">FlashCard</h1>
          </div>
          <div class="header-placeholder"></div>
        </header>
        <div class="screen-content">
          <div class="language-selector">
            <div class="language-selector-row">
              <label for="language-pair">Learning: </label>
              <div class="direction-toggle">
                <label class="toggle-switch">
                  <input type="checkbox" id="reverse-direction" ${reverseDirectionChecked ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
                <span class="toggle-label">Reverse Direction</span>
              </div>
            </div>
            <select id="language-pair" class="form-select">
              ${this.languagePairs.map(pair => 
                `<option value="${pair.id}" ${this.selectedLanguagePair === pair.id ? 'selected' : ''}>
                  ${pair.name}
                </option>`
              ).join('')}
              <option value="import-data">Import data...</option>
            </select>
            <!-- Hidden file input for import -->
            <input type="file" id="import-file-input" accept=".json" style="display: none;">
            <div class="deck-selector" id="deck-selector" style="display: none;">
            <select id="deck-select" class="form-select">
            <option value="all">Deck: All Cards</option>
            </select>
            </div>
          </div>
          <div class="stats-section">
            <div class="stats-content">
              <div class="stat-item">
                <span class="stat-value" id="total-words">0</span>
                <span class="stat-label">Total Card</span>
              </div>
              <div class="stat-item">
                <span class="stat-value-mastered" id="mastered-words">0</span>
                <span class="stat-label">Mastered</span>
              </div>
            </div>
          </div>
          <div class="difficulty-filters" role="group" aria-label="Difficulty Filters">
            <button type="button" class="difficulty-filter-btn ${difficultyFilters.new ? 'active' : ''}" data-filter="new" data-label="New" aria-pressed="${difficultyFilters.new}">
              <span>New</span>
              <span class="count">0</span>
            </button>
            <button type="button" class="difficulty-filter-btn ${difficultyFilters.hard ? 'active' : ''}" data-filter="hard" data-label="Hard" aria-pressed="${difficultyFilters.hard}">
              <span>Hard</span>
              <span class="count">0</span>
            </button>
            <button type="button" class="difficulty-filter-btn ${difficultyFilters.medium ? 'active' : ''}" data-filter="medium" data-label="Medium" aria-pressed="${difficultyFilters.medium}">
              <span>Medium</span>
              <span class="count">0</span>
            </button>
            <button type="button" class="difficulty-filter-btn ${difficultyFilters.easy ? 'active' : ''}" data-filter="easy" data-label="Easy" aria-pressed="${difficultyFilters.easy}">
              <span>Easy</span>
              <span class="count">0</span>
            </button>
          </div>
          ${this.renderTimeFilter()}
          <div class="button-container">
            <div class="study-search-row">
              <button id="start-study" class="btn btn-primary study-btn">Start Studying</button>
              <button id="search-btn" class="btn btn-secondary search-btn" title="Search words">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
              </button>
            </div>
            <button id="manage-cards" class="btn btn-secondary">Manage Cards</button>
          </div>
          <div id="search-panel" class="search-panel hidden">
            <div class="search-panel-content">
              <div class="search-header">
                <h3>Search</h3>
                <button id="search-target-word" class="search-target-btn active" data-target="word" style="min-width: 4rem;">
                  Word
                </button>
                <button id="search-target-translation" class="search-target-btn" data-target="translation" style="min-width: 6.5rem;">
                  Translation
                </button>
                <button id="close-search" class="close-btn">×</button>
              </div>
              <div class="search-input-container">
                <input type="text" id="search-input" placeholder="Enter search pattern..." class="search-input" list="search-history" autocomplete="off">
                <datalist id="search-history"></datalist>
              </div>
              <div class="search-scope-container">
                <span class="search-scope-label">In </span>
                <button id="search-scope-filtered" class="search-scope-btn active" data-scope="filtered">
                  Filtered
                  <Div class="count">0</Div>
                </button>
                <button id="search-scope-deck" class="search-scope-btn" data-scope="deck">
                  Deck
                  <Div class="count">0</Div>
                </button>
                <button id="search-scope-all" class="search-scope-btn" data-scope="all">
                  All
                  <Div class="count">0</Div>
                </button>
              </div>
              <div class="search-buttons">
                <button id="exact-search-btn" class="btn btn-primary">Exact Word</button>
                <button id="partial-search-btn" class="btn btn-secondary">Partial Match</button>
                <button id="fuzzy-search-btn" class="btn btn-secondary">Fuzzy Match</button>
              </div>
            </div>
          </div>
        
        <!-- Loading Spinner Overlay -->
        <div class="loading-overlay" id="loading-overlay" style="display: none;">
          <div class="spinner-container">
            <div class="spinner"></div>
            <p class="loading-text">Loading language data...</p>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  renderTimeFilter() {
    const savedTimeFilter = localStorage.getItem('timeFilter');
    let timeFilterMode = 'only';
    let selectedPeriod = null;
    
    if (savedTimeFilter) {
      try {
        const filter = JSON.parse(savedTimeFilter);
        timeFilterMode = filter.mode || 'only';
        selectedPeriod = filter.period || null;
      } catch (e) {
        // Use defaults
      }
    }

    return `
      <div class="time-filter-section">
        <div class="time-filter-header">
          <span class="time-filter-label">Reviewed:</span>
          <div class="time-filter-toggle">
            <button type="button" class="time-mode-btn ${timeFilterMode === 'only' ? 'active' : ''}" data-mode="only">Only</button>
            <button type="button" class="time-mode-btn ${timeFilterMode === 'not' ? 'active' : ''}" data-mode="not">Not</button>
          </div>
        </div>
        <div class="time-period-filters" role="group" aria-label="Time Period Filters">
          <button type="button" class="time-period-btn ${selectedPeriod === 'week' ? 'active' : ''}" data-period="week" data-label="Week">
            <span>Week</span>
            <span class="count">0</span>
          </button>
          <button type="button" class="time-period-btn ${selectedPeriod === 'month' ? 'active' : ''}" data-period="month" data-label="Month">
            <span>Month</span>
            <span class="count">0</span>
          </button>
          <button type="button" class="time-period-btn ${selectedPeriod === 'quarter' ? 'active' : ''}" data-period="quarter" data-label="Quarter">
            <span>Quarter</span>
            <span class="count">0</span>
          </button>
          <button type="button" class="time-period-btn ${selectedPeriod === 'year' ? 'active' : ''}" data-period="year" data-label="Year">
            <span>Year</span>
            <span class="count">0</span>
          </button>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const languageSelect = this.container.querySelector('#language-pair');
    const deckSelect = this.container.querySelector('#deck-select');
    const startStudyBtn = this.container.querySelector('#start-study');
    const searchBtn = this.container.querySelector('#search-btn');
    const manageCardsBtn = this.container.querySelector('#manage-cards');
    const reverseDirection = this.container.querySelector('#reverse-direction');
    const filterButtons = this.container.querySelectorAll('.difficulty-filter-btn');
    const timeModeButtons = this.container.querySelectorAll('.time-mode-btn');
    const timePeriodButtons = this.container.querySelectorAll('.time-period-btn');
    const testSpeechBtn = this.container.querySelector('#test-speech');
    const clearApiKeyBtn = this.container.querySelector('#clear-api-key');
    const appTitle = this.container.querySelector('.app-title');

    if (reverseDirection) {
      const savedReverseDirection = localStorage.getItem('reverseDirection');
      reverseDirection.checked = savedReverseDirection === 'true';
      reverseDirection.addEventListener('change', (e) => {
        localStorage.setItem('reverseDirection', e.target.checked);
      });
    }

    if (filterButtons && filterButtons.length > 0) {
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

      const persistDifficultyFilters = () => {
        localStorage.setItem('difficultyFilters', JSON.stringify(difficultyFilters));
      };

      filterButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.filter;
          if (!key) return;

          const next = !difficultyFilters[key];
          const nextFilters = {
            ...difficultyFilters,
            [key]: next,
          };

          const anyEnabled = Object.values(nextFilters).some(Boolean);
          if (!anyEnabled) {
            return;
          }

          difficultyFilters = nextFilters;
          persistDifficultyFilters();

          btn.classList.toggle('active', difficultyFilters[key]);
          btn.setAttribute('aria-pressed', String(difficultyFilters[key]));

          this.updateDifficultyCounts();
        });
      });

      persistDifficultyFilters();
    }

    // Time filter mode toggle (Only/Not)
    if (timeModeButtons && timeModeButtons.length > 0) {
      timeModeButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const mode = btn.dataset.mode;
          
          // Update active state
          timeModeButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          
          // Save to localStorage
          const currentFilter = this.getTimeFilter() || { mode: 'only', period: null };
          currentFilter.mode = mode;
          localStorage.setItem('timeFilter', JSON.stringify(currentFilter));
          
          // Update counts if a period is selected
          if (currentFilter.period) {
            this.updateDifficultyCounts();
          } else {
            // If no period selected, still update time period counts to show "Only" vs "Not" mode
            this.updateTimePeriodCounts();
          }
        });
      });
    }

    // Time period buttons
    if (timePeriodButtons && timePeriodButtons.length > 0) {
      timePeriodButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const period = btn.dataset.period;
          const isActive = btn.classList.contains('active');
          
          // Toggle behavior: if clicking active button, deactivate it
          if (isActive) {
            btn.classList.remove('active');
            localStorage.removeItem('timeFilter');
          } else {
            // Deactivate all other period buttons
            timePeriodButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Get current mode
            const savedTimeFilter = localStorage.getItem('timeFilter');
            let mode = 'only';
            if (savedTimeFilter) {
              try {
                const filter = JSON.parse(savedTimeFilter);
                mode = filter.mode || 'only';
              } catch (e) {
                // Use default
              }
            }
            
            // Save to localStorage
            localStorage.setItem('timeFilter', JSON.stringify({ mode, period }));
          }
          
          // Update counts
          this.updateDifficultyCounts();
        });
      });
    }

    this.updateDifficultyCounts();

    // Add click handler to detect clicks on import option only when it's already selected
    languageSelect.addEventListener('click', (e) => {
      const selectedValue = e.target.value;
      // Only trigger on click if import is already selected (no language pairs case)
      if (selectedValue === 'import-data' && this.languagePairs.length === 0) {
        this.triggerImport();
      }
    });

    languageSelect.addEventListener('change', (e) => {
      const selectedValue = e.target.value;
      
      // Handle import option
      if (selectedValue === 'import-data') {
        this.triggerImport();
        return;
      }
      
      this.selectedLanguagePair = selectedValue;
      startStudyBtn.disabled = !this.selectedLanguagePair;
      // Save selection to localStorage
      if (this.selectedLanguagePair) {
        localStorage.setItem('selectedLanguagePair', this.selectedLanguagePair);
      }

      // Reset deck selector to "All Cards" temporarily to avoid incorrect filtering
      const deckSelect = this.container.querySelector('#deck-select');
      if (deckSelect) {
        deckSelect.value = 'all';
      }
      
      // Update counts with "All Cards" first, then load decks
      this.updateDifficultyCounts(true); // Force sync when language changes
      this.updateStats();
      this.updateTimePeriodCounts();
      
      // Load decks for new language pair (will restore appropriate deck selection)
      this.loadDecks();
    });

    // Deck selector event listener
    if (deckSelect) {
      deckSelect.addEventListener('change', (e) => {
        // Save selection to localStorage with language pair specific key
        const deckKey = `selectedDeck_${this.selectedLanguagePair}`;
        localStorage.setItem(deckKey, e.target.value);
        
        // Update all counts and UI for selected deck
        this.updateDifficultyCounts();
        this.updateStats();
        this.updateTimePeriodCounts();
      });
    }

    startStudyBtn.addEventListener('click', () => {
      if (this.selectedLanguagePair) {
        const selectedDeck = this.getSelectedDeck();
        this.onStartStudy(this.selectedLanguagePair, reverseDirection.checked, null, selectedDeck);
      }
    });

    // Import file input event listener
    const importFileInput = this.container.querySelector('#import-file-input');
    if (importFileInput) {
      importFileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }

    // Search functionality
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        this.showSearchPanel();
      });
    }

    manageCardsBtn.addEventListener('click', () => {
      this.onManageCards();
    });

    // Speech settings event listeners
    this.updateSpeechStatus();

    if (testSpeechBtn) {
      testSpeechBtn.addEventListener('click', async () => {
        try {
          await speechService.testResponsiveVoice('Hello, this is a test of ResponsiveVoice for Spanish: Hola mundo.', 'es');
          alert('ResponsiveVoice test successful!');
        } catch (error) {
          alert('Speech test failed: ' + error.message);
        }
      });
    }

    if (clearApiKeyBtn) {
      clearApiKeyBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the ResponsiveVoice API key?')) {
          speechService.clearApiKey();
          this.updateSpeechStatus();
          alert('API key cleared successfully');
        }
      });
    }

    // Add click listener for app title
    if (appTitle) {
      appTitle.addEventListener('click', () => {
        AppInfoModal.show();
      });
    }

    // Add responsive layout check
    this.checkResponsiveLayout();
    
    // Add resize listener for responsive behavior
    window.addEventListener('resize', () => {
      this.checkResponsiveLayout();
    });
  }

  updateSpeechStatus() {
    const statusElement = this.container.querySelector('#fallback-status');
    if (statusElement) {
      const status = speechService.getResponsiveVoiceStatus();
      if (status.enabled && status.loaded) {
        statusElement.textContent = `Configured (${status.apiKey})`;
        statusElement.style.color = '#28a745';
      } else if (status.enabled && !status.loaded) {
        statusElement.textContent = 'Loading...';
        statusElement.style.color = '#ffc107';
      } else if (!status.enabled) {
        statusElement.textContent = 'Not configured';
        statusElement.style.color = '#6c757d';
      } else {
        statusElement.textContent = 'Error';
        statusElement.style.color = '#dc3545';
      }
    }
  }

  saveSearchConfig() {
    const config = {
      searchTarget: this.selectedSearchTarget,
      searchScope: this.selectedSearchScope,
      lastSearchTerm: this.lastSearchTerm || ''
    };
    localStorage.setItem('searchConfig', JSON.stringify(config));
  }

  loadSearchConfig() {
    try {
      const config = localStorage.getItem('searchConfig');
      if (config) {
        const parsedConfig = JSON.parse(config);
        this.selectedSearchTarget = parsedConfig.searchTarget || 'word';
        this.selectedSearchScope = parsedConfig.searchScope || 'deck';
        this.lastSearchTerm = parsedConfig.lastSearchTerm || '';
        return true;
      } else {
        this.selectedSearchTarget = 'word';
        this.selectedSearchScope = 'deck';
      }
    } catch (error) {
      console.error('Error loading search config:', error);
    }
    return false;
  }

  showSearchPanel() {
    const searchPanel = this.container.querySelector('#search-panel');
    const searchInput = this.container.querySelector('#search-input');
    const closeBtn = this.container.querySelector('#close-search');
    const exactSearchBtn = this.container.querySelector('#exact-search-btn');
    const partialSearchBtn = this.container.querySelector('#partial-search-btn');
    const fuzzySearchBtn = this.container.querySelector('#fuzzy-search-btn');
    const searchTargetWord = this.container.querySelector('#search-target-word');
    const searchTargetTranslation = this.container.querySelector('#search-target-translation');

    if (!searchPanel || !searchInput) return;

    // Initialize event listeners array if not already initialized
    if (!this.searchPanelEventListeners) {
      this.searchPanelEventListeners = [];
    }

    // Show the panel
    searchPanel.classList.remove('hidden');
    
    // Load search configuration
    this.loadSearchConfig();
    
    // Set the appropriate search targets button as active
    searchTargetWord.classList.remove('active');
    searchTargetTranslation.classList.remove('active');
    if (this.selectedSearchTarget === 'word') {
      searchTargetWord.classList.add('active');
    } else if (this.selectedSearchTarget === 'translation') {
      searchTargetTranslation.classList.add('active');
    } else if (this.selectedSearchTarget === 'both') {
      searchTargetWord.classList.add('active');
      searchTargetTranslation.classList.add('active');
    }
    
    // Restore search scope buttons
    const searchScopeBtns = this.container.querySelectorAll('.search-scope-btn');
    searchScopeBtns.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.scope === this.selectedSearchScope) {
        btn.classList.add('active');
      }
    });
    
    // Restore last search term
    if (this.lastSearchTerm) {
      searchInput.value = this.lastSearchTerm;
    }
    
    // Focus on search input
    searchInput.removeAttribute('list');
    searchInput.focus();
    
    // Update search scope counts
    this.updateSearchScopeCounts();

    // Clear any previous error state
    searchInput.classList.remove('search-input-error');

    // Close button
    if (closeBtn) {
      const closeHandler = () => {
        this.cleanupSearchPanel();
      };
      closeBtn.onclick = closeHandler;
      this.searchPanelEventListeners.push({ type: 'click', handler: closeHandler, target: closeBtn });
    }
    // Update datalist and simulate a click to trigger it naturally
    this.updateSearchHistoryDatalist();
    
    // Simulate a click to trigger the datalist dropdown
    setTimeout(() => {
      searchInput.setAttribute('list', 'search-history');
    }, 100);

    // Close panel when clicking outside (only if search input is empty)
    const closeOnOutsideClick = (e) => {
      // Check if click is outside the search panel and not on the search button
      if (searchPanel==e.target || !searchPanel.contains(e.target)) {
        // Only close if search input is empty or whitespace
        if (searchInput.value.trim() === '') {
          this.cleanupSearchPanel();
        }
      }
    };

    // Add outside click listener with a small delay to prevent immediate closing
    setTimeout(() => {
      document.addEventListener('click', closeOnOutsideClick);
      this.searchPanelEventListeners.push({ type: 'click', handler: closeOnOutsideClick, target: document });
    }, 100);

    // Close button
    if (closeBtn) {
      const closeHandler = () => {
        this.cleanupSearchPanel();
      };
      closeBtn.onclick = closeHandler;
      this.searchPanelEventListeners.push({ type: 'click', handler: closeHandler, target: closeBtn });
    }

    // Exact search button
    if (exactSearchBtn) {
      const exactSearchHandler = () => {
        this.performSearch('exact');
      };
      exactSearchBtn.onclick = exactSearchHandler;
      this.searchPanelEventListeners.push({ type: 'click', handler: exactSearchHandler, target: exactSearchBtn });
    }

    // Partial search button
    if (partialSearchBtn) {
      const partialSearchHandler = () => {
        this.performSearch('partial');
      };
      partialSearchBtn.onclick = partialSearchHandler;
      this.searchPanelEventListeners.push({ type: 'click', handler: partialSearchHandler, target: partialSearchBtn });
    }

    // Fuzzy search button
    if (fuzzySearchBtn) {
      const fuzzySearchHandler = () => {
        this.performSearch('fuzzy');
      };
      fuzzySearchBtn.onclick = fuzzySearchHandler;
      this.searchPanelEventListeners.push({ type: 'click', handler: fuzzySearchHandler, target: fuzzySearchBtn });
    }

    if (searchTargetWord && searchTargetTranslation){
      const searchTargetWordHandler = () => {
        if (searchTargetWord.classList.contains('active')) {
          if (searchTargetTranslation.classList.contains('active')) {
            searchTargetWord.classList.remove('active');
            this.selectedSearchTarget = 'translation';
          }
        } else {
          searchTargetWord.classList.add('active');
          if (!searchTargetTranslation.classList.contains('active')) {
            this.selectedSearchTarget = 'word';
          } else {
            this.selectedSearchTarget = 'both';
          }
        }
        // Save configuration
        this.saveSearchConfig();
      };
      searchTargetWord.onclick = searchTargetWordHandler;
      this.searchPanelEventListeners.push({ type: 'click', handler: searchTargetWordHandler, target: searchTargetWord });

      const searchTargetTranslationHandler = () => {
        if (searchTargetTranslation.classList.contains('active')) {
          if (searchTargetWord.classList.contains('active')) {
            searchTargetTranslation.classList.remove('active');
            this.selectedSearchTarget = 'word';
          }
        } else {
          searchTargetTranslation.classList.add('active');
          if (!searchTargetWord.classList.contains('active')) {
            this.selectedSearchTarget = 'translation';
          } else {
            this.selectedSearchTarget = 'both';
          }
        }
        // Save configuration
        this.saveSearchConfig();
      };
      searchTargetTranslation.onclick = searchTargetTranslationHandler;
      this.searchPanelEventListeners.push({ type: 'click', handler: searchTargetTranslationHandler, target: searchTargetTranslation });
    }

    // Search scope buttons
    const scopeBtns = this.container.querySelectorAll('.search-scope-btn');
    scopeBtns.forEach(btn => {
      const scopeHandler = () => {
        // Remove active class from all scope buttons
        scopeBtns.forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        btn.classList.add('active');
        
        // Store the selected scope
        this.selectedSearchScope = btn.dataset.scope;
        console.log(`Search scope changed to: ${this.selectedSearchScope}`);
        // Save configuration
        this.saveSearchConfig();
      };
      btn.onclick = scopeHandler;
      this.searchPanelEventListeners.push({ type: 'click', handler: scopeHandler, target: btn });
    });

    // Save search term as user types
    const inputHandler = () => {
      this.lastSearchTerm = searchInput.value;
      this.saveSearchConfig();
    };
    searchInput.oninput = inputHandler;
    this.searchPanelEventListeners.push({ type: 'input', handler: inputHandler, target: searchInput });

    // Enter key to search, Escape to close
    const keyHandler = (e) => {
      if (e.key === 'Enter') {
        this.performSearch('exact'); // Default to exact search on Enter
      } else if (e.key === 'Escape') {
        this.cleanupSearchPanel();
      }
    };
    searchInput.onkeydown = keyHandler;
    this.searchPanelEventListeners.push({ type: 'keydown', handler: keyHandler, target: searchInput });

    // Also close on Escape key anywhere in the panel
    const closeOnEscape = (e) => {
      if (e.key === 'Escape') {
        this.cleanupSearchPanel();
      }
    };

    document.addEventListener('keydown', closeOnEscape);
    this.searchPanelEventListeners.push({ type: 'keydown', handler: closeOnEscape, target: document });
  }

  cleanupSearchPanel() {
    // Clean up all event listeners
    if (this.searchPanelEventListeners) {
      this.searchPanelEventListeners.forEach(listener => {
        if (listener.target === document) {
          listener.target.removeEventListener(listener.type, listener.handler);
        } else if (listener.target) {
          listener.target.onclick = null;
          listener.target.onkeydown = null;
        }
      });
      if (!this.cameFromSearch) {
        this.lastSearchTerm = '';
        this.saveSearchConfig();
      }
      this.searchResults = null;
      this.deckFilter = null;
      this.searchPanelEventListeners = [];
      this.selectedSearchScope = 'filtered'; // Default search scope
      this.selectedSearchTarget = 'word'; // Default search target
      this.cameFromSearch = false; // Track if user came from search panel
    }
    
    this.hideSearchPanel();
  }
  hideSearchPanel() {
    const searchPanel = this.container.querySelector('#search-panel');
    const searchInput = this.container.querySelector('#search-input');
    
    if (searchPanel) {
      searchPanel.classList.add('hidden');
    }
    if (searchInput) {
      searchInput.value = '';
    }
  }

  getSearchHistory() {
    try {
      const history = localStorage.getItem('searchHistory');
      return history ? JSON.parse(history) : [];
    } catch (e) {
      console.error('Error parsing search history:', e);
      return [];
    }
  }

  saveSearchHistory(searchTerm) {
    if (!searchTerm || !searchTerm.trim()) return;
    
    const term = searchTerm.trim().toLowerCase();
    let history = this.getSearchHistory();
    
    // Remove if already exists (to move to top)
    history = history.filter(item => item.toLowerCase() !== term);
    
    // Add to beginning
    history.unshift(term);
    
    // Keep only 10 most recent
    history = history.slice(0, 10);
    
    try {
      localStorage.setItem('searchHistory', JSON.stringify(history));
    } catch (e) {
      console.error('Error saving search history:', e);
    }
  }

  updateSearchHistoryDatalist() {
    const datalist = this.container.querySelector('#search-history');
    if (!datalist) return;
    
    const history = this.getSearchHistory();
    
    // Clear existing options
    datalist.innerHTML = '';
    
    // Add history items as options
    history.forEach(term => {
      const option = document.createElement('option');
      option.value = term;
      datalist.appendChild(option);
    });
  }

  async performSearch(searchMode) {
    const searchInput = this.container.querySelector('#search-input');
    const searchTerm = searchInput.value.trim();
    
    if (!searchTerm) {
      // Focus on search input and add animated highlight
      searchInput.focus();
      searchInput.classList.add('search-input-error');
      
      // Remove highlight after animation
      setTimeout(() => {
        searchInput.classList.remove('search-input-error');
      }, 2000);
      
      return;
    }

    if (!this.selectedLanguagePair) {
      alert('Please select a language pair first');
      return;
    }

    try {
      // Get the current difficulty, time, and deck filters with null checks
      const difficultyFilters = this.getDifficultyFilters() || {};
      const timeFilter = this.getTimeFilter(); // This can be null and that's OK
      const selectedDeck = this.getSelectedDeck() || 'all';

      // Ensure difficultyFilters is a valid object
      const safeDifficultyFilters = difficultyFilters && typeof difficultyFilters === 'object' ? difficultyFilters : {};

      // Get cards based on selected search scope
      let searchBaseCards;
      
      switch (this.selectedSearchScope) {
        case 'filtered':
          // Filtered: Cards with difficulty, time, and deck filters applied
          searchBaseCards = await dataSyncService.getFilteredCards(this.selectedLanguagePair, safeDifficultyFilters, timeFilter, selectedDeck === 'all' ? null : selectedDeck);
          break;
        case 'deck':
          // Deck: All cards in selected deck (no difficulty or time filters)
          searchBaseCards = await dataSyncService.getFilteredCards(this.selectedLanguagePair, null, null, selectedDeck === 'all' ? null : selectedDeck);
          break;
        case 'all':
          // All: All cards in language pair (no filters)
          searchBaseCards = await dataSyncService.getFilteredCards(this.selectedLanguagePair, null, null, null);
          break;
        default:
          // Default to filtered
          searchBaseCards = await dataSyncService.getFilteredCards(this.selectedLanguagePair, safeDifficultyFilters, timeFilter, selectedDeck === 'all' ? null : selectedDeck);
      }
      
      if (!searchBaseCards || searchBaseCards.length === 0) {
        const scopeName = this.selectedSearchScope.charAt(0).toUpperCase() + this.selectedSearchScope.slice(1);
        alert(`No words available in ${scopeName} scope. Please try a different scope or adjust your filters.`);
        return;
      }

      console.log(`Searching in ${this.selectedSearchScope} scope with ${searchBaseCards.length} cards`);

      let searchResults;
      
      if (searchMode === 'exact') {
        // Exact word match with word boundaries (accent-insensitive)
        const searchTermLower = searchTerm.toLowerCase();
        
        // Create accent-insensitive regex to match whole word boundaries
        const wordRegex = TextUtils.createAccentInsensitiveRegex(searchTerm);
        
        searchResults = searchBaseCards.filter(word => {
          // Check if search term matches based on selected target
          let wordMatch = false;
          let translationMatch = false;
          
          if (this.selectedSearchTarget === 'both' || this.selectedSearchTarget === 'word') {
            wordMatch = wordRegex.test(TextUtils.removeAccents(word.word));
          }
          if (this.selectedSearchTarget === 'both' || this.selectedSearchTarget === 'translation') {
            translationMatch = wordRegex.test(TextUtils.removeAccents(word.translation));
          }
          
          return wordMatch || translationMatch;
        });
      } else if (searchMode === 'partial') {
        // Partial match (accent-insensitive)
        const searchTermNoAccents = TextUtils.createAccentInsensitiveTerm(searchTerm);
        
        searchResults = searchBaseCards.filter(word => {
          // Check if search term matches based on selected target
          let wordMatch = false;
          let translationMatch = false;
          
          if (this.selectedSearchTarget === 'both' || this.selectedSearchTarget === 'word') {
            wordMatch = TextUtils.accentInsensitiveMatch(word.word, searchTerm);
          }
          if (this.selectedSearchTarget === 'both' || this.selectedSearchTarget === 'translation') {
            translationMatch = TextUtils.accentInsensitiveMatch(word.translation, searchTerm);
          }
          
          return wordMatch || translationMatch;
        });
      } else {
        // Fuzzy search using Fuse.js with accent-insensitive matching
        const searchTermNoAccents = TextUtils.createAccentInsensitiveTerm(searchTerm);
        
        // Create accent-free versions of words for fuzzy matching based on selected target
        let wordsNoAccents;
        if (this.selectedSearchTarget === 'both' || this.selectedSearchTarget === 'word') {
          wordsNoAccents = searchBaseCards.map(word => ({
            ...word,
            wordNoAccents: TextUtils.removeAccents(word.word)
          }));
        } else if (this.selectedSearchTarget === 'translation') {
          wordsNoAccents = searchBaseCards.map(word => ({
            ...word,
            translationNoAccents: TextUtils.removeAccents(word.translation)
          }));
        } else {
          // Both - include both word and translation
          wordsNoAccents = searchBaseCards.map(word => ({
            ...word,
            wordNoAccents: TextUtils.removeAccents(word.word),
            translationNoAccents: TextUtils.removeAccents(word.translation)
          }));
        }
        
        const fuseOptions = {
          keys: this.selectedSearchTarget === 'both' ? ['wordNoAccents', 'translationNoAccents'] : 
                this.selectedSearchTarget === 'word' ? ['wordNoAccents'] : ['translationNoAccents'],
          threshold: 0.3, // Lower threshold = more strict matching
          isCaseSensitive: false,
          includeScore: true,
          ignoreLocation: true,
          tokenize: true,
          minMatchCharLength: 2
        };

        const fuse = new Fuse(wordsNoAccents, fuseOptions);
        const fuseResults = fuse.search(searchTermNoAccents);
        searchResults = fuseResults.map(result => result.item);
      }

      if (searchResults.length === 0) {
        alert(`No words found matching "${searchTerm}"`);
        // Don't cleanup - let the user close the panel manually
        return;
      }

      // Save search term to history
      this.saveSearchHistory(searchTerm);

      // Clean up and hide search panel
      this.cameFromSearch = true; // Mark that user came from search
      this.cleanupSearchPanel();

      // Start study session with search results
      const searchModeText = searchMode === 'exact' ? 'exact word' : searchMode === 'partial' ? 'partial' : 'fuzzy';
      console.log(`Found ${searchResults.length} words matching "${searchTerm}" (${searchModeText} match)`);
      this.onStartStudy(this.selectedLanguagePair, this.container.querySelector('#reverse-direction').checked, searchResults);

    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed: ' + error.message);
    }
  }

  showLoadingSpinner() {
    const overlay = this.container.querySelector('#loading-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
    }
  }

  hideLoadingSpinner() {
    const overlay = this.container.querySelector('#loading-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  triggerImport() {
    const fileInput = this.container.querySelector('#import-file-input');
    if (fileInput) {
      fileInput.click();
    }
    
    // Reset selector to a valid state after file selection
    setTimeout(() => {
      const languageSelect = this.container.querySelector('#language-pair');
      if (this.languagePairs.length > 0) {
        languageSelect.value = this.selectedLanguagePair || this.languagePairs[0].id;
      } else {
        languageSelect.value = 'import-data';
      }
    }, 100);
  }

  async handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    if (!file.name.endsWith('.json')) {
      alert('Please select a valid JSON file.');
      return;
    }

    try {
      // Show loading spinner
      this.showLoadingSpinner();

      // Read and parse the file
      const fileContent = await this.readFileContent(file);
      const importData = JSON.parse(fileContent);

      // Validate import data structure
      if (!dataSyncService.validateImportData(importData)) {
        throw new Error('Invalid import data format.');
      }

      // Show confirmation dialog
      const confirmed = this.confirmImport(importData);
      if (!confirmed) {
        return;
      }

      // Process the import (no language pair restriction for welcome screen)
      const result = await dataSyncService.processImportData(importData, null);

      // Show results
      this.showImportResults(result);

      // Switch to imported language pair after user clicks OK
      setTimeout(async () => {
        // Refresh language pairs to include newly imported one with its metadata
        await this.loadLanguagePairs();
        await this.switchToLanguagePair(importData.languagePair);
      }, 100);

    } catch (error) {
      console.error('Error importing data:', error);
      alert(`Failed to import data: ${error.message}`);
    } finally {
      // Hide loading spinner
      this.hideLoadingSpinner();
      
      // Reset file input
      const fileInput = this.container.querySelector('#import-file-input');
      fileInput.value = '';
    }
  }

  readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  confirmImport(importData) {
    const message = `Import data for "${importData.languagePair}"?

This will:
${this.languagePairs.some(pair => pair.id === importData.languagePair) ? 
  '• Merge with existing data for this language pair' : 
  '• Create a new language pair and import data'}

Cards: ${importData.data.cards.length}
Decks: ${importData.data.decks.length}

Do you want to continue?`;

    return confirm(message);
  }

  showImportResults(result) {
    const message = `Import Complete!

Cards:
  New: ${result.cards.new}
  Merged: ${result.cards.merged}
  Skipped: ${result.cards.skipped}

Decks:
  New: ${result.decks.new}
  Merged: ${result.decks.merged}
  Skipped: ${result.decks.skipped}`;

    // Clear saved deck selection to force refresh and show "All Cards"
    const savedDeckKey = `selectedDeck_${result.languagePair || this.selectedLanguagePair}`;
    localStorage.removeItem(savedDeckKey);
    
    // Use consistent alert pattern like other screens
    alert(message);
  }

  async switchToLanguagePair(languagePairId) {
    // Check if language pair exists in current list
    const existingPair = this.languagePairs.find(pair => pair.id === languagePairId);
    
    if (!existingPair) {
      // Add new language pair to the list
      const languagePairStr = String(languagePairId);
      const [source, target] = languagePairStr.split('-');
      const newPair = {
        id: languagePairStr,
        name: `${source.charAt(0).toUpperCase() + source.slice(1)} - ${target.charAt(0).toUpperCase() + target.slice(1)}`,
        sourceLang: source.charAt(0).toUpperCase() + source.slice(1),
        targetLang: target.charAt(0).toUpperCase() + target.slice(1)
      };
      
      // Save the new language pair metadata to IndexedDB
      await dataSyncService.saveLanguagePairMetadata(newPair);
      
      this.languagePairs.push(newPair);
      
      // Sort language pairs alphabetically by name
      this.languagePairs.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    // Update selected language pair
    this.selectedLanguagePair = languagePairId;
    localStorage.setItem('selectedLanguagePair', languagePairId);
    
    // Re-render the screen to update everything including the dropdown
    this.render();
  }
}

export default WelcomeScreen;
