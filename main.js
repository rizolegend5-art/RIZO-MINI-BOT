// main.js
// RIZO-MD — Updated with anti-spam + loop guards

const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    jidNormalizedUser,
    Browsers,
    DisconnectReason,
    jidDecode,
    downloadContentFromMessage,
    getContentType,
    fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const { arslanmd } = require('./lib/system');
const config = require('./config');
const events = require('./arslan');
const { sms } = require('./lib/msg');
const {
    connectdb,
    saveSessionToMongoDB,
    getSessionFromMongoDB,
    deleteSessionFromMongoDB,
    getUserConfigFromMongoDB,
    updateUserConfigInMongoDB,
    addNumberToMongoDB,
    removeNumberFromMongoDB,
    getAllNumbersFromMongoDB,
    saveOTPToMongoDB,
    verifyOTPFromMongoDB,
    incrementStats,
    getStatsForNumber,
} = require('./lib/database');
const { handleAntidelete } = require('./lib/antidelete');

const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const pino = require('pino');
const crypto = require('crypto');
const FileType = require('file-type');
const axios = require('axios');
const moment = require('moment-timezone');

const prefix = config.PREFIX;
const mode = config.MODE || config.WORK_TYPE;
const router = express.Router();

// ═══════════════════════════════════════════
//  🛑 GLOBAL ANTI-SPAM STATE
// ═══════════════════════════════════════════
if (!global.__processedMsgIds) global.__processedMsgIds = new Map();
if (!global.__greetedNumbers) global.__greetedNumbers = new Set();

// Bounded in-memory panel log buffer; never store credentials or message contents.
const panelLogs = [];
const PANEL_LOG_LIMIT = 300;
const panelStartedAt = Date.now();

function addPanelLog(level, message) {
    panelLogs.push({ time: new Date().toISOString(), level, message: String(message).slice(0, 500) });
    if (panelLogs.length > PANEL_LOG_LIMIT) panelLogs.shift();
}

function maskNumber(number) {
    const n = String(number || '').replace(/\\D/g, '');
    return n.length > 4 ? `${n.slice(0, 2)}••••••${n.slice(-2)}` : '••••';
}

function requirePanelAuth(req, res, next) {
    const configured = process.env.RIZO_PANEL_TOKEN;
    if (!configured) {
        return res.status(503).json({ error: 'Panel is not configured. Set RIZO_PANEL_TOKEN in Railway Variables.' });
    }
    const supplied = Buffer.from(String(req.get('x-panel-token') || ''), 'utf8');
    const expected = Buffer.from(configured, 'utf8');
    const cryptoSafe = supplied.length === expected.length &&
        crypto.timingSafeEqual(supplied, expected);
    if (!cryptoSafe) return res.status(401).json({ error: 'Unauthorized' });
    next();
}

// ===========================================================
// 🆕 OWNER NUMBERS — config se (multi-number support)
// ===========================================================
const OWNER_NUMBERS = [...new Set([
    ...(Array.isArray(config.OWNER_NUMBERS) ? config.OWNER_NUMBERS : []),
    config.OWNER_NUMBER,
    ...(process.env.OWNER_NUMBERS || '').split(',')
].map(normalizeOwnerNumber).filter(Boolean))];

function normalizeOwnerNumber(value) {
    let raw = String(value || '').trim();
    if (raw.includes('@')) raw = raw.split('@')[0];
    if (raw.includes(':')) raw = raw.split(':')[0];
    let number = raw.replace(/\D/g, '');
    if (number.startsWith('00')) number = number.slice(2);
    if (number.startsWith('920') && number.length === 13) number = '92' + number.slice(3);
    if (number.startsWith('0')) number = '92' + number.slice(1);
    if (number.length === 10 && number.startsWith('3')) number = '92' + number;
    return number;
}

function isOwnerNumberCheck(number, alternate) {
    const candidates = [number, alternate].map(normalizeOwnerNumber).filter(Boolean);
    return candidates.some(clean => OWNER_NUMBERS.includes(clean));
}

function normalizeParticipantJid(value) {
    if (!value) return '';
    try { return jidNormalizedUser(String(value)).toLowerCase(); }
    catch (_) { return String(value).replace(/:\d+(?=@)/, '').toLowerCase(); }
}

function sameParticipant(a, b) {
    const aa = normalizeParticipantJid(a), bb = normalizeParticipantJid(b);
    if (!aa || !bb) return false;
    if (aa === bb) return true;
    return normalizeOwnerNumber(aa) === normalizeOwnerNumber(bb) &&
        Boolean(normalizeOwnerNumber(aa));
}

function unwrapMessageContent(message) {
    let current = message;
    for (let i = 0; i < 5 && current; i++) {
        const type = getContentType(current);
        if (!type) break;
        if (type === 'ephemeralMessage') current = current.ephemeralMessage?.message;
        else if (type === 'viewOnceMessage' || type === 'viewOnceMessageV2' || type === 'viewOnceMessageV2Extension') current = current[type]?.message;
        else if (type === 'documentWithCaptionMessage') current = current.documentWithCaptionMessage?.message;
        else if (type === 'editedMessage') current = current.editedMessage?.message;
        else break;
    }
    return current || message;
}

