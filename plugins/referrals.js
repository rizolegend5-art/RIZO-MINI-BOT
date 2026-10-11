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
            '🔗 *RIZO MINI BOT — AAPKA PERSONAL REFERRAL LINK*',
            '',
            link,
            '',
            `🔑 Code: *${code}*`,
            `👥 Referral credits: *${count}*`,
            `💎 Premium: *${premium ? 'UNLOCKED ✅' : `${Math.max(0, PREMIUM_THRESHOLD - count)} aur chahiye`}*`,
            '',
            `💡 Promo: *${config.PREFIX}redeem <code>*`
        ].join('\n'));
    } catch (e) {
        console.error('myref:', e.message);
        return ctx.reply('❌ Referral fail.');
    }
});

// CHANNEL REACTION PREFERENCES + MULTI-EMOJI CHANNEL REACTION COMMAND
// WhatsApp may replace the previous reaction from the same account on the same post.
const DEFAULT_REACTION_EMOJI = '❤️';

cmd({
    pattern: 'arcset',
    alias: ['chreactset', 'reactemoji'],
    desc: 'Save your preferred channel reaction emoji',
    category: 'premium',
    react: '⚙️',
    use: '.arcset ❤️',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const number = cleanNumber(ctx.senderNumber);
    if (!number) return ctx.reply('❌ Aapka number identify nahi ho saka.');
    const emoji = (ctx.q || '').trim();
    if (!emoji || emoji.length > 32 || /[\r\n]/.test(emoji)) {
        return ctx.reply('❌ Ek emoji dein. Example: .arcset ❤️');
    }
    try {
        const { getUserConfigFromMongoDB, updateUserConfigInMongoDB } = require('../lib/database');
        const userConfig = await getUserConfigFromMongoDB(number);
        userConfig.CHANNEL_REACT_EMOJI = emoji;
        const saved = await updateUserConfigInMongoDB(number, userConfig);
        return ctx.reply(saved ? `✅ Aapka reaction emoji *${emoji}* save ho gaya.` : '❌ Save nahi hua. MongoDB connection check karo.');
    } catch (e) {
        console.error('arcset:', e.message);
        return ctx.reply('❌ Reaction preference save nahi ho saki.');
    }
});

cmd({
    pattern: 'arcstatus',
    alias: ['chreactstatus', 'myreactemoji'],
    desc: 'Show your saved channel reaction emoji',
    category: 'premium',
    react: '📌',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const number = cleanNumber(ctx.senderNumber);
    try {
        const { getUserConfigFromMongoDB } = require('../lib/database');
        const userConfig = await getUserConfigFromMongoDB(number);
        return ctx.reply(`📌 *YOUR SAVED CHANNEL REACTION*\n\nEmoji: *${userConfig.CHANNEL_REACT_EMOJI || DEFAULT_REACTION_EMOJI}*\n\nChange command: ${config.PREFIX}arcset ❤️`);
    } catch (e) { return ctx.reply('❌ Saved reaction load nahi ho saka.'); }
});

cmd({
    pattern: 'arcadd',
    alias: ['channelreact', 'chreact', 'reactch'],
    desc: 'React to a channel post with emoji(s) supplied by the user',
    category: 'premium',
    react: '💗',
    use: '.arcadd <channel-post-link> ❤️ 🔥 😍 💯',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!(await requirePremium(ctx))) return;
    const q = (ctx.q || '').trim();
    if (!q) return ctx.reply(`Use: ${config.PREFIX}arcadd <channel-post-link> ❤️ 🔥 😍\nAap jitne emojis denge, bot un sab ko try karega.`);
    const parts = q.replace(/[,،]+/g, ' ').split(/\s+/).filter(Boolean);
    const parsed = parseChannelPost(parts[0]);
    if (!parsed) return ctx.reply('❌ Valid WhatsApp channel post link do. Example: https://whatsapp.com/channel/CHANNEL_ID/POST_ID');

    let emojis = [...new Set(parts.slice(1))];
    if (!emojis.length) {
        try {
            const { getUserConfigFromMongoDB } = require('../lib/database');
            const userConfig = await getUserConfigFromMongoDB(cleanNumber(ctx.senderNumber));
            emojis = [userConfig.CHANNEL_REACT_EMOJI || DEFAULT_REACTION_EMOJI];
        } catch (_) { emojis = [DEFAULT_REACTION_EMOJI]; }
    }
    if (emojis.length > 30) return ctx.reply('⚠️ Ek command mein maximum 30 emojis try kar sakte hain.');
    if (emojis.some(e => e.length > 32 || /[\r\n]/.test(e))) return ctx.reply('❌ Emoji format check karo.');
    if (typeof conn.newsletterReactMessage !== 'function') return ctx.reply('❌ Is Baileys version mein channel reaction API available nahi hai.');

    const succeeded = [], failed = [];
    for (const emoji of emojis) {
        try {
            await conn.newsletterReactMessage(parsed.jid, parsed.postId, emoji);
            succeeded.push(emoji);
        } catch (e) {
            failed.push(`${emoji}${e?.message ? ` (${e.message.slice(0, 70)})` : ''}`);
        }
        // Small pause to reduce the chance of hitting the service too quickly.
        if (emojis.length > 1) await new Promise(resolve => setTimeout(resolve, 350));
    }
    let reply = `🎯 *CHANNEL EMOJI REACTION RESULT*\n\n📌 Post: ${parsed.postId}\n✅ Tried successfully: ${succeeded.length}/${emojis.length}`;
    if (succeeded.length) reply += `\n✨ Emojis: ${succeeded.join(' ')}`;
    if (failed.length) reply += `\n\n❌ Failed: ${failed.join(' ')}`;
    reply += '\n\n⚠️ Note: WhatsApp aksar ek account ki ek post par sirf ek active reaction rakhta hai. Is liye multiple emojis try hone ke bawajood aakhri reaction pehli ko replace kar sakta hai; sab emojis ka ek saath visible rehna guaranteed nahi.';
    return ctx.reply(reply);
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