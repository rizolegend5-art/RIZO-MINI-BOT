const { cmd, commands } = require("../arslan");
const moment = require("moment-timezone");
const config = require("../config");

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
            const key = `${cmd.category.toLowerCase()}:${cmd.pattern.toLowerCase()}`;
            if (seen.has(key)) continue;
            seen.add(key);
            totalCommands++;
            if (!grouped[cmd.category.toLowerCase()]) grouped[cmd.category.toLowerCase()] = [];
            grouped[cmd.category.toLowerCase()].push(cmd.pattern);
        }

        const icons = {
            admin: '⚙️', adult: '🔞', download: '📥', downloader: '📥',
            fun: '🎮', general: '💎', group: '👥', islamic: '🕌',
            main: '⚡', menu: '📋', owner: '👑', premium: '💠',
            settings: '🔧', sticker: '🎨', system: '💻', tools: '🛠️',
            music: '🎵', image: '🖼️', misc: '📌', emotions: '💛', love: '💞',
            search: '🔍', utility: '⚡', anime: '🎌'
        };

        const order = [
            'main', 'download', 'downloader', 'music', 'group', 'admin',
            'owner', 'settings', 'general', 'search', 'tools', 'utility',
            'islamic', 'anime', 'sticker', 'image', 'premium', 'system',
            'games', 'fun', 'love', 'emotions', 'misc', 'adult'
        ];

        const time = moment().tz("Asia/Karachi").format("HH:mm:ss");
        const date = moment().tz("Asia/Karachi").format("dddd, MMMM Do YYYY");
        const quickPatterns = ['menu', 'alive', 'ping', 'song', 'igdl', 'fb', 'yts', 'weather', 'tts'];
        const availablePatterns = new Set(commands.filter(c => c.pattern).map(c => c.pattern.toLowerCase()));
        const quickCommands = quickPatterns.filter(pattern => availablePatterns.has(pattern));
        const quickSet = new Set(quickCommands);

        let menuText = '';

        // Header
        menuText += `╭━━━━━━━━━━━━━━━━━⊷\n`;
        menuText += `┃  《 *${config.BOT_NAME || 'RIZO Mini Bot'}* 》\n`;
        menuText += `┣━━━━━━━━━━━━━━━━━⊷\n`;
        menuText += `┃ ✦ *Commands* : ${totalCommands}\n`;
        menuText += `┃ ✦ *Time*     : ${time}\n`;
        menuText += `┃ ✦ *Date*     : ${date}\n`;
        menuText += `┃ ✦ *Owner*    : Private\n`;
        menuText += `┃ ✦ *Prefix*   : 『 ${config.PREFIX} 』\n`;
        menuText += `┃ ✦ *Mode*     : 〔 ${(config.WORK_TYPE || 'public').toUpperCase()} 〕\n`;
        menuText += `╰━━━━━━━━━━━━━━━━━⊷\n\n`;

        if (quickCommands.length) {
            menuText += `┏━━━━━━━━━━━━━━━━━⊷\n`;
            menuText += `┃ ⚡ *QUICK ACCESS*\n`;
            menuText += `┣━━━━━━━━━━━━━━━━━⊷\n`;
            for (const command of quickCommands) menuText += `┃ ✧ ${config.PREFIX}${command}\n`;
            menuText += `┗━━━━━━━━━━━━━━━━━⊷\n\n`;
        }

        const renderCategory = (cat) => {
            if (!grouped[cat] || !grouped[cat].length) return '';
            const icon = icons[cat] || '📌';
            const cmds = [...new Set(grouped[cat])].filter(command => !quickSet.has(command)).sort();
            if (!cmds.length) return '';
            let out = `┏━━━━━━━━━━━━━━━━━⊷\n`;
            out += `┃ ${icon} *${cat.toUpperCase()}*\n`;
            out += `┣━━━━━━━━━━━━━━━━━⊷\n`;
            for (const c of cmds) out += `┃ ✧ ${config.PREFIX}${c}\n`;
            out += `┗━━━━━━━━━━━━━━━━━⊷\n\n`;
            return out;
        };

        for (const cat of order) menuText += renderCategory(cat);
        for (const cat of Object.keys(grouped).sort()) {
            if (!order.includes(cat)) menuText += renderCategory(cat);
        }

        menuText += `┏━━━━━━━━━━━━━━━━━⊷\n`;
        menuText += `┃ © ᴘᴏᴡᴇʀᴇᴅ ʙʏ *${config.BOT_NAME || 'RIZO Mini Bot'}*\n`;
        menuText += `┗━━━━━━━━━━━━━━━━━⊷`;

        try {
            await conn.sendMessage(from, {
                image: { url: config.IMAGE_PATH },
                caption: menuText
            }, { quoted: mek });
        } catch (imgErr) {
            await conn.sendMessage(from, { text: menuText }, { quoted: mek });
        }
    } catch (err) {
        console.error("AllMenu Error:", err);
        try { await ctx.reply("❌ Menu error."); } catch (_) {}
    }
});