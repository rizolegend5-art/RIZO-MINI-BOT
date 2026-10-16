// plugins/anime.js
// RIZO HELL-MD — Anime commands with multi-API fallback
// APIs: Jikan v4, Nekos.best, Waifu.im, Nekosia, waifu.pics

const { cmd } = require('../arslan');
const axios = require('axios');

const TIMEOUT = 12000;
const UA = 'RIZO-MINI-BOT/3.0';

// ═══════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════
async function httpGet(url, opts = {}) {
    const res = await axios.get(url, {
        timeout: TIMEOUT,
        headers: { 'User-Agent': UA, ...(opts.headers || {}) },
        ...opts
    });
    return res.data;
}

const clean = v => String(v || '').replace(/[\r\n]+/g, ' ').slice(0, 160);
const isUrl = v => typeof v === 'string' && /^https?:\/\//i.test(v);

// ═══════════════════════════════════════════
//  API 1 — JIKAN v4 (MyAnimeList)
// ═══════════════════════════════════════════
const JIKAN = 'https://api.jikan.moe/v4';

async function jikanCharacterSearch(query) {
    try {
        const data = await httpGet(`${JIKAN}/characters?q=${encodeURIComponent(query)}&limit=5`);
        return (data.data || [])
            .map(c => c.images?.webp?.image_url || c.images?.jpg?.image_url)
            .filter(isUrl);
    } catch (e) {
        console.warn('[anime] Jikan character:', e.message);
        return [];
    }
}

async function jikanAnimeSearch(query) {
    try {
        const data = await httpGet(`${JIKAN}/anime?q=${encodeURIComponent(query)}&limit=5&sfw=true`);
        return (data.data || [])
            .map(a => a.images?.webp?.large_image_url || a.images?.jpg?.large_image_url || a.images?.jpg?.image_url)
            .filter(isUrl);
    } catch (e) {
        console.warn('[anime] Jikan anime:', e.message);
        return [];
    }
}

// ═══════════════════════════════════════════
//  API 2 — NEKOS.BEST (SFW images/GIFs)
// ═══════════════════════════════════════════
const NEKOS_BEST = 'https://nekos.best/api/v2';

const NEKOS_CATEGORIES = [
    'neko', 'waifu', 'husbando', 'kitsune',
    'happy', 'wink', 'wave', 'poke', 'dance',
    'cuddle', 'pat', 'hug', 'kiss', 'smile'
];

async function nekosBestRandom(category = 'neko') {
    try {
        const data = await httpGet(`${NEKOS_BEST}/${category}?amount=1`);
        const result = data?.results?.[0];
        if (result?.url && isUrl(result.url)) {
            return {
                url: result.url,
                artist: result.artist_name || null,
                source: result.source_url || null,
                anime: result.anime_name || null
            };
        }
        return null;
    } catch (e) {
        console.warn('[anime] Nekos.best:', e.message);
        return null;
    }
}

// ═══════════════════════════════════════════
//  API 3 — WAIFU.IM (SFW curated)
// ═══════════════════════════════════════════
const WAIFU_IM = 'https://api.waifu.im';

const WAIFU_TAGS = [
    'waifu', 'maid', 'marin-kitagawa', 'mori-calliope',
    'raiden-shogun', 'oppai', 'selfies', 'uniform',
    'kamisato-ayaka', 'genshin-impact'
];

async function waifuImRandom(tag) {
    try {
        const url = tag
            ? `${WAIFU_IM}/search?included_tags=${encodeURIComponent(tag)}&is_nsfw=false`
            : `${WAIFU_IM}/search?is_nsfw=false`;
        const data = await httpGet(url);
        const img = data?.images?.[0];
        if (img?.url && isUrl(img.url)) {
            return {
                url: img.url,
                artist: img.artist?.name || null,
                source: img.source || null,
                tags: img.tags?.map(t => t.name) || []
            };
        }
        return null;
    } catch (e) {
        console.warn('[anime] Waifu.im:', e.message);
        return null;
    }
}

// ═══════════════════════════════════════════
//  API 4 — NEKOSIA (keyless, no auth)
// ═══════════════════════════════════════════
async function nekosiaRandom() {
    try {
        const data = await httpGet('https://api.nekosia.cat/api/v1/images/catgirl');
        const url = data?.image?.original?.url || data?.image?.compressed?.url;
        if (url && isUrl(url)) {
            return { url, artist: data?.artist?.name || null, tags: data?.tags || [] };
        }
        return null;
    } catch (e) {
        console.warn('[anime] Nekosia:', e.message);
        return null;
    }
}

// ═══════════════════════════════════════════
//  API 5 — WAIFU.PICS (backup)
// ═══════════════════════════════════════════
async function waifuPicsRandom(category = 'waifu') {
    try {
        const data = await httpGet(`https://api.waifu.pics/sfw/${category}`);
        if (data?.url && isUrl(data.url)) return { url: data.url };
        return null;
    } catch (e) {
        console.warn('[anime] waifu.pics:', e.message);
        return null;
    }
}

