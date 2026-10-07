// plugins/addvotes.js
const { cmd } = require("../arslan");


let handler = async (m, { conn, text, usedPrefix, command }) => {
    // Format: .addvotes <poll_link> <option_name> <amount>
    // Misaal: .addvotes https://whatsapp.com/xyz Ali 500
    let args = text ? text.trim().split(' ') : [];
    
    let pollLink = args[0] ? args[0].trim() : null;
    let voteOption = args[1] ? args[1].trim() : null; // Ab yahan koi bhi naam ho sakta hai (e.g. Ali)
    let customCount = args[2] ? parseInt(args[2]) : null;

    if (!pollLink || !voteOption || !customCount || isNaN(customCount)) {
        return m.reply(
            `❌ Ghalat tareeqa! Sahi format istemal karein:\n\n` +
            `*${usedPrefix + command} <poll_link> <option_name> <votes>*\n\n` +
            `Misaal:\n` +
            `*${usedPrefix + command} https://whatsapp.com/xyz Ali 500*`
        );
    }

    let dbData = global.db.data || {};
    if (!dbData.polls) {
        dbData.polls = {};
    }

    if (!dbData.polls[pollLink]) {
        dbData.polls[pollLink] = { options: {} };
    }

    let pollTarget = dbData.polls[pollLink];

    // Agar option name pehle se database mein nahi hai toh naya bana do
    if (pollTarget.options[voteOption] === undefined) {
        pollTarget.options[voteOption] = 0;
    }

    // Votes add kar dein
    pollTarget.options[voteOption] += customCount;

    // Tamam options ke results ki list tayar karna
    let optionsList = "";
    for (let opt in pollTarget.options) {
        optionsList += `- *${opt}*: ${pollTarget.options[opt]} Votes\n`;
    }

    m.reply(
        `🚀 *Custom Votes Added Successfully!*\n\n` +
        `🔗 *Poll Link:* ${pollLink}\n` +
        `➕ *Added ${customCount} votes to:* **${voteOption}**\n\n` +
        `📊 *Current Poll Results:*\n${optionsList}`
    );
}

handler.command = ['addvotes', 'boostvotes', 'multivote'];
handler.tags = ['owner', 'admin'];
handler.help = ['addvotes <poll_link> <option_name> <amount>'];
module.exports = handler;
