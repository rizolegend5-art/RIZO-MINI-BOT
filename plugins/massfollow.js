// plugins/massfollow.js
// RIZO HELL-MD — Mass channel follow (all connected accounts)

const { cmd } = require('../arslan');

// ═══════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════
const CONFIG = {
    DELAY_MS: 3000,             // har account ke beech delay
    JITTER_MS: 1000,            // random jitter
    MAX_ACCOUNTS: 500           // safety cap
};

function jitter(base) {
    return base + (Math.random() * 2 - 1) * base * 0.5;
}

function extractInviteCode(link) {
    const m = String(link).match(/whatsapp\.com\/channel\/([A-Za-z0-9]+)/);
    return m ? m[1] : null;
}

function getAllActiveSockets() {
    const list = [];
    const active = global.activeSockets;
    if (!active || typeof active.forEach !== 'function') return list;
    active.forEach((sock, number) => {
        if (sock && sock.user && sock.user.id) {
            list.push({ number, sock });
        }
    });
    return list;
}

// ═══════════════════════════════════════════
//  .massfollow — saare accounts se follow
// ═══════════════════════════════════════════
cmd({
    pattern: 'massfollow',
    alias: ['mf', 'allfollow', 'bulkfollow'],
    desc: 'Follow a channel from ALL connected accounts',
    category: 'general',
    react: '📡',
    use: '.massfollow <channel_link>',
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        const link = args[0];

        if (!link) {
            const sockets = getAllActiveSockets();
            return reply(
`📡 *MASS FOLLOW*

🔢 *Connected accounts:* \`${sockets.length}\`

📌 *Usage:* .massfollow <channel_link>

📖 *Example:*
.massfollow https://whatsapp.com/channel/0029Vb967lf3mFXy9U1g2641

💡 Saare connected accounts se follow karega`
            );
        }

        const inviteCode = extractInviteCode(link);
        if (!inviteCode) {
            return reply('❌ *Invalid channel link!*');
        }

        const sockets = getAllActiveSockets();
        if (!sockets.length) {
            return reply('❌ *Koi connected account nahi hai.*');
        }

        // Resolve channel JID using main socket
        let channelJid;
        try {
            const meta = await conn.newsletterMetadata('invite', inviteCode);
            channelJid = meta?.id || meta?.jid;
            if (!channelJid) throw new Error('JID not found');
        } catch (e) {
            return reply(`❌ *Channel resolve failed:* ${e.message}`);
        }

        await reply(
`📡 *MASS FOLLOW STARTED*
🔗 Channel : \`${inviteCode}\`
📛 Name    : *${meta?.name || 'Unknown'}*
👥 Accounts: \`${sockets.length}\`
⚡ Following...`
        );

        const limited = sockets.slice(0, CONFIG.MAX_ACCOUNTS);
        let success = 0;
        let failed = 0;
        const errors = [];

        for (let i = 0; i < limited.length; i++) {
            const { sock, number } = limited[i];

            try {
                if (typeof sock.newsletterFollow !== 'function') {
                    failed++;
                    errors.push(`${number.slice(0,4)}***: API missing`);
                    continue;
                }

                await sock.newsletterFollow(channelJid);
                success++;

                // progress update every 25%
                const pct = Math.floor(((i + 1) / limited.length) * 100);
                if (pct >= 25 && pct % 25 < 5) {
                    conn.sendMessage(from, {
                        text: `⏳ ${pct}% — ✅ ${success} ❌ ${failed}`
                    }).catch(() => {});
                }
            } catch (err) {
                failed++;
                errors.push(`${number.slice(0,4)}***: ${err.message.slice(0, 50)}`);
            }

            await new Promise(r => setTimeout(r, jitter(CONFIG.DELAY_MS)));
        }

        let report =
`✅ *MASS FOLLOW COMPLETE*

📡 Channel : \`${channelJid}\`
🔗 Invite  : \`${inviteCode}\`
📊 Total   : \`${limited.length}\`
✅ Success : \`${success}\`
❌ Failed  : \`${failed}\``;

        if (errors.length) {
            report += `\n\n❌ *First errors:*\n${errors.slice(0, 5).join('\n')}`;
        }

        return reply(report);

    } catch (err) {
        console.error('[massfollow] ERROR:', err.message);
        return reply(`❌ *Failed:* ${err.message}`);
    }
});

// ═══════════════════════════════════════════
//  .massunfollow — saare accounts se unfollow
// ═══════════════════════════════════════════
cmd({
    pattern: 'massunfollow',
    alias: ['muf', 'allunfollow', 'bulkunfollow'],
    desc: 'Unfollow a channel from ALL connected accounts',
    category: 'general',
    react: '🚫',
    use: '.massunfollow <channel_link>',
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        const link = args[0];
        if (!link) return reply('📌 *Usage:* .massunfollow <channel_link>');

        const inviteCode = extractInviteCode(link);
        if (!inviteCode) return reply('❌ *Invalid channel link!*');

        const sockets = getAllActiveSockets();
        if (!sockets.length) return reply('❌ *Koi connected account nahi.*');

        let channelJid;
        try {
            const meta = await conn.newsletterMetadata('invite', inviteCode);
            channelJid = meta?.id || meta?.jid;
            if (!channelJid) throw new Error('JID not found');
        } catch (e) {
            return reply(`❌ *Channel resolve failed:* ${e.message}`);
        }

        await reply(
`🚫 *MASS UNFOLLOW*
📡 Channel : \`${inviteCode}\`
👥 Accounts: \`${sockets.length}\`
⚡ Processing...`
        );

        const limited = sockets.slice(0, CONFIG.MAX_ACCOUNTS);
        let success = 0, failed = 0;

        for (let i = 0; i < limited.length; i++) {
            const { sock } = limited[i];
            try {
                if (typeof sock.newsletterUnfollow !== 'function') {
                    failed++; continue;
                }
                await sock.newsletterUnfollow(channelJid);
                success++;

                const pct = Math.floor(((i + 1) / limited.length) * 100);
                if (pct >= 25 && pct % 25 < 5) {
                    conn.sendMessage(from, { text: `⏳ ${pct}% — 🚫 ${success} ❌ ${failed}` }).catch(() => {});
                }
            } catch (_) { failed++; }

            await new Promise(r => setTimeout(r, jitter(CONFIG.DELAY_MS)));
        }

        return reply(
`✅ *MASS UNFOLLOW COMPLETE*
📊 Total   : \`${limited.length}\`
🚫 Success : \`${success}\`
❌ Failed  : \`${failed}\``
        );

    } catch (err) {
        return reply(`❌ ${err.message}`);
    }
});

// ═══════════════════════════════════════════
//  .followstats — account count check
// ═══════════════════════════════════════════
cmd({
    pattern: 'followstats',
    alias: ['fstats', 'mystats'],
    desc: 'Show connected accounts for mass follow',
    category: 'general',
    react: '📊',
    filename: __filename
}, async (conn, mek, m, { reply }) => {
    const sockets = getAllActiveSockets();
    const numbers = sockets.map(s => s.number);
    return reply(
`📊 *MASS FOLLOW STATS*

🔢 Active accounts: \`${sockets.length}\`
📈 Max per channel: \`${sockets.length}\`

${numbers.length ? numbers.map((n, i) => `${i+1}. \`${n.slice(0,4)}***${n.slice(-2)}\``).join('\n') : '_(none connected)_'}`
    );
});

console.log('[RIZO HELL-MD] Mass follow commands loaded');