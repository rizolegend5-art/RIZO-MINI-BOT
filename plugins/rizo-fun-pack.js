// RIZO FUN PACK — 30 interactive group commands (games, picks, ranks, daily stuff). Offline, no API keys.
const fs = require('fs');
const path = require('path');
const { cmd } = require('../arslan');

// ---------------------------------------------------------------- helpers
const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data', 'db');
try { fs.mkdirSync(DATA, { recursive: true }); } catch (_) {}
const loadJson = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch (_) { return d; } };
let wt;
const saveJson = (f, obj) => { clearTimeout(wt); wt = setTimeout(() => { try { fs.writeFileSync(path.join(DATA, f), JSON.stringify(obj)); } catch (_) {} }, 500); if (wt.unref) wt.unref(); };
const num = (j) => String(j || '').split('@')[0].split(':')[0];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rint = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const seeded = (str) => { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } let a = h >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
const box = (t, b) => `╭┈───〔 *${t}* 〕┈───⊷\n${b}\n╰─────────────────────⊷`;
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff ]/g, '').replace(/\s+/g, ' ').trim();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const send = (conn, gid, text, mentions = [], quoted) => conn.sendMessage(gid, { text, mentions }, quoted ? { quoted } : undefined);
const members = (ctx, conn) => { const me = num(conn.user && conn.user.id); return (ctx.participants || []).map(p => p.id || p.jid).filter(Boolean).filter(id => num(id) !== me); };
const needGroup = (ctx) => { if (!ctx.isGroup) { ctx.reply('❌ Yeh command sirf *group* mein chalti hai.'); return true; } return false; };
const target = (m, ctx) => { const i = m.msg && m.msg.contextInfo; return (i && i.mentionedJid && i.mentionedJid[0]) || (m.quoted && m.quoted.sender) || ctx.sender; };
const medal = (i) => ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][i] || '▫️';

// ---------------------------------------------------------------- game engine (one active game per group)
const GAME = {};
const SCORES = loadJson('gamescores.json', {});
const addScore = (gid, user, pts = 1) => { const g = SCORES[gid] || (SCORES[gid] = {}); g[user] = (g[user] || 0) + pts; saveJson('gamescores.json', SCORES); };
const endGame = (gid) => { if (GAME[gid]) { clearTimeout(GAME[gid].timer); delete GAME[gid]; } };
const startGame = async (conn, mek, ctx, game, text) => {
    if (GAME[ctx.from]) return ctx.reply('⏳ Is group mein pehle se ek game chal raha hai.\nKhatam karne ke liye: *.giveup*');
    game.startedAt = Date.now();
    GAME[ctx.from] = game;
    game.timer = setTimeout(() => {
        if (GAME[ctx.from] !== game) return;
        delete GAME[ctx.from];
        send(conn, ctx.from, game.timeoutText ? game.timeoutText(game) : `⌛ Waqt khatam! Jawab tha: *${game.reveal}*`).catch(() => {});
    }, game.ms || 60000);
    if (game.timer.unref) game.timer.unref();
    await send(conn, ctx.from, text, [], mek);
};
const win = async (conn, ctx, game, extra = '') => {
    const secs = ((Date.now() - game.startedAt) / 1000).toFixed(1);
    addScore(ctx.from, num(ctx.sender), game.points || 1);
    endGame(ctx.from);
    await send(conn, ctx.from, `🏆 *@${num(ctx.sender)} jeet gaya!*\n✅ Jawab: *${game.reveal}*\n⏱️ ${secs} second${extra}\n\n_Score board: *.gamescore*_`, [ctx.sender]);
};

