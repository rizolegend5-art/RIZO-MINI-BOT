const { cmd } = require('../arslan');
const config = require('../config');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// ===========================================================
// 🎙️ Edge-TTS setup
// ===========================================================
let EdgeTTS = null;
try {
    const edgeTts = require('edge-tts-universal');
    EdgeTTS = edgeTts.UniversalEdgeTTS || edgeTts.EdgeTTS;
    console.log('✅ Edge-TTS loaded');
} catch (e) {
    console.log('⚠️ edge-tts-universal not installed. Run: npm install edge-tts-universal');
}

// ===========================================================
// 🎤 VOICES
// ===========================================================
const VOICES = {
    jarvis: 'ur-PK-AsadNeural',
    raju: 'ur-PK-AsadNeural',
    asad: 'ur-PK-AsadNeural',
    uzma: 'ur-PK-UzmaNeural',
    female: 'ur-PK-UzmaNeural',
    male: 'ur-PK-AsadNeural',
    'english-m': 'en-US-GuyNeural',
    'english-f': 'en-US-AriaNeural',
    'jarvis-en': 'en-US-GuyNeural',
    hindi: 'hi-IN-MadhurNeural',
    'hindi-f': 'hi-IN-SwaraNeural'
};

// ===========================================================
// 🎯 Convert MP3 to OGG (WhatsApp voice compatible)
// ===========================================================
async function mp3ToOgg(mp3Path, oggPath) {
    try {
        await execAsync(`ffmpeg -i "${mp3Path}" -c:a libopus -b:a 64k -ac 1 -ar 48000 -avoid_negative_ts make_zero "${oggPath}" -y`);
        return true;
    } catch (e) {
        console.error('ffmpeg error:', e.message);
        return false;
    }
}

// ===========================================================
// 1. TTS — Text to voice (Jarvis/Raju style)
// ===========================================================
cmd({
    pattern: 'tts',
    alias: ['voice', 'say', 'speak', 'bolo'],
    desc: 'Text ko voice me convert karo (Jarvis/Raju style)',
    category: 'tools',
    react: '🎙️',
    use: '.tts <text>  |  .tts jarvis <text>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!EdgeTTS) {
        return ctx.reply(
            '❌ *TTS setup missing*\n\n' +
            'Install karo:\n```\nnpm install edge-tts-universal\n```'
        );
    }

    const input = (ctx.q || '').trim();
    if (!input) {
        return ctx.reply([
            '🎙️ *TEXT TO VOICE*',
            '',
            '*Use:* `.tts <text>`',
            '',
            '*Voices:*',
            '• `jarvis` — Male Urdu 🎙️',
            '• `raju` — Male Urdu 🎙️',
            '• `uzma` — Female Urdu 🎙️',
            '• `hindi` — Hindi Male',
            '• `english-m` — English Male',
            '• `english-f` — English Female',
            '',
            '*Example:*',
            '`.tts jarvis salam bhai kaise ho`'
        ].join('\n'));
    }

    const parts = input.split(/\s+/);
    const firstWord = parts[0].toLowerCase();

    let voice = 'ur-PK-AsadNeural';
    let text = input;

    if (VOICES[firstWord]) {
        voice = VOICES[firstWord];
        text = parts.slice(1).join(' ');
    }

    if (!text || text.length < 2) return ctx.reply('❌ Text do voice ke liye.');
    if (text.length > 500) return ctx.reply('❌ Max 500 characters.');

    await conn.sendMessage(ctx.from, { react: { text: '⏳', key: mek.key } });

    try {
        const tts = new EdgeTTS(text, voice);
        const result = await tts.synthesize();
        const audioBuffer = Buffer.from(await result.audio.arrayBuffer());

        const tmpDir = path.join(__dirname, '..', 'tmp');
        fs.ensureDirSync(tmpDir);

        const mp3File = path.join(tmpDir, `tts_${Date.now()}.mp3`);
        const oggFile = path.join(tmpDir, `tts_${Date.now()}.ogg`);

        await fs.writeFile(mp3File, audioBuffer);

        // Convert to OGG for WhatsApp
        const converted = await mp3ToOgg(mp3File, oggFile);

        if (!converted) {
            // Fallback: MP3 bhejo (kabhi kabhi chalta hai)
            await conn.sendMessage(ctx.from, {
                audio: { url: mp3File },
                mimetype: 'audio/mpeg',
                ptt: true,
                fileName: `voice_${Date.now()}.mp3`
            }, { quoted: mek });
        } else {
            await conn.sendMessage(ctx.from, {
                audio: { url: oggFile },
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true,
                fileName: `voice_${Date.now()}.ogg`
            }, { quoted: mek });
        }

        // Cleanup
        fs.remove(mp3File).catch(() => {});
        fs.remove(oggFile).catch(() => {});

        await conn.sendMessage(ctx.from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('tts error:', e.message);
        await conn.sendMessage(ctx.from, { react: { text: '❌', key: mek.key } });
        return ctx.reply('❌ Voice generate fail: ' + e.message);
    }
});

