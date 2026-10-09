const { cmd } = require('../arslan');
const config = require('../config');
const crypto = require('crypto');
const {
    getOrCreateReferralCode,
    countReferralsForNumber,
    getReferralStatsForNumber,
    getReferralOverview
} = require('../lib/database');

// 🆕 Universal premium system (owner bypass + promo + referral)
const {
    isOwner,
    isPremiumUser,
    requirePremium,
    cleanNumber
} = require('../lib/premium-check');

const PREMIUM_THRESHOLD = Math.max(1, Number(config.PREMIUM_REFERRALS) || 4);
const reactionCooldowns = new Map();

// ===========================================================
// Channel post parser
// ===========================================================
function parseChannelPost(value) {
    let url;
    try { url = new URL(String(value || '')); } catch (_) { return null; }
    if (!['whatsapp.com', 'www.whatsapp.com'].includes(url.hostname.toLowerCase())) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'channel' || parts.length < 3) return null;
    const channelId = parts[1];
    const postId = parts[2];
    if (!/^[\w-]{5,100}$/.test(channelId) || !/^\d{1,20}$/.test(postId)) return null;
    return { jid: `${channelId}@newsletter`, postId };
}

function firstEmoji(value) {
    const input = String(value || '').trim();
    if (!input) return null;
    if (typeof Intl.Segmenter === 'function') {
        const first = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(input)[Symbol.iterator]().next().value;
        return first && first.segment;
    }
    return Array.from(input)[0];
}

// ===========================================================
// reactToPost helper
// ===========================================================
async function reactToPost(conn, ctx) {
    if (!(await requirePremium(ctx))) return;

    const link = ctx.args[0];
    if (!link) {
        return ctx.reply(
            `❌ Channel post link do.\nExample: *${config.PREFIX}arcadd https://whatsapp.com/channel/CHANNEL_ID/103*`
        );
    }

    const target = parseChannelPost(link);
    if (!target) {
        return ctx.reply(
            `❌ Post link format ghalat hai.\nExample: *${config.PREFIX}arcadd https://whatsapp.com/channel/CHANNEL_ID/103*`
        );
    }

    const sender = cleanNumber(ctx.senderNumber);
    const lastUsed = reactionCooldowns.get(sender) || 0;
    if (Date.now() - lastUsed < 3000) {
        return ctx.reply('⏳ Thoda ruk kar dobara try karein.');
    }
    reactionCooldowns.set(sender, Date.now());

    const userEmojiText = ctx.args.slice(1).join(' ').trim();
    let emojis;

    if (userEmojiText) {
        const first = firstEmoji(userEmojiText);
        emojis = first ? [first] : [];
    } else {
        emojis = Array.isArray(config.CHANNEL_REACT_EMOJIS) ? config.CHANNEL_REACT_EMOJIS : [];
    }

    if (!emojis.length) {
        return ctx.reply('❌ Koi emoji available nahi. Config me `CHANNEL_REACT_EMOJIS` set karo ya command ke saath ek emoji do.');
    }

    await ctx.reply(`⏳ *${emojis.length}* reaction bheji ja rahi hain…`);

    let success = 0;
    let failed = 0;

    for (const emoji of emojis) {
        try {
            await conn.newsletterReactMessage(target.jid, target.postId, emoji);
            success++;
            await new Promise(r => setTimeout(r, 250));
        } catch (error) {
            failed++;
            console.error(`Reaction failed (${emoji}):`, error.message);
        }
    }

    return ctx.reply(
        `✅ *Reaction Complete!*\n\n` +
        `📊 Total: *${emojis.length}*\n` +
        `✔️ Success: *${success}*\n` +
        `❌ Failed: *${failed}*`
    );
}

// ===========================================================
// MYREF — Referral link
// ===========================================================
cmd({
    pattern: 'myref',
    alias: ['myreferral', 'referral'],
    desc: 'Apna referral link aur premium progress dekhein',
    category: 'referrals',
    react: '🔗',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    try {
        const number = cleanNumber(ctx.senderNumber);
        const [code, count] = await Promise.all([
            getOrCreateReferralCode(number),
            countReferralsForNumber(number)
        ]);
        const base = String(config.PAIR_BASE_URL || '').replace(/\/+$/, '');
        const link = `${base}/?ref=${encodeURIComponent(code)}`;
        const premium = count >= PREMIUM_THRESHOLD;

        // Owner ko special message
        if (isOwner(ctx)) {
            return ctx.reply([
                '👑 *OWNER REFERRAL LINK*',
                '',
                link,
                '',
                `🔑 Code: *${code}*`,
                `👥 Referrals: *${count}*`,
                `💎 Status: *OWNER (Full Access)*`,
                '',
                'Aapko premium ki zaroorat nahi — full access hai!'
            ].join('\n'));
        }

        return ctx.reply([
            '🔗 *Aapka personal referral link*',
            '',
            link,
            '',
            `🔑 Code: *${code}*`,
            `👥 Verified connections: *${count}*`,
            `💎 Premium: *${premium ? 'UNLOCKED ✅' : `${Math.max(0, PREMIUM_THRESHOLD - count)} aur chahiye`}*`,
            '',
            '💡 *Extra Tips:*',
            `• Promo code se bhi premium: *${config.PREFIX}redeem <code>*`,
            `• Owner se promo code maango!`
        ].join('\n'));
    } catch (error) {
        console.error('myref failed:', error.message);
        return ctx.reply('❌ Referral link abhi nahi ban saka. Database connection check karke dobara try karein.');
    }
});

