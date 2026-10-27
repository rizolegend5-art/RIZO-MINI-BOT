const { cmd } = require('../arslan');
const axios = require('axios');

// ═══════════════════════════════════════════
//  API 1: Prince Tech Channel Reaction API
// ═══════════════════════════════════════════
cmd({
    pattern: 'chreact',
    alias: ['reactapi', 'princereact'],
    desc: 'Send unlimited reactions to channel post via Prince API',
    category: 'owner',
    react: '💥',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { from, args, isCreator, reply }) => {
    try {
        if (!isCreator) return reply('🔒 *Owner Only*');
        const postLink = args[0];
        if (!postLink || !postLink.includes('whatsapp.com')) {
            return reply('📌 *Usage:* `.chreact <whatsapp channel post link>`');
        }

        await reply(`📡 *Prince API* — Sending reactions to post...`);

        const apiUrl = `https://chreact.princetechn.com/api?post_link=${encodeURIComponent(postLink)}`;
        const { data } = await axios.get(apiUrl);

        return reply(
`✅ *Reaction Sent Successfully*
🔗 \`${postLink}\`
📦 \`${JSON.stringify(data).slice(0, 300)}\``
        );
    } catch (err) {
        return reply(`❌ Error: ${err.message}`);
    }
});

// ═══════════════════════════════════════════
//  API 2: Asitha Channel Reaction API
// ═══════════════════════════════════════════
cmd({
    pattern: 'asithareact',
    alias: ['areact', 'asithach'],
    desc: 'Send unlimited reactions to channel post via Asitha API',
    category: 'owner',
    react: '⚡',
    filename: __filename,
    owner: true
},
async (conn, mek, m, { from, args, isCreator, reply }) => {
    try {
        if (!isCreator) return reply('🔒 *Owner Only*');
        const postLink = args[0];
        if (!postLink || !postLink.includes('whatsapp.com')) {
            return reply('📌 *Usage:* `.asithareact <whatsapp channel post link>`');
        }

        await reply(`📡 *Asitha API* — Sending reactions to post...`);

        // Asitha API ke liye link query parameter format
        const apiUrl = `https://back.asitha.top/api?post_link=${encodeURIComponent(postLink)}`;
        const { data } = await axios.get(apiUrl);

        return reply(
`✅ *Reaction Sent Successfully*
🔗 \`${postLink}\`
📦 \`${JSON.stringify(data).slice(0, 300)}\``
        );
    } catch (err) {
        return reply(`❌ Error: ${err.message}`);
    }
});
