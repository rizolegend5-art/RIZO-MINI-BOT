const { cmd } = require('../arslan');
const { jikanGet } = require('../lib/jikan');

cmd({
    pattern: 'animes',
    alias: ['animeimg', 'animepic', 'anime'],
    desc: 'Search for anime and send cover images',
    category: 'anime',
    react: '🎀',
    use: '.animes <anime name>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const query = (ctx.q || '').trim();
    if (!query) return ctx.reply('🎌 Anime ka naam likhein.\nExample: `.animes Naruto`');

    try {
        const result = await jikanGet(`/anime?q=${encodeURIComponent(query)}&limit=3&sfw=true`);
        const animeList = Array.isArray(result.data) ? result.data : [];
        if (!animeList.length) return ctx.reply('❌ Anime nahi mila. Spelling check karke dobara try karein.');

        let sent = 0;
        for (const anime of animeList) {
            const imageUrl = anime.images?.webp?.large_image_url
                || anime.images?.jpg?.large_image_url
                || anime.images?.webp?.image_url
                || anime.images?.jpg?.image_url;
            if (!imageUrl) continue;
            await conn.sendMessage(ctx.from, {
                image: { url: imageUrl },
                caption: `🎌 *${String(anime.title || query).slice(0, 120)}*\n⭐ Score: ${anime.score || 'N/A'}\n🔗 ${anime.url || ''}`
            }, { quoted: mek });
            sent++;
        }
        if (!sent) return ctx.reply('Is anime ke liye cover image available nahi hai.');
    } catch (error) {
        console.error('[ANIME SEARCH]', error.message);
        return ctx.reply('❌ Anime service abhi busy hai. Ek minute baad dobara try karein.');
    }
});
