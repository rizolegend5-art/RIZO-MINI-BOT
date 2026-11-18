// RIZO GROUP PACK — 15 new group tools: nightmode, mutefor, badword, antiflood, slowmode, tagmembers,
// randomtag, teams, ghosts, myrank, exportmembers, gcage, birthday(s), topic.  Offline, no API keys.
const fs = require('fs');
const path = require('path');
const { cmd } = require('../arslan');

// ---------------------------------------------------------------- storage helpers
const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data', 'db');
try { fs.mkdirSync(DATA, { recursive: true }); } catch (_) {}
const loadJson = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch (_) { return d; } };
const timers = {};
const saveJson = (f, obj) => {
    clearTimeout(timers[f]);
    timers[f] = setTimeout(() => { try { fs.writeFileSync(path.join(DATA, f), JSON.stringify(obj)); } catch (_) {} }, 600);
    if (timers[f].unref) timers[f].unref();
};
const num = (jid) => String(jid || '').split('@')[0].split(':')[0];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const box = (t, b) => `╭┈───〔 *${t}* 〕┈───⊷\n${b}\n╰─────────────────────⊷`;
const needGroup = (ctx) => { if (!ctx.isGroup) { ctx.reply('❌ Yeh command sirf *group* mein chalti hai.'); return true; } return false; };
const needBotAdmin = (ctx) => { if (!ctx.isBotAdmins) { ctx.reply('❌ Pehle bot ko *group admin* banao, phir yeh chalega.'); return true; } return false; };
const send = (conn, gid, text, mentions = [], quoted) => conn.sendMessage(gid, { text, mentions }, quoted ? { quoted } : undefined);
const members = (ctx, conn) => { const me = num(conn.user && conn.user.id); return (ctx.participants || []).map(p => p.id || p.jid).filter(Boolean).filter(id => num(id) !== me); };
const pk = () => {                                   // Karachi date/time parts
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}`, d: +p.day, m: +p.month, y: +p.year };
};
const validHM = (s) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(s || '');
const padHM = (s) => s.length === 4 ? '0' + s : s;

// ---------------------------------------------------------------- state
const CONNS = new Map();                                       // group -> latest conn that saw it
const NIGHT = loadJson('nightmode.json', {});                  // gid -> { lock, unlock }
const MUTES = loadJson('mutefor.json', {});                    // gid -> { until }
const BADW = loadJson('badwords.json', {});                    // gid -> [words]
const FLOOD = loadJson('antiflood.json', {});                  // gid -> true
const SLOW = loadJson('slowmode.json', {});                    // gid -> seconds
const BDAY = loadJson('birthdays.json', {});                   // gid -> { number: {d,m} }
const COUNTS = loadJson('msgcounts.json', { since: {}, c: {} });// since[gid]=ts, c[gid][number]=n

// ---------------------------------------------------------------- 1. nightmode (admin)
cmd({ pattern: 'nightmode', category: 'group', react: '🌙', desc: 'Raat ko group khud band, subah khud khul jaye', use: '.nightmode 23:00 07:00  |  .nightmode off', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const a = (ctx.q || '').trim().split(/\s+/).filter(Boolean);
    if (!a.length) {
        const n = NIGHT[ctx.from];
        return ctx.reply(n ? `🌙 Night mode *ON*\n🔒 Band: *${n.lock}*\n🔓 Khulega: *${n.unlock}*\n_(Pakistan time)_\n\nBand karne ke liye: *.nightmode off*` : '🌙 Misal: *.nightmode 23:00 07:00*\n(23:00 par group band, 07:00 par khul jaye — Pakistan time)');
    }
    if (a[0].toLowerCase() === 'off') { delete NIGHT[ctx.from]; saveJson('nightmode.json', NIGHT); return ctx.reply('✅ Night mode band kar diya.'); }
    if (!validHM(a[0]) || !validHM(a[1])) return ctx.reply('❌ Waqt 24-ghante format mein likho.\nMisal: *.nightmode 23:00 07:00*');
    if (needBotAdmin(ctx)) return;
    NIGHT[ctx.from] = { lock: padHM(a[0]), unlock: padHM(a[1]) };
    saveJson('nightmode.json', NIGHT);
    CONNS.set(ctx.from, conn);
    ctx.reply(`✅ *Night mode ON*\n🔒 Band: *${NIGHT[ctx.from].lock}*\n🔓 Khulega: *${NIGHT[ctx.from].unlock}*\n_(Pakistan time)_`);
});

// ---------------------------------------------------------------- 2. mutefor (admin)
cmd({ pattern: 'mutefor', category: 'group', react: '🔇', desc: 'Group kuch der ke liye band, phir khud khul jaye', use: '.mutefor 30   (minutes)', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const n = parseInt(ctx.q, 10);
    if (!n || n < 1 || n > 1440) return ctx.reply('🔇 Minutes likho (1 se 1440).\nMisal: *.mutefor 30*');
    if (needBotAdmin(ctx)) return;
    await conn.groupSettingUpdate(ctx.from, 'announcement');
    MUTES[ctx.from] = { until: Date.now() + n * 60000 };
    saveJson('mutefor.json', MUTES);
    CONNS.set(ctx.from, conn);
    await send(conn, ctx.from, `🔇 Group *${n} minute* ke liye band.\n🔓 Khud khul jayega.`, [], mek);
});

// ---------------------------------------------------------------- 3. badword (admin)
cmd({ pattern: 'badword', category: 'group', react: '🚫', desc: 'Group mein mana lafz: add / del / list', use: '.badword add lafz  |  .badword del lafz  |  .badword list', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const [sub, ...rest] = (ctx.q || '').trim().split(/\s+/);
    const w = rest.join(' ').toLowerCase().trim();
    const list = BADW[ctx.from] || (BADW[ctx.from] = []);
    switch ((sub || '').toLowerCase()) {
        case 'add':
            if (!w) return ctx.reply('Misal: *.badword add spamword*');
            if (!list.includes(w)) list.push(w);
            saveJson('badwords.json', BADW);
            return ctx.reply(`✅ "${w}" mana lafzon mein add ho gaya.${ctx.isBotAdmins ? '' : '\n⚠️ Bot admin nahi hai, is liye messages delete nahi kar sakega.'}`);
        case 'del': case 'remove':
            BADW[ctx.from] = list.filter(x => x !== w); saveJson('badwords.json', BADW);
            return ctx.reply(`✅ "${w}" hata diya.`);
        case 'clear':
            BADW[ctx.from] = []; saveJson('badwords.json', BADW);
            return ctx.reply('✅ Saari list saaf.');
        case 'list':
            return ctx.reply(list.length ? box('MANA LAFZ', list.map((x, i) => `┋⋄ ${i + 1}. ${x}`).join('\n')) : '📭 Abhi koi mana lafz nahi.');
        default:
            return ctx.reply('🚫 *.badword add lafz*\n🚫 *.badword del lafz*\n🚫 *.badword list*\n🚫 *.badword clear*\n\n_Admin ke ilawa jo bhi yeh lafz likhega, uska message delete ho jayega._');
    }
});

// ---------------------------------------------------------------- 4. antiflood (admin)
cmd({ pattern: 'antiflood', category: 'group', react: '🌊', desc: 'Spam/flood karne walon ke messages delete', use: '.antiflood on | off', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const v = (ctx.q || '').trim().toLowerCase();
    if (v === 'on') { if (needBotAdmin(ctx)) return; FLOOD[ctx.from] = true; saveJson('antiflood.json', FLOOD); return ctx.reply('✅ *Anti-flood ON*\nAdmin ke ilawa jo 8 second mein 7+ messages bheje, uske messages delete honge.'); }
    if (v === 'off') { delete FLOOD[ctx.from]; saveJson('antiflood.json', FLOOD); return ctx.reply('✅ Anti-flood OFF.'); }
    ctx.reply(`🌊 Anti-flood abhi: *${FLOOD[ctx.from] ? 'ON' : 'OFF'}*\nMisal: *.antiflood on* ya *.antiflood off*`);
});

// ---------------------------------------------------------------- 5. slowmode (admin)
cmd({ pattern: 'slowmode', category: 'group', react: '🐢', desc: 'Har member do messages ke beech kam az kam itne second rukay', use: '.slowmode 10  |  .slowmode off', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const v = (ctx.q || '').trim().toLowerCase();
    if (v === 'off') { delete SLOW[ctx.from]; saveJson('slowmode.json', SLOW); return ctx.reply('✅ Slowmode OFF.'); }
    const s = parseInt(v, 10);
    if (!s || s < 2 || s > 300) return ctx.reply(`🐢 Slowmode abhi: *${SLOW[ctx.from] ? SLOW[ctx.from] + ' sec' : 'OFF'}*\nMisal: *.slowmode 10* (2 se 300 second)  |  *.slowmode off*`);
    if (needBotAdmin(ctx)) return;
    SLOW[ctx.from] = s; saveJson('slowmode.json', SLOW);
    ctx.reply(`✅ *Slowmode ON: ${s} second*\nAdmin ke ilawa jo is se pehle dobara message karega, uska message delete hoga.`);
});

// ---------------------------------------------------------------- 6. tagmembers (admin)
cmd({ pattern: 'tagmembers', category: 'group', react: '📣', desc: 'Sirf members ko tag karo (admins ke baghair)', use: '.tagmembers ahem elan', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const ids = (ctx.participants || []).filter(p => !p.admin).map(p => p.id || p.jid).filter(id => num(id) !== num(conn.user.id));
    if (!ids.length) return ctx.reply('❌ Koi non-admin member nahi mila.');
    await send(conn, ctx.from, `📣 *${ctx.q || 'Sab members ke liye elan'}*\n\n${ids.map(a => `◦ @${num(a)}`).join('\n')}`, ids, mek);
});

// ---------------------------------------------------------------- 7. randomtag
cmd({ pattern: 'randomtag', category: 'groupfun', react: '🎲', desc: 'N random members ko tag karo', use: '.randomtag 5', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const n = Math.min(Math.max(parseInt(ctx.q, 10) || 5, 1), 20);
    const ids = shuffle(members(ctx, conn)).slice(0, n);
    if (!ids.length) return ctx.reply('❌ Members nahi mile.');
    await send(conn, ctx.from, `🎲 *RANDOM PICK (${ids.length})*\n\n${ids.map((a, i) => `${i + 1}. @${num(a)}`).join('\n')}`, ids, mek);
});

// ---------------------------------------------------------------- 8. teams
cmd({ pattern: 'teams', category: 'groupfun', react: '⚔️', desc: 'Members ko random teams mein baantna', use: '.teams 2', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const n = Math.min(Math.max(parseInt(ctx.q, 10) || 2, 2), 10);
    const ids = shuffle(members(ctx, conn));
    if (ids.length < n) return ctx.reply(`❌ ${n} teams ke liye kam az kam ${n} members chahiye.`);
    const teams = Array.from({ length: n }, () => []);
    ids.forEach((id, i) => teams[i % n].push(id));
    const icons = ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠', '⚫', '⚪', '🟤', '🩷'];
    await send(conn, ctx.from, `⚔️ *TEAMS*\n\n${teams.map((t, i) => `${icons[i]} *Team ${i + 1}* (${t.length})\n${t.map(a => `  @${num(a)}`).join('\n')}`).join('\n\n')}`, ids, mek);
});

// ---------------------------------------------------------------- 9. ghosts (admin)
cmd({ pattern: 'ghosts', category: 'group', react: '👻', desc: 'Woh members jinhon ne bot ke dekhte hue koi message nahi kiya', use: '.ghosts', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const c = COUNTS.c[ctx.from] || {};
    const since = COUNTS.since[ctx.from];
    const ids = (ctx.participants || []).map(p => p.id || p.jid).filter(id => id && num(id) !== num(conn.user.id) && !c[num(id)]);
    const days = since ? Math.max(1, Math.round((Date.now() - since) / 86400000)) : 0;
    if (!since) return ctx.reply('👻 Bot ne abhi is group mein messages ginna shuru kiya hai. Thodi der baad dobara try karo.');
    if (!ids.length) return ctx.reply(`🎉 Sab members ne pichle *${days} din* mein kuch na kuch likha!`);
    const shown = ids.slice(0, 60);
    await send(conn, ctx.from, `👻 *GHOST MEMBERS* (${ids.length})\n_Pichle ${days} din se koi message nahi_\n\n${shown.map((a, i) => `${i + 1}. @${num(a)}`).join('\n')}${ids.length > 60 ? `\n...aur ${ids.length - 60}` : ''}`, shown, mek);
});

// ---------------------------------------------------------------- 10. myrank
cmd({ pattern: 'myrank', category: 'groupfun', react: '🏅', desc: 'Is group mein tumhara message rank', use: '.myrank', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const c = COUNTS.c[ctx.from] || {};
    const me = num(ctx.sender);
    const sorted = Object.entries(c).sort((a, b) => b[1] - a[1]);
    const idx = sorted.findIndex(([n]) => n === me);
    if (idx === -1) return ctx.reply('🏅 Abhi tumhara koi message count nahi hua. Kuch likho, phir dobara poocho!');
    const medal = ['🥇', '🥈', '🥉'][idx] || '🏅';
    await send(conn, ctx.from, `${medal} *MY RANK*\n\n👤 @${me}\n📊 Rank: *#${idx + 1}* / ${sorted.length}\n💬 Messages: *${c[me]}*`, [ctx.sender], mek);
});

