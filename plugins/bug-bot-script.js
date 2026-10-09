const { cmd } = require('../arslan');
const config = require('../config');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// 🆕 Universal premium system (owner bypass + promo + referral)
const {
    isPremiumUser,
    isOwner,
    cleanNumber
} = require('../lib/premium-check');

// ===========================================================
// 🎯 FIXED LINK — Aliwbahirawagiveaway script
// ===========================================================
const FIXED_SCRIPT_LINK = 'https://www.mediafire.com/file/2lo06u5tppwxqjv/Aliwbahirawagiveaway.zip/file';
const FIXED_FILE_NAME = 'BUG-BOT-SCRIPT.zip';

// ===========================================================
// 💬 Non-premium ke liye CONVINCING MESSAGE
// ===========================================================
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
        `💎 Ye script **sirf Premium users** ke liye hai!\n\n` +
        `📊 *Aapki Progress:*\n` +
        `├ 👥 Verified referrals: *${count}/${threshold}*\n` +
        `└ ⏳ *${remaining}* aur chahiye premium unlock ke liye\n\n` +
        `🔗 *Premium unlock karne ka tarika (2 options):*\n\n` +
        `1️⃣ *Referral Link:*\n` +
        `   • Apna link lo: *${config.PREFIX}myref*\n` +
        `   • Doston ko share karo\n` +
        `   • *${threshold}* log connect karenge → **Premium FREE** ✅\n\n` +
        `2️⃣ *Promo Code:*\n` +
        `   • Owner se promo code maango\n` +
        `   • Use karo: *${config.PREFIX}redeem <code>*\n\n` +
        `🎁 *Premium me kya milega:*\n` +
        `├ 💥 Hard bug bot script\n` +
        `├ 🔥 Saare premium commands\n` +
        `├ ⚡ Fast download server\n` +
        `└ 🎯 Unlimited access\n\n` +
        `💬 *Bhai, mehnat karo, ${threshold} referrals lao — aur ye script tumhari!* 🚀\n\n` +
        `👉 *${config.PREFIX}myref* — apna link lo abhi!`
    );
}

// ===========================================================
// 📦 BUGBOTSCRIPT — Premium/Owner only
// ===========================================================
cmd({
    pattern: 'bugbotscript',
    alias: ['bugscript', 'hackbot', 'bugbot', 'getbugbot'],
    desc: 'Premium/Owner: Bug bot script download',
    category: 'premium',
    react: '💥',
    use: '.bugbotscript',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    // ✅ Universal premium check (owner bypass auto, promo auto)
    if (!(await isPremiumUser(ctx))) {
        return sendPremiumAd(ctx);
    }

    await ctx.reply(
        `💥 *BUG BOT SCRIPT* 💥\n\n` +
        `⏱️ Download shuru ho raha hai…\n` +
        `📊 Size: ~77.5 MB\n` +
        `⏳ 30-60 second lag sakte hain (bada file hai).\n\n` +
        `🔒 Ye **Premium Script** hai — kisi ko share mat karna!`
    );

    try {
        // ==========================================
        // Step 1: MediaFire se direct link nikaalo
        // ==========================================
        const pageRes = await axios.get(FIXED_SCRIPT_LINK, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        let directUrl = null;

        let m = pageRes.data.match(/href="(https:\/\/download[^"]*mediafire\.com[^"]+)"/i);
        if (m) directUrl = m[1];

        if (!directUrl) {
            m = pageRes.data.match(/id="downloadButton"[^>]*href="([^"]+)"/i);
            if (m) directUrl = m[1];
        }

        if (!directUrl) {
            m = pageRes.data.match(/data-scrambled-url="([^"]+)"/i);
            if (m) {
                try { directUrl = Buffer.from(m[1], 'base64').toString('utf8'); } catch (_) {}
            }
        }

        if (!directUrl) {
            throw new Error('Direct link nahi mila. Source check karo.');
        }

        // ==========================================
        // Step 2: File download karo (77MB — streaming)
        // ==========================================
        const downloadDir = path.join(__dirname, '..', 'downloads');
        fs.ensureDirSync(downloadDir);

        const filePath = path.join(downloadDir, FIXED_FILE_NAME);

        const fileRes = await axios({
            method: 'GET',
            url: directUrl,
            responseType: 'stream',
            timeout: 600000,
            maxContentLength: 200 * 1024 * 1024,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.mediafire.com/'
            }
        });

        const writer = fs.createWriteStream(filePath);
        fileRes.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        // ==========================================
        // Step 3: WhatsApp pe ZIP bhejo
        // ==========================================
        const buffer = fs.readFileSync(filePath);

        await conn.sendMessage(ctx.from, {
            document: buffer,
            fileName: FIXED_FILE_NAME,
            mimetype: 'application/zip',
            caption:
                `💥 *BUG BOT SCRIPT* 💥\n\n` +
                `✅ Script ready!\n` +
                `📊 Size: *${sizeMB} MB*\n` +
                `🔐 Access: *Premium*\n\n` +
                `⚠️ *Ye premium script hai — kisi ko share mat karna!*\n` +
                `🔒 Sirf aapke liye authorized hai.\n\n` +
                `> _Powered by ${config.BOT_NAME}_`
        }, { quoted: mek });

        // Cleanup
        await fs.remove(filePath).catch(() => {});

    } catch (err) {
        console.error('bugbotscript error:', err.message);
        return ctx.reply(
            `❌ *Script download fail!*\n\n` +
            `Reason: ${err.message}\n\n` +
            `💡 File 77MB ki hai — kuch time lag sakta hai.\n` +
            `2-3 minute baad dobara try karo.`
        );
    }
});