const WORDS = ['pakistan', 'karachi', 'computer', 'whatsapp', 'biryani', 'cricket', 'mobile', 'internet', 'zindagi', 'mohabbat', 'chocolate', 'elephant', 'football', 'universe', 'keyboard', 'battery', 'sunshine', 'mountain', 'medicine', 'hospital', 'festival', 'library', 'umbrella', 'calendar', 'birthday', 'champion', 'mystery', 'courage', 'treasure', 'adventure', 'friendship', 'lightning', 'butterfly', 'telephone', 'dinosaur'];
const SENTENCES = ['The quick brown fox jumps over the lazy dog', 'Practice makes a man perfect', 'Rizo bot is the fastest bot in town', 'Sabr ka phal meetha hota hai', 'Every cloud has a silver lining', 'Time and tide wait for no man', 'Good friends are better than gold', 'Hard work always pays off in the end', 'Dosti sab se pyara rishta hai', 'Knowledge is power so keep learning'];
const EMOJIQ = [['🦁👑', ['lion king']], ['🕷️🧍‍♂️', ['spiderman', 'spider man']], ['🧊👸❄️', ['frozen']], ['🚢💔🌊', ['titanic']], ['🍎📱', ['apple', 'iphone']], ['🌙☀️🌍', ['universe', 'space', 'sky']], ['🐍🍎👩', ['adam hawa', 'eve', 'snake']], ['⚽🏆🌍', ['world cup', 'fifa']], ['🍕🇮🇹', ['pizza', 'italy']], ['🏏🏆🇵🇰', ['cricket', 'pakistan']], ['🕌🌙⭐', ['eid', 'ramzan', 'ramadan', 'masjid']], ['🐢🐇🏁', ['kachwa aur khargosh', 'tortoise and hare', 'race']], ['🎂🕯️🎉', ['birthday', 'salgirah']], ['🍛🍚🔥', ['biryani']], ['📚✏️🏫', ['school', 'madrasa', 'padhai']], ['🦇🌃🤵', ['batman']], ['🧙‍♂️⚡👓', ['harry potter']], ['🚗💨🏁', ['race', 'f1', 'formula 1']], ['☕🌧️', ['chai', 'tea']], ['👻🏚️', ['bhoot', 'ghost', 'haunted house']]];
const PAHELI = [
    ['Woh kya hai jo jitna sukhaao utna bheegta hai?', ['tauliya', 'towel']],
    ['Mere paas shehar hain par makaan nahi, nadiyan hain par paani nahi. Main kya hoon?', ['naqsha', 'map']],
    ['Woh kya hai jo bina pairon ke chalta rehta hai?', ['waqt', 'time', 'ghari', 'clock']],
    ['Woh kya hai jo tumhara hai magar doosre zyada istemal karte hain?', ['naam', 'name']],
    ['Chaar pair hain par chal nahi sakti. Kya hai?', ['kursi', 'mez', 'table', 'chair']],
    ['Subah 4 pairon par, dopahar 2 par, shaam 3 par chalta hai. Kaun?', ['insan', 'insaan', 'human', 'banda']],
    ['Mere paas chaabiyan hain par koi taala nahi khol sakti. Main kya hoon?', ['keyboard', 'piano']],
    ['Chhote se ghar mein 32 sipahi. Kya hai?', ['daant', 'teeth', 'dant']],
    ['Haath hain magar taali nahi baja sakti. Kya hai?', ['ghari', 'clock', 'watch']],
    ['Rang-birangi hoon, barish ke baad aasman par aati hoon. Kaun?', ['dhanak', 'rainbow', 'qaus qazah']],
    ['Jitna zyada leti ho utna bada hota hai. Kya?', ['gaddha', 'gadha', 'hole', 'sorakh']],
    ['Woh kya hai jo bolta nahi par sab ko khabrein sunata hai?', ['akhbar', 'newspaper', 'tv', 'radio']]
];

