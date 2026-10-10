const { cmd } = require('../arslan');
const config = require('../config');
const crypto = require('crypto');
const {
    getOrCreateReferralCode, countReferralsForNumber,
    getReferralStatsForNumber, getReferralOverview
} = require('../lib/database');
const { isOwner, isPremiumUser, requirePremium, cleanNumber } = require('../lib/premium-check');

const PREMIUM_THRESHOLD = Math.max(1, Number(config.PREMIUM_REFERRALS) || 4);

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

// MYREF
cmd({
    pattern: 'myref',
    alias: ['myreferral', 'referral'],
    desc: 'Apna referral link',
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

        if (isOwner(ctx)) {
            return ctx.reply(`👑 *OWNER REFERRAL*\n\n${link}\n\n🔑 Code: *${code}*\n👥 Referrals: *${count}*`);
        }

        return ctx.reply([
            '🔗 *Aapka personal referral link*',
            '',
            link,
            '',
            `🔑 Code: *${code}*`,
            `👥 Verified: *${count}*`,
            `💎 Premium: *${premium ? 'UNLOCKED ✅' : `${Math.max(0, PREMIUM_THRESHOLD - count)} aur chahiye`}*`,
            '',
            `💡 Promo: *${config.PREFIX}redeem <code>*`
        ].join('\n'));
    } catch (e) {
        console.error('myref:', e.message);
        return ctx.reply('❌ Referral fail.');
    }
});

// ARCADD
cmd({
    pattern: 'arcadd',
    alias: ['channelreact', 'chreact', 'reactch'],
    desc: 'Premium/Owner: Channel post par emojis',
    category: 'premium',
    react: '💗',
    use: '.arcadd <link>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!(await requirePremium(ctx))) return;

    const q = (ctx.q || '').trim();
    if (!q) return ctx.reply('❌ Link do.');

    const link = q.split(/\s+/)[0];
    const match = link.match(/channel\/([A-Za-z0-9_-]+)\/(\d+)/);
    if (!match) return ctx.reply('❌ Invalid link.');

    const channelId = match[1];
    const serverId = match[2];
    const channelJid = channelId + '@newsletter';

    const EMOJIS = Array.isArray(config.CHANNEL_REACT_EMOJIS) && config.CHANNEL_REACT_EMOJIS.length
        ? config.CHANNEL_REACT_EMOJIS
        : ['🔥','💗','😽','❤️','💞'];

    let success = 0, failed = 0;
    for (const emoji of EMOJIS) {
        try {
            await conn.newsletterReactMessage(channelJid, serverId, emoji);
            success++;
            await new Promise(r => setTimeout(r, 250));
        } catch (e) { failed++; }
    }

    return ctx.reply(`✅ *Done!*\n📊 Total: *${EMOJIS.length}*\n✔️ ${success}\n❌ ${failed}`);
});

// REFERRALSTATS
cmd({
    pattern: 'referralstats',
    alias: ['refstats', 'adminpanel'],
    desc: 'Owner: Referral reports',
    category: 'owner',
    react: '📊',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!isOwner(ctx)) return ctx.reply('⛔ Owner only.');
    try {
        const report = await getReferralOverview();
        const liveNumbers = global.activeSockets ? Array.from(global.activeSockets.keys()) : [];
        const premiumRows = report.premiumReferrers.slice(0, 25).map((item, i) => `${i + 1}. ${item.number} — ${item.count}`);
        const liveRows = liveNumbers.slice(0, 40).map((n, i) => `${i + 1}. ${n}`);

        return ctx.reply([
            '🛡️ *RIZO-MD OWNER PANEL*',
            '',
            `Live: *${liveNumbers.length}*`,
            `Total referrals: *${report.totalReferrals}*`,
            `Premium: *${report.premiumCount}*`,
            '',
            '*Live sessions:*',
            liveRows.length ? liveRows.join('\n') : 'None.',
            '',
            premiumRows.length ? premiumRows.join('\n') : 'No premium.'
        ].join('\n'));
    } catch (e) {
        console.error('referralstats:', e.message);
        return ctx.reply('❌ Report fail.');
    }
});