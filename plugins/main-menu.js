const config = require('../config')
const { cmd, commands } = require('../command');
const path = require('path');
const os = require("os")
const fs = require('fs');
const {runtime} = require('../lib/functions')
const axios = require('axios')
const converter = require('../lib/converter');

const audioDir = path.join(__dirname, '../data/menu-voice');

const getRandomAudio = () => {
    if (!fs.existsSync(audioDir)) return null;
    const files = fs.readdirSync(audioDir).filter(f => /\.mp3$/i.test(f));
    if (!files.length) return null;
    // ایک ہی سونگ یا فکسڈ فائل کو اٹھانے کے لیے سیدھا پہلا یا رینڈم پِک
    const pick = files[Math.floor(Math.random() * files.length)];
    return path.join(audioDir, pick);
};

const toSmallCaps = (text) => {
    if (!text || typeof text !== 'string') return '';
    const smallCapsMap = {
        'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ғ', 'g': 'ɢ', 'h': 'ʜ', 'i': 'ɪ',
        'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ',
        's': 's', 't': 'ᴛ', 'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ',
        'A': 'ᴀ', 'B': 'ʙ', 'C': 'ᴄ', 'D': 'ᴅ', 'E': 'ᴇ', 'F': 'ғ', 'G': 'ɢ', 'H': 'ʜ', 'I': 'ɪ',
        'J': 'ᴊ', 'K': 'ᴋ', 'L': 'ʟ', 'M': 'ᴍ', 'N': 'ɴ', 'O': 'ᴏ', 'P': 'ᴘ', 'Q': 'ǫ', 'R': 'ʀ',
        'S': 's', 'T': 'ᴛ', 'U': 'ᴜ', 'V': 'ᴠ', 'W': 'ᴡ', 'X': 'x', 'Y': 'ʏ', 'Z': 'ᴢ'
    };
    return text.split('').map(char => smallCapsMap[char] || char).join('');
};

const getCategoryEmoji = (category) => {
    const cat = category.toLowerCase();
    if (cat.includes('audio') || cat.includes('voice') || cat.includes('sound')) return '🎵';
    if (cat.includes('download') || cat.includes('dl')) return '📥';
    if (cat.includes('group') || cat.includes('gc')) return '👥';
    if (cat.includes('owner') || cat.includes('admin')) return '👑';
    if (cat.includes('anime')) return '✨';
    if (cat.includes('logo') || cat.includes('img') || cat.includes('image')) return '🖼️';
    if (cat.includes('converter') || cat.includes('tools')) return '🛠️';
    if (cat.includes('fun') || cat.includes('game')) return '🎮';
    if (cat.includes('search') || cat.includes('find')) return '🔍';
    return '⚡';
};

const formatCategory = (category, cmds, prefix = '.') => {
    const validCmds = cmds.filter(cmd => cmd.pattern && cmd.pattern.trim() !== '');
    if (validCmds.length === 0) return '';

    const emoji = getCategoryEmoji(category);
    const formattedTitle = toSmallCaps(category.toUpperCase());

    let title = `\n╭┈───〔 ${emoji} *${formattedTitle}* 〕┈───⊷\n`;
    let body = validCmds.map(cmd => {
        const commandName = cmd.pattern || '';
        return `┋⋄ ➠ *${prefix}${commandName}*`;
    }).join('\n');
    let footer = `\n╰─────────────────────⊷`;
    return `${title}${body}${footer}`;
};

const isValidImageUrl = (url) => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
        return false;
    }
    return url.startsWith('http://') || url.startsWith('https://');
};

