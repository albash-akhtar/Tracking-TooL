const DATA_SOURCES = {
    "ECL QC Center": {
        url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSCiZ1MdPMyVAzBqmBmp3Ch8sfefOp_kfPk2RSfMv3bxRD_qccuwaoM7WTVsieKJbA3y3DF41tUxb3T/pub?gid=0&single=true&output=csv",
        orderCol: "Fleek ID",
        dateCol: "Fleek Handover Date",
        partner: "ECL",
        cssClass: "ecl"
    },
    "ECL Zone": {
        url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSCiZ1MdPMyVAzBqmBmp3Ch8sfefOp_kfPk2RSfMv3bxRD_qccuwaoM7WTVsieKJbA3y3DF41tUxb3T/pub?gid=928309568&single=true&output=csv",
        orderCol: 0,
        dateCol: "Fleek Handover Date",
        partner: "ECL",
        cssClass: "ecl"
    },
    "GE QC Center": {
        url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQjCPd8bUpx59Sit8gMMXjVKhIFA_f-W9Q4mkBSWulOTg4RGahcVXSD4xZiYBAcAH6eO40aEQ9IEEXj/pub?gid=710036753&single=true&output=csv",
        orderCol: "Order Num",
        dateCol: "Fleek Handover Date",
        partner: "GE",
        cssClass: "ge"
    },
    "GE Zone": {
        url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQjCPd8bUpx59Sit8gMMXjVKhIFA_f-W9Q4mkBSWulOTg4RGahcVXSD4xZiYBAcAH6eO40aEQ9IEEXj/pub?gid=10726393&single=true&output=csv",
        orderCol: 0,
        dateCol: "Airport Handover Date",
        partner: "GE",
        cssClass: "ge"
    },
    "APX": {
        url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRDEzAMUwnFZ7aoThGoMERtxxsll2kfEaSpa9ksXIx6sqbdMncts6Go2d5mKKabepbNXDSoeaUlk-mP/pub?gid=0&single=true&output=csv",
        orderCol: "Fleek ID",
        dateCol: "Fleek Handover Date",
        partner: "APX",
        cssClass: "apx"
    },
    "Kerry": {
        url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTZyLyZpVJz9sV5eT4Srwo_KZGnYggpRZkm2ILLYPQKSpTKkWfP9G5759h247O4QEflKCzlQauYsLKI/pub?gid=0&single=true&output=csv",
        orderCol: "_Order",
        dateCol: "Fleek Handover Date",
        partner: "Kerry",
        cssClass: "kerry"
    }
};

const KERRY_STATUS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTZyLyZpVJz9sV5eT4Srwo_KZGnYggpRZkm2ILLYPQKSpTKkWfP9G5759h247O4QEflKCzlQauYsLKI/pub?gid=2121564686&single=true&output=csv";

let allData = {};
let kerryStatusData = [];
let currentResults = [];
let stats = {};

async function loadCSV(url) {
    return new Promise((resolve, reject) => {
        Papa.parse(url, {
            download: true,
            header: true,
            complete: (results) => resolve(results.data),
            error: (error) => reject(error)
        });
    });
}

async function loadAllData() {
    showLoading(true);
    stats = {};
    allData = {};
    
    const promises = Object.entries(DATA_SOURCES).map(async ([name, config]) => {
        try {
            const data = await loadCSV(config.url);
            let searchCol;
            if (typeof config.orderCol === 'number') {
                const headers = Object.keys(data[0] || {});
                searchCol = headers[config.orderCol] || headers[0];
            } else {
                searchCol = config.orderCol;
                const headers = Object.keys(data[0] || {});
                const match = headers.find(h => h.toLowerCase() === searchCol.toLowerCase());
                if (match) searchCol = match;
            }
            allData[name] = {
                data: data.filter(row => Object.values(row).some(v => v)),
                config: { ...config, searchCol }
            };
            stats[name] = allData[name].data.length;
        } catch (error) {
            console.error(`Error loading ${name}:`, error);
            stats[name] = 0;
        }
    });
    
    promises.push(
        loadCSV(KERRY_STATUS_URL)
            .then(data => { kerryStatusData = data; })
            .catch(() => { kerryStatusData = []; })
    );
    
    await Promise.all(promises);
    showLoading(false);
    updateSidebar();
    showPreview();
}

function performSearch() {
    const query = document.getElementById('searchInput').value.trim().toUpperCase();
    if (!query) {
        alert('Please enter a search term');
        return;
    }
    
    currentResults = [];
    Object.entries(allData).forEach(([sourceName, sourceData]) => {
        const { data, config } = sourceData;
        const searchCol = config.searchCol;
        data.forEach(row => {
            const value = String(row[searchCol] || '').toUpperCase();
            if (value.includes(query)) {
                currentResults.push({
                    ...row,
                    _source: sourceName,
                    _partner: config.partner,
                    _cssClass: config.cssClass,
                    _searchCol: searchCol,
                    _dateCol: config.dateCol
                });
            }
        });
    });
    displayResults();
}

