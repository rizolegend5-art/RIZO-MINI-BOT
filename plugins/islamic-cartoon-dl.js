const { cmd } = require('../arslan');
const config = require('../config');
const axios = require('axios');

const DL_API = 'https://api.qasimdev.dpdns.org/api/loaderto/download';
const API_KEY = process.env.ISLAMIC_DL_API_KEY || '';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function downloadWithRetry(url, format = '360', retries = 3) {
    if (!API_KEY) throw new Error('ISLAMIC_DL_API_KEY_NOT_CONFIGURED');
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(DL_API, {
                params: { apiKey: API_KEY, format, url },
                timeout: 120000
            });
            if (data?.data?.downloadUrl) return data.data;
            throw new Error('No download URL');
        } catch (err) {
            if (i === retries - 1) throw err;
            console.log(`Video downloader retry ${i + 1} failed; waiting briefly.`);
            await wait(2000);
        }
    }
    throw new Error('All attempts failed');
}

// ===========================================================
// ISLAMIC CARTOON — Prefer full episodes, skip Shorts/short clips
// ===========================================================
cmd({
    pattern: 'islamiccartoon',
    alias: ['icartoon', 'deenicartoon', 'kidscartoon'],
    desc: 'Find full-length Islamic cartoon episodes',
    category: 'islamic',
    react: '📺',
    use: '.islamiccartoon <cartoon name>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const query = (ctx.q || '').trim();
    if (!query) {
        return ctx.reply([
            '📺 *ISLAMIC CARTOON — FULL EPISODE SEARCH*',
            '',
            'Use: `.islamiccartoon <name>`',
            '',
            'Examples:',
            '• `.islamiccartoon Omar and Hana full episode`',
            '• `.islamiccartoon Prophet Stories full episode`',
            '• `.islamiccartoon Musa and Amina episode`',
            '',
            '🔎 Main 4-minute se lambi videos ko prefer karta hai aur Shorts/15-second clips ko skip karta hai.',
            'ℹ️ Full episode ka watch link bhejega; download provider agar sirf preview de to usay full episode keh kar nahi bhejega.'
        ].join('\n'));
    }

    try {
        const yts = require('yt-search');
        const searchQuery = query.startsWith('http') ? query : `${query} Islamic cartoon full episode`;
        let candidates = [];
        if (query.startsWith('http')) {
            // For supplied links, find metadata through YouTube search when possible.
            const idMatch = query.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
            if (!idMatch) return ctx.reply('❌ YouTube link sahi nahi lag raha. Cartoon ka naam likh kar try karo.');
            const result = await yts({ videoId: idMatch[1] });
            if (result && result.videoId) candidates = [result];
        } else {
            const result = await yts(searchQuery);
            candidates = result?.videos || [];
        }
        const durationSeconds = (v) => {
            if (typeof v.seconds === 'number') return v.seconds;
            const d = String(v.timestamp || v.duration || '');
            const parts = d.split(':').map(Number);
            if (!parts.length || parts.some(Number.isNaN)) return 0;
            return parts.reduce((total, part) => total * 60 + part, 0);
        };
        const full = candidates.filter(v => {
            const title = String(v.title || '').toLowerCase();
            const seconds = durationSeconds(v);
            return seconds >= 240 && !/\b(shorts?|15\s*seconds?|15\s*sec|clip|teaser|trailer)\b/i.test(title);
        }).sort((a,b) => durationSeconds(b) - durationSeconds(a));

        if (!full.length) {
            const fallback = candidates.find(v => v.url && !/shorts/i.test(String(v.url)));
            return ctx.reply([
                '😕 4 minute se lambi full episode nahi mili.',
                '',
                'Try karo: `.islamiccartoon Omar and Hana full episode Urdu`',
                fallback ? `\n🔎 Jo result mila (duration verify nahi hui):\n${fallback.title}\n${fallback.url}` : '',
                '',
                'Tip: official channel ka full-episode link use karo. Kuch download services video ko 15-second preview tak limit karti hain.'
            ].filter(Boolean).join('\n'));
        }

        const chosen = full[0];
        const seconds = durationSeconds(chosen);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const title = String(chosen.title || 'Islamic Cartoon Full Episode').slice(0, 180);
        const thumb = chosen.thumbnail || chosen.image;
        const caption = [
            '📺 *ISLAMIC CARTOON — FULL EPISODE*',
            '',
            `🎬 *${title}*`,
            `⏱️ Duration: *${mins}m ${String(secs).padStart(2,'0')}s*`,
            '',
            '▶️ *Full episode yahan dekho:*',
            chosen.url,
            '',
            '💚 RIZO HELL-MD | Shorts aur bohat choti clips ko filter kiya gaya hai.'
        ].join('\n');
        if (thumb) {
            await conn.sendMessage(ctx.from, { image: { url: thumb }, caption }, { quoted: mek });
        } else {
            await ctx.reply(caption);
        }
    } catch (err) {
        console.error('[ISLAMIC CARTOON] Error:', err.message);
        await ctx.reply('❌ Search abhi fail ho rahi hai. Thori dair baad dobara try karo.');
    }
});

