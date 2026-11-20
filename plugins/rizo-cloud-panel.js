// RIZO CLOUD PANEL — ties this bot to the Firebase dashboard (owner-panel.html)
//
//  * Har deploy khud ko Firebase mein register karta hai: instances/<INSTANCE_ID>
//      -> name, image, prefix, numbers connected, uptime, status, lastSeen (every 25s)
//  * Har 20s Firebase se config.php jaisa "remote config" padh kar laagu karta hai:
//      bot name, bot image, prefix, command renames (aliases), courses list
//    (koi bhi change owner-panel.html se karo, bot khud utha leta hai — restart nahi chahiye)
//  * .login <secret-code>  -> is chat ke liye 15 minute ka "panel session" khulta hai (owner only)
//  * .panel            -> abhi ki settings + courses dikhata hai
//  * .panelset name|image|prefix <value>      -> turant badlo (Firebase mein bhi save hota hai)
//  * .panelalias <naya_naam> <asli_command>    -> command ka naya naam rakho (e.g. .panelalias hi ping)
//  * .panelunalias <naya_naam>                 -> wapas hatao
//  * .course add <title> | <price> | <link>    -> course list mein add (owner-panel.html par bhi dikhega)
//  * .course list / .course del <number>
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { cmd } = require('../arslan');
const config = require('../config');
const fb = require('../lib/firebase');

const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data', 'db');
try { fs.mkdirSync(DATA, { recursive: true }); } catch (_) {}
const idFile = path.join(DATA, 'instance-id.txt');
let INSTANCE_ID;
try { INSTANCE_ID = fs.readFileSync(idFile, 'utf8').trim(); } catch (_) {}
if (!INSTANCE_ID) { INSTANCE_ID = 'rizo-' + crypto.randomBytes(5).toString('hex'); try { fs.writeFileSync(idFile, INSTANCE_ID); } catch (_) {} }
global.__cloudInstanceId = INSTANCE_ID;

const SESSIONS = new Map();           // chat -> expiry ts (panel unlocked)
global.__cloudAliasMap = global.__cloudAliasMap || {};     // alias -> real command (patched into main.js dispatch)
let COURSES = [];
let BRAND = { name: config.BOT_NAME, image: config.IMAGE_PATH, banner: '', bannerColor: '#ff6fa3' };
let started = Date.now();
let lastConnCount = () => 0;          // set by setConnCounter()
const setConnCounter = (fn) => { lastConnCount = fn; };

// ------------------------------------------------------------------ apply remote config locally
function applyRemote(cfg) {
    if (!cfg || typeof cfg !== 'object') return;
    if (cfg.name) { config.BOT_NAME = cfg.name; BRAND.name = cfg.name; }
    if (cfg.image) { config.BOT_IMAGE = cfg.image; config.IMAGE_PATH = cfg.image; BRAND.image = cfg.image; }
    if (cfg.prefix) config.PREFIX = cfg.prefix;
    if (cfg.aliases && typeof cfg.aliases === 'object') global.__cloudAliasMap = cfg.aliases;
    if (Array.isArray(cfg.courses)) COURSES = cfg.courses;
    BRAND.banner = typeof cfg.banner === 'string' ? cfg.banner : BRAND.banner;
    BRAND.bannerColor = cfg.bannerColor || BRAND.bannerColor;
    if (cfg.restartRequested) {
        fb.update(`instances/${INSTANCE_ID}/config`, { restartRequested: false }).catch(() => {});
        console.log('[cloud-panel] Restart requested from owner panel — exiting (host should auto-restart).');
        setTimeout(() => process.exit(0), 800);
    }
}
function getBrand() { return BRAND; }