// ===========================================================
// ARCADD — Channel post reaction
// ===========================================================
cmd({
    pattern: 'arcadd',
    alias: ['channelreact', 'chreact', 'reactch'],
    desc: 'Premium/Owner: Channel post par saari emojis lagao',
    category: 'premium',
    react: '💗',
    use: '.arcadd <channel post link>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    try {
        // ✅ Universal premium check (owner bypass automatic)
        if (!(await requirePremium(ctx))) return;

        const q = (ctx.q || '').trim();
        if (!q) {
            return ctx.reply('❌ Channel post link do.\n\n*Example:* `.arcadd https://whatsapp.com/channel/xxxxx/123`');
        }

        const link = q.split(/\s+/)[0];

        const match = link.match(/channel\/([A-Za-z0-9_-]+)\/(\d+)/);
        if (!match) {
            return ctx.reply('❌ Invalid WhatsApp channel post link.');
        }

        const channelId = match[1];
        const serverId  = match[2];
        const channelJid = channelId + '@newsletter';

        const EMOJIS = Array.isArray(config.CHANNEL_REACT_EMOJIS) && config.CHANNEL_REACT_EMOJIS.length
            ? config.CHANNEL_REACT_EMOJIS
            : [
                '🔥','😁','💗','💗','😽','❤️','😽','❤️','😽','💓','🥲','💓','🥲',
                '😽','😽','💞','💞','🔥','😽','💗','🤯','😞','🌚','🌚','😌','🤔',
                '😌','😞','☠️','🌚','😁','😎','😌','🥲','😌','💯','😘','😄','💯',
                '😄','💀','☠️','😁','😽','😎','😽','❤️','📐','🔥','💗','😁','❤️',
                '😁','💗','😁','🤯','🥲','❤️','😌','🔥','❤️','🥲','😞','🤯','😁','😽'
            ];

        let success = 0;
        let failed  = 0;

        for (const emoji of EMOJIS) {
            try {
                await conn.newsletterReactMessage(channelJid, serverId, emoji);
                success++;
                await new Promise(r => setTimeout(r, 250));
            } catch (e) {
                failed++;
            }
        }

        return ctx.reply(
            `✅ *Reaction Complete!*\n\n` +
            `📊 Total: *${EMOJIS.length}*\n` +
            `✔️ Success: *${success}*\n` +
            `❌ Failed: *${failed}*`
        );

    } catch (e) {
        console.error('arcadd error:', e);
        return ctx.reply('❌ Error: ' + e.message);
    }
});

// ===========================================================
// REFERRALSTATS — Owner panel
// ===========================================================
cmd({
    pattern: 'referralstats',
    alias: ['refstats', 'adminpanel'],
    desc: 'Owner: verified referral aur premium reports',
    category: 'owner',
    react: '📊',
    use: '.referralstats [phone number]',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!isOwner(ctx)) return ctx.reply('⛔ Yeh report sirf owner ke liye hai.');
    try {
        const requestedNumber = cleanNumber(ctx.args[0]);
        if (requestedNumber) {
            const data = await getReferralStatsForNumber(requestedNumber);
            const lines = data.referrals.slice(0, 30).map((item, index) => `${index + 1}. ${item.referredNumber}`);
            return ctx.reply([
                `📊 *Referral report: ${data.number}*`,
                `Verified referrals: *${data.count}*`,
                `Premium: *${data.premium ? 'YES' : 'NO'}* (${PREMIUM_THRESHOLD} required)`,
                `Code: *${data.code || 'not created yet'}*`,
                '',
                lines.length ? lines.join('\n') : 'Abhi koi verified referral nahi.',
                data.referrals.length > 30 ? `\n… aur ${data.referrals.length - 30} referrals.` : ''
            ].join('\n'));
        }
        const report = await getReferralOverview();
        const liveNumbers = global.activeSockets ? Array.from(global.activeSockets.keys()) : [];
        const premiumRows = report.premiumReferrers.slice(0, 25)
            .map((item, index) => `${index + 1}. ${item.number} — ${item.count} referrals`);
        const liveRows = liveNumbers.slice(0, 40).map((number, index) => `${index + 1}. ${number}`);
        return ctx.reply([
            '🛡️ *RIZO-MD OWNER PANEL*',
            '',
            `Live connected numbers: *${liveNumbers.length}*`,
            `Verified referrals total: *${report.totalReferrals}*`,
            `Premium members: *${report.premiumCount}*`,
            '',
            '*Live sessions:*',
            liveRows.length ? liveRows.join('\n') : 'Abhi koi session connected nahi.',
            liveNumbers.length > 40 ? `… aur ${liveNumbers.length - 40} live sessions.` : '',
            '',
            premiumRows.length ? premiumRows.join('\n') : 'Abhi koi premium member nahi.',
            report.premiumCount > 25 ? `List mein top 25 dikhaye; ${report.premiumCount} premium accounts total hain.` : '',
            '',
            `Detail: *${config.PREFIX}referralstats <phone>*`
        ].join('\n'));
    } catch (error) {
        console.error('referralstats failed:', error.message);
        return ctx.reply('❌ Report nahi bani. MongoDB connection check karein.');
    }
});

