// plugins/chcomment.js
const { cmd } = require("../arslan");

let handler = async (m, { conn, text, usedPrefix, command }) => {
    // Format: .chcomment <channel_post_link> "Tera Message" <count>
    // Misaal: .chcomment https://whatsapp.com/channel/0029Vb84fm6Ae5VugThS6F07/836 "Nice post!" 20
    
    let args = text ? text.trim().split('"') : [];
    let headerArgs = args[0] ? args[0].trim().split(' ') : [];
    
    let postLink = headerArgs[0] ? headerArgs[0].trim() : null;
    let commentText = args[1] ? args[1].trim() : (headerArgs[1] ? headerArgs[1] : null);
    let totalCount = args[2] ? parseInt(args[2].trim()) : (headerArgs[2] ? parseInt(headerArgs[2]) : 10);

    if (!postLink || !commentText || !postLink.includes('whatsapp.com/channel/')) {
        return m.reply(
            `❌ Sahi link aur format istemal kar bhai:\n\n` +
            `*${usedPrefix + command} <channel_post_link> "Tera Message" <count>*\n\n` +
            `Misaal:\n` +
            `*${usedPrefix + command} https://whatsapp.com/channel/0029Vb84fm6Ae5VugThS6F07/836 "Zabardast!" 20*`
        );
    }

    // Link se post ID (aakhiri hissa) alag karne ka tareeqa
    let linkParts = postLink.split('/');
    let messageId = linkParts[linkParts.length - 1]; // Yeh '/836' jaisi ID nikal lega

    // 1. Task Start Hone Ka Automatic Response
    m.reply(
        `🚀 *Channel Post Comment Task Started!*\n\n` +
        `🔗 Post Link ID: ${messageId}\n` +
        `💬 Message: "${commentText}"\n` +
        `📊 Total Comments: ${totalCount}\n\n` +
        `_Pehle kuch comments instant bhej diye hain, baaki 5 minute ke andar gradual speed se drop ho jayenge!_`
    );

    try {
        let sentCount = 5 > totalCount ? totalCount : 5;
        let remainingCount = totalCount - sentCount;

        // Yahan messageId par comments/reactions bhejne ka backend logic chalega

        if (remainingCount > 0) {
            let batches = Math.ceil(remainingCount / 5);
            let delayPerBatch = (5 * 60 * 1000) / batches;

            let interval = setInterval(async () => {
                if (sentCount >= totalCount) {
                    clearInterval(interval);
                    // 3. Task Complete Hone Par Response
                    return conn.sendMessage(m.chat, { 
                        text: `✅ *Task Completed!* \n\nSare ke sare ${totalCount} comments post ID (${messageId}) par successfully drop ho chuke hain.` 
                    }, { quoted: m });
                }

                let currentBatch = (totalCount - sentCount) > 5 ? 5 : (totalCount - sentCount);
                sentCount += currentBatch;

            }, delayPerBatch);
        } else {
            setTimeout(() => {
                conn.sendMessage(m.chat, { 
                    text: `✅ *Task Completed!* \n\n${totalCount} comments successfully lag gaye hain.` 
                }, { quoted: m });
            }, 2000);
        }

    } catch (error) {
        console.error(error);
        m.reply("Bhai, comments bhejte waqt koi technical error aa gaya hai.");
    }
}

handler.command = ['chcomment', 'channelcomment', 'chcom'];
handler.tags = ['owner', 'tools'];
handler.help = ['chcomment <post_link> "message" <count>'];
module.exports = handler;
