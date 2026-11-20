// RIZO VOICECHANGE — 11 commands: vcboy vccartoon vcchild vcdeep vcecho vcgirl vcman vcmenu vcoff vcrobot vcwoman
//
//  OLD voice  : voice note ko REPLY karke .vcgirl (etc.)  -> badli hui voice wapas aati hai
//  NEW voices : owner chat mein .vcgirl likhe -> us chat mein owner ki har NAYI voice us awaaz mein badal jati hai
//               (doosron ki / purani voices kabhi nahi chhooi jatin)
//  STEALTH    : * command chat mein likhne par bot command message delete kar deta hai aur confirmation sirf
//                 "Message yourself" chat mein bhejta hai (samne wale ko kuch nahi dikhta)
//               * SECRET ROUTE (koi nishaan nahi): "Message yourself" mein voice record karo -> bot badal kar
//                 pichli ON chat mein normal voice note ki tarah bhej deta hai (delete/tombstone nahi hota)
//               * seedha chat mein voice bhejne par asli wali delete hoti hai -> samne wale ko
//                 "This message was deleted" dikh sakta hai (WhatsApp ki hadd, bot chhupa nahi sakta)
//  .vcoff     : is chat ke liye band (self chat mein likho to sab band)
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { cmd } = require('../arslan');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const ffmpegBin = (() => { try { return require('@ffmpeg-installer/ffmpeg').path; } catch (_) { return 'ffmpeg'; } })();

// pitch shift without changing speed: resample, then compensate tempo
const pitch = (f) => `aresample=48000,asetrate=48000*${f},aresample=48000,atempo=${(1 / f).toFixed(4)}`;
const VOICES = {
    vcboy:     { name: 'Boy',     emoji: '👦', desc: 'Naujawan ladke ki awaaz',   filter: pitch(0.90) },
    vccartoon: { name: 'Cartoon', emoji: '🐿️', desc: 'Chipmunk / cartoon awaaz',  filter: 'aresample=48000,asetrate=48000*1.75,aresample=48000' },
    vcchild:   { name: 'Child',   emoji: '🧒', desc: 'Bachche ki awaaz',          filter: pitch(1.5) },
    vcdeep:    { name: 'Deep',    emoji: '🎙️', desc: 'Bhaari gehri awaaz',        filter: pitch(0.68) },
    vcecho:    { name: 'Echo',    emoji: '🏔️', desc: 'Goonjti hui awaaz',         filter: 'aecho=0.8:0.88:60|120:0.4|0.25' },
    vcgirl:    { name: 'Girl',    emoji: '👧', desc: 'Ladki ki awaaz',            filter: pitch(1.32) },
    vcman:     { name: 'Man',     emoji: '👨', desc: 'Mard ki bhaari awaaz',      filter: pitch(0.80) },
    vcrobot:   { name: 'Robot',   emoji: '🤖', desc: 'Robot jaisi awaaz',         filter: "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75" },
    vcwoman:   { name: 'Woman',   emoji: '👩', desc: 'Aurat ki narm awaaz',       filter: pitch(1.18) }
};
const ORDER = ['vcboy', 'vccartoon', 'vcchild', 'vcdeep', 'vcecho', 'vcgirl', 'vcman', 'vcmenu', 'vcoff', 'vcrobot', 'vcwoman'];

const CHATS = new Map();            // chat jid -> voice key (only the OWNER's new voice notes in that chat)
let LAST = null;                    // most recently switched-on chat (target of the secret route)
const sync = () => { global.__vcAutoOn = CHATS.size > 0; };
sync();
let working = 0;

const bare = (j) => String(j || '').split('@')[0].split(':')[0];
const selfIds = (conn) => [conn.user && conn.user.id, conn.user && conn.user.lid].filter(Boolean).map(bare);
const isSelfChat = (conn, jid) => selfIds(conn).includes(bare(jid));
const selfJid = (conn) => `${bare(conn.user.id)}@s.whatsapp.net`;

const run = (args) => new Promise((resolve, reject) => execFile(ffmpegBin, args, { timeout: 60000 }, (err, so, se) => err ? reject(new Error((se || err.message || '').toString().split('\n').slice(-3).join(' ').slice(0, 200))) : resolve()));