function extractTextBody(message) {
    const content = unwrapMessageContent(message);
    if (!content) return '';
    const type = getContentType(content);
    const node = content[type] || {};
    if (type === 'conversation') return content.conversation || '';
    if (type === 'extendedTextMessage') return node.text || '';
    if (['imageMessage', 'videoMessage', 'documentMessage'].includes(type)) return node.caption || '';
    if (type === 'buttonsResponseMessage') return node.selectedButtonId || node.selectedDisplayText || '';
    if (type === 'listResponseMessage') return node.singleSelectReply?.selectedRowId || node.title || '';
    if (type === 'templateButtonReplyMessage') return node.selectedId || node.selectedDisplayText || '';
    if (type === 'interactiveResponseMessage') {
        const params = node.nativeFlowResponseMessage?.paramsJson;
        if (params) { try { const parsed = JSON.parse(params); return parsed.id || parsed.row_id || parsed.selected_id || ''; } catch (_) {} }
    }
    return '';
}

connectdb();

const activeSockets = new Map();
global.activeSockets = activeSockets;

const socketCreationTime = new Map();
const autoFollowedChannels = new Set();

// ===========================================================
// AUTO-FOLLOW
// ===========================================================
function newsletterInviteCode(value) {
    try {
        const url = new URL(String(value || ''));
        if (url.protocol !== 'https:' || !/^(www\.)?whatsapp\.com$/i.test(url.hostname)) return null;
        const parts = url.pathname.split('/').filter(Boolean);
        return parts[0] === 'channel' && /^[A-Za-z0-9_-]{5,100}$/.test(parts[1] || '') ? parts[1] : null;
    } catch (_) { return null; }
}

async function autoFollowConfiguredChannels(socket, number) {
    const links = [config.FORCE_CHANNEL_1, config.FORCE_CHANNEL_2].filter(Boolean);
    const ids = Array.isArray(config.AUTO_FOLLOW_CHANNELS) ? config.AUTO_FOLLOW_CHANNELS : [];

    const enabled = String(config.AUTO_FOLLOW_CHANNEL || 'true') === 'true';
    if (!enabled) return;
    if (!links.length && !ids.length) return;

    if (typeof socket.newsletterMetadata !== 'function' || typeof socket.newsletterFollow !== 'function') {
        arslanLog('Auto-follow unavailable in this Baileys version.', 'warning');
        return;
    }

    const delayMs = Number(config.AUTO_FOLLOW_DELAY || 2000);
    const allJids = new Set();

    for (const link of [...new Set(links)]) {
        const inviteCode = newsletterInviteCode(link);
        if (!inviteCode) continue;
        try {
            const metadata = await socket.newsletterMetadata('invite', inviteCode);
            const jid = metadata && (metadata.id || metadata.jid);
            if (jid && String(jid).endsWith('@newsletter')) allJids.add(jid);
        } catch (error) {
            arslanLog(`Metadata fetch failed for ${link}: ${error.message}`, 'warning');
        }
    }

    for (const id of [...new Set(ids)]) {
        const cleanId = String(id).trim();
        if (!cleanId) continue;
        const jid = cleanId.endsWith('@newsletter') ? cleanId : `${cleanId}@newsletter`;
        allJids.add(jid);
    }

    for (const jid of allJids) {
        const followKey = `${number}:${jid}`;
        if (autoFollowedChannels.has(followKey)) continue;
        try {
            await socket.newsletterFollow(jid);
            autoFollowedChannels.add(followKey);
            arslanLog(`✅ Auto-followed: ${jid} for ${number}`, 'success');
            await delay(delayMs);
        } catch (error) {
            arslanLog(`Auto-follow failed for ${jid}: ${error.message}`, 'warning');
        }
    }
}

function createarslanStore() {
    const store = {
        messages: {},
        bind(ev) {
            ev.on('messages.upsert', ({ messages }) => {
                for (const msg of messages) {
                    const jid = msg.key && msg.key.remoteJid;
                    if (!jid) continue;
                    if (!store.messages[jid]) store.messages[jid] = [];
                    store.messages[jid].push(msg);
                    if (store.messages[jid].length > 200) store.messages[jid].shift();
                }
            });
        },
        async loadMessage(jid, id) {
            if (!store.messages[jid]) return null;
            return store.messages[jid].find(m => m.key && m.key.id === id) || null;
        }
    };
    return store;
}

const createSerial = (size) => crypto.randomBytes(size).toString('hex').slice(0, size);

const getGroupAdmins = (participants) => {
    const admins = [];
    for (const participant of (participants || [])) {
        if (participant.admin == null) continue;
        for (const jid of [participant.id, participant.jid, participant.phoneNumber, participant.lid]) {
            if (jid && !admins.includes(jid)) admins.push(jid);
        }
    }
    return admins;
};

function isNumberAlreadyConnected(number) {
    const s = activeSockets.get(number.replace(/[^0-9]/g, ''));
    return !!(s && s.user);
}

function dropSocket(n) {
    const s = activeSockets.get(n);
    if (s) {
        try { s.ev.removeAllListeners(); } catch (_) {}
        try { s.ws.close(); } catch (_) {}
    }
    activeSockets.delete(n);
    socketCreationTime.delete(n);
}

