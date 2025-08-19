/**
 * Statistics page application
 */
import DatabaseService from './database.js';
import { GAME_DATA } from './config.js';
import { GameUtils } from './utils.js';

class StatsApp {
    constructor() {
        this.db = new DatabaseService();
        this.data = [];
        this.filteredData = [];
        this.showCounts = false; // false = winrate, true = counts
        this.table = null;
        this.filters = {
            turnOrder: [],
            group: [],
            expansion: []
        };
    }

    /**
     * Initializes the stats application
     */
    async init() {
        try {
            await this.loadData();
            this.renderFilterOptions();
            this.applyFilters();
            this.renderTable();
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize stats app:', error);
            this.renderEmptyTable();
        }
    }

    /**
     * Loads data from database
     */
    async loadData() {
        try {
            this.data = await this.db.loadData();
        } catch (error) {
            console.error('Failed to load data:', error);
            this.data = [];
        }
    }

    /**
     * Renders filter options dynamically from config
     */
    renderFilterOptions() {
        // Render Turn Order checkboxes
        const $turnOrderContainer = $('#turnOrderFilter');
        $turnOrderContainer.empty();
        GAME_DATA.TURN_ORDERS.forEach(option => {
            const checkbox = `
                <label class="filter-label">
                    <input type="checkbox" class="filter-checkbox turn-order-checkbox" value="${option.value}">
                    <span>${option.label}</span>
                </label>
            `;
            $turnOrderContainer.append(checkbox);
        });

        // Render Group checkboxes
        const $groupContainer = $('#groupFilter');
        $groupContainer.empty();
        GAME_DATA.GROUPS.forEach(group => {
            const checkbox = `
                <label class="filter-label">
                    <input type="checkbox" class="filter-checkbox group-checkbox" value="${group}">
                    <span>${group}</span>
                </label>
            `;
            $groupContainer.append(checkbox);
        });

        // Render Expansion checkboxes
        const $expansionContainer = $('#expansionFilter');
        $expansionContainer.empty();
        GAME_DATA.EXPANSIONS.forEach(expansion => {
            const checkbox = `
                <label class="filter-label">
                    <input type="checkbox" class="filter-checkbox expansion-checkbox" value="${expansion}">
                    <span>${expansion}</span>
                </label>
            `;
            $expansionContainer.append(checkbox);
        });
    }

    /**
     * Applies current filters to the data
     */
    applyFilters() {
        this.filteredData = this.data.filter(game => {
            // Turn Order filter
            if (this.filters.turnOrder.length > 0 && !this.filters.turnOrder.includes(game.turnOrder)) {
                return false;
            }
            
            // Group filter
            if (this.filters.group.length > 0 && !this.filters.group.includes(game.groupList)) {
                return false;
            }
            
            // Expansion filter
            if (this.filters.expansion.length > 0 && !this.filters.expansion.includes(game.gameExpansion)) {
                return false;
            }
            
            return true;
        });
    }

    /**
     * Calculates win rates for all class matchups
     * @param {Array} data 
     * @returns {Array}
     */
    calculateWinRates(data) {
        const allClasses = GAME_DATA.CLASSES.map(c => c.type);

        // Initialize structure: every playerClass has all opponentClasses
        const results = {};
        allClasses.forEach(player => {
            results[player] = {};
            allClasses.forEach(opponent => {
                results[player][opponent] = { win: 0, lose: 0 };
            });
        });

        // Count wins/losses
        data.forEach(game => {
            const { playerClass, opponentClass, result } = game;
            if (results[playerClass] && results[playerClass][opponentClass]) {
                if (result === "Win") {
                    results[playerClass][opponentClass].win++;
                } else {
                    results[playerClass][opponentClass].lose++;
                }
            }
        });

        // Transform into desired format
        return allClasses.map(player => {
            const opponentClasses = allClasses.map(opponent => {
                const { win, lose } = results[player][opponent];
                const total = win + lose;
                const winrate = total > 0 ? ((win / total) * 100).toFixed(2) + "%" : "0%";
                return { opponentClass: opponent, win, lose, winrate };
            });
            return { playerClass: player, opponentClasses };
        });
    }

