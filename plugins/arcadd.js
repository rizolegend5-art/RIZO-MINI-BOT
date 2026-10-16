// plugins/arcadd.js — Config-based (no MongoDB)

const { cmd } = require('../arslan');
const config = require('../config');
const fs = require('fs');
const path = require('path');

const REF_FILE = path.join(__dirname, '..', 'referrals.json');

function loadRefs() {
    if (!fs.existsSync(REF_FILE)) return { codes: {}, counts: {}, byCode: {} };
    try {
        const d = JSON.parse(fs.readFileSync(REF_FILE, 'utf-8'));
        return { codes: d.codes || {}, counts: d.counts || {}, byCode: d.byCode || {} };
    } catch { return { codes: {}, counts: {}, byCode: {} }; }
}

function cleanNumber(v) {
    if (!v) return '';
    let n = String(v).replace(/[^0-9]/g, '');
    if (n.startsWith('0')) n = '92' + n.slice(1);
    if (n.length === 10 && n.startsWith('3')) n = '92' + n;
    return n;
}

// owner check — config se
function isOwner(ctx) {
    if (ctx.isOwner || ctx.isCreator) return true;
    const num = cleanNumber(ctx.senderNumber || ctx.sender);
    const owners = [
        ...(Array.isArray(config.OWNER_NUMBERS) ? config.OWNER_NUMBERS : []),
        config.OWNER_NUMBER
    ].map(cleanNumber).filter(Boolean);
    return owners.includes(num);
}

// premium check — config + JSON referrals
function isPremium(ctx) {
    if (isOwner(ctx)) return true;
    const num = cleanNumber(ctx.senderNumber || ctx.sender);
    if (!num) return false;
    const d = loadRefs();
    const count = d.counts[num] || 0;
    const threshold = Math.max(1, Number(config.PREMIUM_REFERRALS) || 4);
    return count >= threshold;
}

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

// ═══════════════════════════════════════════
//  .arcadd — channel reaction
// ═══════════════════════════════════════════
cmd({
    pattern: 'arcadd',
    alias: ['channelreact', 'chreact', 'reactch'],
    desc: 'React to a channel post with emoji(s)',
    category: 'premium',
    react: '💗',
    use: '.arcadd <channel-post-link> ❤️ 🔥',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!isPremium(ctx)) {
        const num = cleanNumber(ctx.senderNumber || ctx.sender);
        const d = loadRefs();
        const count = d.counts[num] || 0;
        const threshold = Math.max(1, Number(config.PREMIUM_REFERRALS) || 4);
        return ctx.reply(
            `🔒 *Premium command*\n\n` +
            `Aapke *${count}/${threshold}* referrals hain.\n\n` +
            `Apna referral link lo: *${config.PREFIX}myref*`
        );
    }

    const q = (ctx.q || '').trim();
    if (!q) return ctx.reply(`Use: ${config.PREFIX}arcadd <channel-link> ❤️ 🔥`);

    const parts = q.replace(/[,،]+/g, ' ').split(/\s+/).filter(Boolean);
    const parsed = parseChannelPost(parts[0]);
    if (!parsed) {
        return ctx.reply('❌ Valid WhatsApp channel post link do.');
    }

    let emojis = [...new Set(parts.slice(1))];
    if (!emojis.length) emojis = [DEFAULT_REACTION_EMOJI];
    if (emojis.length > 30) return ctx.reply('⚠️ Max 30 emojis.');

    if (typeof conn.newsletterReactMessage !== 'function') {
        return ctx.reply('❌ Baileys version mein channel reaction API nahi hai.');
    }

    const succeeded = [], failed = [];
    for (const emoji of emojis) {
        try {
            await conn.newsletterReactMessage(parsed.jid, parsed.postId, emoji);
            succeeded.push(emoji);
        } catch (e) {
            failed.push(`${emoji} (${e.message?.slice(0, 50)})`);
        }
        if (emojis.length > 1) await new Promise(r => setTimeout(r, 350));
    }

    let reply = `🎯 *CHANNEL REACTION RESULT*\n\n📌 Post: ${parsed.postId}\n✅ Success: ${succeeded.length}/${emojis.length}`;
    if (succeeded.length) reply += `\n✨ ${succeeded.join(' ')}`;
    if (failed.length) reply += `\n\n❌ Failed: ${failed.join(' ')}`;
    return ctx.reply(reply);
});