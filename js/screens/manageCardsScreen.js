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
            <button id="export-data-btn" class="btn btn-secondary" ${!this.selectedLanguagePair ? 'disabled' : ''}>
              Export Data
            </button>
            <button id="import-data-btn" class="btn btn-secondary" ${!this.selectedLanguagePair ? 'disabled' : ''}>
              Import Data
            </button>
          </div>
          
          <div id="card-list-container">
            <!-- Card list will be rendered here -->
          </div>

          <!-- Hidden file input for import -->
          <input type="file" id="import-file-input" accept=".json" style="display: none;">

          <!-- Modal for adding/editing cards -->
          <div id="card-modal" class="modal">
            <div class="modal-content">
              <span class="close-btn">&times;</span>
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
                  <textarea id="example-text" rows="2"></textarea>
                </div>
                <div class="form-actions">
                  <button type="button" id="cancel-btn" class="btn btn-secondary">Cancel</button>
                  <button type="submit" class="btn btn-primary">Save</button>
                </div>
              </form>
            </div>
          </div>
        
        <!-- Loading Spinner Overlay -->
        <div class="loading-overlay" id="loading-overlay" style="display: none;">
          <div class="spinner-container">
            <div class="spinner"></div>
            <p class="loading-text">Importing data...</p>
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

    // Export data button
    const exportDataBtn = this.container.querySelector('#export-data-btn');
    if (exportDataBtn) {
      exportDataBtn.addEventListener('click', () => this.handleExportData());
    }

    // Import data button
    const importDataBtn = this.container.querySelector('#import-data-btn');
    if (importDataBtn) {
      importDataBtn.addEventListener('click', () => this.handleImportData());
    }

    // Import file input
    const importFileInput = this.container.querySelector('#import-file-input');
    if (importFileInput) {
      importFileInput.addEventListener('change', (e) => this.handleFileSelect(e));
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
    const form = this.container.querySelector('#card-form');
    
    if (modal && form) {
      form.reset();
      modal.style.display = 'block';
    }
  }

  showEditCardModal(card) {
    this.editingCardWord = card.word;
    const modal = this.container.querySelector('#card-modal');
    const form = this.container.querySelector('#card-form');
    
    if (modal && form) {
      document.getElementById('word-text').value = card.originalWord || card.word;
      document.getElementById('type-text').value = card.type || '';
      document.getElementById('translation-text').value = card.translation;
      document.getElementById('example-text').value = card.example || '';
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

    if (!wordInput || !typeInput || !translationInput) return;

    const cardData = {
      word: wordInput.value.trim(),
      type: typeInput.value.trim(),
      translation: translationInput.value.trim(),
      example: exampleInput ? exampleInput.value.trim() : '',
      notes: [] // Default empty notes array for manually created cards
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

  async handleExportData() {
    if (!this.selectedLanguagePair) {
      alert('Please select a language pair first.');
      return;
    }

    try {
      // Show loading indicator
      const exportBtn = this.container.querySelector('#export-data-btn');
      const originalText = exportBtn.textContent;
      exportBtn.textContent = 'Exporting...';
      exportBtn.disabled = true;

      // Export language pair data using centralized service
      const exportResult = await dataSyncService.exportLanguagePairData(this.selectedLanguagePair);
      
      // Create and download file
      await this.downloadFile(exportResult.exportData);

      // Show success message
      alert(`Export successful! Exported ${exportResult.stats.cardsCount} cards and ${exportResult.stats.decksCount} decks.`);

    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      // Reset button
      const exportBtn = this.container.querySelector('#export-data-btn');
      exportBtn.textContent = 'Export Data';
      exportBtn.disabled = false;
    }
  }

  
  async downloadFile(exportData) {
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const filename = `flashcard-export-${exportData.languagePair}-${new Date().toISOString().split('T')[0]}.json`;

    // Detect platform and handle file download accordingly
    if (this.isMobileDevice()) {
      await this.handleMobileDownload(blob, filename);
    } else {
      this.handleDesktopDownload(blob, filename);
    }
  }

  isMobileDevice() {
    // Check for mobile device
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0);
  }

  handleDesktopDownload(blob, filename) {
    // Create download link and trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async handleMobileDownload(blob, filename) {
    // Handle mobile file sharing/downloading
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'application/json' })] })) {
      // Use Web Share API for supported mobile browsers
      const file = new File([blob], filename, { type: 'application/json' });
      try {
        await navigator.share({
          title: 'Flashcard Data Export',
          text: `Exported flashcard data for ${this.selectedLanguagePair}`,
          files: [file]
        });
        return;
      } catch (shareError) {
        console.warn('Share API failed, falling back to download:', shareError);
      }
    }

    // Fallback: Create a temporary link for mobile browsers
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    link.textContent = 'Download Export File';
    
    // For mobile, try to open in new tab if direct download doesn't work
    try {
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Fallback: Show the file content in a new window for manual saving
      setTimeout(() => {
        if (!this.wasFileDownloaded()) {
          this.showFileContentFallback(blob, filename);
        }
      }, 1000);
    } catch (error) {
      console.warn('Mobile download failed, showing content:', error);
      this.showFileContentFallback(blob, filename);
    }
    
    URL.revokeObjectURL(url);
  }

  wasFileDownloaded() {
    // This is a simple check - in reality, file download detection is complex
    // For now, we'll assume it worked if no immediate error
    return true;
  }

  showFileContentFallback(blob, filename) {
    // Create a new window with the JSON content for manual copy/save
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result;
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>Flashcard Export - ${filename}</title>
              <style>
                body { font-family: monospace; padding: 20px; }
                pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow: auto; }
                button { margin-top: 10px; padding: 10px 20px; }
              </style>
            </head>
            <body>
              <h2>Flashcard Export Data</h2>
              <p>Filename: <strong>${filename}</strong></p>
              <p>Please copy and save this content as a JSON file:</p>
              <pre>${content}</pre>
              <button onclick="copyToClipboard()">Copy to Clipboard</button>
              <script>
                function copyToClipboard() {
                  const text = document.querySelector('pre').textContent;
                  navigator.clipboard.writeText(text).then(() => {
                    alert('Content copied to clipboard! You can now save it as ${filename}');
                  });
                }
              </script>
            </body>
          </html>
        `);
        newWindow.document.close();
      } else {
        alert('Unable to open new window. Please check your popup blocker settings.');
      }
    };
    reader.readAsText(blob);
  }

  async handleImportData() {
    if (!this.selectedLanguagePair) {
      alert('Please select a language pair first.');
      return;
    }

    // Detect platform and handle file selection accordingly
    if (this.isMobileDevice()) {
      await this.handleMobileFileSelection();
    } else {
      this.handleDesktopFileSelection();
    }
  }

  handleDesktopFileSelection() {
    const fileInput = this.container.querySelector('#import-file-input');
    if (fileInput) {
      fileInput.click();
    }
  }

  async handleMobileFileSelection() {
    // Try Web Share API for file selection on mobile
    if (navigator.share && navigator.canShare) {
      try {
        // For mobile, we'll try to use file picker if available
        const fileInput = this.container.querySelector('#import-file-input');
        if (fileInput) {
          fileInput.click();
        }
      } catch (error) {
        console.warn('Mobile file selection failed:', error);
        alert('Please select a file using the file picker.');
      }
    } else {
      // Fallback to standard file input
      this.handleDesktopFileSelection();
    }
  }

  async handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      alert('Please select a valid JSON file.');
      return;
    }

    try {
      // Show loading spinner overlay
      this.showLoadingSpinner();

      // Read and parse the file
      const fileContent = await this.readFileContent(file);
      const importData = JSON.parse(fileContent);

      // Validate import data structure
      if (!dataSyncService.validateImportData(importData)) {
        throw new Error('Invalid import data format.');
      }

      // Check if language pair matches
      if (importData.languagePair !== this.selectedLanguagePair) {
        alert(`The file's language pair ${importData.languagePair} does not match current language pair ${this.selectedLanguagePair}, skipping..`);
        return;
      }

      // Process the import with language pair restriction
      const result = await dataSyncService.processImportData(importData, this.selectedLanguagePair);

      // Show results
      this.showImportResults(result);

      // Refresh the card list
      await this.loadCards(this.selectedLanguagePair);

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
    const savedDeckKey = `selectedDeck_${this.selectedLanguagePair}`;
    localStorage.removeItem(savedDeckKey);
    
    // Use consistent alert pattern like other screens
    alert(message);
  }
}

export default ManageCardsScreen;
