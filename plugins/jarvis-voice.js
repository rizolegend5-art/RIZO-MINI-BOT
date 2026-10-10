const { cmd } = require('../arslan');
const config = require('../config');
const fs = require('fs-extra');
const path = require('path');

// ===========================================================
// 🎙️ JARVIS / ARIF VOICE — Free Edge-TTS
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
    // Urdu voices
    'jarvis': 'ur-PK-AsadNeural',       // Male Urdu (Jarvis style)
    'raju': 'ur-PK-AsadNeural',         // Male Urdu
    'asad': 'ur-PK-AsadNeural',         // Male Urdu
    'uzma': 'ur-PK-UzmaNeural',         // Female Urdu
    'female': 'ur-PK-UzmaNeural',
    'male': 'ur-PK-AsadNeural',
    // English voices
    'english-m': 'en-US-GuyNeural',
    'english-f': 'en-US-AriaNeural',
    'jarvis-en': 'en-US-GuyNeural'
};

// ===========================================================
// 1. TTS — Text to voice
// ===========================================================
cmd({
    pattern: 'tts',
    alias: ['voice', 'say', 'speak', 'bolo'],
    desc: 'Text ko voice me convert karo (Jarvis/Raju style)',
    category: 'tools',
    react: '🎙️',
    use: '.tts <text>  |  .tts jarvis <text>  |  .tts raju <text>',
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
            '• `.tts jarvis <text>` — Male Urdu (Jarvis)',
            '• `.tts raju <text>` — Male Urdu (Raju)',
            '• `.tts uzma <text>` — Female Urdu',
            '• `.tts english-m <text>` — English male',
            '• `.tts english-f <text>` — English female',
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

    if (!text) return ctx.reply('❌ Text do voice ke liye.');

    await conn.sendMessage(ctx.from, { react: { text: '⏳', key: mek.key } });

    try {
        const tts = new EdgeTTS(text, voice);
        const result = await tts.synthesize();

        const audioBuffer = Buffer.from(await result.audio.arrayBuffer());

        const tempFile = path.join(__dirname, '..', 'tmp', `tts_${Date.now()}.mp3`);
        fs.ensureDirSync(path.dirname(tempFile));
        await fs.writeFile(tempFile, audioBuffer);

        await conn.sendMessage(ctx.from, {
            audio: { url: tempFile },
            mimetype: 'audio/mpeg',
            ptt: true,
            fileName: `voice_${Date.now()}.mp3`
        }, { quoted: mek });

        fs.remove(tempFile).catch(() => {});
        await conn.sendMessage(ctx.from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('tts error:', e.message);
        await conn.sendMessage(ctx.from, { react: { text: '❌', key: mek.key } });
        return ctx.reply('❌ Voice generate fail: ' + e.message);
    }
});

// ===========================================================
// 2. VOICELIST — Sab voices dikhao
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
        '• `jarvis` — Male Urdu (Asad) 🎙️',
        '• `raju` — Male Urdu (Asad) 🎙️',
        '• `uzma` — Female Urdu 🎙️',
        '',
        '*English:*',
        '• `english-m` — English Male 🎙️',
        '• `english-f` — English Female 🎙️',
        '• `jarvis-en` — English Male 🎙️',
        '',
        '💡 *Use:* `.tts jarvis hello bhai`',
        '',
        '📌 *Powered by* Edge-TTS (Free)'
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
    if (!EdgeTTS) return ctx.reply('❌ Install karo: `npm install edge-tts-universal`');
    if (!ctx.q) return ctx.reply('Use: `.jarvis hello boss kya haal hai`');

    await conn.sendMessage(ctx.from, { react: { text: '🤖', key: mek.key } });

    try {
        const tts = new EdgeTTS(ctx.q, 'ur-PK-AsadNeural');
        const result = await tts.synthesize();
        const audioBuffer = Buffer.from(await result.audio.arrayBuffer());

        const tempFile = path.join(__dirname, '..', 'tmp', `jarvis_${Date.now()}.mp3`);
        fs.ensureDirSync(path.dirname(tempFile));
        await fs.writeFile(tempFile, audioBuffer);

        await conn.sendMessage(ctx.from, {
            audio: { url: tempFile },
            mimetype: 'audio/mpeg',
            ptt: true,
            fileName: `jarvis_${Date.now()}.mp3`
        }, { quoted: mek });

        fs.remove(tempFile).catch(() => {});
        await conn.sendMessage(ctx.from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('jarvis error:', e.message);
        await conn.sendMessage(ctx.from, { react: { text: '❌', key: mek.key } });
        return ctx.reply('❌ Voice fail: ' + e.message);
    }
});