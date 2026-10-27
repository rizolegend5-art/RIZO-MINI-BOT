const { cmd, commands } = require("../arslan");
const moment = require("moment-timezone");
const config = require("../config");

const MENU_IMAGE = "https://files.catbox.moe/9ykuur.jpg";
const CHANNEL_URL = "https://whatsapp.com/channel/0029VbDklK7Jf05XGSBuTc0u";

const CATEGORY_ICONS = {
    admin: "🛡️",
    adult: "🔞",
    anime: "🎌",
    download: "📥",
    downloader: "📥",
    emotions: "💛",
    fun: "🎮",
    games: "🎮",
    general: "✨",
    group: "👥",
    image: "🖼️",
    islamic: "🕌",
    love: "💞",
    main: "⚡",
    misc: "📌",
    music: "🎵",
    owner: "👑",
    premium: "💠",
    search: "🔎",
    settings: "⚙️",
    sticker: "🎨",
    system: "🤖",
    tools: "🧰",
    utility: "🧮"
};

const CATEGORY_ORDER = [
    "main", "general", "download", "downloader",
    "music", "search", "tools", "utility",
    "group", "admin", "settings", "owner",
    "islamic", "anime", "sticker", "image",
    "premium", "system", "fun", "games",
    "love", "emotions", "misc", "adult"
];

cmd({
    pattern: "menu",
    alias: ["commandlist", "allmenu", "help"],
    desc: "Show all commands with menu image",
    category: "system",
    react: "📋",
    filename: __filename
}, async (conn, mek, m, ctx) => {
    try {
        const from = ctx.from || m.chat;
        const prefix = String(config.PREFIX || ".");
        const botName = config.BOT_NAME || "RIZO X AMAN MINI BOT";

        // Collect unique registered commands.
        const uniqueCommands = new Map();

        for (const item of commands) {
            if (
                !item.pattern ||
                !item.category ||
                item.dontAddCommandList
            ) continue;

            const pattern = String(item.pattern).toLowerCase();
            const category = String(item.category).toLowerCase();

            if (!uniqueCommands.has(pattern)) {
                uniqueCommands.set(pattern, { pattern, category });
            }
        }

        const allCommands = [...uniqueCommands.values()];
        const grouped = new Map();

        for (const item of allCommands) {
            if (!grouped.has(item.category)) {
                grouped.set(item.category, []);
            }

            grouped.get(item.category).push(item.pattern);
        }

        // Sort commands inside each category.
        for (const list of grouped.values()) {
            list.sort((a, b) => a.localeCompare(b));
        }

        // Show categories in the preferred order.
        const categories = [...grouped.keys()].sort((a, b) => {
            const ai = CATEGORY_ORDER.indexOf(a);
            const bi = CATEGORY_ORDER.indexOf(b);

            if (ai === -1 && bi === -1) {
                return a.localeCompare(b);
            }

            if (ai === -1) return 1;
            if (bi === -1) return -1;

            return ai - bi;
        });

        const time = moment()
            .tz("Asia/Karachi")
            .format("ddd, D MMM YYYY · hh:mm A");

        const lines = [
            `╭━━━〔 👑 *${botName}* 〕━━━╮`,
            `┃ ⚡ Total Commands: *${allCommands.length}*`,
            `┃ 🔰 Prefix: *${prefix}*`,
            `┃ 🕒 ${time} PKT`,
            `╰━━━━━━━━━━━━━━━━━━╯`,
            "",
            "✨ *ALL COMMANDS*",
            ""
        ];

        // All commands in one categorized list, without pagination.
        for (const category of categories) {
            const icon = CATEGORY_ICONS[category] || "📂";
            const list = grouped.get(category);

            lines.push(
                `${icon} *${category.toUpperCase()}* (${list.length})`
            );

            lines.push(
                list.map(name => `${prefix}${name}`).join("  ·  ")
            );

            lines.push("");
        }

        lines.push("╭━━━━━━━━━━━━━━━━━━╮");
        lines.push(`┃ 👑 *${botName}*`);
        lines.push("┃ 📢 Official Channel: View Channel button");
        lines.push("╰━━━━━━━━━━━━━━━━━━╯");

        const menuText = lines.join("\n");

        // Send the menu image first.
        await conn.sendMessage(
            from,
            {
                image: { url: MENU_IMAGE },
                caption:
                    `👑 *${botName}*\n\n` +
                    `⚡ Commands: ${allCommands.length}\n` +
                    `🔰 Prefix: ${prefix}\n` +
                    `🕒 ${time} PKT\n\n` +
                    `✨ All commands neeche dekhein.`
            },
            { quoted: mek }
        );

        // Send all categorized commands with the channel button.
        return await conn.sendMessage(
            from,
            {
                text: menuText,
                footer: `${botName} • Official WhatsApp Channel`,
                templateButtons: [
                    {
                        index: 1,
                        urlButton: {
                            displayText: "📢 VIEW CHANNEL",
                            url: CHANNEL_URL
                        }
                    }
                ],
                headerType: 1
            },
            { quoted: mek }
        );

    } catch (err) {
        console.error("RIZO Menu Error:", err);

        try {
            await ctx.reply(
                "❌ Menu send nahi ho saka. Baad mein dobara try karo."
            );
        } catch (_) {}
    }
});