const DB_NAME = 'FlashcardDB';
const DB_VERSION = 2;
const CARD_STORE = 'cards';

class CardDatabase {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const transaction = event.target.transaction;
        
        // Delete old object store if it exists (to recreate with correct indexes)
        if (db.objectStoreNames.contains(CARD_STORE)) {
          db.deleteObjectStore(CARD_STORE);
        }
        
        // Create object store with correct structure
        const objectStore = db.createObjectStore(CARD_STORE, { 
          keyPath: ['languagePair', 'word'] 
        });
        
        objectStore.createIndex('languagePair', 'languagePair', { unique: false });
        objectStore.createIndex('stats.difficulty', 'stats.difficulty', { unique: false });
        objectStore.createIndex('stats.lastReviewed', 'stats.lastReviewed', { unique: false });
      };
    });
  }

  async saveCard(languagePair, cardData) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([CARD_STORE], 'readwrite');
      const store = transaction.objectStore(CARD_STORE);
      
      const card = {
        languagePair,
        word: cardData.word.toLowerCase(),
        originalWord: cardData.word,
        type: cardData.type,
        translation: cardData.translation,
        example: cardData.example || '',
        range_count: cardData.range_count || null,
        frequency: cardData.frequency || null,
        stats: {
          difficulty: cardData.stats?.difficulty || cardData.difficulty || null,
          lastReviewed: cardData.stats?.lastReviewed || cardData.lastReviewed || null,
          reviewCount: cardData.stats?.reviewCount || cardData.reviewCount || 0
        }
      };
      
      const request = store.put(card);
      request.onsuccess = () => resolve(card);
      request.onerror = () => reject(request.error);
    });
  }

  async getCard(languagePair, word) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([CARD_STORE], 'readonly');
      const store = transaction.objectStore(CARD_STORE);
      const request = store.get([languagePair, word.toLowerCase()]);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllCards(languagePair) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([CARD_STORE], 'readonly');
      const store = transaction.objectStore(CARD_STORE);
      const index = store.index('languagePair');
      const request = index.getAll(languagePair);
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async updateCardProgress(languagePair, word, difficulty, lastReviewed) {
    if (!this.db) await this.init();
    
    const card = await this.getCard(languagePair, word.toLowerCase());
    if (!card) {
      throw new Error(`Card not found: ${languagePair} - ${word}`);
    }
    
    card.stats = card.stats || {};
    card.stats.difficulty = difficulty;
    card.stats.lastReviewed = lastReviewed;
    card.stats.reviewCount = (card.stats.reviewCount || 0) + 1;
    
    return this.saveCard(languagePair, card);
  }

  async mergeCardData(languagePair, jsonCard) {
    if (!this.db) await this.init();
    
    const existingCard = await this.getCard(languagePair, jsonCard.word);
    
    if (existingCard) {
      // Merge: update JSON fields, preserve user stats
      const mergedCard = {
        ...existingCard,
        originalWord: jsonCard.word,
        type: jsonCard.type,
        translation: jsonCard.translation,
        example: jsonCard.example || '',
        range_count: jsonCard.range_count || null,
        frequency: jsonCard.frequency || null,
        stats: existingCard.stats || {
          difficulty: null,
          lastReviewed: null,
          reviewCount: 0
        }
      };
      return this.saveCard(languagePair, mergedCard);
    } else {
      // New card: save with default stats
      return this.saveCard(languagePair, jsonCard);
    }
  }

  async bulkMergeCards(languagePair, jsonCards) {
    if (!this.db) await this.init();
    
    const promises = jsonCards.map(card => this.mergeCardData(languagePair, card));
    return Promise.all(promises);
  }

  async deleteCard(languagePair, word) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([CARD_STORE], 'readwrite');
      const store = transaction.objectStore(CARD_STORE);
      const request = store.delete([languagePair, word.toLowerCase()]);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearLanguagePair(languagePair) {
    if (!this.db) await this.init();
    
    const cards = await this.getAllCards(languagePair);
    const promises = cards.map(card => this.deleteCard(languagePair, card.word));
    return Promise.all(promises);
  }

  async getCardsByDifficulty(languagePair, difficulties) {
    if (!this.db) await this.init();
    
    const cards = await this.getAllCards(languagePair);
    
    return cards.filter(card => {
      const difficulty = card.stats?.difficulty;
      if (difficulties.includes('new') && (difficulty === null || difficulty === undefined)) {
        return true;
      }
      if (difficulties.includes('easy') && difficulty === 1) {
        return true;
      }
      if (difficulties.includes('medium') && difficulty === 2) {
        return true;
      }
      if (difficulties.includes('hard') && difficulty === 3) {
        return true;
      }
      return false;
    });
  }

  async getDifficultyCounts(languagePair, timeFilter = null) {
    if (!this.db) await this.init();
    
    let cards = await this.getAllCards(languagePair);
    
    // Apply time filter if provided
    if (timeFilter) {
      cards = this.applyTimeFilter(cards, timeFilter);
    }
    
    const counts = {
      new: 0,
      easy: 0,
      medium: 0,
      hard: 0
    };
    
    cards.forEach(card => {
      const difficulty = card.stats?.difficulty;
      if (difficulty === null || difficulty === undefined) {
        counts.new++;
      } else if (difficulty === 1) {
        counts.easy++;
      } else if (difficulty === 2) {
        counts.medium++;
      } else if (difficulty === 3) {
        counts.hard++;
      }
    });
    
    return counts;
  }

  applyTimeFilter(cards, timeFilter) {
    if (!timeFilter || !timeFilter.period) {
      return cards;
    }

    const now = Date.now();
    const periods = {
      'week': 7 * 24 * 60 * 60 * 1000,
      'month': 30 * 24 * 60 * 60 * 1000,
      'quarter': 90 * 24 * 60 * 60 * 1000,
      'year': 365 * 24 * 60 * 60 * 1000
    };

    const cutoffTime = now - periods[timeFilter.period];
    const isOnlyMode = timeFilter.mode === 'only';

    return cards.filter(card => {
      const lastReviewed = card.stats?.lastReviewed;
      
      // Cards never reviewed
      if (!lastReviewed) {
        // In 'only' mode, exclude never-reviewed cards
        // In 'not' mode, include never-reviewed cards (they're older than any period)
        return !isOnlyMode;
      }

      if (isOnlyMode) {
        // Only cards reviewed within the period
        return lastReviewed >= cutoffTime;
      } else {
        // Only cards reviewed before the period (or never reviewed)
        return lastReviewed < cutoffTime;
      }
    });
  }

  async getFilteredCards(languagePair, difficultyFilters, timeFilter = null) {
    if (!this.db) await this.init();
    
    let cards = await this.getAllCards(languagePair);
    
    // Apply time filter first
    if (timeFilter) {
      cards = this.applyTimeFilter(cards, timeFilter);
    }
    
    // Apply difficulty filter
    const difficulties = Object.keys(difficultyFilters).filter(key => difficultyFilters[key]);
    if (difficulties.length === 0) {
      return [];
    }
    
    return cards.filter(card => {
      const difficulty = card.stats?.difficulty;
      if (difficulties.includes('new') && (difficulty === null || difficulty === undefined)) {
        return true;
      }
      if (difficulties.includes('easy') && difficulty === 1) {
        return true;
      }
      if (difficulties.includes('medium') && difficulty === 2) {
        return true;
      }
      if (difficulties.includes('hard') && difficulty === 3) {
        return true;
      }
      return false;
    });
  }
}

const cardDB = new CardDatabase();

export default cardDB;
