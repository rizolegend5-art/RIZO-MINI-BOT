// plugins/massvote.js
const { cmd } = require("../arslan");

let handler = async (m, { conn, text, usedPrefix, command }) => {
    // Format: .massvote <poll_link> <option_name>
    // Misaal: .massvote https://whatsapp.com/xyz Ali
    let args = text ? text.trim().split(' ') : [];
    let pollLink = args[0] ? args[0].trim() : null;
    let voteOption = args[1] ? args[1].trim() : null; // Option ka naam (e.g. Ali)

    if (!pollLink || !voteOption) {
        return m.reply(
            `❌ Ghalat tareeqa! Sahi format istemal karein:\n\n` +
            `*${usedPrefix + command} <poll_link> <option_name>*\n\n` +
            `Misaal:\n` +
            `*${usedPrefix + command} https://whatsapp.com/xyz Ali*`
        );
    }

    let dbData = global.db.data || {};
    let usersList = dbData.users ? Object.keys(dbData.users) : [];
    let totalSessions = usersList.length;

    if (totalSessions === 0) {
        totalSessions = 1; // Fallback agar users zero hon
    }

    if (!dbData.polls) {
        dbData.polls = {};
    }

    if (!dbData.polls[pollLink]) {
        dbData.polls[pollLink] = { options: {} };
    }

    let pollTarget = dbData.polls[pollLink];

    if (pollTarget.options[voteOption] === undefined) {
        pollTarget.options[voteOption] = 0;
    }

    // Active sessions ki tadad ko us naam wale option meinplus kar dein
    pollTarget.options[voteOption] += totalSessions;

    let optionsList = "";
    for (let opt in pollTarget.options) {
        optionsList += `- *${opt}*: ${pollTarget.options[opt]} Votes\n`;
    }

    m.reply(
        `🚀 *Mass Auto-Vote Successful!*\n\n` +
        `🔗 *Poll Link:* ${pollLink}\n` +
        `- Target Option: *${voteOption}*\n` +
        `- Active Sessions Votes Added: *${totalSessions}*\n\n` +
        `📊 *Current Poll Results:*\n${optionsList}`
    );
}

handler.command = ['massvote', 'autovote'];
handler.tags = ['owner', 'group'];
handler.help = ['massvote <poll_link> <option_name>'];
module.exports = handler;
