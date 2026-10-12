const axios = require('axios');

const BASE_URL = 'https://api.jikan.moe/v4';
const MIN_INTERVAL_MS = 1100;
let nextRequestAt = 0;
let requestQueue = Promise.resolve();

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, retryCount = 1) {
    const wait = Math.max(0, nextRequestAt - Date.now());
    if (wait) await pause(wait);
    nextRequestAt = Date.now() + MIN_INTERVAL_MS;

    try {
        const response = await axios.get(url, {
            timeout: 15000,
            headers: { 'User-Agent': 'RIZO-MD/2.3 (anime metadata commands)' }
        });
        return response.data;
    } catch (error) {
        const status = error.response?.status;
        if (retryCount > 0 && (status === 429 || status >= 500 || !status)) {
            const retryAfter = Number(error.response?.headers?.['retry-after']);
            await pause(Math.min(10000, Math.max(1200, Number.isFinite(retryAfter) ? retryAfter * 1000 : 1500)));
            return fetchWithRetry(url, retryCount - 1);
        }
        throw error;
    }
}

function jikanGet(pathOrUrl) {
    const url = /^https?:\/\//i.test(String(pathOrUrl))
        ? String(pathOrUrl)
        : `${BASE_URL}${String(pathOrUrl).startsWith('/') ? '' : '/'}${pathOrUrl}`;
    const request = requestQueue.then(() => fetchWithRetry(url), () => fetchWithRetry(url));
    requestQueue = request.then(() => undefined, () => undefined);
    return request;
}

module.exports = { jikanGet, BASE_URL };
