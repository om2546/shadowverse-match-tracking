const DB_NAME = 'deckDataDB';
const DB_STORE = 'deckDataStore';
const DB_VERSION = 1;

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}

async function loadDataFromIndexedDB() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, 'readonly');
        const store = tx.objectStore(DB_STORE);
        const req = store.getAll();
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}

function calculateWinRates(data) {
    const allClasses = classColor.map(c => c.type);

    // initialize structure: every playerClass has all opponentClasses
    const results = {};
    allClasses.forEach(player => {
        results[player] = {};
        allClasses.forEach(opponent => {
            results[player][opponent] = { win: 0, lose: 0 };
        });
    });

    // count wins/loses
    data.forEach(game => {
        const { playerClass, opponentClass, result } = game;
        if (results[playerClass] && results[playerClass][opponentClass]) {
            if (result === "Win") {
                results[playerClass][opponentClass].win += 1;
            } else if (result === "Lose") {
                results[playerClass][opponentClass].lose += 1;
            }
        }
    });

    // transform into desired format
    return allClasses.map(player => {
        const opponentClasses = allClasses.map(opponent => {
            const { win, lose } = results[player][opponent];
            const total = win + lose;
            const winrate = total > 0 ? ((win / total) * 100).toFixed(2) + "%" : "0%";
            return { opponentClass: opponent, winrate, win, lose };
        });
        return { playerClass: player, opponentClasses };
    });
}

let data = [];
let showCounts = false; // false = show winrate, true = show counts

function renderTable(data, showCounts) {
    // Destroy existing table if exists
    if ($.fn.DataTable.isDataTable('#statTable')) {
        $('#statTable').DataTable().destroy();
        $('#statTable').empty();
    }

    new DataTable('#statTable', {
        searching: false,
        data: calculateWinRates(data),
        order: [],
        paging: false,
        info: false,
        columns: [
            {
                title: "Player Class",
                data: "playerClass",
                render: function (data) {
                    const colorObj = classColor.find(c => c.type === data);
                    const bg = colorObj ? colorObj.selectedColor : '#222';
                    return `<span style="background:${bg};color:#fff;padding:2px 8px;border-radius:4px;display:inline-block;">${data}</span>`;
                }
            },
            ...["Swordcraft", "Runecraft", "Abysscraft", "Portalcraft", "Havencraft", "Dragoncraft", "Forestcraft"].map(className => ({
                title: `<span style="background:${classColor.find(c => c.type === className)?.selectedColor};color:#fff;padding:2px 8px;border-radius:4px;display:inline-block;">${className}</span>`,
                data: null,
                render: function (_, __, row) {
                    const oppClass = row.opponentClasses.find(oc => oc.opponentClass === className);
                    if (!oppClass || oppClass.win + oppClass.lose === 0) return "N/A";
                    if (showCounts) {
                        return `${oppClass.win} wins / ${oppClass.lose} loses`;
                    } else {
                        return oppClass.winrate;
                    }
                }
            }))
        ]
    });
}

$(document).ready(async function () {
    let dbFailed = false;
    try {
        data = await loadDataFromIndexedDB();
    } catch (e) {
        dbFailed = true;
        data = [];
    }

    if (!Array.isArray(data) || data.length === 0) {
        // fallback to default if no data in DB
        data = [];
    }

    if (dbFailed || data.length === 0) {
        // Render empty table with message
        $('#statTable').html('<tr><td colspan="8" style="text-align:center;">No data available</td></tr>');
    } else {
        renderTable(data, showCounts);
    }

    $('#toggleViewBtn').on('click', function () {
        showCounts = !showCounts;
        $(this).text(showCounts ? "Show Winrates" : "Show Win/Lose Counts");
        if (dbFailed || data.length === 0) {
            $('#statTable').html('<tr><td colspan="8" style="text-align:center;">No data available</td></tr>');
        } else {
            renderTable(data, showCounts);
        }
    });
});
