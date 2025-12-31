import { calculateMD5 } from '../utils/md5.js';
import cardDB from '../db/cardDatabase.js';

const CHECKSUM_PREFIX = 'fileChecksum-';

class DataSyncService {
  constructor() {
    this.syncInProgress = new Map();
    this.checksumCache = new Map(); // Cache checksums to avoid redundant calculations
  }

  async getStoredChecksum(languagePairId) {
    return localStorage.getItem(`${CHECKSUM_PREFIX}${languagePairId}`);
  }

  async setStoredChecksum(languagePairId, checksum) {
    localStorage.setItem(`${CHECKSUM_PREFIX}${languagePairId}`, checksum);
    // Clear cache when checksum is updated
    this.checksumCache.delete(languagePairId);
  }

  async fetchAndCalculateChecksum(languagePairId, force = false) {
    // Check cache first (unless force is true)
    if (!force && this.checksumCache.has(languagePairId)) {
      return this.checksumCache.get(languagePairId);
    }

    try {
      // Add cache: "reload" parameter when force is true to bypass browser cache
      const response = await fetch(`/data/${languagePairId}.json`, {
        cache: force ? "reload" : "default"
      });

      let text;

      // Check for 404 response
      if (response.status === 404) {
        console.warn(`Data file not found for ${languagePairId}, using empty array`);
        text = '';
      } else {     
        text = await response.text();
      }
      
      // Check for empty text before parsing
      if (text.trim() === '') {
        console.warn(`Empty data file for ${languagePairId}, using empty array`);
        const emptyData = [];
        const checksum = await calculateMD5(text);
        const result = { text, checksum, data: emptyData };
        this.checksumCache.set(languagePairId, result);
        return result;
      }
      
      const checksum = await calculateMD5(text);
      
      // Parse JSON (now that we know it's not empty)
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        // Invalid JSON - rethrow the error
        throw new Error(`Invalid JSON in ${languagePairId}.json: ${parseError.message}`);
      }
      
      const result = { text, checksum, data };
      
      // Cache the result
      this.checksumCache.set(languagePairId, result);
      
      return result;
    } catch (error) {
      console.error(`Error fetching data for ${languagePairId}:`, error);
      throw error;
    }
  }

  async hasFileChanged(languagePairId) {
    const storedChecksum = await this.getStoredChecksum(languagePairId);
    if (!storedChecksum) {
      return true;
    }

    const { checksum } = await this.fetchAndCalculateChecksum(languagePairId);
    return checksum !== storedChecksum;
  }

  async syncLanguagePair(languagePairId, forceSync = false) {
    if (this.syncInProgress.get(languagePairId)) {
      console.log(`Sync already in progress for ${languagePairId}`);
      return await this.syncInProgress.get(languagePairId);
    }

    const syncPromise = this._performSync(languagePairId, forceSync);
    this.syncInProgress.set(languagePairId, syncPromise);

    try {
      const result = await syncPromise;
      return result;
    } finally {
      this.syncInProgress.delete(languagePairId);
    }
  }

  async _performSync(languagePairId, forceSync) {
    try {
      const storedChecksum = await this.getStoredChecksum(languagePairId);
      const { text, checksum, data } = await this.fetchAndCalculateChecksum(languagePairId, forceSync);

      if (!forceSync && storedChecksum === checksum) {
        console.log(`No changes detected for ${languagePairId}`);
        return {
          changed: false,
          cardsCount: (await cardDB.getAllCards(languagePairId)).length
        };
      }

      console.log(`Syncing data for ${languagePairId}...`);
      const cards = data.cards || [];
      
      // If there's no data to sync (empty file or 404), don't overwrite existing data
      if (cards.length === 0) {
        console.log(`No data available to sync for ${languagePairId}, preserving existing IndexedDB data`);
        // Store the checksum to prevent repeated sync attempts
        await this.setStoredChecksum(languagePairId, checksum);
        return {
          changed: false,
          cardsCount: (await cardDB.getAllCards(languagePairId)).length
        };
      }
      
      // Save cards to database
      for (const card of cards) {
        await cardDB.mergeCardData(languagePairId, card);
      }
      
      // Load and merge deck data
      await this.loadAndMergeDecks(languagePairId, forceSync);
      await this.setStoredChecksum(languagePairId, checksum);

      console.log(`Sync complete for ${languagePairId}: ${cards.length} cards`);
      
      return {
        changed: true,
        cardsCount: cards.length,
        previousChecksum: storedChecksum,
        newChecksum: checksum
      };
    } catch (error) {
      console.error(`Sync failed for ${languagePairId}:`, error);
      throw error;
    }
  }

  
  async ensureDataLoaded(languagePairId) {
    const cards = await cardDB.getAllCards(languagePairId);
    
    if (cards.length === 0) {
      // Check if there's actually data available to sync before syncing
      try {
        const { data } = await this.fetchAndCalculateChecksum(languagePairId, false);
        if (data && data.cards && data.cards.length > 0) {
          // Only sync if there's actual data to sync
          await this.syncLanguagePair(languagePairId, true);
          return await cardDB.getAllCards(languagePairId);
        } else {
          // No data available to sync, return empty array
          return cards; // Return empty cards
        }
      } catch (error) {
        // If we can't fetch data, just return what we have (which is empty)
        return cards;
      }
    } else {
        return cards;
    }
  }

  async forceSyncLanguagePair(languagePairId) {
    // Force sync to get latest data from server
    const result = await this.syncLanguagePair(languagePairId, true);
    
    return result;
  }

  async getDifficultyCounts(languagePairId, timeFilter = null, deckFilter = null) {
    await this.ensureDataLoaded(languagePairId);
    return await cardDB.getDifficultyCounts(languagePairId, timeFilter, deckFilter);
  }

  async getFilteredCards(languagePairId, difficultyFilters, timeFilter = null, deckFilter = null) {
    await this.ensureDataLoaded(languagePairId);
    return await cardDB.getFilteredCards(languagePairId, difficultyFilters, timeFilter, deckFilter);
  }

  async getAllWords(languagePairId) {
    await this.ensureDataLoaded(languagePairId);
    return await cardDB.getAllCards(languagePairId);
  }

  async updateCardProgress(languagePairId, word, type, difficulty) {
    const timestamp = Date.now();
    return await cardDB.updateCardProgress(languagePairId, word, type, difficulty, timestamp);
  }

  async saveCard(languagePairId, cardData) {
    return await cardDB.saveCard(languagePairId, cardData);
  }

  async saveDeck(languagePairId, deckData) {
    return await cardDB.saveDeck(languagePairId, deckData.deckName, deckData);
  }

  async deleteCard(languagePairId, word, type) {
    return await cardDB.deleteCard(languagePairId, word, type);
  }

  async getAllDecks(languagePairId) {
    return await cardDB.getAllDecks(languagePairId);
  }

  async getAllLanguagePairs() {
    return await cardDB.getAllLanguagePairs();
  }

  async getLanguagePairMetadata(languagePairId) {
    return await cardDB.getLanguagePairMetadata(languagePairId);
  }

  async saveLanguagePairMetadata(languagePairMetadata) {
    return await cardDB.saveLanguagePairMetadata(languagePairMetadata);
  }

  async initializeLanguagePairMetadata() {
    try {
      // Load metadata from metadata.json
      let data = { languagePairs: [] };
      try {
        const response = await fetch('/data/metadata.json');
        if (response.ok) {
          data = await response.json();
        } else {
          console.log('metadata.json not found, using empty metadata');
        }
      } catch (error) {
        console.log('Could not parse metadata.json, using empty metadata:', error);
      }
      
      // Get existing metadata from IndexedDB
      const existingMetadata = await this.getAllLanguagePairMetadata();
      const existingIds = new Set(existingMetadata.map(meta => meta.id));
      
      // Merge each language pair metadata into IndexedDB (only if not already exists)
      let mergedCount = 0;
      for (const metadata of data.languagePairs || []) {
        if (!existingIds.has(metadata.id)) {
          await this.saveLanguagePairMetadata(metadata);
          mergedCount++;
        }
      }
      
      console.log(`Merged ${mergedCount} new language pairs from metadata.json (skipped ${(data.languagePairs?.length || 0) - mergedCount} existing)`);
    } catch (error) {
      console.log('Could not initialize language pair metadata from metadata.json:', error);
    }
  }

  async getAllLanguagePairMetadata() {
    return await cardDB.getAllLanguagePairMetadata();
  }

  async exportLanguagePairData(languagePairId) {
    try {
      // Get language pair metadata
      const languagePairMetadata = await this.getLanguagePairMetadata(languagePairId);

      // Collect all data for the language pair
      const exportData = {
        languagePair: languagePairId,
        languagePairMetadata: languagePairMetadata,
        exportDate: new Date().toISOString(),
        version: '1.0',
        data: {
          cards: [],
          decks: []
        }
      };

      // Get all cards (progress data is already included in card.stats object as stored in IndexedDB)
      const allCards = await this.getAllWords(languagePairId);
      
      // Remove empty stats objects to reduce export size
      const cleanedCards = allCards.map(card => {
        if (card.stats && 
            card.stats.difficulty === null && 
            card.stats.lastReviewed === null && 
            card.stats.reviewCount === 0) {
          // Remove stats object if it's empty/default
          const { stats, ...cardWithoutStats } = card;
          return cardWithoutStats;
        }
        return card;
      });
      
      exportData.data.cards = cleanedCards;

      // Get all decks
      const allDecks = await this.getAllDecks(languagePairId);
      exportData.data.decks = allDecks;

      return {
        exportData: exportData,
        stats: {
          cardsCount: allCards.length,
          decksCount: allDecks.length
        }
      };
    } catch (error) {
      console.error('Error exporting language pair data:', error);
      throw error;
    }
  }

  async loadAndMergeDecks(languagePairId, forceSync = false) {
    try {
      // Try to load deck data
      const deckResponse = await fetch(`/data/${languagePairId}.decks.json`, {
        cache: forceSync ? "reload" : "default"
      });
      
      if (!deckResponse.ok) {
        console.log(`No deck file found for ${languagePairId}`);
        return;
      }
      
      const deckData = await deckResponse.json();
      console.log(`Loading deck data for ${languagePairId}: ${deckData.decks?.length || 0} decks`);
      
      // Process each deck
      for (const deck of deckData.decks || []) {
        // Save deck structure to database
        await cardDB.saveDeck(languagePairId, deck.name, deck);
        
        // Check if this is a rank-based deck or card-based deck
        if (deck.startRank !== undefined) {
          // Rank-based deck - no explicit cards, just rank range
          console.log(`Processing rank-based deck: ${deck.name} (rank ${deck.startRank}-${deck.endRank || '∞'})`);
          
          // Cards will be filtered by rank when deck is selected for study
          // No need to add individual cards to database
        } else {
          // Card-based deck - process explicit cards
          for (const deckCard of deck.cards || []) {
            // Check if card already exists
            const existingCard = await cardDB.getCard(languagePairId, deckCard.word, deckCard.type);
            
            if (!existingCard) {
              // Card doesn't exist, add it from deck
              await cardDB.saveCard(languagePairId, {
                ...deckCard,
                rank: deckCard.rank || null,
                example: deckCard.example || '',
                range_count: deckCard.range_count || null,
                frequency: deckCard.frequency || null,
                stats: {
                  difficulty: null,
                  lastReviewed: null,
                  reviewCount: 0
                }
              });
              console.log(`Added new card from deck: ${deckCard.word} (${deckCard.type})`);
            } else {
              // Card exists, keep original data (deck data doesn't override)
              console.log(`Card already exists, keeping original: ${deckCard.word} (${deckCard.type})`);
            }
          }
        }
      }
    } catch (error) {
      console.log(`Error loading deck data for ${languagePairId}:`, error);
      // Don't throw error - deck loading is optional
    }
  }

  // Import functionality
  validateImportData(data) {
    return (
      data &&
      typeof data === 'object' &&
      data.languagePair &&
      data.data &&
      Array.isArray(data.data.cards) &&
      Array.isArray(data.data.decks)
    );
  }

  async processImportData(importData, existingLanguagePair = null) {
    const result = {
      cards: {
        new: 0,
        merged: 0,
        skipped: 0
      },
      decks: {
        new: 0,
        merged: 0,
        skipped: 0
      },
      languagePair: importData.languagePair
    };

    // If existing language pair is specified, reject if it doesn't match
    if (existingLanguagePair && importData.languagePair !== existingLanguagePair) {
      result.cards.skipped = importData.data.cards.length;
      result.decks.skipped = importData.data.decks.length;
      return result;
    }

    // Save language pair metadata if included in import
    if (importData.languagePairMetadata) {
      await this.saveLanguagePairMetadata(importData.languagePairMetadata);
      console.log(`Saved language pair metadata for ${importData.languagePair}`);
    }

    // Get existing data for the language pair
    let existingCards = [];
    let existingDecks = [];
    
    try {
      existingCards = await this.getAllWords(importData.languagePair);
      existingDecks = await this.getAllDecks(importData.languagePair);
    } catch (error) {
      // Language pair might not exist in IndexedDB yet, that's okay
      console.log('No existing data found for language pair:', importData.languagePair);
    }

    // Create maps for easy lookup
    const existingCardMap = new Map();
    existingCards.forEach(card => {
      const key = `${card.word.toLowerCase()}-${card.type}`;
      existingCardMap.set(key, card);
    });

    const existingDeckMap = new Map();
    existingDecks.forEach(deck => {
      existingDeckMap.set(deck.deckName, deck);
    });

    // Process cards
    for (const importCard of importData.data.cards) {
      const key = `${importCard.word.toLowerCase()}-${importCard.type}`;
      const existingCard = existingCardMap.get(key);

      if (!existingCard) {
        // New card
        await this.saveImportCard(importCard, importData.languagePair);
        result.cards.new++;
      } else {
        // Merge card
        await this.mergeCardData(existingCard, importCard, importData.languagePair);
        result.cards.merged++;
      }
    }

    // Process decks
    for (const importDeck of importData.data.decks) {
      const existingDeck = existingDeckMap.get(importDeck.deckName);

      if (!existingDeck) {
        // New deck
        await this.saveImportDeck(importDeck, importData.languagePair);
        result.decks.new++;
      } else {
        // Merge deck
        await this.mergeDeckData(existingDeck, importDeck, importData.languagePair);
        result.decks.merged++;
      }
    }

    return result;
  }

  async saveImportCard(cardData, languagePair) {
    // Ensure the card has the correct structure
    const normalizedCard = {
      word: cardData.word,
      type: cardData.type,
      translation: cardData.translation,
      example: cardData.example || '',
      range_count: cardData.range_count || null,
      frequency: cardData.frequency || null,
      rank: cardData.rank !== undefined ? cardData.rank : null,
      stats: cardData.stats || {
        difficulty: null,
        lastReviewed: null,
        reviewCount: 0
      }
    };

    await this.saveCard(languagePair, normalizedCard);
  }

  async mergeCardData(existingCard, importCard, languagePair) {
    // Merge stats data
    const mergedStats = {
      difficulty: null,
      lastReviewed: null,
      reviewCount: 0
    };

    // Determine which stats to use based on lastReviewed
    const existingLastReviewed = existingCard.stats?.lastReviewed || 0;
    const importLastReviewed = importCard.stats?.lastReviewed || 0;

    if (importLastReviewed > existingLastReviewed) {
      // Use imported stats as primary
      mergedStats.difficulty = importCard.stats?.difficulty || null;
      mergedStats.lastReviewed = importCard.stats?.lastReviewed || null;
      mergedStats.reviewCount = (existingCard.stats?.reviewCount || 0) + (importCard.stats?.reviewCount || 0);
    } else {
      // Use existing stats as primary
      mergedStats.difficulty = existingCard.stats?.difficulty || null;
      mergedStats.lastReviewed = existingCard.stats?.lastReviewed || null;
      mergedStats.reviewCount = (existingCard.stats?.reviewCount || 0) + (importCard.stats?.reviewCount || 0);
    }

    // Update the existing card with merged data
    const updatedCard = {
      ...existingCard,
      translation: importCard.translation || existingCard.translation,
      example: importCard.example || existingCard.example,
      range_count: importCard.range_count || existingCard.range_count,
      frequency: importCard.frequency || existingCard.frequency,
      rank: importCard.rank !== undefined ? importCard.rank : existingCard.rank,
      stats: mergedStats
    };

    await this.saveCard(languagePair, updatedCard);
  }

  async saveImportDeck(deckData, languagePair) {
    // Determine deck type and create appropriate structure
    const isRankBased = deckData.startRank !== undefined;
    
    let normalizedDeck;
    if (isRankBased) {
      // Rank-based deck - preserve endRank as is (could be undefined for infinite)
      normalizedDeck = {
        deckName: deckData.deckName,
        startRank: deckData.startRank,
        endRank: deckData.endRank, // Don't default to 100, keep undefined for infinite
        createdAt: deckData.createdAt || Date.now(),
        updatedAt: Date.now()
      };
    } else {
      // Card-based deck
      normalizedDeck = {
        deckName: deckData.deckName,
        cards: deckData.cards || [],
        createdAt: deckData.createdAt || Date.now(),
        updatedAt: Date.now()
      };
    }

    await this.saveDeck(languagePair, normalizedDeck);
  }

  async mergeDeckData(existingDeck, importDeck, languagePair) {
    // Determine deck type and merge accordingly
    const isImportDeckRankBased = importDeck.startRank !== undefined;
    const isExistingDeckRankBased = existingDeck.startRank !== undefined;
    
    // If both are rank-based, use imported deck directly (no merging needed)
    if (isImportDeckRankBased && isExistingDeckRankBased) {
      const updatedDeck = {
        deckName: existingDeck.deckName, // Keep existing deck name
        createdAt: existingDeck.createdAt || Date.now(), // Keep original creation time
        updatedAt: Date.now(),
        startRank: importDeck.startRank,
        endRank: importDeck.endRank
      };
      
      await this.saveDeck(languagePair, updatedDeck);
      return;
    }
    
    // When deck types disagree, imported deck takes precedence
    if (isImportDeckRankBased !== isExistingDeckRankBased) {
      let updatedDeck;
      if (isImportDeckRankBased) {
        // Converting to rank-based - only include rank-based properties
        updatedDeck = {
          deckName: existingDeck.deckName, // Keep existing deck name
          createdAt: existingDeck.createdAt || Date.now(), // Keep original creation time
          updatedAt: Date.now(),
          startRank: importDeck.startRank,
          endRank: importDeck.endRank
        };
      } else {
        // Converting to card-based - only include card-based properties
        updatedDeck = {
          deckName: existingDeck.deckName, // Keep existing deck name
          createdAt: existingDeck.createdAt || Date.now(), // Keep original creation time
          updatedAt: Date.now(),
          cards: importDeck.cards || []
        };
      }
      
      await this.saveDeck(languagePair, updatedDeck);
      return;
    }
    
    // Both are card-based - merge card lists
    const existingCardKeys = new Set((existingDeck.cards || []).map(card => `${card.word}-${card.type}`));
    const importCards = importDeck.cards || [];
    const newCards = importCards.filter(card => !existingCardKeys.has(`${card.word}-${card.type}`));
    
    const updatedDeck = {
      ...existingDeck,
      cards: [...(existingDeck.cards || []), ...newCards],
      updatedAt: Date.now()
    };

    await this.saveDeck(languagePair, updatedDeck);
  }
}

const dataSyncService = new DataSyncService();

export default dataSyncService;
