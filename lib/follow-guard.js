// lib/follow-guard.js
// Follow commands (.sfollow / .sunfollow / .followstats) ke liye PASSWORD.
//
// Kaise kaam karta hai:
//   * Password do jagah se aa sakta hai:
//       1) .setfollowpass <naya-password>   (sirf bot host / owner panel) -> data/db/follow-pass.json mein HASH ban kar save hota hai
//       2) FOLLOW_PASSWORD  (Variables / env)  — agar upar wala set nahi
//   * Jisko password aata ho wo:  .followlogin <password>  likhe  -> 30 minute ke liye unlock (FOLLOW_UNLOCK_MIN se badlo)
//   * Galat password 5 dafa -> 15 minute ke liye us number ka login band.
//   * Bot host (OWNER_NUMBER) aur owner panel se chalne wali commands ko password nahi poocha jata.
//   * Password set hi na ho to follow commands sirf host / owner panel chala sakta hai (baqi sab ke liye band).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const { isOwnerNumber } = require('./premium-check');

const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data', 'db');
const FILE = path.join(DATA, 'follow-pass.json');
const UNLOCK_MS = Math.max(1, Number(process.env.FOLLOW_UNLOCK_MIN || 30)) * 60000;
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60000;

const unlocked = new Map();   // senderNumber -> expiry timestamp
const fails = new Map();      // senderNumber -> { n, until }

const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

function readStored() {
    try { const j = JSON.parse(fs.readFileSync(FILE, 'utf8')); return j && j.salt && j.hash ? j : null; } catch (_) { return null; }
}
function isConfigured() { return Boolean(readStored() || process.env.FOLLOW_PASSWORD); }

function verify(pw) {
    pw = String(pw || '');
    if (!pw) return false;
    const st = readStored();
    if (st) return safeEq(hashPw(pw, st.salt), st.hash);
    const env = process.env.FOLLOW_PASSWORD;
    return Boolean(env) && safeEq(pw, env);
}

function setPassword(pw) {
    pw = String(pw || '').trim();
    if (pw.length < 6) throw new Error('Password kam az kam 6 characters ka rakho.');
    const salt = crypto.randomBytes(16).toString('hex');
    fs.mkdirSync(DATA, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify({ salt, hash: hashPw(pw, salt), updatedAt: Date.now() }), { mode: 0o600 });
    unlocked.clear();               // purane logins khatam
}

const who = (ctx) => String((ctx && (ctx.senderNumber || ctx.sender)) || '').split('@')[0].split(':')[0];

function isHost(ctx, mek) {
    if (mek && mek.__fromPanel === true) return true;             // owner panel (token-protected web)
    return isOwnerNumber(who(ctx));
}

function tryLogin(ctx, pw) {
    const id = who(ctx);
    let f = fails.get(id);
    if (f && f.until && f.until <= Date.now()) { fails.delete(id); f = null; }   // lock khatam
    if (f && f.until > Date.now()) return { ok: false, msg: `⛔ Bohat galat koshishein. ${Math.ceil((f.until - Date.now()) / 60000)} minute baad dobara try karo.` };
    if (!isConfigured()) return { ok: false, msg: '🔒 Follow password abhi set nahi hai. Bot host se kaho `.setfollowpass` kare.' };
    if (verify(pw)) {
        fails.delete(id);
        unlocked.set(id, Date.now() + UNLOCK_MS);
        return { ok: true, msg: `🔓 Follow commands unlock ho gayi (${Math.round(UNLOCK_MS / 60000)} minute ke liye).\n➕ .sfollow <channel-link>\n➖ .sunfollow <channel-link>` };
    }
    const n = (f ? f.n : 0) + 1;
    if (n >= MAX_FAILS) { fails.set(id, { n: 0, until: Date.now() + LOCK_MS }); return { ok: false, msg: '⛔ 5 galat koshishein — 15 minute ke liye login band.' }; }
    fails.set(id, { n, until: 0 });
    return { ok: false, msg: `❌ Galat password. (${MAX_FAILS - n} koshishein baqi)` };
}

function logout(ctx) { unlocked.delete(who(ctx)); }

// Follow command ke shuru mein: if (!(await require('../lib/follow-guard').allow(ctx, mek))) return;
async function allow(ctx, mek) {
    if (isHost(ctx, mek)) return true;
    if ((unlocked.get(who(ctx)) || 0) > Date.now()) return true;
    const P = config.PREFIX || '.';
    if (!isConfigured()) await ctx.reply('🔒 Follow commands abhi band hain — bot host ne password set nahi kiya.');
    else await ctx.reply(`🔒 *Follow commands password se band hain.*\n\nJis ko password aata ho wo *private chat* mein likhe:\n*${P}followlogin <password>*`);
    return false;
}

module.exports = { allow, tryLogin, logout, setPassword, isConfigured, isHost, UNLOCK_MS };
