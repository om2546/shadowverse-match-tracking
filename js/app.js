/**
 * Main application class
 */
import DatabaseService from './database.js';
import { UIComponents, TableRenderer } from './ui-components.js';
import { GameUtils, DOMUtils, ValidationUtils } from './utils.js';
import { GAME_DATA, MESSAGES } from './config.js';

class MatchTracker {
    constructor() {
        this.db = new DatabaseService();
        this.ui = new UIComponents();
        this.data = [];
        this.table = null;
        
        // Form state
        this.formState = {
            selectedPlayerDeck: null,
            selectedOpponentDeck: null,
            selectedTurnOrder: null,
            selectedResult: 'win',
            selectedExpansion: GAME_DATA.EXPANSIONS[GAME_DATA.EXPANSIONS.length - 1],
            selectedGroup: null
        };
        
        this.initializeEventListeners();
    }

    /**
     * Initializes the application
     */
    async init() {
        try {
            await this.loadData();
            this.initializeTable();
            this.initializeFormDefaults();
            this.renderUI();
            this.updateWinRate();
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.handleError(error);
        }
    }

    /**
     * Loads data from database
     */
    async loadData() {
        try {
            this.data = await this.db.loadData();
            
            // Set default group from existing data or fallback
            if (this.data.length > 0) {
                this.formState.selectedGroup = this.data[0].groupList;
            } else {
                this.formState.selectedGroup = GAME_DATA.GROUPS[0];
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            this.data = [];
            this.formState.selectedGroup = GAME_DATA.GROUPS[0];
        }
    }

    /**
     * Initializes DataTable
     */
    initializeTable() {
        this.table = new DataTable('#data', {
            lengthMenu: [5, 15 , 25, 50],
            pageLength: 5,
            searching: false,
            order: [],
            data: this.data,
            columns: TableRenderer.createColumns()
        });
    }

    /**
     * Sets up form defaults
     */
    initializeFormDefaults() {
        // Form state is already initialized in constructor
    }

    /**
     * Renders all UI components
     */
    renderUI() {
        this.ui.renderDeckChoices('playerDeckChoices', 'player', this.formState.selectedPlayerDeck);
        this.ui.renderDeckChoices('opponentDeckChoices', 'opponent', this.formState.selectedOpponentDeck);
        this.ui.renderTurnOrderChoices(this.formState.selectedTurnOrder);
        this.ui.renderResultChoices(this.formState.selectedResult);
        this.ui.renderExpansionDropdown(this.formState.selectedExpansion);
        this.ui.renderGroupListRadios(this.formState.selectedGroup);
        this.updateSubmitButtonState();
    }

    /**
     * Updates submit button state based on form completion
     */
    updateSubmitButtonState() {
        const isComplete = ValidationUtils.isFormComplete(this.formState);
        this.ui.updateSubmitButtonState(isComplete);
    }

    /**
     * Updates win rate display
     */
    updateWinRate() {
        this.ui.updateShowStats(this.data);
    }

    /**
     * Refreshes table and win rate
     */
    async refreshDisplay() {
        await this.saveData();
        await this.loadData(); // reload and sort data from db
        this.table.clear().rows.add(this.data).draw();
        this.updateWinRate();
    }

    /**
     * Saves current data to database
     */
    async saveData() {
        try {
            await this.db.saveData(this.data);
        } catch (error) {
            console.error('Failed to save data:', error);
            this.handleError(error);
        }
    }

    /**
     * Handles form submission
     */
    async handleFormSubmit() {
        if (!ValidationUtils.isFormComplete(this.formState)) {
            return;
        }

        const newMatch = {
            playerClass: this.formState.selectedPlayerDeck,
            opponentClass: this.formState.selectedOpponentDeck,
            turnOrder: this.formState.selectedTurnOrder,
            result: this.formState.selectedResult === 'win' ? 'Win' : 'Lose',
            timeStamps: Date.now(),
            gameExpansion: this.formState.selectedExpansion,
            groupList: this.formState.selectedGroup
        };

        this.data.push(newMatch);
        this.refreshDisplay();
        await this.saveData();
    }

    /**
     * Handles row removal
     * @param {number} rowIndex 
     */
    async handleRowRemoval(rowIndex) {
        if (!confirm(MESSAGES.CONFIRM_DELETE)) {
            return;
        }

        // Delete data where id = rowIndex
        this.data = this.data.filter(item => item.id !== rowIndex);

        this.refreshDisplay();
        await this.saveData();
    }

    /**
     * Handles deck choice selection
     * @param {string} deckType 
     * @param {string} group 
     */
    handleDeckChoice(deckType, group) {
        if (group === 'player') {
            this.formState.selectedPlayerDeck = deckType;
            this.ui.renderDeckChoices('playerDeckChoices', 'player', deckType);
        } else if (group === 'opponent') {
            this.formState.selectedOpponentDeck = deckType;
            this.ui.renderDeckChoices('opponentDeckChoices', 'opponent', deckType);
        }
        this.updateSubmitButtonState();
    }

    /**
     * Handles turn order selection
     * @param {string} turnOrder 
     */
    handleTurnOrderChoice(turnOrder) {
        this.formState.selectedTurnOrder = turnOrder;
        this.ui.renderTurnOrderChoices(turnOrder);
        this.updateSubmitButtonState();
    }

    /**
     * Handles result selection
     * @param {string} result 
     */
    handleResultChoice(result) {
        this.formState.selectedResult = result;
        this.ui.renderResultChoices(result);
        this.updateSubmitButtonState();
    }

    /**
     * Handles group selection
     * @param {string} group 
     */
    handleGroupChoice(group) {
        this.formState.selectedGroup = group;
        this.updateSubmitButtonState();
    }

    /**
     * Handles expansion selection
     * @param {string} expansion 
     */
    handleExpansionChoice(expansion) {
        this.formState.selectedExpansion = expansion;
        this.updateSubmitButtonState();
    }

    /**
     * Handles data export
     */
    handleExport() {
        const exportData = this.data.map(({ id, ...rest }) => rest);
        DOMUtils.downloadJSON(exportData, 'deck-data.json');
    }

    /**
     * Handles data import
     * @param {File} file 
     */
    async handleImport(file) {
        if (!file) return;

        try {
            const text = await this.readFile(file);
            const imported = JSON.parse(text);

            if (!ValidationUtils.isValidImportData(imported)) {
                alert(MESSAGES.INVALID_JSON);
                return;
            }

            const existingKeys = new Set(this.data.map(GameUtils.createGameKey));
            let addedCount = 0;

            imported.forEach(item => {
                if (!existingKeys.has(GameUtils.createGameKey(item))) {
                    this.data.push(item);
                    addedCount++;
                }
            });

            if (addedCount > 0) {
                this.refreshDisplay();
                await this.saveData();
            }

            alert(MESSAGES.IMPORT_SUCCESS(addedCount));

        } catch (error) {
            alert(MESSAGES.IMPORT_ERROR(error.message));
        }
    }

    /**
     * Reads file content
     * @param {File} file 
     * @returns {Promise<string>}
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Handles application errors
     * @param {Error} error 
     */
    handleError(error) {
        console.error('Application error:', error);
        // Could show user-friendly error message here
    }

    /**
     * Sets up event listeners
     */
    initializeEventListeners() {
        $(document).ready(() => {
            this.setupEventHandlers();
        });
    }

    /**
     * Sets up all event handlers
     */
    setupEventHandlers() {
        // Form toggle
        $('#toggleFormBtn').on('click', () => {
            this.ui.toggleForm();
        });

        // Form submission
        $('#formWrapper form').on('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // Row removal
        $('#data tbody').on('click', '.remove-btn', (e) => {
            const rowIndex = $(e.target).data('row');
            this.handleRowRemoval(rowIndex);
        });

        // Deck choices
        $(document).on('click', '.deck-choice', (e) => {
            e.preventDefault();
            const $btn = $(e.target);
            const group = $btn.data('group');
            const deckType = $btn.data('class');
            this.handleDeckChoice(deckType, group);
        });

        // Turn order choices
        $(document).on('click', '.turn-order-choice', (e) => {
            e.preventDefault();
            const turnOrder = $(e.target).data('value');
            this.handleTurnOrderChoice(turnOrder);
        });

        // Result choices
        $(document).on('click', '.result-choice', (e) => {
            e.preventDefault();
            const result = $(e.target).data('value');
            this.handleResultChoice(result);
        });

        // Group selection
        $(document).on('change', '.group-list-radio', (e) => {
            const group = $(e.target).val();
            this.handleGroupChoice(group);
        });

        // Expansion selection
        $('#expansionSelect').on('change', (e) => {
            const expansion = $(e.target).val();
            this.handleExpansionChoice(expansion);
        });

        // Export button
        $('#exportJsonInput').on('click', () => {
            this.handleExport();
        });

        // Import button
        $('#importJsonInput').on('change', (e) => {
            const file = e.target.files[0];
            this.handleImport(file);
            // Reset input for repeated imports
            $(e.target).val('');
        });
    }
}

// Initialize application when DOM is ready
$(document).ready(() => {
    const app = new MatchTracker();
    app.init();
});
