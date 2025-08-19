const classColor = [
    { 
        type: 'Swordcraft',
        color: '#dde100ff',
        selectedColor: '#8a8f00' // deeper golden green
    },
    {
        type: 'Runecraft',
        color: '#5e78feff',
        selectedColor: '#2b3cbf' // deeper blue
    },
    {
        type: 'Abysscraft',
        color: '#fb4c84ff',
        selectedColor: '#b3124b' // richer magenta-red
    },
    {
        type: 'Portalcraft',
        color: '#74bed1ff',
        selectedColor: '#2d7f96' // deep teal-blue
    },
    {
        type: 'Havencraft',
        color: '#d0be6dff',
        selectedColor: '#8a7835' // muted antique gold
    },
    {
        type: 'Dragoncraft',
        color: '#ff8f1d',
        selectedColor: '#b3540f' // warm dragon orange
    },
    {
        type: 'Forestcraft',
        color: '#93c6a1ff',
        selectedColor: '#4f7d59' // earthy forest green
    }
]

const expansionList = [
    'Legends Rise',
    'Infinity Evolved'
];

const groupList = [
    'Emerald',
    'Topaz',
    'Ruby',
    'Sapphire',
    'Diamond'
]

// IndexedDB 
const DB_NAME = 'deckDataDB';
const DB_STORE = 'deckDataStore';
const DB_VERSION = 1;

// Open IndexedDB and return a Promise with db instance
function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function (event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(DB_STORE)) {
                db.createObjectStore(DB_STORE, { keyPath: 'id', autoIncrement: true });
            }
        };
        req.onsuccess = function (event) {
            resolve(event.target.result);
        };
        req.onerror = function (event) {
            reject(event.target.error);
        };
    });
}

function saveDataToIndexedDB(dataArr) {
    dataArr.sort((a, b) => b.timeStamps - a.timeStamps);
    openDB().then(db => {
        const tx = db.transaction(DB_STORE, 'readwrite');
        const store = tx.objectStore(DB_STORE);
        // Clear old data
        const clearReq = store.clear();
        clearReq.onsuccess = function () {
            // Add all new data
            dataArr.forEach(item => {
                // Remove any existing id property to avoid conflicts
                const { id, ...rest } = item;
                store.add(rest);
            });
        };
    });
}

// Load all data from IndexedDB, returns Promise<Array>
function loadDataFromIndexedDB() {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STORE, 'readonly');
            const store = tx.objectStore(DB_STORE);
            const req = store.getAll();
            req.onsuccess = function (event) {
                resolve(event.target.result);
            };
            req.onerror = function (event) {
                reject(event.target.error);
            };
        });
    });
}

// Replace initial data assignment and DataTable setup with async load
let data = [];

