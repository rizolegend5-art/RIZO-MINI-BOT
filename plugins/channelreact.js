module.exports = {
  name: "channelreact",
  commands: ['channelreact', 'chreact', 'reactch'],
  category: "tools",
  description: "React automatically to channel newsletters",
  async execute(sock, m, args) {
    let channelLink = args[0] ? args[0].trim() : null;
    let emoji = args[1] ? args[1].trim() : '❤️';
    let totalCount = args[2] ? parseInt(args[2]) : 50;

    if (!channelLink) {
      return sock.sendMessage(m.chat, {
        text: `❌ Ghalat format! Sahi tareeqa vaparo:\n\n*.channelreact <channel_link> <emoji> <total_count>*`
      }, { quoted: m });
    }

    await sock.sendMessage(m.chat, {
      text: `🔄 *Channel Reaction Task Started!*\n\n🔗 Link: ${channelLink}\n😀 Emoji: ${emoji}\n📊 Total Target: ${totalCount} Reactions`
    }, { quoted: m });
  }
};
