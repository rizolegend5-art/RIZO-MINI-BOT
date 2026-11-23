// lib/panel-api.js — OWNER PANEL (web) ka server hissa.
//
//   /panel  (panel.html)  ->  token se login  ->  saari bot commands BUTTONS ki shakal mein  ->  click = command chal gayi.
//
// Login token:  Variables mein  RIZO_PANEL_TOKEN  (ya wahi PANEL_SECRET jo .login ke liye hai) — dono mein se koi ek kaafi hai.
//
// Safety:
//   * Galat token baar baar daalne par IP 15 minute ke liye band (8 koshishein).
//   * Panel sirf HOST ke apne session (OWNER_NUMBER / OWNER_NUMBERS) par command chalata hai —
//     doosre logon ke jode hue accounts par kabhi nahi.
//   * eval2 (code chalane wali command) panel se bilkul nahi chalti.
//   * Command wahi dispatcher chalata hai jo WhatsApp message se chalta hai (owner ki taraf se), koi alag rasta nahi.

const crypto = require('crypto');
const config = require('../config');
const events = require('../arslan');

const HIDDEN_COMMANDS = new Set(['eval2']);           // panel se kabhi nahi
const HIDDEN_CATEGORIES = new Set(['adult']);         // panel mein buttons nahi dikhte
const DANGEROUS = new Set([                           // click par "pakka?" poochta hai
    'restart', 'killall', 'end', 'leave', 'botpause', 'maintenance', 'broadcast2', 'forwardall', 'botnotice', 'sendto',
    'userban', 'userunban', 'sfollow', 'sunfollow', 'sreacts', 'svotes', 'arcadd', 'massvote', 'masspoll', 'removeadmins',
    'rejectall', 'acceptall', 'setpp', 'removepp', 'setbotname', 'setall', 'kick', 'demote', 'antilinkreset', 'setprefix'
]);

// ------------------------------------------------------------------ auth (+ brute-force lock)
const FAIL_LIMIT = 8, LOCK_MS = 15 * 60000;
const failMap = new Map();     // ip -> { n, until }

const getToken = () => String(process.env.RIZO_PANEL_TOKEN || process.env.PANEL_SECRET || config.PANEL_SECRET || '');
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();

function clientIp(req) {
    // hosting proxy sab se aakhri entry khud lagata hai (client ki likhi hui pehli entries par bharosa nahi)
    const xf = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
    return xf.length ? xf[xf.length - 1] : ((req.socket && req.socket.remoteAddress) || 'unknown');
}

function requirePanelAuth(req, res, next) {
    const token = getToken();
    if (!token) return res.status(503).json({ error: 'Panel set nahi hai. Variables mein RIZO_PANEL_TOKEN (ya PANEL_SECRET) daalo aur bot restart karo.' });
    const ip = clientIp(req);
    const f = failMap.get(ip);
    if (f && f.until > Date.now()) {
        return res.status(429).json({ error: `Bohat galat koshishein. ${Math.ceil((f.until - Date.now()) / 60000)} minute baad try karo.` });
    }
    const ok = crypto.timingSafeEqual(sha(req.get('x-panel-token') || ''), sha(token));
    if (!ok) {
        const n = ((f && f.until === 0 ? f.n : 0) || 0) + 1;
        failMap.set(ip, n >= FAIL_LIMIT ? { n: 0, until: Date.now() + LOCK_MS } : { n, until: 0 });
        if (failMap.size > 500) failMap.clear();
        return res.status(401).json({ error: 'Galat token.' });
    }
    failMap.delete(ip);
    res.set('Cache-Control', 'no-store');
    next();
}

// ------------------------------------------------------------------ run limiter
const runTimes = [];
function runAllowed() {
    const now = Date.now();
    while (runTimes.length && now - runTimes[0] > 60000) runTimes.shift();
    if (runTimes.length >= 40) return false;
    runTimes.push(now);
    return true;
}

// ------------------------------------------------------------------ result capture (sirf panel se chalayi gayi commands ka jawab)
const captures = new Map();    // id -> { number, jid, until, lines: [{t,text}] }
const bareNumber = (conn) => String((conn && conn.user && conn.user.id) || '').split('@')[0].split(':')[0];

function captureOutgoing(conn, jid, content) {
    if (!captures.size || !content) return;
    const now = Date.now();
    const num = bareNumber(conn);
    for (const [id, c] of captures) {
        if (c.until < now) { if (now - c.until > 60000) captures.delete(id); continue; }
        if (c.number !== num || c.jid !== jid) continue;
        let text = content.text || content.caption || '';
        if (!text) {
            const kind = ['image', 'video', 'audio', 'document', 'sticker', 'react', 'poll', 'contacts', 'location'].find(k => content[k]);
            if (!kind || kind === 'react') continue;
            text = `[${kind}${content.fileName ? ': ' + content.fileName : ''} bheja gaya]`;
        }
        if (c.lines.length < 20) c.lines.push({ t: now, text: String(text).slice(0, 1500) });
    }
}

