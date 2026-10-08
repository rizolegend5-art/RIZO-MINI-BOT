const { cmd } = require("../arslan");
const fetch = require("node-fetch");
const yts = require("yt-search");
const axios = require("axios");
const { fakevCard } = require("../lib/fakevCard");
const { spawn } = require("child_process");

/*
 * RIZO-MD media downloader
 * Fixes:
 * - Properly encodes YouTube URLs sent to the API.
 * - Does not assume a successful HTTP response means valid JSON.
 * - Uses configurable API keys instead of the literal "APIKEY" placeholder.
 * - Adds a local yt-dlp fallback when the remote API is unavailable.
 * - .video is now an alias of video1/vid/ytv.
 *
 * Optional environment variables:
 *   DISCARD_API_KEY=qasim
 *   GTECH_API_KEY=your_key
 *   YTDLP_BIN=yt-dlp
 */

const DISCARD_API_KEY = process.env.DISCARD_API_KEY || "qasim";
const GTECH_API_KEY = process.env.GTECH_API_KEY || "";
const YTDLP_BIN = process.env.YTDLP_BIN || "yt-dlp";

function isYouTubeUrl(value = "") {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)/i.test(value);
}

function firstYouTubeUrl(value = "") {
  const match = value.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[^\s&]+|youtu\.be\/[^\s?&]+|youtube\.com\/shorts\/[^\s?&]+)/i);
  return match ? match[0] : null;
}

async function resolveVideo(query) {
  const direct = firstYouTubeUrl(query);
  if (direct) return { url: direct, info: null };

  const search = await yts(query);
  if (!search?.videos?.length) return null;
  return { url: search.videos[0].url, info: search.videos[0] };
}

async function discardAudio(videoUrl) {
  const response = await axios.get(
    "https://discardapi.dpdns.org/api/music/lyrics",
    {
      params: { apikey: DISCARD_API_KEY, song: videoUrl },
      timeout: 25000,
      validateStatus: () => true,
      headers: { Accept: "application/json", "User-Agent": "RIZO-MD/1.0" }
    }
  );

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`DISCARD_HTTP_${response.status}`);
  }

  const data = response.data;
  const url = data?.result?.download?.url;
  if (!data?.status || !url) {
    throw new Error("DISCARD_NO_AUDIO_URL");
  }

  return {
    url,
    title: data?.result?.metadata?.title || "YouTube Song",
    quality: data?.result?.download?.quality || "128kbps"
  };
}

async function gtechVideo(videoUrl) {
  if (!GTECH_API_KEY || GTECH_API_KEY === "APIKEY") {
    throw new Error("GTECH_API_KEY_NOT_CONFIGURED");
  }

  const response = await axios.get("https://gtech-api-xtp1.onrender.com/api/video/yt", {
    params: { apikey: GTECH_API_KEY, url: videoUrl },
    timeout: 30000,
    validateStatus: () => true,
    headers: { Accept: "application/json", "User-Agent": "RIZO-MD/1.0" }
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`GTECH_HTTP_${response.status}`);
  }

  const data = response.data;
  if (!data?.status) throw new Error("GTECH_FAILED");

  const media = data?.result?.media || {};
  const url = media.video_url_hd && !String(media.video_url_hd).startsWith("No ")
    ? media.video_url_hd
    : media.video_url_sd;

  if (!url || String(url).startsWith("No ")) {
    throw new Error("GTECH_NO_VIDEO_URL");
  }

  return url;
}

function runYtDlp(url, mode) {
  return new Promise((resolve, reject) => {
    const args = mode === "audio"
      ? ["-f", "bestaudio/best", "-o", "-", "--no-playlist", url]
      : ["-f", "bv*[height<=720]+ba/b[height<=720]/best", "--merge-output-format", "mp4", "-o", "-", "--no-playlist", url];

    const child = spawn(YTDLP_BIN, args, { stdio: ["ignore", "pipe", "pipe"] });
    const chunks = [];
    const errors = [];

    child.stdout.on("data", chunk => chunks.push(chunk));
    child.stderr.on("data", chunk => errors.push(chunk));
    child.on("error", err => reject(new Error(`YTDLP_UNAVAILABLE: ${err.message}`)));
    child.on("close", code => {
      if (code !== 0 || !chunks.length) {
        reject(new Error(`YTDLP_FAILED_${code}: ${Buffer.concat(errors).toString().slice(-500)}`));
        return;
      }
      resolve(Buffer.concat(chunks));
    });
  });
}

