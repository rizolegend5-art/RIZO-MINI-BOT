// RIZO PACK 30 — 8 stylish fonts, 7 shayari, 10 group tools, 5 extra features (all work offline, no API keys)
const fs = require('fs');
const path = require('path');
const { cmd } = require('../arslan');

// ---------------------------------------------------------------- helpers
const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data', 'db');
try { fs.mkdirSync(DATA, { recursive: true }); } catch (_) {}
const loadJson = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch (_) { return d; } };
const timers = {};
const saveJson = (f, obj) => {
    clearTimeout(timers[f]);
    timers[f] = setTimeout(() => { try { fs.writeFileSync(path.join(DATA, f), JSON.stringify(obj)); } catch (_) {} }, 400);
    if (timers[f].unref) timers[f].unref();
};
const num = (jid) => String(jid || '').split('@')[0].split(':')[0];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const seeded = (str) => {                       // stable pseudo-random per string
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
const getText = (m, q) => (q && q.trim()) || (m.quoted && m.quoted.text) || '';
const members = (ctx, conn) => {
    const me = num(conn.user && conn.user.id);
    return (ctx.participants || []).map(p => p.id || p.jid).filter(Boolean).filter(id => num(id) !== me);
};
const send = (conn, ctx, mek, text, mentions = []) => conn.sendMessage(ctx.from, { text, mentions }, { quoted: mek });
const needGroup = (ctx) => { if (!ctx.isGroup) { ctx.reply('❌ Yeh command sirf *group* mein chalti hai.'); return true; } return false; };
const box = (title, body) => `╭┈───〔 *${title}* 〕┈───⊷\n${body}\n╰─────────────────────⊷`;

// ---------------------------------------------------------------- font engine
const range = (up, low, dig) => (ch) => {
    const c = ch.codePointAt(0);
    if (c >= 65 && c <= 90) return String.fromCodePoint(up + c - 65);
    if (c >= 97 && c <= 122) return String.fromCodePoint(low + c - 97);
    if (dig !== undefined && c >= 48 && c <= 57) return String.fromCodePoint(dig + c - 48);
    return ch;
};
const mapText = (text, fn) => Array.from(text).map(fn).join('');
const smallMap = { a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ғ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'s',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ' };
const flipMap = { a:'ɐ',b:'q',c:'ɔ',d:'p',e:'ǝ',f:'ɟ',g:'ƃ',h:'ɥ',i:'ᴉ',j:'ɾ',k:'ʞ',l:'l',m:'ɯ',n:'u',o:'o',p:'d',q:'b',r:'ɹ',s:'s',t:'ʇ',u:'n',v:'ʌ',w:'ʍ',x:'x',y:'ʎ',z:'z','1':'⇂','2':'ᄅ','3':'Ɛ','4':'ㄣ','5':'ϛ','6':'9','7':'ㄥ','8':'8','9':'6','0':'0','?':'¿','!':'¡','.':'˙',',':"'" };
const dsExc = { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ' };
const bubble = (ch) => {
    const c = ch.codePointAt(0);
    if (c >= 65 && c <= 90) return String.fromCodePoint(0x24B6 + c - 65);
    if (c >= 97 && c <= 122) return String.fromCodePoint(0x24D0 + c - 97);
    if (c >= 49 && c <= 57) return String.fromCodePoint(0x2460 + c - 49);
    if (c === 48) return '⓪';
    return ch;
};
const wide = (ch) => {
    const c = ch.codePointAt(0);
    if (c >= 33 && c <= 126) return String.fromCodePoint(0xFF01 + c - 33);
    return ch;
};
const FONTS = {
    bold:      { label: 'Bold',        fn: (t) => mapText(t, range(0x1D5D4, 0x1D5EE, 0x1D7EC)) },
    italic:    { label: 'Italic',      fn: (t) => mapText(t, range(0x1D608, 0x1D622)) },
    bolditalic:{ label: 'Bold Italic', fn: (t) => mapText(t, range(0x1D63C, 0x1D656)) },
    script:    { label: 'Script',      fn: (t) => mapText(t, range(0x1D4D0, 0x1D4EA)) },
    gothic:    { label: 'Gothic',      fn: (t) => mapText(t, range(0x1D56C, 0x1D586)) },
    double:    { label: 'Double',      fn: (t) => mapText(t, (ch) => dsExc[ch] || range(0x1D538, 0x1D552, 0x1D7D8)(ch)) },
    mono:      { label: 'Mono',        fn: (t) => mapText(t, range(0x1D670, 0x1D68A, 0x1D7F6)) },
    bubble:    { label: 'Bubble',      fn: (t) => mapText(t, bubble) },
    square:    { label: 'Square',      fn: (t) => mapText(t, range(0x1F130, 0x1F130)) },
    blacksq:   { label: 'Black Square',fn: (t) => mapText(t, range(0x1F170, 0x1F170)) },
    blackcirc: { label: 'Black Circle',fn: (t) => mapText(t, range(0x1F150, 0x1F150)) },
    wide:      { label: 'Wide',        fn: (t) => mapText(t, wide) },
    smallcaps: { label: 'Small Caps',  fn: (t) => mapText(t, (ch) => smallMap[ch.toLowerCase()] || ch) },
    upside:    { label: 'Upside Down', fn: (t) => Array.from(t).map(ch => flipMap[ch.toLowerCase()] || ch).reverse().join('') },
    strike:    { label: 'Strike',      fn: (t) => Array.from(t).map(ch => ch === ' ' ? ch : ch + '\u0336').join('') },
    underline: { label: 'Underline',   fn: (t) => Array.from(t).map(ch => ch === ' ' ? ch : ch + '\u0332').join('') },
    sparkle:   { label: 'Sparkle',     fn: (t) => '✨ ' + mapText(t, range(0x1D4D0, 0x1D4EA)) + ' ✨' },
    hearts:    { label: 'Hearts',      fn: (t) => Array.from(t).join('♥') },
    dots:      { label: 'Dots',        fn: (t) => Array.from(t).map(ch => ch === ' ' ? ' ' : ch + '\u0307').join('') },
    slash:     { label: 'Slash',       fn: (t) => Array.from(t).map(ch => ch === ' ' ? ch : ch + '\u0338').join('') },
};

const fontCmd = (pattern, key, emoji, extra = {}) => cmd({
    pattern, category: 'stylish', react: emoji, desc: `Text ko ${FONTS[key].label} style mein badlo`, use: `.${pattern} RIZO`, filename: __filename, ...extra
}, async (conn, mek, m, ctx) => {
    const t = getText(m, ctx.q);
    if (!t) return ctx.reply(`✍️ Text likho ya kisi message ko reply karo.\nMisal: *.${pattern} Rizo Bot*`);
    await ctx.reply(FONTS[key].fn(t));
});

// 1
cmd({
    pattern: 'allfonts', category: 'stylish', react: '✍️', desc: 'Text ko saare stylish fonts mein dekho', use: '.allfonts RIZO', filename: __filename
}, async (conn, mek, m, ctx) => {
    const t = getText(m, ctx.q);
    if (!t) return ctx.reply('✍️ Text likho ya kisi message ko reply karo.\nMisal: *.allfonts Rizo Bot*');
    const out = Object.values(FONTS).map((f, i) => `*${i + 1}.* ${f.fn(t.slice(0, 60))}`).join('\n\n');
    await ctx.reply(box('ALL FONTS', out) + '\n\n_Copy karo jo pasand aaye_ ✨');
});
// 2-8
fontCmd('boldtext', 'bold', '🅱️');
fontCmd('scripttext', 'script', '🖋️');
fontCmd('gothictext', 'gothic', '🏰');
fontCmd('bubbletext', 'bubble', '🫧');
fontCmd('widetext', 'wide', '📐');
fontCmd('smallcaps', 'smallcaps', '🔡');
fontCmd('upsidedown', 'upside', '🙃');

// ---------------------------------------------------------------- shayari (original Roman Urdu)
const SHAYARI = {
    ishqshayari: ['❤️ ISHQ SHAYARI', [
        'Tere bina ye shehr bhi veeran lagta hai,\nTu saath ho to har safar aasan lagta hai.',
        'Ishq woh nahi jo lafzon mein bayan ho jaye,\nIshq woh hai jo khamoshi mein bhi jawan ho jaye.',
        'Teri aankhon mein dekha to khud ko bhool gaya,\nSach kahun to tujh mein hi apna jahan mil gaya.',
        'Chand bhi sharma jata hai jab tu muskurata hai,\nDil mera har dafa tujh par hi aa jata hai.',
        'Jahan tu ho wahin meri duniya basti hai,\nTere bina to har khushi bhi tarasti hai.',
        'Mohabbat ko kisi pehchan ki zaroorat nahi,\nDil jise chun le wohi meri jannat sahi.',
        'Dil ne tujhe chaha is qadar be-hisaab,\nKe teri ek muskaan par lutaa diya sab khwaab.',
        'Tere ek "haan" ke intezar mein umar guzar gayi,\nPar mohabbat meri teri yaad mein hi sanwar gayi.']],
    dardshayari: ['💔 DARD SHAYARI', [
        'Zakhm woh nahi jo jism par nazar aate hain,\nZakhm woh hain jo muskurate hue chhup jate hain.',
        'Hansi ke peeche chupa rakhe hain gham itne,\nKe ab to aansu bhi mujh se sharmane lage hain.',
        'Dard ko dil mein chhupana bhi ek hunar hai,\nWarna rone wale to har gali mein milte hain.',
        'Ab kisi se shikayat nahi karte hum,\nJis ne dard diya usay bhi dua dete hain hum.',
        'Tanhai se dosti ho gayi hai ab,\nBheed mein bhi akela rehna seekh liya hai.',
        'Aansu bhi na bole kuch, bas behte rahe,\nDil ke saare raaz chupke se kehte rahe.',
        'Toot kar bhi muskurana seekh liya humne,\nDuniya ke har dard ko apna lena seekh liya humne.',
        'Raat bhar jaagta raha tere khayal mein,\nSubah ko pata chala tu kisi aur ke saath tha.']],
    dostishayari: ['🤝 DOSTI SHAYARI', [
        'Dost woh nahi jo khushi mein saath de,\nDost woh hai jo gham mein tera haath de.',
        'Zindagi ke safar mein sab mil gaya mujhe,\nPar tum jaisa dost kismat se hi mila mujhe.',
        'Dosti woh rishta hai jo khoon ka nahi hota,\nPar dil ke sab rishton se gehra hota hai.',
        'Duniya ki bheed mein ek tu hi apna laga,\nTere saath har dard bhi sapna laga.',
        'Yaaron ki mehfil se badhkar koi jannat nahi,\nIn ki hansi ke aage koi daulat nahi.',
        'Tum saath ho to mushkil bhi aasan lagti hai,\nDosti teri meri zindagi ki shaan lagti hai.',
        'Dost bante nahi, kismat se milte hain,\nAur jo mil jayein, woh umar bhar chalte hain.',
        'Na paisa na shohrat, bas ek sacha yaar chahiye,\nJo har haal mein mera sahara bane, woh yaar chahiye.']],
    attitudeshayari: ['😎 ATTITUDE SHAYARI', [
        'Mera andaz hi alag hai, mera naam hi kaafi hai,\nJo samajh gaya woh apna, baaqi sab maafi hai.',
        'Log kehte hain badal gaya hoon main,\nUnhe kya pata, unhi ne badla hai mujhe.',
        'Shaukh nahi mujhe mehfil sajane ka,\nMera hone ka andaz hi mehfil ban jata hai.',
        'Jalne walon se kehdo, jalte rahein,\nHum to apni raah par chalte rahein.',
        'Waqt ne sikha diya kise kitni ahmiyat deni hai,\nAb dil sab ko nahi, sirf kuch ko jagah deta hai.',
        'Sher ko jungle mein apna naam batana nahi padta,\nUs ki ek dahaad hi kaafi hoti hai.',
        'Meri khamoshi ko meri kamzori mat samajhna,\nSamandar jitna gehra ho, utna hi shaant hota hai.',
        'Hum raaste dhoondte nahi, raaste banate hain,\nManzil khud chal kar hamare paas aati hai.']],
    zindagishayari: ['🌿 ZINDAGI SHAYARI', [
        'Zindagi ek safar hai, manzil nahi hai yaar,\nJo mile usay jee lo, kal ka kya aitbaar.',
        'Mushkilein aati hain to himmat bhi aati hai,\nWarna zindagi kab kisi ko sikha paati hai.',
        'Gir kar uthna hi to zindagi ki pehchan hai,\nJo na gira woh bhala kya jaane kya shaan hai.',
        'Har andhere ke baad ek roshan subah hoti hai,\nBas sabr rakho, kismat bhi kabhi khilkhilati hai.',
        'Jo tumhara hai woh tum tak zaroor aayega,\nSabr kar, waqt apna rang zaroor dikhayega.',
        'Zindagi se shikayat kya karna,\nJo diya usi ka shukr karna.',
        'Khushiyan dhoondne se pehle apne andar jhaank lo,\nSukoon wahin milega jahan se tum ne ummeed rakhna chhoda.',
        'Waqt kisi ka ghulam nahi, jo guzra wapas nahi aata,\nIs liye har pal ko jee lo, kal ka bharosa nahi.']],
    bewafashayari: ['🥀 BEWAFA SHAYARI', [
        'Tum ne chhoda to hum ne bhi sambhal liya khud ko,\nAb tere naam se bhi dil ko koi farq nahi padta.',
        'Bewafa ho ke bhi tu mujhe pyara hi laga,\nShayad meri mohabbat mein hi koi kami thi.',
        'Jin ke liye saari duniya chhodi humne,\nUn ke paas hamare liye ek pal bhi na tha.',
        'Wada kiya tha umar bhar ka saath dene ka,\nAur raaste mein hi chhod gaye tum humein.',
        'Ab na intezar hai na koi ummeed baaqi,\nTum ne sab kuch khatam kar diya, bas ek yaad baaqi.',
        'Chale gaye to ab lautna mat,\nHum ne dil ke darwaze ab band kar liye.',
        'Tere jaane ke baad ek sabaq mila hai mujhe,\nHar muskurahat sachi nahi hoti.',
        'Bewafai ka gham us se poochho jis ne wafa ki ho,\nWarna dard ka andaza lagana aasan nahi hota.']],
    maashayari: ['🤲 MAA SHAYARI', [
        'Maa ki dua jannat ki hawa hai,\nJis ke saaye mein har dard ki dawa hai.',
        'Duniya ki har daulat maa ke qadmon mein hai,\nMaa ki muskurahat hi meri jannat hai.',
        'Jab bhi musibat aayi, maa ki yaad aayi,\nUs ki dua ne har bala tal di.',
        'Maa ke haath ki roti mein jo swaad hai,\nWoh kisi shahi dastarkhwan mein nahi.',
        'Maa ka pyar bina sharto ke hota hai,\nBaaqi har rishta kuch na kuch maangta hai.',
        'Jo maa ke aansu pochh le woh sab se bada insaan hai,\nAur jo rula de woh sab se bada nadaan hai.',
        'Maa ke bina ghar sirf makaan hota hai,\nUs ke hone se hi us mein jaan hoti hai.',
        'Maa ki godi mein jo sukoon hai,\nWoh duniya ke kisi mehel mein nahi.']]
};
for (const [pattern, [title, list]] of Object.entries(SHAYARI)) {
    cmd({
        pattern, category: 'shayari', react: title.split(' ')[0], desc: `Random ${title.split(' ').slice(1, -1).join(' ')} shayari`, use: `.${pattern}`, filename: __filename
    }, async (conn, mek, m, ctx) => {
        await ctx.reply(`${title}\n\n${pick(list)}\n\n_Dobara likho: *.${pattern}* ✨_`);
    });
}

// ---------------------------------------------------------------- group tools
// 17. tag all admins (members can use it)
cmd({ pattern: 'calladmins', category: 'groupfun', react: '👑', desc: 'Saare admins ko ek saath bulao', use: '.calladmins madad chahiye', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const admins = (ctx.participants || []).filter(p => p.admin).map(p => p.id || p.jid);
    if (!admins.length) return ctx.reply('❌ Is group mein koi admin nahi mila.');
    const text = ctx.q ? ctx.q : 'Admins ki zaroorat hai!';
    await send(conn, ctx, mek, `👑 *ADMINS CALL*\n\n📢 ${text}\n\n${admins.map((a, i) => `${i + 1}. @${num(a)}`).join('\n')}`, admins);
});
// 18
cmd({ pattern: 'luckymember', category: 'groupfun', react: '🍀', desc: 'Group se ek lucky member chuno', use: '.luckymember', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const list = members(ctx, conn);
    if (!list.length) return ctx.reply('❌ Members nahi mile.');
    const w = pick(list);
    await send(conn, ctx, mek, `🍀 *LUCKY MEMBER*\n\nAaj ka lucky banda: @${num(w)} 🎉\nLuck: *${Math.floor(Math.random() * 41) + 60}%* ✨`, [w]);
});
// 19
cmd({ pattern: 'matchmaker', category: 'groupfun', react: '💞', desc: 'Group se random jodi banao', use: '.matchmaker', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const list = members(ctx, conn);
    if (list.length < 2) return ctx.reply('❌ Jodi ke liye kam az kam 2 members chahiye.');
    const [a, b] = shuffle(list);
    const pct = Math.floor(Math.random() * 51) + 50;
    await send(conn, ctx, mek, `💞 *MATCHMAKER*\n\n@${num(a)} ❤️ @${num(b)}\n\nCompatibility: *${pct}%*\n${'▰'.repeat(Math.round(pct / 10))}${'▱'.repeat(10 - Math.round(pct / 10))}\n\n_Mubarak ho jodi ko!_ 💍`, [a, b]);
});
// 20
cmd({ pattern: 'kingqueen', category: 'groupfun', react: '👑', desc: 'Group ka random King aur Queen', use: '.kingqueen', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const list = members(ctx, conn);
    if (list.length < 2) return ctx.reply('❌ Kam az kam 2 members chahiye.');
    const [k, q] = shuffle(list);
    await send(conn, ctx, mek, `👑 *ROYAL COURT*\n\n🤴 King: @${num(k)}\n👸 Queen: @${num(q)}\n\n_Sab salaam karo!_ 🙇`, [k, q]);
});
// 21-22 rules
const RULES = loadJson('rules.json', {});
cmd({ pattern: 'setrules', category: 'group', react: '📜', desc: 'Group ke rules set karo (admin)', use: '.setrules 1. Spam mat karo', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const t = getText(m, ctx.q);
    if (!t) return ctx.reply('📜 Rules likho.\nMisal: *.setrules 1. Spam mat karo\n2. Izzat se baat karo*');
    RULES[ctx.from] = { text: t, by: num(ctx.sender), at: Date.now() };
    saveJson('rules.json', RULES);
    ctx.reply('✅ Group rules save ho gaye. Ab koi bhi *.rules* likh kar dekh sakta hai.');
});
cmd({ pattern: 'rules', category: 'groupfun', react: '📜', desc: 'Group ke rules dekho', use: '.rules', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const r = RULES[ctx.from];
    if (!r) return ctx.reply('📜 Abhi koi rules set nahi. Admin *.setrules* se set kare.');
    await ctx.reply(box('GROUP RULES', r.text) + `\n\n_Set by +${r.by}_`);
});
// 23 afk
const AFK = loadJson('afk.json', {});
const ago = (ms) => { const s = Math.floor(ms / 1000); if (s < 60) return `${s}s`; const mi = Math.floor(s / 60); if (mi < 60) return `${mi} min`; const h = Math.floor(mi / 60); return h < 24 ? `${h} ghante ${mi % 60} min` : `${Math.floor(h / 24)} din`; };
cmd({ pattern: 'afk', category: 'groupfun', react: '😴', desc: 'AFK ho jao — koi tag kare to bot bata dega', use: '.afk neend aa rahi hai', filename: __filename },
async (conn, mek, m, ctx) => {
    const id = num(ctx.sender);
    AFK[id] = { reason: (ctx.q || 'Busy').slice(0, 100), since: Date.now() };
    saveJson('afk.json', AFK);
    await send(conn, ctx, mek, `😴 @${id} ab *AFK* hai\n📝 Wajah: ${AFK[id].reason}`, [ctx.sender]);
});
cmd({ on: 'body', allowUnprefixedInGroups: true, dontAddCommandList: true, filename: __filename },
async (conn, mek, m, ctx) => {
    if (!ctx.isGroup || !Object.keys(AFK).length) return;
    if (ctx.isCmd && ctx.command === 'afk') return;
    const me = num(ctx.sender);
    if (AFK[me]) {                                   // sender is back
        const d = AFK[me]; delete AFK[me]; saveJson('afk.json', AFK);
        await send(conn, ctx, mek, `👋 Welcome back @${me}!\nTum *${ago(Date.now() - d.since)}* AFK rahe.`, [ctx.sender]);
        return;
    }
    const info = m.msg && m.msg.contextInfo;           // someone tagged / replied to an AFK user
    const hit = new Set();
    for (const j of (info && info.mentionedJid) || []) if (AFK[num(j)]) hit.add(num(j));
    if (info && info.participant && AFK[num(info.participant)]) hit.add(num(info.participant));
    for (const id of hit) {
        const d = AFK[id];
        await send(conn, ctx, mek, `😴 @${id} abhi *AFK* hai\n📝 ${d.reason}\n⏱️ ${ago(Date.now() - d.since)} se`, [`${id}@s.whatsapp.net`]);
    }
});
// 24
cmd({ pattern: 'memberlist', category: 'groupfun', react: '📋', desc: 'Group ke saare members ki numbered list', use: '.memberlist', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const ids = (ctx.participants || []).map(p => p.id || p.jid).filter(Boolean);
    await send(conn, ctx, mek, `📋 *MEMBERS (${ids.length})*\n\n${ids.map((a, i) => `${i + 1}. @${num(a)}`).join('\n')}`, ids);
});
// 25 countries
const CC = { '92':'🇵🇰 Pakistan','91':'🇮🇳 India','1':'🇺🇸 USA/Canada','44':'🇬🇧 UK','971':'🇦🇪 UAE','966':'🇸🇦 Saudi','880':'🇧🇩 Bangladesh','20':'🇪🇬 Egypt','90':'🇹🇷 Turkey','62':'🇮🇩 Indonesia','234':'🇳🇬 Nigeria','98':'🇮🇷 Iran','93':'🇦🇫 Afghanistan','94':'🇱🇰 Sri Lanka','977':'🇳🇵 Nepal','60':'🇲🇾 Malaysia','7':'🇷🇺 Russia','49':'🇩🇪 Germany','33':'🇫🇷 France','61':'🇦🇺 Australia','968':'🇴🇲 Oman','974':'🇶🇦 Qatar','965':'🇰🇼 Kuwait','973':'🇧🇭 Bahrain','964':'🇮🇶 Iraq','963':'🇸🇾 Syria','962':'🇯🇴 Jordan','961':'🇱🇧 Lebanon','212':'🇲🇦 Morocco','213':'🇩🇿 Algeria','216':'🇹🇳 Tunisia','27':'🇿🇦 South Africa','254':'🇰🇪 Kenya','255':'🇹🇿 Tanzania','55':'🇧🇷 Brazil','52':'🇲🇽 Mexico','34':'🇪🇸 Spain','39':'🇮🇹 Italy','31':'🇳🇱 Netherlands','46':'🇸🇪 Sweden','81':'🇯🇵 Japan','82':'🇰🇷 Korea','86':'🇨🇳 China','65':'🇸🇬 Singapore','63':'🇵🇭 Philippines','66':'🇹🇭 Thailand','84':'🇻🇳 Vietnam' };
cmd({ pattern: 'gccountries', category: 'groupfun', react: '🌍', desc: 'Group members kin mulkon se hain', use: '.gccountries', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const count = {}; let unknown = 0;
    for (const p of (ctx.participants || [])) {
        const jid = p.phoneNumber || p.jid || p.id || '';
        if (String(jid).endsWith('@lid')) { unknown++; continue; }
        const n = num(jid); let name = null;
        for (const len of [3, 2, 1]) if (CC[n.slice(0, len)]) { name = CC[n.slice(0, len)]; break; }
        if (name) count[name] = (count[name] || 0) + 1; else unknown++;
    }
    const rows = Object.entries(count).sort((a, b) => b[1] - a[1]);
    if (!rows.length) return ctx.reply('❌ Numbers se mulk detect nahi ho paya (WhatsApp ne numbers chupa rakhe hain).');
    const total = (ctx.participants || []).length;
    await ctx.reply(box('MEMBERS BY COUNTRY', rows.map(([c, n]) => `┋⋄ ${c}: *${n}* (${Math.round(n / total * 100)}%)`).join('\n') + (unknown ? `\n┋⋄ ❓ Unknown: *${unknown}*` : '')));
});
// 26 giveaway (admin)
cmd({ pattern: 'giveaway', category: 'group', react: '🎁', desc: 'Giveaway winners chuno (admin)', use: '.giveaway 3 iPhone', filename: __filename },
async (conn, mek, m, ctx) => {
    if (needGroup(ctx)) return;
    const args = (ctx.q || '').trim().split(/\s+/).filter(Boolean);
    let n = parseInt(args[0], 10); let prize;
    if (Number.isInteger(n) && n > 0) prize = args.slice(1).join(' '); else { n = 1; prize = args.join(' '); }
    n = Math.min(n, 10);
    const list = members(ctx, conn).filter(id => num(id) !== num(ctx.sender));
    if (!list.length) return ctx.reply('❌ Members nahi mile.');
    const winners = shuffle(list).slice(0, n);
    await send(conn, ctx, mek, `🎁 *GIVEAWAY RESULT*\n\n🏆 Prize: *${prize || 'Surprise'}*\n\n${winners.map((w, i) => `${i + 1}. @${num(w)} 🎉`).join('\n')}\n\n_Mubarak ho!_ 🥳`, winners);
});

// ---------------------------------------------------------------- extra features
// 27
const EMO = { love:'❤️', pyar:'❤️', dil:'💖', happy:'😊', khush:'😊', sad:'😢', udaas:'😢', cry:'😭', rona:'😭', laugh:'😂', hasna:'😂', fire:'🔥', aag:'🔥', king:'👑', queen:'👸', star:'⭐', sitara:'⭐', sun:'☀️', suraj:'☀️', moon:'🌙', chand:'🌙', night:'🌃', raat:'🌃', morning:'🌅', subah:'🌅', food:'🍔', khana:'🍽️', chai:'☕', tea:'☕', coffee:'☕', money:'💰', paisa:'💰', car:'🚗', gaari:'🚗', home:'🏠', ghar:'🏠', phone:'📱', music:'🎵', gana:'🎵', dost:'🤝', friend:'🤝', bhai:'🤜', dua:'🤲', allah:'☝️', angry:'😡', gussa:'😡', sleep:'😴', neend:'😴', cool:'😎', bike:'🏍️', gift:'🎁', tohfa:'🎁', rose:'🌹', gulab:'🌹', baby:'👶', cat:'🐱', billi:'🐱', dog:'🐶', kutta:'🐶', ok:'👌', good:'👍', bad:'👎', win:'🏆', game:'🎮', book:'📚', kitab:'📚', time:'⏰', waqt:'⏰', world:'🌍', duniya:'🌍', rain:'🌧️', barish:'🌧️', ice:'🧊', hot:'🥵', garmi:'🥵', cold:'🥶', sardi:'🥶' };
cmd({ pattern: 'emojify', category: 'extras', react: '😎', desc: 'Text ke lafzon ko emoji se badlo', use: '.emojify mujhe chai aur pyar pasand hai', filename: __filename },
async (conn, mek, m, ctx) => {
    const t = getText(m, ctx.q);
    if (!t) return ctx.reply('😎 Text likho.\nMisal: *.emojify mujhe chai aur pyar pasand hai*');
    await ctx.reply(t.split(/(\s+)/).map(w => { const k = w.toLowerCase().replace(/[^a-z]/g, ''); return EMO[k] ? `${w} ${EMO[k]}` : w; }).join(''));
});
// 28
const TRAITS = ['Dil ka sacha', 'Mazaakiya', 'Dilchasp', 'Sharmeela', 'Leader type', 'Bohat samajhdar', 'Thoda pagal', 'Romantic', 'Mehnati', 'Khuddar', 'Rahmdil', 'Bindaas'];
cmd({ pattern: 'personality', category: 'extras', react: '🧠', desc: 'Kisi ki personality report (fun)', use: '.personality @user', filename: __filename },
async (conn, mek, m, ctx) => {
    const info = m.msg && m.msg.contextInfo;
    const target = (info && info.mentionedJid && info.mentionedJid[0]) || (m.quoted && m.quoted.sender) || ctx.sender;
    const r = seeded('p' + num(target));
    const bar = (v) => '▰'.repeat(Math.round(v / 10)) + '▱'.repeat(10 - Math.round(v / 10));
    const stat = (label, emoji) => { const v = Math.floor(r() * 41) + 60; return `${emoji} ${label}: *${v}%*\n${bar(v)}`; };
    const t = shuffle(TRAITS.map((x, i) => [x, r() + i * 0.0001])).sort((a, b) => a[1] - b[1]).slice(0, 3).map(x => x[0]);
    await send(conn, ctx, mek, `🧠 *PERSONALITY REPORT*\n👤 @${num(target)}\n\n${stat('Dimaag', '💡')}\n${stat('Humour', '😂')}\n${stat('Wafadari', '🤝')}\n${stat('Attitude', '😎')}\n${stat('Dil', '❤️')}\n\n🏷️ Type: *${t.join(' • ')}*\n_Sirf mazaq ke liye_ 😄`, [target]);
});
// 29
const COLORS = ['Laal ❤️', 'Neela 💙', 'Hara 💚', 'Peela 💛', 'Kala 🖤', 'Safaid 🤍', 'Jamni 💜', 'Narangi 🧡'];
const DIRS = ['Mashriq', 'Maghrib', 'Shumal', 'Junoob'];
const MOODS = ['Aaj dil ki suno 💫', 'Aaj kaam par focus karo 🎯', 'Aaj kisi ko surprise do 🎁', 'Aaj sabr se kaam lo 🌿', 'Aaj naya kuch seekho 📚', 'Aaj dosto ke saath waqt guzaro 🤝', 'Aaj paisa soch kar kharch karo 💰'];
cmd({ pattern: 'luckytoday', category: 'extras', react: '🍀', desc: 'Aaj ka lucky number, rang aur mood', use: '.luckytoday', filename: __filename },
async (conn, mek, m, ctx) => {
    const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
    const r = seeded(num(ctx.sender) + day);
    const hr = Math.floor(r() * 12) + 1; const ap = r() > 0.5 ? 'PM' : 'AM';
    await ctx.reply(box('AAJ KA NASEEB', [
        `┋⋄ 🔢 Lucky number: *${Math.floor(r() * 99) + 1}*`,
        `┋⋄ 🎨 Lucky rang: *${COLORS[Math.floor(r() * COLORS.length)]}*`,
        `┋⋄ ⏰ Lucky waqt: *${hr}:${String(Math.floor(r() * 6) * 10).padStart(2, '0')} ${ap}*`,
        `┋⋄ 🧭 Lucky simt: *${DIRS[Math.floor(r() * DIRS.length)]}*`,
        `┋⋄ 🍀 Luck: *${Math.floor(r() * 41) + 60}%*`,
        `┋⋄ 💬 ${MOODS[Math.floor(r() * MOODS.length)]}`].join('\n')) + `\n\n_Roz naya nateeja milega_ ✨`);
});
// 30 year progress
cmd({ pattern: 'yearprogress', category: 'extras', react: '📆', desc: 'Saal, mahina, hafta aur din ki progress', use: '.yearprogress', filename: __filename },
async (conn, mek, m, ctx) => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
    const y = now.getFullYear();
    const startY = new Date(y, 0, 1), endY = new Date(y + 1, 0, 1);
    const startM = new Date(y, now.getMonth(), 1), endM = new Date(y, now.getMonth() + 1, 1);
    const startD = new Date(y, now.getMonth(), now.getDate()), endD = new Date(startD.getTime() + 86400000);
    const wd = (now.getDay() + 6) % 7;                // Monday = 0
    const pc = (a, b) => Math.min(100, Math.max(0, Math.round((now - a) / (b - a) * 100)));
    const bar = (p) => '█'.repeat(Math.round(p / 10)) + '░'.repeat(10 - Math.round(p / 10));
    const rows = [['📆 Saal ' + y, pc(startY, endY)], ['🗓️ Mahina', pc(startM, endM)], ['📅 Hafta', Math.round(((wd + (now - startD) / 86400000) / 7) * 100)], ['🌗 Aaj ka din', pc(startD, endD)]];
    const left = Math.ceil((endY - now) / 86400000);
    await ctx.reply(box('YEAR PROGRESS', rows.map(([l, p]) => `┋⋄ ${l}\n┋   ${bar(p)} *${p}%*`).join('\n')) + `\n\n⏳ Saal khatam hone mein *${left} din* baaqi`);
});
// 30 captions
const CAPTIONS = {
    love:     ['Tum ho to sab kuch hai ❤️', 'Dil ne jise chuna, wohi meri duniya 💞', 'Ek tu hi kaafi hai meri khushi ke liye ✨'],
    attitude: ['Apni duniya ka king hoon 👑', 'Andaz alag, naam alag, shaan alag 😎', 'Jo mera nahi, uski parwah nahi 🔥'],
    sad:      ['Kuch dard lafzon mein nahi aate 🥀', 'Muskurahat ke peeche bohat kuch chhupa hai 💔', 'Khamoshi bhi ek jawab hoti hai 🌑'],
    funny:    ['Main sone ka shauqeen nahi, mujhe neend se pyar hai 😴', 'Diet kal se shuru, aaj biryani 🍛', 'Life mein tension nahi leni, sirf pension leni hai 😂'],
    travel:   ['Raaste khoobsurat hote hain jab manzil ka pata na ho 🌄', 'Duniya dekho, zindagi jee lo ✈️', 'Wahan chalo jahan wifi kam aur sukoon zyada ho 🏔️'],
    dosti:    ['Yaar wohi jo har haal mein saath ho 🤝', 'Dosto ke bina zindagi adhoori hai 💫', 'Hum yaar hain, yaari hamari pehchan hai 🔥']
};
cmd({ pattern: 'captions', category: 'extras', react: '📸', desc: 'Instagram/Status ke liye captions', use: '.captions love | attitude | sad | funny | travel | dosti', filename: __filename },
async (conn, mek, m, ctx) => {
    const k = (ctx.q || '').trim().toLowerCase();
    if (!CAPTIONS[k]) return ctx.reply(`📸 Category chuno:\n*.captions ${Object.keys(CAPTIONS).join('*\n*.captions ')}*`);
    await ctx.reply(`📸 *${k.toUpperCase()} CAPTION*\n\n${pick(CAPTIONS[k])}\n\n_Dobara likho: *.captions ${k}*_`);
});
