const { cmd, commands } = require("../arslan");
const moment = require("moment-timezone");
const config = require("../config");

// ===========================================================
// 🎯 Update Channel
// ===========================================================
const UPDATE_CHANNEL_JID = "120363412937151595@newsletter";
const UPDATE_CHANNEL_NAME = "📢 RIZO-MD UPDATES";

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
        const reply = (text) => conn.sendMessage(from, { text }, { quoted: mek });

        let totalCommands = 0;
        const grouped = {};

        const seen = new Set();
        for (const cmd of commands) {
            if (!cmd.pattern || !cmd.category || cmd.dontAddCommandList) continue;

            const key = `${String(cmd.category).toLowerCase()}:${String(cmd.pattern).toLowerCase()}`;
            if (seen.has(key)) continue;
            seen.add(key);

            totalCommands++;
            if (!grouped[cmd.category.toLowerCase()]) grouped[cmd.category.toLowerCase()] = [];
            grouped[cmd.category.toLowerCase()].push(cmd.pattern);
        }

        // Category icons
        const icons = {
            admin: '⚙️', adult: '🔞', download: '📥', downloader: '📥',
            fun: '🎮', general: '💎', group: '👥', islamic: '🕌',
            main: '⚡', menu: '📋', owner: '👑', premium: '💠',
            settings: '🔧', sticker: '🎨', system: '💻', tools: '🛠️',
            music: '🎵', image: '🖼️', referrals: '🔗', misc: '📌',
            search: '🔍', utility: '⚡', anime: '🎌'
        };

        // Category order
        const order = [
            'premium', 'owner', 'admin', 'group', 'download', 'downloader',
            'music', 'islamic', 'fun', 'anime', 'tools', 'image', 'sticker',
            'settings', 'general', 'main', 'system', 'search', 'utility',
            'misc', 'referrals'
        ];

        // Time & Date
        const time = moment().tz("Asia/Karachi").format("HH:mm:ss");
        const date = moment().tz("Asia/Karachi").format("dddd, MMMM Do YYYY");
        const ownerDisplay = config.OWNER_DISPLAY_NUMBER || config.OWNER_NUMBER;

        // ===========================================================
        // 🎨 STYLISH MENU
        // ===========================================================
        let menuText = '';

        // Header
        menuText += `╭━━━━━━━━━━━━━━━━━⊷\n`;
        menuText += `┃  《 *${config.BOT_NAME || 'RIZO-MD'}* 》\n`;
        menuText += `┣━━━━━━━━━━━━━━━━━⊷\n`;
        menuText += `┃ ✦ *Commands* : ${totalCommands}\n`;
        menuText += `┃ ✦ *Time*     : ${time}\n`;
        menuText += `┃ ✦ *Date*     : ${date}\n`;
        menuText += `┃ ✦ *Owner*    : ${ownerDisplay}\n`;
        menuText += `┃ ✦ *Prefix*   : 『 ${config.PREFIX} 』\n`;
        menuText += `┃ ✦ *Mode*     : 〔 ${(config.WORK_TYPE || 'public').toUpperCase()} 〕\n`;
        menuText += `╰━━━━━━━━━━━━━━━━━⊷\n\n`;

        // ===========================================================
        // 💠 PREMIUM SECTION (top)
        // ===========================================================
        menuText += `┏━━━━━━━━━━━━━━━━━⊷\n`;
        menuText += `┃ 💠 *PREMIUM* 💠\n`;
        menuText += `┣━━━━━━━━━━━━━━━━━⊷\n`;
        menuText += `┃ ✧ ${config.PREFIX}botscript\n`;
        menuText += `┃ ✧ ${config.PREFIX}bugbotscript\n`;
        menuText += `┃ ✧ ${config.PREFIX}promo\n`;
        menuText += `┃ ✧ ${config.PREFIX}myref\n`;
        menuText += `┗━━━━━━━━━━━━━━━━━⊷\n\n`;

        // ===========================================================
        // 📋 CATEGORIES
        // ===========================================================
        const renderCategory = (cat) => {
            if (!grouped[cat] || !grouped[cat].length) return '';
            const icon = icons[cat] || '📌';
            const cmds = [...new Set(grouped[cat])].sort();

            let out = `┏━━━━━━━━━━━━━━━━━⊷\n`;
            out += `┃ ${icon} *${cat.toUpperCase()}*\n`;
            out += `┣━━━━━━━━━━━━━━━━━⊷\n`;
            for (const c of cmds) {
                out += `┃ ✧ ${config.PREFIX}${c}\n`;
            }
            out += `┗━━━━━━━━━━━━━━━━━⊷\n\n`;
            return out;
        };

        // Ordered categories
        for (const cat of order) {
            menuText += renderCategory(cat);
        }

        // Remaining categories
        for (const cat of Object.keys(grouped).sort()) {
            if (order.includes(cat)) continue;
            menuText += renderCategory(cat);
        }

        // Footer
        menuText += `┏━━━━━━━━━━━━━━━━━⊷\n`;
        menuText += `┃ © ᴘᴏᴡᴇʀᴇᴅ ʙʏ *${config.BOT_NAME || 'RIZO-MD'}*\n`;
        menuText += `┗━━━━━━━━━━━━━━━━━⊷`;

        // ===========================================================
        // 🚀 SEND MENU (image + channel view)
        // ===========================================================
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
                image: { url: config.IMAGE_PATH },
                caption: menuText,
                contextInfo
            }, { quoted: mek });
        } catch (imgErr) {
            console.error('Menu image failed:', imgErr.message);
            // Fallback: text only
            await conn.sendMessage(from, {
                text: menuText,
                contextInfo
            }, { quoted: mek });
        }

    } catch (err) {
        console.error("AllMenu Error:", err);
        try {
            await ctx.reply("❌ Error while generating menu.");
        } catch (_) {}
    }
});