    /**
     * Renders the statistics table
     */
    renderTable() {
        // Destroy existing table if exists
        if (this.table && $.fn.DataTable.isDataTable('#statTable')) {
            this.table.destroy();
            $('#statTable').empty();
        }

        if (this.filteredData.length === 0) {
            this.renderEmptyTable();
            return;
        }

        const winRateData = this.calculateWinRates(this.filteredData);
        
        this.table = new DataTable('#statTable', {
            searching: false,
            data: winRateData,
            order: [],
            paging: false,
            info: false,
            columns: this.createTableColumns()
        });
    }

    /**
     * Creates table columns configuration
     * @returns {Array}
     */
    createTableColumns() {
        const columns = [
            {
                title: "Player Class",
                data: "playerClass",
                render: (data) => this.renderPlayerClassCell(data)
            }
        ];

        // Add columns for each opponent class
        GAME_DATA.CLASSES.forEach(classData => {
            columns.push({
            title: this.renderClassHeader(classData),
            data: null,
            render: (data, type, row) => {
                const oppData = row.opponentClasses.find(oc => oc.opponentClass === classData.type);
                
                if (!oppData || oppData.win + oppData.lose === 0) {
                    return type === 'sort' ? 0 : '-';
                }
                
                if (type === 'sort') {
                    // Return numeric value for sorting
                    return parseFloat(oppData.winrate);
                }
                
                if (this.showCounts) {
                    return `${oppData.win}W / ${oppData.lose}L`;
                } else {
                    // Calculate win rate percentage for gradient
                    const winRateNum = parseFloat(oppData.winrate);
                    const red = Math.round(255 * (100 - winRateNum) / 100);
                    const green = Math.round(255 * winRateNum / 100);
                    const backgroundColor = `rgb(${red}, ${green}, 0)`;
                    
                    return `<span style="background-color: ${backgroundColor}; color: #fff; padding: 2px 8px; border-radius: 4px; display: inline-block; font-weight: bold;">${oppData.winrate}</span>`;
                }
            },
            type: 'num'
            });
        });

        return columns;
    }

    /**
     * Renders player class cell
     * @param {string} className 
     * @returns {string}
     */
    renderPlayerClassCell(className) {
        const colorObj = GameUtils.findClassColor(className);
        const background = colorObj ? colorObj.selectedColor : '#222';
        return `<span style="background:${background};color:#fff;padding:2px 8px;border-radius:4px;display:inline-block;">${className}</span>`;
    }

    /**
     * Renders class header
     * @param {Object} classData 
     * @returns {string}
     */
    renderClassHeader(classData) {
        return `<span style="background:${classData.selectedColor};color:#fff;padding:2px 8px;border-radius:4px;display:inline-block;">${classData.type}</span>`;
    }

    /**
     * Renders empty table message
     */
    renderEmptyTable() {
        $('#statTable').html('<tr><td colspan="8" style="text-align:center;">No data available</td></tr>');
    }

    /**
     * Toggles between winrate and count display
     */
    toggleView() {
        this.showCounts = !this.showCounts;
        
        // Update button text
        const buttonText = this.showCounts ? "Show Winrates" : "Show Win/Lose Counts";
        $('#toggleViewBtn').text(buttonText);
        
        // Re-render table
        this.renderTable();
    }

    /**
     * Handles filter application
     */
    handleApplyFilters() {
        // Get checked values from checkboxes
        this.filters.turnOrder = $('.turn-order-checkbox:checked').map(function() {
            return $(this).val();
        }).get();
        
        this.filters.group = $('.group-checkbox:checked').map(function() {
            return $(this).val();
        }).get();
        
        this.filters.expansion = $('.expansion-checkbox:checked').map(function() {
            return $(this).val();
        }).get();
        
        this.applyFilters();
        this.renderTable();
    }

    /**
     * Clears all filters
     */
    handleClearFilters() {
        // Clear all filter arrays
        this.filters.turnOrder = [];
        this.filters.group = [];
        this.filters.expansion = [];
        
        // Uncheck all checkboxes
        $('.filter-checkbox').prop('checked', false);
        
        this.applyFilters();
        this.renderTable();
    }

    /**
     * Sets up event listeners
     */
    setupEventListeners() {
        $('#toggleViewBtn').on('click', () => {
            this.toggleView();
        });

        $('#applyFiltersBtn').on('click', () => {
            this.handleApplyFilters();
        });

        $('#clearFiltersBtn').on('click', () => {
            this.handleClearFilters();
        });
    }
}

// Initialize application when DOM is ready
$(document).ready(() => {
    const app = new StatsApp();
    app.init();
});
