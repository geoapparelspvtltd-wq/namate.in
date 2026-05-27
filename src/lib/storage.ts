/**
 * Safe local storage wrapper to handle QuotaExceededError and private browsing restrictions automatically.
 */

// Keys we consider non-critical caches which can be purged to free up space
const NON_CRITICAL_KEYS = ['home_data_cache'];

export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`[Storage] Failed to read key "${key}" from localStorage:`, e);
      return null;
    }
  },

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e: any) {
      console.warn(`[Storage] Error setting key "${key}" in localStorage:`, e);
      
      // Check if it is a QuotaExceededError
      const isQuotaError = 
        e.name === 'QuotaExceededError' || 
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || 
        e.code === 22 || 
        e.code === 1014 ||
        e.message?.toLowerCase().includes('quota') ||
        e.message?.toLowerCase().includes('exceeded');

      if (isQuotaError) {
        console.warn('[Storage] Quota exceeded. Attempting to clear non-critical caches to free up space...');
        
        // Attempt to remove non-critical caches
        let freedSpace = false;
        NON_CRITICAL_KEYS.forEach(k => {
          try {
            if (localStorage.getItem(k) !== null) {
              localStorage.removeItem(k);
              freedSpace = true;
              console.log(`[Storage] Purged non-critical key: "${k}"`);
            }
          } catch (innerErr) {
            // ignore
          }
        });

        if (freedSpace) {
          // Retry the original write once
          try {
            localStorage.setItem(key, value);
            console.log(`[Storage] Retried writing "${key}" successfully after purging caches.`);
            return;
          } catch (retryErr) {
            console.error(`[Storage] Write failed again on retry for key "${key}":`, retryErr);
          }
        }
      }
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[Storage] Failed to remove key "${key}" from localStorage:`, e);
    }
  }
};
