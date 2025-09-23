// Initialize the Eagle WebDAV background service

import { backgroundService } from './webdav/background';

// Simple initialization
console.log('[DEBUG] init.ts - Initializing background service...');
backgroundService.init();

// Export for external access
export { backgroundService };