// ═══════════════════════════════════════════
//  MASTER — Character image search
// ═══════════════════════════════════════════
async function getAnimeImages(query) {
    const urls = [];
    const seen = new Set();

    const push = arr => {
        for (const u of arr) {
            if (u && isUrl(u) && !seen.has(u)) { seen.add(u); urls.push(u); }
        }
    };

    // 1. Jikan character search (best for names)
    push(await jikanCharacterSearch(query));

    // 2. Jikan anime posters if < 2 results
    if (urls.length < 2) push(await jikanAnimeSearch(query));

    // 3. Random fallback
    if (!urls.length) {
        const fallbacks = [
            await waifuImRandom(),
            await nekosBestRandom('neko'),
            await waifuPicsRandom('waifu'),
            await nekosiaRandom()
        ];
        for (const f of fallbacks) if (f?.url) push([f.url]);
    }

    return urls.slice(0, 3);
}

// ═══════════════════════════════════════════
//  .anime — character/series search
// ═══════════════════════════════════════════
cmd({
    pattern: 'anime',
    alias: ['animes', 'animeimg', 'animepic', 'animecharacter'],
    desc: 'Search anime character images',
    category: 'fun',
    react: '🎀',
    use: '.anime <character or series>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const query = (ctx.q || '').trim();

    if (!query) {
        return ctx.reply(
`🎀 *RIZO ANIME CENTER*

📌 *Commands:*
• \`.anime <name>\` — character/series search
• \`.randomanime [category]\` — random SFW image
• \`.animegif <category>\` — random anime GIF
• \`.animetag <tag>\` — Waifu.im tag search
• \`.neko\` — random neko
• \`.waifu\` — random waifu
• \`.husbando\` — random husbando

📖 *Examples:*
.anime Naruto
.anime Mikasa
.randomanime
.animegif hug
.animetag maid`
        );
    }

    await conn.sendMessage(ctx.from, { react: { text: '🔍', key: mek.key } });

    try {
        const images = await getAnimeImages(query);

        if (!images.length) {
            return ctx.reply('❌ Koi image nahi mili. Dusra naam try karo.');
        }

        let sent = 0;
        for (const url of images) {
            try {
                await conn.sendMessage(ctx.from, {
                    image: { url },
                    caption: `🎀 *RIZO ANIME*\n🔎 ${clean(query)}\n🖼️ ${sent + 1}/${images.length}`
                }, { quoted: mek });
                sent++;
                await new Promise(r => setTimeout(r, 400));
            } catch (e) {
                console.warn('[anime] send fail:', e.message);
            }
        }

        if (!sent) return ctx.reply('❌ Images mili but send nahi ho saki.');

    } catch (err) {
        console.error('[anime] error:', err.message);
        return ctx.reply('❌ Anime search fail. Dobara try karo.');
    }
});

// ═══════════════════════════════════════════
//  .randomanime — random SFW image (multi-API)
// ═══════════════════════════════════════════
cmd({
    pattern: 'randomanime',
    alias: ['random', 'waifupic', 'animepicture'],
    desc: 'Random SFW anime image',
    category: 'fun',
    react: '🖼️',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    try {
        const sources = [
            await nekosBestRandom('neko'),
            await waifuImRandom(),
            await waifuPicsRandom('waifu'),
            await nekosiaRandom()
        ];
        const pick = sources.find(s => s?.url);

        if (!pick) return ctx.reply('❌ Random API unavailable.');

        let caption = '🖼️ *RIZO RANDOM ANIME*';
        if (pick.artist) caption += `\n🎨 Artist: ${clean(pick.artist)}`;
        if (pick.anime) caption += `\n📺 Anime: ${clean(pick.anime)}`;

        return conn.sendMessage(ctx.from, {
            image: { url: pick.url },
            caption
        }, { quoted: mek });

    } catch (e) {
        console.warn('[random] err:', e.message);
        return ctx.reply('❌ Random image fail.');
    }
});

// ═══════════════════════════════════════════
//  .animegif — random GIF from Nekos.best
// ═══════════════════════════════════════════
cmd({
    pattern: 'animegif',
    alias: ['gifanime', 'animeaction'],
    desc: 'Random anime GIF (hug, pat, kiss, dance, etc.)',
    category: 'fun',
    react: '🎬',
    use: '.animegif <category>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const category = (ctx.q || 'hug').toLowerCase().trim().split(/\s+/)[0];

    const validCats = ['hug', 'kiss', 'pat', 'cuddle', 'dance', 'wave', 'poke',
                       'happy', 'wink', 'smile', 'bite', 'blush', 'bored',
                       'cry', 'facepalm', 'highfive', 'kick', 'laugh',
                       'nod', 'nom', 'nope', 'pout', 'punch', 'shoot',
                       'shrug', 'slap', 'sleep', 'smug', 'stare', 'think',
                       'thumbsup', 'tickle', 'wag', 'yawn', 'yeet'];

    if (!validCats.includes(category)) {
        return ctx.reply(
`🎬 *ANIME GIF*

📌 *Usage:* .animegif <category>

📖 *Categories:*
${validCats.slice(0, 20).map(c => `• \`${c}\``).join('\n')}
...and ${validCats.length - 20} more

📖 *Example:* .animegif hug`
        );
    }

    try {
        const result = await nekosBestRandom(category);
        if (!result?.url) return ctx.reply('❌ GIF nahi mila.');

        let caption = `🎬 *RIZO ANIME GIF*\n✨ Category: \`${category}\``;
        if (result.anime) caption += `\n📺 Anime: ${clean(result.anime)}`;
        if (result.artist) caption += `\n🎨 Artist: ${clean(result.artist)}`;

        return conn.sendMessage(ctx.from, {
            video: { url: result.url },
            gifPlayback: true,
            caption
        }, { quoted: mek });

    } catch (e) {
        console.warn('[animegif] err:', e.message);
        return ctx.reply('❌ GIF fetch fail.');
    }
});