// ---------------------------------------------------------------- 11. exportmembers (admin)
cmd({ pattern: 'exportmembers', category: 'group', react: '📤', desc: 'Saare members ke numbers ki .txt file', use: '.exportmembers', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const rows = (ctx.participants || []).map((p, i) => {
        const jid = p.phoneNumber || p.jid || p.id || '';
        return `${i + 1}. ${String(jid).endsWith('@lid') ? '(hidden)' : '+' + num(jid)}${p.admin ? '  [admin]' : ''}`;
    });
    const text = `${ctx.groupName || 'Group'}\nMembers: ${rows.length}\n${'-'.repeat(24)}\n${rows.join('\n')}\n`;
    await conn.sendMessage(ctx.from, { document: Buffer.from(text, 'utf8'), mimetype: 'text/plain', fileName: `members-${rows.length}.txt`, caption: `📤 ${rows.length} members ki list` }, { quoted: mek });
});

// ---------------------------------------------------------------- 12. gcage
cmd({ pattern: 'gcage', category: 'groupfun', react: '🎂', desc: 'Group kab bana aur kitna purana hai', use: '.gcage', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const ts = ctx.groupMetadata && ctx.groupMetadata.creation;
    if (!ts) return ctx.reply('❌ Group ki creation date nahi mili.');
    const d = new Date(ts * 1000);
    const days = Math.floor((Date.now() - d) / 86400000);
    const y = Math.floor(days / 365), mo = Math.floor((days % 365) / 30);
    await ctx.reply(box('GROUP AGE', `┋⋄ 📅 Bana: *${d.toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'long', year: 'numeric' })}*\n┋⋄ ⏳ Umar: *${y ? y + ' saal ' : ''}${mo ? mo + ' mahine ' : ''}${!y && !mo ? days + ' din' : '(' + days + ' din)'}*\n┋⋄ 👥 Members: *${(ctx.participants || []).length}*`));
});

