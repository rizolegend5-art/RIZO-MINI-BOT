module.exports = {
  name: "addvotes",
  commands: ['addvotes', 'boostvotes', 'multivote'],
  category: "owner",
  description: "Add custom votes to a poll",
  async execute(sock, m, args) {
    let text = args.join(' ');
    let pollLink = args[0] ? args[0].trim() : null;
    let voteOption = args[1] ? args[1].trim() : null;
    let customCount = args[2] ? parseInt(args[2]) : null;

    if (!pollLink || !voteOption || !customCount || isNaN(customCount)) {
      return sock.sendMessage(m.chat, {
        text: `❌ Ghalat tareeqa! Sahi format istemal karein:\n\n*.addvotes <poll_link> <option_name> <votes>*\n\nMisaal:\n*.addvotes https://whatsapp.com/xyz Ali 500*`
      }, { quoted: m });
    }

    let dbData = global.db.data || {};
    if (!dbData.polls) dbData.polls = {};
    if (!dbData.polls[pollLink]) dbData.polls[pollLink] = { options: {} };

    let pollTarget = dbData.polls[pollLink];
    if (pollTarget.options[voteOption] === undefined) pollTarget.options[voteOption] = 0;
    pollTarget.options[voteOption] += customCount;

    let optionsList = "";
    for (let opt in pollTarget.options) {
      optionsList += `- *${opt}*: ${pollTarget.options[opt]} Votes\n`;
    }

    await sock.sendMessage(m.chat, {
      text: `🚀 *Custom Votes Added Successfully!*\n\n🔗 *Poll Link:* ${pollLink}\n➕ *Added ${customCount} votes to:* **${voteOption}**\n\n📊 *Current Poll Results:*\n${optionsList}`
    }, { quoted: m });
  }
};
