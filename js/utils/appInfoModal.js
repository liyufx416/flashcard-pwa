import VersionManager from './versionManager.js';

class AppInfoModal {
  static async show() {
    try {
      // Load manifest and credits
      const [manifestResponse, creditsResponse] = await Promise.all([
        fetch('../../manifest.json'),
        fetch('../../credits.md')
      ]);

      const manifest = await manifestResponse.json();
      const creditsText = await creditsResponse.text();
      const creditsHtml = marked.parse(creditsText);

      // Get version: prioritize local storage, then fall back to manifest
      const localVersion = localStorage.getItem('appVersion');
      const baseVersion = localVersion || manifest.version;
      
      // Check if version has only major.minor (no micro version)
      const versionParts = baseVersion.split('.');
      const displayVersion = versionParts.length === 2 ? `${baseVersion}-dev` : baseVersion;

      // Create modal HTML
      const modalHtml = `
        <div class="modal-overlay" id="app-info-modal">
          <div class="app-info-modal">
            <div class="modal-body">
              <div class="app-info-header">
                <table> <tr><td><span class="app-info-icon"/></td>
                <td><div class="app-info-name">${manifest.short_name}</div><div class="app-info-version">Version ${displayVersion}</div></td>
                <td><button class="check-update-btn" id="check-update-btn" title="Check Update">↻</button></span></td></tr></table>
              </div>
              <div class="credits-content">
                ${creditsHtml}
              </div>
            </div>
          </div>
        </div>
      `;

      // Add modal to DOM
      document.body.insertAdjacentHTML('beforeend', modalHtml);

      // Setup event listeners
      const modal = document.getElementById('app-info-modal');
      const checkUpdateBtn = document.getElementById('check-update-btn');

      // Check update button event listener
      if (checkUpdateBtn) {
        // Long press detection
        let pressTimer;
        let isLongPress = false;
        
        const startPress = (e) => {
          isLongPress = false;
          pressTimer = setTimeout(() => {
            isLongPress = true;
            console.log('Long press detected - forcing reload...');
            
            // Set force reload flag
            localStorage.setItem('forceReload', 'true');
            
            // Force reload
            VersionManager.checkVersionAndReload(true);
          }, 2000); // 2 second long press
        };
        
        const endPress = (e) => {
          clearTimeout(pressTimer);
          if (!isLongPress) {
            // Regular click - handle normally
            handleRegularClick(e);
          }
        };
        
        const handleRegularClick = async (e) => {
          e.stopPropagation();
          checkUpdateBtn.textContent = '⟳'; // Spinning refresh icon
          checkUpdateBtn.disabled = true;
          checkUpdateBtn.classList.add('checking');
          
          try {
            // Check if this is a dev version
            const isDevVersion = versionParts.length === 2;
            
            if (isDevVersion) {
              // Dev version: use force reload
              console.log('Dev version detected, using force reload...');
              
              // Add a brief delay to show the spinning animation
              setTimeout(() => {
                // Use VersionManager with force reload
                VersionManager.checkVersionAndReload(true);
              }, 500);
            } else {
              // Production version: use original version check behavior
              const reloadTriggered = await VersionManager.checkVersionAndReload();
              
              // If we reach here, no reload was triggered, so show checkmark
              if (!reloadTriggered) {
                checkUpdateBtn.textContent = '✓'; // Green checkmark
                checkUpdateBtn.classList.remove('checking');
                checkUpdateBtn.classList.add('up-to-date');
                
                setTimeout(() => {
                  checkUpdateBtn.textContent = '↻'; // Back to refresh icon
                  checkUpdateBtn.disabled = false;
                  checkUpdateBtn.classList.remove('up-to-date');
                }, 2000);
              }
              // If reload was triggered, the page will reload and this code won't continue
            }
            
          } catch (error) {
            console.error('Error checking for updates:', error);
            checkUpdateBtn.textContent = '✗'; // Red X for error
            checkUpdateBtn.classList.remove('checking');
            checkUpdateBtn.classList.add('error');
            
            setTimeout(() => {
              checkUpdateBtn.textContent = '↻'; // Back to refresh icon
              checkUpdateBtn.disabled = false;
              checkUpdateBtn.classList.remove('error');
            }, 2000);
          }
        };
        
        // Add event listeners for long press detection
        checkUpdateBtn.addEventListener('mousedown', startPress);
        checkUpdateBtn.addEventListener('mouseup', endPress);
        checkUpdateBtn.addEventListener('mouseleave', endPress);
        checkUpdateBtn.addEventListener('touchstart', startPress);
        checkUpdateBtn.addEventListener('touchend', endPress);
        checkUpdateBtn.addEventListener('touchcancel', endPress);
      }

      const closeModal = () => {
        modal.remove();
      };

      modal.addEventListener('click', (e) => {
        if (e.target.closest('a')) {
            return; 
        }   
        if (e.target === modal) {
          closeModal();
        }
      });

      // Close on Escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          closeModal();
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);

    } catch (error) {
      console.error('Error loading app info:', error);
    }
  }
}

export default AppInfoModal;
