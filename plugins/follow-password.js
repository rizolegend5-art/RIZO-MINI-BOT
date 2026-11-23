// plugins/follow-password.js
//   .followlogin <password>   — follow commands unlock karo (private chat mein)
//   .followlogout             — wapas lock
//   .setfollowpass <password> — naya password (sirf bot host / owner panel)
const { cmd } = require('../arslan');
const guard = require('../lib/follow-guard');

cmd({ pattern: 'followlogin', alias: ['flogin', 'followunlock'], category: 'general', react: '🔑', desc: 'Follow commands ka password daalo', use: '.followlogin <password>', filename: __filename },
async (conn, mek, m, ctx) => {
    if (ctx.isGroup) return ctx.reply('⚠️ Password group mein mat likho (sab dekh lete hain). Mujhe *private chat* mein likho.');
    const pw = (ctx.q || '').trim();
    if (!pw) return ctx.reply('🔑 Misal: *.followlogin mypassword*');
    return ctx.reply(guard.tryLogin(ctx, pw).msg);
});

cmd({ pattern: 'followlogout', alias: ['flogout', 'followlock'], category: 'general', react: '🔒', desc: 'Follow commands dobara lock karo', use: '.followlogout', filename: __filename },
async (conn, mek, m, ctx) => { guard.logout(ctx); return ctx.reply('🔒 Follow commands dobara lock ho gayi.'); });

cmd({ pattern: 'setfollowpass', alias: ['followpassword'], category: 'owner', react: '🛡️', desc: 'Follow commands ka naya password (host only)', use: '.setfollowpass <naya-password>', filename: __filename },
async (conn, mek, m, ctx) => {
    if (!guard.isHost(ctx, mek)) return ctx.reply('⛔ Yeh sirf bot host chala sakta hai.');
    if (ctx.isGroup) return ctx.reply('⚠️ Password sirf private chat mein set karo.');
    const pw = (ctx.q || '').trim();
    if (!pw) return ctx.reply(`🛡️ Misal: *.setfollowpass MeraPass123*\nAbhi password: ${guard.isConfigured() ? 'set hai ✅' : 'set nahi ❌'}`);
    try { guard.setPassword(pw); } catch (e) { return ctx.reply('❌ ' + e.message); }
    return ctx.reply('✅ Follow password set ho gaya. Jis ko dena ho usay batao — wo *.followlogin <password>* likhega.\n(Purane saare logins khatam kar diye.)');
});
