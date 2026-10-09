const { cmd, commands } = require("../arslan");
const moment = require("moment-timezone");
const config = require("../config");

cmd({
    pattern: "menu",
    alias: ["commandlist", "allmenu", "help"],
    desc: "Fetch and display all available bot commands",
    category: "system",
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
            grouped[cmd.category].push({ pattern: cmd.pattern, aliases: cmd.alias || [] });
        }

        let menuText = "";
        for (const cat of Object.keys(grouped).sort()) {
            grouped[cat].sort((a, b) => a.pattern.localeCompare(b.pattern));
            menuText += `\n🧚‍♀️ *${cat.toUpperCase()}*\n`;
            menuText += grouped[cat].map(item => {
                const aliases = item.aliases.filter(a => a && a !== item.pattern).slice(0, 4);
                const alternateNames = aliases.length ? `  _(${aliases.join(", ")})_` : "";
                return `💫 ${config.PREFIX}${item.pattern}${alternateNames}`;
            }).join("\n") + "\n";
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
🔗 ${config.PREFIX}myref  ·  ${config.PREFIX}arcadd <post link> <emoji>
${menuText}
`.trim();

        await conn.sendMessage(m.chat, { text: caption }, { quoted: m });

    } catch (err) {
        console.error("AllMenu Error:", err);
        reply("❌ Error while generating menu.");
    }
});
