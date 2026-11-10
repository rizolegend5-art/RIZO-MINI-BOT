const { cmd } = require('../arslan')
const { downloadContentFromMessage } = require('@whiskeysockets/baileys')

// unwrap view-once / ephemeral wrappers until real media is found
const unwrap = (message) => {
    let msg = message
    for (let i = 0; i < 5 && msg; i++) {
        const inner =
            msg.viewOnceMessageV2?.message ||
            msg.viewOnceMessageV2Extension?.message ||
            msg.viewOnceMessage?.message ||
            msg.ephemeralMessage?.message ||
            msg.documentWithCaptionMessage?.message
        if (!inner) break
        msg = inner
    }
    return msg
}

cmd({
    pattern: "vv",
    alias: ["viewonce", "view", "open"],
    react: "🥺",
    desc: "Retrieve view-once media (Owner only)",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, { from, isCreator, reply }) => {
    try {
        if (!isCreator)
            return reply("*YEH COMMAND SIRF BOT OWNER KE LIYE HAI 😎*")

        if (!m.quoted || !m.quoted.message)
            return reply(
                "*🥺 KISI VIEW ONCE PHOTO / VIDEO / AUDIO KO REPLY KARO*\n\n" +
                "*Phir likho:* `.vv`\n\n" +
                "*Phir dekho kamal 😎*"
            )

        const msg = unwrap(m.quoted.message)
        const type = Object.keys(msg || {}).find(k => /^(image|video|audio)Message$/.test(k))
        if (!type)
            return reply("*❌ YE VIEW ONCE MEDIA SUPPORT NAHI KARTA 🥺*")

        const media = msg[type]
        const kind = type.replace('Message', '')
        const stream = await downloadContentFromMessage(media, kind)
        const chunks = []
        for await (const chunk of stream) chunks.push(chunk)
        const buffer = Buffer.concat(chunks)
        if (!buffer.length)
            return reply("*❌ MEDIA DOWNLOAD NAHI HUA (shayad pehle hi khul chuka hai ya expire ho gaya) 🥺*")

        const caption = media.caption || ""
        let content
        if (kind === 'image') content = { image: buffer, caption }
        else if (kind === 'video') content = { video: buffer, caption }
        else content = { audio: buffer, mimetype: media.mimetype || "audio/mp4", ptt: false }

        await conn.sendMessage(from, content, { quoted: mek })
    } catch (e) {
        console.log("VV ERROR:", e)
        reply("*❌ VIEW ONCE OPEN KARNE ME ERROR AYA 🥺*\n_" + (e.message || e) + "_")
    }
})