// ===========================================================
// 2. VOICES — Available voices
// ===========================================================
cmd({
    pattern: 'voices',
    alias: ['voicelist', 'ttsvoices'],
    desc: 'Available voices ki list',
    category: 'tools',
    react: '🎤',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    return ctx.reply([
        '🎤 *AVAILABLE VOICES*',
        '',
        '*Urdu:*',
        '• `jarvis` — Male (Asad) 🎙️',
        '• `raju` — Male (Asad) 🎙️',
        '• `uzma` — Female 🎙️',
        '',
        '*Hindi:*',
        '• `hindi` — Male (Madhur)',
        '• `hindi-f` — Female (Swara)',
        '',
        '*English:*',
        '• `english-m` — Male (Guy)',
        '• `english-f` — Female (Aria)',
        '',
        '💡 *Use:* `.tts jarvis hello bhai`'
    ].join('\n'));
});

// ===========================================================
// 3. JARVIS — Jarvis style voice
// ===========================================================
cmd({
    pattern: 'jarvis',
    alias: ['jarvisvoice'],
    desc: 'Jarvis style voice',
    category: 'fun',
    react: '🤖',
    use: '.jarvis <text>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!EdgeTTS) return ctx.reply('❌ Install: `npm install edge-tts-universal`');
    if (!ctx.q) return ctx.reply('Use: `.jarvis hello boss`');

    await conn.sendMessage(ctx.from, { react: { text: '🤖', key: mek.key } });

    try {
        const tts = new EdgeTTS(ctx.q.slice(0, 500), 'ur-PK-AsadNeural');
        const result = await tts.synthesize();
        const audioBuffer = Buffer.from(await result.audio.arrayBuffer());

        const tmpDir = path.join(__dirname, '..', 'tmp');
        fs.ensureDirSync(tmpDir);

        const mp3File = path.join(tmpDir, `jarvis_${Date.now()}.mp3`);
        const oggFile = path.join(tmpDir, `jarvis_${Date.now()}.ogg`);

        await fs.writeFile(mp3File, audioBuffer);
        const converted = await mp3ToOgg(mp3File, oggFile);

        if (converted) {
            await conn.sendMessage(ctx.from, {
                audio: { url: oggFile },
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true
            }, { quoted: mek });
        } else {
            await conn.sendMessage(ctx.from, {
                audio: { url: mp3File },
                mimetype: 'audio/mpeg',
                ptt: true
            }, { quoted: mek });
        }

        fs.remove(mp3File).catch(() => {});
        fs.remove(oggFile).catch(() => {});
        await conn.sendMessage(ctx.from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('jarvis error:', e.message);
        await conn.sendMessage(ctx.from, { react: { text: '❌', key: mek.key } });
        return ctx.reply('❌ Voice fail: ' + e.message);
    }
});

// ===========================================================
// 4. RAJU — Raju style voice (same as Jarvis but different alias)
// ===========================================================
cmd({
    pattern: 'raju',
    alias: ['rajuvoice'],
    desc: 'Raju style voice',
    category: 'fun',
    react: '🎤',
    use: '.raju <text>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!EdgeTTS) return ctx.reply('❌ Install: `npm install edge-tts-universal`');
    if (!ctx.q) return ctx.reply('Use: `.raju kya haal hai`');

    await conn.sendMessage(ctx.from, { react: { text: '🎤', key: mek.key } });

    try {
        const tts = new EdgeTTS(ctx.q.slice(0, 500), 'ur-PK-AsadNeural');
        const result = await tts.synthesize();
        const audioBuffer = Buffer.from(await result.audio.arrayBuffer());

        const tmpDir = path.join(__dirname, '..', 'tmp');
        fs.ensureDirSync(tmpDir);

        const mp3File = path.join(tmpDir, `raju_${Date.now()}.mp3`);
        const oggFile = path.join(tmpDir, `raju_${Date.now()}.ogg`);

        await fs.writeFile(mp3File, audioBuffer);
        const converted = await mp3ToOgg(mp3File, oggFile);

        if (converted) {
            await conn.sendMessage(ctx.from, {
                audio: { url: oggFile },
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true
            }, { quoted: mek });
        } else {
            await conn.sendMessage(ctx.from, {
                audio: { url: mp3File },
                mimetype: 'audio/mpeg',
                ptt: true
            }, { quoted: mek });
        }

        fs.remove(mp3File).catch(() => {});
        fs.remove(oggFile).catch(() => {});
        await conn.sendMessage(ctx.from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('raju error:', e.message);
        await conn.sendMessage(ctx.from, { react: { text: '❌', key: mek.key } });
        return ctx.reply('❌ Voice fail: ' + e.message);
    }
});