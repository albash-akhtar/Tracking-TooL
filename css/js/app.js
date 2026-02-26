var DATA_SOURCES = {
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

var KERRY_STATUS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTZyLyZpVJz9sV5eT4Srwo_KZGnYggpRZkm2ILLYPQKSpTKkWfP9G5759h247O4QEflKCzlQauYsLKI/pub?gid=2121564686&single=true&output=csv";

var allData = {};
var kerryStatusData = [];
var currentResults = [];
var stats = {};

function fetchCSV(url, callback) {
    var proxyUrl = "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
    
    fetch(proxyUrl)
        .then(function(response) {
            return response.text();
        })
        .then(function(text) {
            callback(null, text);
        })
        .catch(function(error) {
            var proxyUrl2 = "https://corsproxy.io/?" + encodeURIComponent(url);
            fetch(proxyUrl2)
                .then(function(response) {
                    return response.text();
                })
                .then(function(text) {
                    callback(null, text);
                })
                .catch(function(error2) {
                    callback(error2, null);
                });
        });
}

function parseCSV(csvText) {
    var lines = csvText.split('\n');
    if (lines.length < 2) return [];
    
    var headers = lines[0].split(',').map(function(h) {
        return h.trim().replace(/^"|"$/g, '');
    });
    
    var data = [];
    
    for (var i = 1; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        
        var values = [];
        var current = '';
        var inQuotes = false;
        
        for (var j = 0; j < line.length; j++) {
            var char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        
        var row = {};
        for (var k = 0; k < headers.length; k++) {
            row[headers[k]] = values[k] || '';
        }
        
        var hasValue = false;
        for (var key in row) {
            if (row[key]) {
                hasValue = true;
                break;
            }
        }
        
        if (hasValue) {
            data.push(row);
        }
    }
    
    return data;
}

function loadAllData() {
    showLoading(true);
    stats = {};
    allData = {};
    
    var sourceNames = Object.keys(DATA_SOURCES);
    var loaded = 0;
    var total = sourceNames.length;
    
    sourceNames.forEach(function(name) {
        var config = DATA_SOURCES[name];
        
        fetchCSV(config.url, function(error, csvText) {
            if (!error && csvText) {
                var data = parseCSV(csvText);
                
                var searchCol;
                if (typeof config.orderCol === 'number') {
                    var headers = Object.keys(data[0] || {});
                    searchCol = headers[config.orderCol] || headers[0];
                } else {
                    searchCol = config.orderCol;
                    var headers = Object.keys(data[0] || {});
                    for (var i = 0; i < headers.length; i++) {
                        if (headers[i].toLowerCase() === searchCol.toLowerCase()) {
                            searchCol = headers[i];
                            break;
                        }
                    }
                }
                
                allData[name] = {
                    data: data,
                    config: {
                        orderCol: config.orderCol,
                        dateCol: config.dateCol,
                        partner: config.partner,
                        cssClass: config.cssClass,
                        searchCol: searchCol
                    }
                };
                stats[name] = data.length;
                console.log(name + ": " + data.length + " rows");
            } else {
                stats[name] = 0;
                console.log(name + ": failed");
            }
            
            loaded++;
            if (loaded === total) {
                loadKerryStatus();
            }
        });
    });
}

function loadKerryStatus() {
    fetchCSV(KERRY_STATUS_URL, function(error, csvText) {
        if (!error && csvText) {
            kerryStatusData = parseCSV(csvText);
        }
        showLoading(false);
        updateSidebar();
        showPreview();
    });
}

function performSearch() {
    var input = document.getElementById('searchInput');
    var query = input.value.trim().toUpperCase();
    
    if (!query) {
        alert('Please enter a search term');
        return;
    }
    
    currentResults = [];
    
    for (var sourceName in allData) {
        var sourceData = allData[sourceName];
        var data = sourceData.data;
        var config = sourceData.config;
        
        for (var i = 0; i < data.length; i++) {
            var row = data[i];
            var found = false;
            
            for (var key in row) {
                var value = String(row[key] || '').toUpperCase();
                if (value.indexOf(query) !== -1) {
                    found = true;
                    break;
                }
            }
            
            if (found) {
                var result = {};
                for (var k in row) {
                    result[k] = row[k];
                }
                result._source = sourceName;
                result._partner = config.partner;
                result._cssClass = config.cssClass;
                result._searchCol = config.searchCol;
                result._dateCol = config.dateCol;
                currentResults.push(result);
            }
        }
    }
    
    displayResults();
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        performSearch();
    }
}

function getKerryStatus(orderId) {
    if (!kerryStatusData.length) return null;
    orderId = String(orderId).toUpperCase().trim();
    
    for (var i = 0; i < kerryStatusData.length; i++) {
        var row = kerryStatusData[i];
        for (var key in row) {
            if ((key.toLowerCase().indexOf('order') !== -1 || key.toLowerCase().indexOf('fleek') !== -1) &&
                String(row[key]).toUpperCase().trim() === orderId) {
                for (var k in row) {
                    if (k.toLowerCase().indexOf('status') !== -1) {
                        return row[k];
                    }
                }
            }
        }
    }
    return null;
}

function displayResults() {
    var resultsSection = document.getElementById('resultsSection');
    var noResults = document.getElementById('noResults');
    var previewSection = document.getElementById('previewSection');
    
    if (currentResults.length === 0) {
        resultsSection.style.display = 'none';
        noResults.style.display = 'block';
        previewSection.style.display = 'none';
        return;
    }
    
    noResults.style.display = 'none';
    previewSection.style.display = 'none';
    resultsSection.style.display = 'block';
    
    document.getElementById('resultsSummary').innerHTML = '✅ Found ' + currentResults.length + ' result(s)';
    
    var eclCount = 0, geCount = 0;
    for (var i = 0; i < currentResults.length; i++) {
        if (currentResults[i]._partner === 'ECL') eclCount++;
        if (currentResults[i]._partner === 'GE') geCount++;
    }
    var otherCount = currentResults.length - eclCount - geCount;
    
    document.getElementById('statsGrid').innerHTML = 
        '<div class="stat-card"><div class="stat-value">' + currentResults.length + '</div><div class="stat-label">Total</div></div>' +
        '<div class="stat-card"><div class="stat-value ecl">' + eclCount + '</div><div class="stat-label">ECL</div></div>' +
        '<div class="stat-card"><div class="stat-value ge">' + geCount + '</div><div class="stat-label">GE</div></div>' +
        '<div class="stat-card"><div class="stat-value other">' + otherCount + '</div><div class="stat-label">APX/Kerry</div></div>';
    
    var html = '';
    var max = Math.min(currentResults.length, 50);
    
    for (var i = 0; i < max; i++) {
        var row = currentResults[i];
        var orderId = row[row._searchCol] || 'N/A';
        var handoverDate = row[row._dateCol] || 'N/A';
        var kerryStatus = row._partner === 'Kerry' ? getKerryStatus(orderId) : null;
        
        var displayData = {};
        for (var key in row) {
            if (key.indexOf('_') !== 0) {
                displayData[key] = row[key];
            }
        }
        
        html += '<div class="result-card ' + row._cssClass + '">' +
            '<span class="source-badge ' + row._cssClass + '">' + row._source + '</span>' +
            '<h4>Order: ' + orderId + '</h4>' +
            '<p>📅 Date: ' + handoverDate + '</p>' +
            (kerryStatus ? '<p class="status">📦 Status: ' + kerryStatus + '</p>' : '') +
            '<button class="details-toggle" onclick="toggleDetails(' + i + ')">📋 View Details</button>' +
            '<div class="details-content" id="details-' + i + '"><pre>' + JSON.stringify(displayData, null, 2) + '</pre></div>' +
            '</div>';
    }
    
    document.getElementById('resultsList').innerHTML = html;
}

function toggleDetails(index) {
    var el = document.getElementById('details-' + index);
    if (el.className.indexOf('show') !== -1) {
        el.className = 'details-content';
    } else {
        el.className = 'details-content show';
    }
}

function updateSidebar() {
    var total = 0;
    for (var key in stats) {
        total += stats[key];
    }
    document.getElementById('totalRecords').textContent = total.toLocaleString();
    
    var html = '';
    for (var name in DATA_SOURCES) {
        var config = DATA_SOURCES[name];
        var count = stats[name] || 0;
        html += '<div class="source-item ' + config.cssClass + '">' +
            '<span class="name">● ' + name + '</span>' +
            '<span>' + count.toLocaleString() + '</span></div>';
    }
    document.getElementById('sourceList').innerHTML = html;
    document.getElementById('lastUpdated').textContent = 'Last updated: ' + new Date().toLocaleTimeString();
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
    var sourceNames = Object.keys(DATA_SOURCES);
    
    var tabHtml = '';
    for (var i = 0; i < sourceNames.length; i++) {
        var name = sourceNames[i];
        tabHtml += '<button class="tab-btn ' + (i === 0 ? 'active' : '') + '" onclick="showTab(\'' + name + '\', this)">' + name + '</button>';
    }
    document.getElementById('tabButtons').innerHTML = tabHtml;
    
    if (sourceNames.length > 0) {
        showTab(sourceNames[0], null);
    }
}

function showTab(sourceName, btn) {
    var buttons = document.querySelectorAll('.tab-btn');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].className = 'tab-btn';
    }
    if (btn) {
        btn.className = 'tab-btn active';
    } else {
        var first = document.querySelector('.tab-btn');
        if (first) first.className = 'tab-btn active';
    }
    
    var sourceData = allData[sourceName];
    if (!sourceData || !sourceData.data || !sourceData.data.length) {
        document.getElementById('tabContent').innerHTML = '<p>No data for ' + sourceName + '</p>';
        return;
    }
    
    var data = sourceData.data.slice(0, 5);
    var headers = [];
    for (var key in data[0]) {
        if (key.indexOf('_') !== 0) {
            headers.push(key);
        }
    }
    headers = headers.slice(0, 6);
    
    var tableHtml = '<table class="data-table"><thead><tr>';
    for (var i = 0; i < headers.length; i++) {
        tableHtml += '<th>' + headers[i] + '</th>';
    }
    tableHtml += '</tr></thead><tbody>';
    
    for (var i = 0; i < data.length; i++) {
        tableHtml += '<tr>';
        for (var j = 0; j < headers.length; j++) {
            tableHtml += '<td>' + (data[i][headers[j]] || '') + '</td>';
        }
        tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table>';
    
    document.getElementById('tabContent').innerHTML = tableHtml;
}

function refreshData() {
    loadAllData();
}

function downloadResults() {
    if (!currentResults.length) return;
    
    var headers = [];
    for (var key in currentResults[0]) {
        if (key.indexOf('_') !== 0) {
            headers.push(key);
        }
    }
    headers.push('Source');
    
    var csv = headers.join(',') + '\n';
    
    for (var i = 0; i < currentResults.length; i++) {
        var row = currentResults[i];
        var values = [];
        for (var j = 0; j < headers.length; j++) {
            var h = headers[j];
            var val;
            if (h === 'Source') {
                val = row._source;
            } else {
                val = String(row[h] || '').replace(/"/g, '""');
            }
            if (val.indexOf(',') !== -1) {
                val = '"' + val + '"';
            }
            values.push(val);
        }
        csv += values.join(',') + '\n';
    }
    
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'search_results.csv';
    a.click();
    URL.revokeObjectURL(url);
}

window.onload = function() {
    console.log('TID Search Tool Starting...');
    loadAllData();
};
