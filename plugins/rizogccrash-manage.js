// plugins/rizogccrash-manage.js
const { cmd } = require('../arslan');
const guard = require('../lib/rizogccrash_guard');

cmd({
    pattern: 'rgcc-stats',
    alias: ['rgccstats'],
    desc: 'Show RIZOGCCRASH stats',
    category: 'owner',
    react: '📊',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { reply, isCreator }) => {
    if (!isCreator) return reply('🔒 Owner only.');
    const s = guard.getStats();
    return reply(
`📊 *RGCC STATS*

✅ Total groups : \`${s.total}\`
📅 Today        : \`${s.todayCount}/${s.dailyLimit}\`
🕒 Last attack  : \`${s.lastAttack}\``
    );
});

cmd({
    pattern: 'rgcc-add',
    alias: ['rgccprotect'],
    desc: 'Protect group from attacks',
    category: 'owner',
    react: '🛡',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { args, reply, isCreator }) => {
    if (!isCreator) return reply('🔒 Owner only.');
    const link = args[0];
    if (!link) return reply('❌ Usage: `.rgcc-add <grouplink>`');
    const m2 = String(link).match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/);
    if (!m2) return reply('❌ Invalid link.');
    let jid;
    try {
        const md = await conn.groupGetInviteInfo(m2[1]);
        jid = md.id;
    } catch (e) { return reply(`❌ ${e.message}`); }
    const l = guard.loadProtected();
    if (l.includes(jid)) return reply('⚠️ Already protected.');
    l.push(jid);
    guard.saveProtected(l);
    return reply(`🛡 Protected: \`${jid}\``);
});

cmd({
    pattern: 'rgcc-list',
    alias: ['rgcclist'],
    desc: 'Show protected groups',
    category: 'owner',
    react: '📋',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { reply, isCreator }) => {
    if (!isCreator) return reply('🔒 Owner only.');
    const l = guard.loadProtected();
    if (!l.length) return reply('📭 None protected.');
    return reply(`🛡 *PROTECTED* (${l.length})\n\n${l.map((j, i) => `${i + 1}. \`${j}\``).join('\n')}`);
});

cmd({
    pattern: 'rgcc-history',
    alias: ['rgcchist'],
    desc: 'Show last 10 attacks',
    category: 'owner',
    react: '📜',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { reply, isCreator }) => {
    if (!isCreator) return reply('🔒 Owner only.');
    const s = guard.loadState();
    const last = s.history.slice(-10).reverse();
    if (!last.length) return reply('📭 No history.');
    return reply(
`📜 *LAST 10 RGCC*\n\n${last.map((h, i) =>
    `${i + 1}. \`${h.target}\` — ${h.status}\n   _${new Date(h.ts).toLocaleString()}_`
).join('\n\n')}`
    );
});