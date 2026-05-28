/**
 * Safe local storage wrapper to handle QuotaExceededError and private browsing restrictions automatically.
 */

// Keys we consider non-critical caches which can be purged to free up space
const NON_CRITICAL_KEYS = ['home_data_cache'];

// In-memory fallback to guarantee functionality is never disrupted by storage limits
const memoryFallback: Record<string, string> = {};

export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) {
        return value;
      }
    } catch (e) {
      console.warn(`[Storage] Failed to read key "${key}" from localStorage:`, e);
    }
    return memoryFallback[key] || null;
  },

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
      memoryFallback[key] = value;
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
        
        // Attempt to remove other non-critical caches (do not purge the active key we are writing!)
        let freedSpace = false;
        NON_CRITICAL_KEYS.forEach(k => {
          if (k === key) return;
          try {
            if (localStorage.getItem(k) !== null) {
              localStorage.removeItem(k);
              freedSpace = true;
              console.log(`[Storage] Purged non-critical key to free space: "${k}"`);
            }
          } catch (innerErr) {
            // ignore
          }
        });

        if (freedSpace) {
          // Retry the original write once
          try {
            localStorage.setItem(key, value);
            memoryFallback[key] = value;
            console.log(`[Storage] Retried writing "${key}" successfully after purging caches.`);
            return;
          } catch (retryErr) {
            console.warn(`[Storage] Write failed again on retry for key "${key}" (using in-memory fallback):`, retryErr);
          }
        }
      }
      
      // Always store in memory fallback if localStorage item write was rejected
      memoryFallback[key] = value;
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[Storage] Failed to remove key "${key}" from localStorage:`, e);
    }
    delete memoryFallback[key];
  }
};
