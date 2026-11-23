// plugins/get-pairrrrrrrrrrr.js
// .pair / .pair2 — pairing code ab BOT KE APNE /code route se aata hai (is hi server ka pair site wala system).
// Pehle yeh kisi aur ke Heroku server (arslan-mini-bot-...herokuapp.com) se code mangta tha jo ab band hai,
// isi liye hamesha error aata tha.
//
// Optional env:  PAIR_API_URL = https://tumhara-pair-site.com   (kisi doosre server ka /code use karna ho to)
//                PORT        = server ka port (default 8000)

const { cmd } = require('../arslan');
const axios = require('axios');
const config = require('../config');

const baseUrl = () => String(process.env.PAIR_API_URL || `http://127.0.0.1:${process.env.PORT || 8000}`).replace(/\/+$/, '');

// Returns { code } on success, or { error: "<insaan ke samajhne wala message>" }
async function requestPairCode(number) {
    try {
        const r = await axios.get(`${baseUrl()}/code`, {
            params: { number },
            timeout: 70000,
            headers: { Accept: 'application/json' }
        });
        const d = r.data || {};
        if (d.code) return { code: String(d.code) };
        if (d.status === 'already_connected') return { error: '✅ Yeh number pehle se connected hai — dobara pair ki zaroorat nahi.' };
        if (d.status === 'connection_in_progress') return { error: '⏳ Is number ka connection abhi ban raha hai, 20 second baad dobara try karo.' };
        if (d.status === 'reconnecting') return { error: '♻️ Is number ka purana session mil gaya, bot dobara connect ho raha hai. Naya code nahi chahiye.' };
        return { error: `❌ Code nahi mila (${d.message || d.error || d.status || 'unknown reply'}).` };
    } catch (e) {
        const d = e.response && e.response.data;
        if (d && (d.message || d.error)) return { error: `❌ ${d.message || d.error}` };
        if (e.code === 'ECONNREFUSED') return { error: '❌ Bot ka apna server jawab nahi de raha (port galat ho sakta hai). Variables mein PORT / PAIR_API_URL check karo.' };
        if (e.code === 'ECONNABORTED') return { error: '❌ Code banne mein bohat der lag gayi. Thori der baad dobara try karo.' };
        return { error: `❌ Pair error: ${String(e.message || e).slice(0, 150)}` };
    }
}

const cleanNumber = (q, fallback) => String(q || fallback || '').replace(/[^0-9]/g, '');
const validNumber = n => n && n.length >= 10 && n.length <= 15;

cmd({
    pattern: 'pair',
    alias: ['getpaijsksnsr', 'pairing', 'clonebnsjdndnznot'],
    react: '✅',
    desc: 'Get pairing code for RIZO-MD bot',
    category: 'download',
    use: '.pair 92323xxxxxxx',
    filename: __filename
}, async (conn, mek, m, { q, senderNumber, reply }) => {
    try {
        const phoneNumber = cleanNumber(q, senderNumber);
        if (!validNumber(phoneNumber)) return reply('❌ Sahi number likho, `+` ke baghair.\nMisal: `.pair 923231234567`');

        const res = await requestPairCode(phoneNumber);
        if (res.error) return reply(res.error);

        await reply(`> *PAIRING CODE READY*\n\n*Your pairing code is:* ${res.code}\n\nWhatsApp > Linked Devices > Link with phone number mein yeh code daalo.`);
        await new Promise(r => setTimeout(r, 1500));
        await reply(res.code);
    } catch (error) {
        console.error('Pair command error:', error);
        await reply(`❌ Pair command error: ${String(error.message || error).slice(0, 150)}`);
    }
});

cmd({
    pattern: 'pair2',
    alias: ['getpair2', 'reqpair', 'clonebot2'],
    react: '📉',
    desc: 'Get pairing code for RIZO-MD bot (private chat)',
    category: 'download',
    use: '.pair2 92323xxxxxxx',
    filename: __filename
}, async (conn, mek, m, { from, q, isGroup, senderNumber, reply }) => {
    try {
        if (isGroup) return reply('❌ Yeh command sirf private chat mein chalti hai. Mujhe seedha message karo.');

        const phoneNumber = cleanNumber(q, senderNumber);
        if (!validNumber(phoneNumber)) return reply('❌ Number galat hai.\n\nIs tarah likho: `.pair2 923231234567` (+ ke baghair)');

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } }).catch(() => {});
        const res = await requestPairCode(phoneNumber);
        if (res.error) return reply(res.error);

        await conn.sendMessage(from, {
            image: { url: config.IMAGE_PATH || 'https://i.postimg.cc/65n8yzcp/rizo-md.jpg' },
            caption: `- *PAIRING CODE*\n\nWhatsApp ki taraf se aap ko notification aayega. Phone check karo aur neeche wala code daalo.\n\n*🔢 Pairing Code*: *${res.code}*\n\n> *Copy karne ke liye neeche wala message dekho 👇🏻*`
        }, { quoted: m });

        await reply(res.code);
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } }).catch(() => {});
    } catch (error) {
        console.error('Pair2 command error:', error);
        await reply(`❌ Pair2 error: ${String(error.message || error).slice(0, 150)}`);
    }
});
