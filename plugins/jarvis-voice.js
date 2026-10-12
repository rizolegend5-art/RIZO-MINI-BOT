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
    console.log('⚠️ edge-tts-universal not installed');
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
// 🎯 MP3 → OGG/Opus conversion (WhatsApp voice note compatible)
// ===========================================================
async function convertToOpus(mp3Path, oggPath) {
    try {
        // WhatsApp voice notes ke liye optimized ffmpeg command
        await execAsync(
            `ffmpeg -i "${mp3Path}" -c:a libopus -b:a 32k -ar 48000 -ac 1 -application voip -vbr on -compression_level 10 -frame_duration 60 -y "${oggPath}"`,
            { timeout: 30000 }
        );
        return fs.existsSync(oggPath);
    } catch (e) {
        console.error('ffmpeg conversion error:', e.message);
        return false;
    }
}

// ===========================================================
// 🎯 TTS generate + convert + send (full pipeline)
// ===========================================================
async function generateVoice(conn, ctx, text, voice) {
    const tmpDir = path.join(__dirname, '..', 'tmp');
    fs.ensureDirSync(tmpDir);

    const timestamp = Date.now();
    const mp3File = path.join(tmpDir, `tts_${timestamp}.mp3`);
    const oggFile = path.join(tmpDir, `tts_${timestamp}.ogg`);

    // Step 1: Edge-TTS se MP3 banao
    const tts = new EdgeTTS(text, voice);
    const result = await tts.synthesize();
    const audioBuffer = Buffer.from(await result.audio.arrayBuffer());

    // Check karo audio valid hai
    if (!audioBuffer || audioBuffer.length < 1000) {
        throw new Error('Edge-TTS ne empty audio diya');
    }

    await fs.writeFile(mp3File, audioBuffer);

    // Step 2: MP3 → OGG/Opus convert karo
    const converted = await convertToOpus(mp3File, oggFile);

    // Step 3: Send karo
    if (converted) {
        await conn.sendMessage(ctx.from, {
            audio: { url: oggFile },
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
        }, { quoted: ctx.mek });
    } else {
        // Fallback: MP3 bhejo (kuch devices pe chalta hai)
        console.warn('⚠️ ffmpeg conversion fail, MP3 bhej raha hun');
        await conn.sendMessage(ctx.from, {
            audio: { url: mp3File },
            mimetype: 'audio/mpeg',
            ptt: true
        }, { quoted: ctx.mek });
    }

    // Cleanup
    fs.remove(mp3File).catch(() => {});
    fs.remove(oggFile).catch(() => {});
}

// ===========================================================
// 1. TTS — Text to voice
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
            '',
            '*Example:*',
            '`.tts jarvis salam bhai`'
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
        // Ye ek hi line se generate + convert + send ho jayega
        await generateVoice(conn, { from: ctx.from, mek }, text, voice);
        await conn.sendMessage(ctx.from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('tts error:', e.message);
        await conn.sendMessage(ctx.from, { react: { text: '❌', key: mek.key } });
        return ctx.reply('❌ Voice generate fail: ' + e.message);
    }
});

// ===========================================================
// 2. JARVIS — Jarvis style voice
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
        await generateVoice(conn, { from: ctx.from, mek }, ctx.q.slice(0, 500), 'ur-PK-AsadNeural');
        await conn.sendMessage(ctx.from, { react: { text: '✅', key: mek.key } });
    } catch (e) {
        console.error('jarvis error:', e.message);
        await conn.sendMessage(ctx.from, { react: { text: '❌', key: mek.key } });
        return ctx.reply('❌ Voice fail: ' + e.message);
    }
});

// ===========================================================
// 3. RAJU — Raju style voice
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
        await generateVoice(conn, { from: ctx.from, mek }, ctx.q.slice(0, 500), 'ur-PK-AsadNeural');
        await conn.sendMessage(ctx.from, { react: { text: '✅', key: mek.key } });
    } catch (e) {
        console.error('raju error:', e.message);
        await conn.sendMessage(ctx.from, { react: { text: '❌', key: mek.key } });
        return ctx.reply('❌ Voice fail: ' + e.message);
    }
});