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
      console.error(`Error loading deck data for ${languagePairId}:`, error);
      // Don't throw error - deck loading is optional
    }
  }
}

const dataSyncService = new DataSyncService();

export default dataSyncService;