// ---------------------------------------------------------------- 13-14. birthdays
cmd({ pattern: 'birthday', category: 'groupfun', react: '🎂', desc: 'Apni salgirah save karo — bot subah 9 baje wish karega', use: '.birthday 25-12', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const mm = /^(\d{1,2})[-\/.](\d{1,2})$/.exec((ctx.q || '').trim());
    if (!mm) return ctx.reply('🎂 Misal: *.birthday 25-12*  (din-mahina)');
    const d = +mm[1], mo = +mm[2];
    if (mo < 1 || mo > 12 || d < 1 || d > new Date(2024, mo, 0).getDate()) return ctx.reply('❌ Sahi tareekh likho. Misal: *.birthday 25-12*');
    (BDAY[ctx.from] || (BDAY[ctx.from] = {}))[num(ctx.sender)] = { d, m: mo };
    saveJson('birthdays.json', BDAY);
    CONNS.set(ctx.from, conn);
    await send(conn, ctx.from, `🎂 @${num(ctx.sender)} ki salgirah *${d}-${mo}* save ho gayi!\n_Us din subah 9 baje bot wish karega._`, [ctx.sender], mek);
});
cmd({ pattern: 'birthdays', category: 'groupfun', react: '🎉', desc: 'Group ki aanay wali salgirahein', use: '.birthdays', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const b = BDAY[ctx.from] || {};
    const t = pk(); const today = new Date(t.y, t.m - 1, t.d);
    const rows = Object.entries(b).map(([n, x]) => {
        let nx = new Date(t.y, x.m - 1, x.d); if (nx < today) nx = new Date(t.y + 1, x.m - 1, x.d);
        return { n, ...x, left: Math.round((nx - today) / 86400000) };
    }).sort((a, c) => a.left - c.left).slice(0, 10);
    if (!rows.length) return ctx.reply('🎂 Abhi kisi ki salgirah save nahi. *.birthday 25-12* likho.');
    await send(conn, ctx.from, `🎉 *AANAY WALI SALGIRAHEIN*\n\n${rows.map(r => `🎂 @${r.n} — ${r.d}-${r.m} ${r.left === 0 ? '*(AAJ!)*' : `(${r.left} din baad)`}`).join('\n')}`, rows.map(r => `${r.n}@s.whatsapp.net`), mek);
});

