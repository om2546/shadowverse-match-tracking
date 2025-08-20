/**
 * UI component management
 */
import { GAME_DATA, MESSAGES } from './config.js';
import { GameUtils, DateUtils } from './utils.js';

export class UIComponents {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Gets cached jQuery element or creates new one
     * @param {string} selector 
     * @returns {jQuery}
     */
    $(selector) {
        if (!this.cache.has(selector)) {
            this.cache.set(selector, $(selector));
        }
        return this.cache.get(selector);
    }

    /**
     * Clears the selector cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Renders deck choice buttons
     * @param {string} containerId 
     * @param {string} groupName 
     * @param {string|null} selectedType 
     */
    renderDeckChoices(containerId, groupName, selectedType) {
        const $container = this.$(`#${containerId}`);
        $container.empty().addClass('flex flex-wrap gap-2');
        
        GAME_DATA.CLASSES.forEach((classData) => {
            const isSelected = selectedType === classData.type;
            const button = this.createDeckChoiceButton(classData, groupName, isSelected);
            $container.append(button);
        });
    }

    /**
     * Creates a deck choice button
     * @param {Object} classData 
     * @param {string} groupName 
     * @param {boolean} isSelected 
     * @returns {string}
     */
    createDeckChoiceButton(classData, groupName, isSelected) {
        const style = `
            background: ${isSelected ? classData.selectedColor : classData.color};
            color: #fff;
            border: ${isSelected ? '2px solid #222' : '1px solid transparent'};
            min-width: 110px;
            word-break: break-word;
        `;
        
        return `
            <button type="button" 
                class="deck-choice px-4 py-2 rounded text-sm font-semibold border transition-colors duration-150 hover:cursor-pointer mb-2"
                style="${style}"
                data-class="${classData.type}"
                data-group="${groupName}">
                ${classData.type}
            </button>
        `;
    }

    /**
     * Renders turn order choices
     * @param {string|null} selected 
     */
    renderTurnOrderChoices(selected) {
        const $container = this.$('#turnOrderChoices');
        $container.empty().addClass('flex space-x-2');
        
        GAME_DATA.TURN_ORDERS.forEach(option => {
            const isSelected = selected === option.value;
            const button = this.createChoiceButton(option, isSelected, 'turn-order-choice');
            $container.append(button);
        });
    }

    /**
     * Renders result choices
     * @param {string|null} selected 
     */
    renderResultChoices(selected) {
        const $container = this.$('#resultChoices');
        $container.empty().addClass('flex space-x-2');
        
        GAME_DATA.RESULTS.forEach(option => {
            const isSelected = selected === option.value;
            const button = this.createResultButton(option, isSelected);
            $container.append(button);
        });
    }

    /**
     * Creates a result choice button
     * @param {Object} option 
     * @param {boolean} isSelected 
     * @returns {string}
     */
    createResultButton(option, isSelected) {
        const style = isSelected 
            ? `background: ${option.color}; color: #fff; border: 2px solid #222;`
            : 'background: #f3f4f6; color: #222; border: 1px solid #ccc;';
            
        return `
            <button type="button"
                class="result-choice px-4 py-2 rounded border font-semibold transition-colors duration-150 hover:cursor-pointer"
                style="${style} min-width: 60px;"
                data-value="${option.value}">
                ${option.label}
            </button>
        `;
    }

    /**
     * Creates a generic choice button
     * @param {Object} option 
     * @param {boolean} isSelected 
     * @param {string} className 
     * @returns {string}
     */
    createChoiceButton(option, isSelected, className) {
        const style = isSelected 
            ? 'background: #2563eb; color: #fff; border: 2px solid #222;'
            : 'background: #f3f4f6; color: #222; border: 1px solid #ccc;';
            
        return `
            <button type="button"
                class="${className} px-4 py-2 rounded border font-semibold transition-colors duration-150 hover:cursor-pointer"
                style="${style}"
                data-value="${option.value}">
                ${option.label}
            </button>
        `;
    }

    /**
     * Renders expansion dropdown
     * @param {string|null} selected 
     */
    renderExpansionDropdown(selected) {
        const $select = this.$('#expansionSelect');
        $select.empty();
        
        GAME_DATA.EXPANSIONS.forEach(expansion => {
            const option = `<option value="${expansion}"${selected === expansion ? ' selected' : ''}>${expansion}</option>`;
            $select.append(option);
        });
    }