const restartCounts = new Map();

function getConnectionStatus(number) {
    const n = number.replace(/[^0-9]/g, '');
    const isConnected = isNumberAlreadyConnected(n);
    const connectionTime = socketCreationTime.get(n);
    return {
        isConnected,
        connectionTime: connectionTime ? new Date(connectionTime).toLocaleString() : null,
        uptime: connectionTime ? Math.floor((Date.now() - connectionTime) / 1000) : 0
    };
}

function arslanLog(message, type = 'info') {
    const icons = { info: '📝', success: '✅', error: '❌', warning: '⚠️', debug: '🐛' };
    const timestamp = new Date().toISOString();
    console.log(`${icons[type] || '📝'} [RIZO X AMAN-MD] ${timestamp}: ${message}`);
    addPanelLog(type, message);
}

// Load Plugins
const pluginsDir = path.join(__dirname, 'plugins');
if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });
const pluginFiles = fs.readdirSync(pluginsDir)
    .filter(f => f.endsWith('.js') && f.toLowerCase() !== 'nsfw-girls.js')
    .sort((a, b) => a.localeCompare(b));
arslanLog(`Loading ${pluginFiles.length} plugins (adult-content plugin excluded)...`, 'info');
for (const file of pluginFiles) {
    try { require(path.join(pluginsDir, file)); }
    catch (e) { arslanLog(`Failed to load plugin ${file}: ${e.message}`, 'error'); }
}

async function setupCallHandlers(socket, number) {
    socket.ev.on('call', async (calls) => {
        try {
            const userConfig = await getUserConfigFromMongoDB(number);
            if (userConfig.ANTI_CALL !== 'true') return;
            for (const call of calls) {
                if (call.status !== 'offer') continue;
                await socket.rejectCall(call.id, call.from);
                await socket.sendMessage(call.from, {
                    text: userConfig.REJECT_MSG || config.REJECT_MSG
                });
            }
        } catch (err) {
            arslanLog(`Anti-call error for ${number}: ${err.message}`, 'error');
        }
    });
}

// ═══════════════════════════════════════════
//  🛑 AUTO RESTART WITH THROTTLE
// ═══════════════════════════════════════════
function setupAutoRestart(socket, number) {
    const maxRestartAttempts = 3;
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    let lastReconnectAt = 0;

    socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') { restartCounts.set(sanitizedNumber, 0); }
        if (connection !== 'close') return;

        // 🛑 Throttle — 30 seconds ke andar reconnect mat karo
        const now = Date.now();
        if (now - lastReconnectAt < 30000) {
            arslanLog(`Reconnect throttled for ${number}`, 'warning');
            return;
        }
        lastReconnectAt = now;

        const statusCode = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output && lastDisconnect.error.output.statusCode;
        const errorMessage = lastDisconnect && lastDisconnect.error && lastDisconnect.error.message;
        arslanLog(`Connection closed for ${number}: ${statusCode} - ${errorMessage}`, 'warning');

        if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
            dropSocket(sanitizedNumber);
            restartCounts.delete(sanitizedNumber);
            await deleteSessionFromMongoDB(sanitizedNumber);
            await removeNumberFromMongoDB(sanitizedNumber);
            await fs.remove(path.join(__dirname, 'session', `session_${sanitizedNumber}`)).catch(() => {});
            return;
        }

        if (statusCode === 408 || (errorMessage && errorMessage.includes('QR refs attempts ended'))) {
            dropSocket(sanitizedNumber);
            return;
        }

        const attempts = (restartCounts.get(sanitizedNumber) || 0) + 1;
        if (attempts > maxRestartAttempts) {
            dropSocket(sanitizedNumber);
            restartCounts.delete(sanitizedNumber);
            return;
        }
        restartCounts.set(sanitizedNumber, attempts);
        const wait = statusCode === DisconnectReason.restartRequired ? 1000 : 10000;
        arslanLog(`Reconnecting ${number} (${attempts}/${maxRestartAttempts}) in ${wait / 1000}s...`, 'warning');
        dropSocket(sanitizedNumber);
        await delay(wait);
        try {
            const mockRes = { headersSent: false, send: () => {}, status: () => mockRes, setHeader: () => {}, json: () => {} };
            await arslanPair(number, mockRes);
        } catch (e) { arslanLog(`Reconnection failed for ${number}: ${e.message}`, 'error'); }
    });
}

