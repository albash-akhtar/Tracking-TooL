const DATA_SOURCES = [
    { name: 'ECL QC Center', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSCiZ1MdPMyVAzBqmBmp3Ch8sfefOp_kfPk2RSfMv3bxRD_qccuwaoM7WTVsieKJbA3y3DF41tUxb3T/pub?gid=0&single=true&output=csv' },
    { name: 'ECL Zone', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSCiZ1MdPMyVAzBqmBmp3Ch8sfefOp_kfPk2RSfMv3bxRD_qccuwaoM7WTVsieKJbA3y3DF41tUxb3T/pub?gid=928309568&single=true&output=csv' },
    { name: 'GE QC Center', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQjCPd8bUpx59Sit8gMMXjVKhIFA_f-W9Q4mkBSWulOTg4RGahcVXSD4xZiYBAcAH6eO40aEQ9IEEXj/pub?gid=710036753&single=true&output=csv' },
    { name: 'GE Zone', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQjCPd8bUpx59Sit8gMMXjVKhIFA_f-W9Q4mkBSWulOTg4RGahcVXSD4xZiYBAcAH6eO40aEQ9IEEXj/pub?gid=10726393&single=true&output=csv' },
    { name: 'Kerry', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTZyLyZpVJz9sV5eT4Srwo_KZGnYggpRZkm2ILLYPQKSpTKkWfP9G5759h247O4QEflKCzlQauYsLKI/pub?gid=0&single=true&output=csv' },
    { name: 'Sea Shipped QC', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPWppcYunq-MuluZ2pOzptlKP-6oaHMQBS26f9lfpnSyJhIl4O_twlxp8EnA-jMbk4meLpMqWajfAX/pub?gid=1044610764&single=true&output=csv' },
    { name: 'Sea Shipped Zone', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPWppcYunq-MuluZ2pOzptlKP-6oaHMQBS26f9lfpnSyJhIl4O_twlxp8EnA-jMbk4meLpMqWajfAX/pub?gid=0&single=true&output=csv' }
];

const KERRY_STATUS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTZyLyZpVJz9sV5eT4Srwo_KZGnYggpRZkm2ILLYPQKSpTKkWfP9G5759h247O4QEflKCzlQauYsLKI/pub?gid=2121564686&single=true&output=csv';

let allData = [];
let kerryStatusData = { headers: [], rows: [] };
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

async function loadKerryStatus() {
    try {
        const text = await fetchData(KERRY_STATUS_URL);
        kerryStatusData = parseCSV(text);
        console.log(`Loaded ${kerryStatusData.rows.length} Kerry status records`);
    } catch (e) {
        console.error('Failed to load Kerry status:', e);
    }
}

function getLatestStatus(orderId) {
    if (!kerryStatusData.rows || kerryStatusData.rows.length === 0) return null;
    
    const orderIdClean = orderId.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    
    for (const row of kerryStatusData.rows) {
        const rowOrderId = (row[0] || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (rowOrderId && orderIdClean && (rowOrderId.includes(orderIdClean) || orderIdClean.includes(rowOrderId))) {
            return {
                orderId: row[0] || '',
                status: row[1] || '',
                type: row[2] || ''
            };
        }
    }
    return null;
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

function displayResults(results) {
    const resultsEl = document.getElementById('results');
    if (results.length === 0) { 
        resultsEl.innerHTML = '<div class="no-results">No results found</div>'; 
        return; 
    }
    let html = `<div class="results-count">${results.length} result(s) found</div>`;
    results.forEach(item => {
        const orderId = item.row[0] || '';
        const latestStatus = getLatestStatus(orderId);
        
        html += `<div class="result-card"><div class="result-header">${item.source}`;
        
        if (latestStatus) {
            const statusClass = latestStatus.status.toLowerCase() === 'accepted' ? 'status-accepted' : 
                               latestStatus.status.toLowerCase() === 'created' ? 'status-created' : 'status-other';
            html += ` <span class="status-badge ${statusClass}">${latestStatus.status}</span>`;
        }
        
        html += `</div><div class="result-body"><table class="result-table">`;
        
        if (latestStatus) {
            html += `<tr class="status-row"><td class="label">📦 Latest Status</td><td><strong>${latestStatus.status}</strong> (${latestStatus.type})</td></tr>`;
        }
        
        item.headers.forEach((header, i) => { 
            if (item.row[i]) html += `<tr><td class="label">${header}</td><td>${item.row[i]}</td></tr>`; 
        });
        html += `</table></div></div>`;
    });
    resultsEl.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    loadKerryStatus();
    DATA_SOURCES.forEach(source => loadDataSource(source));
    
    searchBtn.addEventListener('click', () => displayResults(search(searchInput.value)));
    searchInput.addEventListener('keypress', (e) => { 
        if (e.key === 'Enter') displayResults(search(searchInput.value)); 
    });
});
