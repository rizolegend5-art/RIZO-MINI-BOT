// RIZO ADMIN PACK — reliable .kick (works with new LID groups) + .antibot on/off
const fs = require('fs');
const path = require('path');
const { cmd } = require('../arslan');

const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data', 'db');
try { fs.mkdirSync(DATA, { recursive: true }); } catch (_) {}
const loadJson = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch (_) { return d; } };
let timer;
const saveJson = (f, obj) => { clearTimeout(timer); timer = setTimeout(() => { try { fs.writeFileSync(path.join(DATA, f), JSON.stringify(obj)); } catch (_) {} }, 400); if (timer.unref) timer.unref(); };
const bare = (j) => String(j || '').split('@')[0].split(':')[0];

// find the participant entry (and the id WhatsApp expects) for any kind of jid: phone, lid, with/without device
const findParticipant = (participants, jid) => {
    const b = bare(jid);
    return (participants || []).find(p => [p.id, p.lid, p.jid, p.phoneNumber].some(x => x && bare(x) === b)) || null;
};

// ---------------------------------------------------------------- .kick (group admins)
cmd({
    pattern: 'kick', alias: ['remove', 'k'], category: 'admin', react: '🗑️',
    desc: 'Member ko group se nikalo (reply / mention / number)', use: '.kick @user  |  reply + .kick  |  .kick 923001234567', filename: __filename
}, async (conn, mek, m, ctx) => {
    const { from, isGroup, isAdmins, isBotAdmins, participants, reply, q } = ctx;
    if (!isGroup) return reply('❌ Yeh command sirf group mein chalti hai.');
    if (!isAdmins) return reply('⛔ Sirf group admins yeh command use kar sakte hain.');
    if (!isBotAdmins) return reply('❌ Bot ko pehle group *admin* banao.');

    const info = m.msg && m.msg.contextInfo;
    const targets = [];
    for (const j of (info && info.mentionedJid) || m.mentionedJid || []) targets.push(j);
    if (!targets.length && m.quoted && m.quoted.sender) targets.push(m.quoted.sender);
    if (!targets.length && q) { const d = q.replace(/\D/g, ''); if (d.length >= 8) targets.push(d + '@s.whatsapp.net'); }
    if (!targets.length) return reply('❌ Kisi ko mention karo, ya uske message ko reply karo, ya number likho.\nMisal: *.kick @user*');

    const me = bare(conn.user.id);
    const removed = [], skipped = [];
    for (const t of targets) {
        const p = findParticipant(participants, t);
        if (!p) { skipped.push(`${bare(t)} (group mein nahi)`); continue; }
        if (bare(p.id) === me || [p.lid, p.jid, p.phoneNumber].some(x => x && bare(x) === me)) { skipped.push('bot khud'); continue; }
        if (p.admin) { skipped.push(`@${bare(p.id)} (admin hai — pehle demote karo)`); continue; }
        try {
            await conn.groupParticipantsUpdate(from, [p.id], 'remove');
            removed.push(p.id);
        } catch (e) { skipped.push(`@${bare(p.id)} (error: ${e.message || e})`); }
    }
    if (removed.length) await conn.sendMessage(from, { text: `🚫 ${removed.map(r => '@' + bare(r)).join(' ')} ko group se remove kar diya gaya.`, mentions: removed }, { quoted: mek });
    if (skipped.length) await reply(`⚠️ Skip: ${skipped.join(', ')}`);
});

// ---------------------------------------------------------------- .antibot on/off
const ANTIBOT = loadJson('antibot.json', {});
cmd({
    pattern: 'antibot', category: 'group', react: '🤖',
    desc: 'ON ho to admins ke ilawa jis ka bot laga ho usay kick kar do', use: '.antibot on | off', filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!ctx.isGroup) return ctx.reply('❌ Yeh command sirf group mein chalti hai.');
    const v = (ctx.q || '').trim().toLowerCase();
    if (v === 'on') {
        ANTIBOT[ctx.from] = true; saveJson('antibot.json', ANTIBOT);
        return ctx.reply(`✅ *AntiBot ON*\nAdmins ke ilawa jis member ka bot chal raha hoga, usay group se kick kar diya jayega.${ctx.isBotAdmins ? '' : '\n\n⚠️ Bot abhi admin nahi hai — pehle usay admin banao, warna kick nahi kar sakega.'}`);
    }
    if (v === 'off') { delete ANTIBOT[ctx.from]; saveJson('antibot.json', ANTIBOT); return ctx.reply('✅ *AntiBot OFF*'); }
    ctx.reply(`🤖 AntiBot abhi: *${ANTIBOT[ctx.from] ? 'ON' : 'OFF'}*\n\n*.antibot on* — bot walon ko kick karo\n*.antibot off* — band`);
});

// bot clients (Baileys etc.) generate message ids that normal WhatsApp apps never use
const looksLikeBot = (id) => {
    id = String(id || '');
    if (id.startsWith('BAE5') && id.length === 16) return true;         // older Baileys
    if (id.startsWith('3EB0') && id.length >= 32) return true;          // current Baileys (WhatsApp Web ids are shorter)
    return false;
};
const handled = new Map();                                              // avoid kicking/notifying twice
cmd({ on: 'body', allowUnprefixedInGroups: true, dontAddCommandList: true, filename: __filename },
async (conn, mek, m, ctx) => {
    if (!ctx.isGroup || !ANTIBOT[ctx.from] || ctx.isMe || (mek.key && mek.key.fromMe)) return;
    if (!ctx.isBotAdmins || ctx.isAdmins || ctx.isOwner) return;
    if (!looksLikeBot(mek.key && mek.key.id)) return;
    const key = ctx.from + '|' + bare(ctx.sender);
    if (Date.now() - (handled.get(key) || 0) < 60000) return;
    handled.set(key, Date.now());
    if (handled.size > 500) handled.clear();
    const p = findParticipant(ctx.participants, ctx.sender);
    const target = p ? p.id : ctx.sender;
    if (p && p.admin) return;
    try {
        await conn.sendMessage(ctx.from, { delete: mek.key }).catch(() => {});
        await conn.groupParticipantsUpdate(ctx.from, [target], 'remove');
        await conn.sendMessage(ctx.from, {
            text: `🤖 *ANTIBOT*\n\n🚫 @${bare(target)} ka *bot* detect hua, is liye group se kick kar diya gaya.\n\n_Is group mein bot lagana mana hai (AntiBot ON)._`,
            mentions: [target]
        });
    } catch (e) { /* could not remove (permissions) - ignore */ }
});
