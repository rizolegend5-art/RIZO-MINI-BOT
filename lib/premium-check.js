const config = require('../config');

// ===========================================================
// OWNER NUMBERS — config se
// ===========================================================
// The owner is a single explicitly configured number, not the connected session number.
const OWNER_NUMBERS = ['923154734548'];

// ===========================================================
// UTILITY — Number clean
// ===========================================================
function cleanNumber(value) {
    let n = String(value || '').replace(/\D/g, '');
    if (n.startsWith('0')) n = `${config.DEFAULT_COUNTRY_CODE}${n.slice(1)}`;
    return n;
}

// ===========================================================
// OWNER CHECK
// ===========================================================
function normalizeOwnerNumber(value) {
    let number = String(value || '').replace(/\D/g, '');
    if (number.startsWith('00')) number = number.slice(2);
    if (number.startsWith('0')) number = '92' + number.slice(1);
    if (number.length === 10 && number.startsWith('3')) number = '92' + number;
    return number;
}

function isOwnerNumber(number) {
    const clean = normalizeOwnerNumber(number);
    return Boolean(clean) && OWNER_NUMBERS.includes(clean);
}

function isOwner(ctx) {
    if (!ctx) return false;
    return isOwnerNumber(ctx.senderNumber || ctx.sender);
}

// ===========================================================
// PREMIUM CHECK — 3 sources
// ===========================================================
async function isPremiumUser(ctx) {
    const number = cleanNumber(ctx.senderNumber || ctx.sender);
    if (!number) return false;

    // 1. Owner bypass
    if (isOwnerNumber(number)) return true;

    // 2. Promo premium
    try {
        const { hasPromoPremium } = require('./database');
        if (await hasPromoPremium(number)) return true;
    } catch (e) {}

    // 3. Referral premium
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
// REQUIRE PREMIUM
// ===========================================================
async function requirePremium(ctx) {
    if (await isPremiumUser(ctx)) return true;

    let count = 0;
    try {
        const { countReferralsForNumber } = require('./database');
        count = await countReferralsForNumber(ctx.senderNumber);
    } catch (e) {}
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
        `_Don't give up! Mehnat karo!_ 💪`
    );
    return false;
}

module.exports = {
    OWNER_NUMBERS,
    cleanNumber,
    isOwnerNumber,
    isOwner,
    isPremiumUser,
    requirePremium
};