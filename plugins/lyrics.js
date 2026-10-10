const { cmd } = require('../arslan');
const config = require('../config');
const axios = require('axios');

async function fetchLyrics(songName) {
    const apiCalls = [
        (async () => {
            const r = await axios.get(`https://api.lyrics.ovh/v1/unknown/${encodeURIComponent(songName)}`, { timeout: 15000 });
            if (r?.data?.lyrics) return { lyrics: r.data.lyrics, title: songName };
            throw new Error('lyrics.ovh failed');
        })(),
        (async () => {
            const r = await axios.get(`https://some-random-api.com/lyrics?title=${encodeURIComponent(songName)}`, { timeout: 15000 });
            if (r?.data?.lyrics) return { lyrics: r.data.lyrics, title: r.data.title || songName, artist: r.data.author, image: r.data.thumbnail?.genius?.url };
            throw new Error('some-random-api failed');
        })(),
        (async () => {
            const r = await axios.get(`https://api.popcat.xyz/v2/lyrics?q=${encodeURIComponent(songName)}`, { timeout: 15000 });
            if (r?.data?.lyrics) return { lyrics: r.data.lyrics, title: r.data.title || songName, artist: r.data.artist, image: r.data.image };
            throw new Error('popcat failed');
        })()
    ];
    return await Promise.any(apiCalls);
}

cmd({
    pattern: 'lyrics',
    alias: ['lyric', 'songlyrics', 'lirik', 'geet'],
    desc: 'Song lyrics',
    category: 'music',
    react: '🎵',
    use: '.lyrics <song>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const song = (ctx.q || '').trim();
    if (!song) return ctx.reply('🎵 Use: `.lyrics <song name>`');

    await conn.sendMessage(ctx.from, { react: { text: '🎵', key: mek.key } });
    await ctx.reply('🎵 *Lyrics dhoondh raha hun…*');

    try {
        const data = await fetchLyrics(song);
        const maxChars = 3800;
        const lyrics = data.lyrics.length > maxChars ? data.lyrics.slice(0, maxChars) + '...' : data.lyrics;

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
            } catch { await conn.sendMessage(ctx.from, { text: caption }, { quoted: mek }); }
        } else {
            await conn.sendMessage(ctx.from, { text: caption }, { quoted: mek });
        }
        await conn.sendMessage(ctx.from, { react: { text: '✅', key: mek.key } });
    } catch (err) {
        console.error('LYRICS ERROR:', err.message);
        await conn.sendMessage(ctx.from, { react: { text: '❌', key: mek.key } });
        return ctx.reply(`❌ "${song}" ke lyrics nahi mile.`);
    }
});