$(document).ready(async function () {
    // Load from IndexedDB first
    data = await loadDataFromIndexedDB();
    if (!Array.isArray(data) || data.length === 0) {
        // fallback to default if no data in DB
        saveDataToIndexedDB(data);
    }

    const table = new DataTable('#data', {
        searching: false,
        // order: [[3, 'desc']],
        data: data,
        columns: [
            { 
                data: 'playerClass', 
                title: 'Player\'s Class',
                render: function (data) {
                    const colorObj = classColor.find(c => c.type === data);
                    const bg = colorObj ? colorObj.color : '#222';
                    return `<span style="background:${bg};color:#fff;padding:2px 8px;border-radius:4px;display:inline-block;">${data}</span>`;
                }
            },
            { 
                data: 'opponentClass', 
                title: 'Opponent\'s Class',
                render: function (data) {
                    const colorObj = classColor.find(c => c.type === data);
                    const bg = colorObj ? colorObj.color : '#222';
                    return `<span style="background:${bg};color:#fff;padding:2px 8px;border-radius:4px;display:inline-block;">${data}</span>`;
                }
            },
            { 
                data: 'turnOrder', 
                title: 'Turn Order' 
            },
            { 
                data: 'timeStamps', 
                title: 'Timestamp',
                render: function (data, type, row) {
                    if (type === 'sort') {
                        return new Date(data).getTime(); 
                    }
                    
                    const date = new Date(data);
                    const day = date.getDate();
                    const month = date.toLocaleString('en-US', { month: 'short' });
                    let hours = date.getHours();
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    hours = hours % 12;
                    hours = hours ? hours : 12;
                    return `${day} ${month}, ${hours}:${minutes}${ampm}`;
                }
            },
            {
                data: 'result',
                title: 'Result',
                render: function (data) {
                    let bg = data === 'Win' ? '#22c55e' : '#ef4444'; 
                    return `<span class="font-bold" style="background:${bg};color:#fff;padding:2px 8px;border-radius:4px;display:inline-block;">${data}</span>`;
                }
            },
            {
                data:'gameExpansion',
                title: 'Game Expansion'
            },
            {
                data: 'groupList',
                title: 'Group',
                render: function (data) {
                    return data ? data : '';
                }
            },
            {
                data: null,
                title: 'Action',
                orderable: false,
                render: function (data, type, row, meta) {
                    return `<button class="remove-btn bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded" data-row="${meta.row}">Remove</button>`;
                }
            }
        ]
    });
    $('#data tbody').on('click', '.remove-btn', function () {
        const rowIdx = $(this).data('row');
        if (confirm('Are you sure you want to remove this row?')) {
            data.splice(rowIdx, 1);
            table.row(rowIdx).remove().draw();
            saveDataToIndexedDB(data);
            updateTodayWinRate();
            console.log(data);
        }
    });
    $('#toggleFormBtn').on('click', function () {
        $('#formWrapper').slideToggle(200);
        $('#toggleIcon').toggleClass('rotate-180');
    });

    // Track selected choices
    let selectedPlayerDeck = null;
    let selectedOpponentDeck = null;
    let selectedTurnOrder = null;
    let selectedResult = 'win'; 
    let selectedExpansion = expansionList[expansionList.length - 1]; 
    let selectedGroup = null;
    try{
        selectedGroup = data[0].groupList;
    }
    catch(e){
        selectedGroup = groupList[0];
    }
    function renderGroupListRadios(selectedVal) {
        const $container = $('#groupListRadios');
        $container.empty();
        groupList.forEach(g => {
            const checked = selectedVal === g ? 'checked' : '';
            $container.append(
                `<label class="flex items-center space-x-2">
                    <input type="radio" name="groupListRadio" class="group-list-radio" value="${g}" ${checked}>
                    <span>${g}</span>
                </label>`
            );
        });
    }

    // Enable/disable submit button based on form completeness
    function updateSubmitButtonState() {
        const $btn = $('#formWrapper button[type="submit"]');
        if (isFormComplete()) {
            $btn.prop('disabled', false).removeClass('opacity-50 cursor-not-allowed');
            $btn.addClass('hover:cursor-pointer');
        } else {
            $btn.prop('disabled', true).addClass('opacity-50 cursor-not-allowed');
            $btn.removeClass('hover:cursor-pointer');
        }
    }

    // Render classColor choices for Player's Deck and Opponent's Deck
    function renderDeckChoices(containerId, groupName, selectedType) {
        const $container = $('#' + containerId);
        $container
            .empty()
            .addClass('flex flex-wrap gap-2');
        classColor.forEach((c, idx) => {
            const isSelected = selectedType === c.type;
            $container.append(
                `<button type="button" 
                    class="deck-choice px-4 py-2 rounded text-sm font-semibold border transition-colors duration-150 hover:cursor-pointer mb-2"
                    style="background:${isSelected ? c.selectedColor : c.color};color:#fff;${isSelected ? 'border:2px solid #222;' : 'border:1px solid transparent;'} min-width:110px; word-break:break-word;"
                    data-class="${c.type}"
                    data-group="${groupName}"
                >${c.type}</button>`
            );
        });
    }

    // Render turn order choices
    function renderTurnOrderChoices(selected) {
        const options = [
            { label: '1st', value: '1st' },
            { label: '2nd', value: '2nd' },
            { label: 'Unknown', value: 'unknown' }
        ];
        const $container = $('#turnOrderChoices');
        $container.empty().addClass('flex space-x-2');
        options.forEach(opt => {
            const isSelected = selected === opt.value;
            $container.append(
                `<button type="button"
                    class="turn-order-choice px-4 py-2 rounded border font-semibold transition-colors duration-150 hover:cursor-pointer"
                    style="${isSelected ? 'background:#2563eb;color:#fff;border:2px solid #222;' : 'background:#f3f4f6;color:#222;border:1px solid #ccc;'}"
                    data-value="${opt.value}"
                >${opt.label}</button>`
            );
        });
    }

    // Render result choices
    function renderResultChoices(selected) {
        const options = [
            { label: 'Win', value: 'win', color: '#22c55e' },
            { label: 'Lose', value: 'lose', color: '#ef4444' }
        ];
        const $container = $('#resultChoices');
        $container.empty().addClass('flex space-x-2');
        options.forEach(opt => {
            const isSelected = selected === opt.value;
            $container.append(
                `<button type="button"
                    class="result-choice px-4 py-2 rounded border font-semibold transition-colors duration-150 hover:cursor-pointer"
                    style="${
                        isSelected
                            ? `background:${opt.color};color:#fff;border:2px solid #222;`
                            : 'background:#f3f4f6;color:#222;border:1px solid #ccc;'
                    } min-width:60px;"
                    data-value="${opt.value}"
                >${opt.label}</button>`
            );
        });
    }

    // Render expansion dropdown
    function renderExpansionDropdown(selected) {
        const $select = $('#expansionSelect');
        $select.empty();
        expansionList.forEach(exp => {
            $select.append(
                `<option value="${exp}"${selected === exp ? ' selected' : ''}>${exp}</option>`
            );
        });
    }

    // Utility to calculate today's win rate
    function updateTodayWinRate() {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todayGames = data.filter(d => d.timeStamps >= startOfDay);
        const winCount = todayGames.filter(d => d.result === 'Win').length;
        const rate = todayGames.length > 0 ? (winCount / todayGames.length) * 100 : 0;
        $('#todayWinRate').text(todayGames.length > 0 ? rate.toFixed(2) + '%' : '0.00%');
    }

    // Utility to check if all required fields are selected
    function isFormComplete() {
        return (
            selectedPlayerDeck &&
            selectedOpponentDeck &&
            selectedTurnOrder &&
            selectedResult &&
            selectedExpansion &&
            selectedGroup
        );
    }

    // After table is drawn or data changes, update win rate
    function refreshTableAndWinRate() {
        table.clear().rows.add(data).draw();
        updateTodayWinRate();
    }

    // Initial render
    renderDeckChoices('playerDeckChoices', 'player', selectedPlayerDeck);
    renderDeckChoices('opponentDeckChoices', 'opponent', selectedOpponentDeck);
    renderTurnOrderChoices(selectedTurnOrder);
    renderResultChoices(selectedResult);
    renderExpansionDropdown(selectedExpansion);
    renderGroupListRadios(selectedGroup);
    updateSubmitButtonState();
    updateTodayWinRate();

    // GroupList radio change handler
    $(document).on('change', '.group-list-radio', function () {
        selectedGroup = $(this).val();
        updateSubmitButtonState();
    });

    // Expansion dropdown change handler
    $('#expansionSelect').on('change', function () {
        selectedExpansion = $(this).val();
        updateSubmitButtonState();
    });

    // Selection logic for deck choices
    function handleDeckChoiceClick(e) {
        e.preventDefault();
        const $btn = $(this);
        const group = $btn.data('group');
        const selectedType = $btn.data('class');
        if (group === 'player') {
            selectedPlayerDeck = selectedType;
            renderDeckChoices('playerDeckChoices', 'player', selectedPlayerDeck);
        } else if (group === 'opponent') {
            selectedOpponentDeck = selectedType;
            renderDeckChoices('opponentDeckChoices', 'opponent', selectedOpponentDeck);
        }
        updateSubmitButtonState();
    }

    // Selection logic for turn order
    function handleTurnOrderClick(e) {
        e.preventDefault();
        const $btn = $(this);
        selectedTurnOrder = $btn.data('value');
        renderTurnOrderChoices(selectedTurnOrder);
        updateSubmitButtonState();
    }

    // Selection logic for result
    function handleResultClick(e) {
        e.preventDefault();
        const $btn = $(this);
        selectedResult = $btn.data('value');
        renderResultChoices(selectedResult);
        updateSubmitButtonState();
    }

    $(document).on('click', '.deck-choice', handleDeckChoiceClick);
    $(document).on('click', '.turn-order-choice', handleTurnOrderClick);
    $(document).on('click', '.result-choice', handleResultClick);

    // Prevent form submit from resetting choices
    $('#formWrapper form').on('submit', function(e) {
        e.preventDefault();
        data.push({
            playerClass: selectedPlayerDeck,
            opponentClass: selectedOpponentDeck,
            turnOrder: selectedTurnOrder,
            result: selectedResult === 'win' ? 'Win' : 'Lose',
            timeStamps: Date.now(),
            gameExpansion: selectedExpansion,
            groupList: selectedGroup // now a string
        });
        refreshTableAndWinRate();
        saveDataToIndexedDB(data);
        // Optionally, reset selections (uncomment if you want to reset form after submit)
        // selectedPlayerDeck = null;
        // selectedOpponentDeck = null;
        // selectedTurnOrder = null;
        // selectedResult = 'win';
        // renderDeckChoices('playerDeckChoices', 'player', selectedPlayerDeck);
        // renderDeckChoices('opponentDeckChoices', 'opponent', selectedOpponentDeck);
        // renderTurnOrderChoices(selectedTurnOrder);
        // renderResultChoices(selectedResult);
        // updateSubmitButtonState();
    });

    // Export to JSON button handler
    $('#exportJsonBtn').on('click', function () {
        // Remove any IndexedDB id property before export
        const exportData = data.map(({ id, ...rest }) => rest);
        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'deck-data.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    });

    // Import JSON button handler
    $('#importJsonInput').on('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (evt) {
            try {
                const imported = JSON.parse(evt.target.result);
                if (!Array.isArray(imported)) {
                    alert('Invalid JSON format: root should be an array.');
                    return;
                }
                // Merge: add new records, avoid duplicates by timestamp+playerClass+opponentClass+turnOrder+result+gameExpansion
                const key = d => [
                    d.timeStamps,
                    d.playerClass,
                    d.opponentClass,
                    d.turnOrder,
                    d.result,
                    d.gameExpansion
                ].join('|');
                const existingKeys = new Set(data.map(key));
                let added = 0;
                imported.forEach(item => {
                    if (!existingKeys.has(key(item))) {
                        data.push(item);
                        added++;
                    }
                });
                if (added > 0) {
                    refreshTableAndWinRate();
                    saveDataToIndexedDB(data);
                }
                alert(`Imported ${added} new record(s).`);
            } catch (err) {
                alert('Failed to import JSON: ' + err.message);
            }
            // Reset input so same file can be imported again if needed
            $('#importJsonInput').val('');
        };
        reader.readAsText(file);
    });

    // Also update submit button state on page load
    updateSubmitButtonState();
});