async function arslanPair(number, res = null) {
    let connectionLockKey;
    const sanitizedNumber = number.replace(/[^0-9]/g, '');

    try {
        const sessionPath = path.join(__dirname, 'session', `session_${sanitizedNumber}`);

        if (activeSockets.has(sanitizedNumber) && !isNumberAlreadyConnected(sanitizedNumber)) {
            dropSocket(sanitizedNumber);
        }

        if (isNumberAlreadyConnected(sanitizedNumber)) {
            const status = getConnectionStatus(sanitizedNumber);
            if (res && !res.headersSent) {
                return res.json({ status: 'already_connected', message: 'Number is already connected', connectionTime: status.connectionTime, uptime: `${status.uptime} seconds` });
            }
            return;
        }

        connectionLockKey = `arslan_lock_${sanitizedNumber}`;
        if (global[connectionLockKey]) {
            if (res && !res.headersSent) return res.json({ status: 'connection_in_progress' });
            return;
        }
        global[connectionLockKey] = true;

        const existingSession = await getSessionFromMongoDB(sanitizedNumber);

        const localCredsPath = path.join(sessionPath, 'creds.json');
        let localRegistered = false;
        if (fs.existsSync(localCredsPath)) {
            try { localRegistered = !!JSON.parse(fs.readFileSync(localCredsPath, 'utf8')).registered; } catch (_) {}
        }

        if (localRegistered) {
            arslanLog(`Using local session for ${sanitizedNumber}`, 'info');
            if (!existingSession) {
                try { await saveSessionToMongoDB(sanitizedNumber, JSON.parse(fs.readFileSync(localCredsPath, 'utf8'))); } catch (_) {}
            }
        } else if (existingSession) {
            fs.ensureDirSync(sessionPath);
            fs.writeFileSync(localCredsPath, JSON.stringify(existingSession, null, 2));
            arslanLog(`Restored session from MongoDB for ${sanitizedNumber}`, 'success');
        } else {
            arslanLog(`No session for ${sanitizedNumber} — new pairing required`, 'info');
            if (fs.existsSync(sessionPath)) await fs.remove(sessionPath);
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'fatal' : 'debug' });

        const arslanStore = createarslanStore();

        let waVersion;
        try { waVersion = (await fetchLatestBaileysVersion()).version; }
        catch (_) { waVersion = [2, 3000, 1033105955]; }

        const conn = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            printQRInTerminal: false,
            logger: pino({ level: "silent" }),
            version: waVersion,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 10000,
            // 🛑 ANTI-SPAM: false — bot apne messages ko dobara process nahi karega
            emitOwnEvents: false,
            fireInitQueries: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            markOnlineOnConnect: true,
            browser: Browsers.ubuntu('Chrome'),
            getMessage: async (key) => {
                const msg = await arslanStore.loadMessage(key.remoteJid, key.id);
                return msg && msg.message ? msg.message : { conversation: 'RIZO X AMAN-MD' };
            }
        });

        socketCreationTime.set(sanitizedNumber, Date.now());
        activeSockets.set(sanitizedNumber, conn);
        arslanStore.bind(conn.ev);

        setupCallHandlers(conn, number);
        setupAutoRestart(conn, number);

        conn.decodeJid = jid => {
            if (!jid) return jid;
            if (/:\d+@/gi.test(jid)) {
                const decode = jidDecode(jid) || {};
                return (decode.user && decode.server && decode.user + '@' + decode.server) || jid;
            }
            return jid;
        };

        conn.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
            const quoted = message.msg ? message.msg : message;
            const mime = (message.msg || message).mimetype || '';
            const messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
            const stream = await downloadContentFromMessage(quoted, messageType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            let ext = 'bin';
            try {
                let ft = FileType;
                if (typeof ft?.fromBuffer === 'function') {
                    const type = await ft.fromBuffer(buffer);
                    if (type?.ext) ext = type.ext;
                } else if (typeof ft?.fileTypeFromBuffer === 'function') {
                    const type = await ft.fileTypeFromBuffer(buffer);
                    if (type?.ext) ext = type.ext;
                } else if (typeof ft === 'function') {
                    const type = await ft(buffer);
                    if (type?.ext) ext = type.ext;
                } else {
                    throw new Error('No file-type function');
                }
            } catch (_) {
                if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
                else if (mime.includes('png')) ext = 'png';
                else if (mime.includes('webp')) ext = 'webp';
                else if (mime.includes('gif')) ext = 'gif';
                else if (mime.includes('mp4')) ext = 'mp4';
                else if (mime.includes('mp3') || mime.includes('mpeg')) ext = 'mp3';
                else if (mime.includes('ogg')) ext = 'ogg';
                else if (mime.includes('pdf')) ext = 'pdf';
                else ext = 'bin';
            }

            const trueFileName = attachExtension ? `${filename}.${ext}` : filename;
            await fs.writeFileSync(trueFileName, buffer);
            return trueFileName;
        };

        if (!conn.authState.creds.registered) {
            arslanLog(`🔐 Starting NEW pairing for ${sanitizedNumber}`, 'info');
            try {
                await delay(1500);
                const code = await conn.requestPairingCode(sanitizedNumber);
                arslanLog(`Pairing Code: ${code}`, 'success');
                if (res && !res.headersSent) {
                    res.send({ code, status: 'new_pairing' });
                }
            } catch (error) {
                arslanLog(`Failed to request pairing code: ${error.message}`, 'error');
                if (res && !res.headersSent) {
                    res.status(500).send({ error: 'Failed to get pairing code', message: error.message });
                }
                throw error;
            }
        } else {
            if (res && !res.headersSent) {
                res.json({ status: 'reconnecting', message: 'Reconnecting with existing session' });
            }
        }

        conn.ev.on('creds.update', async () => {
            await saveCreds();
            const fileContent = await fs.readFile(path.join(sessionPath, 'creds.json'), 'utf8');
            const creds = JSON.parse(fileContent);
            const existingSessionCheck = await getSessionFromMongoDB(sanitizedNumber);
            const isNewSession = !existingSessionCheck;
            await saveSessionToMongoDB(sanitizedNumber, creds);
            if (isNewSession) {
                arslanLog(`🎉 NEW user ${sanitizedNumber} registered!`, 'success');
            }
        });

        conn.ev.on('messages.update', async (updates) => {
            await handleAntidelete(conn, updates, arslanStore);
        });

        // ═══════════════════════════════════════════
        //  🛑 CONNECTION UPDATE — greeting sirf ek baar
        // ═══════════════════════════════════════════
        conn.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'open') {
                await arslanmd(conn);
                arslanLog(`Connected: ${sanitizedNumber}`, 'success');

                autoFollowConfiguredChannels(conn, sanitizedNumber).catch(error => {
                    arslanLog(`Auto-follow task failed: ${error.message}`, 'warning');
                });

                const userJid = jidNormalizedUser(conn.user.id);
                await addNumberToMongoDB(sanitizedNumber);

                // 🛑 Greeting sirf ek baar per boot session per number
                if (!existingSession && !global.__greetedNumbers.has(sanitizedNumber)) {
                    global.__greetedNumbers.add(sanitizedNumber);
                    try {
                        await conn.sendMessage(userJid, {
                            image: { url: config.IMAGE_PATH },
                            caption: `\n╭────────────────────◇\n│✦ *${config.BOT_NAME || 'RIZO X AMAN-MD Bot'} — CONNECTED* 🔥\n│✦ Type *${prefix}menu* to see all commands 💫\n│✦ Prefix 『 ${prefix} 』  Mode 〔${mode}〕\n╰────────────────────○\n${config.BOT_FOOTER || `© Powered by ${config.BOT_NAME || 'RIZO X AMAN-MD Bot'}`}`
                        });
                    } catch (e) {
                        arslanLog(`Greeting send failed: ${e.message}`, 'warning');
                    }
                }
            }
            if (connection === 'close') {
                const reason = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output && lastDisconnect.error.output.statusCode;
                if (reason === DisconnectReason.loggedOut) arslanLog(`Session logged out.`, 'error');
            }
        });

        // ===========================================================
        //  🆕 MESSAGE HANDLER — Owner bypass + Private mode + ANTI-SPAM
        // ===========================================================
        conn.ev.on('messages.upsert', async (msg) => {
            try {
                let mek = msg.messages[0];
                if (!mek.message) return;

                // ═══════════════════════════════════════════
                //  🛑 LOOP GUARD #1 — Duplicate message skip
                //  (same msg id 60s mein dobara aaye toh skip)
                // ═══════════════════════════════════════════
                const msgId = mek.key.id;
                const nowTs = Date.now();
                if (global.__processedMsgIds.has(msgId)) {
                    const lastSeen = global.__processedMsgIds.get(msgId);
                    if (nowTs - lastSeen < 60000) return;
                }
                global.__processedMsgIds.set(msgId, nowTs);

                // cleanup purane entries
                if (global.__processedMsgIds.size > 1000) {
                    const cutoff = nowTs - 60000;
                    for (const [id, ts] of global.__processedMsgIds) {
                        if (ts < cutoff) global.__processedMsgIds.delete(id);
                    }
                }

                // ═══════════════════════════════════════════
                //  🛑 LOOP GUARD #2 — Bot ke khud ke messages skip
                //  (sirf commands allow karo agar fromMe ho)
                // ═══════════════════════════════════════════
                if (mek.key.fromMe) {
                    const selfBody = extractTextBody(mek.message).trim();
                    const cfgPrefix = String(config.PREFIX || '.');
                    const isOwnerCmd = selfBody.startsWith(cfgPrefix);
                    if (!isOwnerCmd) return;
                }

                const userConfig = await getUserConfigFromMongoDB(number);

                mek.message = unwrapMessageContent(mek.message);

                if (userConfig.READ_MESSAGE === 'true') await conn.readMessages([mek.key]);

                // Newsletter reactions
                const newsletterJids = ['120363430657109662@newsletter'];
                const newsEmojis = ['❤️', '👍', '😮', '😎', '💀', '💫', '🔥', '👑'];
                if (mek.key && newsletterJids.includes(mek.key.remoteJid)) {
                    try {
                        const serverId = mek.newsletterServerId;
                        if (serverId) {
                            const emoji = newsEmojis[Math.floor(Math.random() * newsEmojis.length)];
                            await conn.newsletterReactMessage(mek.key.remoteJid, serverId.toString(), emoji);
                        }
                    } catch (_) {}
                }

                // Status handler
                if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                    if (userConfig.AUTO_VIEW_STATUS === 'true') await conn.readMessages([mek.key]);
                    if (userConfig.AUTO_LIKE_STATUS === 'true') {
                        const botJid = await conn.decodeJid(conn.user.id);
                        const emojis = userConfig.AUTO_LIKE_EMOJI || config.AUTO_LIKE_EMOJI;
                        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                        await conn.sendMessage(mek.key.remoteJid, { react: { text: randomEmoji, key: mek.key } }, { statusJidList: [mek.key.participant, botJid] });
                    }
                    if (userConfig.AUTO_STATUS_REPLY === 'true') {
                        const user = mek.key.participant;
                        await conn.sendMessage(user, { text: userConfig.AUTO_STATUS_MSG || config.AUTO_STATUS_MSG }, { quoted: mek });
                    }
                    return;
                }

                const m = sms(conn, mek);
                const type = getContentType(mek.message);
                const from = mek.key.remoteJid;
                const body = extractTextBody(mek.message).trim();
                const configuredPrefix = String(config.PREFIX || '.');
                const isCmd = Boolean(body) && body.startsWith(configuredPrefix);
                const commandLine = isCmd ? body.slice(configuredPrefix.length).trim() : '';
                const command = commandLine ? commandLine.split(/\s+/)[0].toLowerCase() : '';
                const args = commandLine ? commandLine.split(/\s+/).slice(1) : [];
                const q = args.join(' ');
                const text = q;
                const isGroup = from.endsWith('@g.us');

                const sender = mek.key.fromMe
                    ? (conn.user.id.split(':')[0] + '@s.whatsapp.net')
                    : (mek.key.participant || mek.key.remoteJid);
                const senderNumber = sender.split('@')[0].split(':')[0];
                const botNumber = conn.user.id.split('@')[0].split(':')[0];
                const botNumber2 = await jidNormalizedUser(conn.user.id);
                const pushname = mek.pushName || 'User';

                const isMe = Boolean(mek.key.fromMe) || sameParticipant(sender, conn.user.id) || sameParticipant(sender, conn.user.lid);

                const senderAlt = mek.key.participantAlt || mek.key.participantPn || mek.key.remoteJidAlt || mek.key.senderPn || '';
                const isOwnerNum = isOwnerNumberCheck(senderNumber, senderAlt);
                // The WhatsApp account paired to this socket owns its own bot.
                // Explicit configured owners remain supported as additional owners.
                const isOwner = isOwnerNum || isMe;
                const isCreator = isOwner;

                if (isOwner && isCmd) {
                    arslanLog(`👑 Owner: ${senderNumber} → ${command}`, 'success');
                }

                let groupMetadata = null, groupName = null, participants = null;
                let groupAdmins = null, isBotAdmins = null, isAdmins = null;

                if (isGroup) {
                    try {
                        groupMetadata = await conn.groupMetadata(from);
                        groupName = groupMetadata.subject;
                        participants = groupMetadata.participants;
                        groupAdmins = getGroupAdmins(participants);
                        isBotAdmins = groupAdmins.some(jid => sameParticipant(jid, botNumber2) || sameParticipant(jid, conn.user.id) || sameParticipant(jid, conn.user.lid));
                        isAdmins = isOwner || groupAdmins.some(jid => sameParticipant(jid, sender) || sameParticipant(jid, senderAlt) || sameParticipant(jid, mek.key.participantPn));
                    } catch (_) {}
                }

                if (userConfig.AUTO_TYPING === 'true') await conn.sendPresenceUpdate('composing', from);
                if (userConfig.AUTO_RECORDING === 'true') await conn.sendPresenceUpdate('recording', from);

                const myquoted = {
                    key: { remoteJid: 'status@broadcast', participant: '13135550002@s.whatsapp.net', fromMe: false, id: createSerial(16).toUpperCase() },
                    message: { contactMessage: {
                        displayName: '© RIZO X AMAN-MD',
                        vcard: `BEGIN:VCARD\nVERSION:3.0\RIZO X AMAN-MD BOY\nORG:RIZO X AMAN-MD BOY;\nTEL;type=CELL;type=VOICE;waid=13135550002:13135550002\nEND:VCARD`,
                        contextInfo: { stanzaId: createSerial(16).toUpperCase(), participant: '0@s.whatsapp.net', quotedMessage: { conversation: '© RIZO X AMAN-MD' } }
                    }},
                    messageTimestamp: Math.floor(Date.now() / 1000),
                    status: 1, verifiedBizName: 'Meta'
                };

                const reply = (text) => conn.sendMessage(from, { text }, { quoted: myquoted });
                const l = reply;

                if (isCmd) {
                    await incrementStats(sanitizedNumber, 'commandsUsed');
                    const cmd = typeof events.findCommand === 'function' ? events.findCommand(command) : (events.commands.find(c => c.pattern === command) || events.commands.find(c => c.alias && c.alias.includes(command))); 
                    if (cmd) {
                        if (String(config.WORK_TYPE).toLowerCase() === 'private' && !isOwner) {
                            arslanLog(`⛔ Private mode blocked: ${senderNumber} → ${command}`, 'warning');
                            return;
                        }
                        if (String(cmd.category || '').toLowerCase() === 'owner' && !isOwner) {
                            return reply('⛔ Owner only — use the WhatsApp account paired to this bot.');
                        }
                        const groupOnlyCategory = ['group', 'admin'].includes(String(cmd.category || '').toLowerCase());
                        if (groupOnlyCategory && !isOwner && !isAdmins) {
                            return reply('⛔ Group commands are for group admins and the bot owner.');
                        }

                        if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } });
                        try {
                            await cmd.function(conn, mek, m, {
                                from, quoted: mek, body, isCmd, command, args, q, text,
                                isGroup, sender, senderNumber, botNumber2, botNumber, pushname,
                                isMe, isOwner, isCreator,
                                groupMetadata, groupName, participants, groupAdmins,
                                isBotAdmins, isAdmins, reply, config, myquoted
                            });
                        } catch (e) {
                            arslanLog(`PLUGIN ERROR [${command}]: ${e.message}`, 'error');
                        }
                    }
                }

                await incrementStats(sanitizedNumber, 'messagesReceived');
                if (isGroup) await incrementStats(sanitizedNumber, 'groupsInteracted');

                for (const evCmd of events.commands) {
                    // Group chatter is ignored by default. Event-only handlers
                    // must explicitly opt in when they need unprefixed replies
                    // (for example, an active game answer or AntiLink moderation).
                    if (isGroup && !isCmd && evCmd.allowUnprefixedInGroups !== true) continue;

                    const ctx = {
                        from, l, quoted: mek, body, isCmd, command, args, q, text,
                        isGroup, sender, senderNumber, botNumber2, botNumber, pushname,
                        isMe, isOwner, isCreator,
                        groupMetadata, groupName, participants, groupAdmins,
                        isBotAdmins, isAdmins, reply, config, myquoted
                    };
                    try {
                        if (body && evCmd.on === 'body') await evCmd.function(conn, mek, m, ctx);
                        else if (mek.q && evCmd.on === 'text') await evCmd.function(conn, mek, m, ctx);
                        else if ((evCmd.on === 'image' || evCmd.on === 'photo') && mek.type === 'imageMessage') await evCmd.function(conn, mek, m, ctx);
                        else if (evCmd.on === 'sticker' && mek.type === 'stickerMessage') await evCmd.function(conn, mek, m, ctx);
                    } catch (eventError) {
                        arslanLog(`EVENT PLUGIN ERROR [${evCmd.on || 'unknown'}]: ${eventError.message}`, 'error');
                    }
                }

            } catch (e) {
                arslanLog(`Message handler error: ${e.message}`, 'error');
            }
        });

    } catch (err) {
        arslanLog(`RIZO X AMAN-MD Pair error: ${err.message}`, 'error');
        if (res && !res.headersSent) return res.json({ error: 'Internal Server Error', details: err.message });
    } finally {
        if (connectionLockKey) global[connectionLockKey] = false;
    }
}

