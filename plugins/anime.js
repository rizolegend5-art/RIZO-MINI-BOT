const { cmd } = require('../arslan');
const axios = require('axios');

const JIKAN = 'https://api.jikan.moe/v4';
const TIMEOUT = 12000;
const supportedAnimes = [
  'akira','akiyama','anna','asuna','ayuzawa','boruto','chiho','chitoge','deidara','erza','elaina','eba','emilia','hestia','hinata','inori','isuzu','itachi','itori','kaga','kagura','kaori','keneki','kotori','kurumi','madara','mikasa','miku','minato','naruto','nezuko','sagiri','sasuke','sakura'
];
const clean = value => String(value || '').replace(/[\r\n]+/g, ' ').slice(0, 160);

async function get(url) {
  return (await axios.get(url, { timeout: TIMEOUT, headers: { 'User-Agent': 'RIZO-MINI-BOT/2.3' } })).data;
}

function uniqueUrls(values) {
  return [...new Set(values.filter(v => typeof v === 'string' && /^https?:\/\//i.test(v)))];
}

async function getAnimeImages(query) {
  const urls = [];
  // First try Jikan character search, which is more relevant for named characters.
  try {
    const data = await get(`${JIKAN}/characters?q=${encodeURIComponent(query)}&limit=5`);
    for (const row of data.data || []) {
      const img = row.images?.jpg?.image_url || row.images?.webp?.image_url;
      if (img) urls.push(img);
    }
  } catch (e) { console.warn('[ANIME] Jikan character search:', e.message); }
  // Then try anime title posters; still useful if the query is a series title.
  if (urls.length < 2) {
    try {
      const data = await get(`${JIKAN}/anime?q=${encodeURIComponent(query)}&limit=5&sfw=true`);
      for (const row of data.data || []) {
        const img = row.images?.webp?.large_image_url || row.images?.jpg?.large_image_url || row.images?.jpg?.image_url;
        if (img) urls.push(img);
      }
    } catch (e) { console.warn('[ANIME] Jikan anime search:', e.message); }
  }
  // Final fallback: random SFW anime images from a separate API.
  if (!urls.length) {
    for (const endpoint of ['https://api.waifu.pics/sfw/waifu', 'https://api.waifu.pics/sfw/neko']) {
      try { const data = await get(endpoint); if (data.url) urls.push(data.url); } catch (_) {}
      if (urls.length) break;
    }
  }
  return uniqueUrls(urls).slice(0, 3);
}

const animuMenu = '🎀 *RIZO ANIME CENTER* 🎀\n\n' +
  'Usage: `.anime <character or series>`\n' +
  'Examples: `.anime Naruto`, `.animes Mikasa`, `.animepic`\n\n' +
  'Character search works best with a full character name; if no match is found, the bot tries series posters and then a random SFW image.';

cmd({
  pattern: 'animes', alias: ['animeimg', 'animepic', 'anime'],
  desc: 'Search SFW anime character images and posters', category: 'fun', react: '🎀',
  use: '.anime <character or series>', filename: __filename
}, async (conn, mek, m, ctx) => {
  const query = (ctx.q || ctx.args?.join(' ') || '').trim();
  if (!query) return ctx.reply(animuMenu);
  try {
    const images = await getAnimeImages(query);
    if (!images.length) return ctx.reply('❌ Anime image APIs filhaal response nahi kar rahi. Kuch dair baad try karo.');
    let sent = 0;
    for (const url of images) {
      try {
        await conn.sendMessage(ctx.from, {
          image: { url },
          caption: `🎀 *RIZO ANIME CENTER*\n🔎 ${clean(query)}\n🖼️ ${sent + 1}/${images.length}`
        }, { quoted: mek });
        sent++;
        await new Promise(resolve => setTimeout(resolve, 400));
      } catch (e) { console.warn('[ANIME] Image send failed:', e.message); }
    }
    if (!sent) return ctx.reply('❌ Image mili thi lekin WhatsApp send nahi kar saka. Dusra naam try karo.');
  } catch (err) {
    console.error('[ANIME] Error:', err.message);
    return ctx.reply('❌ Anime images fetch nahi ho sakin. Dobara try karo.');
  }
});

cmd({
  pattern: 'randomanime', alias: ['waifupic', 'animepicture'],
  desc: 'Send a random safe anime image', category: 'fun', react: '🖼️',
  use: '.animepic', filename: __filename
}, async (conn, mek, m, ctx) => {
  try {
    const data = await get('https://api.waifu.pics/sfw/waifu');
    if (!data.url) throw new Error('No image URL');
    return conn.sendMessage(ctx.from, { image: { url: data.url }, caption: '🖼️ *RIZO RANDOM ANIME*' }, { quoted: mek });
  } catch (e) {
    console.warn('[ANIME] Random image fallback:', e.message);
    const images = await getAnimeImages('anime');
    if (!images.length) return ctx.reply('❌ Random anime image API unavailable hai.');
    return conn.sendMessage(ctx.from, { image: { url: images[0] }, caption: '🖼️ *RIZO RANDOM ANIME*' }, { quoted: mek });
  }
});
