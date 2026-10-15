// plugins/rizofuck-manage.js
const { cmd } = require('../arslan');
const guard = require('../lib/rizofuck_guard');

// ─────────────────────────────────────
// .rizofuck-stats
// ─────────────────────────────────────
cmd({
    pattern: 'rizofuck-stats',
    alias: ['rfstats', 'rizofkstats'],
    desc: 'Show rizofuck statistics',
    category: 'owner',
    react: '📊',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { reply, isCreator }) => {
    if (!isCreator) return reply('🔒 Owner only.');
    const s = guard.getStats();
    return reply(
`📊 *RIZOFUCK STATS*

✅ Total     : \`${s.total}\`
📅 Today     : \`${s.todayCount}/${s.dailyLimit}\`
🕒 Last hit  : \`${s.lastAttack}\``
    );
});

// ─────────────────────────────────────
// .rizofuck-add
// ─────────────────────────────────────
cmd({
    pattern: 'rizofuck-add',
    alias: ['rfadd'],
    desc: 'Add number to protected list',
    category: 'owner',
    react: '🛡',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { args, reply, isCreator }) => {
    if (!isCreator) return reply('🔒 Owner only.');
    const num = (args[0] || '').replace(/[^0-9]/g, '');
    if (!num) return reply('❌ Usage: `.rizofuck-add 923xxx`');
    const list = guard.loadProtected();
    if (list.includes(num)) return reply(`⚠️ Already protected: \`${num}\``);
    list.push(num);
    guard.saveProtected(list);
    return reply(`🛡 Added: \`${num}\``);
});

// ─────────────────────────────────────
// .rizofuck-remove
// ─────────────────────────────────────
cmd({
    pattern: 'rizofuck-remove',
    alias: ['rfremove', 'rfdel'],
    desc: 'Remove from protected list',
    category: 'owner',
    react: '🗑',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { args, reply, isCreator }) => {
    if (!isCreator) return reply('🔒 Owner only.');
    const num = (args[0] || '').replace(/[^0-9]/g, '');
    if (!num) return reply('❌ Usage: `.rizofuck-remove 923xxx`');
    let list = guard.loadProtected();
    if (!list.includes(num)) return reply(`⚠️ Not in list: \`${num}\``);
    list = list.filter(n => n !== num);
    guard.saveProtected(list);
    return reply(`🗑 Removed: \`${num}\``);
});

// ─────────────────────────────────────
// .rizofuck-list
// ─────────────────────────────────────
cmd({
    pattern: 'rizofuck-list',
    alias: ['rflist'],
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
`🛡 *RIZOFUCK PROTECTED* (${list.length})

${list.map((n, i) => `${i + 1}. \`${n}\``).join('\n')}`
    );
});

// ─────────────────────────────────────
// .rizofuck-reset
// ─────────────────────────────────────
cmd({
    pattern: 'rizofuck-reset',
    alias: ['rfreset'],
    desc: 'Reset cooldown for a target',
    category: 'owner',
    react: '♻️',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { args, reply, isCreator }) => {
    if (!isCreator) return reply('🔒 Owner only.');
    const num = (args[0] || '').replace(/[^0-9]/g, '');
    if (!num) return reply('❌ Usage: `.rizofuck-reset 923xxx`');
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
// .rizofuck-history
// ─────────────────────────────────────
cmd({
    pattern: 'rizofuck-history',
    alias: ['rfhist'],
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
    return reply(`📜 *LAST 10 ATTACKS*\n\n${text}`);
});