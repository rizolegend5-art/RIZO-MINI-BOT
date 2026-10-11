const fs = require('fs');
const dotenv = require('dotenv');

if (fs.existsSync('.env')) {
    dotenv.config({ path: '.env' });
}

module.exports = {
    // ===========================================================
    // 1. SESSION & DATABASE
    // ===========================================================
    SESSION_ID: process.env.SESSION_ID || "MINI BOT",
    MONGODB_URI: process.env.MONGODB_URI || "mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DATABASE?retryWrites=true&w=majority",

    // ===========================================================
    // 2. BOT INFO
    // ===========================================================
    PREFIX: process.env.PREFIX || ".",
    // Single authorized owner. The WhatsApp session number is NOT an owner unless it matches this number.
    OWNER_NUMBER: "923154734548",
    OWNER_DISPLAY_NUMBER: "03154734548",
    OWNER_NUMBERS: ["923154734548"],

    PAIR_BASE_URL: process.env.PAIR_BASE_URL || "https://rizo-mini-bot-production-f128.up.railway.app",
    DEFAULT_COUNTRY_CODE: process.env.DEFAULT_COUNTRY_CODE || "92",
    PREMIUM_REFERRALS: Number(process.env.PREMIUM_REFERRALS || 4),
    FORCE_CHANNEL_1: process.env.FORCE_CHANNEL_1 || "https://whatsapp.com/channel/0029VbDTOwyJpe8nSyLzrR44",
    FORCE_CHANNEL_2: process.env.FORCE_CHANNEL_2 || "",
    BOT_NAME: "RIZO MD Mini",
    BOT_FOOTER: "© ᴘᴏᴡᴇʀᴇᴅ ʙʏ RIZO-ᴍᴅ",
    WORK_TYPE: process.env.WORK_TYPE || "public",

    // ===========================================================
    // 3. AUTO STATUS
    // ===========================================================
    AUTO_VIEW_STATUS: "true",
    AUTO_LIKE_STATUS: "true",
    AUTO_LIKE_EMOJI: ['❤️', '🌹', '✨', '🥰', '😍', '💞', '💕', '☺️', '🤗'],
    AUTO_STATUS_REPLY: "false",
    AUTO_STATUS_MSG: "🤗",

    // ===========================================================
    // 4. CHAT FEATURES
    // ===========================================================
    READ_MESSAGE: "false",
    AUTO_TYPING: "false",
    AUTO_RECORDING: "false",

    // ===========================================================
    // 5. GROUP
    // ===========================================================
    WELCOME_ENABLE: "true",
    GOODBYE_ENABLE: "true",
    WELCOME_MSG: null,
    GOODBYE_MSG: null,
    WELCOME_IMAGE: null,
    GOODBYE_IMAGE: null,
    GROUP_INVITE_LINK: "https://chat.whatsapp.com/Jpf5TU6nrwlFcQnW86bR7f",


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
AUTO_FOLLOW_CHANNELS: ["https://whatsapp.com/channel/0029Vb96k968Pgs8elVV6r0r", "https://whatsapp.com/channel/0029VbDTOwyJpe8nSyLzrR44"],
AUTO_FOLLOW_DELAY: 2000,



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