function handleKeyPress(event) {
    if (event.key === 'Enter') performSearch();
}

function getKerryStatus(orderId) {
    if (!kerryStatusData.length) return null;
    orderId = String(orderId).toUpperCase().trim();
    for (const row of kerryStatusData) {
        for (const [key, value] of Object.entries(row)) {
            if ((key.toLowerCase().includes('order') || key.toLowerCase().includes('fleek')) &&
                String(value).toUpperCase().trim() === orderId) {
                for (const [k, v] of Object.entries(row)) {
                    if (k.toLowerCase().includes('status')) return v;
                }
            }
        }
    }
    return null;
}

function displayResults() {
    const resultsSection = document.getElementById('resultsSection');
    const noResults = document.getElementById('noResults');
    const previewSection = document.getElementById('previewSection');
    
    if (currentResults.length === 0) {
        resultsSection.style.display = 'none';
        noResults.style.display = 'block';
        previewSection.style.display = 'none';
        return;
    }
    
    noResults.style.display = 'none';
    previewSection.style.display = 'none';
    resultsSection.style.display = 'block';
    
    document.getElementById('resultsSummary').innerHTML = `✅ Found ${currentResults.length} result(s)`;
    
    const eclCount = currentResults.filter(r => r._partner === 'ECL').length;
    const geCount = currentResults.filter(r => r._partner === 'GE').length;
    const otherCount = currentResults.length - eclCount - geCount;
    
    document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card"><div class="stat-value">${currentResults.length}</div><div class="stat-label">Total Results</div></div>
        <div class="stat-card"><div class="stat-value ecl">${eclCount}</div><div class="stat-label">ECL</div></div>
        <div class="stat-card"><div class="stat-value ge">${geCount}</div><div class="stat-label">GE</div></div>
        <div class="stat-card"><div class="stat-value other">${otherCount}</div><div class="stat-label">APX/Kerry</div></div>
    `;
    
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = currentResults.map((row, index) => {
        const orderId = row[row._searchCol] || 'N/A';
        const handoverDate = row[row._dateCol] || 'N/A';
        const kerryStatus = row._partner === 'Kerry' ? getKerryStatus(orderId) : null;
        const displayData = {};
        Object.entries(row).forEach(([key, value]) => {
            if (!key.startsWith('_')) displayData[key] = value;
        });
        return `
            <div class="result-card ${row._cssClass}">
                <span class="source-badge ${row._cssClass}">${row._source}</span>
                <h4>Order: ${orderId}</h4>
                <p>📅 Handover Date: ${handoverDate}</p>
                ${kerryStatus ? `<p class="status">📦 Status: ${kerryStatus}</p>` : ''}
                <button class="details-toggle" onclick="toggleDetails(${index})">📋 View All Details</button>
                <div class="details-content" id="details-${index}"><pre>${JSON.stringify(displayData, null, 2)}</pre></div>
            </div>
        `;
    }).join('');
}

function toggleDetails(index) {
    document.getElementById(`details-${index}`).classList.toggle('show');
}

function updateSidebar() {
    const totalRecords = Object.values(stats).reduce((a, b) => a + b, 0);
    document.getElementById('totalRecords').textContent = totalRecords.toLocaleString();
    document.getElementById('sourceList').innerHTML = Object.entries(DATA_SOURCES).map(([name, config]) => `
        <div class="source-item ${config.cssClass}">
            <span class="name">● ${name}</span>
            <span>${(stats[name] || 0).toLocaleString()}</span>
        </div>
    `).join('');
    document.getElementById('lastUpdated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    if (show) {
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('noResults').style.display = 'none';
        document.getElementById('previewSection').style.display = 'none';
    }
}

function showPreview() {
    document.getElementById('previewSection').style.display = 'block';
    const sourceNames = Object.keys(DATA_SOURCES);
    document.getElementById('tabButtons').innerHTML = sourceNames.map((name, index) => `
        <button class="tab-btn ${index === 0 ? 'active' : ''}" onclick="showTab('${name}', this)">${name}</button>
    `).join('');
    showTab(sourceNames[0]);
}

function showTab(sourceName, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    else document.querySelector('.tab-btn').classList.add('active');
    
    const sourceData = allData[sourceName];
    if (!sourceData || !sourceData.data.length) {
        document.getElementById('tabContent').innerHTML = `<p>No data available for ${sourceName}</p>`;
        return;
    }
    
    const data = sourceData.data.slice(0, 5);
    const headers = Object.keys(data[0]).filter(h => !h.startsWith('_'));
    document.getElementById('tabContent').innerHTML = `
        <table class="data-table">
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${data.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
    `;
}

function refreshData() {
    loadAllData();
}

function downloadResults() {
    if (!currentResults.length) return;
    const csvData = currentResults.map(row => {
        const cleanRow = {};
        Object.entries(row).forEach(([key, value]) => {
            if (!key.startsWith('_')) cleanRow[key] = value;
        });
        cleanRow['Source'] = row._source;
        return cleanRow;
    });
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search_results_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
});
