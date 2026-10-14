const { cmd } = require('../arslan');
const config = require('../config');
const axios = require('axios');

const DL_API = 'https://api.qasimdev.dpdns.org/api/loaderto/download';
const API_KEY = 'xbps-install-Syu';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function downloadWithRetry(url, format = '360', retries = 3) {
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
            console.log(`Retry ${i + 1} failed, waiting 5s...`);
            await wait(5000);
        }
    }
    throw new Error('All attempts failed');
}

// ===========================================================
// ISLAMIC CARTOON — Bachon ke Islamic cartoons download
// ===========================================================
cmd({
    pattern: 'islamiccartoon',
    alias: ['icartoon', 'deenicartoon', 'kidscartoon'],
    desc: 'Islamic cartoon download (video)',
    category: 'islamic',
    react: '📺',
    use: '.islamiccartoon <name | youtube link>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const query = (ctx.q || '').trim();
    if (!query) {
        return ctx.reply([
            '📺 *Islamic Cartoon Downloader*',
            '',
            'Use: `.islamiccartoon <name>`',
            '',
            '*Popular cartoons:*',
            '• `.islamiccartoon Omar and Hana`',
            '• `.islamiccartoon Ghulam Rasool`',
            '• `.islamiccartoon Musa and Amina`',
            '• `.islamiccartoon Prophet Stories`',
            '• `.islamiccartoon The Jar Tale East`'
        ].join('\n'));
    }

    try {
        let videoUrl;
        let videoTitle;
        let videoThumbnail;

        if (query.startsWith('http://') || query.startsWith('https://')) {
            videoUrl = query;
        } else {
            const yts = require('yt-search');
            const searchQuery = `${query} islamic cartoon`;
            const { videos } = await yts(searchQuery);
            if (!videos?.length) {
                return ctx.reply('❌ Koi cartoon nahi mila!');
            }
            videoUrl = videos[0].url;
            videoTitle = videos[0].title;
            videoThumbnail = videos[0].thumbnail;
        }

        const validYT = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
        if (!validYT) {
            return ctx.reply('❌ Valid YouTube link nahi!');
        }

        const ytId = validYT[1];
        const thumb = videoThumbnail || `https://i.ytimg.com/vi/${ytId}/sddefault.jpg`;

        await conn.sendMessage(ctx.from, {
            image: { url: thumb },
            caption: `📺 *ISLAMIC CARTOON*\n\n🎬 *${videoTitle || query}*\n⬇️ Downloading... *(30-60s lag sakte hain)*`
        }, { quoted: mek });

        const videoData = await downloadWithRetry(videoUrl, '360');

        await conn.sendMessage(ctx.from, {
            video: { url: videoData.downloadUrl },
            mimetype: 'video/mp4',
            fileName: `${videoData.title || videoTitle || 'cartoon'}.mp4`,
            caption: `📺 *${videoData.title || videoTitle || 'Islamic Cartoon'}*\n\n> *_Downloaded by ${config.BOT_NAME}_*`
        }, { quoted: mek });

    } catch (err) {
        console.error('[ISLAMIC CARTOON] Error:', err.message);
        const reason = err.response?.status === 408
            ? 'Download timeout. Dobara try karo.'
            : err.message;
        await ctx.reply(`❌ Download fail: ${reason}`);
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
        console.error('[NAAT VIDEO] Error:', err.message);
        await ctx.reply(`❌ Download fail: ${err.message}`);
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
        console.error('[ISLAMIC VIDEO] Error:', err.message);
        await ctx.reply(`❌ Download fail: ${err.message}`);
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
        console.error('[PROPHET VIDEO] Error:', err.message);
        await ctx.reply(`❌ Download fail: ${err.message}`);
    }
});