// ------------------------------------------------------------------ mount
function mount(router, deps) {
    const { activeSockets, isConnected, isHostNumber, jidNormalizedUser } = deps;
    const sid = (number) => crypto.createHash('sha1').update('rizo-panel:' + number).digest('hex').slice(0, 10);
    const hostSessions = () => Array.from(activeSockets.keys()).filter(n => isConnected(n) && isHostNumber(n));
    const pickSession = (id) => {
        const list = hostSessions();
        return (id && list.find(n => sid(n) === id)) || list[0] || null;
    };
    const label = (n) => `${n.slice(0, 4)}••••${n.slice(-2)}`;

    router.get('/api/panel/me', requirePanelAuth, (req, res) => {
        res.json({ ok: true, prefix: String(config.PREFIX || '.'), sessions: hostSessions().map(n => ({ id: sid(n), label: label(n) })) });
    });

    router.get('/api/panel/commands', requirePanelAuth, (req, res) => {
        const seen = new Set(), list = [];
        for (const c of events.commands) {
            if (!c.pattern || c.dontAddCommandList || seen.has(c.pattern)) continue;
            if (HIDDEN_COMMANDS.has(c.pattern) || HIDDEN_CATEGORIES.has(String(c.category).toLowerCase())) continue;
            seen.add(c.pattern);
            list.push({ n: c.pattern, a: (c.alias || []).slice(0, 6), d: String(c.desc || '').slice(0, 120), c: c.category || 'misc', u: String(c.use || '').slice(0, 160), x: DANGEROUS.has(c.pattern) ? 1 : 0 });
        }
        list.sort((a, b) => a.n.localeCompare(b.n));
        res.json({ prefix: String(config.PREFIX || '.'), count: list.length, commands: list });
    });

    router.get('/api/panel/groups', requirePanelAuth, async (req, res) => {
        const number = pickSession(String(req.query.session || ''));
        const conn = number && activeSockets.get(number);
        if (!conn) return res.status(409).json({ error: 'Host session connected nahi hai.' });
        try {
            const all = await Promise.race([
                conn.groupFetchAllParticipating(),
                new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 20000))
            ]);
            const groups = Object.values(all || {}).map(g => ({ id: g.id, name: String(g.subject || g.id).slice(0, 60), size: (g.participants || []).length }))
                .sort((a, b) => a.name.localeCompare(b.name)).slice(0, 400);
            res.json({ groups });
        } catch (e) { res.status(502).json({ error: 'Groups load nahi hue: ' + String(e.message || e).slice(0, 100) }); }
    });

    router.post('/api/panel/run', requirePanelAuth, (req, res) => {
        const body = req.body || {};
        const name = String(body.command || '').trim().toLowerCase().replace(/^[.!#\/]/, '');   // sirf ek prefix character hata do
        if (!/^[a-z0-9_-]{1,40}$/.test(name)) return res.status(400).json({ error: 'Command ka naam sahi nahi.' });
        const found = events.findCommand(name);
        if (!found) return res.status(404).json({ error: `.${name} naam ki koi command nahi.` });
        if (HIDDEN_COMMANDS.has(found.pattern)) return res.status(403).json({ error: 'Yeh command panel se nahi chalti.' });
        if (!runAllowed()) return res.status(429).json({ error: 'Bohat tez — thora ruk kar dobara click karo.' });

        const number = pickSession(String(body.session || ''));
        if (!number) return res.status(409).json({ error: 'Host ka koi session connected nahi. OWNER_NUMBER sahi hai aur wo number bot se connected hai?' });
        const conn = activeSockets.get(number);
        const selfJid = jidNormalizedUser(conn.user.id);

        let chat = String(body.chat || '').trim();
        if (!chat || chat === 'self') chat = selfJid;
        else if (!/^\d{5,20}(-\d+)?@g\.us$/.test(chat) && !/^\d{8,15}@s\.whatsapp\.net$/.test(chat)) return res.status(400).json({ error: 'Chat ID sahi nahi.' });

        const args = String(body.args || '').replace(/\s+/g, ' ').trim().slice(0, 1000);
        const prefix = String(config.PREFIX || '.');
        const id = crypto.randomBytes(8).toString('hex');
        const mek = {
            key: { remoteJid: chat, fromMe: true, id: 'RZPNL' + id.toUpperCase() },
            message: { conversation: `${prefix}${found.pattern}${args ? ' ' + args : ''}` },
            messageTimestamp: Math.floor(Date.now() / 1000),
            pushName: 'Owner Panel',
            status: 1,
            __fromPanel: true            // sirf is server ke andar lagta hai — WhatsApp se aaye message mein ye nahi ho sakta
        };
        captures.set(id, { number, jid: chat, until: Date.now() + 25000, lines: [] });
        if (captures.size > 100) captures.delete(captures.keys().next().value);

        try { conn.ev.emit('messages.upsert', { messages: [mek], type: 'notify' }); }
        catch (e) { captures.delete(id); return res.status(500).json({ error: 'Command bhej nahi saka: ' + String(e.message || e).slice(0, 100) }); }

        res.json({ ok: true, id, command: found.pattern, chat: chat === selfJid ? 'self' : chat });
    });

    router.get('/api/panel/result', requirePanelAuth, (req, res) => {
        const c = captures.get(String(req.query.id || ''));
        if (!c) return res.status(404).json({ error: 'Result nahi mila (purana ho gaya).' });
        res.json({ lines: c.lines.map(l => l.text), done: Date.now() > c.until });
    });
}

module.exports = { requirePanelAuth, captureOutgoing, mount, getToken };
