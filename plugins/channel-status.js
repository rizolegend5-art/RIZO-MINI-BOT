const { cmd } = require('../arslan');
const config = require('../config');
const axios = require('axios');

function cleanNumber(value) {
    let n = String(value || '').replace(/\D/g, '');
    if (n.startsWith('0')) n = `${config.DEFAULT_COUNTRY_CODE}${n.slice(1)}`;
    return n;
}

function isOwner(ctx) {
    return cleanNumber(ctx.senderNumber) === cleanNumber(config.OWNER_NUMBER);
}

async function isPremiumOrOwner(ctx) {
    if (isOwner(ctx)) return true;
    try {
        const { countReferralsForNumber } = require('../lib/database');
        const count = await countReferralsForNumber(ctx.senderNumber);
        return count >= Math.max(1, Number(config.PREMIUM_REFERRALS) || 4);
    } catch { return false; }
}

// ===========================================================
// 1. CHANNELSTATUS — Channel pe temporary status post karo
// ===========================================================
cmd({
    pattern: 'channelstatus',
    alias: ['chstatus', 'chstat', 'statusupdate'],
    desc: 'Premium/Owner: Channel pe 24hr temporary status post karo',
    category: 'premium',
    react: '📢',
    use: '.channelstatus <channel_jid> <text> (ya image reply)',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!(await isPremiumOrOwner(ctx))) {
        return ctx.reply('🔒 Ye command sirf *Premium* aur *Owner* ke liye hai.');
    }

    const parts = (ctx.q || '').split(' ');
    const channelJid = parts.shift();
    const text = parts.join(' ');

    if (!channelJid || (!text && !mek.message?.imageMessage)) {
        return ctx.reply(
            '📢 *Channel Status Post*\n\n' +
            'Use: `.channelstatus <channel_jid> <text>`\n' +
            'Ya: Image pe reply karke `.channelstatus <channel_jid>`\n\n' +
            'Example:\n' +
            '`.channelstatus 0029Vb...@newsletter New update!`'
        );
    }

    try {
        // Channel JID format check
        const jid = channelJid.endsWith('@newsletter') ? channelJid : `${channelJid}@newsletter`;

        // Image ya text status
        const imgMsg = mek.message?.imageMessage;
        if (imgMsg) {
            const filePath = await conn.downloadAndSaveMediaMessage(
                { msg: imgMsg, mtype: 'imageMessage' },
                `./tmp/chstat_${Date.now()}`
            );
            await conn.sendMessage(jid, {
                image: { url: filePath },
                caption: text || '📢 Channel Update'
            });
        } else {
            await conn.sendMessage(jid, { text });
        }

        return ctx.reply(`✅ Channel pe status post ho gaya!\n\n📌 ${jid}\n💬 ${text || '(image)'}`);
    } catch (e) {
        return ctx.reply('❌ Channel status post fail: ' + e.message);
    }
});

// ===========================================================
// 2. CHANNELSTATUSIMG — Image channel status
// ===========================================================
cmd({
    pattern: 'chstatimg',
    alias: ['chstatusimg', 'chstatpic'],
    desc: 'Premium/Owner: Channel pe image status post karo',
    category: 'premium',
    react: '🖼️',
    use: '.chstatimg <channel_jid> (image reply)',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!(await isPremiumOrOwner(ctx))) {
        return ctx.reply('🔒 Premium/Owner only.');
    }

    const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imgMsg = quoted?.imageMessage || mek.message?.imageMessage;
    if (!imgMsg) return ctx.reply('❌ Image pe reply karo.');

    const channelJid = (ctx.args[0] || '').trim();
    if (!channelJid) return ctx.reply('❌ Channel JID do.\nExample: `.chstatimg 0029Vb...@newsletter`');

    try {
        const jid = channelJid.endsWith('@newsletter') ? channelJid : `${channelJid}@newsletter`;
        const caption = (ctx.args.slice(1).join(' ') || '📢 Channel Update').trim();

        const filePath = await conn.downloadAndSaveMediaMessage(
            { msg: imgMsg, mtype: 'imageMessage' },
            `./tmp/chstatimg_${Date.now()}`
        );
        await conn.sendMessage(jid, { image: { url: filePath }, caption });
        return ctx.reply(`✅ Image status post ho gaya!\n📌 ${jid}`);
    } catch (e) {
        return ctx.reply('❌ ' + e.message);
    }
});

