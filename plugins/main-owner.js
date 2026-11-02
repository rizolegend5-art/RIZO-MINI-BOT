const { cmd } = require('../command');
const { getConfig, getFooter } = require('./display-config');

const FOOTER = getFooter();

cmd({
  pattern: "owner",
  alias: ["creator", "developer"],
  desc: "Get owner contact card",
  category: "main",
  react: "👑",
  filename: __filename
}, async (conn, mek, m, { from, userConfig }) => {
  try {
    const cfg = getConfig(userConfig);
    const OWNER_NUMBER = cfg.OWNER_NUMBER || '';
    const OWNER_NAME = cfg.OWNER_NAME || '';
    const TEAM_NAME = cfg.BOT_NAME || '';

    await conn.sendPresenceUpdate("composing", from);

    const vcard =
      'BEGIN:VCARD\n' +
      'VERSION:3.0\n' +
      `FN:${OWNER_NAME}\n` +
      `ORG:${TEAM_NAME};\n` +
      `TEL;type=CELL;type=VOICE;waid=${OWNER_NUMBER}:${'+' + OWNER_NUMBER}\n` +
      `NOTE:👤 *Owner Info*\n\n*Name:* ${OWNER_NAME}\n*Number:* +${OWNER_NUMBER}\n\n${FOOTER}\n` +
      'END:VCARD';

    await conn.sendMessage(from, {
      contacts: {
        displayName: OWNER_NAME,
        contacts: [{ vcard }]
      }
    }, { quoted: mek });

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (e) {
    console.error("Error sending contact:", e);
    await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
  }
});
