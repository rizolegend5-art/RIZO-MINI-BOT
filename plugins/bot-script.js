const { cmd } = require('../arslan');
const config = require('../config');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// 🆕 Universal premium system (owner bypass + promo + referral)
const { requirePremium } = require('../lib/premium-check');

// ===========================================================
// 🎯 FIXED LINK — Sirf yehi file milegi
// ===========================================================
const FIXED_SCRIPT_LINK = 'https://www.mediafire.com/file/tbx95wm576jjsdx/OLD-STUDIO-V2.zip/file';
const FIXED_FILE_NAME = 'RIZOMINIBOT-V2.zip';

// ===========================================================
// 📦 BOTSCRIPT — Fixed script download (Premium/Owner)
// ===========================================================
cmd({
    pattern: 'botscript',
    alias: ['script', 'getscript', 'dlscript', 'rizoscript'],
    desc: 'Premium/Owner: RIZOMINIBOT V2 script download',
    category: 'premium',
    react: '📦',
    use: '.botscript',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    // ✅ Universal premium check (owner bypass auto, promo auto)
    if (!(await requirePremium(ctx))) return;

    await ctx.reply(
        '📦 *RIZOMINIBOT V2 SCRIPT*\n\n' +
        '⏱️ Download shuru ho raha hai…\n' +
        '📊 Size: ~135 KB\n' +
        '⏳ 10-20 second lag sakte hain.'
    );

    try {
        // ==========================================
        // Step 1: MediaFire se direct link nikaalo
        // ==========================================
        const pageRes = await axios.get(FIXED_SCRIPT_LINK, {
            timeout: 20000,
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
            throw new Error('Direct link nahi mila. Script source check karo.');
        }

        // ==========================================
        // Step 2: File download karo
        // ==========================================
        const downloadDir = path.join(__dirname, '..', 'downloads');
        fs.ensureDirSync(downloadDir);

        const filePath = path.join(downloadDir, FIXED_FILE_NAME);

        const fileRes = await axios({
            method: 'GET',
            url: directUrl,
            responseType: 'stream',
            timeout: 300000,
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
        const sizeKB = (stats.size / 1024).toFixed(2);

        // ==========================================
        // Step 3: WhatsApp pe ZIP bhejo
        // ==========================================
        const buffer = fs.readFileSync(filePath);

        await conn.sendMessage(ctx.from, {
            document: buffer,
            fileName: FIXED_FILE_NAME,
            mimetype: 'application/zip',
            caption:
                `📦 *RIZOMINIBOT V2* 📦\n\n` +
                `✅ Script ready!\n` +
                `📊 Size: *${sizeKB} KB*\n\n` +
                `💡 Extract karke use karo.\n` +
                `🔒 Premium Script — Free nahi share karna.\n\n` +
                `> _Powered by ${config.BOT_NAME}_`
        }, { quoted: mek });

        // Cleanup
        await fs.remove(filePath).catch(() => {});

    } catch (err) {
        console.error('botscript error:', err.message);
        return ctx.reply(
            `❌ *Script download fail!*\n\n` +
            `Reason: ${err.message}\n\n` +
            `Please 2-3 minute baad dobara try karo.`
        );
    }
});