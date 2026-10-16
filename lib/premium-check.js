const config = require('../config');

// ===========================================================
// CONFIGURED OWNER NUMBERS — the paired session owner is passed in the context.
// ===========================================================
const OWNER_NUMBERS = [...new Set([...(Array.isArray(config.OWNER_NUMBERS) ? config.OWNER_NUMBERS : []), config.OWNER_NUMBER, ...(process.env.OWNER_NUMBERS || '').split(',')].map(normalizeOwnerNumber).filter(Boolean))];

// ===========================================================
// UTILITY — Number clean
// ===========================================================
function cleanNumber(value) {
    let n = String(value || '').replace(/\D/g, '');
    if (n.startsWith('00')) n = n.slice(2);
    // Correct a country code pasted together with a local leading zero.
    const cc = String(config.DEFAULT_COUNTRY_CODE || '92');
    if (n.startsWith(cc + '0') && n.length === cc.length + 11) n = cc + n.slice(cc.length + 1);
    if (n.startsWith('0')) n = `${cc}${n.slice(1)}`;
    return n;
}

// ===========================================================
// OWNER CHECK
// ===========================================================
function normalizeOwnerNumber(value) {
    let number = String(value || '').replace(/\D/g, '');
    if (number.startsWith('00')) number = number.slice(2);
    // Correct a country code pasted together with a local leading zero.
    if (number.startsWith('920') && number.length === 13) number = '92' + number.slice(3);
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
    if (ctx.isOwner || ctx.isCreator || ctx.isMe) return true;
    return isOwnerNumber(ctx.senderNumber || ctx.sender);
}

// ===========================================================
// PREMIUM CHECK — connected/configured owner or active promo
// ===========================================================
async function isPremiumUser(ctx) {
    if (isOwner(ctx)) return true;
    const number = cleanNumber(ctx.senderNumber || ctx.sender);
    if (!number) return false;

    try {
        const { hasPromoPremium } = require('./database');
        if (await hasPromoPremium(number)) return true;
    } catch (e) {}

    return false;
}

// ===========================================================
// REQUIRE PREMIUM
// ===========================================================
async function requirePremium(ctx) {
    if (await isPremiumUser(ctx)) return true;

    await ctx.reply(
        `🔒 *Premium command*\n\n` +
        `Owner se promo code maangein, phir \`${config.PREFIX}redeem <code>\` use karein.`
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