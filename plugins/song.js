// ============================================
// RIZO HELL-MD | SONG + LYRICS COMMANDS
// Railway Deployment
// ============================================

const { cmd } = require('../arslan');
const axios = require('axios');
const yts = require('yt-search');

const MUSIC_CONFIG = {
    apiTimeout: 20000,
    downloadTimeout: 120000,
    maxAudioSize: 100 * 1024 * 1024,
    userAgent: 'Mozilla/5.0'
};

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms));

// ============================================
// MULTI API AUDIO URL
// ============================================

async function getAudioUrl(youtubeUrl) {
    const encodedUrl = encodeURIComponent(youtubeUrl);

    const apis = [
        {
            name: 'Okatsu',
            url: `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodedUrl}`,
            parse: d => d?.dl
                ? { download: d.dl, title: d.title }
                : null
        },
        {
            name: 'Yupra',
            url: `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodedUrl}`,
            parse: d => d?.success && d?.data?.download_url
                ? {
                    download: d.data.download_url,
                    title: d.data.title
                }
                : null
        },
        {
            name: 'EliteProTech',
            url: `https://eliteprotech-apis.zone.id/ytdown?url=${encodedUrl}&format=mp3`,
            parse: d => d?.success && d?.downloadURL
                ? {
                    download: d.downloadURL,
                    title: d.title
                }
                : null
        },
        {
            name: 'Vreden',
            url: `https://api.vreden.my.id/api/ytmp3?url=${encodedUrl}`,
            parse: d => d?.status && d?.result?.download?.url
                ? {
                    download: d.result.download.url,
                    title: d.result.metadata?.title
                }
                : null
        }
    ];

    for (const api of apis) {
        try {
            console.log(`[RIZO MUSIC] Trying ${api.name}`);

            const response = await axios.get(api.url, {
                timeout: MUSIC_CONFIG.apiTimeout,
                headers: {
                    'User-Agent': MUSIC_CONFIG.userAgent,
                    'Accept': 'application/json'
                }
            });

            const result = api.parse(response.data);

            if (
                result?.download &&
                /^https?:\/\//i.test(result.download)
            ) {
                console.log(`[RIZO MUSIC] ${api.name} returned URL`);
                return result;
            }

            console.warn(`[RIZO MUSIC] ${api.name}: invalid response`);

        } catch (error) {
            console.warn(
                `[RIZO MUSIC] ${api.name}: ${error.message}`
            );
        }
    }

    throw new Error('ALL_AUDIO_APIS_FAILED');
}

// ============================================
// DOWNLOAD AUDIO WITH RETRIES
// ============================================

async function downloadAudioBuffer(audioUrl) {
    let lastError;

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await axios.get(audioUrl, {
                responseType: 'arraybuffer',
                timeout: MUSIC_CONFIG.downloadTimeout,
                maxRedirects: 10,
                maxContentLength: MUSIC_CONFIG.maxAudioSize,
                headers: {
                    'User-Agent': MUSIC_CONFIG.userAgent,
                    'Accept': 'audio/*, application/octet-stream, */*',
                    'Accept-Encoding': 'identity'
                }
            });

            const contentType =
                response.headers['content-type'] || '';

            const buffer = Buffer.from(response.data);

            if (
                buffer.length < 5000 ||
                contentType.includes('text/html') ||
                contentType.includes('application/json')
            ) {
                throw new Error('Invalid audio response');
            }

            return buffer;

        } catch (error) {
            lastError = error;

            console.error(
                `[RIZO MUSIC] Download attempt ${attempt}:`,
                error.message
            );

            if (attempt < 3) {
                await sleep(1500);
            }
        }
    }

    throw lastError || new Error('Audio download failed');
}

// ============================================
// SONG SEARCH
// ============================================

async function searchSong(query) {
    if (/youtube\.com|youtu\.be/i.test(query)) {
        const result = await yts(query);
        const video = result?.videos?.[0];

        if (video) return video;

        return {
            url: query,
            title: 'YouTube Audio',
            timestamp: 'Unknown',
            author: { name: 'Unknown' }
        };
    }

    const result = await yts(query);

    if (!result?.videos?.length) {
        throw new Error('NO_RESULT');
    }

    return result.videos[0];
}

// ============================================
// SONG / PLAY / MP3 COMMAND
// ============================================

