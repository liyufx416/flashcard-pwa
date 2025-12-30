import dataSyncService from '../services/dataSyncService.js';

class ManageCardsScreen {
  constructor(container, onBack) {
    this.container = container;
    this.onBack = onBack;
    this.languagePairs = [];
    this.cards = [];
    this.selectedLanguagePair = localStorage.getItem('selectedLanguagePair');
    this.editingCardWord = null;
  }

  async loadLanguagePairs() {
    try {
      const response = await fetch('/data/metadata.json');
      const data = await response.json();
      this.languagePairs = data.languagePairs;

      const savedLanguagePair = localStorage.getItem('selectedLanguagePair');
      this.selectedLanguagePair = savedLanguagePair;
      this.render();
    } catch (error) {
      console.error('Error loading language pairs:', error);
    }
  }

  async loadCards(languagePairId) {
    try {
      // Load cards from IndexedDB with automatic sync
      this.cards = await dataSyncService.ensureDataLoaded(languagePairId);
      this.renderCardList();
    } catch (error) {
      console.error('Error loading cards:', error);
      this.cards = [];
      this.renderCardList();
    }
  }

  render() {
    const currentPair = this.languagePairs.find(pair => pair.id === this.selectedLanguagePair);
    const languagePairName = currentPair ? currentPair.name : '';
    this.container.innerHTML = `
      <div class="manage-container">
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
          <div class="manage-actions">
            <button id="add-card-btn" class="btn btn-primary" ${!this.selectedLanguagePair ? 'disabled' : ''}>
              Add New Card
            </button>
          </div>
          
          <div id="card-list-container">
            <!-- Card list will be rendered here -->
          </div>

          <!-- Modal for adding/editing cards -->
          <div id="card-modal" class="modal">
            <div class="modal-content">
              <span class="close-btn">&times;</span>
              <h2 id="modal-title">Add New Card</h2>
              <form id="card-form">
                <div class="form-group">
                  <label for="word-text">Word (Source Language)</label>
                  <input type="text" id="word-text" required>
                </div>
                <div class="form-group">
                  <label for="type-text">Type (e.g., v, nm, nf, adj, adv)</label>
                  <input type="text" id="type-text" required>
                </div>
                <div class="form-group">
                  <label for="translation-text">Translation (Target Language)</label>
                  <input type="text" id="translation-text" required>
                </div>
                <div class="form-group">
                  <label for="example-text">Example (Optional)</label>
                  <textarea id="example-text" rows="3"></textarea>
                </div>
                <div class="form-group">
                  <label for="difficulty">Difficulty</label>
                  <select id="difficulty" required>
                    <option value="1">Easy</option>
                    <option value="2">Medium</option>
                    <option value="3">Hard</option>
                  </select>
                </div>
                <div class="form-actions">
                  <button type="button" id="cancel-btn" class="btn btn-secondary">Cancel</button>
                  <button type="submit" class="btn btn-primary">Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
    if (this.selectedLanguagePair) {
      this.loadCards(this.selectedLanguagePair);
    } else {
      this.renderCardList();
    }
  }

  renderCardList() {
    const container = this.container.querySelector('#card-list-container');
    if (!container) return;

    if (!this.selectedLanguagePair) {
      container.innerHTML = '<p>Please select a language pair on the Welcome screen to view or manage cards.</p>';
      return;
    }

    if (this.cards.length === 0) {
      container.innerHTML = '<p>No cards found. Click "Add New Card" to create one.</p>';
      return;
    }

    container.innerHTML = `
      <div class="cards-table-wrapper">
        <table class="cards-table">
          <thead>
            <tr>
              <th>Front</th>
              <th>Back</th>
              <th class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.cards.map(card => `
              <tr data-word="${card.word}">
                <td class="front-cell">${card.originalWord || card.word}</td>
                <td class="back-cell">${card.translation}</td>
                <td class="actions-col">
                  <button type="button" class="icon-btn edit-btn" data-word="${card.word}" data-type="${card.type}" aria-label="Edit card" title="Edit">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button type="button" class="icon-btn delete-btn" data-word="${card.word}" data-type="${card.type}" aria-label="Delete card" title="Delete">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Add event listeners for edit and delete buttons
    this.container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        this.handleEditCard(button.dataset.word, button.dataset.type);
      });
    });

    this.container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        this.handleDeleteCard(button.dataset.word, button.dataset.type);
      });
    });
  }

  setupEventListeners() {
    // Add card button
    const addCardBtn = this.container.querySelector('#add-card-btn');
    if (addCardBtn) {
      addCardBtn.addEventListener('click', () => this.showAddCardModal());
    }

    // Back button
    const backBtn = this.container.querySelector('#back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.onBack());
    }

    // Modal close button
    const closeBtn = this.container.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }

    // Cancel button in modal
    const cancelBtn = this.container.querySelector('#cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeModal());
    }

    // Form submission
    const form = this.container.querySelector('#card-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveCard();
      });
    }

    // Close modal when clicking outside
    const modal = this.container.querySelector('#card-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      });
    }
  }

  showAddCardModal() {
    this.editingCardWord = null;
    const modal = this.container.querySelector('#card-modal');
    const modalTitle = this.container.querySelector('#modal-title');
    const form = this.container.querySelector('#card-form');
    
    if (modal && modalTitle && form) {
      modalTitle.textContent = 'Add New Card';
      form.reset();
      modal.style.display = 'block';
    }
  }

  showEditCardModal(card) {
    this.editingCardWord = card.word;
    const modal = this.container.querySelector('#card-modal');
    const modalTitle = this.container.querySelector('#modal-title');
    const form = this.container.querySelector('#card-form');
    
    if (modal && modalTitle && form) {
      modalTitle.textContent = 'Edit Card';
      document.getElementById('word-text').value = card.originalWord || card.word;
      document.getElementById('type-text').value = card.type || '';
      document.getElementById('translation-text').value = card.translation;
      document.getElementById('example-text').value = card.example || '';
      document.getElementById('range-count').value = card.range_count || '';
      document.getElementById('frequency').value = card.frequency || '';
      modal.style.display = 'block';
    }
  }

  closeModal() {
    const modal = this.container.querySelector('#card-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  async handleSaveCard() {
    const wordInput = document.getElementById('word-text');
    const typeInput = document.getElementById('type-text');
    const translationInput = document.getElementById('translation-text');
    const exampleInput = document.getElementById('example-text');
    const rangeCountInput = document.getElementById('range-count');
    const frequencyInput = document.getElementById('frequency');

    if (!wordInput || !typeInput || !translationInput) return;

    const cardData = {
      word: wordInput.value.trim(),
      type: typeInput.value.trim(),
      translation: translationInput.value.trim(),
      example: exampleInput ? exampleInput.value.trim() : '',
      range_count: rangeCountInput && rangeCountInput.value ? parseInt(rangeCountInput.value) : null,
      frequency: frequencyInput && frequencyInput.value ? parseInt(frequencyInput.value) : null
    };

    if (!cardData.word || !cardData.type || !cardData.translation) {
      alert('Please fill in word, type, and translation fields');
      return;
    }

    try {
      // Save to IndexedDB
      await dataSyncService.saveCard(this.selectedLanguagePair, cardData);
      
      // Reload cards from DB
      await this.loadCards(this.selectedLanguagePair);
      
      this.closeModal();
      
      // Show success message
      alert(`Card ${this.editingCardWord ? 'updated' : 'added'} successfully!`);
      
    } catch (error) {
      console.error('Error saving card:', error);
      alert('Failed to save card. Please try again.');
    }
  }

  handleEditCard(word, type) {
    const card = this.cards.find(c => c.word === word && c.type === type);
    if (card) {
      this.showEditCardModal(card);
    }
  }

  async handleDeleteCard(word, type) {
    if (confirm('Are you sure you want to delete this card?')) {
      try {
        await dataSyncService.deleteCard(this.selectedLanguagePair, word, type);
        await this.loadCards(this.selectedLanguagePair);
      } catch (error) {
        console.error('Error deleting card:', error);
        alert('Failed to delete card. Please try again.');
      }
    }
  }
}

export default ManageCardsScreen;
