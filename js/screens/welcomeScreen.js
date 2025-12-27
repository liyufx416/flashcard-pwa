import dataSyncService from '../services/dataSyncService.js';
import speechService from '../utils/speechService.js';
import AppInfoModal from '../utils/appInfoModal.js';

class WelcomeScreen {
  constructor(container, onStartStudy, onManageCards) {
    this.container = container;
    this.onStartStudy = onStartStudy;
    this.onManageCards = onManageCards;
    this.languagePairs = [];
    this.selectedLanguagePair = null;
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
        const counts = await dataSyncService.getDifficultyCounts(this.selectedLanguagePair, timeFilter);
        
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
      // Get counts without any filters
      const counts = await dataSyncService.getDifficultyCounts(this.selectedLanguagePair, null);
      
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

  async updateDifficultyCounts() {
    if (!this.selectedLanguagePair) return;

    const buttons = this.container.querySelectorAll('.difficulty-filter-btn');
    if (!buttons || buttons.length === 0) return;

    const startStudyBtn = this.container.querySelector('#start-study');

    try {
      // Load counts from IndexedDB with automatic sync and time filter
      const counts = await dataSyncService.getDifficultyCounts(this.selectedLanguagePair, null);

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
        ? await dataSyncService.getDifficultyCounts(this.selectedLanguagePair, timeFilter)
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
    }
  }

  async loadLanguagePairs() {
    try {
      const response = await fetch('/data/metadata.json');
      const data = await response.json();
      this.languagePairs = data.languagePairs;
      
      // Get saved language pair or use the first one
      const savedLanguagePair = localStorage.getItem('selectedLanguagePair');
      this.selectedLanguagePair = savedLanguagePair || 
        (this.languagePairs.length > 0 ? this.languagePairs[0].id : null);
      
      this.render();
    } catch (error) {
      console.error('Error loading language pairs:', error);
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
            </select>
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
            <button id="start-study" class="btn btn-primary">Start Studying</button>
            <button id="manage-cards" class="btn btn-secondary">Manage Cards</button>
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
    const startStudyBtn = this.container.querySelector('#start-study');
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

    languageSelect.addEventListener('change', (e) => {
      this.selectedLanguagePair = e.target.value;
      startStudyBtn.disabled = !this.selectedLanguagePair;
      // Save selection to localStorage
      if (this.selectedLanguagePair) {
        localStorage.setItem('selectedLanguagePair', this.selectedLanguagePair);
      }

      this.updateDifficultyCounts();
    });

    startStudyBtn.addEventListener('click', () => {
      if (this.selectedLanguagePair) {
        this.onStartStudy(this.selectedLanguagePair, reverseDirection.checked);
      }
    });

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
}

export default WelcomeScreen;
