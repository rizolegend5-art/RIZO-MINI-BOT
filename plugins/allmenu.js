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

        const PAGE = 30;   // commands per box; a category is never cut in the middle of a box
        const renderCategory = (cat) => {
            if (!grouped[cat] || !grouped[cat].length) return [];
            const cmds = [...new Set(grouped[cat])].sort().map(c => `*${P}${c.toUpperCase()}*`);
            const pages = Math.ceil(cmds.length / PAGE);
            const out = [];
            for (let i = 0; i < pages; i++) {
                const title = pages > 1 ? `${cat.toUpperCase()} ${i + 1}/${pages}` : cat.toUpperCase();
                out.push(block(title, cmds.slice(i * PAGE, (i + 1) * PAGE)));
            }
            return out;
        };

        const botTitle = String(config.BOT_NAME || 'RIZO-MD').toUpperCase();
        const headerText = block(botTitle.length > 10 ? 'RIZO-MD' : botTitle, [
            `*COMMANDS* : *${totalCommands}*`,
            `*TIME* : *${time}*`,
            `*DATE* : *${date.toUpperCase()}*`,
            `*OWNER* : *${ownerDisplay}*`,
            `*PREFIX* : *${P}*`,
            `*MODE* : *${(config.WORK_TYPE || 'public').toUpperCase()}*`
        ]);

        const sections = [];
        for (const cat of order) sections.push(...renderCategory(cat));
        for (const cat of Object.keys(grouped).sort()) {
            if (!order.includes(cat)) sections.push(...renderCategory(cat));
        }

        // pack whole boxes into messages (never split a box)
        const chunks = [];
        let cur = '';
        for (const sec of sections) {
            if (cur && (cur.length + sec.length) > 2800) { chunks.push(cur); cur = ''; }
            cur += sec;
        }
        cur += `© *POWERED BY ${botTitle}*`;
        chunks.push(cur);

        // no forwarded/newsletter info -> no "View channel" button on the menu
        try {
            await conn.sendMessage(from, {
                image: require('../lib/botpic').getBotPic(conn),
                caption: headerText.trimEnd()
            }, { quoted: mek });
        } catch (imgErr) {
            await conn.sendMessage(from, { text: headerText.trimEnd() }, { quoted: mek });
        }
        for (const chunk of chunks) {
            await conn.sendMessage(from, { text: chunk.trimEnd() });
            await new Promise(r => setTimeout(r, 500));
        }
    } catch (err) {
        console.error("AllMenu Error:", err);
        try { await ctx.reply("❌ Menu error."); } catch (_) {}
    }
});