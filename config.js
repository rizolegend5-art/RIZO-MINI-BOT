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
    // Optional extra owner numbers. The connected WhatsApp account is also an owner.
    OWNER_NUMBER: process.env.OWNER_NUMBER || "03365904329",
    OWNER_DISPLAY_NUMBER: process.env.OWNER_DISPLAY_NUMBER || process.env.OWNER_NUMBER || "03365904329",
    OWNER_NUMBERS: (process.env.OWNER_NUMBERS || process.env.OWNER_NUMBER || "").split(",").map(n => n.trim()).filter(Boolean),

    DEFAULT_COUNTRY_CODE: process.env.DEFAULT_COUNTRY_CODE || "92",
    FORCE_CHANNEL_1: process.env.FORCE_CHANNEL_1 || "https://whatsapp.com/channel/0029VbE72MB2Jl87sS5pvR0g",
    FORCE_CHANNEL_2: process.env.FORCE_CHANNEL_2 || "https://whatsapp.com/channel/0029VbETxppAu3aU0cbGcm19",
    BOT_NAME: process.env.BOT_NAME || "RIZO-MD Bot",
    OWNER_NAME: process.env.OWNER_NAME || "RIZO HACKER",
    BOT_FOOTER: process.env.BOT_FOOTER || `© Powered by ${process.env.BOT_NAME || "RIZO-MD"}`,
    WORK_TYPE: process.env.WORK_TYPE || "public",

    // ===========================================================
    // 3. AUTO STATUS
    // ===========================================================
    AUTO_VIEW_STATUS: "false",
    AUTO_LIKE_STATUS: "false",
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
    GROUP_INVITE_LINK: "https://chat.whatsapp.com/JbAVaTMkohX36szvaf2sn4?s=cl&p=a&mlu=4&ilr=4&iam=2",


    // ===========================================================
    // 6. SÉCURITÉ & ANTI-CALL
    // ===========================================================
    ANTI_CALL: process.env.ANTI_CALL || "false",
    REJECT_MSG: process.env.REJECT_MSG || "*CALL LATER PLEASE ☺️🌹*",

    // ===========================================================
    // 7. IMAGES & LIENS
    // ===========================================================
    IMAGE_PATH: process.env.IMAGE_PATH || "https://files.catbox.moe/3tz8tt.jpg",
    CHANNEL_LINK: "https://whatsapp.com/channel/0029VbE72MB2Jl87sS5pvR0g",

    // ===========================================================
    UPDATE_CHANNEL_URL: "https://whatsapp.com/channel/0029VbE72MB2Jl87sS5pvR0g",
    // 8. EXTERNAL API (Optionnel)
    // ===========================================================
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || "",

    // ===========================================================
    // 9. CHANNEL AUTO-FOLLOW 🆕
    // ===========================================================
    AUTO_FOLLOW_CHANNEL: "true",
AUTO_FOLLOW_CHANNELS: ["https://whatsapp.com/channel/0029VbE72MB2Jl87sS5pvR0g", "https://whatsapp.com/channel/0029VbETxppAu3aU0cbGcm19"],
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