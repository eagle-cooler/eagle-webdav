// Initialize the Eagle WebDAV background service

import { backgroundService } from './services/background';
import { eagleWebDAVServer } from './services/webdav';


// This file ensures the background service is initialized when the plugin loads

// Safe initialization - check if Eagle is available
const initializeService = async () => {
    try {
    if (typeof eagle !== 'undefined') {
            await backgroundService.ensureInitialized();
          } else {
      console.warn('Eagle API not available during initialization');
    }
  } catch (error) {
    console.error('Failed to initialize background service:', error);
  }
};

// Initialize when the module loads
initializeService();


// Export for external access
export { backgroundService };
export { eagleWebDAVServer };