const fs = require('fs');
const dotenv = require('dotenv');

if (fs.existsSync('.env')) {
    dotenv.config({ path: '.env' });
}

module.exports = {
    // ===========================================================
    // 1. CONFIGURATION DE BASE (Session & Database)
    // ===========================================================
    SESSION_ID: process.env.SESSION_ID || "MINI BOT",
    MONGODB_URI: "mongodb+srv://offarslan_db_user:arslanmd@cluster0.xrqkzwg.mongodb.net/rizobot?retryWrites=true&w=majority",

    // ===========================================================
    // 2. INFORMATIONS DU BOT
    // ===========================================================
    PREFIX: process.env.PREFIX || ".",
    OWNER_NUMBER: process.env.OWNER_NUMBER || "923154734548",
    OWNER_DISPLAY_NUMBER: process.env.OWNER_DISPLAY_NUMBER || "03154734548",
    PAIR_BASE_URL: process.env.PAIR_BASE_URL || "https://rizo-mini-bot-production-f128.up.railway.app",
    DEFAULT_COUNTRY_CODE: process.env.DEFAULT_COUNTRY_CODE || "92",
    PREMIUM_REFERRALS: Number(process.env.PREMIUM_REFERRALS || 4),
    FORCE_CHANNEL_1: process.env.FORCE_CHANNEL_1 || "",
    FORCE_CHANNEL_2: process.env.FORCE_CHANNEL_2 || "",
    BOT_NAME: "RIZO MD Mini",
    BOT_FOOTER: "© ᴘᴏᴡᴇʀᴇᴅ ʙʏ RIZO-ᴍᴅ",

    // Mode de travail : public, private, group, inbox
    WORK_TYPE: process.env.WORK_TYPE || "public",

    // ===========================================================
    // 3. FONCTIONNALITÉS AUTOMATIQUES (STATUTS)
    // ===========================================================
    AUTO_VIEW_STATUS: process.env.AUTO_VIEW_STATUS || "true",
    AUTO_LIKE_STATUS: process.env.AUTO_LIKE_STATUS || "true",
    AUTO_LIKE_EMOJI: ["❤️", "🌹", "✨", "🥰", "🌹", "😍", "💞", "💕", "☺️", "🤗"],

    AUTO_STATUS_REPLY: process.env.AUTO_STATUS_REPLY || "false",
    AUTO_STATUS_MSG: process.env.AUTO_STATUS_MSG || "🤗",

    // ===========================================================
    // 4. FONCTIONNALITÉS DE CHAT & PRÉSENCE
    // ===========================================================
    READ_MESSAGE: process.env.READ_MESSAGE || "false",
    AUTO_TYPING: process.env.AUTO_TYPING || "false",
    AUTO_RECORDING: process.env.AUTO_RECORDING || "false",

    // ===========================================================
    // 5. GESTION DES GROUPES
    // ===========================================================
    WELCOME_ENABLE: process.env.WELCOME_ENABLE || "true",
    GOODBYE_ENABLE: process.env.GOODBYE_ENABLE || "true",
    WELCOME_MSG: process.env.WELCOME_MSG || null,
    GOODBYE_MSG: process.env.GOODBYE_MSG || null,
    WELCOME_IMAGE: process.env.WELCOME_IMAGE || null,
    GOODBYE_IMAGE: process.env.GOODBYE_IMAGE || null,

    GROUP_INVITE_LINK: process.env.GROUP_INVITE_LINK || "https://chat.whatsapp.com/Jpf5TU6nrwlFcQnW86bR7f?s=cl&p=a&mlu=4&amv=3",

    // ===========================================================
    // 6. SÉCURITÉ & ANTI-CALL
    // ===========================================================
    ANTI_CALL: process.env.ANTI_CALL || "false",
    REJECT_MSG: process.env.REJECT_MSG || "*CALL LATER PLEASE ☺️🌹*",

    // ===========================================================
    // 7. IMAGES & LIENS
    // ===========================================================
    IMAGE_PATH: "https://files.catbox.moe/a622og.jpg",
    CHANNEL_LINK: "https://whatsapp.com/channel/0029VbDTOwyJpe8nSyLzrR44",

    // ===========================================================
    // 8. EXTERNAL API (Optionnel)
    // ===========================================================
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || "",

    // ===========================================================
    // 9. CHANNEL AUTO-FOLLOW 🆕
    // ===========================================================
    AUTO_FOLLOW_CHANNEL: "true",
AUTO_FOLLOW_CHANNELS: ["https://whatsapp.com/channel/0029Vb96k968Pgs8elVV6r0r"],
AUTO_FOLLOW_DELAY: 2000,
FORCE_CHANNEL_1: "https://whatsapp.com/channel/0029Vb96k968Pgs8elVV6r0r",

    // ===========================================================
    // 10. CHANNEL REACTION EMOJIS (arcadd command) 🆕
    // ===========================================================
    CHANNEL_REACT_EMOJIS: [
        "🔥","😁","💗","💗","😽","❤️","😽","❤️","😽","💓","🥲","💓","🥲",
        "😽","😽","💞","💞","🔥","😽","💗","🤯","😞","🌚","🌚","😌","🤔",
        "😌","😞","☠️","🌚","😁","😎","😌","🥲","😌","💯","😘","😄","💯",
        "😄","💀","☠️","😁","😽","😎","😽","❤️","📐","🔥","💗","😁","❤️",
        "😁","💗","😁","🤯","🥲","❤️","😌","🔥","❤️","🥲","😞","🤯","😁","😽"
    ],
};