// plugins/arcadd.js — Config-based (no MongoDB)

const { cmd } = require('../command');
const config = require('../config');
const { isPremiumUser } = require('../lib/premium-check');

const DEFAULT_REACTION_EMOJI = '❤️';

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

// Helper to delay between reactions to avoid rate limits
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// ═══════════════════════════════════════════
//  .arcadd — multiple channel reactions
// ═══════════════════════════════════════════
cmd({
    pattern: 'arcadd',
    alias: ['channelreact', 'reactch', 'multireact'],
    desc: 'React to a channel post with multiple emojis',
    category: 'premium',
    react: '💗',
    use: '.arcadd <channel-post-link> ❤️ 🔥 🚀',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!await isPremiumUser(ctx)) {
        return ctx.reply(`🔒 Premium command. Owner se promo code le kar \`${config.PREFIX}redeem <code>\` use karein.`);
    }

    const q = (ctx.q || '').trim();
    if (!q) return ctx.reply(`Use: ${config.PREFIX}arcadd <channel-link> ❤️ 🔥 🚀`);

    const parts = q.replace(/[,،]+/g, ' ').split(/\s+/).filter(Boolean);
    const parsed = parseChannelPost(parts[0]);
    if (!parsed) {
        return ctx.reply('❌ Valid WhatsApp channel post link do.');
    }

    let emojis = [...new Set(parts.slice(1))];
    if (!emojis.length) emojis = [DEFAULT_REACTION_EMOJI];
    if (emojis.length > 30) return ctx.reply('⚠️ Max 30 emojis allow hain.');

    if (typeof conn.newsletterReactMessage !== 'function') {
        return ctx.reply('❌ Baileys version mein channel reaction API available nahi hai.');
    }

    await ctx.reply(`⏳ Sending ${emojis.length} reactions to the channel post...`);

    const succeeded = [];
    const failed = [];

    // Har reaction ke darmiyan proper delay taake WhatsApp API block na kare
    for (const emoji of emojis) {
        try {
            await conn.newsletterReactMessage(parsed.jid, parsed.postId, emoji);
            succeeded.push(emoji);
            await sleep(500); // 0.5 sec delay per reaction
        } catch (e) {
            failed.push(`${emoji}`);
        }
    }

    let replyText = `🎯 *CHANNEL MULTI-REACTION RESULT*\n\n`;
    replyText += `📌 Post ID: \`${parsed.postId}\`\n`;
    replyText += `✅ Success: *${succeeded.length}/${emojis.length}*\n`;
    
    if (succeeded.length) {
        replyText += `✨ Emojis: ${succeeded.join(' ')}\n`;
    }
    if (failed.length) {
        replyText += `❌ Failed: ${failed.join(' ')}`;
    }

    return ctx.reply(replyText);
});
