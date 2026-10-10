const { cmd } = require('../arslan');
const config = require('../config');
const axios = require('axios');

// ===========================================================
// 🎯 5 APIs for lyrics (race)
// ===========================================================
async function fetchLyrics(songName) {
    const apiCalls = [
        // 1. lyrics.ovh
        (async () => {
            const r = await axios.get(`https://api.lyrics.ovh/v1/unknown/${encodeURIComponent(songName)}`, { timeout: 15000 });
            if (r?.data?.lyrics && r.data.lyrics.length > 50) {
                return { lyrics: r.data.lyrics, title: songName, source: 'lyrics.ovh' };
            }
            throw new Error('lyrics.ovh fail');
        })(),

        // 2. some-random-api
        (async () => {
            const r = await axios.get(`https://some-random-api.com/lyrics?title=${encodeURIComponent(songName)}`, { timeout: 15000 });
            if (r?.data?.lyrics) {
                return {
                    lyrics: r.data.lyrics,
                    title: r.data.title || songName,
                    artist: r.data.author,
                    image: r.data.thumbnail?.genius?.url,
                    source: 'some-random-api'
                };
            }
            throw new Error('some-random-api fail');
        })(),

        // 3. popcat
        (async () => {
            const r = await axios.get(`https://api.popcat.xyz/v2/lyrics?q=${encodeURIComponent(songName)}`, { timeout: 15000 });
            if (r?.data?.lyrics) {
                return {
                    lyrics: r.data.lyrics,
                    title: r.data.title || songName,
                    artist: r.data.artist,
                    image: r.data.image,
                    source: 'popcat'
                };
            }
            throw new Error('popcat fail');
        })(),

        // 4. betabotz
        (async () => {
            const r = await axios.get(`https://api.betabotz.eu.org/api/search/lirik?lirik=${encodeURIComponent(songName)}&apikey=beta-M3DSnY0A`, { timeout: 15000 });
            if (r?.data?.result?.lirik) {
                return {
                    lyrics: r.data.result.lirik,
                    title: r.data.result.title || songName,
                    artist: r.data.result.artist,
                    source: 'betabotz'
                };
            }
            throw new Error('betabotz fail');
        })(),

        // 5. Google scrape fallback
        (async () => {
            const r = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(songName)}+lyrics`, {
                timeout: 15000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            const match = r.data.match(/<div[^>]*class="[^"]*lyrics[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
            if (match) {
                const clean = match[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
                if (clean.length > 50) return { lyrics: clean, title: songName, source: 'google' };
            }
            throw new Error('google fail');
        })()
    ];

    return await Promise.any(apiCalls);
}

// ===========================================================
// LYRICS COMMAND
// ===========================================================
cmd({
    pattern: 'lyrics',
    alias: ['lyric', 'songlyrics', 'lirik', 'geet'],
    desc: 'Song ke lyrics, artist aur image',
    category: 'music',
    react: '🎵',
    use: '.lyrics <song name>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const song = (ctx.q || '').trim();

    if (!song) {
        return ctx.reply(
            '🎵 *LYRICS FINDER*\n\n' +
            'Use: `.lyrics <song name>`\n\n' +
            'Examples:\n' +
            '• `.lyrics pal pal`\n' +
            '• `.lyrics Tum Hi Ho`\n' +
            '• `.lyrics Kesariya`'
        );
    }

    await conn.sendMessage(ctx.from, { react: { text: '🎵', key: mek.key } });
    await ctx.reply('🎵 *Lyrics dhoondh raha hun…*');

    try {
        const data = await fetchLyrics(song);

        const maxChars = 3800;
        const lyrics = data.lyrics.length > maxChars
            ? data.lyrics.slice(0, maxChars) + '\n\n... (baaki cut ho gaya)'
            : data.lyrics;

        const caption = [
            `🎵 *${data.title || song}*`,
            data.artist ? `👤 *Artist:* ${data.artist}` : '',
            '',
            '📝 *Lyrics:*',
            lyrics,
            '',
            `> _Powered by ${config.BOT_NAME || 'RIZO-MD'}_`
        ].filter(Boolean).join('\n');

        if (data.image) {
            try {
                await conn.sendMessage(ctx.from, {
                    image: { url: data.image },
                    caption
                }, { quoted: mek });
            } catch (imgErr) {
                await conn.sendMessage(ctx.from, { text: caption }, { quoted: mek });
            }
        } else {
            await conn.sendMessage(ctx.from, { text: caption }, { quoted: mek });
        }

        await conn.sendMessage(ctx.from, { react: { text: '✅', key: mek.key } });

    } catch (err) {
        console.error('LYRICS ERROR:', err.message);
        await conn.sendMessage(ctx.from, { react: { text: '❌', key: mek.key } });

        if (err.name === 'AggregateError') {
            return ctx.reply(
                `❌ "${song}" ke lyrics nahi mile.\n\n` +
                `💡 *Tips:*\n` +
                `• Spelling check karo\n` +
                `• English name try karo\n` +
                `• Thodi der baad try karo`
            );
        }
        return ctx.reply(`❌ Lyrics fail: ${err.message}`);
    }
});