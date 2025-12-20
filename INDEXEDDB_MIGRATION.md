# IndexedDB Migration Documentation

## Overview

The flashcard app has been migrated from localStorage to IndexedDB with automatic data file synchronization using MD5 checksums.

## Key Changes

### Storage Architecture

**Before:**
- Card progress stored in localStorage with keys: `flashcard-{languagePairId}-{cardId}`
- Card data loaded from JSON files on every session
- No automatic sync when JSON files change

**After:**
- All card data stored in IndexedDB
- Composite key: `(languagePair, word)` - **ID field is ignored**
- Automatic detection and sync when JSON files change
- MD5 checksums stored in localStorage to track file changes

### IndexedDB Schema

**Database:** `FlashcardDB`
**Object Store:** `cards`
**Key Path:** `['languagePair', 'word']` (composite key)

**Indexes:**
- `languagePair` - for querying all cards in a language pair
- `difficulty` - for filtering by difficulty
- `lastReviewed` - for sorting by review time

**Card Structure:**
```javascript
{
  languagePair: "es-en",           // Part of composite key
  word: "pensar",                  // Part of composite key (lowercase)
  originalWord: "Pensar",          // Original capitalization for display
  type: "v",
  translation: "to think",
  example: "trataba de pensar...",
  range_count: 100,
  frequency: 15616,
  stats: {                         // User progress data grouped together
    difficulty: 2,                 // 1=easy, 2=medium, 3=hard, null=new
    lastReviewed: 1702998765432,   // Timestamp in milliseconds
    reviewCount: 5                 // Number of times reviewed
  }
}
```

## New Modules

### 1. `js/utils/md5.js`
- Calculates SHA-256 hash (named md5 for simplicity)
- Used to detect changes in JSON data files

### 2. `js/db/cardDatabase.js`
- Low-level IndexedDB operations
- CRUD operations for cards
- Difficulty-based filtering
- Count aggregations

**Key Methods:**
- `init()` - Initialize database
- `saveCard(languagePair, cardData)` - Save/update a card
- `getCard(languagePair, word)` - Get single card
- `getAllCards(languagePair)` - Get all cards for a language pair
- `updateCardProgress(languagePair, word, difficulty, lastReviewed)` - Update user progress
- `mergeCardData(languagePair, jsonCard)` - Merge JSON data with existing card
- `bulkMergeCards(languagePair, jsonCards)` - Bulk merge operation
- `getDifficultyCounts(languagePair)` - Get counts by difficulty
- `getCardsByDifficulty(languagePair, difficulties)` - Filter by difficulty

### 3. `js/services/dataSyncService.js`
- High-level data synchronization service
- Manages MD5 checksums
- Orchestrates sync operations
- Provides convenience methods for screens

**Key Methods:**
- `ensureDataLoaded(languagePairId)` - Load cards, sync if needed
- `syncLanguagePair(languagePairId, forceSync)` - Sync JSON file to IndexedDB
- `getDifficultyCounts(languagePairId)` - Get difficulty counts with auto-sync
- `getFilteredCards(languagePairId, difficultyFilters)` - Get filtered cards with auto-sync
- `updateCardProgress(languagePairId, word, difficulty)` - Update progress
- `saveCard(languagePairId, cardData)` - Save/update card
- `deleteCard(languagePairId, word)` - Delete card

## Data Synchronization Flow

### Initial Load
1. User opens app and selects language pair
2. `WelcomeScreen` calls `dataSyncService.getDifficultyCounts()`
3. Service checks if cards exist in IndexedDB
4. If no cards, fetches JSON file and imports all cards
5. If cards exist, calculates MD5 of JSON file
6. Compares with stored checksum in localStorage
7. If different, merges JSON data with IndexedDB

### Merge Logic
When JSON file changes:
1. Fetch and parse JSON file
2. For each card in JSON:
   - Look up existing card by `(languagePair, word)` key (case-insensitive)
   - If exists: Update `word`, `originalWord`, `type`, `translation`, `example`, `range_count`, `frequency`
   - If exists: **Preserve** `stats` object (difficulty, lastReviewed, reviewCount)
   - If new: Create card with stats set to `{difficulty: null, lastReviewed: null, reviewCount: 0}`
3. Update stored checksum

### Study Session
1. User clicks "Start Studying"
2. `StudyScreen` calls `dataSyncService.getFilteredCards()`
3. Service ensures data is synced
4. Returns filtered cards from IndexedDB
5. User reviews card and selects difficulty
6. `dataSyncService.updateCardProgress()` updates the `stats` object:
   - `stats.difficulty` field
   - `stats.lastReviewed` timestamp
   - `stats.reviewCount` incremented

## Migration from Old System

### Automatic Migration
The new system does NOT automatically migrate old localStorage data. Users will start fresh with all cards marked as "new".

### Manual Migration (if needed)
If you want to preserve old progress:
1. Before deploying, create a migration script
2. Read old localStorage keys: `flashcard-{languagePairId}-{cardId}`
3. Map old IDs to words using JSON files
4. Import into IndexedDB with progress data

## Benefits

### 1. **Resilient to ID Changes**
- Cards identified by `(languagePair, word)` instead of `id`
- Changing IDs in JSON won't lose user progress
- More stable across data file updates

### 2. **Automatic Sync**
- Detects when JSON files change
- Automatically merges new data
- Preserves user progress during updates

### 3. **Better Performance**
- IndexedDB is faster for large datasets
- Indexed queries for filtering
- No need to parse JSON on every load

### 4. **Offline-First**
- All data cached in IndexedDB
- Works completely offline after initial load
- Only syncs when files change

### 5. **Scalability**
- Can handle thousands of cards
- Efficient filtering and sorting
- No localStorage size limits

## Testing Checklist

- [ ] Open app for first time - cards load from JSON
- [ ] Study cards and mark difficulty
- [ ] Refresh page - progress persists
- [ ] Modify JSON file (change translation)
- [ ] Refresh page - new translation appears, progress preserved
- [ ] Add new card to JSON file
- [ ] Refresh page - new card appears as "new"
- [ ] Remove card from JSON file
- [ ] Refresh page - card still in IndexedDB (orphaned but harmless)
- [ ] Add card via Manage Cards screen
- [ ] Edit card via Manage Cards screen
- [ ] Delete card via Manage Cards screen
- [ ] Check difficulty counts update correctly
- [ ] Test with multiple language pairs

## Troubleshooting

### Clear All Data
Open browser console and run:
```javascript
indexedDB.deleteDatabase('FlashcardDB');
localStorage.clear();
location.reload();
```

### View IndexedDB Data
1. Open Chrome DevTools
2. Go to Application tab
3. Expand IndexedDB → FlashcardDB → cards
4. View all stored cards

### View Checksums
Open browser console and run:
```javascript
Object.keys(localStorage)
  .filter(k => k.startsWith('fileChecksum-'))
  .forEach(k => console.log(k, localStorage.getItem(k)));
```

### Force Re-sync
Open browser console and run:
```javascript
import dataSyncService from './js/services/dataSyncService.js';
await dataSyncService.syncLanguagePair('es-en', true);
```

## Future Enhancements

1. **Background Sync**: Use Service Worker to sync in background
2. **Conflict Resolution**: Handle concurrent edits better
3. **Export/Import**: Allow users to backup/restore progress
4. **Cloud Sync**: Sync progress across devices
5. **Analytics**: Track learning patterns and statistics
6. **Smart Review**: Spaced repetition algorithm based on `lastReviewed` and `reviewCount`
