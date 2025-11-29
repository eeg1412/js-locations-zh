import {
  isIndexedDBAvailable,
  getFromCache,
  saveToCache,
  clearCache,
  clearDatabase,
  getCacheVersion,
  closeDB
} from './indexeddb-cache.js';

const allCountries = new Set(["Australia","China","Japan","Thailand","India","Malaysia","Korea (the Republic of)","Singapore","Hong Kong","Taiwan (Province of China)","United States of America","Viet Nam","Netherlands (Kingdom of the)","Ireland","Germany","Argentina","France","Canada","Sweden","United Kingdom of Great Britain and Northern Ireland","Spain","Czechia","Belgium","Switzerland","Austria","Italy","Greece","Russian Federation","Denmark","Portugal","Ghana","Finland","Poland","Romania","Norway","Luxembourg","Bulgaria","Mexico","Moldova (the Republic of)","Latvia","Lithuania","Croatia","Estonia","Slovakia","Hungary","Malta","Cyprus","Zambia","Slovenia","Isle of Man","Albania","Papua New Guinea","Fiji","Macao","Tunisia","Paraguay","Botswana","Sudan","Gambia","Sierra Leone"]);

// Configuration for IndexedDB caching
let useIndexedDB = true;

// Store for loaded country data references (for memory management)
const loadedDataRefs = new Map();

// Track pending operations to prevent race conditions
const pendingLoads = new Map();

/**
 * Configure whether to use IndexedDB caching
 * @param {boolean} enabled - Whether to enable IndexedDB caching (default: true)
 */
export function setUseIndexedDB(enabled) {
  useIndexedDB = enabled;
}

/**
 * Get the current IndexedDB caching setting
 * @returns {boolean}
 */
export function getUseIndexedDB() {
  return useIndexedDB;
}

/**
 * Load country data from the module
 * @param {string} country
 * @returns {Promise<Map>}
 */
async function loadCountryModule(country) {
  const sanitized = country.replace(/[^a-zA-Z0-9]/g, '_');
  const module = await import(`./countries/${sanitized}.js`);
  return module.default;
}

/**
 * Background task to save data to IndexedDB and clean up memory
 * @param {string} country
 * @param {Map} data
 */
async function backgroundSaveAndCleanup(country, data) {
  if (!useIndexedDB || !isIndexedDBAvailable()) {
    return;
  }

  try {
    const saved = await saveToCache(country, data);
    if (saved) {
      // Clean up the in-memory reference to save memory
      // The data is now persisted in IndexedDB
      loadedDataRefs.delete(country);
    }
  } catch (e) {
    // Silently handle errors in background task
    console.warn(`Failed to cache data for ${country}:`, e);
  }
}

/**
 * Get translation data for a specific country
 * Priority: IndexedDB cache -> Dynamic import
 * After loading from module, data is saved to IndexedDB in background
 * @param {string} country
 * @returns {Promise<{default: Map}>}
 */
export async function getCountryData(country) {
  if (!allCountries.has(country)) {
    throw new Error(`Country '${country}' not found in translations`);
  }

  // Check if there's already a pending load for this country
  if (pendingLoads.has(country)) {
    return pendingLoads.get(country);
  }

  const loadPromise = (async () => {
    // Try to get from IndexedDB cache first
    if (useIndexedDB && isIndexedDBAvailable()) {
      try {
        const cachedData = await getFromCache(country);
        if (cachedData) {
          pendingLoads.delete(country);
          return { default: cachedData };
        }
      } catch (e) {
        // Cache miss or error, continue to load from module
      }
    }

    // Load from dynamic import
    const data = await loadCountryModule(country);

    // Store reference for potential cleanup
    loadedDataRefs.set(country, data);

    // Start background task to save to IndexedDB
    // Use Promise.resolve().then() for non-blocking async execution
    if (useIndexedDB && isIndexedDBAvailable()) {
      Promise.resolve().then(() => {
        backgroundSaveAndCleanup(country, data).catch(() => {
          // Silently handle background task errors
        });
      });
    }

    pendingLoads.delete(country);
    return { default: data };
  })();

  pendingLoads.set(country, loadPromise);
  return loadPromise;
}

/**
 * Get all available countries
 * @returns {string[]}
 */
export function getAllCountries() {
  return Array.from(allCountries);
}

/**
 * Clear all cached translations from IndexedDB
 * @returns {Promise<boolean>}
 */
export async function clearTranslationCache() {
  if (!isIndexedDBAvailable()) {
    return false;
  }
  return clearCache();
}

/**
 * Clear the entire IndexedDB database (including version info)
 * @returns {Promise<void>}
 */
export async function clearAllCache() {
  if (!isIndexedDBAvailable()) {
    return;
  }
  return clearDatabase();
}

/**
 * Get the current cache version
 * @returns {string}
 */
export function getCacheVersionInfo() {
  return getCacheVersion();
}

/**
 * Close the IndexedDB connection
 * Call this when you're done using the library to clean up resources
 */
export function closeCache() {
  closeDB();
}

/**
 * Preload multiple countries into IndexedDB cache
 * @param {string[]} countries - Array of country names to preload
 * @returns {Promise<{success: string[], failed: string[]}>}
 */
export async function preloadCountries(countries) {
  const success = [];
  const failed = [];

  for (const country of countries) {
    try {
      await getCountryData(country);
      success.push(country);
    } catch (e) {
      failed.push(country);
    }
  }

  return { success, failed };
}
