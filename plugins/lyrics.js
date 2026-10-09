const { cmd } = require('../arslan');
const config = require('../config');

cmd({
    pattern: 'lyrics',
    alias: ['lyric', 'songlyrics', 'lirik'],
    desc: 'Song ke lyrics, artist aur image',
    category: 'download',
    react: '🎵',
    use: '.lyrics <song name>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const songTitle = (ctx.q || '').trim();

    if (!songTitle) {
        return ctx.reply(
            '🎵 *abey jana song ka name do abhi deta ho lyrics!*\n' +
            `Usage: \`${config.PREFIX}lyrics <song name>\``
        );
    }

    try {
        const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(songTitle)}`;
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`API request fail rizo ko bataio kah error hain yar ${res.status}`);

        const data = await res.json();
        const messageData = data?.result?.message;

        if (!messageData?.lyrics) {
            return ctx.reply(`❌ abey, "${songTitle}" is name ka koi song nahi hain jana.`);
        }

        const { artist, lyrics, image, title, url } = messageData;

        // WhatsApp caption limit 4096 — lyrics bade to cut karo
        const maxChars = 3800;
        const lyricsOutput = lyrics.length > maxChars
            ? `${lyrics.slice(0, maxChars - 3)}...`
            : lyrics;

        const caption = [
            `🎵 *${title || songTitle}*`,
            `👤 *Artist:* ${artist || 'N/A'}`,
            url ? `🔗 *URL:* ${url}` : '',
            '',
            '📝 *Lyrics:*',
            lyricsOutput
        ].filter(Boolean).join('\n');

        if (image) {
            await conn.sendMessage(ctx.from, {
                image: { url: image },
                caption
            }, { quoted: mek });
        } else {
            await ctx.reply(caption);
        }
    } catch (error) {
        console.error('Lyrics Command Error:', error);
        return ctx.reply(`❌ "${songTitle}" ke lyrics fetch nahi ho sakin. Dobara try karo.`);
    }
});