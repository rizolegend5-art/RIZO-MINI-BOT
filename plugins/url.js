const axios = require("axios");
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { cmd, commands } = require('../command');

/* =========================================================================================================
   🖇️ IMAGE TO LIVE URL CONVERTER (DIRECT & LIGHTNING FAST)
========================================================================================================= */
cmd({
  pattern: "url",
  alias: ["imgtourl", "imgurl", "tourl", "geturl", "upload"],
  react: '🖇️',
  desc: "Convert image to a direct URL using ImgBB API instantaneously",
  category: "tools",
  use: ".tourl (reply to image)",
  filename: __filename
}, 
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, reply }) => {
  try {
    
    // 1. Correctly detect if a message is quoted/replied
    const targetMsg = m.quoted ? m.quoted : m;
    if (!targetMsg) {
      return reply('❌ Please reply to an image to generate a link.');
    }

    let rawMessage = targetMsg.message || targetMsg.msg || targetMsg;
    if (rawMessage && rawMessage.extendedTextMessage?.contextInfo?.quotedMessage) {
        rawMessage = rawMessage.extendedTextMessage.contextInfo.quotedMessage;
    }

    let quotedType = Object.keys(rawMessage)[0];
    let mediaMessage = rawMessage[quotedType];
    let mimeType = mediaMessage?.mimetype || rawMessage?.mimetype || targetMsg.mimetype || '';

    // Validate that the shared file type is an image
    if (!mimeType.includes('image')) {
      return reply('❌ Please reply to a valid photo.');
    }

    // 2. Fetch image buffers from WhatsApp servers (optimized for high speed)
    let mediaBuffer;
    try {
        if (typeof targetMsg.download === 'function') {
            mediaBuffer = await targetMsg.download();
        }
    } catch (_) {}

    if (!mediaBuffer || mediaBuffer.length === 0) {
        const cleanType = quotedType ? quotedType.replace('Message', '') : 'image';
        const stream = await downloadContentFromMessage(mediaMessage || rawMessage, cleanType);
        let chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        mediaBuffer = Buffer.concat(chunks);
    }

    // 3. ImgBB API Integration using base64 stream format
    const form = new FormData();
    form.append('image', mediaBuffer.toString('base64'));

    const apiKey = "12c813e1c4f7f26870c42c3854a4bd35"; // یہاں اپنی ImgBB کی اے پی آئی کیی لکھیں
    
    const response = await axios.post(`https://api.imgbb.com/1/upload?key=${apiKey}`, form, {
      headers: form.getHeaders(),
      timeout: 15000
    });

    if (!response.data || !response.data.success || !response.data.data?.url) {
      throw new Error("ImgBB server upload failed.");
    }

    const mediaUrl = response.data.data.url;
    const fileSizeKB = parseFloat((mediaBuffer.length / 1024).toFixed(2));

    // 4. Your Menu's Local Box Design Layout Output (Direct Response)
    let responseText = `╭┈───〔 🖼️ *IMG URL GENERATOR* 〕┈───⊷\n`;
    responseText += `┋⋄ ➠ *Status:* SUCCESS\n`;
    responseText += `┋⋄ ➠ *File Size:* ${fileSizeKB} KB\n`;
    responseText += `┋⋄ ➠ *Direct URL:* ${mediaUrl}\n`;
    responseText += `╰─────────────────────⊷`;

    return await conn.sendMessage(from, { text: responseText }, { quoted: mek });

  } catch (error) {
    console.error("Tourl Command Error:", error);
    return reply(`❌ Error: ${error.message || error}`);
  }
});