// ------------------------------------------------------------------ register + heartbeat (every 25s)
async function heartbeat() {
    try {
        await fb.update(`instances/${INSTANCE_ID}`, {
            name: config.BOT_NAME || 'RIZO-MD',
            image: config.BOT_IMAGE || config.IMAGE_PATH || '',
            prefix: config.PREFIX || '.',
            owner: config.OWNER_NUMBER || '',
            server: process.env.SERVER_ID || '1',
            url: process.env.SITE_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : ''),
            numbers: lastConnCount(),
            uptimeSec: Math.floor((Date.now() - started) / 1000),
            status: 'online',
            lastSeen: Date.now()
        });
    } catch (_) {}
}
async function pullRemote() {
    const cfg = await fb.get(`instances/${INSTANCE_ID}/config`);
    if (cfg) applyRemote(cfg);
    const c = await fb.get(`instances/${INSTANCE_ID}/courses`);
    if (Array.isArray(c)) COURSES = c; else if (c && typeof c === 'object') COURSES = Object.values(c);
    const al = await fb.get(`instances/${INSTANCE_ID}/config/aliases`);
    if (al && typeof al === 'object') global.__cloudAliasMap = al;
}
const hbTimer = setInterval(heartbeat, 25000); if (hbTimer.unref) hbTimer.unref();
const pullTimer = setInterval(pullRemote, 20000); if (pullTimer.unref) pullTimer.unref();
heartbeat(); pullRemote();
process.on('exit', () => { fb.update(`instances/${INSTANCE_ID}`, { status: 'offline', lastSeen: Date.now() }).catch(() => {}); });

async function saveCourses() { await fb.set(`instances/${INSTANCE_ID}/courses`, COURSES); }
async function saveField(key, value) { await fb.update(`instances/${INSTANCE_ID}/config`, { [key]: value }); }
async function saveAliases() { await fb.set(`instances/${INSTANCE_ID}/config/aliases`, global.__cloudAliasMap); }

const unlocked = (ctx) => (ctx.isOwner || ctx.isCreator || ctx.isMe) && (SESSIONS.get(ctx.from) || 0) > Date.now();
const needPanel = (ctx) => { if (!unlocked(ctx)) { ctx.reply('🔒 Pehle *.login <secret-code>* se panel kholo.'); return true; } return false; };

// ------------------------------------------------------------------ .login
cmd({ pattern: 'login', category: 'owner', react: '🔐', desc: 'Cloud Panel kholo (secret code se)', use: '.login mycode123', filename: __filename },
async (conn, mek, m, ctx) => {
    const owner = ctx.isOwner || ctx.isCreator || ctx.isMe;
    if (!owner) return;                                             // non-owner: silently ignore (no hint that this exists)
    const code = (ctx.q || '').trim();
    const real = process.env.PANEL_SECRET || config.PANEL_SECRET;
    if (!real) return ctx.reply('⚠️ Panel secret set nahi hai.\nRailway Variables mein *PANEL_SECRET* daal kar redeploy karein.');
    if (!code) return ctx.reply('🔐 Misal: *.login mycode123*');
    if (code !== real) return ctx.reply('❌ Galat code.');
    SESSIONS.set(ctx.from, Date.now() + 15 * 60000);
    await ctx.reply(`🔓 *Cloud Panel khul gaya* (15 minute)\n\n🆔 Instance ID: *${INSTANCE_ID}*\n(Yeh ID owner-panel.html mein bhi dikhega)\n\n📋 *.panel* — settings dekho\n⚙️ *.panelset name|image|prefix <value>*\n🏷️ *.panelalias <naya> <asli>*\n📚 *.course add <title> | <price> | <link>*`);
});

// ------------------------------------------------------------------ .panel
cmd({ pattern: 'panel', category: 'owner', react: '🧩', desc: 'Cloud Panel ki settings dekho', use: '.panel', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needPanel(ctx)) return;
    const al = Object.entries(global.__cloudAliasMap);
    await ctx.reply(`🧩 *CLOUD PANEL*\n🆔 ${INSTANCE_ID}\n\n👤 Name: *${config.BOT_NAME}*\n🖼️ Image: ${config.BOT_IMAGE || '(default)'}\n⌨️ Prefix: *${config.PREFIX}*\n👥 Numbers: *${lastConnCount()}*\n\n🏷️ Aliases (${al.length}):\n${al.length ? al.map(([a, r]) => `  *${a}* ➜ ${r}`).join('\n') : '  (koi nahi)'}\n\n📚 Courses (${COURSES.length}):\n${COURSES.length ? COURSES.map((c, i) => `  ${i + 1}. ${c.title} — ${c.price || 'free'}`).join('\n') : '  (koi nahi)'}\n\n🌐 Sab kuch *owner-panel.html* se bhi badal sakte ho (live sync).`);
});

