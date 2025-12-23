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
                <span class="app-info-name">${manifest.short_name}</span> <span class="app-info-version">(v${manifest.version})</span>
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
