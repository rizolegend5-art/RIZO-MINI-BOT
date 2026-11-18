// In-memory store for generated web pages (.code / .preview). Pages live 24h, max 300 kept.
const crypto = require('crypto');
const TTL = 24 * 60 * 60 * 1000;
const MAX_ITEMS = 300;
const MAX_BYTES = 400 * 1024;
const store = new Map();   // id -> { html, at, title }

function clean() {
    const now = Date.now();
    for (const [id, v] of store) if (now - v.at > TTL) store.delete(id);
    while (store.size > MAX_ITEMS) store.delete(store.keys().next().value);
}
function save(html, title = '') {
    html = String(html || '');
    if (!html.trim()) throw new Error('empty page');
    if (Buffer.byteLength(html) > MAX_BYTES) throw new Error('page too large (max 400 KB)');
    clean();
    const id = crypto.randomBytes(5).toString('hex');
    store.set(id, { html, at: Date.now(), title });
    return id;
}
function get(id) {
    const v = store.get(String(id || ''));
    if (!v) return null;
    if (Date.now() - v.at > TTL) { store.delete(id); return null; }
    return v;
}
module.exports = { save, get, TTL };
