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
        // short lines on purpose: long dashed lines wrap on phones and break the box
        const block = (title, lines) => {
            let out = `┌○═◇◇ *${title}* ◇◇═•○\n`;
            out += `│☆ ┌┈┈┈┈┈┈┈┈┈┈┈┈┈┈✱\n`;
            for (const l of lines) out += `│☆ ${l}\n`;
            out += `│☆ └┈┈┈┈┈┈┈┈┈┈┈┈┈┈•○\n`;
            out += `└────────────────\n`;
            out += `════════════════\n`;
            out += `✪\n\n`;
            return out;
        };

        // one box per category (whole menu goes out as ONE message)
        const renderCategory = (cat) => {
            if (!grouped[cat] || !grouped[cat].length) return '';
            const cmds = [...new Set(grouped[cat])].sort().map(c => `*${P}${c.toUpperCase()}*`);
            return block(cat.toUpperCase(), cmds);
        };

        // bot name: strip any trailing "bot" so the footer never says "BOT BOT"
        const cleanName = String(config.BOT_NAME || 'RIZO-MD').replace(/(\s*[-_ ]\s*bot)+\s*$/i, '').trim() || 'RIZO-MD';
        const botTitle = cleanName.toUpperCase();

        let menuText = block(botTitle.length > 10 ? 'RIZO-MD' : botTitle, [
            `*COMMANDS* : *${totalCommands}*`,
            `*TIME* : *${time}*`,
            `*DATE* : *${date.toUpperCase()}*`,
            `*OWNER* : *${ownerDisplay}*`,
            `*PREFIX* : *${P}*`,
            `*MODE* : *${(config.WORK_TYPE || 'public').toUpperCase()}*`
        ]);
        for (const cat of order) menuText += renderCategory(cat);
        for (const cat of Object.keys(grouped).sort()) {
            if (!order.includes(cat)) menuText += renderCategory(cat);
        }
        menuText += `© *POWERED BY ${botTitle} BOT*`;

        // "View channel" button at the bottom of the message (channel JID already in this file)
        const contextInfo = {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: UPDATE_CHANNEL_JID,
                newsletterName: UPDATE_CHANNEL_NAME,
                serverMessageId: 100
            }
        };

        // ONE text message, no image / no delays -> fast
        await conn.sendMessage(from, { text: menuText, contextInfo }, { quoted: mek });
    } catch (err) {
        console.error("AllMenu Error:", err);
        try { await ctx.reply("❌ Menu error."); } catch (_) {}
    }
});