    /**
     * Renders group list radio buttons
     * @param {string|null} selectedValue 
     */
    renderGroupListRadios(selectedValue) {
        const $container = this.$('#groupListRadios');
        $container.empty();
        
        GAME_DATA.GROUPS.forEach(group => {
            const checked = selectedValue === group ? 'checked' : '';
            const radio = `
                <label class="flex items-center space-x-2">
                    <input type="radio" name="groupListRadio" class="group-list-radio" value="${group}" ${checked}>
                    <span>${group}</span>
                </label>
            `;
            $container.append(radio);
        });
    }

    /**
     * Updates submit button state
     * @param {boolean} isEnabled 
     */
    updateSubmitButtonState(isEnabled) {
        const $button = this.$('#formWrapper button[type="submit"]');
        
        if (isEnabled) {
            $button
                .prop('disabled', false)
                .removeClass('opacity-50 cursor-not-allowed')
                .addClass('hover:cursor-pointer');
        } else {
            $button
                .prop('disabled', true)
                .addClass('opacity-50 cursor-not-allowed')
                .removeClass('hover:cursor-pointer');
        }
    }

    /**
     * Updates today's win rate display
     * @param {Array} data 
     */
    updateShowStats(data) {
        const todayGames = GameUtils.getTodayGames(data);
        const rate = GameUtils.calculateWinRate(todayGames);
        const displayRate = todayGames.length > 0 ? rate.toFixed(2) + '%' : '0.00%';
        const totalGames = `${todayGames.length} game(s)`
        this.$('#todayWinRate').text(`${displayRate} in ${totalGames}`);

        let currentGroup = 'N/A';
        if(data.length > 0) {
            currentGroup = data[0].groupList || 'N/A';
        }
        this.$('#currentGroup').text(currentGroup);

        const groupGames = GameUtils.getCurrentGameGroup(data, currentGroup);
        const groupRate = GameUtils.calculateWinRate(groupGames);
        const groupTotal = `${groupGames.length} game(s)`;
        this.$('#groupWinRate').text(`${groupRate.toFixed(2)}% in ${groupTotal}`);
    }

    /**
     * Toggles form visibility
     */
    toggleForm() {
        this.$('#formWrapper').slideToggle(200);
        this.$('#toggleIcon').toggleClass('rotate-180');
    }
}

export class TableRenderer {
    /**
     * Creates DataTable columns configuration
     * @returns {Array}
     */
    static createColumns() {
        return [
            {
                data: 'playerClass',
                title: 'Player\'s Class',
                render: (data) => TableRenderer.renderClassCell(data)
            },
            {
                data: 'opponentClass',
                title: 'Opponent\'s Class',
                render: (data) => TableRenderer.renderClassCell(data)
            },
            {
                data: 'turnOrder',
                title: 'Turn Order'
            },
            {
                data: 'timeStamps',
                title: 'Timestamp',
                render: (data, type) => {
                    if (type === 'sort') {
                        return new Date(data).getTime();
                    }
                    return DateUtils.formatTimestamp(data);
                }
            },
            {
                data: 'result',
                title: 'Result',
                render: (data) => TableRenderer.renderResultCell(data)
            },
            {
                data: 'gameExpansion',
                title: 'Game Expansion'
            },
            {
                data: 'groupList',
                title: 'Group',
                render: (data) => data || ''
            },
            {
                data: null,
                title: 'Action',
                orderable: false,
                render: (data, type, row, meta) => TableRenderer.renderActionCell(data.id)
            }
        ];
    }

    /**
     * Renders class cell with color
     * @param {string} className 
     * @returns {string}
     */
    static renderClassCell(className) {
        const colorObj = GameUtils.findClassColor(className);
        const background = colorObj ? colorObj.color : '#222';
        return `<span style="background:${background};color:#fff;padding:2px 8px;border-radius:4px;display:inline-block;">${className}</span>`;
    }

    /**
     * Renders result cell with color
     * @param {string} result 
     * @returns {string}
     */
    static renderResultCell(result) {
        const background = result === 'Win' ? '#22c55e' : '#ef4444';
        return `<span class="font-bold" style="background:${background};color:#fff;padding:2px 8px;border-radius:4px;display:inline-block;">${result}</span>`;
    }

    /**
     * Renders action cell with remove button
     * @param {number} rowIndex 
     * @returns {string}
     */
    static renderActionCell(rowIndex) {
        return `<button class="remove-btn bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded" data-row="${rowIndex}">Remove</button>`;
    }
}