// ===========================================================
// NAAT VIDEO — Naat download (video)
// ===========================================================
cmd({
    pattern: 'naatvideo',
    alias: ['naatvid', 'naatdl'],
    desc: 'Naat video download',
    category: 'islamic',
    react: '🎵',
    use: '.naatvideo <naat name>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const query = (ctx.q || '').trim();
    if (!query) {
        return ctx.reply([
            '🎵 *Naat Video Downloader*',
            '',
            'Use: `.naatvideo <naat name>`',
            '',
            '*Examples:*',
            '• `.naatvideo Rahmatun Lil Alameen`',
            '• `.naatvideo Tajdar e Haram`',
            '• `.naatvideo Ya Nabi Salam Alayka`'
        ].join('\n'));
    }

    try {
        let videoUrl, videoTitle, videoThumbnail;

        if (query.startsWith('http')) {
            videoUrl = query;
        } else {
            const yts = require('yt-search');
            const { videos } = await yts(`${query} naat`);
            if (!videos?.length) return ctx.reply('❌ Naat nahi mili!');
            videoUrl = videos[0].url;
            videoTitle = videos[0].title;
            videoThumbnail = videos[0].thumbnail;
        }

        const validYT = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
        if (!validYT) return ctx.reply('❌ Invalid YouTube link!');

        const thumb = videoThumbnail || `https://i.ytimg.com/vi/${validYT[1]}/sddefault.jpg`;
        await conn.sendMessage(ctx.from, {
            image: { url: thumb },
            caption: `🎵 *${videoTitle || query}*\n⬇️ Downloading naat...`
        }, { quoted: mek });

        const data = await downloadWithRetry(videoUrl, '360');

        await conn.sendMessage(ctx.from, {
            video: { url: data.downloadUrl },
            mimetype: 'video/mp4',
            fileName: `${data.title || videoTitle || 'naat'}.mp4`,
            caption: `🎵 *${data.title || videoTitle}*\n\n> *_Downloaded by ${config.BOT_NAME}_*`
        }, { quoted: mek });

    } catch (err) {
        console.error('[NAAT VIDEO] Download failed:', err.code || err.response?.status || 'request error');
        await ctx.reply(err.message === 'ISLAMIC_DL_API_KEY_NOT_CONFIGURED'
            ? '❌ Video downloader is not configured on this deployment.'
            : '❌ Video download service is temporarily unavailable. Try again later.');
    }
});