async function convert(buffer, key) {
    const id = crypto.randomBytes(6).toString('hex');
    const inp = path.join(os.tmpdir(), `vc_${id}.in`);
    const out = path.join(os.tmpdir(), `vc_${id}.ogg`);
    fs.writeFileSync(inp, buffer);
    try {
        const base = ['-y', '-loglevel', 'error', '-i', inp, '-vn', '-af'];
        const tail = ['-c:a', 'libopus', '-b:a', '48k', '-ar', '48000', '-ac', '1', '-f', 'ogg', out];
        try { await run([...base, VOICES[key].filter, ...tail]); }
        catch (e) {
            if (key !== 'vcrobot') throw e;       // robot filter missing in some ffmpeg builds -> simpler robot
            await run([...base, 'aecho=0.8:0.88:6:0.5,tremolo=f=30:d=0.8', ...tail]);
        }
        return fs.readFileSync(out);
    } finally { for (const f of [inp, out]) fs.unlink(f, () => {}); }
}
const download = async (audioMsg) => {
    const stream = await downloadContentFromMessage(audioMsg, 'audio');
    const chunks = []; for await (const c of stream) chunks.push(c);
    return Buffer.concat(chunks);
};
// 'RZVC' marker lets us ignore our own converted notes (never visible to anyone)
const sendVoice = (conn, jid, buf, opts = {}) => conn.sendMessage(jid, { audio: buf, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { messageId: 'RZVC' + crypto.randomBytes(8).toString('hex').toUpperCase(), ...opts });
const quietDelete = (conn, mek) => conn.sendMessage(mek.key.remoteJid, { delete: mek.key }).catch(() => {});

// ---- the 9 voice commands
for (const key of Object.keys(VOICES)) {
    const v = VOICES[key];
    cmd({ pattern: key, category: 'voicechange', react: '', desc: `${v.name} voice — ${v.desc}`, use: `.${key} (purani voice ko reply karo, ya chat mein likho = nayi voices badlen)`, filename: __filename },
    async (conn, mek, m, ctx) => {
        const owner = ctx.isOwner || ctx.isCreator || ctx.isMe;
        // 1) reply on an old voice note -> convert that one (works for everyone)
        const qa = m.quoted && (m.quoted.msg && m.quoted.mtype === 'audioMessage' ? m.quoted.msg : null);
        if (qa) {
            try { await sendVoice(conn, ctx.from, await convert(await download(qa), key), { quoted: mek }); }
            catch (e) { await ctx.reply(`❌ Voice badalne mein masla: ${e.message}`); }
            return;
        }
        if (!owner) return ctx.reply(`🎧 Kisi *voice note* ko reply karke *.${key}* likho.`);

        // 2) owner: switch the mode on for a chat
        const digits = (ctx.q || '').replace(/\D/g, '');
        const inSelf = isSelfChat(conn, ctx.from);
        let target = ctx.from;
        if (digits.length >= 8) target = `${digits}@s.whatsapp.net`;                 // .vcgirl 923001234567
        else if (inSelf) {
            if (LAST) { CHATS.set(LAST, key); sync(); return ctx.reply(`${v.emoji} *${v.name}* ab pichli ON chat ke liye set ho gayi.\n🤫 Secret route: yahin (Message yourself) voice record karo — badal kar us chat mein chali jayegi.`); }
            return ctx.reply(`🤫 Kis chat ke liye? Us chat mein *.${key}* likho, ya yahan *.${key} 923001234567* likho.`);
        }
        CHATS.set(target, key); LAST = target; sync();
        const label = target.endsWith('@g.us') ? 'is group' : `+${bare(target)}`;
        const note = `${v.emoji} *${v.name} Voice ON* — ${label}\n\n✅ Is chat mein aap ki har *nayi* voice is awaaz mein badal jayegi (purani/doosron ki nahi).\n🤫 *Secret route:* yahin "Message yourself" mein voice record karo — bot normal voice ki tarah us chat mein bhej dega, koi nishaan nahi.\n🎧 Purani voice ke liye: usay reply karke *.${key}*\n⏹️ Band: us chat mein *.vcoff*`;
        if (!inSelf) {                                  // stealth: erase the command, tell only yourself
            await quietDelete(conn, mek);
            await conn.sendMessage(selfJid(conn), { text: note });
        } else await ctx.reply(note);
    });
}
// ---- vcoff
cmd({ pattern: 'vcoff', category: 'voicechange', react: '', desc: 'Voice change band karo', use: '.vcoff', filename: __filename },
async (conn, mek, m, ctx) => {
    const owner = ctx.isOwner || ctx.isCreator || ctx.isMe;
    if (!owner) return;
    const inSelf = isSelfChat(conn, ctx.from);
    const digits = (ctx.q || '').replace(/\D/g, '');
    let msg;
    if (inSelf && digits.length < 8) { const n = CHATS.size; CHATS.clear(); LAST = null; msg = n ? `⏹️ Sab chats ki voice change band (${n}).` : '⏹️ Voice change pehle se band hai.'; }
    else { const t = digits.length >= 8 ? `${digits}@s.whatsapp.net` : ctx.from; const had = CHATS.delete(t); if (LAST === t) LAST = null; msg = had ? '⏹️ Is chat ki voice change band. Ab awaaz normal jayegi.' : '⏹️ Is chat mein voice change pehle se band hai.'; }
    sync();
    if (!inSelf) { await quietDelete(conn, mek); await conn.sendMessage(selfJid(conn), { text: msg }); } else await ctx.reply(msg);
});
// ---- vcmenu
cmd({ pattern: 'vcmenu', category: 'voicechange', react: '', desc: 'Voice change ki list', use: '.vcmenu', filename: __filename },
async (conn, mek, m, ctx) => {
    const P = (require('../config').PREFIX || '.');
    const rows = ORDER.map(k => `│ ➤ *${P}${k.toUpperCase()}*`).join('\n');
    const here = CHATS.get(ctx.from);
    await ctx.reply(`┌══〔 🗣️ *VOICECHANGE* 〕══┐\n╰═╗\n${rows}\n╰══◇ *${ORDER.length} COMMANDS* ◇══╯\n\n🎧 *Kaise use karein*\n• *Purani voice:* usay reply karo *${P}vcgirl*\n• *Nayi voices:* chat mein *${P}vcdeep* likho (owner) — us chat mein aap ki har nayi voice badal jayegi\n• *Secret route:* "Message yourself" mein voice record karo, bot badal kar us chat mein bhej dega (koi nishaan nahi)\n• Band: *${P}vcoff*\n\n📌 Active chats: *${CHATS.size}* • yahan: *${here ? VOICES[here].name + ' ON' : 'OFF'}*`);
});

// ---- new voices of the OWNER
cmd({ on: 'audio', allowUnprefixedInGroups: true, dontAddCommandList: true, filename: __filename },
async (conn, mek, m, ctx) => {
    if (!mek.key.fromMe || !CHATS.size) return;                                // only the owner's own, only when something is ON
    if (String(mek.key.id || '').startsWith('RZVC')) return;                   // our own converted note
    const am = mek.message && mek.message.audioMessage;
    if (!am || !am.ptt || Number(am.seconds || 0) > 180) return;
    const chat = ctx.from;
    const selfRoute = isSelfChat(conn, chat);
    const target = selfRoute ? LAST : chat;
    const key = target && CHATS.get(target);
    if (!key) return;
    // a voice note only counts as "new" if it was just sent (old/forwarded history is never touched)
    const ts = Number(mek.messageTimestamp && (mek.messageTimestamp.low !== undefined ? mek.messageTimestamp.low : mek.messageTimestamp)) || 0;
    if (ts && Date.now() / 1000 - ts > 90) return;
    if (working >= 3) return;
    working++;
    try {
        const out = await convert(await download(am), key);
        await sendVoice(conn, target, out);                                    // looks like a normal voice from you
        if (selfRoute) await conn.sendMessage(chat, { react: { text: '✅', key: mek.key } }).catch(() => {});
        else await quietDelete(conn, mek);                                     // swap in place (the original is removed)
    } catch (e) { console.log('[vc] auto convert failed:', e.message); }
    finally { working--; }
});
