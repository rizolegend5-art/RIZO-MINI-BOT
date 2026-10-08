const { cmd, commands } = require("../arslan");
const moment = require("moment-timezone");
const { fakevCard } = require('../lib/fakevCard');

cmd({
    pattern: "menu",
    alias: ["commandlist", "allmenu", "help"],
    desc: "Fetch and display all available bot commands",
    category: "system",
    filename: __filename,
}, async (conn, mek, m, { reply, config }) => {
    try {
        const prefix = config.PREFIX;
        let totalCommands = 0;
        let grouped = {};

        // Group commands by category
        for (const cmd of commands) {
            if (!cmd.pattern || !cmd.category) continue;

            totalCommands++;
            if (!grouped[cmd.category]) grouped[cmd.category] = [];
            grouped[cmd.category].push(cmd.pattern);
        }

        const catIcons = {
            main: "⚡", system: "🖥️", settings: "⚙️", owner: "👑",
            download: "📥", downloader: "📥", search: "🔎", group: "👥",
            admin: "🛡️", sticker: "🖼️", tools: "🧰", general: "✨",
            misc: "🔹"
        };

        const order = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

        let menuText = "";
        for (const cat of order) {
            const icon = catIcons[cat] || "🔸";
            menuText += `\n┌─❖ ${icon} *${cat.toUpperCase()}*\n`;
            menuText += grouped[cat].map(c => `│ ◦ ${prefix}${c}`).join("\n") + "\n└─────────────────\n";
        }

        const time = moment().tz("Africa/Kampala").format("HH:mm:ss");
        const date = moment().tz("Africa/Kampala").format("dddd, MMMM Do YYYY");

        const caption = `
╭━━━《 *RIZO-ᴍᴅ* 》━━━┈⊷
┃ ✦╭─────────────┈⊷
┃ ✦│▸ Total Commands : *${totalCommands}*
┃ ✦│▸ Prefix         : *${prefix}*
┃ ✦│▸ Time           : ${time}
┃ ✦│▸ Date           : ${date}
┃ ✦╰─────────────┈⊷
╰━━━━━━━━━━━━┈⊷
${menuText}
*© Powered by RIZO-MD*
`.trim();

        await conn.sendMessage(m.chat, {
            image: { url: "https://files.catbox.moe/a622og.jpg" },
            caption,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                mentionedJid: [m.sender],
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363430657109662@newsletter",
                    newsletterName: "RIZO-𝙈𝘿 𝙈𝙞𝙣𝙞 𝙑²",
                    serverMessageId: 2,
                },
            },
        }, { quoted: fakevCard });

    } catch (err) {
        console.error("AllMenu Error:", err);
        reply("❌ Error while generating menu.");
    }
});
