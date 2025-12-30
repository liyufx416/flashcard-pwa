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
      const text = await response.text();
      const checksum = await calculateMD5(text);
      const result = { text, checksum, data: JSON.parse(text) };
      
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
      
      await cardDB.bulkMergeCards(languagePairId, cards);
      
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
      await this.syncLanguagePair(languagePairId, true);
      return await cardDB.getAllCards(languagePairId);
    } else {
        return cards;
    }
  }

  async forceSyncLanguagePair(languagePairId) {
    // Force sync to get latest data from server
    const result = await this.syncLanguagePair(languagePairId, true);
    
    return result;
  }

  async getDifficultyCounts(languagePairId, timeFilter = null) {
    await this.ensureDataLoaded(languagePairId);
    return await cardDB.getDifficultyCounts(languagePairId, timeFilter);
  }

  async getFilteredCards(languagePairId, difficultyFilters, timeFilter = null) {
    await this.ensureDataLoaded(languagePairId);
    return await cardDB.getFilteredCards(languagePairId, difficultyFilters, timeFilter);
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

  async deleteCard(languagePairId, word, type) {
    return await cardDB.deleteCard(languagePairId, word, type);
  }
}

const dataSyncService = new DataSyncService();

export default dataSyncService;
