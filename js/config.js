/**
 * Configuration constants for the application
 */

// Database configuration
export const DB_CONFIG = {
    NAME: 'deckDataDB',
    STORE: 'deckDataStore',
    VERSION: 1
};

// Application constants
export const APP_CONFIG = {
    DEFAULT_ZOOM: 0.75,
    MOBILE_BREAKPOINT: 640,
    ANIMATION_DURATION: 200
};

// Game data
export const GAME_DATA = {
    CLASSES: [
        { 
            type: 'Swordcraft',
            color: '#dde100ff',
            selectedColor: '#8a8f00'
        },
        {
            type: 'Runecraft',
            color: '#5e78feff',
            selectedColor: '#2b3cbf'
        },
        {
            type: 'Abysscraft',
            color: '#fb4c84ff',
            selectedColor: '#b3124b'
        },
        {
            type: 'Portalcraft',
            color: '#74bed1ff',
            selectedColor: '#2d7f96'
        },
        {
            type: 'Havencraft',
            color: '#d0be6dff',
            selectedColor: '#8a7835'
        },
        {
            type: 'Dragoncraft',
            color: '#ff8f1d',
            selectedColor: '#b3540f'
        },
        {
            type: 'Forestcraft',
            color: '#93c6a1ff',
            selectedColor: '#4f7d59'
        }
    ],
    
    EXPANSIONS: [
        'Legends Rise',
        'Infinity Evolved'
    ],
    
    GROUPS: [
        'Emerald',
        'Topaz',
        'Ruby',
        'Sapphire',
        'Diamond'
    ],
    
    TURN_ORDERS: [
        { label: '1st', value: '1st' },
        { label: '2nd', value: '2nd' },
        { label: 'Unknown', value: 'unknown' }
    ],
    
    RESULTS: [
        { label: 'Win', value: 'win', color: '#22c55e' },
        { label: 'Lose', value: 'lose', color: '#ef4444' }
    ]
};

// UI Messages
export const MESSAGES = {
    CONFIRM_DELETE: 'Are you sure you want to remove this row?',
    INVALID_JSON: 'Invalid JSON format: root should be an array.',
    IMPORT_SUCCESS: (count) => `Imported ${count} new record(s).`,
    IMPORT_ERROR: (error) => `Failed to import JSON: ${error}`,
    NO_DATA: 'No data available'
};
