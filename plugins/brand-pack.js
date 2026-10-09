const { cmd } = require('../arslan');
const config = require('../config');
const fs = require('fs-extra');
const path = require('path');

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
    } catch {
        return false;
    }
}

// ===========================================================
// 1. SETPP — Bot ki display pic change (Premium + Owner)
// ===========================================================
cmd({
    pattern: 'setpp',
    alias: ['setdp', 'botpic', 'setprofile', 'setbotpp'],
    desc: 'Premium/Owner: Bot ki profile pic change karo',
    category: 'premium',
    react: '🖼️',
    use: '.setpp (image reply karke)',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!(await isPremiumOrOwner(ctx))) {
        return ctx.reply('🔒 Ye command sirf *Premium* aur *Owner* ke liye hai.\nPremium unlock: *.myref*');
    }

    const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imgMsg = quoted?.imageMessage || mek.message?.imageMessage;

    if (!imgMsg) {
        return ctx.reply('❌ Kisi image pe reply karo ya image ke saath *.setpp* likho.');
    }

    try {
        await ctx.reply('⏳ Bot ki profile pic update kar raha hun…');
        const filePath = await conn.downloadAndSaveMediaMessage(
            { msg: imgMsg, mtype: 'imageMessage' },
            `./tmp/botpp_${Date.now()}`
        );

        await conn.updateProfilePicture(conn.user.id, { url: filePath });
        await fs.remove(filePath).catch(() => {});

        return ctx.reply('✅ *Bot ki display pic update ho gayi!* 🔥');
    } catch (e) {
        console.error('setpp error:', e.message);
        return ctx.reply('❌ PP update fail: ' + e.message);
    }
});

// ===========================================================
// 2. REMOVEPP — Bot ki pic hatao (Premium + Owner)
// ===========================================================
cmd({
    pattern: 'removepp',
    alias: ['delpp', 'cleardp', 'removebotpp'],
    desc: 'Premium/Owner: Bot ki profile pic hatao',
    category: 'premium',
    react: '🗑️',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!(await isPremiumOrOwner(ctx))) {
        return ctx.reply('🔒 Ye command sirf *Premium* aur *Owner* ke liye hai.');
    }
    try {
        await conn.removeProfilePicture(conn.user.id);
        return ctx.reply('✅ *Bot ki PP remove ho gayi.*');
    } catch (e) {
        return ctx.reply('❌ ' + e.message);
    }
});

// ===========================================================
// 3. SETBOTNAME — Bot ka WhatsApp naam change (Premium + Owner)
// ===========================================================
cmd({
    pattern: 'setbotname',
    alias: ['botname', 'setwa', 'renamebot'],
    desc: 'Premium/Owner: Bot ka WhatsApp naam change karo',
    category: 'premium',
    react: '✏️',
    use: '.setbotname RIZO-MD V2',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!(await isPremiumOrOwner(ctx))) {
        return ctx.reply('🔒 Ye command sirf *Premium* aur *Owner* ke liye hai.');
    }

    const name = (ctx.q || '').trim();
    if (!name || name.length > 25) {
        return ctx.reply('❌ Naam 1-25 characters ka do.\nUse: *.setbotname <name>*');
    }

    try {
        await conn.updateProfileName(name);
        return ctx.reply(`✅ *Bot ka naam update ho gaya:* ${name}`);
    } catch (e) {
        return ctx.reply('❌ ' + e.message);
    }
});

// ===========================================================
// 4. SETSTATUS — Bot ka About/Status change (Premium + Owner)
// ===========================================================
cmd({
    pattern: 'setstatus',
    alias: ['botstatus', 'setabout'],
    desc: 'Premium/Owner: Bot ka about/status change karo',
    category: 'premium',
    react: '💬',
    use: '.setstatus Available 24/7',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!(await isPremiumOrOwner(ctx))) {
        return ctx.reply('🔒 Ye command sirf *Premium* aur *Owner* ke liye hai.');
    }

    const text = (ctx.q || '').trim();
    if (!text || text.length > 139) {
        return ctx.reply('❌ Status 1-139 characters ka do.');
    }

    try {
        await conn.updateProfileStatus(text);
        return ctx.reply(`✅ *Bot ka status update:* ${text}`);
    } catch (e) {
        return ctx.reply('❌ ' + e.message);
    }
});