// ---------------------------------------------------------------- 15. topic
const TOPICS = ['Aap ki zindagi ka sab se yaadgar din kaun sa tha?', 'Agar ek din ke liye invisible ho jao to kya karoge?', 'Chai ya coffee — aur kyun?', 'Aap ka sab se pasandida khana kaun sa hai?', 'Bachpan ka woh khel jo aaj bhi yaad aata hai?', 'Agar lottery lag jaye to pehla kaam kya karoge?', 'Aap ki zindagi ka sab se bada khwab kya hai?', 'Aap subah jaldi uthne wale ho ya raat ke ullu?', 'Koi aisi cheez jo aap ne is saal seekhi?', 'Aap ka sab se pasandida mulk ya shehar jahan jana chahte ho?', 'Agar kal se sirf ek hi khana kha sakte ho to kaun sa?', 'Aap ki favourite movie ya drama kaun sa hai?', 'Aap ke hisaab se dosti mein sab se zaroori cheez kya hai?', 'Aisi koi aadat jo aap chhodna chahte ho?', 'Agar waqt mein peeche ja sako to kis din mein jaoge?', 'Aap ka pehla phone kaun sa tha?', 'Biryani ya pulao — group ka faisla!', 'Aisi koi skill jo aap sab se pehle seekhna chahte ho?', 'Aap ke nazdeek ek perfect weekend kaisa hota hai?', 'Aap ko sab se zyada kis cheez par gussa aata hai?', 'Agar aap ek din ke liye PM ban jao to pehla hukam kya doge?', 'Sab se ajeeb cheez jo aap ne kabhi khayi?', 'Aap ka sab se pasandida gana kaun sa hai?', 'Koi aisi baat jo aap bachpan mein sach maante the aur ab hansi aati hai?', 'Aap barish mein kya karna pasand karte ho?', 'Agar aap ek superpower choose karo to kaunsi?', 'Aap ka sab se pasandida mausam kaun sa hai?', 'Aisi kaunsi cheez hai jis ke baghair aap ek din nahi guzar sakte?', 'Zindagi ka sab se achha mashwara jo kisi ne diya?', 'Abhi aap kya sun rahe ho ya dekh rahe ho?'];
cmd({ pattern: 'topic', category: 'groupfun', react: '💬', desc: 'Group chat chalane ke liye random sawal', use: '.topic', filename: __filename },
async (conn, mek, m, ctx) => { await ctx.reply(`💬 *AAJ KI BAAT*\n\n${pick(TOPICS)}\n\n_Sab jawab dein!_ 👇`); });

