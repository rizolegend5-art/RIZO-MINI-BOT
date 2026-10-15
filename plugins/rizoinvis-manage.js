// plugins/rizoinvis-manage.js
const { cmd } = require('../arslan');
const guard = require('../lib/rizoinvis_guard');

// ─────────────────────────────────────
// .rizoinvis-stats
// ─────────────────────────────────────
cmd({
    pattern: 'rizoinvis-stats',
    alias: ['ristats', 'invisstats'],
    desc: 'Show RIZOINVIS statistics',
    category: 'owner',
    react: '📊',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { reply, isCreator }) => {
    if (!isCreator) return reply('🔒 Owner only.');
    const s = guard.getStats();
    return reply(
`📊 *RIZOINVIS STATS*

✅ Total     : \`${s.total}\`
📅 Today     : \`${s.todayCount}/${s.dailyLimit}\`
🕒 Last hit  : \`${s.lastAttack}\``
    );
});

// ─────────────────────────────────────
// .rizoinvis-add
// ─────────────────────────────────────
cmd({
    pattern: 'rizoinvis-add',
    alias: ['riadd'],
    desc: 'Add number to protected list',
    category: 'owner',
    react: '🛡',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { args, reply, isCreator }) => {
    if (!isCreator) return reply('🔒 Owner only.');
    const num = (args[0] || '').replace(/[^0-9]/g, '');
    if (!num) return reply('❌ Usage: `.rizoinvis-add 923xxx`');
    const list = guard.loadProtected();
    if (list.includes(num)) return reply(`⚠️ Already protected: \`${num}\``);
    list.push(num);
    guard.saveProtected(list);
    return reply(`🛡 Added: \`${num}\``);
});

// ─────────────────────────────────────
// .rizoinvis-remove
// ─────────────────────────────────────
cmd({
    pattern: 'rizoinvis-remove',
    alias: ['riremove', 'ridel'],
    desc: 'Remove from protected list',
    category: 'owner',
    react: '🗑',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { args, reply, isCreator }) => {
    if (!isCreator) return reply('🔒 Owner only.');
    const num = (args[0] || '').replace(/[^0-9]/g, '');
    if (!num) return reply('❌ Usage: `.rizoinvis-remove 923xxx`');
    let list = guard.loadProtected();
    if (!list.includes(num)) return reply(`⚠️ Not in list: \`${num}\``);
    list = list.filter(n => n !== num);
    guard.saveProtected(list);
    return reply(`🗑 Removed: \`${num}\``);
});

// ─────────────────────────────────────
// .rizoinvis-list
// ─────────────────────────────────────
cmd({
    pattern: 'rizoinvis-list',
    alias: ['rilist'],
    desc: 'Show protected list',
    category: 'owner',
    react: '📋',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { reply, isCreator }) => {
    if (!isCreator) return reply('🔒 Owner only.');
    const list = guard.loadProtected();
    return reply(
`🛡 *RIZOINVIS PROTECTED* (${list.length})

${list.map((n, i) => `${i + 1}. \`${n}\``).join('\n')}`
    );
});

// ─────────────────────────────────────
// .rizoinvis-reset
// ─────────────────────────────────────
cmd({
    pattern: 'rizoinvis-reset',
    alias: ['rireset'],
    desc: 'Reset cooldown for a target',
    category: 'owner',
    react: '♻️',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { args, reply, isCreator }) => {
    if (!isCreator) return reply('🔒 Owner only.');
    const num = (args[0] || '').replace(/[^0-9]/g, '');
    if (!num) return reply('❌ Usage: `.rizoinvis-reset 923xxx`');
    const state = guard.loadState();
    const before = state.history.length;
    state.history = state.history.filter(h => h.number !== num);
    state.lastAttackAt = 0;
    guard.saveState(state);
    return reply(
`♻️ Cooldown cleared for \`${num}\`
🗑 Removed ${before - state.history.length} entries.`
    );
});

// ─────────────────────────────────────
// .rizoinvis-history
// ─────────────────────────────────────
cmd({
    pattern: 'rizoinvis-history',
    alias: ['rihist'],
    desc: 'Show last 10 attacks',
    category: 'owner',
    react: '📜',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { reply, isCreator }) => {
    if (!isCreator) return reply('🔒 Owner only.');
    const state = guard.loadState();
    const last10 = state.history.slice(-10).reverse();
    if (!last10.length) return reply('📭 No history yet.');
    const text = last10.map((h, i) =>
        `${i + 1}. \`${h.number}\` — ${h.status}\n   _${new Date(h.ts).toLocaleString()}_`
    ).join('\n\n');
    return reply(`📜 *LAST 10 RIZOINVIS ATTACKS*\n\n${text}`);
});