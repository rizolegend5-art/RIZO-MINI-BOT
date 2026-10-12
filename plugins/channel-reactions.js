const { cmd } = require('../arslan');
const config = require('../config');
const { cleanNumber } = require('../lib/access-control');
const { getUserConfigFromMongoDB, updateUserConfigInMongoDB } = require('../lib/database');

const DEFAULT_EMOJI = '❤️';

function parseChannelPost(value) {
    let url;
    try { url = new URL(String(value || '')); } catch (_) { return null; }
    if (url.protocol !== 'https:' || !['whatsapp.com', 'www.whatsapp.com'].includes(url.hostname.toLowerCase())) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'channel' || parts.length < 3) return null;
    if (!/^[\w-]{5,100}$/.test(parts[1]) || !/^\d{1,20}$/.test(parts[2])) return null;
    return { jid: `${parts[1]}@newsletter`, postId: parts[2] };
}

async function userConfig(number) {
    return getUserConfigFromMongoDB(cleanNumber(number));
}

cmd({
    pattern: 'arcset',
    alias: ['chreactset', 'reactemoji'],
    desc: 'Save your preferred channel reaction emoji',
    category: 'general',
    react: '⚙️',
    use: '.arcset ❤️',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const emoji = (ctx.q || '').trim();
    if (!emoji || emoji.length > 32 || /[\r\n]/.test(emoji)) return ctx.reply('❌ Ek emoji dein. Example: .arcset ❤️');
    try {
        const number = cleanNumber(ctx.senderNumber);
        const settings = await userConfig(number);
        settings.CHANNEL_REACT_EMOJI = emoji;
        const saved = await updateUserConfigInMongoDB(number, settings);
        return ctx.reply(saved ? `✅ Reaction emoji *${emoji}* save ho gaya.` : '❌ Preference save nahi hui.');
    } catch (error) {
        console.error('[ARCSET]', error.message);
        return ctx.reply('❌ Reaction preference save nahi ho saki.');
    }
});

cmd({
    pattern: 'arcstatus',
    alias: ['chreactstatus', 'myreactemoji'],
    desc: 'Show your saved channel reaction emoji',
    category: 'general',
    react: '📌',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    try {
        const settings = await userConfig(ctx.senderNumber);
        return ctx.reply(`📌 Aapka saved reaction emoji: *${settings.CHANNEL_REACT_EMOJI || DEFAULT_EMOJI}*\nChange: ${config.PREFIX}arcset ❤️`);
    } catch (_) {
        return ctx.reply(`📌 Default reaction emoji: *${DEFAULT_EMOJI}*`);
    }
});

cmd({
    pattern: 'arcadd',
    alias: ['channelreact', 'chreact', 'reactch'],
    desc: 'React to a WhatsApp channel post',
    category: 'general',
    react: '💗',
    use: '.arcadd <channel-post-link> ❤️',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const parts = (ctx.q || '').trim().replace(/[,،]+/g, ' ').split(/\s+/).filter(Boolean);
    const post = parseChannelPost(parts[0]);
    if (!post) return ctx.reply(`❌ WhatsApp channel post ka valid HTTPS link dein.\nExample: ${config.PREFIX}arcadd https://whatsapp.com/channel/CHANNEL_ID/POST_ID ❤️`);
    let emojis = [...new Set(parts.slice(1))];
    if (!emojis.length) {
        try {
            const settings = await userConfig(ctx.senderNumber);
            emojis = [settings.CHANNEL_REACT_EMOJI || DEFAULT_EMOJI];
        } catch (_) { emojis = [DEFAULT_EMOJI]; }
    }
    if (emojis.length > 10) return ctx.reply('⚠️ Ek baar mein maximum 10 reactions try kar sakte hain.');
    if (emojis.some(emoji => emoji.length > 32 || /[\r\n]/.test(emoji))) return ctx.reply('❌ Emoji format check karein.');
    if (typeof conn.newsletterReactMessage !== 'function') return ctx.reply('❌ Is Baileys version mein channel reaction API available nahi.');

    const results = [];
    for (const emoji of emojis) {
        try {
            await conn.newsletterReactMessage(post.jid, post.postId, emoji);
            results.push(`✅ ${emoji}`);
        } catch (error) {
            results.push(`❌ ${emoji}`);
        }
        if (emojis.length > 1) await new Promise(resolve => setTimeout(resolve, 350));
    }
    return ctx.reply(`🎯 *CHANNEL REACTION RESULT*\n\n${results.join('\n')}\n\nNote: WhatsApp may keep only one reaction per account on a post.`);
});

module.exports = { parseChannelPost };
