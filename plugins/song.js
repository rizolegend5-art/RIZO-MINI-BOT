const { cmd } = require('../arslan');
const config = require('../config');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs-extra');
const path = require('path');
const yts = require('yt-search');

// ===========================================================
// 🎯 yt-dlp se audio download
// ===========================================================
async function downloadAudio(videoUrl) {
    const tmpDir = path.join(__dirname, '..', 'tmp');
    fs.ensureDirSync(tmpDir);

    const output = path.join(tmpDir, `song_${Date.now()}.mp3`);

    await youtubedl(videoUrl, {
        extractAudio: true,
        audioFormat: 'mp3',
        audioQuality: 0,
        output: output,
        noPlaylist: true,
        noWarnings: true,
        preferFreeFormats: true
    });

    if (!fs.existsSync(output)) {
        throw new Error('Download failed — file not created');
    }

    return output;
}

cmd({
    pattern: 'song',
    alias: ['ytmp3', 'play', 'mp3', 'gana', 'music', 'audio'],
    desc: 'YouTube MP3 download (yt-dlp — no API needed)',
    category: 'download',
    react: '🎵',
    use: '.song <name>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const query = (ctx.q || '').trim();
    if (!query) return ctx.reply('🎵 Use: *.song <name>*');

    await conn.sendMessage(ctx.from, { react: { text: '⏳', key: mek.key } });

    try {
        let videoUrl, videoTitle, videoThumb;

        if (query.includes('youtube.com') || query.includes('youtu.be')) {
            videoUrl = query;
            videoTitle = 'YouTube Audio';
            videoThumb = '';
        } else {
            const search = await yts(query);
            if (!search?.videos?.length) throw new Error('NO_RESULT');
            const v = search.videos[0];
            videoUrl = v.url;
            videoTitle = v.title;
            videoThumb = v.thumbnail;
        }

        if (videoThumb) {
            conn.sendMessage(ctx.from, {
                image: { url: videoThumb },
                caption: `🎵 *${videoTitle}*\n⬇️ Downloading…`
            }, { quoted: mek }).catch(() => {});
        }

        const audioPath = await downloadAudio(videoUrl);

        await conn.sendMessage(ctx.from, {
            audio: { url: audioPath },
            mimetype: 'audio/mpeg',
            fileName: `${videoTitle.replace(/[^\w\s-]/g, '')}.mp3`,
            ptt: false
        }, { quoted: mek });

        await conn.sendMessage(ctx.from, { react: { text: '✅', key: mek.key } });
        fs.remove(audioPath).catch(() => {});

    } catch (err) {
        console.error('SONG ERROR:', err.message);
        await conn.sendMessage(ctx.from, { react: { text: '❌', key: mek.key } });

        if (err.message === 'NO_RESULT') return ctx.reply('❌ Koi song nahi mila.');
        if (err.message.includes('yt-dlp') || err.message.includes('ENOENT')) {
            return ctx.reply(
                '❌ *yt-dlp install nahi hai!*\n\n' +
                '💡 *Server pe install karo:*\n' +
                '`sudo apt install yt-dlp ffmpeg`\n\n' +
                'Ya Railway pe `nixpacks.toml` me add karo.'
            );
        }
        return ctx.reply(`❌ Song fail: ${err.message}`);
    }
});