// ---------------------------------------------------------------- body handler: counting + moderation
const WORDRE = new Map();
const wordRegex = (w) => { if (!WORDRE.has(w)) WORDRE.set(w, new RegExp(`(^|[^a-z0-9\\u0600-\\u06ff])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9\\u0600-\\u06ff])`, 'i')); return WORDRE.get(w); };
const hist = new Map();           // gid|user -> timestamps (flood)
const last = new Map();           // gid|user -> last msg time (slowmode)
const noticeAt = new Map();       // rate-limit for warning texts
const notice = (conn, gid, user, text) => {
    const k = gid + '|' + user; if (Date.now() - (noticeAt.get(k) || 0) < 30000) return;
    noticeAt.set(k, Date.now()); send(conn, gid, text, [`${user}@s.whatsapp.net`]).catch(() => {});
};
const del = (conn, gid, key) => conn.sendMessage(gid, { delete: key }).catch(() => {});

cmd({ on: 'body', allowUnprefixedInGroups: true, dontAddCommandList: true, filename: __filename },
async (conn, mek, m, ctx) => {
    if (!ctx.isGroup || ctx.isMe || (mek.key && mek.key.fromMe)) return;
    const gid = ctx.from, user = num(ctx.sender);
    CONNS.set(gid, conn);

    // message counter (for .ghosts / .myrank)
    if (!COUNTS.since[gid]) COUNTS.since[gid] = Date.now();
    const gc = COUNTS.c[gid] || (COUNTS.c[gid] = {});
    gc[user] = (gc[user] || 0) + 1;
    saveJson('msgcounts.json', COUNTS);

    // moderation: only if bot is admin, and never against admins / owner
    if (!ctx.isBotAdmins || ctx.isAdmins || ctx.isOwner) return;
    const text = String(ctx.body || '').toLowerCase();
    const words = BADW[gid];
    if (words && words.length && text) {
        const hit = words.find(w => wordRegex(w).test(text));
        if (hit) { del(conn, gid, mek.key); notice(conn, gid, user, `🚫 @${user} yeh lafz is group mein mana hai.`); return; }
    }
    if (SLOW[gid]) {
        const k = gid + '|' + user, now = Date.now();
        if (now - (last.get(k) || 0) < SLOW[gid] * 1000) { del(conn, gid, mek.key); notice(conn, gid, user, `🐢 @${user} slowmode ON hai — ${SLOW[gid]} second ruko.`); return; }
        last.set(k, now);
    }
    if (FLOOD[gid]) {
        const k = gid + '|' + user, now = Date.now();
        const arr = (hist.get(k) || []).filter(t => now - t < 8000); arr.push(now); hist.set(k, arr);
        if (arr.length >= 7) { del(conn, gid, mek.key); notice(conn, gid, user, `🌊 @${user} spam mat karo, messages delete ho rahe hain.`); }
    }
});

