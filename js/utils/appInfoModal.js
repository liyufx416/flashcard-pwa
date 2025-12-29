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

      // Create modal HTML
      const modalHtml = `
        <div class="modal-overlay" id="app-info-modal">
          <div class="modal-content">
            <div class="modal-body">
              <div class="app-info-header">
                <table> <tr><td><span class="app-info-icon"/></td>
                <td><div class="app-info-name">${manifest.short_name}</div><div class="app-info-version">Version ${manifest.version}</div></td>
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
        checkUpdateBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          checkUpdateBtn.textContent = '⟳'; // Spinning refresh icon
          checkUpdateBtn.disabled = true;
          checkUpdateBtn.classList.add('checking');
          
          try {
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
        });
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