// ===========================================================
// 3. CHANNELSTATUSVID — Video channel status
// ===========================================================
cmd({
    pattern: 'chstatvid',
    alias: ['chstatusvideo', 'chstatvideo'],
    desc: 'Premium/Owner: Channel pe video status post karo',
    category: 'premium',
    react: '🎥',
    use: '.chstatvid <channel_jid> (video reply)',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!(await isPremiumOrOwner(ctx))) {
        return ctx.reply('🔒 Premium/Owner only.');
    }

    const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const vidMsg = quoted?.videoMessage || mek.message?.videoMessage;
    if (!vidMsg) return ctx.reply('❌ Video pe reply karo.');

    const channelJid = (ctx.args[0] || '').trim();
    if (!channelJid) return ctx.reply('❌ Channel JID do.');

    try {
        const jid = channelJid.endsWith('@newsletter') ? channelJid : `${channelJid}@newsletter`;
        const caption = (ctx.args.slice(1).join(' ') || '📢 Channel Update').trim();

        const filePath = await conn.downloadAndSaveMediaMessage(
            { msg: vidMsg, mtype: 'videoMessage' },
            `./tmp/chstatvid_${Date.now()}`
        );
        await conn.sendMessage(jid, { video: { url: filePath }, caption });
        return ctx.reply(`✅ Video status post ho gaya!\n📌 ${jid}`);
    } catch (e) {
        return ctx.reply('❌ ' + e.message);
    }
});

// ===========================================================
// 4. CHANNELSTATUSAUTO — Random Islamic/Motivational status
// ===========================================================
cmd({
    pattern: 'chstatauto',
    alias: ['autostatus', 'randomstatus'],
    desc: 'Premium/Owner: Random status channel pe post karo',
    category: 'premium',
    react: '🎲',
    use: '.chstatauto <channel_jid>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!(await isPremiumOrOwner(ctx))) {
        return ctx.reply('🔒 Premium/Owner only.');
    }

    const channelJid = (ctx.args[0] || '').trim();
    if (!channelJid) return ctx.reply('❌ Channel JID do.');

    const statuses = [
        '🤲 Ya Allah, make this day better than yesterday.',
        '🌙 "Verily, with hardship comes ease." — Quran 94:6',
        '📿 SubhanAllahi wa bihamdihi, SubhanAllahil Azeem.',
        '💫 The best among you are those who learn Quran and teach it.',
        '✨ Whoever fears Allah — He will make a way out for him.',
        '🌟 Jumma Mubarak! May Allah bless you with peace.',
        '🕌 Don\'t forget to read Surah Al-Kahf today.',
        '🕋 Indeed, prayer prohibits immorality and wrongdoing.'
    ];
    const pick = statuses[Math.floor(Math.random() * statuses.length)];

    try {
        const jid = channelJid.endsWith('@newsletter') ? channelJid : `${channelJid}@newsletter`;
        await conn.sendMessage(jid, { text: pick });
        return ctx.reply(`✅ Random status post ho gaya!\n📌 ${jid}\n💬 ${pick}`);
    } catch (e) {
        return ctx.reply('❌ ' + e.message);
    }
});

// ===========================================================
// 5. CHANNELINFO — Channel ki info aur status support check
// ===========================================================
cmd({
    pattern: 'channelinfo',
    alias: ['chinfo', 'chstatcheck'],
    desc: 'Channel ki info aur status feature check',
    category: 'general',
    react: '📊',
    use: '.channelinfo <channel_jid>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const channelJid = (ctx.args[0] || '').trim();
    if (!channelJid) return ctx.reply('❌ Channel JID do.\nExample: `.channelinfo 0029Vb...@newsletter`');

    try {
        const jid = channelJid.endsWith('@newsletter') ? channelJid : `${channelJid}@newsletter`;

        let metadata = null;
        if (typeof conn.newsletterMetadata === 'function') {
            metadata = await conn.newsletterMetadata('jid', jid).catch(() => null);
        }

        return ctx.reply([
            '📊 *CHANNEL INFO*',
            '',
            `🆔 JID: \`${jid}\``,
            `📛 Name: *${metadata?.name || 'N/A'}*`,
            `👥 Subscribers: *${metadata?.subscribers || 'N/A'}*`,
            `📝 Desc: *${(metadata?.description || 'N/A').slice(0, 100)}*`,
            '',
            '💡 *Channel Status* WhatsApp feature hai jo 24hr temporary updates allow karta hai.',
            '✅ Ye bot usse use karta hai `.channelstatus` command se.'
        ].join('\n'));
    } catch (e) {
        return ctx.reply('❌ Channel info fail: ' + e.message);
    }
});