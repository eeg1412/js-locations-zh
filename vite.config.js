import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'

// Read package.json version
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))
const VERSION = packageJson.version

function mapToString(map) {
  const entries = []
  for (const [key, value] of map) {
    if (value instanceof Map) {
      entries.push(`[${JSON.stringify(key)}, ${mapToString(value)}]`)
    } else {
      entries.push(`[${JSON.stringify(key)}, ${JSON.stringify(value)}]`)
    }
  }
  return `new Map([${entries.join(', ')}])`
}

const translations = require('./translations.js')
const countriesDir = 'countries'

if (!fs.existsSync(countriesDir)) {
  fs.mkdirSync(countriesDir)
}

// 检查是否有翻译的辅助函数
function hasTranslations(countryMap) {
  // 检查国家翻译
  if (countryMap.get('translation')) return true
  // 检查省份和城市翻译
  for (const [key, value] of countryMap) {
    if (key === 'translation') continue
    if (value instanceof Map) {
      if (value.get('translation')) return true
      for (const [cityKey, cityValue] of value) {
        if (cityKey !== 'translation' && cityValue) return true
      }
    }
  }
  return false
}

// 过滤有翻译的国家
const filteredTranslations = new Map()
for (const [country, countryMap] of translations) {
  if (hasTranslations(countryMap)) {
    filteredTranslations.set(country, countryMap)
  }
}

// 生成每个国家的翻译模块文件
for (const [country, countryMap] of filteredTranslations) {
  const sanitized = country.replace(/[^a-zA-Z0-9]/g, '_')
  const filePath = path.join(countriesDir, `${sanitized}.js`)
  const content = `export default ${mapToString(countryMap)};\n`
  fs.writeFileSync(filePath, content)
}

