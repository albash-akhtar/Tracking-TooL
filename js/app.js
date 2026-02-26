const DATA_SOURCES = [
    { name: 'ECL QC Center', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSCiZ1MdPMyVAzBqmBmp3Ch8sfefOp_kfPk2RSfMv3bxRD_qccuwaoM7WTVsieKJbA3y3DF41tUxb3T/pub?gid=0&single=true&output=csv', orderCol: 'Fleek ID', dateCol: 'Fleek Handover Date' },
    { name: 'ECL Zone', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSCiZ1MdPMyVAzBqmBmp3Ch8sfefOp_kfPk2RSfMv3bxRD_qccuwaoM7WTVsieKJbA3y3DF41tUxb3T/pub?gid=1008763065&single=true&output=csv', orderCol: 0, dateCol: 'Fleek Handover Date' },
    { name: 'GE QC Center', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTKPxWYipPjjpjNBY7X5VLqgKOyLdNMZHloy3EmsSA2Ho1y57gfPNbwz65aM7ieJaVSAQwfAv_p9d0P/pub?gid=0&single=true&output=csv', orderCol: 'Order Num', dateCol: 'Fleek Handover Date' },
    { name: 'GE Zone', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTKPxWYipPjjpjNBY7X5VLqgKOyLdNMZHloy3EmsSA2Ho1y57gfPNbwz65aM7ieJaVSAQwfAv_p9d0P/pub?gid=1008763065&single=true&output=csv', orderCol: 0, dateCol: 'Airport Handover Date' },
    { name: 'APX', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSbbwHfhPGMAH4Ly7nldKfGdDU2MzYKz2v2kfuueR1q10LJMSbPz7vgOBU2hWXk0rXNwLJk7pvLu_S4/pub?gid=0&single=true&output=csv', orderCol: 'Fleek ID', dateCol: 'Fleek Handover Date' },
    { name: 'Kerry', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSoO0JD89xK3Jutz4x8LoXQrQm7swjSgiWvGJRW4wiqxHoF1sGvlTbzJH-eMwrCqEREYH4D8DoqkOFw/pub?gid=0&single=true&output=csv', orderCol: '_Order', dateCol: 'Fleek Handover Date' }
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
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        url
    ];
    
    for (const proxyUrl of corsProxies) {
        try {
            const response = await fetch(proxyUrl);
            if (response.ok) {
                const text = await response.text();
                if (text && text.length > 0 && !text.includes('<!DOCTYPE')) {
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
        const orderColIndex = typeof source.orderCol === 'number' ? source.orderCol : headers.findIndex(h => h.toLowerCase().includes(source.orderCol.toLowerCase()));
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
        html += `<div class="result-card"><div class="result-header">${item.source}</div><div class="result-body"><table class="result-table">`;
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
    
    DATA_SOURCES.forEach(source => loadDataSource(source));
    
    searchBtn.addEventListener('click', () => displayResults(search(searchInput.value)));
    searchInput.addEventListener('keypress', (e) => { 
        if (e.key === 'Enter') displayResults(search(searchInput.value)); 
    });
});
