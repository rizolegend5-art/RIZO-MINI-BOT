
const { cmd, commands } = require("../arslan");
const moment = require("moment-timezone");
const config = require("../config");

// APNA CHANNEL LINK YAHAN LAGAO
const UPDATE_CHANNEL_URL = "https://whatsapp.com/channel/0029VbE72MB2Jl87sS5pvR0g";

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
        const grouped = {};
        const seen = new Set();
        let totalCommands = 0;

        // COLLECT COMMANDS
        for (const command of commands) {
            if (
                !command.pattern ||
                !command.category ||
                command.dontAddCommandList
            ) continue;

            const cat = command.category.toLowerCase() === "downloader"
                ? "download"
                : command.category.toLowerCase();

            const key = `${cat}:${command.pattern.toLowerCase()}`;

            if (seen.has(key)) continue;

            seen.add(key);
            totalCommands++;

            if (!grouped[cat]) grouped[cat] = [];

            grouped[cat].push(command.pattern);
        }

        const order = [
            "utility", "anime", "owner", "group",
            "admin", "download", "music", "general",
            "settings", "tools", "image", "sticker",
            "fun", "games", "love", "emotions",
            "islamic", "main", "system", "search",
            "misc", "referrals"
        ];

        const time = moment().tz("Asia/Karachi").format("HH:mm:ss");
        const date = moment().tz("Asia/Karachi").format("DD MMMM YYYY");

        const P = config.PREFIX || ".";
        const owner = config.OWNER_DISPLAY_NUMBER || config.OWNER_NUMBER || "Owner";
        const botName = String(config.BOT_NAME || "RIZO-MD").toUpperCase();

        // MENU BOX DESIGN
        function makeBox(title, lines) {
            let text = `┌○═◇◇ *${title}* ◇◇═•○\n`;
            text += `│☆ ┌┈┈┈┈┈┈┈┈┈┈┈┈┈┈✱\n`;

            for (const line of lines) {
                text += `│☆ ${line}\n`;
            }

            text += `│☆ └┈┈┈┈┈┈┈┈┈┈┈┈┈┈•○\n`;
            text += `└────────────────\n`;
            text += `════════════════\n`;
            text += `✪\n\n`;

            return text;
        }

        // HEADER
        let menu = makeBox("RIZO-MD MENU", [
            `*BOT* : *${botName}*`,
            `*COMMANDS* : *${totalCommands}*`,
            `*TIME* : *${time}*`,
            `*DATE* : *${date}*`,
            `*OWNER* : *${owner}*`,
            `*PREFIX* : *${P}*`,
            `*MODE* : *${config.WORK_TYPE || "PUBLIC"}*`
        ]);

        // SORT CATEGORIES
        const categories = [
            ...order.filter(cat => grouped[cat]),
            ...Object.keys(grouped)
                .filter(cat => !order.includes(cat))
                .sort()
        ];

        // ADD ALL COMMANDS
        for (const cat of categories) {
            const list = [...new Set(grouped[cat])]
                .sort()
                .map(cmd => `*${P}${cmd.toUpperCase()}*`);

            menu += makeBox(cat.toUpperCase(), list);
        }

        menu += `\n© *POWERED BY ${botName}*`;

        // VIEW CHANNEL BUTTON
        const buttons = [];

        if (
            UPDATE_CHANNEL_URL.startsWith(
                "https://whatsapp.com/channel/"
            ) &&
            !UPDATE_CHANNEL_URL.includes("YOUR_CHANNEL_ID")
        ) {
            buttons.push({
                index: 1,
                urlButton: {
                    displayText: "📢 VIEW CHANNEL",
                    url: UPDATE_CHANNEL_URL
                }
            });
        }

        // SEND ONE COMPLETE MENU
        const message = {
            text: menu,
            footer: `${botName} | Official Menu`,
            ...(buttons.length ? { templateButtons: buttons } : {})
        };

        await conn.sendMessage(from, message, {
            quoted: mek
        });

    } catch (error) {
        console.error("MENU ERROR:", error);

        try {
            await ctx.reply("❌ Menu Error: " + error.message);
        } catch (e) {}
    }
});
