// Import screen components
import WelcomeScreen from './screens/welcomeScreen.js';
import StudyScreen from './screens/studyScreen.js';
import ManageCardsScreen from './screens/manageCardsScreen.js';
import VersionManager from './utils/versionManager.js';
import dataSyncService from './services/dataSyncService.js';

// Main App Class
class FlashcardApp {
  constructor() {
    this.container = document.getElementById('app');
    this.currentScreen = null;
    this.currentLanguagePair = null;
  }

  // Initialize the app
  async init() {
    try {
      await VersionManager.checkVersionAndReload();
      // If we reach here, no reload was needed, so continue with app initialization
      this.showWelcomeScreen();
      this.registerServiceWorker();
    } catch (error) {
      console.error('Error during version check:', error);
      // Continue with app initialization even if version check fails
      this.showWelcomeScreen();
      this.registerServiceWorker();
    }
  }

  // Show welcome screen
  showWelcomeScreen(showSearchPanel = false) {
    // Check if there's a pending search term from ManageCardsScreen
    const pendingSearchTerm = sessionStorage.getItem('pendingSearchTerm');
    if (pendingSearchTerm) {
      showSearchPanel = true;
      sessionStorage.removeItem('pendingSearchTerm'); // Clear it after using
    }
    
    // Check if we're returning from another screen and restore language pair
    const returnLanguagePair = sessionStorage.getItem('returnLanguagePair');
    if (returnLanguagePair) {
      sessionStorage.removeItem('returnLanguagePair'); // Clear it after using
      localStorage.setItem('selectedLanguagePair', returnLanguagePair);
    }
    
    this.currentScreen = new WelcomeScreen(
      this.container,
      (languagePairId, reverseDirection, searchResults = null, deckFilter = null) => this.startStudy(languagePairId, reverseDirection, searchResults, deckFilter),
      () => this.showManageCardsScreen()
    );
    this.currentScreen.loadLanguagePairs();
    
    // Perform initial sync for the selected language pair to load deck data
    this.performInitialSync();

    if (showSearchPanel) {
      setTimeout(() => {
        this.currentScreen.showSearchPanel();
        // If we have a pending search term, pre-populate it
        if (pendingSearchTerm) {
          const searchInput = this.container.querySelector('#search-input');
          if (searchInput) {
            searchInput.value = pendingSearchTerm;
            searchInput.focus();
          }
        }
      }, 300);
    }
  }

  // Perform initial sync for the currently selected language pair
  async performInitialSync() {
    try {
      // Get the currently selected language pair from the welcome screen
      const selectedLanguagePair = this.currentScreen.getSelectedLanguagePair();
      
      if (selectedLanguagePair) {
        try {
          console.log(`Performing initial sync for ${selectedLanguagePair}...`);
          await dataSyncService.syncLanguagePair(selectedLanguagePair, false);
          console.log(`Initial sync completed for ${selectedLanguagePair}`);
          
          // Load decks after sync completes
          this.currentScreen.loadDecks();
        } catch (error) {
          console.error(`Initial sync failed for ${selectedLanguagePair}:`, error);
        }
      } else {
        console.log('No language pair selected, skipping initial sync');
      }
    } catch (error) {
      console.error('Error during initial sync:', error);
    }
  }

  // Show study screen
  startStudy(languagePairId, reverseDirection = false, searchResults = null, deckFilter = null) {
    this.currentLanguagePair = languagePairId;
    this.currentScreen = new StudyScreen(
      this.container,
      languagePairId,
      reverseDirection,
      () => this.goBackToWelcome(),
      searchResults,
      deckFilter
    );
    this.currentScreen.loadCards();
  }

  // Show manage cards screen
  showManageCardsScreen() {
    this.currentScreen = new ManageCardsScreen(
      this.container,
      () => this.goBackToWelcome()
    );
    this.currentScreen.loadLanguagePairs();
  }

  // Unified go-back method to prevent callback stack growth
  goBackToWelcome() {
    // Store any necessary state before refresh
    const currentLanguagePair = this.currentLanguagePair;
    if (currentLanguagePair) {
      sessionStorage.setItem('returnLanguagePair', currentLanguagePair);
    }
    
    // Refresh page to return to welcome screen
    window.location.reload();
  }

  // Register service worker for PWA functionality
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('ServiceWorker registration successful');
          })
          .catch(err => {
            console.log('ServiceWorker registration failed: ', err);
          });
      });
    }
  }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new FlashcardApp();
  window.app.init();
});
