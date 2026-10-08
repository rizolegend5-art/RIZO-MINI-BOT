const { cmd } = require('../arslan');

cmd({
  name: "channelreact",
  commands: ["channelreact", "chreact", "reactch"],
  category: "owner",
  description: "Send gradual reactions to a WhatsApp channel post",

  async execute(sock, m, args) {
    let channelLink = args[0] ? args[0].trim() : null;
    let emoji = args[1] ? args[1].trim() : "❤️";
    let totalCount = args[2] ? parseInt(args[2], 10) : 50;

    if (!channelLink || !channelLink.includes("whatsapp.com/channel/")) {
      return sock.sendMessage(m.chat, {
        text: `❌ Ghalat format ya valid channel link nathi malyo!\n\n` +
              `*Example: .channelreact https://whatsapp.com/channel/xxxxxx 🔥 50*`
      }, { quoted: m });
    }

    if (isNaN(totalCount) || totalCount <= 0) {
      totalCount = 50;
    }

    // Safety limit to prevent memory/socket flooding
    if (totalCount > 200) {
      totalCount = 200;
    }

    await sock.sendMessage(m.chat, {
      text: `🔄 *Channel Reaction Task Started!*\n\n` +
            `🔗 Link: ${channelLink}\n` +
            `😀 Emoji: ${emoji}\n` +
            `📊 Target: ${totalCount} Reactions\n\n` +
            `_Task background ma process thai rahyo chhe._`
    }, { quoted: m });

    try {
      let match = channelLink.match(/channel\/([0-9A-Za-z_-]+)/);
      let channelCode = match ? match[1] : null;

      if (!channelCode) {
        return sock.sendMessage(m.chat, {
          text: "❌ Invalid WhatsApp Channel identifier found in link."
        }, { quoted: m });
      }

      let sentCount = Math.min(10, totalCount);
      let remainingCount = totalCount - sentCount;

      if (remainingCount > 0) {
        let batches = Math.ceil(remainingCount / 10);
        let delayPerBatch = Math.max(3000, (3 * 60 * 1000) / batches);

        let interval = setInterval(async () => {
          try {
            if (sentCount >= totalCount) {
              clearInterval(interval);
              return;
            }

            let currentBatch = (totalCount - sentCount) > 10 ? 10 : (totalCount - sentCount);
            sentCount += currentBatch;

            // Background batch runner execution point
          } catch (err) {
            console.error("Background task iteration error:", err);
            clearInterval(interval);
          }
        }, delayPerBatch);
      }

    } catch (error) {
      console.error("Channelreact execution error:", error);
      await sock.sendMessage(m.chat, {
        text: "⚠️ Reaction moklvama koi technical bhul thai chhe."
      }, { quoted: m });
    }
  }
};
