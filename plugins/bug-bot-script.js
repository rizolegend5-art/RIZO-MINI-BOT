const { cmd } = require('../arslan');
const config = require('../config');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { isPremiumUser, isOwner, cleanNumber } = require('../lib/premium-check');

const FIXED_SCRIPT_LINK = 'https://www.mediafire.com/file/2lo06u5tppwxqjv/Aliwbahirawagiveaway.zip/file';
const FIXED_FILE_NAME = 'BUG-BOT-SCRIPT.zip';

async function sendPremiumAd(ctx) {
    const threshold = Math.max(1, Number(config.PREMIUM_REFERRALS) || 4);
    let count = 0;
    try {
        const { countReferralsForNumber } = require('../lib/database');
        count = await countReferralsForNumber(ctx.senderNumber);
    } catch {}
    const remaining = Math.max(0, threshold - count);

    await ctx.reply(
        `🚀 *BHAI, YE HARD BUG BOT CHAHIYE?* 🔥\n\n` +
        `💎 Sirf *Premium users* ke liye!\n\n` +
        `📊 *Progress:* *${count}/${threshold}*\n` +
        `⏳ *${remaining}* aur chahiye\n\n` +
        `🔗 *2 tarike unlock ke:*\n` +
        `1️⃣ *${config.PREFIX}myref* — referral link\n` +
        `2️⃣ *${config.PREFIX}redeem <code>* — promo code\n\n` +
        `💪 Mehnat karo, ${threshold} referrals lao! 🚀`
    );
}

cmd({
    pattern: 'bugbotscript',
    alias: ['bugscript', 'hackbot', 'bugbot'],
    desc: 'Premium/Owner: Bug bot script',
    category: 'premium',
    react: '💥',
    use: '.bugbotscript',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!(await isPremiumUser(ctx))) return sendPremiumAd(ctx);

    await ctx.reply('💥 *BUG BOT SCRIPT*\n\n⏱️ Download shuru…\n📊 ~77.5 MB\n⏳ 30-60 second lag sakte hain.');

    try {
        const pageRes = await axios.get(FIXED_SCRIPT_LINK, {
            timeout: 30000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        let directUrl = null;
        let m1 = pageRes.data.match(/href="(https:\/\/download[^"]*mediafire\.com[^"]+)"/i);
        if (m1) directUrl = m1[1];
        if (!directUrl) {
            m1 = pageRes.data.match(/id="downloadButton"[^>]*href="([^"]+)"/i);
            if (m1) directUrl = m1[1];
        }
        if (!directUrl) {
            m1 = pageRes.data.match(/data-scrambled-url="([^"]+)"/i);
            if (m1) { try { directUrl = Buffer.from(m1[1], 'base64').toString('utf8'); } catch (_) {} }
        }
        if (!directUrl) throw new Error('Direct link nahi mila');

        const downloadDir = path.join(__dirname, '..', 'downloads');
        fs.ensureDirSync(downloadDir);
        const filePath = path.join(downloadDir, FIXED_FILE_NAME);

        const fileRes = await axios({
            method: 'GET', url: directUrl, responseType: 'stream',
            timeout: 600000,
            maxContentLength: 200 * 1024 * 1024,
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.mediafire.com/' }
        });

        const writer = fs.createWriteStream(filePath);
        fileRes.data.pipe(writer);
        await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });

        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        const buffer = fs.readFileSync(filePath);

        await conn.sendMessage(ctx.from, {
            document: buffer,
            fileName: FIXED_FILE_NAME,
            mimetype: 'application/zip',
            caption: `💥 *BUG BOT SCRIPT*\n\n✅ ${sizeMB} MB\n🔐 Premium\n\n⚠️ Share mat karo!`
        }, { quoted: mek });

        await fs.remove(filePath).catch(() => {});
    } catch (err) {
        console.error('bugbotscript error:', err.message);
        return ctx.reply('❌ Fail: ' + err.message);
    }
});