const { cmd } = require('../arslan');
const config = require('../config');
const {
    createPromoCode,
    redeemPromoCode,
    listPromoCodes,
    deletePromoCode,
    grantPromoPremium,
    hasPromoPremium
} = require('../lib/database');
const { isOwner, isPremiumUser, cleanNumber } = require('../lib/premium-check');

// ===========================================================
// 1. CREATE PROMO — Owner sirf 3 users ke liye code banaye
// ===========================================================
cmd({
    pattern: 'promo',
    alias: ['createpromo', 'promocode', 'genpromo'],
    desc: 'Owner: Promo code banao (default 3 users)',
    category: 'owner',
    react: '🎟️',
    use: '.promo <code> [maxUses] [expiresHours]',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!isOwner(ctx)) {
        return ctx.reply('⛔ Ye command sirf *Owner* ke liye hai.');
    }

    const args = (ctx.q || '').trim().split(/\s+/);
    const code = args[0];
    const maxUses = parseInt(args[1]) || 3;      // 🎯 default 3 users
    const expiresHours = parseInt(args[2]) || null;

    if (!code) {
        return ctx.reply(
            `🎟️ *PROMO CODE GENERATOR*\n\n` +
            `Use: \`${config.PREFIX}promo <code> [maxUses] [expiresHours]\`\n\n` +
            `Example:\n` +
            `\`${config.PREFIX}promo RIZO2026\` → 3 users, no expiry\n` +
            `\`${config.PREFIX}promo VIP5 5\` → 5 users\n` +
            `\`${config.PREFIX}promo EID24 3 48\` → 3 users, 48hr expiry`
        );
    }

    try {
        const promo = await createPromoCode(code, maxUses, cleanNumber(ctx.senderNumber), expiresHours);

        return ctx.reply(
            `🎟️ *PROMO CODE CREATED!*\n\n` +
            `🔑 Code: *${promo.code}*\n` +
            `👥 Max Users: *${promo.maxUses}*\n` +
            `📅 Expires: *${promo.expiresAt ? promo.expiresAt.toLocaleString() : 'Never'}*\n\n` +
            `💡 Users ye command use karenge:\n` +
            `\`${config.PREFIX}redeem ${promo.code}\`\n\n` +
            `⚠️ Sirf *${promo.maxUses}* users use kar sakte hain!`
        );
    } catch (e) {
        return ctx.reply('❌ ' + e.message);
    }
});

// ===========================================================
// 2. REDEEM — User promo code use kare
// ===========================================================
cmd({
    pattern: 'redeem',
    alias: ['promo-redeem', 'usecode', 'claimcode'],
    desc: 'Promo code se premium unlock karo',
    category: 'general',
    react: '🎁',
    use: '.redeem <code>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const code = (ctx.q || '').trim().toUpperCase();
    if (!code) {
        return ctx.reply(`🎁 Use: \`${config.PREFIX}redeem <code>\`\n\nOwner se promo code maango!`);
    }

    const number = cleanNumber(ctx.senderNumber);

    // Owner already premium hai
    if (isOwner(ctx)) {
        return ctx.reply('👑 Aap *Owner* hain — already full access hai!');
    }

    try {
        const result = await redeemPromoCode(code, number);

        if (!result.success) {
            const messages = {
                invalid_code: '❌ Ye promo code *valid nahi* hai.',
                inactive: '❌ Ye promo code *band* kar diya gaya hai.',
                expired: '⌛ Ye promo code *expire* ho gaya hai.',
                already_used_by_you: '⚠️ Aap ye code *already use kar chuke* ho!',
                limit_reached: '🚫 Ye code *already full* ho gaya — kisi aur ne use kar liya!\n\n_Naye code ke liye owner se contact karo._'
            };
            return ctx.reply(messages[result.reason] || '❌ Code use nahi hua.');
        }

        // Premium grant karo (30 din)
        await grantPromoPremium(number, code, 30);

        return ctx.reply(
            `✅ *PREMIUM UNLOCKED!*\n\n` +
            `🎟️ Code: *${code}*\n` +
            `💎 Status: *Premium Active*\n` +
            `📅 Valid: *30 days*\n\n` +
            `👥 Remaining uses: *${result.remaining}/${result.total}*\n\n` +
            `🎉 Ab saari premium commands use kar sakte ho!\n` +
            `Try: \`${config.PREFIX}bugbotscript\``
        );
    } catch (e) {
        console.error('redeem error:', e);
        return ctx.reply('❌ Redeem fail: ' + e.message);
    }
});

// ===========================================================
// 3. LIST PROMOS — Owner apne codes dekhe
// ===========================================================
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

        if (!codes.length) {
            return ctx.reply(`📋 Abhi tak koi promo code nahi banaya.\n\nUse: \`${config.PREFIX}promo <code>\``);
        }

        const lines = codes.map((c, i) => {
            const status = c.usedCount >= c.maxUses ? '🚫 FULL' : c.active ? '✅ Active' : '❌ Inactive';
            const expiry = c.expiresAt ? ` (exp: ${new Date(c.expiresAt).toLocaleDateString()})` : '';
            return `${i + 1}. *${c.code}* — ${c.usedCount}/${c.maxUses} ${status}${expiry}`;
        });

        return ctx.reply(`🎟️ *YOUR PROMO CODES (${codes.length})*\n\n${lines.join('\n')}`);
    } catch (e) {
        return ctx.reply('❌ ' + e.message);
    }
});

// ===========================================================
// 4. DELETE PROMO — Owner code delete kare
// ===========================================================
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
    } catch (e) {
        return ctx.reply('❌ ' + e.message);
    }
});

// ===========================================================
// 5. PREMIUM STATUS — Apni premium status dekho
// ===========================================================
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

    if (isOwn) {
        return ctx.reply('👑 *OWNER STATUS*\n\nAap **owner** hain — full access hai saari commands ka!');
    }

    if (isPrem) {
        let promo = false;
        try {
            const { hasPromoPremium } = require('../lib/database');
            promo = await hasPromoPremium(ctx.senderNumber);
        } catch {}

        return ctx.reply(
            `💎 *PREMIUM ACTIVE* ✅\n\n` +
            `Source: *${promo ? 'Promo Code' : 'Referrals'}*\n` +
            `Status: *Full Access*\n\n` +
            `🎉 Saari premium commands use karo!`
        );
    }

    return ctx.reply(
        `🔒 *Premium Nahi Hai*\n\n` +
        `💎 *Unlock Options:*\n` +
        `1️⃣ \`${config.PREFIX}myref\` — referral link\n` +
        `2️⃣ \`${config.PREFIX}redeem <code>\` — promo code\n\n` +
        `Owner se promo code maango!`
    );
});