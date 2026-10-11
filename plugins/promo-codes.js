const { cmd } = require('../arslan');
const config = require('../config');
const {
    createPromoCode, redeemPromoCode, listPromoCodes, deletePromoCode,
    grantPromoPremium, hasPromoPremium
} = require('../lib/database');
const { isOwner, isPremiumUser, cleanNumber } = require('../lib/premium-check');

// PROMO CREATE
cmd({
    pattern: 'promo',
    alias: ['createpromo', 'promocode', 'genpromo'],
    desc: 'Owner: referral-credit promo code banao (default 100 users, 24h)',
    category: 'owner',
    react: '🎟️',
    use: '.promo <code> [maxUses=100] [expiresHours=24] [referralCredits=1]',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!isOwner(ctx)) return ctx.reply('⛔ Ye command sirf *Owner* ke liye hai.');

    const args = (ctx.q || '').trim().split(/\s+/);
    const code = args[0];
    const maxUses = args[1] === undefined ? 100 : Number(args[1]);
    const expiresHours = args[2] === undefined ? 24 : Number(args[2]);
    const rewardCredits = args[3] === undefined ? 1 : Number(args[3]);

    if (!code) {
        return ctx.reply(
            `🎟️ *PROMO CODE GENERATOR*\n\n` +
            `Use: \`${config.PREFIX}promo <code> [maxUses=100] [expiresHours=24] [referralCredits=1]\`\n\n` +
            `Example: \`${config.PREFIX}promo RIZOPRO 100 24 3\`\n` +
            `= 100 users, 24 hours, 3 referral credits per redeemer.`
        );
    }

    try {
        const promo = await createPromoCode(code, maxUses, cleanNumber(ctx.senderNumber), expiresHours, rewardCredits);
        return ctx.reply(
            `🎟️ *PROMO CODE CREATED!*\n\n` +
            `🔑 Code: *${promo.code}*\n` +
            `👥 Max Users: *${promo.maxUses}*\n` +
            `🎁 Referral credits per user: *${promo.rewardCredits || 1}*\n` +
            `📅 Expires: *${promo.expiresAt ? promo.expiresAt.toLocaleString() : 'Never'}*\n\n` +
            `Users: \`${config.PREFIX}redeem ${promo.code}\``
        );
    } catch (e) { return ctx.reply('❌ ' + e.message); }
});

// REDEEM
cmd({
    pattern: 'redeem',
    alias: ['promo-redeem', 'usecode', 'claimcode'],
    desc: 'Promo code se referral credits hasil karo',
    category: 'general',
    react: '🎁',
    use: '.redeem <code>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const code = (ctx.q || '').trim().toUpperCase();
    if (!code) return ctx.reply(`🎁 Use: \`${config.PREFIX}redeem <code>\``);

    const number = cleanNumber(ctx.senderNumber);

    if (isOwner(ctx)) return ctx.reply('👑 Aap *Owner* hain — already full access!');

    try {
        const result = await redeemPromoCode(code, number);

        if (!result.success) {
            const messages = {
                invalid_code: '❌ Ye promo code *valid nahi* hai.',
                invalid_user: '❌ Aapka number identify nahi ho saka.',
                try_again: '⚠️ Redeem conflict hua, dobara try karo.',
                inactive: '❌ Ye promo code *band* hai.',
                expired: '⌛ Ye promo code *expire* ho gaya.',
                already_used_by_you: '⚠️ Aap ye code *already use kar chuke* ho!',
                limit_reached: '🚫 Ye code *already full* ho gaya!'
            };
            return ctx.reply(messages[result.reason] || '❌ Code use nahi hua.');
        }

        const { countReferralsForNumber } = require('../lib/database');
        const totalCredits = await countReferralsForNumber(number);
        return ctx.reply(
            `✅ *PROMO REDEEMED!*\n\n` +
            `🎟️ Code: *${code}*\n` +
            `🎁 Referral credits added: *${result.credits || 1}*\n` +
            `👥 Your total referral credits: *${totalCredits}*\n` +
            `📊 Remaining uses: *${result.remaining}/${result.total}*\n\n` +
            `💎 Premium target: *${config.PREMIUM_REFERRALS}* credits\n` +
            `Use \`${config.PREFIX}myref\` to check progress.`
        );
    } catch (e) { return ctx.reply('❌ Redeem fail: ' + e.message); }
});

// LIST
cmd({
    pattern: 'promolist',
    alias: ['listpromo', 'mycodes', 'codes'],
    desc: 'Owner: Apne promo codes dekho',
    category: 'owner',
    react: '📋',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!isOwner(ctx)) return ctx.reply('⛔ Owner only.');
    try {
        const codes = await listPromoCodes(cleanNumber(ctx.senderNumber));
        if (!codes.length) return ctx.reply(`📋 Use: \`${config.PREFIX}promo <code>\``);

        const lines = codes.map((c, i) => {
            const status = c.usedCount >= c.maxUses ? '🚫 FULL' : c.active && (!c.expiresAt || c.expiresAt > new Date()) ? '✅ Active' : '❌ Expired/Inactive';
            return `${i + 1}. *${c.code}* — ${c.usedCount}/${c.maxUses} used | +${c.rewardCredits || 1} credits/user | ${status} | expiry: ${c.expiresAt ? new Date(c.expiresAt).toLocaleString() : 'N/A'}`;
        });
        return ctx.reply(`🎟️ *YOUR PROMO CODES (${codes.length})*\n\n${lines.join('\n')}`);
    } catch (e) { return ctx.reply('❌ ' + e.message); }
});

// DELETE
cmd({
    pattern: 'delpromo',
    alias: ['removepromo', 'delcode'],
    desc: 'Owner: Promo code delete karo',
    category: 'owner',
    react: '🗑️',
    use: '.delpromo <code>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!isOwner(ctx)) return ctx.reply('⛔ Owner only.');
    const code = (ctx.q || '').trim().toUpperCase();
    if (!code) return ctx.reply(`Use: \`${config.PREFIX}delpromo <code>\``);
    try {
        const deleted = await deletePromoCode(code, cleanNumber(ctx.senderNumber));
        return ctx.reply(deleted ? `🗑️ Code *${code}* delete ho gaya.` : '❌ Code nahi mila.');
    } catch (e) { return ctx.reply('❌ ' + e.message); }
});

// PREMIUM STATUS
cmd({
    pattern: 'premium',
    alias: ['mypremium', 'premiumstatus'],
    desc: 'Apni premium status dekho',
    category: 'general',
    react: '💎',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const isPrem = await isPremiumUser(ctx);
    const isOwn = isOwner(ctx);

    if (isOwn) return ctx.reply('👑 *OWNER STATUS*\n\nAap **owner** hain — full access!');

    if (isPrem) {
        let promo = false;
        try { promo = await hasPromoPremium(ctx.senderNumber); } catch {}
        return ctx.reply(
            `💎 *PREMIUM ACTIVE* ✅\n\n` +
            `Source: *${promo ? 'Promo Code' : 'Referrals'}*\n` +
            `Status: *Full Access*`
        );
    }

    return ctx.reply(
        `🔒 *Premium Nahi Hai*\n\n` +
        `💎 *Unlock Options:*\n` +
        `1️⃣ \`${config.PREFIX}myref\` — referral\n` +
        `2️⃣ \`${config.PREFIX}redeem <code>\` — promo code`
    );
});