// ===========================================================
// MASSVOTE — Sab connected accounts se vote (experimental)
// ===========================================================
cmd({
    pattern: 'massvote',
    alias: ['autovote', 'multivote'],
    desc: 'Premium/Owner: Sab connected accounts se poll pe vote karo',
    category: 'premium',
    react: '🗳️',
    use: '.massvote <channel post link> <1|2|3...>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    try {
        // ✅ Universal premium check (owner bypass automatic)
        if (!(await requirePremium(ctx))) return;

        const owner = isOwner(ctx);
        const args = ctx.args || [];
        const link = args[0];
        const optionIndex = parseInt(args[1], 10);

        if (!link || !optionIndex || optionIndex < 1) {
            return ctx.reply(
                `❌ Use: *${config.PREFIX}massvote <poll link> <option number>*\n\n` +
                `Example:\n` +
                `*${config.PREFIX}massvote https://whatsapp.com/channel/xxx/123 1*\n` +
                `*${config.PREFIX}massvote https://whatsapp.com/channel/xxx/123 2*`
            );
        }

        const target = parseChannelPost(link);
        if (!target) {
            return ctx.reply('❌ Invalid channel post link.');
        }

        const sockets = global.activeSockets;
        if (!sockets || sockets.size === 0) {
            return ctx.reply('❌ Koi account connected nahi hai.');
        }

        await ctx.reply(
            `🗳️ *Mass voting shuru…*\n` +
            `📌 Poll: \`${target.postId}\`\n` +
            `🎯 Option: *${optionIndex}*\n` +
            `👥 Accounts: *${sockets.size}*`
        );

        let success = 0;
        let failed = 0;
        const errors = [];

        for (const [number, sock] of sockets) {
            try {
                if (!sock || !sock.user) { failed++; continue; }

                const pollKey = {
                    remoteJid: target.jid,
                    fromMe: false,
                    id: target.postId,
                    participant: undefined
                };

                const optionName = String(optionIndex - 1);
                const hash = crypto.createHash('sha256')
                    .update(target.postId + optionName)
                    .digest();

                await sock.sendMessage(target.jid, {
                    pollUpdateMessage: {
                        pollCreationMessageKey: pollKey,
                        vote: {
                            encPayload: Buffer.from(optionName).toString('base64'),
                            encIv: Buffer.from(hash).slice(0, 16).toString('base64')
                        },
                        senderTimestampMs: Date.now()
                    }
                });

                success++;
                await new Promise(r => setTimeout(r, 800));
            } catch (err) {
                failed++;
                errors.push(`${number}: ${err.message}`);
                console.error(`Vote failed for ${number}:`, err.message);
            }
        }

        let report =
            `✅ *Mass Vote Complete!*\n\n` +
            `📊 Total accounts: *${sockets.size}*\n` +
            `✔️ Success: *${success}*\n` +
            `❌ Failed: *${failed}*`;

        if (errors.length && owner) {
            report += `\n\n*Errors (owner only):*\n` + errors.slice(0, 5).join('\n');
        }

        return ctx.reply(report);
    } catch (error) {
        console.error('massvote error:', error.message);
        return ctx.reply('❌ Vote bhejne me error: ' + error.message);
    }
});

// ===========================================================
// ADDVOTES — Deprecated
// ===========================================================
cmd({
    pattern: 'addvotes',
    alias: ['boostvotes'],
    desc: 'Deprecated: massvote use karo',
    category: 'premium',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!(await requirePremium(ctx))) return;
    return ctx.reply('ℹ️ Ye command ab *massvote* me merge ho gayi hai. Use karo:\n`.massvote <link> <1|2|3>`');
});