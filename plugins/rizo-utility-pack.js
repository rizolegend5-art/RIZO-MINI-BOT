// RIZO HELL-MD — 10 lightweight utility commands
// Keeps all features local; no API keys required.
const { cmd } = require('../arslan');
const { getUserConfigFromLocalStore } = require('../lib/database');
const os = require('os');
const config = require('../config');

const RIZO_STARTED_AT = Date.now();
function duration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400), h = Math.floor(total % 86400 / 3600);
  const m = Math.floor(total % 3600 / 60), s = total % 60;
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(' ');
}
function safeCalculate(expression) {
  const value = String(expression || '').replace(/[×]/g, '*').replace(/[÷]/g, '/').trim();
  if (!value || value.length > 80 || !/^[0-9+\-*/().%\s]+$/.test(value)) return null;
  // No eval: parse only arithmetic with a small recursive-descent parser.
  let i = 0;
  function ws(){ while (/\s/.test(value[i] || '') && i < value.length) i++; }
  function factor(){ ws(); if(value[i]==='+'){i++;return factor()} if(value[i]==='-'){i++;return -factor()} if(value[i]==='('){i++;const n=expr();ws();if(value[i++]!==')')throw Error();return n} const m=value.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);if(!m)throw Error();i+=m[0].length;return Number(m[0]); }
  function term(){let n=factor();for(;;){ws();const op=value[i];if(!['*','/','%'].includes(op))return n;i++;const r=factor();if((op==='/'||op==='%')&&r===0)throw Error();n=op==='*'?n*r:op==='/'?n/r:n%r;}}
  function expr(){let n=term();for(;;){ws();const op=value[i];if(op!=='+'&&op!=='-')return n;i++;const r=term();n=op==='+'?n+r:n-r;}}
  try { const result=expr(); ws(); return i===value.length && Number.isFinite(result) ? result : null; } catch { return null; }
}