// 生成 IndexedDB 缓存模块
const indexedDBCacheContent = `/**
 * IndexedDB Cache Module for js-locations-zh
 * 
 * Features:
 * - Version management tied to package version
 * - Auto-clear on version mismatch
 * - Promise-based async operations with concurrency control
 * - Singleton pattern for database connection
 */

const DB_NAME = 'js-locations-zh-cache';
const STORE_NAME = 'translations';
const META_STORE_NAME = 'meta';
const CURRENT_VERSION = '${VERSION}';

// Singleton instance and initialization promise
let dbInstance = null;
let dbInitPromise = null;
let isInitializing = false;

// Track pending write operations for concurrency control
const pendingWrites = new Map();

/**
 * Check if IndexedDB is available in the current environment
 * @returns {boolean}
 */
function isIndexedDBAvailable() {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch (e) {
    return false;
  }
}

/**
 * Initialize the IndexedDB database
 * Handles version checking and auto-clearing on version mismatch
 * @returns {Promise<IDBDatabase|null>}
 */
async function initDB() {
  if (!isIndexedDBAvailable()) {
    return null;
  }

  // Return existing instance if available
  if (dbInstance) {
    return dbInstance;
  }

  // Return existing promise if initialization is in progress
  if (dbInitPromise) {
    return dbInitPromise;
  }

  isInitializing = true;

  dbInitPromise = new Promise((resolve, reject) => {
    // First, check the version in existing database
    const checkRequest = indexedDB.open(DB_NAME);

    checkRequest.onerror = () => {
      isInitializing = false;
      dbInitPromise = null;
      resolve(null);
    };

    checkRequest.onsuccess = async (event) => {
      const db = event.target.result;

      // Check if we need to clear the database due to data version mismatch
      try {
        if (db.objectStoreNames.contains(META_STORE_NAME)) {
          const transaction = db.transaction([META_STORE_NAME], 'readonly');
          const store = transaction.objectStore(META_STORE_NAME);
          const getRequest = store.get('version');

          getRequest.onsuccess = async () => {
            const storedVersion = getRequest.result?.value;
            db.close();

            if (storedVersion && storedVersion !== CURRENT_VERSION) {
              // Version mismatch - clear the database
              await clearDatabase();
            }

            // Now open/create the database with proper schema
            openOrCreateDB(resolve, reject);
          };

          getRequest.onerror = () => {
            db.close();
            openOrCreateDB(resolve, reject);
          };
        } else {
          db.close();
          // Database exists but doesn't have meta store - needs upgrade
          openOrCreateDB(resolve, reject);
        }
      } catch (e) {
        db.close();
        openOrCreateDB(resolve, reject);
      }
    };

    checkRequest.onupgradeneeded = () => {
      // This is a new database, will be handled in openOrCreateDB
    };
  });

  return dbInitPromise;
}

/**
 * Open or create the database with proper schema
 * @param {Function} resolve
 * @param {Function} reject
 */
function openOrCreateDB(resolve, reject) {
  const request = indexedDB.open(DB_NAME, 2); // Use version 2 to ensure upgrade happens

  request.onerror = () => {
    isInitializing = false;
    dbInitPromise = null;
    resolve(null);
  };

  request.onsuccess = (event) => {
    dbInstance = event.target.result;
    isInitializing = false;

    // Store the current version - failure won't prevent DB usage but may affect cache invalidation
    storeVersion().catch(() => {});

    resolve(dbInstance);
  };

  request.onupgradeneeded = (event) => {
    const db = event.target.result;

    // Create translations store if not exists
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('country', 'country', { unique: false });
    }

    // Create meta store if not exists
    if (!db.objectStoreNames.contains(META_STORE_NAME)) {
      db.createObjectStore(META_STORE_NAME, { keyPath: 'key' });
    }
  };
}

/**
 * Store the current version in the database
 * @returns {Promise<void>}
 */
async function storeVersion() {
  if (!dbInstance) return;

  return new Promise((resolve, reject) => {
    try {
      const transaction = dbInstance.transaction([META_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(META_STORE_NAME);
      store.put({ key: 'version', value: CURRENT_VERSION });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Clear the entire database
 * @returns {Promise<void>}
 */
async function clearDatabase() {
  return new Promise((resolve, reject) => {
    // Close existing connection if any
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }

    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);

    deleteRequest.onsuccess = () => resolve();
    deleteRequest.onerror = () => reject(deleteRequest.error);
    deleteRequest.onblocked = () => {
      // Database deletion is blocked by other connections
      // Retry once after 100ms, then resolve anyway to avoid indefinite blocking
      setTimeout(() => {
        const retryRequest = indexedDB.deleteDatabase(DB_NAME);
        retryRequest.onsuccess = () => resolve();
        retryRequest.onerror = () => resolve(); // Resolve instead of reject to prevent blocking
      }, 100);
    };
  });
}

/**
 * Convert a Map to a serializable object for IndexedDB storage
 * @param {Map} map
 * @returns {Object}
 */
function mapToObject(map) {
  const obj = {};
  for (const [key, value] of map) {
    if (value instanceof Map) {
      obj[key] = { __isMap: true, data: mapToObject(value) };
    } else {
      obj[key] = value;
    }
  }
  return obj;
}

/**
 * Convert a serialized object back to a Map
 * @param {Object} obj
 * @returns {Map}
 */
function objectToMap(obj) {
  const map = new Map();
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && value.__isMap) {
      map.set(key, objectToMap(value.data));
    } else {
      map.set(key, value);
    }
  }
  return map;
}

/**
 * Get translation data for a country from IndexedDB
 * @param {string} country
 * @returns {Promise<Map|null>}
 */
async function getFromCache(country) {
  const db = await initDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(country);

      request.onsuccess = () => {
        if (request.result && request.result.data) {
          resolve(objectToMap(request.result.data));
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

/**
 * Save translation data for a country to IndexedDB
 * Uses concurrency control to prevent duplicate writes
 * @param {string} country
 * @param {Map} data
 * @returns {Promise<boolean>}
 */
async function saveToCache(country, data) {
  // Check if there's already a pending write for this country
  if (pendingWrites.has(country)) {
    return pendingWrites.get(country);
  }

  const writePromise = (async () => {
    const db = await initDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const record = {
          id: country,
          country: country,
          data: mapToObject(data),
          timestamp: Date.now()
        };

        store.put(record);

        transaction.oncomplete = () => {
          pendingWrites.delete(country);
          resolve(true);
        };

        transaction.onerror = () => {
          pendingWrites.delete(country);
          resolve(false);
        };
      } catch (e) {
        pendingWrites.delete(country);
        resolve(false);
      }
    });
  })();

  pendingWrites.set(country, writePromise);
  return writePromise;
}

/**
 * Check if a country's data is in the cache
 * @param {string} country
 * @returns {Promise<boolean>}
 */
async function hasInCache(country) {
  const db = await initDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count(IDBKeyRange.only(country));

      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
}

/**
 * Clear all cached translations (but keep version info)
 * @returns {Promise<boolean>}
 */
async function clearCache() {
  const db = await initDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.clear();

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
}

/**
 * Get the current cache version
 * @returns {string}
 */
function getCacheVersion() {
  return CURRENT_VERSION;
}

/**
 * Close the database connection
 */
function closeDB() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    dbInitPromise = null;
  }
}

export {
  isIndexedDBAvailable,
  initDB,
  getFromCache,
  saveToCache,
  hasInCache,
  clearCache,
  clearDatabase,
  getCacheVersion,
  closeDB
};
`
fs.writeFileSync('indexeddb-cache.js', indexedDBCacheContent)

// 生成主入口文件，提供动态加载功能和 IndexedDB 缓存
const mainContent = `import {
  isIndexedDBAvailable,
  getFromCache,
  saveToCache,
  clearCache,
  clearDatabase,
  getCacheVersion,
  closeDB
} from './indexeddb-cache.js';

const allCountries = new Set(${JSON.stringify(Array.from(filteredTranslations.keys()))});

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
  const module = await import(\`./countries/\${sanitized}.js\`);
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
    console.warn(\`Failed to cache data for \${country}:\`, e);
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
    throw new Error(\`Country '\${country}' not found in translations\`);
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
`
fs.writeFileSync('main.js', mainContent)

export default defineConfig({
  build: {
    lib: {
      entry: 'main.js',
      name: 'js-locations-zh',
      formats: ['es'],
      fileName: 'index.es.js'
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: false
      }
    },
    minify: 'terser'
  }
})
