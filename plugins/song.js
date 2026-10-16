// plugins/song.js
// RIZO HELL-MD — Song download with working 2026 APIs

const { cmd } = require('../arslan');
const axios = require('axios');
const yts = require('yt-search');

const CONFIG = {
    apiTimeout: 20000,
    downloadTimeout: 120000,
    maxAudioSize: 100 * 1024 * 1024,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════════
//  MULTI-API AUDIO URL — 2026 working APIs
// ═══════════════════════════════════════════
async function getAudioUrl(youtubeUrl) {
    const enc = encodeURIComponent(youtubeUrl);
    const videoId = extractVideoId(youtubeUrl);

    const apis = [
        // 1. Cobalt API (open source, popular, working)
        {
            name: 'Cobalt',
            method: 'POST',
            url: 'https://api.cobalt.tools/api/json',
            data: { url: youtubeUrl, isAudioOnly: true, aFormat: 'mp3' },
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            parse: d => d?.url ? { download: d.url, title: null } : null
        },
        // 2. Loader.to (reliable)
        {
            name: 'Loader.to',
            method: 'GET',
            url: `https://loader.to/ajax/download.php?format=mp3&url=${enc}`,
            parse: d => d?.id ? { download: `https://loader.to/ajax/progress.php?id=${d.id}`, title: d.title, needsFetch: true, id: d.id } : null
        },
        // 3. Y2Mate API
        {
            name: 'Y2Mate',
            method: 'POST',
            url: 'https://api.y2mate.com/api/convert',
            data: { url: youtubeUrl, format: 'mp3', quality: '320' },
            headers: { 'Content-Type': 'application/json' },
            parse: d => d?.downloadUrl ? { download: d.downloadUrl, title: d.title } : null
        },
        // 4. Direct cobalt mirror
        {
            name: 'Cobalt-Mirror',
            method: 'POST',
            url: 'https://co.wuk.sh/api/json',
            data: { url: youtubeUrl, isAudioOnly: true },
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            parse: d => d?.url ? { download: d.url, title: null } : null
        },
        // 5. YTMP3 via Vercel (community)
        {
            name: 'YTMP3-Community',
            method: 'GET',
            url: `https://yt-api-psi.vercel.app/api/ytmp3?url=${enc}`,
            parse: d => (d?.url || d?.download) ? { download: d.url || d.download, title: d.title } : null
        },
        // 6. Ryzen API
        {
            name: 'Ryzen',
            method: 'GET',
            url: `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${enc}`,
            parse: d => d?.url ? { download: d.url, title: d.title } : null
        },
        // 7. Optional — AlyaChan (Railway env)
        ...(process.env.ALYACHAN_API_KEY ? [{
            name: 'AlyaChan',
            method: 'GET',
            url: `https://api.alyachan.pro/api/ytmp3?url=${enc}&apikey=${encodeURIComponent(process.env.ALYACHAN_API_KEY)}`,
            parse: d => {
                const u = d?.result?.url || d?.result?.downloadUrl || d?.data?.url || d?.url;
                return u ? { download: u, title: d?.result?.title || d?.data?.title } : null;
            }
        }] : [])
    ];

    for (const api of apis) {
        try {
            console.log(`[RIZO MUSIC] Trying ${api.name}`);

            const cfg = {
                method: api.method || 'GET',
                url: api.url,
                timeout: CONFIG.apiTimeout,
                headers: {
                    'User-Agent': CONFIG.userAgent,
                    'Accept': 'application/json',
                    ...(api.headers || {})
                }
            };
            if (api.data) cfg.data = api.data;

            const res = await axios(cfg);
            const result = api.parse(res.data);

            if (result?.download) {
                // some APIs need a secondary fetch (loader.to)
                if (result.needsFetch && result.id) {
                    const final = await resolveLoaderTo(result.id);
                    if (final) return { download: final, title: result.title };
                    continue;
                }
                console.log(`[RIZO MUSIC] ✅ ${api.name} → ${result.download.slice(0, 60)}...`);
                return result;
            }
            console.warn(`[RIZO MUSIC] ${api.name}: no download field`);
        } catch (err) {
            console.warn(`[RIZO MUSIC] ${api.name}: ${err.message}`);
        }
    }

    throw new Error('ALL_AUDIO_APIS_FAILED');
}

// ═══════════════════════════════════════════
//  LOADER.TO — secondary fetch for real URL
// ═══════════════════════════════════════════
async function resolveLoaderTo(id) {
    for (let i = 0; i < 20; i++) {
        try {
            await sleep(1500);
            const r = await axios.get(`https://loader.to/ajax/progress.php?id=${id}`, { timeout: 10000 });
            const d = r.data;
            if (d?.download_url) return d.download_url;
            if (d?.progress >= 1000 || d?.success) return d?.download_url || null;
        } catch (_) {}
    }
    return null;
}

function extractVideoId(url) {
    const m = String(url).match(/(?:youtu\.be\/|v=)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
}

// ═══════════════════════════════════════════
//  DOWNLOAD AUDIO BUFFER (unchanged)
// ═══════════════════════════════════════════
async function downloadAudioBuffer(audioUrl) {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await axios.get(audioUrl, {
                responseType: 'arraybuffer',
                timeout: CONFIG.downloadTimeout,
                maxRedirects: 10,
                maxContentLength: CONFIG.maxAudioSize,
                headers: {
                    'User-Agent': CONFIG.userAgent,
                    'Accept': 'audio/*, application/octet-stream, */*',
                    'Accept-Encoding': 'identity'
                }
            });

            const ct = String(res.headers['content-type'] || '').toLowerCase();
            const buf = Buffer.from(res.data);

            if (buf.length < 5000) throw new Error('Too small');
            if (ct.includes('text/html') || ct.includes('application/json') || ct.includes('text/plain')) {
                throw new Error('Invalid content-type');
            }

            const head = buf.subarray(0, 80).toString('utf8').trim().toLowerCase();
            if (head.startsWith('<!doctype') || head.startsWith('<html') || head.startsWith('{"error')) {
                throw new Error('HTML/JSON error payload');
            }
            return buf;
        } catch (err) {
            lastError = err;
            console.error(`[RIZO MUSIC] Download attempt ${attempt}: ${err.message}`);
            if (attempt < 3) await sleep(1500);
        }
    }
    throw lastError || new Error('Download failed');
}

