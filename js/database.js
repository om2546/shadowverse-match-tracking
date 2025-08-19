/**
 * Database service for handling IndexedDB operations
 */
import { DB_CONFIG } from './config.js';

class DatabaseService {
    constructor() {
        this.dbName = DB_CONFIG.NAME;
        this.storeName = DB_CONFIG.STORE;
        this.version = DB_CONFIG.VERSION;
    }

    /**
     * Opens IndexedDB connection
     * @returns {Promise<IDBDatabase>}
     */
    async openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                }
            };
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                reject(new Error(`Database error: ${event.target.error}`));
            };
        });
    }

    /**
     * Saves data array to IndexedDB
     * @param {Array} dataArray - Array of match data
     * @returns {Promise<void>}
     */
    async saveData(dataArray) {
        try {
            const sortedData = [...dataArray].sort((a, b) => b.timeStamps - a.timeStamps);
            const db = await this.openDB();
            
            const transaction = db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            // Clear existing data
            await new Promise((resolve, reject) => {
                const clearRequest = store.clear();
                clearRequest.onsuccess = () => resolve();
                clearRequest.onerror = () => reject(clearRequest.error);
            });
            
            // Add new data
            const promises = sortedData.map(item => {
                return new Promise((resolve, reject) => {
                    const { id, ...dataWithoutId } = item;
                    const addRequest = store.add(dataWithoutId);
                    addRequest.onsuccess = () => resolve();
                    addRequest.onerror = () => reject(addRequest.error);
                });
            });
            
            await Promise.all(promises);
            
        } catch (error) {
            console.error('Failed to save data:', error);
            throw error;
        }
    }

    /**
     * Loads all data from IndexedDB
     * @returns {Promise<Array>}
     */
    async loadData() {
        try {
            const db = await this.openDB();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(this.storeName, 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.getAll();
                
                request.onsuccess = (event) => {
                    resolve(event.target.result || []);
                };
                
                request.onerror = (event) => {
                    reject(new Error(`Failed to load data: ${event.target.error}`));
                };
            });
            
        } catch (error) {
            console.error('Failed to load data:', error);
            return [];
        }
    }
}

export default DatabaseService;
