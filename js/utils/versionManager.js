class VersionManager {
  static async checkVersionAndReload(forceReload = false) {
    try {
      // Fetch current version from manifest.json
      const response = await fetch('/manifest.json', {  cache: 'reload' });
      const manifest = await response.json();
      const currentVersion = manifest.version;
      
      // Get locally saved version
      const savedVersion = localStorage.getItem('appVersion');
      
      // Check if version is different or force reload is requested
      const needsReload = forceReload || 
                        !savedVersion || 
                        savedVersion !== currentVersion;
      
      if (needsReload) {
        const reason = forceReload ? 'Force reload requested' : 
                      (!savedVersion ? 'No saved version' : `Version change: ${savedVersion} -> ${currentVersion}`);
        console.log(`${reason}. Force reloading page...`);
        
        // Save current version
        localStorage.setItem('appVersion', currentVersion);
        
        // Clear service worker cache and reload
        console.log('Clearing service worker cache and reloading...');
        
        // Clear service worker cache
        if ('caches' in window) {
          caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
              caches.delete(cacheName);
            });
          });
        }
        
        // Unregister service worker to prevent it from serving cached content
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => {
              registration.unregister();
            });
          });
        }
        
        // hit /clear-cache endpoint to clear browser cache and reload
        await fetch('/clear-cache');
        window.location.reload();
        return true; // Indicate that reload was triggered
      } else {
        console.log(`Version ${currentVersion} is up to date`);
        return false; // Indicate no reload needed
      }
    } catch (error) {
      console.error('Error checking version:', error);
      throw error;
    }
  }

  static async getCurrentVersion() {
    try {
      const response = await fetch('/manifest.json');
      const manifest = await response.json();
      return manifest.version;
    } catch (error) {
      console.error('Error fetching current version:', error);
      return null;
    }
  }

  static getSavedVersion() {
    return localStorage.getItem('appVersion');
  }

  static async isUpdateAvailable() {
    try {
      const currentVersion = await this.getCurrentVersion();
      const savedVersion = this.getSavedVersion();
      
      if (!currentVersion) return false;
      
      return !savedVersion || savedVersion !== currentVersion;
    } catch (error) {
      console.error('Error checking for updates:', error);
      return false;
    }
  }
}

export default VersionManager;
