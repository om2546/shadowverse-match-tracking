/**
 * Utility functions for the application
 */
import { GAME_DATA } from './config.js';

export class DateUtils {
    /**
     * Formats timestamp for display
     * @param {number} timestamp 
     * @returns {string}
     */
    static formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const day = date.getDate();
        const month = date.toLocaleString('en-US', { month: 'short' });
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${day} ${month}, ${hours}:${minutes}${ampm}`;
    }

    /**
     * Gets start of today timestamp
     * @returns {number}
     */
    static getStartOfToday() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    }
}

export class GameUtils {
    /**
     * Finds class color configuration
     * @param {string} className 
     * @returns {Object|null}
     */
    static findClassColor(className) {
        return GAME_DATA.CLASSES.find(c => c.type === className) || null;
    }

    /**
     * Calculates win rate for given games
     * @param {Array} games 
     * @returns {number}
     */
    static calculateWinRate(games) {
        if (games.length === 0) return 0;
        const winCount = games.filter(game => game.result === 'Win').length;
        return (winCount / games.length) * 100;
    }

    /**
     * Filters games for today
     * @param {Array} games 
     * @returns {Array}
     */
    static getTodayGames(games) {
        const startOfDay = DateUtils.getStartOfToday();
        return games.filter(game => game.timeStamps >= startOfDay);
    }

    /**
     * Creates a unique key for deduplication
     * @param {Object} game 
     * @returns {string}
     */
    static createGameKey(game) {
        return [
            game.timeStamps,
            game.playerClass,
            game.opponentClass,
            game.turnOrder,
            game.result,
            game.gameExpansion
        ].join('|');
    }
}

export class DOMUtils {
    /**
     * Creates a DOM element with attributes
     * @param {string} tag 
     * @param {Object} attributes 
     * @param {string} innerHTML 
     * @returns {HTMLElement}
     */
    static createElement(tag, attributes = {}, innerHTML = '') {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else {
                element.setAttribute(key, value);
            }
        });
        
        if (innerHTML) {
            element.innerHTML = innerHTML;
        }
        
        return element;
    }

    /**
     * Downloads data as JSON file
     * @param {any} data 
     * @param {string} filename 
     */
    static downloadJSON(data, filename) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 0);
    }
}

export class ValidationUtils {
    /**
     * Validates if form data is complete
     * @param {Object} formData 
     * @returns {boolean}
     */
    static isFormComplete(formData) {
        const required = [
            'selectedPlayerDeck',
            'selectedOpponentDeck', 
            'selectedTurnOrder',
            'selectedResult',
            'selectedExpansion',
            'selectedGroup'
        ];
        
        return required.every(field => 
            formData[field] !== null && 
            formData[field] !== undefined && 
            formData[field] !== ''
        );
    }

    /**
     * Validates imported JSON data
     * @param {any} data 
     * @returns {boolean}
     */
    static isValidImportData(data) {
        if (!Array.isArray(data)) return false;
        
        return data.every(item => 
            item && 
            typeof item === 'object' &&
            typeof item.playerClass === 'string' &&
            typeof item.opponentClass === 'string' &&
            typeof item.result === 'string' &&
            typeof item.timeStamps === 'number'
        );
    }
}