cmd({
    pattern: 'song',
    alias: ['play', 'ytmp3', 'mp3', 'gana', 'music', 'audio'],
    desc: 'Download song audio',
    category: 'download',
    react: '🎵',
    use: '.play <song name>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const query = (ctx.q || '').trim();

    if (!query) {
        return ctx.reply(
            '🎵 *RIZO HELL-MD MUSIC*\n\n' +
            'Use: .play song name\n' +
            'Example: .play Pal Pal Afusic'
        );
    }

    await conn.sendMessage(ctx.from, {
        react: { text: '⏳', key: mek.key }
    });

    try {
        const video = await searchSong(query);

        await conn.sendMessage(ctx.from, {
            text:
                '🎵 *RIZO HELL-MD*\n\n' +
                `📌 ${video.title}\n` +
                `🎤 ${video.author?.name || 'Unknown artist'}\n` +
                `⏱️ ${video.timestamp || 'Unknown'}\n\n` +
                '⬇️ Preparing audio...'
        }, { quoted: mek });

        const audioData = await getAudioUrl(video.url);

        const buffer = await downloadAudioBuffer(
            audioData.download
        );

        const filename = (
            audioData.title || video.title || 'RIZO-Song'
        )
            .replace(/[\\/:*?"<>|]/g, '')
            .slice(0, 100) + '.mp3';

        await conn.sendMessage(ctx.from, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: filename,
            ptt: false
        }, { quoted: mek });

        await conn.sendMessage(ctx.from, {
            react: { text: '✅', key: mek.key }
        });

    } catch (error) {
        console.error('[RIZO SONG ERROR]', error);

        await conn.sendMessage(ctx.from, {
            react: { text: '❌', key: mek.key }
        });

        if (error.message === 'NO_RESULT') {
            return ctx.reply('❌ Song nahi mila. Dusra naam try karo.');
        }

        if (error.message === 'ALL_AUDIO_APIS_FAILED') {
            return ctx.reply(
                '❌ Abhi tamam audio APIs fail hain.\n' +
                'Thori der baad dobara try karo.'
            );
        }

        return ctx.reply(
            '❌ Audio download fail hua.\n' +
            'Dusra song ya YouTube URL try karo.'
        );
    }
});

// ============================================
// LYRICS COMMAND
// ============================================

cmd({
    pattern: 'lyrics',
    alias: ['lyric'],
    desc: 'Search song lyrics',
    category: 'search',
    react: '📃',
    use: '.lyrics <song name>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const query = (ctx.q || '').trim();

    if (!query) {
        return ctx.reply(
            '📃 *RIZO HELL-MD LYRICS*\n\n' +
            'Use: .lyrics song name\n' +
            'Example: .lyrics Pal Pal Afusic'
        );
    }

    await conn.sendMessage(ctx.from, {
        react: { text: '🔎', key: mek.key }
    });

    try {
        const search = await yts(query);
        const video = search?.videos?.[0];

        if (!video) {
            throw new Error('NO_RESULT');
        }

        const artist = video.author?.name || '';
        const title = video.title || query;

        // Lyrics.ovh public endpoint.
        // It may not have every song or artist.
        const lyricsResponse = await axios.get(
            `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
            {
                timeout: 20000,
                headers: {
                    'User-Agent': MUSIC_CONFIG.userAgent
                }
            }
        );

        const lyrics = lyricsResponse.data?.lyrics?.trim();

        if (!lyrics) {
            throw new Error('LYRICS_NOT_FOUND');
        }

        // Send in smaller chunks to avoid oversized messages.
        const header =
            `📃 *RIZO HELL-MD LYRICS*\n\n` +
            `🎵 ${title}\n` +
            `🎤 ${artist}\n\n`;

        const chunks = lyrics.match(/[\s\S]{1,3000}/g) || [];

        for (let i = 0; i < chunks.length; i++) {
            await conn.sendMessage(ctx.from, {
                text: (i === 0 ? header : '') + chunks[i]
            }, { quoted: mek });
        }

        await conn.sendMessage(ctx.from, {
            react: { text: '✅', key: mek.key }
        });

    } catch (error) {
        console.error('[RIZO LYRICS ERROR]', error.message);

        await conn.sendMessage(ctx.from, {
            react: { text: '❌', key: mek.key }
        });

        if (error.message === 'NO_RESULT') {
            return ctx.reply('❌ Song search mein nahi mila.');
        }

        if (
            error.message === 'LYRICS_NOT_FOUND' ||
            error.response?.status === 404
        ) {
            return ctx.reply(
                '❌ Is song ke lyrics available nahi hain.\n' +
                'Song aur artist ka naam saath likh kar try karo.'
            );
        }

        return ctx.reply(
            '❌ Lyrics service abhi respond nahi kar rahi. Baad mein try karo.'
        );
    }
});

console.log('[RIZO HELL-MD] Song and lyrics commands loaded');