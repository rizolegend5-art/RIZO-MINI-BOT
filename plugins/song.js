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
            name: 'EliteProTech',
            url: `https://eliteprotech-apis.zone.id/ytdown?url=${encodedUrl}&format=mp3`,
            parse: d => d?.downloadURL ? { download: d.downloadURL, title: d.title } : null
        },
        {
            name: 'Vreden',
            url: `https://api.vreden.my.id/api/ytmp3?url=${encodedUrl}`,
            parse: d => d?.result?.download?.url ? { download: d.result.download.url, title: d.result.metadata?.title } : null
        },
        {
            name: 'Yupra',
            url: `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodedUrl}`,
            parse: d => d?.data?.download_url ? { download: d.data.download_url, title: d.data.title } : null
        },
        {
            name: 'Okatsu',
            url: `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodedUrl}`,
            parse: d => d?.dl ? { download: d.dl, title: d.title } : null
        },
        // Optional provider: store its key in Railway Variables, never in source code.
        ...(process.env.ALYACHAN_API_KEY ? [{
            name: 'AlyaChan',
            url: `https://api.alyachan.pro/api/ytmp3?url=${encodedUrl}&apikey=${encodeURIComponent(process.env.ALYACHAN_API_KEY)}`,
            parse: d => {
                const url = d?.result?.url || d?.result?.downloadUrl || d?.data?.url || d?.url;
                return url ? { download: url, title: d?.result?.title || d?.data?.title || d?.title } : null;
            }
        }] : [])
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

            const contentType = String(response.headers['content-type'] || '').toLowerCase();

            const buffer = Buffer.from(response.data);

            if (
                buffer.length < 5000 ||
                contentType.includes('text/html') ||
                contentType.includes('application/json') ||
                contentType.includes('text/plain')
            ) {
                throw new Error('Invalid audio response');
            }

            // Reject common HTML/JSON error payloads even when the provider lies about MIME type.
            const head = buffer.subarray(0, 80).toString('utf8').trim().toLowerCase();
            if (head.startsWith('<!doctype html') || head.startsWith('<html') || head.startsWith('{\"error')) {
                throw new Error('Provider returned an error page instead of audio');
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
// LYRICS FINDER — returns legitimate lookup links, not full copyrighted lyrics
// ============================================

cmd({
    pattern: 'lyrics',
    alias: ['lyric', 'songlyrics'],
    desc: 'Find song lyrics sources',
    category: 'search',
    react: '📃',
    use: '.lyrics <song name and artist>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const query = (ctx.q || '').trim();
    if (!query) return ctx.reply('📃 *RIZO HELL-MD LYRICS FINDER*\n\nUse: .lyrics song name artist\nExample: .lyrics Pal Pal Afusic');
    try {
        let title = query;
        let artist = '';
        try {
            const found = await yts(query);
            const video = found?.videos?.[0];
            if (video) {
                title = video.title || query;
                artist = video.author?.name || '';
            }
        } catch (_) {}
        let lrclibUrl = `https://lrclib.net/search/${encodeURIComponent(query)}`;
        try {
            const result = await axios.get('https://lrclib.net/api/search', {
                params: { q: query }, timeout: 10000,
                headers: { 'User-Agent': 'RIZO-HELL-MD/1.0 (lyrics link finder)' }
            });
            const row = Array.isArray(result.data) ? result.data.find(x => x?.trackName || x?.name) : null;
            if (row?.id) lrclibUrl = `https://lrclib.net/search?q=${encodeURIComponent(query)}`;
            if (row?.trackName) title = row.trackName;
            if (row?.artistName) artist = row.artistName;
        } catch (_) {}
        const geniusUrl = `https://genius.com/search?q=${encodeURIComponent(query)}`;
        const musixmatchUrl = `https://www.musixmatch.com/search/${encodeURIComponent(query)}`;
        return ctx.reply(
            `📃 *RIZO HELL-MD — LYRICS FINDER*\n\n` +
            `🎵 *${String(title).slice(0, 180)}*\n` +
            (artist ? `🎤 ${String(artist).slice(0, 100)}\n\n` : '\n') +
            `🔎 *Lyrics sources:*\n` +
            `• LRCLIB: ${lrclibUrl}\n` +
            `• Genius: ${geniusUrl}\n` +
            `• Musixmatch: ${musixmatchUrl}\n\n` +
            `_Open a source to read lyrics where available._`
        );
    } catch (error) {
        console.error('[RIZO LYRICS ERROR]', error.message);
        return ctx.reply('❌ Lyrics search abhi unavailable hai. Thori dair baad try karo.');
    }
});

console.log('[RIZO HELL-MD] Song and lyrics commands loaded');
