// RIZO VIDEO TEMPLATES — 23 commands. Reply to a video with any of them (optional caption text after the command).
//  .vtaesthetic .vtcinematic .vtdua .vtemplate .vtenergetic .vtfunny .vthumb .vtlove .vtmotivational .vtnight .vtogif
//  .vtomp3 .vtpoetry .vtrim .vtromantic .vtsad .vtsports .vttravel .vtvintage .vtviral .vvintage .vvivid .vwarm
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { cmd } = require('../arslan');

const ffmpegBin = (() => { try { return require('@ffmpeg-installer/ffmpeg').path; } catch (_) { return 'ffmpeg'; } })();
const FONT = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf'].find(f => fs.existsSync(f)) || null;
const BASE_SCALE = "scale='min(960,iw)':-2:flags=bicubic";

// name -> { title, emoji, desc, vf (colour grade) , speed?, complex? }
const T = {
    vtaesthetic:   { title: 'Aesthetic',   emoji: '🌸', desc: 'Naram pastel, dreamy look',        vf: 'eq=saturation=1.12:brightness=0.05:contrast=0.94,colorbalance=rs=0.06:bs=0.1:rh=0.05:bh=0.04,gblur=sigma=0.5,vignette=PI/5' },
    vtcinematic:   { title: 'Cinematic',   emoji: '🎬', desc: 'Movie bars + teal-orange grade',   vf: 'eq=contrast=1.14:saturation=1.08,colorbalance=rs=-0.06:bs=0.08:rh=0.08:bh=-0.07,drawbox=x=0:y=0:w=iw:h=ih*0.11:color=black:t=fill,drawbox=x=0:y=ih*0.89:w=iw:h=ih*0.11:color=black:t=fill,vignette=PI/6' },
    vtdua:         { title: 'Dua',         emoji: '🤲', desc: 'Sunehri, sukoon bhara fade-in',    vf: 'eq=brightness=0.03:saturation=0.9,colorbalance=rs=0.12:gs=0.06:bs=-0.1,gblur=sigma=0.7,fade=t=in:st=0:d=1.2' },
    vtenergetic:   { title: 'Energetic',   emoji: '⚡', desc: 'Tez rang, josheela look',           vf: 'eq=contrast=1.18:saturation=1.55,unsharp=5:5:0.9' },
    vtfunny:       { title: 'Funny',       emoji: '😂', desc: '1.3x tez + chatpate rang',         vf: 'eq=saturation=1.4,hue=h=8', speed: 1.3 },
    vtlove:        { title: 'Love',        emoji: '💖', desc: 'Gulabi-surkh mohabbat wala look',  vf: 'eq=saturation=1.2:brightness=0.02,colorbalance=rs=0.14:gs=-0.04:bs=0.05:rm=0.08,gblur=sigma=0.6,vignette=PI/4.5' },
    vtmotivational:{ title: 'Motivational',emoji: '🔥', desc: 'Gehra, powerful dark look',        vf: 'eq=contrast=1.28:saturation=0.72:brightness=-0.04,unsharp=5:5:0.7,vignette=PI/4' },
    vtnight:       { title: 'Night',       emoji: '🌙', desc: 'Neeli raat ka mood',                vf: 'eq=brightness=-0.09:contrast=1.08:saturation=0.8,colorbalance=rs=-0.08:bs=0.2:bm=0.1,vignette=PI/4' },
    vtpoetry:      { title: 'Poetry',      emoji: '✍️', desc: 'Purana kagaz + halka grain',       vf: 'colorchannelmixer=.45:.70:.15:0:.35:.62:.14:0:.25:.48:.12,eq=contrast=0.95:brightness=0.02,noise=alls=7:allf=t,vignette=PI/4' },
    vtromantic:    { title: 'Romantic',    emoji: '🌹', desc: 'Garam, narm romantic glow',         vf: 'eq=saturation=1.25:brightness=0.035:contrast=1.03,colorbalance=rs=0.1:gs=-0.02:bs=0.04:rh=0.06,gblur=sigma=0.8,vignette=PI/5' },
    vtsad:         { title: 'Sad',         emoji: '💔', desc: 'Phika, udaas neela look',          vf: 'hue=s=0.35,eq=contrast=1.06:brightness=-0.05,colorbalance=bs=0.14:bm=0.06,vignette=PI/4' },
    vtsports:      { title: 'Sports',      emoji: '🏆', desc: 'Sharp aur tez rang',               vf: 'eq=contrast=1.22:saturation=1.45,unsharp=7:7:1.2' },
    vttravel:      { title: 'Travel',      emoji: '✈️', desc: 'Roshan, vibrant safar',            vf: 'eq=saturation=1.38:brightness=0.04:contrast=1.08,colorbalance=rs=0.05:bs=-0.05,unsharp=5:5:0.5' },
    vtvintage:     { title: 'Vintage',     emoji: '📼', desc: 'Purani film ka rang + grain',      vf: 'curves=preset=vintage,noise=alls=10:allf=t,vignette=PI/3.5' },
    vvintage:      { title: 'Vintage Sepia', emoji: '🟤', desc: 'Gehra sepia + zyada grain',      vf: 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,noise=alls=14:allf=t+u,vignette=PI/3' },
    vvivid:        { title: 'Vivid',       emoji: '🌈', desc: 'Bohat gehre aur chamakdaar rang',  vf: 'eq=saturation=1.8:contrast=1.15,unsharp=5:5:0.8' },
    vwarm:         { title: 'Warm',        emoji: '☀️', desc: 'Garam sunehri tint',               vf: 'colorbalance=rs=0.13:gs=0.04:bs=-0.12:rm=0.06,eq=saturation=1.1:brightness=0.02' },
    vtviral:       { title: 'Viral (Reels)', emoji: '📱', desc: '9:16 vertical + blur background', complex: "[0:v]split[a][b];[a]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,boxblur=20:2[bg];[b]scale=720:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,eq=saturation=1.3:contrast=1.1,format=yuv420p[v]" }
};
const TOOLS = {
    vthumb:  { title: 'Thumbnail',  emoji: '🖼️', desc: 'Video ki sab se achhi frame' },
    vtogif:  { title: 'To GIF',     emoji: '🎞️', desc: 'Video ko GIF banao (10 sec tak)' },
    vtomp3:  { title: 'To MP3',     emoji: '🎵', desc: 'Video se awaaz (MP3)' },
    vtrim:   { title: 'Trim',       emoji: '✂️', desc: 'Video kaato: .vtrim 5 15' }
};
const ORDER = ['vtaesthetic', 'vtcinematic', 'vtdua', 'vtemplate', 'vtenergetic', 'vtfunny', 'vthumb', 'vtlove', 'vtmotivational', 'vtnight', 'vtogif', 'vtomp3', 'vtpoetry', 'vtrim', 'vtromantic', 'vtsad', 'vtsports', 'vttravel', 'vtvintage', 'vtviral', 'vvintage', 'vvivid', 'vwarm'];

// ---------------------------------------------------------------- ffmpeg helpers
const run = (args, timeout = 180000) => new Promise((resolve, reject) => execFile(ffmpegBin, args, { timeout, maxBuffer: 1 << 24 }, (err, so, se) => err ? reject(new Error(String(se || err.message).split('\n').filter(Boolean).slice(-2).join(' ').slice(0, 180))) : resolve(String(se || ''))));
const probe = (file) => new Promise((resolve) => execFile(ffmpegBin, ['-hide_banner', '-i', file], { timeout: 30000 }, (err, so, se) => {
    const t = String(se || ''); const d = /Duration:\s*(\d+):(\d+):([\d.]+)/.exec(t);
    resolve({ audio: /Audio:/.test(t), video: /Video:/.test(t), dur: d ? (+d[1]) * 3600 + (+d[2]) * 60 + parseFloat(d[3]) : 0 });
}));
const tmp = (ext) => path.join(os.tmpdir(), `vt_${crypto.randomBytes(6).toString('hex')}.${ext}`);
let busy = 0;
const getVideo = async (m) => {
    if (!m.quoted || !m.quoted.download || !/^(videoMessage|documentMessage)$/.test(m.quoted.mtype || '')) return null;
    const mt = (m.quoted.msg && m.quoted.msg.mimetype) || '';
    if (m.quoted.mtype === 'documentMessage' && !/^video\//.test(mt)) return null;
    const size = Number((m.quoted.msg && m.quoted.msg.fileLength) || 0);
    if (size > 45 * 1024 * 1024) throw new Error('Video bohat bari hai (45 MB se kam rakho)');
    return m.quoted.download();
};
const captionFilter = (text, textFile) => {
    if (!text || !FONT) return '';
    fs.writeFileSync(textFile, text.slice(0, 70));
    return `,drawtext=fontfile=${FONT}:textfile=${textFile}:expansion=none:fontcolor=white:fontsize=h/17:box=1:boxcolor=black@0.45:boxborderw=12:x=(w-text_w)/2:y=h-text_h-h/10`;
};

async function work(conn, mek, m, ctx, name, fn) {
    if (busy >= 2) return ctx.reply('⏳ Abhi 2 videos ban rahi hain, thori der baad try karo.');
    let inBuf;
    try { inBuf = await getVideo(m); } catch (e) { return ctx.reply(`❌ ${e.message}`); }
    if (!inBuf) return ctx.reply(`🎬 Kisi *video* ko reply karke *.${name}* likho.\n_Template list: *.vtemplate*_`);
    busy++;
    const files = [];
    try {
        conn.sendMessage(ctx.from, { react: { text: '⏳', key: mek.key } }).catch(() => {});
        const inp = tmp('mp4'); files.push(inp); fs.writeFileSync(inp, inBuf);
        const info = await probe(inp);
        if (!info.video) throw new Error('Yeh video file nahi lagti');
        await fn(inp, info, files);
        conn.sendMessage(ctx.from, { react: { text: '✅', key: mek.key } }).catch(() => {});
    } catch (e) { await ctx.reply(`❌ Video edit nahi ho saki: ${e.message}`); }
    finally { busy--; for (const f of files) fs.unlink(f, () => {}); }
}

// ---------------------------------------------------------------- style templates
for (const [name, t] of Object.entries(T)) {
    cmd({ pattern: name, category: 'videotemplates', react: t.emoji, desc: `${t.title} — ${t.desc}`, use: `.${name} [likhai]  (video ko reply karo)`, filename: __filename },
    async (conn, mek, m, ctx) => work(conn, mek, m, ctx, name, async (inp, info, files) => {
        const out = tmp('mp4'); files.push(out);
        const txt = tmp('txt'); files.push(txt);
        const cap = (ctx.q || '').trim();
        const args = ['-y', '-loglevel', 'error', '-i', inp, '-t', '60'];
        if (t.complex) {
            args.push('-filter_complex', t.complex, '-map', '[v]', '-map', '0:a?');
        } else {
            let vf = `${BASE_SCALE},${t.vf}`;
            if (t.speed) vf += `,setpts=PTS/${t.speed}`;
            vf += captionFilter(cap, txt);
            vf += ',format=yuv420p';
            args.push('-vf', vf);
            if (info.audio && t.speed) args.push('-af', `atempo=${t.speed}`);
        }
        args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-pix_fmt', 'yuv420p');
        if (info.audio) args.push('-c:a', 'aac', '-b:a', '96k'); else args.push('-an');
        args.push('-movflags', '+faststart', out);
        await run(args);
        await conn.sendMessage(ctx.from, { video: fs.readFileSync(out), mimetype: 'video/mp4', caption: `${t.emoji} *${t.title}* template${cap && FONT ? '' : ''}\n_Aur templates: .vtemplate_` }, { quoted: mek });
    }));
}

// ---------------------------------------------------------------- tools
cmd({ pattern: 'vthumb', category: 'videotemplates', react: '🖼️', desc: 'Video ki sab se achhi frame (thumbnail)', use: '.vthumb (video ko reply karo)', filename: __filename },
async (conn, mek, m, ctx) => work(conn, mek, m, ctx, 'vthumb', async (inp, info, files) => {
    const out = tmp('jpg'); files.push(out);
    await run(['-y', '-loglevel', 'error', '-i', inp, '-t', '30', '-vf', 'thumbnail=60,scale=1280:-2', '-frames:v', '1', '-q:v', '2', out]);
    await conn.sendMessage(ctx.from, { image: fs.readFileSync(out), caption: '🖼️ *Thumbnail*' }, { quoted: mek });
}));
cmd({ pattern: 'vtogif', category: 'videotemplates', react: '🎞️', desc: 'Video ko GIF banao (10 sec tak)', use: '.vtogif (video ko reply karo)', filename: __filename },
async (conn, mek, m, ctx) => work(conn, mek, m, ctx, 'vtogif', async (inp, info, files) => {
    const out = tmp('mp4'); files.push(out);
    await run(['-y', '-loglevel', 'error', '-i', inp, '-t', '10', '-vf', 'fps=14,scale=480:-2:flags=bicubic,format=yuv420p', '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-movflags', '+faststart', out]);
    await conn.sendMessage(ctx.from, { video: fs.readFileSync(out), gifPlayback: true, mimetype: 'video/mp4', caption: '🎞️ *GIF*' }, { quoted: mek });
}));
cmd({ pattern: 'vtomp3', category: 'videotemplates', react: '🎵', desc: 'Video se awaaz (MP3) nikalo', use: '.vtomp3 (video ko reply karo)', filename: __filename },
async (conn, mek, m, ctx) => work(conn, mek, m, ctx, 'vtomp3', async (inp, info, files) => {
    if (!info.audio) throw new Error('Is video mein awaaz nahi hai');
    const out = tmp('mp3'); files.push(out);
    await run(['-y', '-loglevel', 'error', '-i', inp, '-t', '600', '-vn', '-c:a', 'libmp3lame', '-q:a', '3', out]);
    await conn.sendMessage(ctx.from, { audio: fs.readFileSync(out), mimetype: 'audio/mpeg', fileName: 'audio.mp3' }, { quoted: mek });
}));
const toSec = (s) => { s = String(s || '').trim(); if (!s) return NaN; if (s.includes(':')) return s.split(':').reduce((a, p) => a * 60 + parseFloat(p), 0); return parseFloat(s); };
cmd({ pattern: 'vtrim', category: 'videotemplates', react: '✂️', desc: 'Video kaato: .vtrim 5 15 (5 se 15 second)', use: '.vtrim 5 15  (video ko reply karo)', filename: __filename },
async (conn, mek, m, ctx) => {
    const a = (ctx.q || '').trim().split(/\s+/).filter(Boolean);
    const start = toSec(a[0]), end = a[1] !== undefined ? toSec(a[1]) : NaN;
    if (!(start >= 0) || !(end > start)) return ctx.reply('✂️ Shuru aur khatam ka waqt likho (second mein).\nMisal: *.vtrim 5 15*  ya  *.vtrim 0:10 0:25*\n(video ko reply karna na bhoolo)');
    if (end - start > 120) return ctx.reply('✂️ Ek dafa mein 120 second tak kaat sakte ho.');
    return work(conn, mek, m, ctx, 'vtrim', async (inp, info, files) => {
        if (info.dur && start >= info.dur) throw new Error(`Video sirf ${Math.floor(info.dur)} second ki hai`);
        const out = tmp('mp4'); files.push(out);
        const args = ['-y', '-loglevel', 'error', '-ss', String(start), '-to', String(end), '-i', inp, '-vf', `${BASE_SCALE},format=yuv420p`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26'];
        if (info.audio) args.push('-c:a', 'aac', '-b:a', '96k'); else args.push('-an');
        args.push('-movflags', '+faststart', out);
        await run(args);
        await conn.sendMessage(ctx.from, { video: fs.readFileSync(out), mimetype: 'video/mp4', caption: `✂️ *Trim* ${start}s → ${end}s` }, { quoted: mek });
    });
});

// ---------------------------------------------------------------- list
cmd({ pattern: 'vtemplate', alias: ['vtemplates', 'vtlist'], category: 'videotemplates', react: '🎬', desc: 'Saare video templates ki list', use: '.vtemplate', filename: __filename },
async (conn, mek, m, ctx) => {
    const P = require('../config').PREFIX || '.';
    const info = { ...T, ...TOOLS, vtemplate: { title: 'Template list', emoji: '🎬', desc: 'Yeh list' } };
    const rows = ORDER.map(k => `│ ✦ ${P}${k}  ${info[k].emoji}`).join('\n');
    await ctx.reply(`╭────〔 🎬 *Video Templates* 〕────╮\n${rows}\n╰──────────────────────╯\n\n🎞️ *Kaise use karein*\n• Kisi *video* ko reply karo: *${P}vtlove*\n• Likhai chahiye? *${P}vtsad Yaadein* (video par likh jayega)\n• Kaatna ho: *${P}vtrim 5 15*\n• GIF: *${P}vtogif*  •  MP3: *${P}vtomp3*\n\n_Video 60 second / 45 MB tak behtar chalti hai._`);
});