// 1. numguess
cmd({ pattern: 'numguess', category: 'groupfun', react: '🔢', desc: 'Number guess game (1-100) — sab guess karo', use: '.numguess', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const n = rint(1, 100);
    await startGame(conn, mek, ctx, { type: 'num', answer: n, reveal: String(n), ms: 120000 }, '🔢 *NUMBER GUESS*\n\nMain ne *1 se 100* ke beech number socha hai.\nSab number likh kar guess karo! (2 minute)');
});
// 2. scramble
cmd({ pattern: 'scramble', category: 'groupfun', react: '🔀', desc: 'Ulta-seedha lafz seedha karo', use: '.scramble', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const w = pick(WORDS); let s; do { s = shuffle(w.split('')).join(''); } while (s === w);
    await startGame(conn, mek, ctx, { type: 'text', answers: [w], reveal: w, ms: 45000 }, `🔀 *SCRAMBLE*\n\nYeh lafz seedha karo:\n\n*${s.toUpperCase()}*\n\n_45 second — pehle jawab dene wala jeetega_`);
});
// 3. mathquiz
cmd({ pattern: 'mathquiz', category: 'groupfun', react: '🧮', desc: 'Jaldi hisaab lagao', use: '.mathquiz', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const a = rint(5, 40), b = rint(2, 20), op = pick(['+', '-', '×']);
    const ans = op === '+' ? a + b : op === '-' ? a - b : a * b;
    await startGame(conn, mek, ctx, { type: 'math', answer: ans, reveal: String(ans), ms: 30000 }, `🧮 *MATH QUIZ*\n\n*${a} ${op} ${b} = ?*\n\n_30 second — sab se pehle sahi jawab likho_`);
});
// 4. typerace
cmd({ pattern: 'typerace', category: 'groupfun', react: '⌨️', desc: 'Sab se tez type karo', use: '.typerace', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const s = pick(SENTENCES);
    await startGame(conn, mek, ctx, { type: 'type', answers: [norm(s)], reveal: s, ms: 60000 }, `⌨️ *TYPE RACE*\n\nYeh jumla bilkul aise likho:\n\n_${s}_\n\n_Pehle sahi likhne wala jeetega_`);
});
// 5. emojiquiz
cmd({ pattern: 'emojiquiz', category: 'groupfun', react: '😜', desc: 'Emoji dekh kar andaza lagao', use: '.emojiquiz', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const [e, a] = pick(EMOJIQ);
    await startGame(conn, mek, ctx, { type: 'text', answers: a.map(norm), reveal: a[0], ms: 45000 }, `😜 *EMOJI QUIZ*\n\n${e}\n\nYeh kya hai? Jawab likho! (45 second)`);
});
// 6. bujhpaheli
cmd({ pattern: 'bujhpaheli', category: 'groupfun', react: '🧩', desc: 'Pehli bujho', use: '.bujhpaheli', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const [q, a] = pick(PAHELI);
    await startGame(conn, mek, ctx, { type: 'text', answers: a.map(norm), reveal: a[0], ms: 60000 }, `🧩 *PAHELI*\n\n${q}\n\n_Jawab likho — 60 second_`);
});
// 7. wordchain
cmd({ pattern: 'shabdchain', category: 'groupfun', react: '🔗', desc: 'Lafz chain: pichle lafz ke aakhri harf se naya lafz', use: '.shabdchain', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const w = pick(['apple', 'sunshine', 'monkey', 'garden', 'rocket', 'tiger', 'ocean']);
    const game = { type: 'chain', last: w, used: new Set([w]), count: 0, ms: 90000, reveal: '', timeoutText: (g) => `🔗 Game khatam! Total *${g.count}* lafz bane. Shabaash! 👏` };
    await startGame(conn, mek, ctx, game, `🔗 *SHABD CHAIN*\n\nPehla lafz: *${w.toUpperCase()}*\nAb *${w.slice(-1).toUpperCase()}* se shuru hone wala koi bhi english lafz likho (kam az kam 3 harf, repeat nahi).\n_Har sahi lafz par 1 point. 90 second khamoshi par game khatam._`);
});
// 8. giveup
cmd({ pattern: 'giveup', category: 'groupfun', react: '🏳️', desc: 'Chalte hue game ka jawab dekho aur khatam karo', use: '.giveup', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const g = GAME[ctx.from];
    if (!g) return ctx.reply('🎮 Abhi koi game nahi chal raha.');
    endGame(ctx.from);
    await ctx.reply(g.type === 'chain' ? `🔗 Game khatam! Total *${g.count}* lafz bane.` : `🏳️ Game khatam. Jawab tha: *${g.reveal}*`);
});
// 9. gamescore
cmd({ pattern: 'gamescore', category: 'groupfun', react: '🏆', desc: 'Group ke games ka scoreboard', use: '.gamescore', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const rows = Object.entries(SCORES[ctx.from] || {}).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (!rows.length) return ctx.reply('🏆 Abhi kisi ne game nahi jeeta. *.numguess* ya *.mathquiz* try karo!');
    await send(conn, ctx.from, `🏆 *GAME SCOREBOARD*\n\n${rows.map(([n, s], i) => `${medal(i)} @${n} — *${s}* pt`).join('\n')}`, rows.map(([n]) => `${n}@s.whatsapp.net`), mek);
});

