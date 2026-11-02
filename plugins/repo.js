const config = require('../config')
const { cmd, commands } = require('../command');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { runtime } = require('../lib/functions');

// Fancy Small Caps Converter
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

const isValidImageUrl = (url) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return false;
    return url.startsWith('http://') || url.startsWith('https://');
};

cmd({
    pattern: "repo",
    alias: ["sc", "script", "pair", "website"],
    use: '.repo',
    desc: "Get bot pairing website link",
    category: "main",
    react: "⚡",
    filename: __filename
},
async (conn, mek, m, { from, reply, userConfig }) => {
    try {
        await conn.sendPresenceUpdate('composing', from);

        // Fetch dynamic bot settings
        const BOT_NAME = userConfig?.BOT_NAME || config.BOT_NAME || "𝐑ᴀᴢᴀ-𝐒ᴍᴅ";
        const OWNER_NAME = userConfig?.OWNER_NAME || config.OWNER_NAME || "OWNER";
        const VERSION = userConfig?.VERSION || config.VERSION || "1.0.0";
        
        // Pairing website URL
        const PAIRING_SITE = userConfig?.PAIRING_SITE || config.PAIRING_SITE || "https://raza-smd.free.je";

        const NEWSLETTER_JID = userConfig?.NEWSLETTER_JID || config.NEWSLETTER_JID || '120363428371539684@newsletter';
        const NEWSLETTER_NAME = userConfig?.NEWSLETTER_NAME || config.NEWSLETTER_NAME || BOT_NAME;

        // Cleaned Text (Prefix and Mode Removed)
        let repoText = `
╭┈───〔*${toSmallCaps(BOT_NAME.toUpperCase())}*〕┈───⊷

┌───❮ 📊 *sʏsᴛᴇᴍ ɪɴғᴏ* ❯───
│
├─► 🤖 *ʙᴏᴛ:* ${BOT_NAME}
├─► 👑 *ᴏᴡɴᴇʀ:* ${OWNER_NAME}
├─► 🏷️ *ᴠᴇʀsɪᴏɴ:* ${VERSION}
├─► ⏱️ *ᴜᴘᴛɪᴍᴇ:* ${runtime(process.uptime())}
│
└───❮ 🌐 *ᴘᴀɪʀɪɴɢ ᴡᴇBsɪᴛᴇ* ❯───
│ 🚀 *ɢᴇɴᴇʀᴀᴛᴇ ʏᴏᴜʀ sᴇssɪᴏɴ ᴄᴏᴅᴇ:*
│ » ${PAIRING_SITE}
└───────────────────────────
> ✨ *Click the link below to connect your bot!*
`.trim();

        // Image Selection
        const defaultRepoImage = 'https://i.ibb.co/d4pZGXRx/f5be0b55b39f.jpg';
        let imageToUse = defaultRepoImage;

        if (isValidImageUrl(userConfig?.BOT_IMAGE)) {
            try {
                await axios.head(userConfig.BOT_IMAGE, { timeout: 3000 });
                imageToUse = userConfig.BOT_IMAGE;
            } catch (err) {
                imageToUse = defaultRepoImage;
            }
        }

        // Context info only for Newsletter (No externalAdReply preview card above image)
        const contextInfo = {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: NEWSLETTER_JID,
                newsletterName: NEWSLETTER_NAME,
                serverMessageId: 143
            }
        };

        // Send Message with Image
        try {
            await conn.sendMessage(from, {
                image: { url: imageToUse },
                caption: repoText,
                contextInfo: contextInfo
            }, { quoted: mek });
        } catch (e) {
            await conn.sendMessage(from, { image: { url: imageToUse }, caption: repoText }, { quoted: mek });
        }

    } catch (e) {
        console.log("Repo Command Error:", e);
        reply(`❌ Error loading pairing website: ${e.message || e}`);
    }
});