// ═══════════════════════════════════════════
//  .animetag — Waifu.im tag search
// ═══════════════════════════════════════════
cmd({
    pattern: 'animetag',
    alias: ['waifutag', 'tagsearch'],
    desc: 'Search by Waifu.im tag',
    category: 'fun',
    react: '🏷️',
    use: '.animetag <tag>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const tag = (ctx.q || '').toLowerCase().trim();

    if (!tag) {
        return ctx.reply(
`🏷️ *ANIME TAG SEARCH*

📌 *Usage:* .animetag <tag>

📖 *Popular tags:*
${WAIFU_TAGS.slice(0, 10).map(t => `• \`${t}\``).join('\n')}

📖 *Example:* .animetag maid`
        );
    }

    try {
        const result = await waifuImRandom(tag);
        if (!result?.url) return ctx.reply(`❌ Tag \`${tag}\` ke liye image nahi mili.`);

        let caption = `🏷️ *WAIFU TAG: ${clean(tag)}*`;
        if (result.artist) caption += `\n🎨 Artist: ${clean(result.artist)}`;
        if (result.tags?.length) caption += `\n🔖 Tags: ${result.tags.slice(0, 5).join(', ')}`;

        return conn.sendMessage(ctx.from, {
            image: { url: result.url },
            caption
        }, { quoted: mek });

    } catch (e) {
        return ctx.reply('❌ Tag search fail.');
    }
});

// ═══════════════════════════════════════════
//  .neko — random neko image
// ═══════════════════════════════════════════
cmd({
    pattern: 'neko',
    alias: ['nekopic', 'catgirl'],
    desc: 'Random neko image',
    category: 'fun',
    react: '🐱',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    try {
        const sources = [
            await nekosBestRandom('neko'),
            await nekosiaRandom(),
            await waifuPicsRandom('neko')
        ];
        const pick = sources.find(s => s?.url);
        if (!pick) return ctx.reply('❌ Neko API unavailable.');

        let caption = '🐱 *RIZO NEKO*';
        if (pick.artist) caption += `\n🎨 ${clean(pick.artist)}`;

        return conn.sendMessage(ctx.from, {
            image: { url: pick.url },
            caption
        }, { quoted: mek });

    } catch (e) {
        return ctx.reply('❌ Neko fail.');
    }
});

// ═══════════════════════════════════════════
//  .waifu — random waifu
// ═══════════════════════════════════════════
cmd({
    pattern: 'waifu',
    alias: ['waifupic', 'mywaifu'],
    desc: 'Random waifu image',
    category: 'fun',
    react: '💗',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    try {
        const sources = [
            await waifuImRandom(),
            await nekosBestRandom('waifu'),
            await waifuPicsRandom('waifu')
        ];
        const pick = sources.find(s => s?.url);
        if (!pick) return ctx.reply('❌ Waifu API unavailable.');

        let caption = '💗 *RIZO WAIFU*';
        if (pick.artist) caption += `\n🎨 ${clean(pick.artist)}`;

        return conn.sendMessage(ctx.from, {
            image: { url: pick.url },
            caption
        }, { quoted: mek });

    } catch (e) {
        return ctx.reply('❌ Waifu fail.');
    }
});

// ═══════════════════════════════════════════
//  .husbando — random husbando
// ═══════════════════════════════════════════
cmd({
    pattern: 'husbando',
    alias: ['husbandopic', 'myhusbando'],
    desc: 'Random husbando image',
    category: 'fun',
    react: '💙',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    try {
        const sources = [
            await nekosBestRandom('husbando'),
            await waifuPicsRandom('husbando')
        ];
        const pick = sources.find(s => s?.url);
        if (!pick) return ctx.reply('❌ Husbando API unavailable.');

        let caption = '💙 *RIZO HUSBANDO*';
        if (pick.artist) caption += `\n🎨 ${clean(pick.artist)}`;

        return conn.sendMessage(ctx.from, {
            image: { url: pick.url },
            caption
        }, { quoted: mek });

    } catch (e) {
        return ctx.reply('❌ Husbando fail.');
    }
});

console.log('[RIZO HELL-MD] Anime commands loaded (multi-API)');