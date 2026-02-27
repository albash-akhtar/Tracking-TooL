const DATA_SOURCES = [
    { name: 'ECL QC Center', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSCiZ1MdPMyVAzBqmBmp3Ch8sfefOp_kfPk2RSfMv3bxRD_qccuwaoM7WTVsieKJbA3y3DF41tUxb3T/pub?gid=0&single=true&output=csv' },
    { name: 'ECL Zone', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSCiZ1MdPMyVAzBqmBmp3Ch8sfefOp_kfPk2RSfMv3bxRD_qccuwaoM7WTVsieKJbA3y3DF41tUxb3T/pub?gid=928309568&single=true&output=csv' },
    { name: 'ECL Old QC', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS84VLYyM4GsV0SQ_GPo0CuaRg7z2JjMCeS9NKMaErXeh9AZ5RtS9QLCdWxGpMP4JUk6QUcC-jIJel7/pub?gid=0&single=true&output=csv' },
    { name: 'ECL Old Zone', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS84VLYyM4GsV0SQ_GPo0CuaRg7z2JjMCeS9NKMaErXeh9AZ5RtS9QLCdWxGpMP4JUk6QUcC-jIJel7/pub?gid=928309568&single=true&output=csv' },
    { name: 'GE QC Center', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQjCPd8bUpx59Sit8gMMXjVKhIFA_f-W9Q4mkBSWulOTg4RGahcVXSD4xZiYBAcAH6eO40aEQ9IEEXj/pub?gid=710036753&single=true&output=csv' },
    { name: 'GE Zone', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQjCPd8bUpx59Sit8gMMXjVKhIFA_f-W9Q4mkBSWulOTg4RGahcVXSD4xZiYBAcAH6eO40aEQ9IEEXj/pub?gid=10726393&single=true&output=csv' },
    { name: 'APX', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRDEzAMUwnFZ7aoThGoMERtxxsll2kfEaSpa9ksXIx6sqbdMncts6Go2d5mKKabepbNXDSoeaUlk-mP/pub?gid=0&single=true&output=csv' },
    { name: 'Kerry', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTZyLyZpVJz9sV5eT4Srwo_KZGnYggpRZkm2ILLYPQKSpTKkWfP9G5759h247O4QEflKCzlQauYsLKI/pub?gid=0&single=true&output=csv' },
    { name: 'Sea Shipped QC', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPWppcYunq-MuluZ2pOzptlKP-6oaHMQBS26f9lfpnSyJhIl4O_twlxp8EnA-jMbk4meLpMqWajfAX/pub?gid=1044610764&single=true&output=csv' },
    { name: 'Sea Shipped Zone', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPWppcYunq-MuluZ2pOzptlKP-6oaHMQBS26f9lfpnSyJhIl4O_twlxp8EnA-jMbk4meLpMqWajfAX/pub?gid=0&single=true&output=csv' }
];

// Columns jo dikhane hain (sab sheets mein)
const ALLOWED_COLUMNS = [
    'fleek id',
    'fleek handover date',
    'no. of boxes',
    'n.o of boxes',
    'chargeable weight',
    'vendor name',
    'item count',
    'customer name',
    'tracking id',
    'mawb',
    'mawb/flight',
    'flight',
    'order num',
    'order number',
    '3pl',
    'qc status',
    'ecl entry date',
    'airport handover date'
];

let allData = [];
let loadedSources = 0;

function parseCSV(text) {
    const lines = text.split('\n');
    if (lines.length === 0) return { headers: [], rows: [] };
    const parseRow = (line) => {
        const result = []; let current = ''; let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
            else current += char;
        }
        result.push(current.trim());
        return result;
    };
    const headers = parseRow(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) { if (lines[i].trim()) rows.push(parseRow(lines[i])); }
    return { headers, rows };
}

async function fetchData(url) {
    const corsProxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        url
    ];
    
    for (const proxyUrl of corsProxies) {
        try {
            const response = await fetch(proxyUrl);
            if (response.ok) {
                const text = await response.text();
                if (text && text.length > 100 && !text.includes('<!DOCTYPE') && !text.includes('<html')) {
                    return text;
                }
            }
        } catch (e) {
            console.log('Proxy failed, trying next...');
        }
    }
    throw new Error('All proxies failed');
}

async function loadDataSource(source) {
    try {
        const text = await fetchData(source.url);
        const { headers, rows } = parseCSV(text);
        rows.forEach(row => { 
            allData.push({ source: source.name, headers, row }); 
        });
        console.log(`Loaded ${rows.length} rows from ${source.name}`);
    } catch (e) { 
        console.error(`Failed to load ${source.name}:`, e); 
    }
    loadedSources++;
    updateLoadingStatus();
}

function updateLoadingStatus() {
    const loadingEl = document.getElementById('loading');
    const contentEl = document.getElementById('content');
    
    if (loadedSources >= DATA_SOURCES.length) {
        loadingEl.style.display = 'none';
        contentEl.style.display = 'block';
        document.getElementById('stats').textContent = `Loaded ${allData.length} records from ${DATA_SOURCES.length} sources`;
    } else {
        loadingEl.textContent = `Loading data sources... (${loadedSources}/${DATA_SOURCES.length})`;
    }
}

function search(query) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return allData.filter(item => item.row.some(cell => cell && cell.toString().toLowerCase().includes(q)));
}

function shouldShowColumn(header) {
    if (!header) return false;
    const h = header.toLowerCase().trim();
    return ALLOWED_COLUMNS.some(allowed => h.includes(allowed) || allowed.includes(h));
}

function displayResults(results) {
    const resultsEl = document.getElementById('results');
    if (results.length === 0) { 
        resultsEl.innerHTML = '<div class="no-results">No results found</div>'; 
        return; 
    }
    let html = `<div class="results-count">${results.length} result(s) found</div>`;
    results.forEach(item => {
        html += `<div class="result-card"><div class="result-header">${item.source}</div><div class="result-body"><table class="result-table">`;
        item.headers.forEach((header, i) => { 
            if (item.row[i] && header && shouldShowColumn(header)) {
                html += `<tr><td class="label">${header}</td><td>${item.row[i]}</td></tr>`; 
            }
        });
        html += `</table></div></div>`;
    });
    resultsEl.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    DATA_SOURCES.forEach(source => loadDataSource(source));
    
    searchBtn.addEventListener('click', () => displayResults(search(searchInput.value)));
    searchInput.addEventListener('keypress', (e) => { 
        if (e.key === 'Enter') displayResults(search(searchInput.value)); 
    });
});