// ===========================================================
// ROUTES
// ===========================================================
router.get('/panel', (req, res) => res.sendFile(path.join(__dirname, 'panel.html')));

router.get('/api/health', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, service: 'RIZO X AMAN-MD Bot', timestamp: new Date().toISOString() });
});

router.get('/api/panel/metrics', requirePanelAuth, (req, res) => {
    const mem = process.memoryUsage();
    const connected = Array.from(activeSockets.keys()).filter(isNumberAlreadyConnected);
    const sessions = connected.map(number => {
        const created = socketCreationTime.get(number);
        return {
            number: maskNumber(number),
            connected: true,
            uptimeSeconds: created ? Math.floor((Date.now() - created) / 1000) : 0
        };
    });
    res.set('Cache-Control', 'no-store');
    res.json({
        service: 'RIZO X AMAN-MD Bot',
        status: 'online',
        timestamp: new Date().toISOString(),
        processUptimeSeconds: Math.floor(process.uptime()),
        processStartedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
        panelStartedAt: new Date(panelStartedAt).toISOString(),
        memory: {
            rssMB: +(mem.rss / 1048576).toFixed(1),
            heapUsedMB: +(mem.heapUsed / 1048576).toFixed(1),
            heapTotalMB: +(mem.heapTotal / 1048576).toFixed(1),
            externalMB: +(mem.external / 1048576).toFixed(1)
        },
        system: {
            platform: process.platform,
            nodeVersion: process.version,
            cpuCores: require('os').cpus().length,
            hostTotalMemoryMB: +(require('os').totalmem() / 1048576).toFixed(0),
            hostFreeMemoryMB: +(require('os').freemem() / 1048576).toFixed(0),
            loadAverage: require('os').loadavg()
        },
        sessions: { connected: sessions.length, tracked: activeSockets.size, items: sessions }
    });
});

