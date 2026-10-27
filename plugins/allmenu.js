const { cmd, commands } = require("../arslan");
const moment = require("moment-timezone");
const config = require("../config");

const CATEGORY_ICONS = {
    admin: "🛡️", adult: "🔞", anime: "🎌", download: "📥",
    downloader: "📥", emotions: "💛", fun: "🎮", games: "🎮",
    general: "✨", group: "👥", image: "🖼️", islamic: "🕌",
    love: "💞", main: "⚡", misc: "📌", music: "🎵",
    owner: "👑", premium: "💠", search: "🔎", settings: "⚙️",
    sticker: "🎨", system: "🤖", tools: "🧰", utility: "🧮"
};

const CATEGORY_ORDER = [
    "main", "general", "download", "downloader", "music", "search",
    "tools", "utility", "group", "admin", "settings", "owner",
    "islamic", "anime", "sticker", "image", "premium", "system",
    "fun", "games", "love", "emotions", "misc", "adult"
];

const PAGE_SIZE = 18;

const CHANNEL_URL =
    "https://whatsapp.com/channel/0029VbDklK7Jf05XGSBuTc0u";

cmd({
    pattern: "menu",
    alias: ["commandlist", "allmenu", "help"],
    desc: "Paginated command menu",
    category: "system",
    react: "📋",
    filename: __filename,
}, async (conn, mek, m, ctx) => {
    try {
        const from = ctx.from || m.chat;
        const prefix = String(config.PREFIX || ".");
        const uniqueCommands = new Map();

        // Collect registered commands without duplicates
        for (const item of commands) {
            if (
                !item.pattern ||
                !item.category ||
                item.dontAddCommandList
            ) continue;

            const pattern = String(item.pattern).toLowerCase();

            if (!uniqueCommands.has(pattern)) {
                uniqueCommands.set(pattern, {
                    pattern,
                    category: String(item.category).toLowerCase()
                });
            }
        }

        const publicCommands = [...uniqueCommands.values()];
        const grouped = new Map();

        for (const item of publicCommands) {
            if (!grouped.has(item.category)) {
                grouped.set(item.category, []);
            }
            grouped.get(item.category).push(item);
        }

        for (const list of grouped.values()) {
            list.sort((a, b) => a.pattern.localeCompare(b.pattern));
        }

        const categories = [...grouped.keys()].sort((a, b) => {
            const aIndex = CATEGORY_ORDER.indexOf(a);
            const bIndex = CATEGORY_ORDER.indexOf(b);

            if (aIndex < 0 && bIndex < 0) {
                return a.localeCompare(b);
            }
            if (aIndex < 0) return 1;
            if (bIndex < 0) return -1;

            return aIndex - bIndex;
        });

        const args = String(ctx.q || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        const requested = (args[0] || "").toLowerCase();
        const numericPage = /^\d+$/.test(requested);

        let menuText;

        // Main menu
        if (!requested) {
            const quickNames = [
                "ping", "alive", "weather", "song",
                "currency", "define", "unit"
            ];

            const available = new Set(
                publicCommands.map(item => item.pattern)
            );

            const quick = quickNames.filter(
                name => available.has(name)
            );

            const categoryLines = categories.map(category => {
                const icon = CATEGORY_ICONS[category] || "📂";
                const count = grouped.get(category).length;

                return `┃ ${icon} ${prefix}menu ${category}  ·  ${count} commands`;
            });

            menuText = [
                `╭━━━〔 *${config.BOT_NAME || "RIZO X AMAN- Mini Bot"}* 〕━━━╮`,
                `┃ ⚡ ${publicCommands.length} commands  ·  Prefix: *${prefix}*`,
                `┃ 🕒 ${moment().tz("Asia/Karachi").format("ddd, D MMM · HH:mm")} PKT`,
                "╰━━━━━━━━━━━━━━━━━━━━╯",
                "",
                "✨ *QUICK ACCESS*",
                quick.length
                    ? quick.map(name => `${prefix}${name}`).join("  ·  ")
                    : "No quick commands available",
                "",
                "📂 *BROWSE CATEGORIES*",
                ...categoryLines,
                "",
                `📖 ${prefix}menu <category> [page]`,
                `📚 ${prefix}menu all [page]  ·  Aliases bhi kaam karte hain`,
                `╰─ © ${config.BOT_NAME || "RIZO X AMAN-MD Mini Bot"}`
            ].join("\n");
        } else {
            const category = numericPage ? "all" : requested;
            const rawPage = numericPage
                ? requested
                : (args[1] || "1");

            if (!/^\d+$/.test(rawPage) || Number(rawPage) < 1) {
                return ctx.reply(
                    `❌ Page number 1 ya us se bara likho.\n` +
                    `Example: ${prefix}menu tools 2`
                );
            }

            let entries;

            if (category === "all") {
                const categoryRank = new Map(
                    categories.map((name, index) => [name, index])
                );

                entries = [...publicCommands].sort((a, b) =>
                    (categoryRank.get(a.category) ?? 999) -
                    (categoryRank.get(b.category) ?? 999) ||
                    a.pattern.localeCompare(b.pattern)
                );
            } else {
                entries = grouped.get(category);

                if (!entries) {
                    return ctx.reply(
                        `❌ Category nahi mili: *${category}*\n` +
                        `${prefix}menu bhejo aur available categories dekho.`
                    );
                }
            }

            const totalPages = Math.max(
                1,
                Math.ceil(entries.length / PAGE_SIZE)
            );

            const page = Number(rawPage);

            if (page > totalPages) {
                return ctx.reply(
                    `❌ Is list mein sirf ${totalPages} page` +
                    `${totalPages === 1 ? "" : "s"} hain.\n` +
                    `Use: ${prefix}menu ${category} ${totalPages}`
                );
            }

            const start = (page - 1) * PAGE_SIZE;
            const pageItems = entries.slice(start, start + PAGE_SIZE);

            const title = category === "all"
                ? "ALL COMMANDS"
                : `${CATEGORY_ICONS[category] || "📂"} ${category.toUpperCase()}`;

            const lines = pageItems.map((item, index) => {
                const number = String(start + index + 1).padStart(2, "0");

                if (category === "all") {
                    return `┃ ${number}  ${CATEGORY_ICONS[item.category] || "📂"} ${prefix}${item.pattern}`;
                }

                return `┃ ${number}  ${prefix}${item.pattern}`;
            });

            menuText = [
                `╭━━━〔 *${title}* 〕━━━╮`,
                `┃ ${entries.length} commands  ·  Page ${page}/${totalPages}`,
                "┣━━━━━━━━━━━━━━━━━━━━",
                ...lines,
                "╰━━━━━━━━━━━━━━━━━━━━",
                "",
                page < totalPages
                    ? `Next: ${prefix}menu ${category} ${page + 1}`
                    : `Back: ${prefix}menu`,
                "_Command aliases are also supported._"
            ].join("\n");
        }

        // Send the existing menu with the official channel button.
        // Support for templateButtons depends on the installed Baileys version.
        return await conn.sendMessage(
            from,
            {
                text: menuText,
                footer: "👑 RIZO X AMAN MINI BOT • Official Channel",
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
        console.error("AllMenu Error:", err.message);

        try {
            await ctx.reply(
                "❌ Menu error. Thori dair baad try karo."
            );
        } catch (_) {}
    }
});