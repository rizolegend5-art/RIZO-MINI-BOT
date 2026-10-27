// Owner-only live command installer for RIZO MINI V3.
// WARNING: JavaScript plugins run with the same permissions as the bot process.
// Only install code you trust. Never share owner access.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { cmd } = require('../arslan');

function textFromMessage(message) {
  if (!message || typeof message !== 'object') return '';
  for (const key of ['conversation', 'text']) {
    if (typeof message[key] === 'string') return message[key];
  }
  for (const key of ['extendedTextMessage', 'imageMessage', 'videoMessage', 'documentMessage']) {
    const part = message[key];
    if (part) {
      if (typeof part.text === 'string') return part.text;
      if (part.caption) return part.caption;
      if (part.message) return textFromMessage(part.message);
      if (part.contextInfo && part.contextInfo.quotedMessage) return textFromMessage(part.contextInfo.quotedMessage);
    }
  }
  for (const value of Object.values(message)) {
    if (value && typeof value === 'object') {
      const found = textFromMessage(value);
      if (found) return found;
    }
  }
  return '';
}

cmd({
  pattern: 'addcode',
  alias: ['liveadd', 'installcmd'],
  desc: 'Install and load an owner-provided JS plugin live',
  category: 'owner',
  filename: __filename,
}, async (conn, mek, m, ctx) => {
  const reply = ctx.reply || (t => conn.sendMessage(ctx.from || m.chat, { text: t }, { quoted: mek }));
  if (!ctx.isOwner) return reply('⛔ Owner only command.');

  const args = String(ctx.q || ctx.text || '').trim();
  const nameRaw = args.split(/\s+/)[0] || '';
  const codeInline = args.slice(nameRaw.length).trim();
  const quoted = mek && mek.message && mek.message.extendedTextMessage && mek.message.extendedTextMessage.contextInfo
    ? mek.message.extendedTextMessage.contextInfo.quotedMessage : null;
  const code = (codeInline || textFromMessage(quoted)).trim();
  if (!nameRaw || !code) {
    return reply('📌 Usage: reply to a message containing JavaScript, then send .addcode mycommand\nOr: .addcode mycommand <JavaScript code>\nPlugin must register commands with require("../arslan").cmd(...).');
  }
  const name = nameRaw.toLowerCase().replace(/\.js$/i, '').replace(/[^a-z0-9_-]/g, '').slice(0, 40);
  if (!name || ['addcode','allmenu','main','config','arslan'].includes(name)) return reply('❌ Invalid or reserved plugin name.');
  if (code.length > 20000) return reply('❌ Code limit is 20,000 characters.');
  const pluginsDir = path.join(__dirname);
  const target = path.join(pluginsDir, `live-${name}.js`);
  if (!target.startsWith(pluginsDir + path.sep)) return reply('❌ Invalid filename.');
  try {
    // Syntax validation only; code executes when required below.
    new vm.Script(code, { filename: `live-${name}.js` });
    fs.writeFileSync(target, code + '\n', { encoding: 'utf8', mode: 0o600 });
    const resolved = require.resolve(target);
    delete require.cache[resolved];
    try {
      require(resolved);
    } catch (loadErr) {
      delete require.cache[resolved];
      try { fs.unlinkSync(target); } catch (_) {}
      return reply(`❌ Plugin load failed; file rolled back.\n${String(loadErr.message || loadErr).slice(0, 700)}`);
    }
    return reply(`✅ Plugin loaded live: live-${name}.js\nCommands registered by this plugin should now work and appear in .menu if they have a category.\n⚠️ Only install trusted JavaScript; plugins have full bot-process permissions.`);
  } catch (err) {
    return reply(`❌ Could not install plugin: ${String(err.message || err).slice(0, 500)}`);
  }
});
