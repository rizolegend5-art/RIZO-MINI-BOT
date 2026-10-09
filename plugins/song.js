const { cmd } = require('../arslan');
const config = require('../config');
const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs-extra');

const AXIOS_DEFAULTS = {
    timeout: 20000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, audio/*, */*'
    },
    maxRedirects: 10,
    validateStatus: s => s < 500
};

// ===========================================================
// Fast multi-API — parallel race
// ===========================================================
async function getAudioFromApis(youtubeUrl) {
    const apiCalls = [
        // 1. EliteProTech
        (async () => {
            const r = await axios.get(`https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(youtubeUrl)}&format=mp3`, AXIOS_DEFAULTS);
            if (r?.data?.success && r?.data?.downloadURL) {
                return { download: r.data.downloadURL, title: r.data.title, source: 'EliteProTech' };
            }
            throw new Error('EliteProTech failed');
        })(),

        // 2. Yupra
        (async () => {
            const r = await axios.get(`https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`, AXIOS_DEFAULTS);
            if (r?.data?.success && r?.data?.data?.download_url) {
                return { download: r.data.data.download_url, title: r.data.data.title, source: 'Yupra' };
            }
            throw new Error('Yupra failed');
        })(),

        // 3. Okatsu
        (async () => {
            const r = await axios.get(`https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`, AXIOS_DEFAULTS);
            if (r?.data?.dl) {
                return { download: r.data.dl, title: r.data.title, source: 'Okatsu' };
            }
            throw new Error('Okatsu failed');
        })(),

        // 4. Alya
        (async () => {
            const r = await axios.get(`https://api.alyachan.pro/api/ytmp3?url=${encodeURIComponent(youtubeUrl)}&apikey=G7I6X7`, AXIOS_DEFAULTS);
            if (r.data?.status && r.data?.data?.url) {
                return { download: r.data.data.url, title: r.data.data.title, source: 'Alya' };
            }
            throw new Error('Alya failed');
        })(),

        // 5. Vreden
        (async () => {
            const r = await axios.get(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(youtubeUrl)}`, AXIOS_DEFAULTS);
            if (r.data?.status && r.data?.result?.download?.url) {
                return { download: r.data.result.download.url, title: r.data.result.metadata?.title || 'Audio', source: 'Vreden' };
            }
            throw new Error('Vreden failed');
        })()
    ];

    // Race — jo pehle success de
    return await Promise.any(apiCalls);
}

// ===========================================================
// 🚀 Audio download + buffer me convert karo (STREAM ki jagah)
// ===========================================================
async function downloadAudioBuffer(audioUrl) {
    const res = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 120000,
        maxRedirects: 10,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'audio/*, */*',
            'Referer': 'https://www.youtube.com/'
        }
    });
    return Buffer.from(res.data);
}

// ===========================================================
// SONG — Fast YouTube MP3
// ===========================================================
cmd({
    pattern: 'song',
    alias: ['ytmp3', 'play', 'mp3', 'gana', 'music', 'audio'],
    desc: 'YouTube MP3 download',
    category: 'download',
    react: '🎵',
    use: '.song <name | youtube link>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const query = (ctx.q || '').trim();
    if (!query) {
        return ctx.reply('🎵 Use: *.song <song name>*\nExample: *.song pal pal*');
    }

    await conn.sendMessage(ctx.from, { react: { text: '⏳', key: mek.key } });

    try {
        // 1. YouTube search / URL
        let video;
        if (query.includes('youtube.com') || query.includes('youtu.be')) {
            video = { url: query, title: 'YouTube Audio', thumbnail: '' };
        } else {
            const search = await yts(query);
            if (!search?.videos?.length) throw new Error('NO_RESULT');
            video = search.videos[0];
        }

        // 2. Show thumbnail + title
        if (video.thumbnail) {
            await conn.sendMessage(ctx.from, {
                image: { url: video.thumbnail },
                caption: `🎵 *${video.title}*\n⏱ ${video.timestamp || 'N/A'}\n⬇️ Downloading…`
            }, { quoted: mek }).catch(() => {});
        }

        // 3. Multi-API race
        const audioData = await getAudioFromApis(video.url);
        const finalTitle = audioData.title || video.title || 'YouTube Audio';

        // 4. 🚀 Buffer me download karo (stream ki jagah — reliable)
        const buffer = await downloadAudioBuffer(audioData.download);

        if (!buffer || buffer.length < 1000) {
            throw new Error('Empty audio buffer');
        }

        // 5. Audio bhejo (buffer se — 100% reliable)
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

        if (err.message === 'NO_RESULT') {
            return ctx.reply('❌ Koi song nahi mila.');
        }
        if (err.name === 'AggregateError' || err.message.includes('All promises were rejected')) {
            return ctx.reply('❌ Sab API fail. 1 minute baad dobara try karo.');
        }
        if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
            return ctx.reply('❌ Download timeout. Dobara try karo.');
        }
        return ctx.reply(`❌ Song download fail: ${err.message}`);
    }
});