// ===========================================================
// 5. BOTINFO — Bot ki poori info (sab ke liye)
// ===========================================================
cmd({
    pattern: 'botinfo',
    alias: ['aboutbot', 'mybot', 'botprofile'],
    desc: 'Bot ki poori info dekho',
    category: 'general',
    react: '🤖',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    let pp = '';
    try { pp = await conn.profilePictureUrl(conn.user.id, 'image'); } catch {}

    const [status] = await conn.fetchStatus(conn.user.id).catch(() => [{}]);

    const text = [
        '🤖 *RIZO-MD BOT INFO*',
        '',
        `📛 Name: *${config.BOT_NAME}*`,
        `👑 Owner: *${config.OWNER_DISPLAY_NUMBER || config.OWNER_NUMBER}*`,
        `🔧 Prefix: *${config.PREFIX}*`,
        `⚙️ Mode: *${config.WORK_TYPE || 'public'}*`,
        `📱 Bot number: *+${conn.user.id.split(':')[0]}*`,
        `💬 About: *${status?.status || 'N/A'}*`,
        `🖼️ PP: *${pp ? 'Available' : 'Hidden'}*`,
        '',
        `📢 Channel: ${config.CHANNEL_LINK}`,
        `© Powered by RIZO-MD`
    ].join('\n');

    if (pp) {
        await conn.sendMessage(ctx.from, { image: { url: pp }, caption: text }, { quoted: mek });
    } else {
        await ctx.reply(text);
    }
});

// ===========================================================
// 6. SETPPINFO — Ek saath DP + Name + Status change (Premium + Owner)
// ===========================================================
cmd({
    pattern: 'setall',
    alias: ['setbotall', 'botbrand'],
    desc: 'Premium/Owner: Bot ki DP + Name + Status ek saath set karo',
    category: 'premium',
    react: '⚡',
    use: '.setall Name | Status | (image reply)',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!(await isPremiumOrOwner(ctx))) {
        return ctx.reply('🔒 Ye command sirf *Premium* aur *Owner* ke liye hai.');
    }

    const parts = (ctx.q || '').split('|').map(x => x.trim());
    const name = parts[0] || '';
    const status = parts[1] || '';
    const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imgMsg = quoted?.imageMessage || mek.message?.imageMessage;

    if (!name && !status && !imgMsg) {
        return ctx.reply(
            '❌ Kuch bhi set karne ke liye do.\n\n' +
            '*Examples:*\n' +
            '• `.setall RIZO-MD V2 | Online 24/7 |` (image reply karke)\n' +
            '• `.setall NewName | New Status |`\n' +
            '• `.setall | |` (sirf image reply ke saath)'
        );
    }

    let results = [];
    await ctx.reply('⚡ Bot branding update kar raha hun…');

    // Profile Pic
    if (imgMsg) {
        try {
            const filePath = await conn.downloadAndSaveMediaMessage(
                { msg: imgMsg, mtype: 'imageMessage' },
                `./tmp/allpp_${Date.now()}`
            );
            await conn.updateProfilePicture(conn.user.id, { url: filePath });
            await fs.remove(filePath).catch(() => {});
            results.push('✅ DP updated');
        } catch (e) {
            results.push('❌ DP fail: ' + e.message);
        }
    }

    // Name
    if (name && name.length <= 25) {
        try {
            await conn.updateProfileName(name);
            results.push(`✅ Naam: ${name}`);
        } catch (e) {
            results.push('❌ Naam fail: ' + e.message);
        }
    }

    // Status
    if (status && status.length <= 139) {
        try {
            await conn.updateProfileStatus(status);
            results.push(`✅ Status: ${status}`);
        } catch (e) {
            results.push('❌ Status fail: ' + e.message);
        }
    }

    return ctx.reply(`⚡ *BRANDING UPDATE*\n\n${results.join('\n')}`);
});