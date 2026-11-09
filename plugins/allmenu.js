const { cmd, commands } = require("../arslan");
const moment = require("moment-timezone");
const config = require("../config");

const UPDATE_CHANNEL_JID = "120363415257798894@newsletter";
const UPDATE_CHANNEL_NAME = "📢 RIZO-MD";

cmd({
    pattern: "menu",
    alias: ["commandlist", "allmenu", "help"],
    desc: "All bot commands",
    category: "system",
    react: "📋",
    filename: __filename,
}, async (conn, mek, m, ctx) => {
    try {
        const from = ctx.from || m.chat;
        let totalCommands = 0;
        const grouped = {};
        const seen = new Set();

        for (const cmd of commands) {
            if (!cmd.pattern || !cmd.category || cmd.dontAddCommandList) continue;
            const catName = cmd.category.toLowerCase() === 'downloader' ? 'download' : cmd.category.toLowerCase();
            const key = `${catName}:${cmd.pattern.toLowerCase()}`;
            if (seen.has(key)) continue;
            seen.add(key);
            totalCommands++;
            if (!grouped[catName]) grouped[catName] = [];
            grouped[catName].push(cmd.pattern);
        }

        const icons = {};
        // Menu order: UTILITY and ANIME first (same as the reference screenshot), then the rest
        const order = [
            'utility', 'anime', 'owner', 'group', 'admin', 'download',
            'music', 'general', 'settings', 'tools', 'image', 'sticker',
            'fun', 'games', 'love', 'emotions', 'islamic', 'main', 'system',
            'search', 'misc', 'referrals'
        ];

        const time = moment().tz("Asia/Karachi").format("HH:mm:ss");
        const date = moment().tz("Asia/Karachi").format("dddd, MMMM Do YYYY");
        const ownerDisplay = config.OWNER_DISPLAY_NUMBER || config.OWNER_NUMBER;
        const P = config.PREFIX;

        // ---- screenshot style block -------------------------------------------------
        //  ┌○═◇◇ TITLE ◇◇═•○
        //  │☆ ┌┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈✱
        //  │☆ . PING
        //  │☆ └┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈•○
        //  └──────────────────
        //  ═══════════════════
        //  ✪
        const block = (title, lines) => {
            let out = `┌○═◇◇ *${title}* ◇◇═•○\n`;
            out += `│☆ ┌┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈✱\n`;
            for (const l of lines) out += `│☆ ${l}\n`;
            out += `│☆ └┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈•○\n`;
            out += `└──────────────────────\n`;
            out += `══════════════════════\n`;
            out += `✪\n\n`;
            return out;
        };

        const renderCategory = (cat) => {
            if (!grouped[cat] || !grouped[cat].length) return '';
            const cmds = [...new Set(grouped[cat])].sort();
            return block(cat.toUpperCase(), cmds.map(c => `*${P}${c.toUpperCase()}*`));
        };

        const headerText = block(config.BOT_NAME || 'RIZO-MD', [
            `*COMMANDS* : ${totalCommands}`,
            `*TIME* : ${time}`,
            `*DATE* : ${date}`,
            `*OWNER* : ${ownerDisplay}`,
            `*PREFIX* : ${P}`,
            `*MODE* : ${(config.WORK_TYPE || 'public').toUpperCase()}`
        ]);

        const sections = [];
        for (const cat of order) { const r = renderCategory(cat); if (r) sections.push(r); }
        for (const cat of Object.keys(grouped).sort()) {
            if (!order.includes(cat)) { const r = renderCategory(cat); if (r) sections.push(r); }
        }
        sections.push(`© ᴘᴏᴡᴇʀᴇᴅ ʙʏ *${config.BOT_NAME || 'RIZO-MD'}*`);

        // WhatsApp cuts very long messages, so the menu is sent in chunks of whole categories
        const chunks = [];
        let cur = '';
        for (const sec of sections) {
            if (cur && (cur.length + sec.length) > 3000) { chunks.push(cur); cur = ''; }
            cur += sec;
        }
        if (cur) chunks.push(cur);

        const contextInfo = {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: UPDATE_CHANNEL_JID,
                newsletterName: UPDATE_CHANNEL_NAME,
                serverMessageId: 100
            }
        };

        try {
            await conn.sendMessage(from, {
                image: require('../lib/botpic').getBotPic(conn),
                caption: headerText,
                contextInfo
            }, { quoted: mek });
        } catch (imgErr) {
            await conn.sendMessage(from, { text: headerText, contextInfo }, { quoted: mek });
        }
        for (const chunk of chunks) {
            await conn.sendMessage(from, { text: chunk.trimEnd() }, { quoted: mek });
        }
    } catch (err) {
        console.error("AllMenu Error:", err);
        try { await ctx.reply("❌ Menu error."); } catch (_) {}
    }
});