
const { cmd, commands } = require("../arslan");
const moment = require("moment-timezone");
const config = require("../config");

// ===============================
// RIZO-MD CHANNEL SETTINGS
// ===============================

const UPDATE_CHANNEL_URL =
    config.UPDATE_CHANNEL_URL || "https://whatsapp.com/channel/0029VbE72MB2Jl87sS5pvR0g";

// ===============================
// MENU COMMAND
// ===============================

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

        const P = config.PREFIX || ".";

        const botName = String(
            config.BOT_NAME || "RIZO-MD"
        ).toUpperCase();

        const ownerDisplay =
            config.OWNER_DISPLAY_NUMBER ||
            config.OWNER_NUMBER ||
            "OWNER";

        // ===============================
        // COLLECT ALL COMMANDS
        // ===============================

        for (const command of commands) {

            if (
                !command.pattern ||
                !command.category ||
                command.dontAddCommandList
            ) continue;

            const category =
                command.category.toLowerCase() === "downloader"
                    ? "download"
                    : command.category.toLowerCase();

            // Skip adult category
            if (category === "adult") continue;

            const key =
                `${category}:${command.pattern.toLowerCase()}`;

            if (seen.has(key)) continue;

            seen.add(key);

            totalCommands++;

            if (!grouped[category]) {
                grouped[category] = [];
            }

            grouped[category].push(command.pattern);
        }

        // ===============================
        // CATEGORY ORDER
        // ===============================

        const order = [
            "utility",
            "anime",
            "owner",
            "group",
            "admin",
            "download",
            "music",
            "general",
            "settings",
            "tools",
            "image",
            "sticker",
            "fun",
            "games",
            "love",
            "emotions",
            "islamic",
            "main",
            "system",
            "search",
            "misc",
            "referrals"
        ];

        // ===============================
        // DATE AND TIME
        // ===============================

        const time = moment()
            .tz("Asia/Karachi")
            .format("HH:mm:ss");

        const date = moment()
            .tz("Asia/Karachi")
            .format("dddd, MMMM Do YYYY");

        // ===============================
        // MENU BOX DESIGN
        // ===============================

        function makeBox(title, lines) {

            let out = `┌○═◇◇ *${title}* ◇◇═•○\n`;

            out += `│☆ ┌┈┈┈┈┈┈┈┈┈┈┈┈┈┈✱\n`;

            for (const line of lines) {
                out += `│☆ ${line}\n`;
            }

            out += `│☆ └┈┈┈┈┈┈┈┈┈┈┈┈┈┈•○\n`;

            out += `└────────────────\n`;

            out += `════════════════\n`;

            out += `✪\n\n`;

            return out;
        }

        // ===============================
        // HEADER
        // ===============================

        let menu = makeBox("RIZO-MD", [

            `*BOT* : *${botName}*`,

            `*COMMANDS* : *${totalCommands}*`,

            `*TIME* : *${time}*`,

            `*DATE* : *${date.toUpperCase()}*`,

            `*OWNER* : *${ownerDisplay}*`,

            `*PREFIX* : *${P}*`,

            `*MODE* : *${(
                config.WORK_TYPE || "PUBLIC"
            ).toUpperCase()}*`

        ]);

        // ===============================
        // SORT CATEGORIES
        // ===============================

        const categories = [

            ...order.filter(cat => grouped[cat]),

            ...Object.keys(grouped)
                .filter(cat => !order.includes(cat))
                .sort()

        ];

        // ===============================
        // ADD COMMANDS
        // ===============================

        for (const category of categories) {

            const categoryCommands = [
                ...new Set(grouped[category])
            ]
                .sort()
                .map(command => {
                    return `*${P}${command.toUpperCase()}*`;
                });

            menu += makeBox(
                category.toUpperCase(),
                categoryCommands
            );
        }

        // ===============================
        // FOOTER
        // ===============================

        menu += `\n© *POWERED BY ${botName} BOT*`;

        // ===============================
        // SEND BOT IMAGE
        // ===============================

        try {

            const botPic = require("../lib/botpic");

            const image = botPic.getBotPic(conn);

            await conn.sendMessage(from, {

                image: image,

                caption: `🤖 *${botName}*\n\n📋 COMPLETE COMMAND MENU\n\n© POWERED BY ${botName}`

            }, {
                quoted: mek
            });

        } catch (imageError) {

            console.log(
                "BOT IMAGE ERROR:",
                imageError
            );

        }

        // ===============================
        // CHANNEL BUTTON
        // ===============================

        const menuMessage = {
            text: menu,
            footer: `${botName} | Official Menu`
        };

        if (
            UPDATE_CHANNEL_URL &&
            UPDATE_CHANNEL_URL.startsWith(
                "https://whatsapp.com/channel/"
            )
        ) {

            menuMessage.templateButtons = [

                {
                    index: 1,

                    urlButton: {
                        displayText: "📢 VIEW CHANNEL",
                        url: UPDATE_CHANNEL_URL
                    }
                }

            ];

        }

        // ===============================
        // SEND COMPLETE MENU
        // ===============================

        await conn.sendMessage(
            from,
            menuMessage,
            {
                quoted: mek
            }
        );

    } catch (error) {

        console.error(
            "RIZO MENU ERROR:",
            error
        );

        try {

            await ctx.reply(
                "❌ Menu Error: " + error.message
            );

        } catch (e) {}

    }

});
