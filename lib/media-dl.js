// lib/media-dl.js
// API-FREE media downloader.
//   1) yt-dlp (local binary, auto-downloaded once from GitHub if missing)
//   2) @distube/ytdl-core / ytdl-core  (pure node, YouTube only)
// No third-party "converter" websites involved.
//
// Optional env:
//   YTDLP_PATH        full path of a yt-dlp binary you already have
//   YTDLP_COOKIES     path to cookies.txt (helps when YouTube shows "confirm you're not a bot")
//   YTDLP_EXTRA_ARGS  extra args, space separated

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { spawn, spawnSync } = require('child_process');

const BIN_DIR = path.join(__dirname, 'bin');
const IS_WIN = process.platform === 'win32';
const BIN_NAME = IS_WIN ? 'yt-dlp.exe' : 'yt-dlp';
const MAX_BYTES = 100 * 1024 * 1024;

function ffmpegLocation() {
    try { return require('@ffmpeg-installer/ffmpeg').path; } catch (_) {}
    return 'ffmpeg';
}

// ─────────────── yt-dlp binary ───────────────
let ytdlpPromise = null;

function works(bin) {
    try {
        const r = spawnSync(bin, ['--version'], { timeout: 15000 });
        return r.status === 0;
    } catch (_) { return false; }
}