// game answers
cmd({ on: 'body', allowUnprefixedInGroups: true, dontAddCommandList: true, filename: __filename },
async (conn, mek, m, ctx) => {
    if (!ctx.isGroup || ctx.isCmd || ctx.isMe || (mek.key && mek.key.fromMe)) return;
    const g = GAME[ctx.from]; if (!g) return;
    const text = String(ctx.body || '').trim(); if (!text) return;
    if (g.type === 'num') {
        if (!/^\d{1,3}$/.test(text)) return;
        const n = +text;
        if (n === g.answer) return win(conn, ctx, g);
        return void send(conn, ctx.from, n < g.answer ? `⬆️ *${n}* se *zyada* hai` : `⬇️ *${n}* se *kam* hai`, [], mek);
    }
    if (g.type === 'math') { if (/^-?\d+$/.test(text) && +text === g.answer) return win(conn, ctx, g); return; }
    if (g.type === 'type') { if (norm(text) === g.answers[0]) return win(conn, ctx, g); return; }
    if (g.type === 'text') { const t = norm(text); if (t.length <= 40 && g.answers.some(a => t === a || (a.length > 3 && t.includes(a)))) return win(conn, ctx, g); return; }
    if (g.type === 'chain') {
        const w = text.toLowerCase();
        if (!/^[a-z]{3,15}$/.test(w) || w[0] !== g.last.slice(-1) || g.used.has(w)) return;
        g.used.add(w); g.last = w; g.count++;
        addScore(ctx.from, num(ctx.sender), 1);
        clearTimeout(g.timer);
        g.timer = setTimeout(() => { if (GAME[ctx.from] === g) { delete GAME[ctx.from]; send(conn, ctx.from, g.timeoutText(g)).catch(() => {}); } }, g.ms);
        if (g.timer.unref) g.timer.unref();
        return void send(conn, ctx.from, `✅ *${w.toUpperCase()}* → ab *${w.slice(-1).toUpperCase()}* se`, [], mek);
    }
});