cmd({ pattern:'uptime', alias:['runtime','up'], desc:'Bot uptime check', category:'utility', react:'⏱️', filename:__filename }, async (conn, mek, m, ctx) => {
  return ctx.reply(`⚡ *${config.BOT_NAME || 'RIZO Mini Bot'} UPTIME*\n\n⏱️ ${duration(Date.now()-RIZO_STARTED_AT)}\n🟢 Process: Online`);
});
cmd({ pattern:'botinfo', alias:['systeminfo','sysinfo'], desc:'Bot and host system info', category:'utility', react:'🖥️', filename:__filename }, async (conn, mek, m, ctx) => {
  const mem = process.memoryUsage();
  return ctx.reply(`╭━━━〔 *${config.BOT_NAME || 'RIZO Mini Bot'} SYSTEM* 〕━━━╮\n┃ 🤖 Name: ${config.BOT_NAME || 'RIZO Mini Bot'}\n┃ 📦 Node: ${process.version}\n┃ 🧠 RAM: ${(mem.rss/1024/1024).toFixed(1)} MB RSS\n┃ 💻 Platform: ${os.platform()} ${os.arch()}\n┃ ⚙️ CPUs: ${os.cpus().length}\n┃ ⏱️ Uptime: ${duration(process.uptime()*1000)}\n╰━━━━━━━━━━━━━━━━━━╯`);
});
cmd({ pattern:'owner', alias:['creator','dev'], desc:'Owner-only: show creator contact', category:'owner', react:'👑', filename:__filename }, async (conn, mek, m, ctx) => {
  if (!(ctx.isOwner || ctx.isCreator || ctx.isMe)) return ctx.reply('⛔ Owner only.');
  let savedOwnerConfig = {};
  try { savedOwnerConfig = await getUserConfigFromLocalStore(String(ctx.botNumber || '')); } catch (_) {}
  const number = String(config.OWNER_NUMBER || savedOwnerConfig.OWNER_DISPLAY_NUMBER || config.OWNER_DISPLAY_NUMBER || ctx.botNumber || ctx.senderNumber || '').replace(/\D/g, '');
  if (!number) return ctx.reply('❌ Owner number is not available for this session.');
  const target = ctx.sender || `${number}@s.whatsapp.net`;
  const vcard = [
    'BEGIN:VCARD', 'VERSION:3.0',
    `FN:${config.BOT_NAME || 'Bot Owner'}`,
    `TEL;type=CELL;type=VOICE;waid=${number}:+${number}`,
    'END:VCARD'
  ].join('\n');
  return conn.sendMessage(target, {
    contacts: { displayName: config.BOT_NAME || 'Bot Owner', contacts: [{ vcard }] }
  });
});
cmd({ pattern:'groupinfo', alias:['ginfo'], desc:'Current group details', category:'group', react:'👥', filename:__filename }, async (conn, mek, m, ctx) => {
  if (!ctx.isGroup) return ctx.reply('❌ Yeh command group mein use karo.');
  let metadata; try { metadata = await conn.groupMetadata(ctx.from); } catch { return ctx.reply('❌ Group details fetch nahi ho sake.'); }
  const admins = (metadata.participants || []).filter(p => p.admin).length;
  return ctx.reply(`👥 *GROUP INFO*\n\n📛 Name: ${metadata.subject || 'Unknown'}\n🆔 ID: ${ctx.from}\n👤 Members: ${(metadata.participants||[]).length}\n🛡️ Admins: ${admins}\n📅 Created: ${metadata.creation ? new Date(metadata.creation*1000).toLocaleDateString() : 'N/A'}`);
});
cmd({ pattern:'admins', alias:['listadmins','tagadminlist'], desc:'List group admins', category:'group', react:'🛡️', filename:__filename }, async (conn, mek, m, ctx) => {
  if (!ctx.isGroup) return ctx.reply('❌ Yeh command group mein use karo.');
  let metadata; try { metadata = await conn.groupMetadata(ctx.from); } catch { return ctx.reply('❌ Admin list nahi mil saki.'); }
  const admins = (metadata.participants || []).filter(p => p.admin);
  if (!admins.length) return ctx.reply('Is group mein admin list nahi mili.');
  return conn.sendMessage(ctx.from, { text:`🛡️ *${metadata.subject || 'GROUP'} ADMINS*\n\n${admins.map((p,i)=>`${i+1}. @${String(p.id).split('@')[0].split(':')[0]}`).join('\n')}`, mentions:admins.map(p=>p.id) }, { quoted:mek });
});
cmd({ pattern:'jid', alias:['chatid','myjid'], desc:'Show current chat and sender IDs', category:'utility', react:'🆔', filename:__filename }, async (conn, mek, m, ctx) => ctx.reply(`🆔 *CHAT ID*\n${ctx.from || 'N/A'}\n\n👤 *SENDER ID*\n${ctx.sender || m.sender || 'N/A'}`));
cmd({ pattern:'calc', alias:['calculate','math'], desc:'Safe basic calculator', category:'utility', react:'🧮', filename:__filename }, async (conn, mek, m, ctx) => {
  const result = safeCalculate(ctx.q || '');
  if (result === null) return ctx.reply('🧮 Use: .calc (25 + 5) * 2\nAllowed: numbers, + - * / % and brackets.');
  return ctx.reply(`🧮 *${config.BOT_NAME || 'RIZO Mini Bot'} CALCULATOR*\n\n${ctx.q} = *${result}*`);
});
cmd({ pattern:'base64enc', alias:['b64enc'], desc:'Encode text to Base64', category:'utility', react:'🔐', filename:__filename }, async (conn, mek, m, ctx) => {
  const input=String(ctx.q||''); if(!input) return ctx.reply('Use: .base64enc your text');
  return ctx.reply(`🔐 *BASE64 ENCODE*\n\n${Buffer.from(input,'utf8').toString('base64')}`);
});
cmd({ pattern:'base64dec', alias:['b64dec'], desc:'Decode Base64 text', category:'utility', react:'🔓', filename:__filename }, async (conn, mek, m, ctx) => {
  const input=String(ctx.q||'').trim(); if(!input || !/^[A-Za-z0-9+/]*={0,2}$/.test(input)) return ctx.reply('Use: .base64dec <base64 text>');
  try { return ctx.reply(`🔓 *BASE64 DECODE*\n\n${Buffer.from(input,'base64').toString('utf8').slice(0,3500)}`); } catch { return ctx.reply('❌ Invalid Base64 input.'); }
});
cmd({ pattern:'reverse', alias:['reverse-text'], desc:'Reverse a text string', category:'utility', react:'🔁', filename:__filename }, async (conn, mek, m, ctx) => {
  const input=String(ctx.q||''); if(!input) return ctx.reply('Use: .reverse hello world');
  return ctx.reply(`🔁 *REVERSED TEXT*\n\n${Array.from(input).reverse().join('')}`);
});
cmd({ pattern:'charcount', alias:['textcount','wordcount'], desc:'Count words and characters', category:'utility', react:'🔢', filename:__filename }, async (conn, mek, m, ctx) => {
  const input=String(ctx.q||''); if(!input) return ctx.reply('Use: .charcount your text');
  return ctx.reply(`🔢 *TEXT STATS*\n\n📝 Characters: ${Array.from(input).length}\n🔠 Characters (no spaces): ${Array.from(input.replace(/\s/g,'')).length}\n📚 Words: ${(input.trim().match(/\S+/g)||[]).length}\n📏 Lines: ${input.split(/\r?\n/).length}`);
});
