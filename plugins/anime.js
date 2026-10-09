const { cmd } = require('../arslan');
const config = require('../config');
const axios = require('axios');

const supportedAnimes = [
    'akira', 'akiyama', 'anna', 'asuna', 'ayuzawa', 'boruto', 'chiho', 'chitoge',
    'deidara', 'erza', 'elaina', 'eba', 'emilia', 'hestia', 'hinata', 'inori',
    'isuzu', 'itachi', 'itori', 'kaga', 'kagura', 'kaori', 'keneki', 'kotori',
    'kurumi', 'madara', 'mikasa', 'miku', 'minato', 'naruto', 'nezuko', 'sagiri',
    'sasuke', 'sakura'
];

function pickRandom(arr, count = 1) {
    const shuffled = arr.slice().sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

const animuMenu =
    '🎀 *Animes Menu* 🎀\n\n' +
    supportedAnimes.map(a => `• *${a}*`).join('\n') +
    '\n\n📌 *Usage:*\n' +
    '.animes <name>\n' +
    'Example: *.animes naruto*';

cmd({
    pattern: 'animes',
    alias: ['animeimg', 'animepic', 'anime'],
    desc: 'Random anime images',
    category: 'fun',
    react: '🎀',
    use: '.animes <anime_name>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const input = (ctx.args[0] || '').trim();
    const typeLower = input.toLowerCase();

    if (!input || !supportedAnimes.includes(typeLower)) {
        const replyText = input && !supportedAnimes.includes(typeLower)
            ? `❌ Unsupported anime: *${typeLower}*\n\n`
            : '';
        return ctx.reply(replyText + animuMenu);
    }

    try {
        const apiUrl = `https://raw.githubusercontent.com/Guru322/api/Guru/BOT-JSON/anime-${typeLower}.json`;
        const res = await axios.get(apiUrl, {
            timeout: 15000,
            validateStatus: s => s < 500
        });
        const images = res.data;
        if (!Array.isArray(images) || images.length === 0) {
            throw new Error('No images found');
        }

        const randomImages = pickRandom(images, Math.min(3, images.length));

        for (const img of randomImages) {
            try {
                const imageData = await axios.get(img, {
                    responseType: 'arraybuffer',
                    timeout: 15000
                });
                await conn.sendMessage(ctx.from, {
                    image: Buffer.from(imageData.data),
                    caption: `🎀 _${typeLower}_`
                }, { quoted: mek });
                await new Promise(r => setTimeout(r, 500));
            } catch (_) {
                // skip failed image
            }
        }
    } catch (err) {
        console.error('[ANIME] Error:', err.message);
        return ctx.reply('❌ Anime images fetch nahi ho sakin. Dobara try karo.');
    }
});