// ===========================================================
// ISLAMIC VIDEO — Islamic lecture/bayan download
// ===========================================================
cmd({
    pattern: 'islamicvideo',
    alias: ['islamvid', 'bayan'],
    desc: 'Islamic video download (lecture/bayan)',
    category: 'islamic',
    react: '🎥',
    use: '.islamicvideo <topic | link>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const query = (ctx.q || '').trim();
    if (!query) {
        return ctx.reply([
            '🎥 *Islamic Video Downloader*',
            '',
            'Use: `.islamicvideo <topic>`',
            '',
            '*Examples:*',
            '• `.islamicvideo Ramadan reminder`',
            '• `.islamicvideo Seerah of Prophet`',
            '• `.islamicvideo Islamic lecture English`',
            '• `.islamicvideo Quran recitation`'
        ].join('\n'));
    }

    try {
        let videoUrl, videoTitle, videoThumbnail;

        if (query.startsWith('http')) {
            videoUrl = query;
        } else {
            const yts = require('yt-search');
            const { videos } = await yts(`${query} islamic`);
            if (!videos?.length) return ctx.reply('❌ Koi video nahi mili!');
            videoUrl = videos[0].url;
            videoTitle = videos[0].title;
            videoThumbnail = videos[0].thumbnail;
        }

        const validYT = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
        if (!validYT) return ctx.reply('❌ Invalid YouTube link!');

        const thumb = videoThumbnail || `https://i.ytimg.com/vi/${validYT[1]}/sddefault.jpg`;
        await conn.sendMessage(ctx.from, {
            image: { url: thumb },
            caption: `🎥 *${videoTitle || query}*\n⬇️ Downloading...`
        }, { quoted: mek });

        const data = await downloadWithRetry(videoUrl, '360');

        await conn.sendMessage(ctx.from, {
            video: { url: data.downloadUrl },
            mimetype: 'video/mp4',
            fileName: `${data.title || videoTitle || 'islamic'}.mp4`,
            caption: `🎥 *${data.title || videoTitle}*\n\n> *_Downloaded by ${config.BOT_NAME}_*`
        }, { quoted: mek });

    } catch (err) {
        console.error('[ISLAMIC VIDEO] Download failed:', err.code || err.response?.status || 'request error');
        await ctx.reply(err.message === 'ISLAMIC_DL_API_KEY_NOT_CONFIGURED'
            ? '❌ Video downloader is not configured on this deployment.'
            : '❌ Video download service is temporarily unavailable. Try again later.');
    }
});

// ===========================================================
// PROPHET STORY VIDEO — Prophets ki kahani video
// ===========================================================
cmd({
    pattern: 'prophetvideo',
    alias: ['prophetstory-video', 'qasasvideo'],
    desc: 'Prophet story video download',
    category: 'islamic',
    react: '📚',
    use: '.prophetvideo <prophet name>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const query = (ctx.q || '').trim() || 'Prophet Muhammad';
    try {
        const yts = require('yt-search');
        const { videos } = await yts(`${query} prophet story islamic cartoon`);
        if (!videos?.length) return ctx.reply('❌ Nahi mili!');

        const vid = videos[0];
        await conn.sendMessage(ctx.from, {
            image: { url: vid.thumbnail },
            caption: `📚 *${vid.title}*\n⬇️ Downloading...`
        }, { quoted: mek });

        const data = await downloadWithRetry(vid.url, '360');

        await conn.sendMessage(ctx.from, {
            video: { url: data.downloadUrl },
            mimetype: 'video/mp4',
            fileName: `${data.title || vid.title}.mp4`,
            caption: `📚 *${data.title || vid.title}*\n\n> *_Downloaded by ${config.BOT_NAME}_*`
        }, { quoted: mek });

    } catch (err) {
        console.error('[PROPHET VIDEO] Download failed:', err.code || err.response?.status || 'request error');
        await ctx.reply(err.message === 'ISLAMIC_DL_API_KEY_NOT_CONFIGURED'
            ? '❌ Video downloader is not configured on this deployment.'
            : '❌ Video download service is temporarily unavailable. Try again later.');
    }
});