// ------------------------------------------------------------------ .panelset
cmd({ pattern: 'panelset', category: 'owner', react: '⚙️', desc: 'Name/image/prefix turant badlo', use: '.panelset name RIZO PRO', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needPanel(ctx)) return;
    const sp = (ctx.q || '').trim().indexOf(' ');
    const key = sp === -1 ? (ctx.q || '').trim().toLowerCase() : ctx.q.slice(0, sp).toLowerCase();
    const value = sp === -1 ? '' : ctx.q.slice(sp + 1).trim();
    if (!['name', 'image', 'prefix'].includes(key) || !value) return ctx.reply('⚙️ Misal:\n*.panelset name RIZO PRO*\n*.panelset image https://...*\n*.panelset prefix !*');
    applyRemote({ [key]: value });
    await saveField(key, value);
    await ctx.reply(`✅ *${key}* ab: *${value}*`);
});

// ------------------------------------------------------------------ .panelalias / .panelunalias
cmd({ pattern: 'panelalias', category: 'owner', react: '🏷️', desc: 'Kisi command ka naya naam rakho', use: '.panelalias hi ping', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needPanel(ctx)) return;
    const [alias, real] = (ctx.q || '').trim().split(/\s+/);
    if (!alias || !real) return ctx.reply('🏷️ Misal: *.panelalias hi ping*  (ab *.hi* bhi *.ping* jaisa chalega)');
    global.__cloudAliasMap[alias.toLowerCase()] = real.toLowerCase();
    await saveAliases();
    await ctx.reply(`✅ *.${alias}* ab *.${real}* ki tarah chalega.`);
});
cmd({ pattern: 'panelunalias', category: 'owner', react: '🏷️', desc: 'Naya naam hatao', use: '.panelunalias hi', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needPanel(ctx)) return;
    const alias = (ctx.q || '').trim().toLowerCase();
    if (!alias || !global.__cloudAliasMap[alias]) return ctx.reply('🏷️ Yeh naam mojood nahi.');
    delete global.__cloudAliasMap[alias];
    await saveAliases();
    await ctx.reply(`✅ *.${alias}* hata diya.`);
});

// ------------------------------------------------------------------ .course
cmd({ pattern: 'course', category: 'owner', react: '📚', desc: 'Courses list manage karo', use: '.course add Title | 500 | https://link  |  .course list  |  .course del 1', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needPanel(ctx)) return;
    const [sub, ...rest] = (ctx.q || '').trim().split(/\s+/);
    const restText = (ctx.q || '').trim().slice(sub ? sub.length : 0).trim();
    if (sub === 'add') {
        const [title, price, link] = restText.split('|').map(x => (x || '').trim());
        if (!title) return ctx.reply('📚 Misal: *.course add Web Dev Course | 1500 | https://link*');
        COURSES.push({ title, price: price || '', link: link || '', addedAt: Date.now() });
        await saveCourses();
        return ctx.reply(`✅ Course add ho gaya. Total: *${COURSES.length}*`);
    }
    if (sub === 'del') {
        const i = parseInt(rest[0], 10) - 1;
        if (!(i >= 0 && i < COURSES.length)) return ctx.reply('📚 Sahi number likho: *.course list* dekh kar.');
        const removed = COURSES.splice(i, 1)[0];
        await saveCourses();
        return ctx.reply(`✅ Hata diya: *${removed.title}*`);
    }
    if (!COURSES.length) return ctx.reply('📚 Abhi koi course nahi. *.course add Title | Price | Link*');
    await ctx.reply(`📚 *COURSES*\n\n${COURSES.map((c, i) => `${i + 1}. *${c.title}*\n   💰 ${c.price || 'Free'}\n   🔗 ${c.link || '-'}`).join('\n\n')}`);
});

module.exports = { setConnCounter, applyRemote, getBrand, INSTANCE_ID };
