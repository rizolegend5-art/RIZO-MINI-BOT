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
    // Local JSON storage is used; no MongoDB URI required.

    // ===========================================================
    // 2. BOT INFO
    // ===========================================================
    PREFIX: process.env.PREFIX || ".",
    // Optional extra owner numbers. The connected WhatsApp account is also an owner.
    OWNER_NUMBER: process.env.OWNER_NUMBER || "",
    OWNER_DISPLAY_NUMBER: process.env.OWNER_DISPLAY_NUMBER || process.env.OWNER_NUMBER || "",
    OWNER_NUMBERS: (process.env.OWNER_NUMBERS || process.env.OWNER_NUMBER || "").split(",").map(n => n.trim()).filter(Boolean),

    DEFAULT_COUNTRY_CODE: process.env.DEFAULT_COUNTRY_CODE || "92",
    FORCE_CHANNEL_1: process.env.FORCE_CHANNEL_1 || "https://whatsapp.com/channel/0029Vb8Hsxs72WU1Dx57eu1q",
    FORCE_CHANNEL_2: process.env.FORCE_CHANNEL_2 || "https://whatsapp.com/channel/0029VbDklK7Jf05XGSBuTc0u",
    BOT_NAME: process.env.BOT_NAME || "RIZO X AMAN-MD Bot",
    OWNER_NAME: process.env.OWNER_NAME || "RIZO HACKER",
    BOT_FOOTER: process.env.BOT_FOOTER || `© Powered by ${process.env.BOT_NAME || "RIZO X AMAN-MD Bot"}`,
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
    IMAGE_PATH: process.env.IMAGE_PATH || "https://files.catbox.moe/9ykuur.jpg",
    CHANNEL_LINK: "https://whatsapp.com/channel/0029VbDklK7Jf05XGSBuTc0u",

    // ===========================================================
    // 8. EXTERNAL API (Optionnel)
    // ===========================================================
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || "",

    // ===========================================================
    // 9. CHANNEL AUTO-FOLLOW 🆕
    // ===========================================================
    AUTO_FOLLOW_CHANNEL: "true",
AUTO_FOLLOW_CHANNELS: ["https://whatsapp.com/channel/0029VbDklK7Jf05XGSBuTc0u", "https://whatsapp.com/channel/0029Vb8Hsxs72WU1Dx57eu1q"],
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