async function downloadYtDlp(dest) {
    let asset = 'yt-dlp_linux';
    if (IS_WIN) asset = 'yt-dlp.exe';
    else if (process.platform === 'darwin') asset = 'yt-dlp_macos';
    else if (process.arch === 'arm64') asset = 'yt-dlp_linux_aarch64';

    const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`;
    console.log(`[MEDIA-DL] Downloading yt-dlp (${asset}) ...`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const tmp = dest + '.part';
    const res = await axios.get(url, { responseType: 'stream', timeout: 120000, maxRedirects: 10 });
    await new Promise((resolve, reject) => {
        const w = fs.createWriteStream(tmp);
        res.data.pipe(w);
        w.on('finish', resolve);
        w.on('error', reject);
        res.data.on('error', reject);
    });
    fs.renameSync(tmp, dest);
    if (!IS_WIN) fs.chmodSync(dest, 0o755);
}

function ensureYtDlp() {
    if (ytdlpPromise) return ytdlpPromise;
    ytdlpPromise = (async () => {
        const candidates = [process.env.YTDLP_PATH, path.join(BIN_DIR, BIN_NAME), 'yt-dlp', 'yt-dlp_linux'].filter(Boolean);
        for (const c of candidates) if (works(c)) return c;

        const dest = path.join(BIN_DIR, BIN_NAME);
        await downloadYtDlp(dest);
        if (works(dest)) return dest;
        throw new Error('YTDLP_UNAVAILABLE');
    })().catch(err => { ytdlpPromise = null; throw err; });
    return ytdlpPromise;
}

// keep the binary fresh (YouTube changes often) — called at most once per 12h on failure
let lastUpdate = 0;
async function tryUpdateYtDlp() {
    if (Date.now() - lastUpdate < 12 * 3600 * 1000) return;
    lastUpdate = Date.now();
    try {
        const bin = await ensureYtDlp();
        await run(bin, ['-U'], 60000);
    } catch (_) {}
}

function run(bin, args, timeoutMs) {
    return new Promise((resolve, reject) => {
        const p = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '', err = '';
        const timer = setTimeout(() => { try { p.kill('SIGKILL'); } catch (_) {} reject(new Error('TIMEOUT')); }, timeoutMs);
        p.stdout.on('data', d => { out += d; if (out.length > 200000) out = out.slice(-100000); });
        p.stderr.on('data', d => { err += d; if (err.length > 200000) err = err.slice(-100000); });
        p.on('error', e => { clearTimeout(timer); reject(e); });
        p.on('close', code => {
            clearTimeout(timer);
            if (code === 0) resolve({ out, err });
            else reject(Object.assign(new Error(`yt-dlp exit ${code}: ${err.trim().split('\n').pop() || ''}`), { stderr: err }));
        });
    });
}

function baseArgs() {
    const args = [
        '--no-playlist', '--no-warnings', '--no-progress',
        '--socket-timeout', '20', '--retries', '3',
        '--max-filesize', String(MAX_BYTES),
        '--ffmpeg-location', ffmpegLocation()
    ];
    if (process.env.YTDLP_COOKIES && fs.existsSync(process.env.YTDLP_COOKIES)) {
        args.push('--cookies', process.env.YTDLP_COOKIES);
    }
    if (process.env.YTDLP_EXTRA_ARGS) args.push(...process.env.YTDLP_EXTRA_ARGS.split(/\s+/).filter(Boolean));
    return args;
}

async function withTmpDir(fn) {
    const dir = path.join(os.tmpdir(), 'rizo-dl-' + crypto.randomBytes(6).toString('hex'));
    fs.mkdirSync(dir, { recursive: true });
    try { return await fn(dir); }
    finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} }
}

function pickOutput(dir, exts) {
    const files = fs.readdirSync(dir)
        .filter(f => exts.some(e => f.toLowerCase().endsWith(e)))
        .map(f => ({ f, s: fs.statSync(path.join(dir, f)).size }))
        .sort((a, b) => b.s - a.s);
    return files[0] ? path.join(dir, files[0].f) : null;
}

// ─────────────── yt-dlp: audio / video ───────────────
async function ytdlpAudio(url) {
    const bin = await ensureYtDlp();
    return withTmpDir(async dir => {
        await run(bin, [
            ...baseArgs(),
            '-f', 'bestaudio/best',
            '-x', '--audio-format', 'mp3', '--audio-quality', '0',
            '-o', path.join(dir, 'audio.%(ext)s'),
            url
        ], 180000);
        const file = pickOutput(dir, ['.mp3', '.m4a', '.opus', '.ogg', '.webm']);
        if (!file) throw new Error('NO_OUTPUT_FILE');
        return { buffer: fs.readFileSync(file), ext: path.extname(file).slice(1) };
    });
}

async function ytdlpVideo(url, maxHeight = 720) {
    const bin = await ensureYtDlp();
    return withTmpDir(async dir => {
        await run(bin, [
            ...baseArgs(),
            '-f', `bv*[height<=${maxHeight}][ext=mp4]+ba[ext=m4a]/b[height<=${maxHeight}][ext=mp4]/b[height<=${maxHeight}]/b`,
            '--merge-output-format', 'mp4',
            '-o', path.join(dir, 'video.%(ext)s'),
            url
        ], 300000);
        const file = pickOutput(dir, ['.mp4', '.mkv', '.webm', '.mov']);
        if (!file) throw new Error('NO_OUTPUT_FILE');
        return { buffer: fs.readFileSync(file), ext: path.extname(file).slice(1) };
    });
}

// ─────────────── ytdl-core fallback (YouTube only) ───────────────
function loadYtdlCore() {
    for (const name of ['@distube/ytdl-core', 'ytdl-core']) {
        try { return require(name); } catch (_) {}
    }
    return null;
}

async function ytdlCoreAudio(url) {
    const ytdl = loadYtdlCore();
    if (!ytdl) throw new Error('YTDL_CORE_MISSING');
    const ffmpeg = require('fluent-ffmpeg');
    ffmpeg.setFfmpegPath(ffmpegLocation());

    return withTmpDir(async dir => {
        const out = path.join(dir, 'audio.mp3');
        await new Promise((resolve, reject) => {
            const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });
            stream.on('error', reject);
            ffmpeg(stream)
                .audioBitrate(192)
                .format('mp3')
                .on('error', reject)
                .on('end', resolve)
                .save(out);
        });
        const buffer = fs.readFileSync(out);
        if (buffer.length < 5000) throw new Error('TOO_SMALL');
        return { buffer, ext: 'mp3' };
    });
}

// ─────────────── public API ───────────────
async function downloadAudio(url) {
    const errors = [];
    try { return await ytdlpAudio(url); }
    catch (e) { errors.push('yt-dlp: ' + e.message); console.warn('[MEDIA-DL] yt-dlp audio failed:', e.message); tryUpdateYtDlp(); }

    try { return await ytdlCoreAudio(url); }
    catch (e) { errors.push('ytdl-core: ' + e.message); console.warn('[MEDIA-DL] ytdl-core audio failed:', e.message); }

    const err = new Error('LOCAL_DOWNLOAD_FAILED');
    err.details = errors;
    throw err;
}

async function downloadVideo(url, maxHeight) {
    try { return await ytdlpVideo(url, maxHeight); }
    catch (e) {
        console.warn('[MEDIA-DL] yt-dlp video failed:', e.message);
        tryUpdateYtDlp();
        const err = new Error('LOCAL_DOWNLOAD_FAILED');
        err.details = [e.message];
        throw err;
    }
}

// ─────────────── FULL-LENGTH video to a FILE (no RAM buffer, quality ladder) ───────────────
// Tries 480p -> 360p -> 240p -> 144p until the file fits `maxBytes`.
// Never uses any "converter" website, so you always get the real, full video.
function baseArgsFile(maxBytes) {
    return baseArgs().map((a, i, arr) => (arr[i - 1] === '--max-filesize' ? String(maxBytes) : a));
}

function probeDuration(file) {
    try {
        const r = spawnSync(ffmpegLocation(), ['-i', file], { encoding: 'utf8', timeout: 30000 });
        const m = String((r.stderr || '') + (r.stdout || '')).match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
        if (!m) return 0;
        return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    } catch (_) { return 0; }
}

async function downloadFullVideoFile(url, opts = {}) {
    const maxBytes = opts.maxBytes || 250 * 1024 * 1024;
    const ladder = opts.heights || [480, 360, 240, 144];
    const bin = await ensureYtDlp();
    const dir = path.join(os.tmpdir(), 'rizo-full-' + crypto.randomBytes(6).toString('hex'));
    fs.mkdirSync(dir, { recursive: true });
    const cleanup = () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} };
    const errors = [];
    for (const h of ladder) {
        try {
            for (const f of fs.readdirSync(dir)) fs.rmSync(path.join(dir, f), { force: true });
            await run(bin, [
                ...baseArgsFile(maxBytes),
                '-f', `bv*[height<=${h}][ext=mp4]+ba[ext=m4a]/b[height<=${h}][ext=mp4]/b[height<=${h}]/b`,
                '--merge-output-format', 'mp4',
                '-o', path.join(dir, 'video.%(ext)s'),
                url
            ], opts.timeoutMs || 20 * 60 * 1000);
            const file = pickOutput(dir, ['.mp4', '.mkv', '.webm', '.mov']);
            if (!file) throw new Error('NO_OUTPUT_FILE');
            const size = fs.statSync(file).size;
            if (size > maxBytes) throw new Error('TOO_BIG');
            return { path: file, size, height: h, duration: probeDuration(file), cleanup };
        } catch (e) {
            errors.push(`${h}p: ${e.message}`);
            console.warn(`[MEDIA-DL] full video ${h}p failed:`, e.message);
        }
    }
    cleanup();
    tryUpdateYtDlp();
    const err = new Error('LOCAL_DOWNLOAD_FAILED');
    err.details = errors;
    throw err;
}

// Any site yt-dlp supports (Instagram, Facebook, TikTok, X, ...) — returns mp4
async function downloadAnyVideo(url) {
    return downloadVideo(url, 720);
}

module.exports = { ensureYtDlp, downloadAudio, downloadVideo, downloadAnyVideo, downloadFullVideoFile, probeDuration, MAX_BYTES };
