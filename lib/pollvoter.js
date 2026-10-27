// lib/pollvoter.js
// Channel poll voting via Baileys — no external API
// Uses pollUpdateMessage (standard WhatsApp protocol)

const crypto = require('crypto');
const { delay, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

const CONFIG = {
    VOTE_DELAY_MS: 2500,
    JITTER_MS: 1000,
    MAX_ACCOUNTS: 500
};

function jitter(base) {
    return base + (Math.random() * 2 - 1) * base * 0.5;
}

// ═══════════════════════════════════════════
//  RESOLVE CHANNEL LINK
// ═══════════════════════════════════════════
async function resolveChannelLink(sock, link) {
    try {
        const m = String(link).match(/whatsapp\.com\/channel\/([A-Za-z0-9]+)(?:\/(\d+))?/);
        if (!m) return { ok: false, error: 'invalid link' };

        const inviteCode = m[1];
        const serverId = m[2] || null;

        let channelJid = null;
        try {
            const meta = await sock.newsletterMetadata('invite', inviteCode);
            channelJid = meta?.id || meta?.jid || null;
        } catch (_) {}

        if (!channelJid) return { ok: false, error: 'channel JID not resolved' };
        return { ok: true, channelJid, serverId, inviteCode };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

// ═══════════════════════════════════════════
//  OPTION HASH — WhatsApp poll ke liye
//  SHA-256 of option name (base64)
// ═══════════════════════════════════════════
function hashOption(optionName) {
    return crypto.createHash('sha256')
        .update(String(optionName))
        .digest();
}

// ═══════════════════════════════════════════
//  METHOD 1 — newsletterSendPollVote (if available)
// ═══════════════════════════════════════════
async function voteViaNewsletterAPI(sock, channelJid, pollServerId, optionName) {
    if (typeof sock.newsletterSendPollVote !== 'function') {
        return { ok: false, error: 'newsletterSendPollVote not available' };
    }
    try {
        await sock.newsletterSendPollVote(
            channelJid,
            String(pollServerId),
            [hashOption(optionName)]
        );
        return { ok: true, method: 'newsletter-api' };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

// ═══════════════════════════════════════════
//  METHOD 2 — pollUpdateMessage via relayMessage
// ═══════════════════════════════════════════
async function voteViaPollUpdate(sock, channelJid, pollServerId, optionName) {
    try {
        const pollKey = {
            remoteJid: channelJid,
            fromMe: false,
            id: String(pollServerId)
        };

        const pollUpdate = {
            pollUpdateMessage: {
                pollCreationMessageKey: pollKey,
                vote: {
                    selectedOptions: [hashOption(optionName)]
                },
                senderTimestampMs: Date.now()
            }
        };

        const msg = generateWAMessageFromContent(
            channelJid,
            proto.Message.fromObject(pollUpdate),
            { userJid: channelJid }
        );

        await sock.relayMessage(channelJid, msg.message, {
            messageId: msg.key.id,
            additionalNodes: [
                {
                    tag: 'meta',
                    attrs: { polltype: 'snapshot' },
                    content: [{
                        tag: 'snapshot',
                        attrs: {
                            poll_creation_message_key: JSON.stringify(pollKey),
                            selected_options: JSON.stringify([hashOption(optionName).toString('base64')])
                        }
                    }]
                }
            ]
        });

        return { ok: true, method: 'poll-update' };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

// ═══════════════════════════════════════════
//  METHOD 3 — sendMessage with poll update (regular chats)
// ═══════════════════════════════════════════
async function voteViaSendMessage(sock, channelJid, pollServerId, optionName) {
    try {
        await sock.sendMessage(channelJid, {
            pollUpdate: {
                pollCreationMessageKey: {
                    remoteJid: channelJid,
                    fromMe: false,
                    id: String(pollServerId)
                },
                vote: {
                    selectedOptions: [hashOption(optionName)]
                }
            }
        });
        return { ok: true, method: 'send-message' };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

// ═══════════════════════════════════════════
//  UNIFIED — try all methods
// ═══════════════════════════════════════════
async function voteOneAccount(sock, channelJid, pollServerId, optionName) {
    // try newsletter API first
    let r = await voteViaNewsletterAPI(sock, channelJid, pollServerId, optionName);
    if (r.ok) return r;

    // try poll update relay
    r = await voteViaPollUpdate(sock, channelJid, pollServerId, optionName);
    if (r.ok) return r;

    // try sendMessage
    r = await voteViaSendMessage(sock, channelJid, pollServerId, optionName);
    return r;
}

// ═══════════════════════════════════════════
//  MASS VOTE — all connected accounts
// ═══════════════════════════════════════════
async function massVote(channelJid, pollServerId, optionName, onProgress) {
    const activeSockets = global.activeSockets;
    if (!activeSockets || typeof activeSockets.forEach !== 'function') {
        return { ok: false, error: 'no active sockets' };
    }

    const sockets = [];
    activeSockets.forEach((sock, number) => {
        if (sock && sock.user && sock.user.id) sockets.push({ number, sock });
    });

    if (!sockets.length) return { ok: false, error: 'no connected accounts' };

    const limited = sockets.slice(0, CONFIG.MAX_ACCOUNTS);
    let success = 0, failed = 0;
    const methods = {};

    for (let i = 0; i < limited.length; i++) {
        const { sock } = limited[i];
        const r = await voteOneAccount(sock, channelJid, pollServerId, optionName);
        if (r.ok) {
            success++;
            methods[r.method] = (methods[r.method] || 0) + 1;
        } else {
            failed++;
        }
        if (onProgress) onProgress(i + 1, limited.length, success, failed);
        await delay(jitter(CONFIG.VOTE_DELAY_MS));
    }

    return { ok: success > 0, total: limited.length, success, failed, methods };
}

function getAccountStats() {
    const activeSockets = global.activeSockets;
    const all = activeSockets ? Array.from(activeSockets.keys()) : [];
    return { total: all.length, numbers: all };
}

module.exports = {
    resolveChannelLink,
    voteOneAccount,
    massVote,
    getAccountStats,
    CONFIG
};