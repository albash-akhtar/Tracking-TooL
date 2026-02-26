const defined = v => v !== undefined && v !== null && v !== '';

const CORS_PROXIES = [
    url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    url => url
];

const DATA_SOURCES = [
    {
        name: 'ECL QC Center',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSCiZ1MdPMyVAzBqmBmp3Ch8sfefOp_kfPk2RSfMv3bxRD_qccuwaoM7WTVsieKJbA3y3DF41tUxb3T/pub?gid=0&single=true&output=csv',
        orderCol: 'Fleek ID',
        dateCol: 'Fleek Handover Date'
    },
    {
        name: 'ECL Zone',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSCiZ1MdPMyVAzBqmBmp3Ch8sfefOp_kfPk2RSfMv3bxRD_qccuwaoM7WTVsieKJbA3y3DF41tUxb3T/pub?gid=1008763065&single=true&output=csv',
        orderCol: 0,
        dateCol: 'Fleek Handover Date'
    },
    {
        name: 'GE QC Center',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTKPxWYipPjjpjNBY7X5VLqgKOyLdNMZHloy3EmsSA2Ho1y57gfPNbwz65aM7ieJaVSAQwfAv_p9d0P/pub?gid=0&single=true&output=csv',
        orderCol: 'Order Num',
        dateCol: 'Fleek Handover Date'
    },
    {
        name: 'GE Zone',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTKPxWYipPjjpjNBY7X5VLqgKOyLdNMZHloy3EmsSA2Ho1y57gfPNbwz65aM7ieJaVSAQwfAv_p9d0P/pub?gid=1008763065&single=true&output=csv',
        orderCol: 0,
        dateCol: 'Airport Handover Date'
    },
    {
        name: 'APX',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSbbwHfhPGMAH4Ly7nldKfGdDU2MzYKz2v2kfuueR1q10LJMSbPz7vgOBU2hWXk0rXNwLJk7pvLu_S4/pub?gid=0&single=true&output=csv',
        orderCol: 'Fleek ID',
        dateCol: 'Fleek Handover Date'
    },
    {
        name: 'Kerry',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSoO0JD89xK3Jutz4x8LoXQrQm7swjSgiWvGJRW4wiqxHoF1sGvlTbzJH-eMwrCqEREYH4D8DoqkOFw/pub?gid=0&single=true&output=csv',
        orderCol: '_Order',
        dateCol: 'Fleek Handover Date'
    }
];

const KERRY_STATUS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSoO0JD89xK3Jutz4x8LoXQrQm7swjSgiWvGJRW4wiqxHoF1sGvlTbzJH-eMwrCqEREYH4D8DoqkOFw/pub?gid=952498704&single=true&output=csv';

let allData = [];
let kerryStatusData = [];
let loadedSources = 0;

function parseCSV(text) {
    const lines = text.split('\n');
    if (lines.length === 0) return { headers: [], rows: [] };
    
    const parseRow = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };
    
    const headers = parseRow(lines[0]);
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            rows.push(parseRow(lines[i]));
        }
    }
    
    return { headers, rows };
}

async function fetchWithProxy(url, proxyIndex = 0) {
    if (proxyIndex >= CORS_PROXIES.length) {
        throw new Error('All proxies failed');
    }
    
    const proxyUrl = CORS_PROXIES[proxyIndex](url);
    
    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Fetch failed');
        return await response.text();
    } catch (e) {
        return fetchWithProxy(url, proxyIndex + 1);
    }
}

async function loadDataSource(source) {
    try {
        const text = await fetchWithProxy(source.url);
        const { headers, rows } = parseCSV(text);
        
        const orderColIndex = typeof source.orderCol === 'number' 
            ? source.orderCol 
            : headers.findIndex(h => h.toLowerCase().includes(source.orderCol.toLowerCase()));
        
        const dateColIndex = headers.findIndex(h => h.toLowerCase().includes(source.dateCol.toLowerCase()));
        
        rows.forEach(row => {
            allData.push({
                source: source.name,
                orderId: row[orderColIndex] || '',
                date: row[dateColIndex] || '',
                headers: headers,
                row: row
            });
        });
        
        loadedSources++;
        updateLoadingStatus();
    } catch (e) {
        console.error(`Failed to load ${source.name}:`, e);
        loadedSources++;
        updateLoadingStatus();
    }
}

async function loadKerryStatus() {
    try {
        const text = await fetchWithProxy(KERRY_STATUS_URL);
        const { headers, rows } = parseCSV(text);
        kerryStatusData = { headers, rows };
    } catch (e) {
        console.error('Failed to load Kerry status:', e);
    }
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
    return allData.filter(item => {
        return item.row.some(cell => cell && cell.toString().toLowerCase().includes(q));
    });
}

function getKerryStatus(orderId) {
    if (!kerryStatusData.rows) return null;
    
    const orderColIndex = kerryStatusData.headers.findIndex(h => 
        h.toLowerCase().includes('order') || h.toLowerCase().includes('id')
    );
    
    for (const row of kerryStatusData.rows) {
        if (row[orderColIndex] && row[orderColIndex].toLowerCase().includes(orderId.toLowerCase())) {
            return { headers: kerryStatusData.headers, row };
        }
    }
    return null;
}

function displayResults(results) {
    const resultsEl = document.getElementById('results');
    
    if (results.length === 0) {
        resultsEl.innerHTML = '<div class="no-results">No results found</div>';
        return;
    }
    
    let html = `<div class="results-count">${results.length} result(s) found</div>`;
    
    results.forEach(item => {
        html += `<div class="result-card">`;
        html += `<div class="result-header">${item.source}</div>`;
        html += `<div class="result-body">`;
        html += `<table class="result-table">`;
        
        item.headers.forEach((header, i) => {
            if (item.row[i]) {
                html += `<tr><td class="label">${header}</td><td>${item.row[i]}</td></tr>`;
            }
        });
        
        html += `</table>`;
        
        if (item.source === 'Kerry') {
            const status = getKerryStatus(item.orderId);
            if (status) {
                html += `<div class="kerry-status"><strong>Kerry Status:</strong><table class="result-table">`;
                status.headers.forEach((header, i) => {
                    if (status.row[i]) {
                        html += `<tr><td class="label">${header}</td><td>${status.row[i]}</td></tr>`;
                    }
                });
                html += `</table></div>`;
            }
        }
        
        html += `</div></div>`;
    });
    
    resultsEl.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    Promise.all([
        ...DATA_SOURCES.map(source => loadDataSource(source)),
        loadKerryStatus()
    ]);
    
    searchBtn.addEventListener('click', () => {
        const results = search(searchInput.value);
        displayResults(results);
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const results = search(searchInput.value);
            displayResults(results);
        }
    });
});
