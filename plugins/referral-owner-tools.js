const { cmd } = require('../arslan');
const config = require('../config');
const { isOwner, cleanNumber } = require('../lib/premium-check');
const {
  Referral, ReferralCode, PromoPremium,
  getOrCreateReferralCode, getReferralStatsForNumber,
  grantPromoPremium
} = require('../lib/database');

function ownerOnly(ctx) {
  return isOwner(ctx);
}
function denied(ctx) {
  return ctx.reply('⛔ Ye command sirf configured owner ke liye hai.');
}

// .refcheck <number> — detailed referral status
cmd({ pattern: 'refcheck', alias: ['reflookup'], desc: 'Owner: user referral status', category: 'owner', react: '🔎', use: '.refcheck 923XXXXXXXXX', filename: __filename }, async (conn, mek, m, ctx) => {
  if (!ownerOnly(ctx)) return denied(ctx);
  const number = cleanNumber(ctx.q);
  if (!number || number.length < 10) return ctx.reply('Use: .refcheck 923XXXXXXXXX');
  try {
    const s = await getReferralStatsForNumber(number);
    const premium = await PromoPremium.findOne({ number }).lean();
    return ctx.reply([
      '👑 *OWNER REFERRAL LOOKUP*', '',
      `📱 User: *${number}*`,
      `🔑 Code: *${s.code || 'Not created'}*`,
      `👥 Referrals: *${s.count}*`,
      `💎 Referral premium: *${s.premium ? 'YES' : 'NO'}*`,
      `🎟️ Manual premium: *${premium && (!premium.expiresAt || premium.expiresAt > new Date()) ? 'ACTIVE' : 'NO'}*`,
      `📅 Expires: *${premium?.expiresAt ? new Date(premium.expiresAt).toLocaleString() : 'N/A'}*`
    ].join('\n'));
  } catch (e) { console.error('[REFCHECK]', e); return ctx.reply('❌ Referral lookup fail: ' + e.message); }
});

// .refgrant <number> [days] — owner grants premium access
cmd({ pattern: 'refgrant', alias: ['grantrefpremium'], desc: 'Owner: grant premium by referral admin', category: 'owner', react: '💎', use: '.refgrant 923XXXXXXXXX 30', filename: __filename }, async (conn, mek, m, ctx) => {
  if (!ownerOnly(ctx)) return denied(ctx);
  const [raw, rawDays] = (ctx.q || '').trim().split(/\s+/);
  const number = cleanNumber(raw);
  const days = Number(rawDays || 30);
  if (!number || number.length < 10 || !Number.isInteger(days) || days < 1 || days > 3650) return ctx.reply('Use: .refgrant 923XXXXXXXXX [days 1-3650]');
  try {
    await grantPromoPremium(number, 'OWNER-MANUAL', days);
    return ctx.reply(`✅ *Premium granted*\n📱 ${number}\n📅 ${days} days\n👑 By owner`);
  } catch (e) { return ctx.reply('❌ Grant fail: ' + e.message); }
});

// .refrevoke <number> — revoke manually granted premium
cmd({ pattern: 'refrevoke', alias: ['revokeref'], desc: 'Owner: revoke manual premium', category: 'owner', react: '🧹', use: '.refrevoke 923XXXXXXXXX', filename: __filename }, async (conn, mek, m, ctx) => {
  if (!ownerOnly(ctx)) return denied(ctx);
  const number = cleanNumber(ctx.q);
  if (!number || number.length < 10) return ctx.reply('Use: .refrevoke 923XXXXXXXXX');
  try {
    const r = await PromoPremium.deleteOne({ number });
    return ctx.reply(r.deletedCount ? `✅ Manual premium revoked for ${number}.\nReferral-earned premium remains based on verified referrals.` : 'ℹ️ Is user ka manual premium record nahi mila.');
  } catch (e) { return ctx.reply('❌ Revoke fail: ' + e.message); }
});

// .refadd <referrer> <new-user> — owner manually records a referral, no self-referral.
cmd({ pattern: 'refadd', alias: ['addreferral'], desc: 'Owner: record verified referral', category: 'owner', react: '➕', use: '.refadd <referrerNumber> <newUserNumber>', filename: __filename }, async (conn, mek, m, ctx) => {
  if (!ownerOnly(ctx)) return denied(ctx);
  const [rawReferrer, rawReferred] = (ctx.q || '').trim().split(/\s+/);
  const referrer = cleanNumber(rawReferrer), referred = cleanNumber(rawReferred);
  if (!referrer || !referred || referrer.length < 10 || referred.length < 10) return ctx.reply('Use: .refadd <referrerNumber> <newUserNumber>');
  if (referrer === referred) return ctx.reply('❌ Self-referral allowed nahi.');
  try {
    await getOrCreateReferralCode(referrer);
    const result = await Referral.updateOne({ referredNumber: referred }, { $setOnInsert: { referrerNumber: referrer, referredNumber: referred } }, { upsert: true });
    if (!result.upsertedCount) return ctx.reply('⚠️ Ye user pehle hi referral system mein counted hai.');
    const count = await Referral.countDocuments({ referrerNumber: referrer });
    return ctx.reply(`✅ Referral recorded.\n👤 Referrer: ${referrer}\n🆕 Referred: ${referred}\n📊 New total: ${count}`);
  } catch (e) { return ctx.reply('❌ Referral add fail: ' + e.message); }
});

// .refremove <new-user-number> — remove a single referral record
cmd({ pattern: 'refremove', alias: ['delreferral'], desc: 'Owner: remove referral record by referred user', category: 'owner', react: '➖', use: '.refremove <newUserNumber>', filename: __filename }, async (conn, mek, m, ctx) => {
  if (!ownerOnly(ctx)) return denied(ctx);
  const referred = cleanNumber(ctx.q);
  if (!referred || referred.length < 10) return ctx.reply('Use: .refremove <newUserNumber>');
  try {
    const r = await Referral.deleteOne({ referredNumber: referred });
    return ctx.reply(r.deletedCount ? `✅ Referral record for ${referred} removed.` : 'ℹ️ Referral record nahi mila.');
  } catch (e) { return ctx.reply('❌ Referral remove fail: ' + e.message); }
});

// .refreset <referrer-number> — destructive reset with explicit confirmation
cmd({ pattern: 'refreset', alias: ['resetreferrals'], desc: 'Owner: reset all referrals for one user', category: 'owner', react: '⚠️', use: '.refreset <number> CONFIRM', filename: __filename }, async (conn, mek, m, ctx) => {
  if (!ownerOnly(ctx)) return denied(ctx);
  const parts = (ctx.q || '').trim().split(/\s+/);
  const referrer = cleanNumber(parts[0]);
  if (!referrer || referrer.length < 10 || parts[1] !== 'CONFIRM') return ctx.reply('⚠️ This deletes that referrer\'s referral count.\nUse: .refreset <number> CONFIRM');
  try {
    const r = await Referral.deleteMany({ referrerNumber: referrer });
    return ctx.reply(`✅ Referral records removed for ${referrer}: ${r.deletedCount || 0}. Manual premium records were not changed.`);
  } catch (e) { return ctx.reply('❌ Reset fail: ' + e.message); }
});

console.log('[RIZO] Owner referral administration loaded');
