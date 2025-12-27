# Flashcard PWA

A [Progressive Web Application](https://d3vp78wfkpeym6.cloudfront.net/) for learning vocabulary through flashcards with spaced repetition and difficulty tracking.

**[Credits](credits.md)**

## Features

- **Multi-language Support**: Study Spanish-English and German-English word pairs
- **Text-to-Speech**: Click speaker icons to hear words and example sentences pronounced in the correct language
- **Difficulty Tracking**: Mark cards as Easy, Medium, or Hard to prioritize your learning
- **Time-Based Filtering**: Filter cards by last review time (Last Week, Month, Quarter, Year)
- **Smart Filtering**: Filter cards by difficulty level (New, Easy, Medium, Hard)
- **Reverse Direction**: Toggle between source→target and target→source language practice
- **Card Management**: Add, edit, and delete flashcards
- **IndexedDB Storage**: Efficient local database storage with automatic data synchronization
- **Case-Insensitive Matching**: Words are matched regardless of capitalization
- **Persistent Progress**: Your preferences and card difficulties are saved locally
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Offline Support**: PWA capabilities allow offline usage

## Tech Stack

### Frontend
- **HTML5**: Semantic markup and structure
- **CSS3**: Modern styling with CSS variables, Flexbox, and sticky positioning
- **Vanilla JavaScript (ES6+)**: No frameworks - pure JavaScript with classes and modules

### PWA Features
- **Service Worker**: Offline caching and app-like experience
- **Web App Manifest**: Installable on mobile and desktop
- **IndexedDB**: Client-side database for efficient card storage and progress tracking
- **LocalStorage**: User preferences and filter settings persistence
- **Web Speech API**: Text-to-speech functionality for pronunciation

### Data Format
- **JSON**: Card data and metadata stored in JSON files

## Project Structure

```
flashcard-pwa/
├── debug-speech.html       # Speech service debugging tool
├── INDEXEDDB_MIGRATION.md # IndexedDB migration documentation
├── index.html              # Main HTML entry point
├── manifest.json           # PWA manifest configuration
├── README.md              # This file
├── sw.js                   # Service worker for offline support
│
├── css/
│   └── style.css          # All application styles
│
├── js/
│   ├── app.js             # Main application controller
│   ├── db/
│   │   └── cardDatabase.js        # IndexedDB wrapper for card storage
│   ├── services/
│   │   └── dataSyncService.js     # Data synchronization service
│   ├── screens/
│   │   ├── welcomeScreen.js       # Welcome/home screen with language selection
│   │   ├── studyScreen.js         # Flashcard study interface with TTS
│   │   └── manageCardsScreen.js   # Card management (CRUD operations)
│   └── utils/
│       ├── md5.js                 # Hash utility for file change detection
│       └── speechService.js       # Text-to-speech service
│
├── data/
│   ├── metadata.json      # Language pair definitions
│   ├── es-en.json         # Spanish-English vocabulary (25 cards)
│   └── de-en.json         # German-English vocabulary (5 cards)
│
└── images/
    ├── favicon.ico         # Favicon for the app
    └── icon.svg             # App icon for PWA

```

## Deployment
Create pull request and merge your code into "staging" branch to trigger automatic staging deployment (beta version), which is accessible at [Staging site](https://d2xw3hxshaa0nv.cloudfront.net).

Create pull request and merge your code into "main" branch to trigger automatic prod deployment, which is accessible at [Prod site](https://d3vp78wfkpeym6.cloudfront.net).

Only repo admin can approve PRs into staging and main branches and some other protected branches.

## Data Structure

### Language Pair Metadata (`data/metadata.json`)
```json
{
  "languagePairs": [
    {
      "id": "es-en",
      "name": "Spanish - English",
      "sourceLang": "Spanish",
      "targetLang": "English"
    }
  ]
}
```

### Card Data (`data/es-en.json`, `data/de-en.json`)
```json
{
  "cards": [
    {
      "id": "1",
      "front": "hola",
      "back": "hello",
      "example": "Hola, ¿cómo estás?"
    }
  ]
}
```

## LocalStorage Schema

The app uses LocalStorage to persist user preferences and progress:

- `selectedLanguagePair`: Currently selected language pair ID (e.g., "es-en")
- `reverseDirection`: Boolean for language direction toggle
- `difficultyFilters`: Object with difficulty filter states
  ```json
  {
    "new": true,
    "easy": false,
    "medium": false,
    "hard": true
  }
  ```
- `flashcard-{pairId}-{cardId}`: Individual card difficulty (1=Easy, 2=Medium, 3=Hard)

## Screen Flow

1. **Welcome Screen**
   - Select language pair
   - Toggle reverse direction
   - Filter by difficulty levels
   - View card counts per difficulty
   - Navigate to Study or Manage Cards

2. **Study Screen**
   - View flashcards one at a time
   - Flip cards to see translation
   - Mark difficulty (Easy/Medium/Hard)
   - Navigate through filtered cards
   - Return to Welcome screen

3. **Manage Cards Screen**
   - View all cards in table format
   - Add new cards
   - Edit existing cards
   - Delete cards
   - Scrollable card list with fixed header

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- A local web server (for development)

### Installation

1. Clone or download the project
2. Serve the `flashcard-pwa` directory using a local web server:
   ```bash
   # Using Python 3
   python -m http.server 8080
   
   # Using Node.js http-server
   npx http-server -p 8080
   
   # Using PHP
   php -S localhost:8080
   ```
3. Open `http://localhost:8080` in your browser
4. (Optional) Install as PWA using browser's "Install App" option

### Adding New Language Pairs

1. Create a new JSON file in `data/` (e.g., `fr-en.json`)
2. Add card data following the existing schema
3. Update `data/metadata.json` to include the new language pair
4. Restart the app

### Adding Cards to Existing Language Pairs

1. Edit the corresponding JSON file in `data/` (e.g., `data/es-en.json`)
2. Add new card objects with unique IDs
3. Refresh the app

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Text-to-Speech Feature

The app includes built-in text-to-speech functionality powered by the Web Speech API:

### How It Works
- **Speaker Icons**: Click the speaker icon (🔊) next to any word or example sentence
- **Automatic Language Detection**: The app automatically uses the correct language voice based on the card's language pair
- **Supported Languages**: Spanish, German, and English pronunciation
- **Browser Compatibility**: Works in all modern browsers that support the Web Speech API

### Technical Implementation
The `speechService.js` module provides:
- **ResponsiveVoice Integration**: Optional cloud-based TTS with API key support
- **Browser Native Voices**: Fallback to built-in browser speech synthesis
- Voice selection based on language code
- Automatic fallback to default voices if specific language voices aren't available
- Speech rate, pitch, and volume control
- Stop functionality to cancel ongoing speech
- API key management for enhanced voice quality

### Debugging Speech Service
A dedicated debugging tool is available at `debug-speech.html`:
- Test speech synthesis for different languages
- Check API key status and ResponsiveVoice availability
- Verify local browser voice support
- Manage API keys for enhanced TTS functionality

### Usage in Study Mode
1. On the **front of the card**: Click the speaker icon to hear the word in the source language
2. On the **back of the card**: Click the speaker icon to hear the translation
3. For **example sentences**: Click the smaller speaker icon next to the example to hear it pronounced

## IndexedDB Storage

The app uses IndexedDB for efficient local storage:

### Features
- **Composite Keys**: Cards are stored with `[languagePair, word]` as the unique identifier
- **Case-Insensitive**: Words are normalized to lowercase for storage while preserving original capitalization for display
- **User Progress Tracking**: Stores difficulty level, review count, and last reviewed timestamp in a `stats` object
- **Automatic Synchronization**: Detects changes in JSON data files via MD5 checksums and merges updates while preserving user progress

### Data Schema
```javascript
{
  languagePair: "es-en",
  word: "hola",              // Lowercase for matching
  originalWord: "Hola",      // Original capitalization for display
  type: "interjection",
  translation: "hello",
  example: "Hola, ¿cómo estás?",
  range_count: 100,
  frequency: 257365,
  stats: {
    difficulty: 1,           // 1=Easy, 2=Medium, 3=Hard, null=New
    lastReviewed: 1703001234567,  // Timestamp
    reviewCount: 5
  }
}
```

## Time-Based Filtering

Filter cards based on when they were last reviewed:

### Filter Options
- **Last Week**: Cards reviewed in the past 7 days
- **Last Month**: Cards reviewed in the past 30 days
- **Last Quarter**: Cards reviewed in the past 90 days
- **Last Year**: Cards reviewed in the past 365 days

### Filter Modes
- **Only**: Show only cards reviewed within the selected time period
- **Not**: Show only cards reviewed before the selected time period (or never reviewed)

The difficulty counts update dynamically to reflect both difficulty and time filters.

## Recent Updates

### IndexedDB Migration (Latest)
The application has been fully migrated from localStorage to IndexedDB for improved performance and reliability:

**Key Improvements:**
- **Composite Key Storage**: Cards identified by `(languagePair, word)` instead of numeric IDs
- **Automatic Data Sync**: Detects JSON file changes via MD5 checksums and merges updates
- **Progress Preservation**: User progress maintained during data file updates
- **Offline-First Architecture**: Complete offline functionality after initial sync
- **Enhanced Performance**: Indexed queries for efficient filtering and sorting

**New Modules:**
- `js/db/cardDatabase.js` - Low-level IndexedDB operations
- `js/services/dataSyncService.js` - High-level data synchronization
- `js/utils/md5.js` - File change detection via checksums

**Documentation:** See `INDEXEDDB_MIGRATION.md` for detailed technical documentation.

### Enhanced Speech Service
- **ResponsiveVoice Integration**: Optional cloud-based TTS with API key support
- **Debug Tool**: `debug-speech.html` for testing and troubleshooting
- **Improved Fallback**: Better handling of unavailable voices

### UI Improvements
- **Updated Icons**: New favicon and app icon implementation
- **Enhanced Styling**: Improved visual consistency and responsiveness

## Future Enhancements

- Spaced repetition algorithm
- Statistics and progress tracking
- Image support for cards
- Export/import card decks
- Cloud sync
- Additional language pairs
- Background sync via Service Worker
- Conflict resolution for concurrent edits

## License

This project is open source and available for educational purposes with credit to the original author.
