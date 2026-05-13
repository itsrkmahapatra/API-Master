/**
 * API Master - Core Application Logic
 * Created by Raj Kishor Mahapatra
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const state = {
        theme: localStorage.getItem('theme') || 'dark',
        history: JSON.parse(localStorage.getItem('api-history') || '[]'),
        activeWS: null
    };

    // --- DOM Elements ---
    const elements = {
        themeToggle: document.getElementById('theme-toggle'),
        navTabs: document.querySelectorAll('.nav-tab'),
        tabContents: document.querySelectorAll('.tab-content'),
        innerTabs: document.querySelectorAll('.inner-tab'),
        innerTabContents: document.querySelectorAll('.inner-tab-content'),
        
        // REST
        restMethod: document.getElementById('rest-method'),
        restUrl: document.getElementById('rest-url'),
        restSend: document.getElementById('rest-send'),
        restHeadersList: document.getElementById('rest-headers-list'),
        addRestHeader: document.getElementById('add-rest-header'),
        restBody: document.getElementById('rest-body-content'),
        
        // GraphQL
        gqlUrl: document.getElementById('gql-url'),
        gqlSend: document.getElementById('gql-send'),
        gqlQuery: document.getElementById('gql-query-content'),
        gqlVars: document.getElementById('gql-vars-content'),
        gqlHeadersList: document.getElementById('gql-headers-list'),
        addGqlHeader: document.getElementById('add-gql-header'),
        
        // WebSocket
        wsUrl: document.getElementById('ws-url'),
        wsConnect: document.getElementById('ws-connect'),
        wsDisconnect: document.getElementById('ws-disconnect'),
        wsStatus: document.getElementById('ws-status'),
        wsLog: document.getElementById('ws-log'),
        wsInput: document.getElementById('ws-input'),
        wsSend: document.getElementById('ws-send'),
        
        // Response
        respStatus: document.getElementById('response-status'),
        respTime: document.getElementById('response-time'),
        respBody: document.getElementById('response-content'),
        respHeaders: document.getElementById('response-headers-content'),
        
        // History & Import/Export
        historyList: document.getElementById('history-list'),
        clearHistory: document.getElementById('clear-history'),
        importBtn: document.getElementById('import-btn'),
        exportBtn: document.getElementById('export-btn')
    };

    // --- Theme Logic ---
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        state.theme = theme;
        localStorage.setItem('theme', theme);
    };
    applyTheme(state.theme);

    elements.themeToggle.addEventListener('click', () => {
        applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    });

    // --- Tab Switching Logic ---
    const initTabs = (tabs, contents, activeClass = 'active') => {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-target');
                
                tabs.forEach(t => t.classList.remove(activeClass));
                tab.classList.add(activeClass);

                contents.forEach(content => {
                    if (content.id === target) {
                        content.classList.remove('hidden');
                    } else if (content.classList.contains(target.split(' ')[0])) { // Check if it belongs to the same group
                         // This is a bit specific for inner tabs, let's refine
                    } else {
                        // General case for main tabs
                        const parent = content.parentElement;
                        if (parent.classList.contains('content-area')) {
                             content.classList.add('hidden');
                        }
                    }
                });
            });
        });
    };

    // Refined Tab Switcher
    const setupTabs = (tabSelector, contentSelector) => {
        const tabs = document.querySelectorAll(tabSelector);
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.getAttribute('data-target');
                const targetContent = document.getElementById(targetId);
                const siblings = Array.from(targetContent.parentElement.children);
                
                // Content toggle
                siblings.forEach(s => {
                    if (s.classList.contains('tab-content') || s.classList.contains('inner-tab-content')) {
                        s.classList.add('hidden');
                    }
                });
                targetContent.classList.remove('hidden');

                // Tab highlight toggle
                Array.from(tab.parentElement.children).forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });
    };

    setupTabs('.nav-tab', '.tab-content');
    setupTabs('.inner-tab', '.inner-tab-content');

    // --- Dynamic Headers ---
    const createHeaderRow = (listContainer) => {
        const row = document.createElement('div');
        row.className = 'dynamic-row';
        row.innerHTML = `
            <input type="text" placeholder="Key" class="header-key">
            <input type="text" placeholder="Value" class="header-value">
            <button class="btn-secondary remove-row">×</button>
        `;
        row.querySelector('.remove-row').addEventListener('click', () => row.remove());
        listContainer.appendChild(row);
    };

    elements.addRestHeader.addEventListener('click', () => createHeaderRow(elements.restHeadersList));
    elements.addGqlHeader.addEventListener('click', () => createHeaderRow(elements.gqlHeadersList));

    // Handle initial remove buttons
    document.querySelectorAll('.remove-row').forEach(btn => {
        btn.addEventListener('click', (e) => e.target.parentElement.remove());
    });

    // --- Helper Functions ---
    const getHeaders = (list) => {
        const headers = {};
        list.querySelectorAll('.dynamic-row').forEach(row => {
            const key = row.querySelector('.header-key').value.trim();
            const val = row.querySelector('.header-value').value.trim();
            if (key) headers[key] = val;
        });
        return headers;
    };

    const syntaxHighlight = (json) => {
        if (typeof json !== 'string') json = JSON.stringify(json, null, 2);
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) cls = 'json-key';
                else cls = 'json-string';
            } else if (/true|false/.test(match)) cls = 'json-boolean';
            else if (/null/.test(match)) cls = 'json-null';
            return `<span class="${cls}">${match}</span>`;
        });
    };

    const updateResponseUI = (data, status, time, headers) => {
        elements.respStatus.textContent = status;
        elements.respStatus.className = `status-badge ${status < 400 ? 'status-success' : 'status-error'}`;
        elements.respStatus.classList.remove('hidden');
        elements.respTime.textContent = `${time}ms`;
        
        try {
            elements.respBody.innerHTML = syntaxHighlight(data);
        } catch (e) {
            elements.respBody.textContent = data;
        }

        let headerStr = '';
        if (headers instanceof Headers) {
            headers.forEach((v, k) => headerStr += `${k}: ${v}\n`);
        } else {
            for (let k in headers) headerStr += `${k}: ${headers[k]}\n`;
        }
        elements.respHeaders.textContent = headerStr || 'No headers returned';
    };

    const addToHistory = (type, method, url, data) => {
        const item = { id: Date.now(), type, method, url, data, timestamp: new Date().toISOString() };
        state.history.unshift(item);
        if (state.history.length > 20) state.history.pop();
        localStorage.setItem('api-history', JSON.stringify(state.history));
        renderHistory();
    };

    const renderHistory = () => {
        elements.historyList.innerHTML = '';
        state.history.forEach(item => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <div class="history-item-header">
                    <span class="method">${item.method || 'WS'}</span>
                    <button class="delete-history-item" data-id="${item.id}" title="Delete item">×</button>
                </div>
                <span class="url">${item.url}</span>
            `;
            
            li.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-history-item')) {
                    loadHistoryItem(item);
                }
            });

            li.querySelector('.delete-history-item').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteHistoryItem(item.id);
            });

            elements.historyList.appendChild(li);
        });
    };

    const deleteHistoryItem = (id) => {
        state.history = state.history.filter(item => item.id !== id);
        localStorage.setItem('api-history', JSON.stringify(state.history));
        renderHistory();
    };

    elements.clearHistory.addEventListener('click', () => {
        if (confirm('Clear all request history?')) {
            state.history = [];
            localStorage.setItem('api-history', JSON.stringify(state.history));
            renderHistory();
        }
    });

    const loadHistoryItem = (item) => {
        if (item.type === 'REST') {
            document.querySelector('[data-target="rest-section"]').click();
            elements.restMethod.value = item.method;
            elements.restUrl.value = item.url;
            elements.restBody.value = item.data.body || '';
            
            // Restore Headers
            elements.restHeadersList.innerHTML = '';
            for (let key in item.data.headers) {
                const row = document.createElement('div');
                row.className = 'dynamic-row';
                row.innerHTML = `
                    <input type="text" placeholder="Key" class="header-key" value="${key}">
                    <input type="text" placeholder="Value" class="header-value" value="${item.data.headers[key]}">
                    <button class="btn-secondary remove-row">×</button>
                `;
                row.querySelector('.remove-row').addEventListener('click', () => row.remove());
                elements.restHeadersList.appendChild(row);
            }
        } else if (item.type === 'GQL') {
            document.querySelector('[data-target="graphql-section"]').click();
            elements.gqlUrl.value = item.url;
            elements.gqlQuery.value = item.data.query || '';
            elements.gqlVars.value = item.data.variables ? JSON.stringify(item.data.variables, null, 2) : '';
            
            // Restore Headers
            elements.gqlHeadersList.innerHTML = '';
            for (let key in item.data.headers) {
                const row = document.createElement('div');
                row.className = 'dynamic-row';
                row.innerHTML = `
                    <input type="text" placeholder="Key" class="header-key" value="${key}">
                    <input type="text" placeholder="Value" class="header-value" value="${item.data.headers[key]}">
                    <button class="btn-secondary remove-row">×</button>
                `;
                row.querySelector('.remove-row').addEventListener('click', () => row.remove());
                elements.gqlHeadersList.appendChild(row);
            }
        }
    };

    // --- REST Logic ---
    elements.restSend.addEventListener('click', async () => {
        const method = elements.restMethod.value;
        const url = elements.restUrl.value.trim();
        if (!url) return alert('Please enter a URL');

        const startTime = Date.now();
        elements.respBody.textContent = 'Sending request...';

        try {
            const options = {
                method,
                headers: getHeaders(elements.restHeadersList)
            };
            if (['POST', 'PUT', 'PATCH'].includes(method)) {
                options.body = elements.restBody.value;
            }

            const response = await fetch(url, options);
            const time = Date.now() - startTime;
            const data = await response.text();
            
            let displayData = data;
            try { displayData = JSON.parse(data); } catch(e) {}

            updateResponseUI(displayData, response.status, time, response.headers);
            addToHistory('REST', method, url, { body: options.body, headers: options.headers });
        } catch (err) {
            updateResponseUI(err.message, 'ERR', Date.now() - startTime, {});
        }
    });

    // --- GraphQL Logic ---
    elements.gqlSend.addEventListener('click', async () => {
        const url = elements.gqlUrl.value.trim();
        if (!url) return alert('Please enter an endpoint');

        const startTime = Date.now();
        const query = elements.gqlQuery.value;
        const variables = elements.gqlVars.value ? JSON.parse(elements.gqlVars.value) : {};

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getHeaders(elements.gqlHeadersList) },
                body: JSON.stringify({ query, variables })
            });
            const time = Date.now() - startTime;
            const data = await response.json();
            updateResponseUI(data, response.status, time, response.headers);
            addToHistory('GQL', 'POST', url, { query, variables });
        } catch (err) {
            updateResponseUI(err.message, 'ERR', Date.now() - startTime, {});
        }
    });

    // --- WebSocket Logic ---
    const addWSLog = (msg, type = 'system') => {
        const div = document.createElement('div');
        div.className = `ws-msg ${type}`;
        div.textContent = msg;
        elements.wsLog.appendChild(div);
        elements.wsLog.scrollTop = elements.wsLog.scrollHeight;
    };

    elements.wsConnect.addEventListener('click', () => {
        const url = elements.wsUrl.value.trim();
        if (!url) return alert('Please enter WS URL');

        try {
            state.activeWS = new WebSocket(url);
            elements.wsStatus.textContent = 'Connecting...';
            
            state.activeWS.onopen = () => {
                elements.wsStatus.textContent = 'Connected';
                elements.wsStatus.className = 'status-badge status-success';
                elements.wsConnect.classList.add('hidden');
                elements.wsDisconnect.classList.remove('hidden');
                elements.wsSend.disabled = false;
                addWSLog(`Connected to ${url}`);
            };

            state.activeWS.onmessage = (e) => addWSLog(e.data, 'received');
            
            state.activeWS.onclose = () => {
                elements.wsStatus.textContent = 'Disconnected';
                elements.wsStatus.className = 'status-badge';
                elements.wsConnect.classList.remove('hidden');
                elements.wsDisconnect.classList.add('hidden');
                elements.wsSend.disabled = true;
                addWSLog('Connection closed');
            };

            state.activeWS.onerror = (e) => addWSLog('Error: ' + e.message, 'system');
        } catch (e) {
            addWSLog('Error: ' + e.message, 'system');
        }
    });

    elements.wsDisconnect.addEventListener('click', () => state.activeWS?.close());

    elements.wsSend.addEventListener('click', () => {
        const msg = elements.wsInput.value;
        if (msg && state.activeWS) {
            state.activeWS.send(msg);
            addWSLog(msg, 'sent');
            elements.wsInput.value = '';
        }
    });

    // --- Import / Export ---
    elements.exportBtn.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.history));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "api_master_history.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    elements.importBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.readAsText(file, 'UTF-8');
            reader.onload = readerEvent => {
                const content = readerEvent.target.result;
                try {
                    const imported = JSON.parse(content);
                    state.history = imported;
                    localStorage.setItem('api-history', JSON.stringify(state.history));
                    renderHistory();
                    alert('History imported successfully!');
                } catch (e) { alert('Invalid file format'); }
            }
        }
        input.click();
    });

    // Initial History Render
    renderHistory();
});
