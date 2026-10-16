// lib/reactor.js
// Direct Baileys channel reaction — no external API needed
// Uses conn.newsletterReactMessage() — built into Baileys

const { delay } = require('@whiskeysockets/baileys');

const CONFIG = {
    REACT_DELAY_MS: 2000,
    JITTER_MS: 800,
    MAX_ACCOUNTS: 500
};

function jitter(base) {
    return base + (Math.random() * 2 - 1) * base * 0.5;
}

// ═══════════════════════════════════════════
//  EXTRACT CHANNEL JID + SERVER ID FROM LINK
//  Input:  https://whatsapp.com/channel/0029Vb967lf3mFXy9U1g2641/106
//  Output: { channelJid, serverId }
// ═══════════════════════════════════════════
async function resolveChannelLink(sock, link) {
    try {
        const m = String(link).match(/whatsapp\.com\/channel\/([A-Za-z0-9]+)(?:\/(\d+))?/);
        if (!m) return { ok: false, error: 'invalid link format' };

        const inviteCode = m[1];
        const serverId = m[2] || null;

        // fetch channel metadata to get JID
        let channelJid = null;
        try {
            const meta = await sock.newsletterMetadata('invite', inviteCode);
            channelJid = meta?.id || meta?.jid || null;
        } catch (e) {
            // fallback — some Baileys versions return JID directly
            channelJid = null;
        }

        if (!channelJid) {
            return { ok: false, error: 'could not resolve channel JID' };
        }

        return { ok: true, channelJid, serverId, inviteCode };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

// ═══════════════════════════════════════════
//  REACT VIA BAILEYS (direct)
// ═══════════════════════════════════════════
async function reactViaBaileys(sock, channelJid, serverId, emoji) {
    try {
        // Baileys built-in function
        if (typeof sock.newsletterReactMessage !== 'function') {
            return { ok: false, error: 'newsletterReactMessage not available in this Baileys version' };
        }

        await sock.newsletterReactMessage(channelJid, String(serverId), emoji);
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

// ═══════════════════════════════════════════
//  MASS REACT — all connected accounts
// ═══════════════════════════════════════════
async function massReact(channelJid, serverId, emoji, onProgress) {
    const activeSockets = global.activeSockets;
    if (!activeSockets || typeof activeSockets.forEach !== 'function') {
        return { ok: false, error: 'no active sockets' };
    }

    const sockets = [];
    activeSockets.forEach((sock, number) => {
        if (sock && sock.user && sock.user.id) {
            sockets.push({ number, sock });
        }
    });

    if (!sockets.length) {
        return { ok: false, error: 'no connected accounts' };
    }

    const limited = sockets.slice(0, CONFIG.MAX_ACCOUNTS);
    let success = 0, failed = 0;

    for (let i = 0; i < limited.length; i++) {
        const { sock } = limited[i];
        const r = await reactViaBaileys(sock, channelJid, serverId, emoji);
        if (r.ok) success++;
        else failed++;
        if (onProgress) onProgress(i + 1, limited.length, success, failed);
        await delay(jitter(CONFIG.REACT_DELAY_MS));
    }

    return { ok: success > 0, total: limited.length, success, failed };
}

function getAccountStats() {
    const activeSockets = global.activeSockets;
    const all = activeSockets ? Array.from(activeSockets.keys()) : [];
    return { total: all.length, numbers: all };
}

module.exports = {
    resolveChannelLink,
    reactViaBaileys,
    massReact,
    getAccountStats,
    CONFIG
};