// ---------------------------------------------------------------- picks & fun
const MOSTLIKELY = ['sab se pehle shaadi karega', 'lottery jeet kar gayab ho jayega', 'raat bhar jaagta rahega', 'pizza ke liye ladai karega', 'class mein soye ga', 'sab se zyada selfies lega', 'billionaire banega', 'bina khaye 1 din nahi guzar sakta', 'phone gum kar dega', 'bus mein sone wala hoga'];
// 10
cmd({ pattern: 'mostlikely', category: 'groupfun', react: '🤔', desc: 'Kaun is kaam ke sab se zyada qareeb hai?', use: '.mostlikely raat bhar jaagega', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const ids = members(ctx, conn); if (!ids.length) return ctx.reply('❌ Members nahi mile.');
    const w = pick(ids);
    await send(conn, ctx.from, `🤔 *MOST LIKELY TO...*\n\n_${ctx.q || pick(MOSTLIKELY)}_\n\n👉 @${num(w)}`, [w], mek);
});
const AWARDS = ['Best Smile 😁', 'Kanjoos No.1 🪙', 'Late-Night Owl 🦉', 'Funniest Banda 😂', 'Sab se Samajhdar 🧠', 'Foodie King 🍔', 'Silent Hero 🤫', 'Chat Champion 💬', 'Style Icon 😎', 'Sab ka Dost 🤝', 'Neend ka Shehzada 😴', 'Selfie Star 🤳'];
// 11
cmd({ pattern: 'awards', category: 'groupfun', react: '🏅', desc: 'Members ko mazaiya awards', use: '.awards', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const ids = shuffle(members(ctx, conn)); if (ids.length < 3) return ctx.reply('❌ Kam az kam 3 members chahiye.');
    const aw = shuffle(AWARDS).slice(0, Math.min(6, ids.length));
    await send(conn, ctx.from, `🏅 *GROUP AWARDS*\n\n${aw.map((a, i) => `${a}\n   👉 @${num(ids[i])}`).join('\n\n')}\n\n_Sirf mazaq!_ 🎉`, ids.slice(0, aw.length), mek);
});
// 12
cmd({ pattern: 'friendzone', category: 'groupfun', react: '💍', desc: 'Marry / Date / Friendzone — 3 random members', use: '.friendzone', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const ids = shuffle(members(ctx, conn)); if (ids.length < 3) return ctx.reply('❌ Kam az kam 3 members chahiye.');
    const [a, b, c] = ids;
    await send(conn, ctx.from, `💍 *MARRY • DATE • FRIENDZONE*\n\n💍 Shaadi: @${num(a)}\n💞 Date: @${num(b)}\n🤝 Friendzone: @${num(c)}\n\n_Dil par mat lena!_ 😜`, [a, b, c], mek);
});
// 13
cmd({ pattern: 'hotpotato', category: 'groupfun', react: '💣', desc: 'Bomb kis ke haath mein phate ga?', use: '.hotpotato', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const ids = members(ctx, conn); if (ids.length < 2) return ctx.reply('❌ Members nahi mile.');
    const w = pick(ids);
    await send(conn, ctx.from, '💣 *HOT POTATO*\n\nBomb ghoom raha hai... sab dua karo! 😬', [], mek);
    await sleep(3000); await send(conn, ctx.from, '3️⃣... 2️⃣... 1️⃣...');
    await sleep(2500); await send(conn, ctx.from, `💥 *BOOM!* Bomb @${num(w)} ke haath mein phat gaya! 🤣\nSaza: sab ko chai pilao ☕`, [w]);
});
const TD = ['Apni sab se purani photo group mein bhejo', 'Group mein 1 minute tak sirf emojis mein baat karo', 'Apna sab se bada raaz batao (halka sa)', 'Kisi ko tareef bhara message likho', 'Apna favourite gaana gungunao aur voice note bhejo', 'Apni profile pic 1 ghante ke liye funny rakho', 'Aakhri baar kab roye the? batao', 'Group ke kisi bhi ek member ki tareef karo'];
// 14
cmd({ pattern: 'bottle', category: 'groupfun', react: '🍾', desc: 'Bottle ghumao — dare ya truth', use: '.bottle', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const ids = shuffle(members(ctx, conn)); if (ids.length < 2) return ctx.reply('❌ Kam az kam 2 members chahiye.');
    await send(conn, ctx.from, `🍾 *SPIN THE BOTTLE*\n\n@${num(ids[0])} ne bottle ghumayi... aur ruki @${num(ids[1])} par! 😳\n\n🎯 Task: *${pick(TD)}*`, [ids[0], ids[1]], mek);
});
const PUNISH = ['Sab ko chai pilao ☕', '5 minute tak group mein sirf "ji huzoor" likho 🙇', 'Apni profile pic par moonchein lagao 🥸', 'Sab ko ek joke sunao 😂', 'Ek shayari likho 📝', '10 baar "main hi sab se achha hoon" likho 😎', 'Next 3 messages UPPERCASE mein likho 🔠'];
// 15
cmd({ pattern: 'roulette', category: 'groupfun', react: '🎰', desc: 'Aaj kis ki baari? (mazaiya saza)', use: '.roulette', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const ids = members(ctx, conn); if (!ids.length) return ctx.reply('❌ Members nahi mile.');
    const w = pick(ids);
    await send(conn, ctx.from, `🎰 *ROULETTE*\n\nChakkar ghooma... aur nishana laga @${num(w)} par! 🎯\n\n😈 Saza: *${pick(PUNISH)}*`, [w], mek);
});
// 16 starofday
cmd({ pattern: 'starofday', category: 'groupfun', react: '⭐', desc: 'Aaj ka group star (din bhar wahi rehta hai)', use: '.starofday', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const ids = members(ctx, conn).sort(); if (!ids.length) return ctx.reply('❌ Members nahi mile.');
    const r = seeded(ctx.from + today());
    const w = ids[Math.floor(r() * ids.length)];
    await send(conn, ctx.from, `⭐ *AAJ KA STAR* ⭐\n\n👑 @${num(w)}\n\n_Aaj sab is ki izzat karein!_ 🎉\n📅 ${today()}`, [w], mek);
});
const T5 = ['Handsome / Beautiful', 'Samajhdar', 'Kanjoos', 'Funny', 'Neend ke shokeen', 'Khane ke shokeen', 'Late replier', 'Sab se shareef'];
// 17
cmd({ pattern: 'top5', category: 'groupfun', react: '📊', desc: 'Kisi bhi category ke top 5 (mazaiya)', use: '.top5 funny', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const ids = shuffle(members(ctx, conn)).slice(0, 5); if (ids.length < 2) return ctx.reply('❌ Kam az kam 2 members chahiye.');
    await send(conn, ctx.from, `📊 *TOP ${ids.length}: ${(ctx.q || pick(T5)).toUpperCase()}*\n\n${ids.map((a, i) => `${medal(i)} @${num(a)}`).join('\n')}\n\n_Sirf mazaq, bura na maanna!_ 😄`, ids, mek);
});
// 18 gcmood
cmd({ pattern: 'gcmood', category: 'groupfun', react: '🌡️', desc: 'Group ka mood meter', use: '.gcmood', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const bar = (v) => '▰'.repeat(Math.round(v / 10)) + '▱'.repeat(10 - Math.round(v / 10));
    const rows = [['😂 Mazaaq', rint(30, 100)], ['🔥 Josh', rint(20, 100)], ['😴 Neend', rint(10, 90)], ['🌪️ Hungama', rint(20, 100)], ['🕊️ Sukoon', rint(10, 90)]];
    await ctx.reply(box('GROUP MOOD', rows.map(([l, v]) => `┋⋄ ${l}: *${v}%*\n┋   ${bar(v)}`).join('\n')));
});
// 19 gcrate
cmd({ pattern: 'gcrate', category: 'groupfun', react: '⭐', desc: 'Is group ki rating (roz badalti hai)', use: '.gcrate', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const r = seeded(ctx.from + today());
    const rows = ['Mazaa', 'Dosti', 'Hungama', 'Akal', 'Khana-peena'].map(l => [l, Math.floor(r() * 4) + 7]);
    const avg = (rows.reduce((a, b) => a + b[1], 0) / rows.length).toFixed(1);
    await ctx.reply(box(`${(ctx.groupName || 'GROUP').toUpperCase().slice(0, 18)} RATING`, rows.map(([l, v]) => `┋⋄ ${l}: ${'⭐'.repeat(Math.round(v / 2))} *${v}/10*`).join('\n') + `\n┋⋄ 🏆 Overall: *${avg}/10*`));
});
// 20 santa
cmd({ pattern: 'santa', category: 'groupfun', react: '🎅', desc: 'Secret Santa jodiyan', use: '.santa', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const ids = shuffle(members(ctx, conn)).slice(0, 30); if (ids.length < 3) return ctx.reply('❌ Kam az kam 3 members chahiye.');
    await send(conn, ctx.from, `🎅 *SECRET SANTA*\n\n${ids.map((a, i) => `🎁 @${num(a)} ➜ @${num(ids[(i + 1) % ids.length])}`).join('\n')}\n\n_Har koi apne ➜ wale ko tohfa de!_`, ids, mek);
});
const EITHER = [['Hamesha late', 'Hamesha jaldi'], ['Sirf biryani', 'Sirf pizza'], ['Phone ke baghair', 'Internet ke baghair'], ['Bohat paisa par tanha', 'Kam paisa par khush'], ['Gaarmi mein rehna', 'Sardi mein rehna'], ['Past dekhna', 'Future dekhna'], ['Udna seekhna', 'Gayab hona seekhna'], ['Har cheez ka jawab pata ho', 'Har cheez ka sawal pata ho'], ['Chai', 'Coffee'], ['Sab ki baatein sunna', 'Sab ka dimaag padhna'], ['Roz ghoomna', 'Roz sona'], ['Mashhoor hona', 'Ameer hona']];
// 21
cmd({ pattern: 'eitheror', category: 'groupfun', react: '🅰️', desc: 'Would you rather — A ya B?', use: '.eitheror', filename: __filename },
async (conn, mek, m, ctx) => {
    const [a, b] = pick(EITHER);
    await ctx.reply(`🤷 *A YA B?*\n\n🅰️ ${a}\n        — ya —\n🅱️ ${b}\n\n_Group mein A ya B likh kar jawab do!_`);
});
const NEVER = ['kabhi class se bhaga hoon', 'kabhi raat bhar jaaga hoon', 'kabhi kisi ka message dekh kar reply nahi kiya', 'kabhi bina bataye ghar se bahar gaya hoon', 'kabhi exam mein nakal ki hai', 'kabhi kisi se jhoot bola hai', 'kabhi mobile mein sota hoon', 'kabhi garam chai se zubaan jalayi hai', 'kabhi group mein galat message bhej diya', 'kabhi bina soche shopping ki hai'];
// 22
cmd({ pattern: 'neverever', category: 'groupfun', react: '🙈', desc: 'Never have I ever', use: '.neverever', filename: __filename },
async (conn, mek, m, ctx) => { await ctx.reply(`🙈 *MAINE KABHI NAHI...*\n\nMaine *${pick(NEVER)}*\n\n_Jis ne kiya ho woh 🙋 likhe!_`); });
const HOT = ['Biryani se behtar koi khana nahi', 'Subah ki chai aur raat ki chai alag cheezein hain', 'Sardi garmi se behtar hai', 'Group chat mein voice note bhejna zyada achha hai', 'Mobile ke baghair 1 din guzarna mumkin hai', 'Purane gaane naye gaanon se behtar hain', 'Cricket sab se bada khel hai', 'Raat ko jaldi sona sab se mushkil kaam hai', 'Pizza par ananas bilkul theek hai'];
// 23
cmd({ pattern: 'hottake', category: 'groupfun', react: '🌶️', desc: 'Behes shuru karne wali raye', use: '.hottake', filename: __filename },
async (conn, mek, m, ctx) => { await ctx.reply(`🌶️ *HOT TAKE*\n\n"${pick(HOT)}"\n\n_Sab apni raye dein: agree ✅ ya disagree ❌_`); });
const QUESTS = ['Aaj sab apni sab se achhi purani photo share karein', 'Aaj sab group mein ek achhi baat likhein', 'Aaj sab apna favourite gaana batayein', 'Aaj sab ek dost ki tareef karein', 'Aaj sab apna pehla phone yaad karein aur batayein', 'Aaj sab ek naya lafz seekhein aur group mein likhein', 'Aaj sab apna favourite khana batayein', 'Aaj kisi purane dost ko hello bolein'];
// 24
cmd({ pattern: 'dailyquest', category: 'groupfun', react: '🎯', desc: 'Aaj ka group challenge', use: '.dailyquest', filename: __filename },
async (conn, mek, m, ctx) => {
    const r = seeded((ctx.from || '') + today());
    await ctx.reply(`🎯 *AAJ KA CHALLENGE*\n📅 ${today()}\n\n${QUESTS[Math.floor(r() * QUESTS.length)]}\n\n_Poora karo aur group ko dikhao!_ 💪`);
});
// 25
cmd({ pattern: 'vibecheck', category: 'groupfun', react: '✨', desc: 'Aaj ka tumhara vibe', use: '.vibecheck @user', filename: __filename },
async (conn, mek, m, ctx) => {
    const t = target(m, ctx); const r = seeded(num(t) + today());
    const vibes = [['Chill 😎', 'Aaj aaram se guzaro'], ['Hyper ⚡', 'Aaj energy full hai'], ['Romantic 💘', 'Dil mein kuch kuch ho raha hai'], ['Philosopher 🧠', 'Aaj gehri baatein sochne ka din'], ['Savage 🔥', 'Aaj kisi se na uljhna'], ['Sleepy 😴', 'Aaj neend ka ghalba hai'], ['Hungry 🍔', 'Aaj khane ka mood hai']];
    const v = vibes[Math.floor(r() * vibes.length)];
    await send(conn, ctx.from || mek.key.remoteJid, `✨ *VIBE CHECK*\n\n👤 @${num(t)}\nVibe: *${v[0]}*\nPower: *${Math.floor(r() * 41) + 60}%*\n💬 ${v[1]}`, [t], mek);
});
const ADJ = ['Thunder', 'Royal', 'Savage', 'Silent', 'Golden', 'Desi', 'Crazy', 'Midnight', 'Turbo', 'Mighty'];
const NOUN = ['Wolves', 'Lions', 'Legends', 'Ninjas', 'Dragons', 'Falcons', 'Hunters', 'Kings', 'Rockets', 'Tigers'];
// 26
cmd({ pattern: 'teamname', category: 'groupfun', react: '🛡️', desc: 'Team ke liye cool naam', use: '.teamname', filename: __filename },
async (conn, mek, m, ctx) => {
    const names = new Set(); while (names.size < 5) names.add(`${pick(ADJ)} ${pick(NOUN)}`);
    await ctx.reply(`🛡️ *TEAM NAMES*\n\n${[...names].map((n, i) => `${i + 1}. *${n}*`).join('\n')}`);
});
// 27
cmd({ pattern: 'gcslogan', category: 'groupfun', react: '📣', desc: 'Group ke liye slogan', use: '.gcslogan', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const n = ctx.groupName || 'Hamara Group';
    await ctx.reply(`📣 *SLOGAN*\n\n${pick([`${n} — jahan har din eid hai! 🎉`, `${n} — dosti, hansi aur biryani! 🍛`, `${n} — yahan sab apne hain! ❤️`, `${n} — bas mazaa hi mazaa! 😎`, `${n} — hum sab ek hain! 🤝`])}`);
});
// 28
cmd({ pattern: 'shipname', category: 'groupfun', react: '🚢', desc: 'Do naamon ka jodi-naam banao', use: '.shipname Ali Sara', filename: __filename },
async (conn, mek, m, ctx) => {
    const a = (ctx.q || '').trim().split(/\s+/).filter(Boolean);
    if (a.length < 2) return ctx.reply('🚢 Do naam likho.\nMisal: *.shipname Ali Sara*');
    const [x, y] = a; const ship = x.slice(0, Math.ceil(x.length / 2)) + y.slice(Math.floor(y.length / 2));
    const p = Math.floor(seeded(norm(x + y))() * 41) + 60;
    await ctx.reply(`🚢 *SHIP NAME*\n\n${x} ❤️ ${y}\n\n💞 Jodi ka naam: *${ship}*\n📊 Compatibility: *${p}%*`);
});
const FN1 = ['Chai Wala', 'Biryani Lover', 'Raat ka', 'Sust', 'Super', 'Desi', 'Mashhoor', 'Chhota', 'Bada', 'Hungama'];
const FN2 = ['Don', 'Bhai', 'Baba', 'Ustaad', 'Shehzada', 'Khan', 'Sultan', 'Pehalwan', 'Genius', 'Boss'];
// 29
cmd({ pattern: 'funnick', category: 'groupfun', react: '🏷️', desc: 'Kisi ka mazaiya nickname', use: '.funnick @user', filename: __filename },
async (conn, mek, m, ctx) => {
    const t = target(m, ctx);
    await send(conn, ctx.from || mek.key.remoteJid, `🏷️ @${num(t)} ka naya naam:\n\n*${pick(FN1)} ${pick(FN2)}* 😂`, [t], mek);
});
const COOKIE = ['Aaj ek achhi khabar tumhara intezar kar rahi hai.', 'Sabr ka phal hamesha meetha hota hai.', 'Koi purana dost jald tumhe yaad karega.', 'Aaj kiya hua neik kaam kal wapas aayega.', 'Naya mauqa darwaze par hai — darwaza kholo.', 'Muskurahat sab se sasti sadqa hai.', 'Aaj kisi ko dil se shukriya kehna.', 'Tumhari mehnat jald rang layegi.'];
// 30
cmd({ pattern: 'cookie', category: 'groupfun', react: '🥠', desc: 'Fortune cookie', use: '.cookie', filename: __filename },
async (conn, mek, m, ctx) => { await ctx.reply(`🥠 *FORTUNE COOKIE*\n\n_${pick(COOKIE)}_`); });
