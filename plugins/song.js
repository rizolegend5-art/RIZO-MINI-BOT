const { cmd } = require('../arslan');
const config = require('../config');
const axios = require('axios');
const yts = require('yt-search');
const { toAudio } = require('../lib/converter');

const AXIOS_DEFAULTS = {
    timeout: 15000,   // 60s se 15s kar diya
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
    }
};

// ===========================================================
// Fast multi-API — parallel race (jo pehle success de wahi jeete)
// ===========================================================
async function getAudioFromApis(youtubeUrl) {
    const apiCalls = [
        // EliteProTech
        (async () => {
            const r = await axios.get(`https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(youtubeUrl)}&format=mp3`, AXIOS_DEFAULTS);
            if (r?.data?.success && r?.data?.downloadURL) {
                return { download: r.data.downloadURL, title: r.data.title, source: 'EliteProTech' };
            }
            throw new Error('EliteProTech failed');
        })(),

        // Yupra
        (async () => {
            const r = await axios.get(`https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`, AXIOS_DEFAULTS);
            if (r?.data?.success && r?.data?.data?.download_url) {
                return { download: r.data.data.download_url, title: r.data.data.title, thumbnail: r.data.data.thumbnail, source: 'Yupra' };
            }
            throw new Error('Yupra failed');
        })(),

        // Okatsu
        (async () => {
            const r = await axios.get(`https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`, AXIOS_DEFAULTS);
            if (r?.data?.dl) {
                return { download: r.data.dl, title: r.data.title, thumbnail: r.data.thumb, source: 'Okatsu' };
            }
            throw new Error('Okatsu failed');
        })(),

        // Alya
        (async () => {
            const r = await axios.get(`https://api.alyachan.pro/api/ytmp3?url=${encodeURIComponent(youtubeUrl)}&apikey=G7I6X7`, AXIOS_DEFAULTS);
            if (r.data.status && r.data.data.url) {
                return { download: r.data.data.url, title: r.data.data.title, source: 'Alya' };
            }
            throw new Error('Alya failed');
        })(),

        // Vreden
        (async () => {
            const r = await axios.get(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(youtubeUrl)}`, AXIOS_DEFAULTS);
            if (r.data.status && r.data.result.download.url) {
                return { download: r.data.result.download.url, title: r.data.result.metadata.title, source: 'Vreden' };
            }
            throw new Error('Vreden failed');
        })()
    ];

    // 🚀 RACE — jo pehle success de wahi return karo
    return await Promise.any(apiCalls);
}

// ===========================================================
// SONG — Fast YouTube MP3
// ===========================================================
cmd({
    pattern: 'song',
    alias: ['ytmp3', 'play', 'mp3', 'gana', 'music', 'audio'],
    desc: 'YouTube MP3 download (fast)',
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
        let video;
        if (query.includes('youtube.com') || query.includes('youtu.be')) {
            video = { url: query, title: 'YouTube Audio', thumbnail: '' };
        } else {
            const search = await yts(query);
            if (!search?.videos?.length) throw new Error('NO_RESULT');
            video = search.videos[0];
        }

        // Show "downloading" message (fast)
        if (video.thumbnail) {
            conn.sendMessage(ctx.from, {
                image: { url: video.thumbnail },
                caption: `🎵 *${video.title}*\n⏱ ${video.timestamp || 'N/A'}\n⬇️ Downloading…`
            }, { quoted: mek }).catch(() => {});
        }

        // 🚀 RACE — fast API select
        const audioData = await getAudioFromApis(video.url);
        const finalTitle = audioData.title || video.title || 'YouTube Audio';

        // 🚀 Stream audio directly (no full download to memory)
        await conn.sendMessage(ctx.from, {
            audio: { url: audioData.download },
            mimetype: 'audio/mpeg',
            fileName: `${finalTitle.replace(/[^\w\s-]/g, '')}.mp3`,
            ptt: false
        }, { quoted: mek });

        await conn.sendMessage(ctx.from, { react: { text: '✅', key: mek.key } });

    } catch (err) {
        console.error('SONG ERROR:', err.message);
        await conn.sendMessage(ctx.from, { react: { text: '❌', key: mek.key } });

        if (err.message === 'NO_RESULT') return ctx.reply('❌ Koi song nahi mila.');
        if (err.name === 'AggregateError') return ctx.reply('❌ Sab API fail ho gayi. Dobara try karo.');
        return ctx.reply(`❌ Song download fail: ${err.message}`);
    }
});