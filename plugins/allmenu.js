const { cmd, commands } = require("../arslan");
const config = require("../config");
const path = require("path");
const fs = require("fs");
const { runtime } = require("../lib/functions");
const { getBotPic } = require("../lib/botpic");

const UPDATE_CHANNEL_JID = "120363415257798894@newsletter";
// Channel JID is taken from config.CHANNEL_LINK automatically (cached after the first lookup).
// The hard-coded JID is only a fallback if WhatsApp does not answer in time.
const FALLBACK_JID = UPDATE_CHANNEL_JID;
let resolvedChannel = null;
async function getChannelInfo(conn, botName) {
    if (resolvedChannel) return resolvedChannel;
    try {
        const link = config.CHANNEL_LINK || config.FORCE_CHANNEL_1;
        const code = new URL(String(link)).pathname.split("/").filter(Boolean)[1];
        if (code && typeof conn.newsletterMetadata === "function") {
            const meta = await Promise.race([
                conn.newsletterMetadata("invite", code),
                new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))
            ]);
            const jid = meta && (meta.id || meta.jid);
            if (jid && String(jid).endsWith("@newsletter")) {
                resolvedChannel = { jid, name: (meta.name || botName) };
                return resolvedChannel;
            }
        }
    } catch (_) { /* use fallback */ }
    return { jid: FALLBACK_JID, name: botName };
}

const audioDir = path.join(__dirname, "../data/menu-voice");

let VERSION = "1.0.0";
try { VERSION = require("../package.json").version || VERSION; } catch (_) {}

const getRandomAudio = () => {
    try {
        if (!fs.existsSync(audioDir)) return null;
        const files = fs.readdirSync(audioDir).filter(f => /\.mp3$/i.test(f));
        if (!files.length) return null;
        return path.join(audioDir, files[Math.floor(Math.random() * files.length)]);
    } catch (_) { return null; }
};

const toSmallCaps = (text) => {
    if (!text || typeof text !== "string") return "";
    const map = {
        a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ", h: "ʜ", i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ",
        n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ", s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ"
    };
    return text.split("").map(ch => map[ch.toLowerCase()] || ch).join("");
};

const getCategoryEmoji = (category) => {
    const cat = category.toLowerCase();
    if (cat.includes("audio") || cat.includes("voice") || cat.includes("sound") || cat.includes("music")) return "🎵";
    if (cat.includes("download") || cat.includes("dl")) return "📥";
    if (cat.includes("group") || cat.includes("gc")) return "👥";
    if (cat.includes("owner") || cat.includes("admin")) return "👑";
    if (cat.includes("anime")) return "✨";
    if (cat.includes("islam")) return "🕌";
    if (cat.includes("logo") || cat.includes("img") || cat.includes("image") || cat.includes("sticker")) return "🖼️";
    if (cat.includes("converter") || cat.includes("tools")) return "🛠️";
    if (cat.includes("fun") || cat.includes("game") || cat.includes("love") || cat.includes("emotion")) return "🎮";
    if (cat.includes("search") || cat.includes("find")) return "🔍";
    return "⚡";
};

const formatCategory = (category, names, prefix) => {
    if (!names.length) return "";
    const title = `\n╭┈───〔 ${getCategoryEmoji(category)} *${toSmallCaps(category.toUpperCase())}* 〕┈───⊷\n`;
    const body = names.map(n => `┋⋄ ➠ *${prefix}${n}*`).join("\n");
    return `${title}${body}\n╰─────────────────────⊷`;
};

const ORDER = ["utility", "anime", "main", "owner", "group", "admin", "download", "music", "general",
    "settings", "tools", "image", "sticker", "fun", "games", "love", "emotions", "islamic", "system", "search", "misc"];

cmd({
    pattern: "menu",
    alias: ["m", "help", "allmenu", "fullmenu", "commandlist"],
    use: ".menu",
    desc: "Show all bot commands",
    category: "system",
    react: "⚡",
    filename: __filename,
}, async (conn, mek, m, ctx) => {
    const from = ctx.from || m.chat;
    try {
        try { Promise.resolve(conn.sendPresenceUpdate("composing", from)).catch(() => {}); } catch (_) {}

        // group commands by category (no duplicates, hidden ones skipped)
        const grouped = {};
        let totalCommands = 0;
        const seen = new Set();
        for (const c of commands) {
            if (!c.pattern || !c.category || c.dontAddCommandList) continue;
            let cat = c.category.toLowerCase();
            if (cat === "downloader") cat = "download";
            const key = `${cat}:${c.pattern}`;
            if (seen.has(key)) continue;
            seen.add(key);
            totalCommands++;
            (grouped[cat] = grouped[cat] || []).push(c.pattern);
        }

        const PREFIX = config.PREFIX || ".";
        const BOT_NAME = String(config.BOT_NAME || "RIZO-MD").replace(/(\s*[-_ ]\s*bot)+\s*$/i, "").trim() || "RIZO-MD";
        const OWNER_NAME = config.OWNER_NAME || "Owner";
        const MODE = config.WORK_TYPE || "public";

        let menuSections = "";
        const cats = [...ORDER.filter(c => grouped[c]), ...Object.keys(grouped).filter(c => !ORDER.includes(c)).sort()];
        for (const cat of cats) menuSections += formatCategory(cat, [...new Set(grouped[cat])].sort(), PREFIX);

        const dec = `╭┈───〔 🌟 ${BOT_NAME.toUpperCase()} 🌟 〕┈───⊷
┋⋄ ➠ 𝗢𝗪𝗡𝗘𝗥: ${OWNER_NAME}
┋⋄ ➠ 𝗣𝗥𝗘𝗙𝗜𝗫: ${PREFIX}
┋⋄ ➠ 𝗨𝗣𝗧𝗜𝗠𝗘: ${runtime(process.uptime())}
┋⋄ ➠ 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦: ${totalCommands}
┋⋄ ➠ 𝗠𝗢𝗗𝗘: ${MODE}
┋⋄ ➠ 𝗩𝗘𝗥𝗦𝗜𝗢𝗡: ${VERSION}
╰─────────────────────⊷
${menuSections}

> ${config.BOT_FOOTER || `© Powered by ${BOT_NAME}`}`;

        const channel = await getChannelInfo(conn, BOT_NAME);
        const newsletterContext = {
            mentionedJid: [m.sender].filter(Boolean),
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: channel.jid,
                newsletterName: channel.name,
                serverMessageId: 143
            }
        };

        try {
            await conn.sendMessage(from, { image: getBotPic(conn), caption: dec, contextInfo: newsletterContext }, { quoted: mek });
        } catch (e) {
            // image/caption failed -> plain text so the menu always arrives
            await conn.sendMessage(from, { text: dec, contextInfo: newsletterContext }, { quoted: mek });
        }

        // menu voice (random mp3 from data/menu-voice) — sent in background, does not slow the menu
        const audioPath = getRandomAudio();
        if (audioPath) {
            conn.sendMessage(from, { audio: { url: audioPath }, mimetype: "audio/mp4", ptt: true }, { quoted: mek })
                .catch(err => console.log("Menu audio error:", err.message));
        }
    } catch (e) {
        console.error("AllMenu Error:", e);
        try { await ctx.reply("❌ Menu error: " + e.message); } catch (_) {}
    }
});
