// Import screen components
import WelcomeScreen from './screens/welcomeScreen.js';
import StudyScreen from './screens/studyScreen.js';
import ManageCardsScreen from './screens/manageCardsScreen.js';

// Main App Class
class FlashcardApp {
  constructor() {
    this.container = document.getElementById('app');
    this.currentScreen = null;
    this.currentLanguagePair = null;
  }

  // Initialize the app
  init() {
    this.showWelcomeScreen();
    this.registerServiceWorker();
  }

  // Show welcome screen
  showWelcomeScreen() {
    this.currentScreen = new WelcomeScreen(
      this.container,
      (languagePairId, reverseDirection, searchResults = null) => this.startStudy(languagePairId, reverseDirection, searchResults),
      () => this.showManageCardsScreen()
    );
    this.currentScreen.loadLanguagePairs();
  }

  // Show study screen
  startStudy(languagePairId, reverseDirection = false, searchResults = null) {
    this.currentLanguagePair = languagePairId;
    this.currentScreen = new StudyScreen(
      this.container,
      languagePairId,
      reverseDirection,
      () => this.showWelcomeScreen(),
      searchResults
    );
    this.currentScreen.loadCards();
  }

  // Show manage cards screen
  showManageCardsScreen() {
    this.currentScreen = new ManageCardsScreen(
      this.container,
      () => this.showWelcomeScreen()
    );
    this.currentScreen.loadLanguagePairs();
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
  const app = new FlashcardApp();
  app.init();
});