cmd({
    pattern: "menu",
    alias: ["m", "help", "allmenu","fullmenu"],
    use: '.menu',
    desc: "Show all bot commands",
    category: "main",
    react: "⚡",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply, userConfig }) => {
    try {
        await conn.sendPresenceUpdate('composing', from);

        let totalCommands = Object.keys(commands).length;

        const categories = [...new Set(Object.values(commands).map(c => c.category))].filter(cat =>
            cat && cat.trim() !== '' && cat !== 'undefined'
        );

        const categorized = {};
        categories.forEach(cat => {
            const categoryCommands = Object.values(commands).filter(c => c.category === cat);
            const validCommands = categoryCommands.filter(cmd => cmd.pattern && cmd.pattern.trim() !== '');
            if (validCommands.length > 0) {
                categorized[cat] = validCommands;
            }
        });

        const BOT_NAME = userConfig?.BOT_NAME || config.BOT_NAME || "Bot";
        const OWNER_NAME = userConfig?.OWNER_NAME || config.OWNER_NAME || "Owner";
        const PREFIX = userConfig?.PREFIX || config.PREFIX || ".";
        const MODE = userConfig?.MODE || config.MODE || "private";
        const VERSION = userConfig?.VERSION || config.VERSION || "1.0.0";
        const DESCRIPTION = userConfig?.DESCRIPTION || config.DESCRIPTION || "";
        
        const NEWSLETTER_JID = userConfig?.NEWSLETTER_JID || config.NEWSLETTER_JID || '120363412624902256@newsletter';
        const NEWSLETTER_NAME = userConfig?.NEWSLETTER_NAME || config.NEWSLETTER_NAME || BOT_NAME;

        let menuSections = '';
        for (const [category, cmds] of Object.entries(categorized)) {
            if (cmds && cmds.length > 0) {
                const section = formatCategory(category, cmds, PREFIX);
                if (section !== '') {
                    menuSections += section;
                }
            }
        }

        let dec = `╭┈───〔 🌟 ${BOT_NAME.toUpperCase()} 🌟 〕┈───⊷
┋⋄ ➠ 𝗢𝗪𝗡𝗘𝗥: ${OWNER_NAME}
┋⋄ ➠ 𝗣𝗥𝗘𝗙𝗜𝗫: ${PREFIX}
┋⋄ ➠ 𝗨𝗣𝗧𝗜𝗠𝗘: ${runtime(process.uptime())}
┋⋄ ➠ 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦: ${totalCommands}
┋⋄ ➠ 𝗠𝗢𝗗𝗘: ${MODE}
┋⋄ ➠ 𝗩𝗘𝗥𝗦𝗜𝗢𝗡: ${VERSION}
╰─────────────────────⊷
${menuSections}

> ${DESCRIPTION || ''}`;

        const defaultMenuImage = 'https://files.catbox.moe/9ykuur.jpg';
        let imageToUse = defaultMenuImage;

        if (isValidImageUrl(userConfig?.BOT_IMAGE)) {
            try {
                await axios.head(userConfig.BOT_IMAGE, { timeout: 3000 });
                imageToUse = userConfig.BOT_IMAGE;
            } catch (urlError) {
                imageToUse = defaultMenuImage;
            }
        }

        const newsletterContext = {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: NEWSLETTER_JID,
                newsletterName: NEWSLETTER_NAME,
                serverMessageId: 143
            }
        };

        try {
            await conn.sendMessage(from, {
                image: { url: imageToUse },
                caption: dec,
                contextInfo: newsletterContext
            }, { quoted: mek });
        } catch (e) {
            await conn.sendMessage(from, { image: { url: imageToUse }, caption: dec }, { quoted: mek });
        }

        // آڈیو والا حصہ جو اب ایک ہی سونگ کو بالکل ٹھیک پلے کرے گا
        try {
            const audioPath = getRandomAudio();
            if (audioPath) {
                await conn.sendMessage(from, {
                    audio: { url: audioPath },
                    mimetype: 'audio/mp4',
                    ptt: true
                }, { quoted: mek });
            } else {
                console.log('No mp3 found in data/menu-voice');
            }
        } catch (audioError) {
            console.log('Audio send error:', audioError);
        }

    } catch (e) {
        console.log(e);
        reply(`Error: ${e}`);
    }
});