cmd({
  pattern: "song",
  alias: ["ytmp3", "play", "mp3", "gana", "music", "audio"],
  react: "🎵",
  desc: "YouTube search & MP3 play",
  category: "download",
  use: ".play <song name>",
  filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
  const query = args.join(" ").trim();
  if (!query) return reply("❌ Please provide a song name or YouTube link.\nExample: .play Madina Bara Sohna Hain");

  await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });

  try {
    const resolved = await resolveVideo(query);
    if (!resolved) throw new Error("NO_RESULT");

    let audio;
    try {
      audio = await discardAudio(resolved.url);
    } catch (apiErr) {
      console.error("SONG API FAILED:", apiErr.message);

      const buffer = await runYtDlp(resolved.url, "audio");
      audio = {
        buffer,
        title: resolved.info?.title || "YouTube Song",
        quality: "best available"
      };
    }

    const title = audio.title || resolved.info?.title || "YouTube Song";
    const message = {
      audio: audio.buffer ? audio.buffer : { url: audio.url },
      mimetype: "audio/mpeg",
      ptt: false,
      fileName: `${title.replace(/[\\/:*?"<>|]/g, "_")}.mp3`,
      caption: `🎵 *${title}*\n🎚️ Quality: ${audio.quality}\n\n> © RIZO-MD`,
      contextInfo: {
        externalAdReply: {
          title: title.substring(0, 40),
          body: "★彡 RIZO-MD BEATS 彡★",
          thumbnailUrl: resolved.info?.thumbnail,
          sourceUrl: resolved.url,
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    };

    await conn.sendMessage(from, message, { quoted: fakevCard });
    await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
  } catch (err) {
    console.error("SONG ERROR:", err);
    await conn.sendMessage(from, { react: { text: "❌", key: m.key } });

    if (err.message === "NO_RESULT") return reply("❌ No YouTube result found.");
    if (err.message === "YTDLP_UNAVAILABLE") {
      return reply("❌ Song service is unavailable. The remote API also failed, and yt-dlp is not installed on the server.");
    }
    return reply("❌ Song download failed. Please try another song or try again later.");
  }
});

cmd({
  pattern: "video1",
  alias: ["video", "vid", "ytv"],
  react: "🎬",
  desc: "Download YouTube Video",
  category: "downloader",
  use: ".video <song name or YouTube link>",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  const query = String(q || "").trim();
  if (!query) return reply("❌ Please provide a YouTube link or search query.\nExample: .video Pasoori");

  await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });

  try {
    const resolved = await resolveVideo(query);
    if (!resolved) throw new Error("NO_RESULT");

    let videoUrl;
    try {
      videoUrl = await gtechVideo(resolved.url);
    } catch (apiErr) {
      console.error("VIDEO API FAILED:", apiErr.message);
      const buffer = await runYtDlp(resolved.url, "video");

      await conn.sendMessage(from, {
        video: buffer,
        mimetype: "video/mp4",
        caption: `🎬 *${resolved.info?.title || "YouTube Video"}*\n\n> © RIZO-MD`
      }, { quoted: fakevCard });

      await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
      return;
    }

    await conn.sendMessage(from, {
      video: { url: videoUrl },
      mimetype: "video/mp4",
      caption: `🎬 *${resolved.info?.title || "YouTube Video"}*\n\n> © RIZO-MD`
    }, { quoted: fakevCard });

    await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
  } catch (err) {
    console.error("VIDEO ERROR:", err);
    await conn.sendMessage(from, { react: { text: "❌", key: m.key } });

    if (err.message === "NO_RESULT") return reply("❌ No YouTube result found.");
    if (err.message === "GTECH_API_KEY_NOT_CONFIGURED") {
      return reply("❌ Video API key is not configured. Set GTECH_API_KEY on the server, or install yt-dlp for the local fallback.");
    }
    if (String(err.message).startsWith("YTDLP_UNAVAILABLE")) {
      return reply("❌ Video API failed and yt-dlp is not installed on the server.");
    }
    return reply("❌ Video download failed. Please try again later.");
  }
});
