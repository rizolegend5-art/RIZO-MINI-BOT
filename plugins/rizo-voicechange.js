// RIZO VOICECHANGE — 11 commands: vcboy vccartoon vcchild vcdeep vcecho vcgirl vcman vcmenu vcoff vcrobot vcwoman
//  * Reply to a voice note / audio with .vcboy (etc.)  -> bot sends it back in the new voice
//  * Owner sends .vcgirl (no reply) -> AUTO mode: every voice note the owner sends is converted (original deleted)
//  * .vcoff stops auto mode, .vcmenu shows this list
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

let AUTO = null;                    // currently active voice key (owner's own voice notes)
const sync = () => { global.__vcAutoOn = Boolean(AUTO); };
sync();

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
const sendVoice = (conn, jid, buf, opts = {}) => conn.sendMessage(jid, { audio: buf, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { messageId: 'RZVC' + crypto.randomBytes(8).toString('hex').toUpperCase(), ...opts });

// ---- 9 voice commands
for (const key of Object.keys(VOICES)) {
    const v = VOICES[key];
    cmd({ pattern: key, category: 'voicechange', react: v.emoji, desc: `${v.name} voice — ${v.desc}`, use: `.${key} (voice note ko reply karo)`, filename: __filename },
    async (conn, mek, m, ctx) => {
        const qa = m.quoted && (m.quoted.msg && m.quoted.mtype === 'audioMessage' ? m.quoted.msg : null);
        if (qa) {
            try {
                const out = await convert(await download(qa), key);
                await sendVoice(conn, ctx.from, out, { quoted: mek });
            } catch (e) { await ctx.reply(`❌ Voice badalne mein masla: ${e.message}`); }
            return;
        }
        if (ctx.isOwner || ctx.isCreator || ctx.isMe) {
            AUTO = key; sync();
            return ctx.reply(`${v.emoji} *${v.name} Voice ON*\n\nAb aap ka har *voice note* is awaaz mein badal kar jayega (asli wala delete ho jayega).\n\n⏹️ Band karne ke liye: *.vcoff*\n🎧 Ya kisi voice note ko reply karke *.${key}* likho.`);
        }
        await ctx.reply(`🎧 Kisi *voice note* ko reply karke *.${key}* likho.`);
    });
}
// ---- vcoff
cmd({ pattern: 'vcoff', category: 'voicechange', react: '⏹️', desc: 'Voice change band karo', use: '.vcoff', filename: __filename },
async (conn, mek, m, ctx) => {
    const was = AUTO; AUTO = null; sync();
    await ctx.reply(was ? `⏹️ *${VOICES[was].name} Voice* band. Ab aap ki awaaz normal jayegi.` : '⏹️ Voice change pehle se band hai.');
});
// ---- vcmenu (same look as the category box)
cmd({ pattern: 'vcmenu', category: 'voicechange', react: '🗣️', desc: 'Voice change ki list', use: '.vcmenu', filename: __filename },
async (conn, mek, m, ctx) => {
    const P = (require('../config').PREFIX || '.');
    const rows = ORDER.map(k => `│ ➤ *${P}${k.toUpperCase()}*`).join('\n');
    await ctx.reply(`┌══〔 🗣️ *VOICECHANGE* 〕══┐\n╰═╗\n${rows}\n╰══◇ *${ORDER.length} COMMANDS* ◇══╯\n\n🎧 *Kaise use karein*\n• Voice note ko reply karo: *${P}vcgirl*\n• Ya (sirf owner) *${P}vcdeep* likho — phir aap ka har voice note badal kar jayega\n• Band: *${P}vcoff*\n\n📌 Abhi: *${AUTO ? VOICES[AUTO].name + ' (auto ON)' : 'OFF'}*`);
});

// ---- auto mode: owner's own voice notes
cmd({ on: 'audio', allowUnprefixedInGroups: true, dontAddCommandList: true, filename: __filename },
async (conn, mek, m, ctx) => {
    if (!AUTO || !mek.key.fromMe) return;
    if (String(mek.key.id || '').startsWith('RZVC')) return;                 // our own converted note
    const am = mek.message && mek.message.audioMessage;
    if (!am || !am.ptt || Number(am.seconds || 0) > 180) return;
    try {
        const out = await convert(await download(am), AUTO);
        await sendVoice(conn, ctx.from, out);
        await conn.sendMessage(ctx.from, { delete: mek.key }).catch(() => {});
    } catch (e) { console.log('[vc] auto convert failed:', e.message); }
});
