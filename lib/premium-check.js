const config = require('../config');

// ===========================================================
// 🎯 OWNER NUMBERS — config se ya default
// ===========================================================
const OWNER_NUMBERS = Array.isArray(config.OWNER_NUMBERS) && config.OWNER_NUMBERS.length
    ? config.OWNER_NUMBERS
    : [
        '923154734548',
        '3154734548'
    ];

// ===========================================================
// 🎯 Utility — number clean karo
// ===========================================================
function cleanNumber(value) {
    let n = String(value || '').replace(/\D/g, '');
    if (n.startsWith('0')) n = `${config.DEFAULT_COUNTRY_CODE}${n.slice(1)}`;
    return n;
}

// ===========================================================
// 🎯 Owner check — kya ye number owner ka hai
// ===========================================================
function isOwnerNumber(number) {
    const clean = cleanNumber(number);
    if (!clean) return false;

    return OWNER_NUMBERS.some(o => {
        const oClean = String(o).replace(/\D/g, '').replace(/^0/, '');
        return clean === oClean ||
               clean === '92' + oClean ||
               clean === oClean.replace(/^92/, '');
    });
}

// ===========================================================
// 🎯 Owner check — context se
// ===========================================================
function isOwner(ctx) {
    if (!ctx) return false;
    return isOwnerNumber(ctx.senderNumber || ctx.sender);
}

// ===========================================================
// 🎯 Premium check — 3 sources:
//   1. Owner bypass
//   2. Promo code premium
//   3. Referral-based premium
// ===========================================================
async function isPremiumUser(ctx) {
    const number = cleanNumber(ctx.senderNumber || ctx.sender);
    if (!number) return false;

    // 1️⃣ Owner bypass
    if (isOwnerNumber(number)) return true;

    // 2️⃣ Promo premium
    try {
        const { hasPromoPremium } = require('./database');
        if (await hasPromoPremium(number)) return true;
    } catch (e) {
        // MongoDB down — skip
    }

    // 3️⃣ Referral premium
    try {
        const { countReferralsForNumber } = require('./database');
        const count = await countReferralsForNumber(number);
        const threshold = Math.max(1, Number(config.PREMIUM_REFERRALS) || 4);
        return count >= threshold;
    } catch (e) {
        return false;
    }
}

// ===========================================================
// 🎯 Require premium — command ke andar use karo
// ===========================================================
async function requirePremium(ctx) {
    if (await isPremiumUser(ctx)) return true;

    let count = 0;
    try {
        const { countReferralsForNumber } = require('./database');
        count = await countReferralsForNumber(ctx.senderNumber);
    } catch (e) {
        // ignore
    }
    const threshold = Math.max(1, Number(config.PREMIUM_REFERRALS) || 4);

    await ctx.reply(
        `🔒 *Premium command*\n\n` +
        `Aapke *${count}/${threshold}* verified referrals hain.\n\n` +
        `💎 *Premium unlock karne ke 2 tarike:*\n\n` +
        `1️⃣ *Referral Link:*\n` +
        `   • Apna link lo: *${config.PREFIX}myref*\n` +
        `   • ${threshold} log connect karenge → Premium FREE ✅\n\n` +
        `2️⃣ *Promo Code:*\n` +
        `   • Owner se code maango\n` +
        `   • Use karo: *${config.PREFIX}redeem <code>*\n\n` +
        `_Don\'t give up! Mehnat karo!_ 💪`
    );
    return false;
}

// ===========================================================
// 🎯 Export sab kuch
// ===========================================================
module.exports = {
    OWNER_NUMBERS,
    cleanNumber,
    isOwnerNumber,
    isOwner,
    isPremiumUser,
    requirePremium
};