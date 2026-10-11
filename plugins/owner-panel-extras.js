const { cmd } = require('../arslan');
const { isOwner, cleanNumber } = require('../lib/premium-check');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Referral, ReferralCode, PromoPremium } = require('../lib/database');

const ownerOnly = (ctx) => isOwner(ctx);
const deny = (ctx) => ctx.reply('⛔ Owner only — configured main owner number required.');

cmd({ pattern: 'ownerhelp', alias: ['ownercommands', 'ohhelp'], desc: 'Owner: list owner panel commands', category: 'owner', react: '👑', filename: __filename }, async (conn, mek, m, ctx) => {
  if (!ownerOnly(ctx)) return deny(ctx);
  return ctx.reply([
    '👑 *RIZO HELL-MD — OWNER COMMANDS*', '',
    '*Dashboard & health*', '• .ownerhub — dashboard', '• .bothealth — runtime health', '• .pluginscan — plugin file scan', '• .usagestats — command/category stats', '',
    '*Control*', '• .botpause / .botresume', '• .maintenance on/off', '• .botnotice <text|clear>', '• .setprefix !', '• .restart', '',
    '*Referral & Premium*', '• .refcheck <number>', '• .refgrant <number> <days>', '• .refrevoke <number>', '• .refadd <referrer> <new-user>', '• .refremove <new-user>', '• .refreset <number> CONFIRM', '• .refleaderboard', '• .premiumlookup <number>', '',
    '*Messaging*', '• .sendto <number> <message>', '• .broadcast2 <message> (groups)', '• .forwardall (reply to a message)', '',
    '⚠️ Use broadcast tools only for appropriate chats and avoid unsolicited bulk messages.'
  ].join('\n'));
});

cmd({ pattern: 'bothealth', alias: ['healthcheck', 'rizohealth'], desc: 'Owner: detailed runtime health', category: 'owner', react: '🩺', filename: __filename }, async (conn, mek, m, ctx) => {
  if (!ownerOnly(ctx)) return deny(ctx);
  const mem = process.memoryUsage();
  const seconds = Math.floor(process.uptime());
  const pluginsDir = path.join(__dirname);
  let pluginCount = 0;
  try { pluginCount = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js')).length; } catch {}
  const sockets = global.activeSockets instanceof Map ? global.activeSockets : new Map();
  const live = [...sockets.values()].filter(s => s && s.user).length;
  const dbState = (() => { try { return require('mongoose').connection.readyState; } catch { return -1; } })();
  const dbLabel = ({ 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' })[dbState] || 'unknown';
  return ctx.reply([
    '🩺 *RIZO BOT HEALTH*', '',
    `• Node.js: ${process.version}`, `• Uptime: ${Math.floor(seconds / 86400)}d ${Math.floor(seconds % 86400 / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`,
    `• Process RAM: ${(mem.rss / 1048576).toFixed(1)} MB`, `• Heap used: ${(mem.heapUsed / 1048576).toFixed(1)} MB`,
    `• Plugins: ${pluginCount}`, `• Active sockets: ${live}`, `• MongoDB: ${dbLabel}`,
    `• Pause flag: ${global.botPaused ? 'ON' : 'OFF'}`, `• Maintenance: ${global.maintenance ? 'ON' : 'OFF'}`
  ].join('\n'));
});

cmd({ pattern: 'pluginscan', alias: ['plugincheck'], desc: 'Owner: list plugin files and sizes', category: 'owner', react: '🧩', filename: __filename }, async (conn, mek, m, ctx) => {
  if (!ownerOnly(ctx)) return deny(ctx);
  try {
    const dir = __dirname;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
    const totalBytes = files.reduce((sum, f) => sum + fs.statSync(path.join(dir, f)).size, 0);
    const unusual = files.filter(f => f.endsWith('.js.js') || f.startsWith('.'));
    return ctx.reply([
      '🧩 *PLUGIN FILE SCAN*', '',
      `• Plugin JS files: ${files.length}`, `• Total source size: ${(totalBytes / 1024).toFixed(1)} KB`,
      `• Unusual filenames: ${unusual.length ? unusual.join(', ') : 'none detected'}`, '',
      '*First 35 files:*', ...files.slice(0, 35).map(f => `• ${f}`),
      files.length > 35 ? `…and ${files.length - 35} more.` : ''
    ].filter(Boolean).join('\n'));
  } catch (e) { return ctx.reply(`❌ Plugin scan failed: ${e.message}`); }
});

cmd({ pattern: 'premiumlookup', alias: ['premcheck'], desc: 'Owner: check premium and referral totals', category: 'owner', react: '💎', use: '.premiumlookup <number>', filename: __filename }, async (conn, mek, m, ctx) => {
  if (!ownerOnly(ctx)) return deny(ctx);
  const number = cleanNumber(ctx.q);
  if (!number || number.length < 10) return ctx.reply('Use: .premiumlookup 923XXXXXXXXX');
  try {
    const [refs, code, manual] = await Promise.all([
      Referral.countDocuments({ referrerNumber: number }),
      ReferralCode.findOne({ number }).select('code').lean(),
      PromoPremium.findOne({ number }).lean()
    ]);
    const activeManual = Boolean(manual && (!manual.expiresAt || new Date(manual.expiresAt) > new Date()));
    return ctx.reply([
      '💎 *PREMIUM USER LOOKUP*', '', `• Number: ${number}`, `• Referral code: ${code?.code || 'not generated'}`,
      `• Verified referrals recorded: ${refs}`, `• Manual premium: ${activeManual ? 'ACTIVE' : 'INACTIVE'}`,
      `• Expiry: ${manual?.expiresAt ? new Date(manual.expiresAt).toLocaleString() : 'N/A'}`
    ].join('\n'));
  } catch (e) { return ctx.reply(`❌ Premium lookup failed: ${e.message}`); }
});

cmd({ pattern: 'refleaderboard', alias: ['reftopadmin', 'topreferrers'], desc: 'Owner: referral leaderboard', category: 'owner', react: '🏆', filename: __filename }, async (conn, mek, m, ctx) => {
  if (!ownerOnly(ctx)) return deny(ctx);
  try {
    const rows = await Referral.aggregate([
      { $group: { _id: '$referrerNumber', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } }, { $limit: 10 }
    ]);
    if (!rows.length) return ctx.reply('🏆 Abhi referral records nahi hain.');
    return ctx.reply(['🏆 *TOP 10 REFERRERS*', '', ...rows.map((r, i) => `${i + 1}. +${r._id} — *${r.count}* verified referral${r.count === 1 ? '' : 's'}`)].join('\n'));
  } catch (e) { return ctx.reply(`❌ Leaderboard failed: ${e.message}`); }
});

console.log('[RIZO] Extra owner panel commands loaded');
