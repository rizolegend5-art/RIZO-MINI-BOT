const { cmd } = require('../arslan');
const config = require('../config');

cmd({
    pattern: 'lyrics',
    alias: ['lyric', 'songlyrics', 'lirik'],
    desc: 'Song ke lyrics',
    category: 'music',
    react: '🎵',
    use: '.lyrics <song name>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const songTitle = (ctx.q || '').trim();
    if (!songTitle) return ctx.reply('🎵 Use: `.lyrics <song name>`');

    // 🚀 Try multiple APIs
    const apis = [
        // API 1 — lyrics.ovh (free, no key)
        async () => {
            const r = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent('')}/${encodeURIComponent(songTitle)}`);
            const d = await r.json();
            if (d?.lyrics) return { lyrics: d.lyrics, title: songTitle };
            throw new Error('lyrics.ovh failed');
        },

        // API 2 — discardapi (tumhara original)
        async () => {
            const r = await fetch(`https://discardapi.dpdns.org/api/music/lyrics?apikey=qasim&song=${encodeURIComponent(songTitle)}`);
            const d = await r.json();
            const msg = d?.result?.message;
            if (msg?.lyrics) return {
                lyrics: msg.lyrics,
                title: msg.title || songTitle,
                artist: msg.artist,
                image: msg.image
            };
            throw new Error('discard failed');
        }
    ];

    for (const api of apis) {
        try {
            const data = await api();
            const maxChars = 3800;
            const lyrics = data.lyrics.length > maxChars
                ? data.lyrics.slice(0, maxChars) + '...'
                : data.lyrics;

            const caption = [
                `🎵 *${data.title}*`,
                data.artist ? `👤 *Artist:* ${data.artist}` : '',
                '',
                '📝 *Lyrics:*',
                lyrics
            ].filter(Boolean).join('\n');

            if (data.image) {
                await conn.sendMessage(ctx.from, { image: { url: data.image }, caption }, { quoted: mek });
            } else {
                await ctx.reply(caption);
            }
            return;
        } catch (e) {
            console.error('API failed:', e.message);
        }
    }

    return ctx.reply(`❌ "${songTitle}" ke lyrics nahi mile. Spelling check karo.`);
});