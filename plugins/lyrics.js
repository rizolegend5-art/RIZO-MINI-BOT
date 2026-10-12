const { cmd } = require('../arslan');
const config = require('../config');
const axios = require('axios');

// ===========================================================
// 🎯 LRCLIB + LyricsOVH — dono free, no API key
// ===========================================================
async function fetchLyrics(songName) {
    const apiCalls = [
        // 1. LRCLIB (best — synced + plain lyrics)
        (async () => {
            const r = await axios.get(`https://lrclib.net/api/search`, {
                params: { q: songName },
                timeout: 15000,
                headers: { 'User-Agent': 'RIZO-MD-Bot/1.0' }
            });
            const first = r.data?.[0];
            if (first?.plainLyrics) {
                return {
                    lyrics: first.plainLyrics,
                    title: first.trackName || songName,
                    artist: first.artistName,
                    source: 'lrclib'
                };
            }
            throw new Error('lrclib fail');
        })(),

        // 2. LyricsOVH (fallback)
        (async () => {
            const r = await axios.get(`https://api.lyrics.ovh/v1/unknown/${encodeURIComponent(songName)}`, { timeout: 15000 });
            if (r?.data?.lyrics && r.data.lyrics.length > 50) {
                return { lyrics: r.data.lyrics, title: songName, source: 'lyrics.ovh' };
            }
            throw new Error('lyrics.ovh fail');
        })(),

        // 3. Some-Random-API (backup)
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
            throw new Error('some-random fail');
        })()
    ];

    return await Promise.any(apiCalls);
}

cmd({
    pattern: 'lyrics',
    alias: ['lyric', 'songlyrics', 'lirik', 'geet'],
    desc: 'Song ke lyrics (no API key needed)',
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
            '• `.lyrics Tum Hi Ho`'
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
                await conn.sendMessage(ctx.from, { image: { url: data.image }, caption }, { quoted: mek });
            } catch {
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
                `• English name try karo`
            );
        }
        return ctx.reply(`❌ Lyrics fail: ${err.message}`);
    }
});