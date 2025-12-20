import { calculateMD5 } from '../utils/md5.js';
import cardDB from '../db/cardDatabase.js';

const CHECKSUM_PREFIX = 'fileChecksum-';

class DataSyncService {
  constructor() {
    this.syncInProgress = new Map();
  }

  async getStoredChecksum(languagePairId) {
    return localStorage.getItem(`${CHECKSUM_PREFIX}${languagePairId}`);
  }

  async setStoredChecksum(languagePairId, checksum) {
    localStorage.setItem(`${CHECKSUM_PREFIX}${languagePairId}`, checksum);
  }

  async fetchAndCalculateChecksum(languagePairId) {
    try {
      const response = await fetch(`/data/${languagePairId}.json`);
      const text = await response.text();
      const checksum = await calculateMD5(text);
      return { text, checksum, data: JSON.parse(text) };
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
      const { text, checksum, data } = await this.fetchAndCalculateChecksum(languagePairId);

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

  async loadCardsFromDB(languagePairId) {
    try {
      await cardDB.init();
      
      const hasChanged = await this.hasFileChanged(languagePairId);
      
      if (hasChanged) {
        await this.syncLanguagePair(languagePairId);
      }
      
      return await cardDB.getAllCards(languagePairId);
    } catch (error) {
      console.error(`Error loading cards for ${languagePairId}:`, error);
      throw error;
    }
  }

  async ensureDataLoaded(languagePairId) {
    const cards = await cardDB.getAllCards(languagePairId);
    
    if (cards.length === 0) {
      await this.syncLanguagePair(languagePairId, true);
      return await cardDB.getAllCards(languagePairId);
    }
    
    const hasChanged = await this.hasFileChanged(languagePairId);
    if (hasChanged) {
      await this.syncLanguagePair(languagePairId);
      return await cardDB.getAllCards(languagePairId);
    }
    
    return cards;
  }

  async getDifficultyCounts(languagePairId, timeFilter = null) {
    await this.ensureDataLoaded(languagePairId);
    return await cardDB.getDifficultyCounts(languagePairId, timeFilter);
  }

  async getFilteredCards(languagePairId, difficultyFilters, timeFilter = null) {
    await this.ensureDataLoaded(languagePairId);
    return await cardDB.getFilteredCards(languagePairId, difficultyFilters, timeFilter);
  }

  async updateCardProgress(languagePairId, word, difficulty) {
    const timestamp = Date.now();
    return await cardDB.updateCardProgress(languagePairId, word, difficulty, timestamp);
  }

  async saveCard(languagePairId, cardData) {
    return await cardDB.saveCard(languagePairId, cardData);
  }

  async deleteCard(languagePairId, word) {
    return await cardDB.deleteCard(languagePairId, word);
  }
}

const dataSyncService = new DataSyncService();

export default dataSyncService;
