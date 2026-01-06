const DB_NAME = 'FlashcardDB';
const DB_VERSION = 6;
const CARD_STORE = 'cards';
const DECK_STORE = 'decks';
const LANGUAGE_PAIR_STORE = 'languagePairs';

class CardDatabase {
  constructor() {
    this.db = null;
  }

  async initIfNeeded() {
     if (!this.db) await this.init();   
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
        const oldVersion = event.oldVersion;
        
        console.log(`Upgrading database from version ${oldVersion} to ${DB_VERSION}`);
        
        // Create card store if it doesn't exist (new installation)
        if (!db.objectStoreNames.contains(CARD_STORE)) {
          const objectStore = db.createObjectStore(CARD_STORE, { 
            keyPath: ['languagePair', 'word', 'type'] 
          });
          
          objectStore.createIndex('languagePair', 'languagePair', { unique: false });
          objectStore.createIndex('rank', 'rank', { unique: false });
          objectStore.createIndex('stats.difficulty', 'stats.difficulty', { unique: false });
          objectStore.createIndex('stats.lastReviewed', 'stats.lastReviewed', { unique: false });
          
          console.log('Created cards object store');
        }
        
        // Handle version 4 to 5 migration (add decks store)
        if (oldVersion < 5) {
          // Create decks object store
          const deckStore = db.createObjectStore(DECK_STORE, { 
            keyPath: ['languagePair', 'deckName'] 
          });
          
          deckStore.createIndex('languagePair', 'languagePair', { unique: false });
          deckStore.createIndex('deckName', 'deckName', { unique: false });
          
          console.log('Created decks object store for version 5');
        }
        
        // Handle version 5 to 6 migration (add language pairs store)
        if (oldVersion < 6) {
          // Create language pairs object store
          const languagePairStore = db.createObjectStore(LANGUAGE_PAIR_STORE, { 
            keyPath: 'id' 
          });
          
          languagePairStore.createIndex('name', 'name', { unique: false });
          
          console.log('Created language pairs object store for version 6');
        }
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
        notes: cardData.notes || [],
        rank: cardData.rank ? parseInt(cardData.rank) : null,
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

  async getCard(languagePair, word, type) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([CARD_STORE], 'readonly');
      const store = transaction.objectStore(CARD_STORE);
      const request = store.get([languagePair, word.toLowerCase(), type]);
      
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

  async updateCardProgress(languagePair, word, type, difficulty, lastReviewed) {
    if (!this.db) await this.init();
    
    const card = await this.getCard(languagePair, word.toLowerCase(), type);
    if (!card) {
      throw new Error(`Card not found: ${languagePair} - ${word} (${type})`);
    }
    
    card.stats = card.stats || {};
    card.stats.difficulty = difficulty;
    card.stats.lastReviewed = lastReviewed;
    card.stats.reviewCount = lastReviewed? (card.stats.reviewCount || 0) + 1 : 0;
    
    return this.saveCard(languagePair, card);
  }

  async mergeCardData(languagePair, jsonCard) {
    if (!this.db) await this.init();
    
    const existingCard = await this.getCard(languagePair, jsonCard.word, jsonCard.type);
    
    if (existingCard) {
      // Merge: update JSON fields, preserve user stats
      const mergedCard = {
        ...existingCard,
        originalWord: jsonCard.word,
        type: jsonCard.type,
        translation: jsonCard.translation,
        example: jsonCard.example || '',
        notes: jsonCard.notes || [],
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

  async deleteCard(languagePair, word, type) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([CARD_STORE], 'readwrite');
      const store = transaction.objectStore(CARD_STORE);
      const request = store.delete([languagePair, word.toLowerCase(), type]);
      
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
      const lastReviewed = card.stats?.lastReviewed;
      if (difficulties.includes('new') && (difficulty === null || difficulty === undefined || lastReviewed === undefined || lastReviewed === null)) {
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

  async getDifficultyCounts(languagePair, timeFilter = null, deckFilter = null) {
    if (!this.db) await this.init();
    
    let cards = await this.getAllCards(languagePair);
    
    // Apply deck filter if provided
    if (deckFilter && deckFilter !== 'all') {
      const deck = await this.getDeck(languagePair, deckFilter);
      if (deck) {
        // Check if this is a rank-based deck or card-based deck
        if (deck.startRank !== undefined) {
          // Rank-based deck - filter by rank range
          const startRank = deck.startRank;
          const endRank = deck.endRank || Infinity;
          
          // Check if any cards have ranks
          const cardsWithRanks = cards.filter(card => card.rank !== undefined && card.rank !== null);
          
          if (cardsWithRanks.length === 0 && endRank !== Infinity) {
            // No cards have ranks and deck has finite end rank, rank-based deck filtering won't work
            // Return empty counts for rank-based decks when cards have no ranks
            return { new: 0, easy: 0, medium: 0, hard: 0 };
          }
          
          cards = cards.filter(card => {
            const rank = card.rank;
            if (rank !== undefined && rank !== null) {
              // Card has rank - check if it's within range
              return rank >= startRank && rank <= endRank;
            } else {
              // Card has no rank - include if deck has no endRank (infinite range)
              return endRank === Infinity;
            }
          });
        } else {
          // Card-based deck - filter by explicit card list
          const deckCardKeys = new Set(
            deck.cards.map(card => `${card.word}-${card.type}`)
          );
          cards = cards.filter(card => 
            deckCardKeys.has(`${card.word}-${card.type}`)
          );
        }
      } else {
        // Deck not found, return empty counts
        return { new: 0, easy: 0, medium: 0, hard: 0 };
      }
    }
    
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
      const lastReviewed = card.stats?.lastReviewed;
      if (difficulty === null || difficulty === undefined || lastReviewed === undefined || lastReviewed === null) {
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

  async getFilteredCards(languagePair, difficultyFilters, timeFilter = null, deckFilter = null) {
    if (!this.db) await this.init();
    
    let cards = await this.getAllCards(languagePair);
    
    // Apply deck filter if provided
    if (deckFilter && deckFilter !== 'all') {
      const deck = await this.getDeck(languagePair, deckFilter);
      if (deck) {
        // Check if this is a rank-based deck or card-based deck
        if (deck.startRank !== undefined) {
          // Rank-based deck - filter by rank range
          const startRank = deck.startRank;
          const endRank = deck.endRank || Infinity;
          
          cards = cards.filter(card => {
            const rank = card.rank;
            if (rank !== undefined && rank !== null) {
              // Card has rank - check if it's within range
              return rank >= startRank && rank <= endRank;
            } else {
              // Card has no rank - include if deck has no endRank (infinite range)
              return endRank === Infinity;
            }
          });
        } else {
          // Card-based deck - filter by explicit card list
          const deckCardKeys = new Set(
            deck.cards.map(card => `${card.word}-${card.type}`)
          );
          cards = cards.filter(card => 
            deckCardKeys.has(`${card.word}-${card.type}`)
          );
        }
      } else {
        // Deck not found, return empty array
        return [];
      }
    }
    
    // Apply time filter first
    if (timeFilter) {
      cards = this.applyTimeFilter(cards, timeFilter);
    }
    
    // Apply difficulty filter
    if (difficultyFilters) {
      const difficulties = Object.keys(difficultyFilters).filter(key => difficultyFilters[key]);
      if (difficulties.length === 0) {
        return [];
      }
      
      return cards.filter(card => {
        const lastReviewed = card.stats?.lastReviewed;
        const difficulty = lastReviewed? card.stats?.difficulty : null;
        
        if (difficulties.includes('new') && (difficulty === null || difficulty === undefined )) {
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
    } else {
      return cards;
    }
  }

  async saveDeck(languagePair, deckName, deckData, overwrite = false) {
    if (!this.db) await this.init();
    
    return new Promise(async (resolve, reject) => {
      try {
        // Check if deck already exists
        const existingDeck = await this.getDeck(languagePair, deckName);
        
        let finalDeck;
        
        if (existingDeck && !overwrite) {
          // Merge mode: combine existing and new cards, avoid duplicates
          if (deckData.startRank !== undefined) {
            // Rank-based deck - just update timestamps, keep rank info
            finalDeck = {
              languagePair,
              deckName,
              startRank: deckData.startRank,
              endRank: deckData.endRank,
              createdAt: existingDeck.createdAt,
              updatedAt: Date.now()
            };
            console.log(`Merged rank-based deck "${deckName}"`);
          } else {
            // Card-based deck - merge cards
            const existingCardKeys = new Set(
              existingDeck.cards.map(card => `${card.word}-${card.type}`)
            );
            
            const newCards = deckData.cards.filter(card => 
              !existingCardKeys.has(`${card.word}-${card.type}`)
            ).map(card => ({
              word: card.word,
              type: card.type
            }));
            
            finalDeck = {
              languagePair,
              deckName,
              cards: [...existingDeck.cards, ...newCards],
              createdAt: existingDeck.createdAt,
              updatedAt: Date.now()
            };
            
            console.log(`Merged deck "${deckName}": added ${newCards.length} new cards`);
          }
        } else {
          // Overwrite mode or new deck
          if (deckData.startRank !== undefined) {
            // Rank-based deck
            finalDeck = {
              languagePair,
              deckName,
              startRank: deckData.startRank,
              endRank: deckData.endRank,
              createdAt: existingDeck?.createdAt || Date.now(),
              updatedAt: Date.now()
            };
            console.log(`${existingDeck ? 'Overwrote' : 'Created'} rank-based deck "${deckName}"`);
          } else {
            // Card-based deck
            finalDeck = {
              languagePair,
              deckName,
              cards: deckData.cards.map(card => ({
                word: card.word,
                type: card.type
              })),
              createdAt: existingDeck?.createdAt || Date.now(),
              updatedAt: Date.now()
            };
            console.log(`${existingDeck ? 'Overwrote' : 'Created'} deck "${deckName}" with ${finalDeck.cards.length} cards`);
          }
        }
        
        const transaction = this.db.transaction([DECK_STORE], 'readwrite');
        const store = transaction.objectStore(DECK_STORE);
        const request = store.put(finalDeck);
        
        request.onsuccess = () => resolve(finalDeck);
        request.onerror = () => reject(request.error);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  async getDeck(languagePair, deckName) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([DECK_STORE], 'readonly');
      const store = transaction.objectStore(DECK_STORE);
      const request = store.get([languagePair, deckName]);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllDecks(languagePair) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([DECK_STORE], 'readonly');
      const store = transaction.objectStore(DECK_STORE);
      const index = store.index('languagePair');
      const request = index.getAll(languagePair);
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllLanguagePairs() {
    // Get language pairs from metadata store instead of card data
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([LANGUAGE_PAIR_STORE], 'readonly');
      const store = transaction.objectStore(LANGUAGE_PAIR_STORE);
      const request = store.getAllKeys();
      
      request.onsuccess = () => {
        // Get unique language pair IDs from metadata
        const languagePairs = request.result || [];
        resolve(languagePairs);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getLanguagePairMetadata(languagePairId) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([LANGUAGE_PAIR_STORE], 'readonly');
      const store = transaction.objectStore(LANGUAGE_PAIR_STORE);
      const request = store.get(languagePairId);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveLanguagePairMetadata(languagePairMetadata) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([LANGUAGE_PAIR_STORE], 'readwrite');
      const store = transaction.objectStore(LANGUAGE_PAIR_STORE);
      const request = store.put(languagePairMetadata);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllLanguagePairMetadata() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([LANGUAGE_PAIR_STORE], 'readonly');
      const store = transaction.objectStore(LANGUAGE_PAIR_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
}

const cardDB = new CardDatabase();

export default cardDB;