// ═══════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════
async function searchSong(query) {
    if (/youtube\.com|youtu\.be/i.test(query)) {
        const r = await yts(query);
        return r?.videos?.[0] || { url: query, title: 'YouTube Audio', timestamp: 'Unknown', author: { name: 'Unknown' } };
    }
    const r = await yts(query);
    if (!r?.videos?.length) throw new Error('NO_RESULT');
    return r.videos[0];
}

// ═══════════════════════════════════════════
//  .play / .song COMMAND
// ═══════════════════════════════════════════
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
        return ctx.reply('🎵 *RIZO HELL-MD MUSIC*\n\nUse: .play song name\nExample: .play Pal Pal Afusic');
    }

    await conn.sendMessage(ctx.from, { react: { text: '⏳', key: mek.key } });

    try {
        const video = await searchSong(query);

        await conn.sendMessage(ctx.from, {
            text: `🎵 *RIZO HELL-MD*\n\n📌 ${video.title}\n🎤 ${video.author?.name || 'Unknown'}\n⏱️ ${video.timestamp || 'Unknown'}\n\n⬇️ Preparing audio...`
        }, { quoted: mek });

        const audioData = await getAudioUrl(video.url);
        const buffer = await downloadAudioBuffer(audioData.download);

        const filename = (audioData.title || video.title || 'RIZO-Song')
            .replace(/[\\/:*?"<>|]/g, '').slice(0, 100) + '.mp3';

        await conn.sendMessage(ctx.from, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: filename,
            ptt: false
        }, { quoted: mek });

        await conn.sendMessage(ctx.from, { react: { text: '✅', key: mek.key } });
    } catch (error) {
        console.error('[RIZO SONG ERROR]', error);
        await conn.sendMessage(ctx.from, { react: { text: '❌', key: mek.key } });

        if (error.message === 'NO_RESULT') return ctx.reply('❌ Song nahi mila. Dusra naam try karo.');
        if (error.message === 'ALL_AUDIO_APIS_FAILED') {
            return ctx.reply(
                '❌ *Saari audio APIs fail hain.*\n\n' +
                '💡 *Try karo:*\n' +
                '• YouTube URL direct bhejo: `.play https://youtu.be/xxxxx`\n' +
                '• 5 min baad retry karo\n' +
                '• Bot restart karo (APIs refresh hote hain)'
            );
        }
        return ctx.reply(`❌ *Audio fail*: ${error.message.slice(0, 100)}`);
    }
});

console.log('[RIZO HELL-MD] Song command loaded (2026 APIs)');