// ---------------------------------------------------------------- scheduler (night mode, mutefor, birthdays)
const done = new Set();
const once = (key) => { if (done.has(key)) return false; done.add(key); if (done.size > 2000) done.clear(); return true; };
setInterval(async () => {
    try {
        const t = pk();
        for (const [gid, n] of Object.entries(NIGHT)) {
            const conn = CONNS.get(gid); if (!conn) continue;
            if (t.hm === n.lock && once(`L${gid}${t.date}${t.hm}`)) { await conn.groupSettingUpdate(gid, 'announcement').catch(() => {}); send(conn, gid, `🌙 *Night mode* — group band ho gaya.\n🔓 Subah *${n.unlock}* par khulega. Shab bakhair! 😴`).catch(() => {}); }
            if (t.hm === n.unlock && once(`U${gid}${t.date}${t.hm}`)) { await conn.groupSettingUpdate(gid, 'not_announcement').catch(() => {}); send(conn, gid, `☀️ *Subah bakhair!* Group khul gaya.`).catch(() => {}); }
        }
        for (const [gid, mu] of Object.entries(MUTES)) {
            const conn = CONNS.get(gid); if (!conn || Date.now() < mu.until) continue;
            delete MUTES[gid]; saveJson('mutefor.json', MUTES);
            await conn.groupSettingUpdate(gid, 'not_announcement').catch(() => {});
            send(conn, gid, '🔓 Mute ka waqt khatam — group khul gaya.').catch(() => {});
        }
        if (t.hm === '09:00') {
            for (const [gid, b] of Object.entries(BDAY)) {
                const conn = CONNS.get(gid); if (!conn) continue;
                const today = Object.entries(b).filter(([, x]) => x.d === t.d && x.m === t.m).map(([n]) => n);
                if (today.length && once(`B${gid}${t.date}`)) send(conn, gid, `🎂🎉 *HAPPY BIRTHDAY!*\n\n${today.map(n => `@${n}`).join(' ')}\n\nAllah aap ko sehat, khushi aur lambi umar de! 🥳🎁`, today.map(n => `${n}@s.whatsapp.net`)).catch(() => {});
            }
        }
    } catch (e) { /* scheduler must never crash the bot */ }
}, 30000).unref();
