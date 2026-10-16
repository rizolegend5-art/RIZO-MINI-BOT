// plugins/myref.js — Config-based, no env, no MongoDB
// Saves to referrals.json file

const { cmd } = require('../arslan');
const config = require('../config');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REF_FILE = path.join(__dirname, '..', 'referrals.json');

// ═══════════════════════════════════════════
//  JSON STORAGE — auto-create
// ═══════════════════════════════════════════
function loadRefs() {
    if (!fs.existsSync(REF_FILE)) {
        const init = { codes: {}, counts: {}, byCode: {} };
        try { fs.writeFileSync(REF_FILE, JSON.stringify(init, null, 2)); } catch (_) {}
        return init;
    }
    try {
        const d = JSON.parse(fs.readFileSync(REF_FILE, 'utf-8'));
        return {
            codes: d.codes || {},
            counts: d.counts || {},
            byCode: d.byCode || {}
        };
    } catch (_) {
        return { codes: {}, counts: {}, byCode: {} };
    }
}

function saveRefs(d) {
    try { fs.writeFileSync(REF_FILE, JSON.stringify(d, null, 2)); }
    catch (e) { console.error('[myref] save failed:', e.message); }
}

// ═══════════════════════════════════════════
//  NUMBER CLEAN — uses config.DEFAULT_COUNTRY_CODE
// ═══════════════════════════════════════════
function cleanNumber(v) {
    if (!v) return '';
    let n = String(v).replace(/[^0-9]/g, '');
    if (n.startsWith('00')) n = n.slice(2);

    const cc = String(config.DEFAULT_COUNTRY_CODE || '92');
    if (n.startsWith(cc + '0') && n.length === cc.length + 11) {
        n = cc + n.slice(cc.length + 1);
    }
    if (n.startsWith('0')) n = cc + n.slice(1);
    if (n.length === 10 && n.startsWith('3')) n = cc + n;
    return n;
}

function genCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// ═══════════════════════════════════════════
//  .myref
// ═══════════════════════════════════════════
cmd({
    pattern: 'myref',
    alias: ['myreferral', 'referral'],
    desc: 'Apna referral link',
    category: 'referrals',
    react: '🔗',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    try {
        const raw = ctx.senderNumber || ctx.sender || '';
        const number = cleanNumber(raw);

        console.log('[myref] raw:', raw, '→ clean:', number);

        if (!number) {
            return ctx.reply(
                `❌ *Number identify nahi hua*\n\n` +
                `Aapka WhatsApp LID use kar raha hai.\n` +
                `Sender: \`${raw || 'empty'}\``
            );
        }

        const d = loadRefs();
        let code = d.codes[number];

        if (!code) {
            do { code = genCode(); } while (d.byCode[code]);
            d.codes[number] = code;
            d.byCode[code] = number;
            if (!d.counts[number]) d.counts[number] = 0;
            saveRefs(d);
        }

        const count = d.counts[number] || 0;
        const threshold = Math.max(1, Number(config.PREMIUM_REFERRALS) || 4);
        const premium = count >= threshold;

        const base = String(config.PAIR_BASE_URL || '').replace(/\/+$/, '');
        const link = `${base}/?ref=${encodeURIComponent(code)}`;

        const isOwner = ctx.isOwner || ctx.isCreator;

        if (isOwner) {
            return ctx.reply(
                `👑 *OWNER REFERRAL*\n\n${link}\n\n🔑 Code: *${code}*\n👥 Referrals: *${count}*`
            );
        }

        return ctx.reply([
            '🔗 *RIZO MINI BOT — AAPKA PERSONAL REFERRAL LINK*',
            '',
            link,
            '',
            `🔑 Code: *${code}*`,
            `👥 Referral credits: *${count}*`,
            `💎 Premium: *${premium ? 'UNLOCKED ✅' : `${Math.max(0, threshold - count)} aur chahiye`}*`,
            '',
            `💡 Promo: *${config.PREFIX}redeem <code>*`
        ].join('\n'));

    } catch (e) {
        console.error('[myref] ERROR:', e.message);
        return ctx.reply(`❌ Referral fail: ${e.message}`);
    }
});

// ═══════════════════════════════════════════
//  .referralstats (owner)
// ═══════════════════════════════════════════
cmd({
    pattern: 'referralstats',
    alias: ['refstats', 'adminpanel'],
    desc: 'Owner: Referral reports',
    category: 'owner',
    react: '📊',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!(ctx.isOwner || ctx.isCreator)) return ctx.reply('⛔ Owner only.');
    try {
        const d = loadRefs();
        const rows = Object.entries(d.counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 25)
            .map(([num, cnt], i) => `${i + 1}. ${num} — ${cnt}`);

        const total = Object.values(d.counts).reduce((s, c) => s + c, 0);
        const threshold = Math.max(1, Number(config.PREMIUM_REFERRALS) || 4);
        const premium = Object.values(d.counts).filter(c => c >= threshold).length;

        const liveNumbers = global.activeSockets
            ? Array.from(global.activeSockets.keys())
            : [];

        return ctx.reply([
            '🛡️ *RIZO-MD OWNER PANEL*',
            '',
            `Live sessions: *${liveNumbers.length}*`,
            `Total codes: *${Object.keys(d.codes).length}*`,
            `Total referrals: *${total}*`,
            `Premium users: *${premium}*`,
            '',
            '*Top referrers:*',
            rows.length ? rows.join('\n') : 'None.'
        ].join('\n'));
    } catch (e) {
        return ctx.reply(`❌ Report fail: ${e.message}`);
    }
});