const { cmd, commands } = require("../arslan");
const moment = require("moment-timezone");
const config = require("../config");

cmd({
    pattern: "menu",
    alias: ["commandlist", "allmenu", "help"],
    desc: "Fetch and display all available bot commands",
    category: "system",
    react: "📋",
    filename: __filename,
}, async (conn, mek, m, { reply }) => {
    try {
        let totalCommands = 0;
        let grouped = {};

        // Group commands by category
        const seen = new Set();
        for (const cmd of commands) {
            if (!cmd.pattern || !cmd.category || cmd.dontAddCommandList) continue;

            const key = `${String(cmd.category).toLowerCase()}:${String(cmd.pattern).toLowerCase()}`;
            if (seen.has(key)) continue;
            seen.add(key);

            totalCommands++;
            if (!grouped[cmd.category]) grouped[cmd.category] = [];
            grouped[cmd.category].push(cmd.pattern);   // ✅ Sirf pattern
        }

        // Category icons
        const icons = {
            admin: '⚙️', adult: '🔞', download: '📥', downloader: '📥',
            fun: '🎮', general: '💠', group: '👥', islamic: '🕌',
            main: '⚡', menu: '📋', owner: '👑', premium: '💎',
            settings: '🔧', sticker: '🎨', system: '💻', tools: '🛠️',
            music: '🎵', image: '🖼️', referrals: '🔗', misc: '📌'
        };

        // Category order (jo pehle dikhe)
        const order = ['premium', 'owner', 'admin', 'group', 'download', 'downloader', 'music', 'islamic', 'fun', 'tools', 'image', 'sticker', 'settings', 'general', 'main', 'system', 'misc'];

        let menuText = "";
        for (const cat of order) {
            if (!grouped[cat]) continue;
            const icon = icons[cat] || '📌';
            menuText += `\n${icon} *${cat.toUpperCase()}*\n`;
            menuText += grouped[cat].sort().map(p => `◦ ${config.PREFIX}${p}`).join("\n") + "\n";
        }
        // Baaki categories (order me nahi thi)
        for (const cat of Object.keys(grouped).sort()) {
            if (order.includes(cat.toLowerCase())) continue;
            const icon = icons[cat.toLowerCase()] || '📌';
            menuText += `\n${icon} *${cat.toUpperCase()}*\n`;
            menuText += grouped[cat].sort().map(p => `◦ ${config.PREFIX}${p}`).join("\n") + "\n";
        }

        const time = moment().tz("Asia/Karachi").format("HH:mm:ss");
        const date = moment().tz("Asia/Karachi").format("dddd, MMMM Do YYYY");
        const ownerDisplay = config.OWNER_DISPLAY_NUMBER || config.OWNER_NUMBER;

        const caption = `
╭━━━《 *RIZO-ᴍᴅ* 》━━━┈⊷
┃ ✦╭─────────────┈⊷
┃ ✦│▸ Total Commands : *${totalCommands}*
┃ ✦│▸ Time           : ${time}
┃ ✦│▸ Date           : ${date}
┃ ✦│▸ Owner          : ${ownerDisplay}
┃ ✦╰─────────────┈⊷
╰━━━━━━━━━━━━┈⊷
💎 *PREMIUM — ${config.PREMIUM_REFERRALS} verified referrals*
🔗 ${config.PREFIX}myref  ·  ${config.PREFIX}arcadd
${menuText}
© ᴘᴏᴡᴇʀᴇᴅ ʙʏ RIZO-ᴍᴅ`.trim();

        // ✅ Image ke saath bhejo
        try {
            await conn.sendMessage(m.chat, {
                image: { url: config.IMAGE_PATH },
                caption
            }, { quoted: mek });
        } catch (imgErr) {
            console.error("Menu image failed:", imgErr.message);
            // Image fail ho to text bhejo
            await conn.sendMessage(m.chat, { text: caption }, { quoted: mek });
        }

    } catch (err) {
        console.error("AllMenu Error:", err);
        reply("❌ Error while generating menu.");
    }
});