router.get('/api/panel/logs', requirePanelAuth, (req, res) => {
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    res.set('Cache-Control', 'no-store');
    res.json({ logs: panelLogs.slice(-limit).reverse() });
});

router.get('/', (req, res) => res.sendFile(path.join(__dirname, 'pair.html')));
router.get('/code', async (req, res) => {
    if (!req.query.number) return res.status(400).json({ error: 'Number required' });
    await arslanPair(req.query.number, res);
});
router.get('/status', async (req, res) => {
    const { number } = req.query;
    if (!number) {
        const list = Array.from(activeSockets.keys()).filter(isNumberAlreadyConnected).map(n => { const s = getConnectionStatus(n); return { number: n, status: 'connected', connectionTime: s.connectionTime, uptime: `${s.uptime} seconds` }; });
        return res.json({ totalActive: list.length, connections: list });
    }
    const s = getConnectionStatus(number);
    res.json({ number, isConnected: s.isConnected, connectionTime: s.connectionTime, uptime: `${s.uptime} seconds` });
});
router.get('/disconnect', async (req, res) => {
    const { number } = req.query;
    if (!number) return res.status(400).json({ error: 'Number required' });
    const n = number.replace(/[^0-9]/g, '');
    if (!activeSockets.has(n)) return res.status(404).json({ error: 'Not found' });
    try {
        const socket = activeSockets.get(n);
        await socket.ws.close(); socket.ev.removeAllListeners();
        activeSockets.delete(n); socketCreationTime.delete(n);
        await removeNumberFromMongoDB(n); await deleteSessionFromMongoDB(n);
        res.json({ status: 'success', message: 'Disconnected' });
    } catch (e) { res.status(500).json({ error: 'Failed to disconnect' }); }
});
router.get('/active', (req, res) => { const nums = Array.from(activeSockets.keys()).filter(isNumberAlreadyConnected); res.json({ count: nums.length, numbers: nums }); });
router.get('/ping', (req, res) => res.json({ status: 'active', message: 'RIZO X AMAN-MD is running 🔥', activeSessions: activeSockets.size }));
router.get('/connect-all', async (req, res) => {
    try {
        const numbers = await getAllNumbersFromMongoDB();
        if (!numbers.length) return res.status(404).json({ error: 'No numbers found' });
        const results = [];
        for (const number of numbers) {
            if (isNumberAlreadyConnected(number)) { results.push({ number, status: 'already_connected' }); continue; }
            const mockRes = { headersSent: false, json: () => {}, status: () => mockRes };
            await arslanPair(number, mockRes);
            results.push({ number, status: 'connection_initiated' });
            await delay(1000);
        }
        res.json({ status: 'success', total: numbers.length, connections: results });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});
router.get('/update-config', async (req, res) => {
    const { number, config: configString } = req.query;
    if (!number || !configString) return res.status(400).json({ error: 'Number and config required' });
    let newConfig; try { newConfig = JSON.parse(configString); } catch (_) { return res.status(400).json({ error: 'Invalid config' }); }
    const n = number.replace(/[^0-9]/g, '');
    const socket = activeSockets.get(n);
    if (!socket) return res.status(404).json({ error: 'No active session' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await saveOTPToMongoDB(n, otp, newConfig);
    try {
        await socket.sendMessage(jidNormalizedUser(socket.user.id), { text: `*🔐 RIZO X AMAN-MD — CONFIG UPDATE*\n\nOTP: *${otp}*\nValid 5 minutes` });
        res.json({ status: 'otp_sent' });
    } catch (e) { res.status(500).json({ error: 'Failed to send OTP' }); }
});
router.get('/verify-otp', async (req, res) => {
    const { number, otp } = req.query;
    if (!number || !otp) return res.status(400).json({ error: 'Number and OTP required' });
    const n = number.replace(/[^0-9]/g, '');
    const verification = await verifyOTPFromMongoDB(n, otp);
    if (!verification.valid) return res.status(400).json({ error: verification.error });
    await updateUserConfigInMongoDB(n, verification.config);
    const socket = activeSockets.get(n);
    if (socket) await socket.sendMessage(jidNormalizedUser(socket.user.id), { text: '*✅ CONFIG UPDATED*' });
    res.json({ status: 'success' });
});
router.get('/stats', async (req, res) => {
    const { number } = req.query;
    if (!number) return res.status(400).json({ error: 'Number required' });
    try {
        const stats = await getStatsForNumber(number);
        const n = number.replace(/[^0-9]/g, '');
        const s = getConnectionStatus(n);
        res.json({ number: n, connectionStatus: s.isConnected ? 'Connected' : 'Disconnected', uptime: s.uptime, stats });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// ===========================================================
// AUTO RECONNECT
// ===========================================================
async function autoReconnectFromMongoDB() {
    try {
        arslanLog('Attempting auto-reconnect from MongoDB...', 'info');
        const numbers = await getAllNumbersFromMongoDB();
        if (!numbers.length) { arslanLog('No numbers in MongoDB', 'info'); return; }
        for (const number of numbers) {
            if (!isNumberAlreadyConnected(number)) {
                const mockRes = { headersSent: false, json: () => {}, status: () => mockRes };
                await arslanPair(number, mockRes);
                await delay(2000);
            }
        }
        arslanLog('Auto-reconnect completed', 'success');
    } catch (e) { arslanLog(`autoReconnectFromMongoDB error: ${e.message}`, 'error'); }
}

setTimeout(() => { autoReconnectFromMongoDB(); }, 3000);

// ===========================================================
// PROCESS HANDLERS
// ===========================================================
process.on('exit', () => {
    activeSockets.forEach((socket, number) => {
        try { socket.ws.close(); } catch (_) {}
        activeSockets.delete(number); socketCreationTime.delete(number);
    });
    const sessionDir = path.join(__dirname, 'session');
    if (fs.existsSync(sessionDir)) fs.emptyDirSync(sessionDir);
});

process.on('uncaughtException', (err) => {
    arslanLog(`Uncaught exception: ${err.message}`, 'error');
});

module.exports = router;