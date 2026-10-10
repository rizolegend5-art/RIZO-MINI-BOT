const { cmd } = require('../arslan');
const config = require('../config');
const axios = require('axios');
const yts = require('yt-search');

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, */*'
    },
    maxRedirects: 10
};

// ===========================================================
// 🎯 Multi-API race for audio URL
// ===========================================================
async function getAudioUrl(youtubeUrl) {
    const apiCalls = [
        (async () => {
            const r = await axios.get(`https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`, AXIOS_DEFAULTS);
            if (r?.data?.dl) return { download: r.data.dl, title: r.data.title };
            throw new Error('Okatsu failed');
        })(),
        (async () => {
            const r = await axios.get(`https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`, AXIOS_DEFAULTS);
            if (r?.data?.success && r?.data?.data?.download_url) return { download: r.data.data.download_url, title: r.data.data.title };
            throw new Error('Yupra failed');
        })(),
        (async () => {
            const r = await axios.get(`https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(youtubeUrl)}&format=mp3`, AXIOS_DEFAULTS);
            if (r?.data?.success && r?.data?.downloadURL) return { download: r.data.downloadURL, title: r.data.title };
            throw new Error('EliteProTech failed');
        })(),
        (async () => {
            const r = await axios.get(`https://api.alyachan.pro/api/ytmp3?url=${encodeURIComponent(youtubeUrl)}&apikey=G7I6X7`, AXIOS_DEFAULTS);
            if (r?.data?.status && r?.data?.data?.url) return { download: r.data.data.url, title: r.data.data.title };
            throw new Error('Alya failed');
        })(),
        (async () => {
            const r = await axios.get(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(youtubeUrl)}`, AXIOS_DEFAULTS);
            if (r?.data?.status && r?.data?.result?.download?.url) return { download: r.data.result.download.url, title: r.data.result.metadata?.title };
            throw new Error('Vreden failed');
        })()
    ];

    return await Promise.any(apiCalls);
}

// ===========================================================
// 🎯 Buffer download with retry + redirect follow
// ===========================================================
async function downloadAudioBuffer(audioUrl, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await axios.get(audioUrl, {
                responseType: 'arraybuffer',
                timeout: 180000,
                maxRedirects: 20,
                maxContentLength: 100 * 1024 * 1024,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'audio/mpeg, audio/*, */*',
                    'Accept-Encoding': 'identity',
                    'Referer': 'https://www.youtube.com/'
                }
            });
            const buf = Buffer.from(res.data);
            if (buf.length < 5000) throw new Error('Buffer too small');
            return buf;
        } catch (err) {
            console.error(`Download attempt ${i + 1} failed:`, err.message);
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    throw new Error('All download attempts failed');
}

// ===========================================================
// SONG COMMAND
// ===========================================================
cmd({
    pattern: 'song',
    alias: ['ytmp3', 'play', 'mp3', 'gana', 'music', 'audio'],
    desc: 'YouTube MP3 download',
    category: 'download',
    react: '🎵',
    use: '.song <name>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const query = (ctx.q || '').trim();
    if (!query) return ctx.reply('🎵 Use: *.song <name>*');

    await conn.sendMessage(ctx.from, { react: { text: '⏳', key: mek.key } });

    try {
        let video;
        if (query.includes('youtube.com') || query.includes('youtu.be')) {
            video = { url: query, title: 'YouTube Audio', thumbnail: '' };
        } else {
            const search = await yts(query);
            if (!search?.videos?.length) throw new Error('NO_RESULT');
            video = search.videos[0];
        }

        if (video.thumbnail) {
            conn.sendMessage(ctx.from, {
                image: { url: video.thumbnail },
                caption: `🎵 *${video.title}*\n⏱ ${video.timestamp || 'N/A'}\n⬇️ Downloading…`
            }, { quoted: mek }).catch(() => {});
        }

        const audioData = await getAudioUrl(video.url);
        const buffer = await downloadAudioBuffer(audioData.download);
        const finalTitle = audioData.title || video.title || 'YouTube Audio';

        await conn.sendMessage(ctx.from, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: `${finalTitle.replace(/[^\w\s-]/g, '')}.mp3`,
            ptt: false
        }, { quoted: mek });

        await conn.sendMessage(ctx.from, { react: { text: '✅', key: mek.key } });

    } catch (err) {
        console.error('SONG ERROR:', err.message);
        await conn.sendMessage(ctx.from, { react: { text: '❌', key: mek.key } });

        if (err.message === 'NO_RESULT') return ctx.reply('❌ Koi song nahi mila.');
        if (err.name === 'AggregateError') return ctx.reply('❌ Sab API fail. 1 minute baad try karo.');
        return ctx.reply(`❌ Song fail: ${err.message}`);
    }
});