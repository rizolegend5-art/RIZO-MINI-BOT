// RIZO CODE — .code (AI poora web page likhe) + chat mein screenshot preview (koi link host nahi hota)
//   .code <kya banana hai>      .codeedit <badlaav>      .preview (HTML code / .html file ko reply)
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const axios = require('axios');
const { cmd } = require('../arslan');

const SYSTEM = `You are a world-class senior front-end engineer AND a professional UI/UX designer (think Awwwards / Dribbble level).
Deliver ONE complete, self-contained, production-quality HTML file (inline <style> and <script>) that fully works.

DESIGN RULES
- Modern, premium look: a considered colour palette with CSS variables, great typography (Google Fonts via <link> is allowed, always add system-font fallbacks), generous spacing, consistent radius and shadows.
- Use gradients, glassmorphism or neumorphism where it fits, smooth micro-interactions, hover/focus/active states, subtle animations (CSS only where possible, respect prefers-reduced-motion).
- Mobile-first and fully responsive (flex/grid, clamp(), media queries). Looks perfect at 360px and at 1440px.
- Accessible: semantic HTML, labels, sufficient contrast, keyboard focus styles, aria where needed.
- Use inline SVG or CSS shapes or emoji for icons/illustrations. Never rely on local files or placeholder images that will 404; if a photo is needed use a CSS gradient or inline SVG.
- "3D" or "premium" or "advanced" requests: use real CSS 3D (transform-style:preserve-3d, perspective, 3D transforms/tilt-on-hover, parallax layers) or, when truly justified, Three.js (r128) loaded from cdnjs — never fake it with a flat 2D page and call it 3D.
- Never ship a stripped-down, generic, or "good enough" version. Treat every request as if a paying client will judge it: rich detail, thoughtful empty/loading/error states, real content (not "Lorem ipsum" placeholders — write believable sample text yourself), and interactions that feel alive (hover, scroll-reveal, transitions).

CODE RULES
- Vanilla HTML/CSS/JS unless the request needs a library (3D, charts, animation) — then load an exact pinned version from cdnjs or jsdelivr with a <script> tag, never a bare/unversioned URL.
- All requested features must really work (no TODO, no fake buttons). Handle edge cases and empty states. Keep state in JS variables (no localStorage needed).
- Clean, commented, well-structured code. No console errors.
- If the user writes in Urdu / Roman Urdu keep UI text in the language they used.

OUTPUT: reply with ONLY the full code in a single \`\`\`html block. No explanation before or after.`;

// Known-good Pollinations text-model names change over time, so we try several in order and
// quietly move to the next one on ANY failure (404 = unknown model name, 429/5xx = overloaded).
// The plain GET endpoint at the end has no model restriction at all, so it is the most reliable fallback.
const MODELS = ['openai-large', 'openai', 'mistral', 'llama'];
const LAST = new Map();                           // chat -> { html, prompt }
const cooldown = new Map();
let busy = 0;

function withRetry(fn, tries = 2) {
    return (async () => {
        let err;
        for (let i = 0; i < tries; i++) {
            try { return await fn(); } catch (e) { err = e; if (i < tries - 1) await new Promise(r => setTimeout(r, 1200)); }
        }
        throw err;
    })();
}

// ---------------------------------------------------------------- AI (tries several models/endpoints; never surfaces a raw HTTP error)
async function askModel(messages) {
    const attempts = [];
    for (const model of MODELS) {
        attempts.push({ label: `chat:${model}`, run: () => axios.post(
            'https://text.pollinations.ai/openai',
            { model, messages, temperature: 0.55, private: true },
            { timeout: 150000, headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' } }
        ).then(r => {
            const t = r.data && r.data.choices && r.data.choices[0] && r.data.choices[0].message && r.data.choices[0].message.content;
            if (!t) throw new Error('empty response');
            return String(t);
        }) });
    }
    // last-resort: the plain GET endpoint (no OpenAI-style body, no model name to get wrong)
    const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n').slice(0, 7000);
    attempts.push({ label: 'plain-get', run: () => axios.get(
        `https://text.pollinations.ai/${encodeURIComponent(prompt)}`,
        { timeout: 150000, headers: { 'User-Agent': 'Mozilla/5.0' }, params: { private: true } }
    ).then(r => { const t = typeof r.data === 'string' ? r.data : JSON.stringify(r.data); if (!t) throw new Error('empty response'); return t; }) });

    let lastErr;
    for (const a of attempts) {
        try {
            const text = await withRetry(a.run, 2);
            if (/<html|<!doctype|<body|<div|```/i.test(text)) return text;
            lastErr = new Error('AI ne code jaisa jawab nahi diya');
        } catch (e) {
            lastErr = e;
            console.log(`[code] ${a.label} failed:`, e.message || e);
        }
    }
    const err = new Error('AI service abhi jawab nahi de rahi (thodi der baad try karein)');
    err.cause = lastErr;
    throw err;
}

function extractHtml(text) {
    text = String(text || '');
    let m = /```(?:html|HTML)?\s*\n([\s\S]*?)```/.exec(text);
    let code = m ? m[1] : '';
    if (!code) { const u = /```(?:html|HTML)?\s*\n([\s\S]*)$/.exec(text); if (u) code = u[1]; }          // fence never closed
    if (!code && /<!doctype html|<html[\s>]/i.test(text)) code = text.slice(text.search(/<!doctype html|<html[\s>]/i));
    code = code.trim();
    if (!code || !/</.test(code)) return '';
    if (!/<html[\s>]/i.test(code)) code = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RIZO Code</title></head>\n<body>\n${code}\n</body></html>`;
    return code;
}

// ---------------------------------------------------------------- screenshot (headless Chromium, no hosting)
const chromeBin = () => {
    const c = [process.env.CHROME_PATH, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].filter(Boolean);
    return c.find(p => { try { return fs.existsSync(p); } catch (_) { return false; } }) || null;
};
// page code runs in a throw-away browser: only font/CDN hosts are reachable, everything else (incl. localhost / private IPs) is blocked
const ALLOW = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com'];
function screenshot(html, { width = 1280, height = 860 } = {}) {
    return new Promise((resolve, reject) => {
        const bin = chromeBin();
        if (!bin) return reject(new Error('NO_CHROME'));
        const id = crypto.randomBytes(6).toString('hex');
        const dir = path.join(os.tmpdir(), `code_${id}`);
        fs.mkdirSync(dir, { recursive: true });
        const page = path.join(dir, 'index.html'), png = path.join(dir, 'shot.png');
        fs.writeFileSync(page, html);
        const args = [
            '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--hide-scrollbars', '--mute-audio',
            `--user-data-dir=${path.join(dir, 'profile')}`, `--window-size=${width},${height}`, '--force-device-scale-factor=1',
            '--virtual-time-budget=7000', '--run-all-compositor-stages-before-draw',
            '--proxy-server=http://127.0.0.1:9', `--proxy-bypass-list=<-loopback>;${ALLOW.join(';')}`,
            `--screenshot=${png}`, 'file://' + page
        ];
        execFile(bin, args, { timeout: 45000 }, (err) => {
            let buf = null;
            try { if (fs.existsSync(png)) buf = fs.readFileSync(png); } catch (_) {}
            fs.rm(dir, { recursive: true, force: true }, () => {});
            if (buf && buf.length > 1000) return resolve(buf);
            reject(new Error(err ? 'Screenshot nahi ban saka' : 'Khali screenshot'));
        });
    });
}

// ---------------------------------------------------------------- send result in chat
async function deliver(conn, mek, ctx, html, prompt, mobile) {
    LAST.set(ctx.from, { html, prompt });
    let shot = null, note = '';
    try { shot = await screenshot(html, mobile ? { width: 412, height: 860 } : {}); }
    catch (e) { note = e.message === 'NO_CHROME' ? '\n\n⚠️ Server par browser nahi mila, is liye sirf file bheji hai (Docker se deploy karein).' : `\n\n⚠️ ${e.message}`; }
    if (shot) await conn.sendMessage(ctx.from, { image: shot, caption: `🖥️ *PREVIEW*${mobile ? ' (mobile)' : ''}\n\n✏️ Badlaav: *.codeedit dark theme lagao*\n📎 Poora code neeche file mein hai.` }, { quoted: mek });
    await conn.sendMessage(ctx.from, { document: Buffer.from(html, 'utf8'), mimetype: 'text/html', fileName: 'index.html', caption: `📄 index.html${note}` }, { quoted: mek });
}
const throttled = (ctx) => {
    const k = ctx.sender || ctx.from; const left = 25000 - (Date.now() - (cooldown.get(k) || 0));
    if (left > 0 && !ctx.isOwner) { ctx.reply(`⏳ ${Math.ceil(left / 1000)} second baad dobara try karo.`); return true; }
    if (busy >= 2) { ctx.reply('⏳ Abhi 2 code ban rahe hain, thori der baad try karo.'); return true; }
    cooldown.set(k, Date.now()); return false;
};
const parseMobile = (q) => { const m = /^(mobile|phone|m)\s+/i.exec(q); return m ? { mobile: true, q: q.slice(m[0].length).trim() } : { mobile: false, q }; };
const react = (conn, mek, ctx, e) => conn.sendMessage(ctx.from, { react: { text: e, key: mek.key } }).catch(() => {});

cmd({ pattern: 'code', alias: ['webcode', 'codegen', 'makeweb'], category: 'ai', react: '💻', desc: 'AI pro designer-coder: poora web page + chat mein preview', use: '.code ek sundar calculator banao  |  .code mobile portfolio site', filename: __filename },
async (conn, mek, m, ctx) => {
    const { mobile, q } = parseMobile((ctx.q || '').trim());
    if (!q) return ctx.reply('💻 *AI CODE + PREVIEW*\n\nMisal:\n*.code ek premium calculator banao*\n*.code restaurant ki landing page dark theme mein*\n*.code snake game*\n*.code mobile portfolio website* (phone size preview)\n\nBad mein badalna ho: *.codeedit button laal karo*');
    if (throttled(ctx)) return;
    busy++;
    try {
        react(conn, mek, ctx, '⏳');
        const text = await askModel([{ role: 'system', content: SYSTEM }, { role: 'user', content: q }]);
        const html = extractHtml(text);
        if (!html) return ctx.reply('❌ AI ne sahi code nahi diya. Thora aur saaf likh kar dobara try karo.');
        await deliver(conn, mek, ctx, html, q, mobile);
        react(conn, mek, ctx, '✅');
    } catch (e) { ctx.reply(`❌ ${e.message || 'Code nahi ban saka'}.\nThodi der baad dobara try karein, ya request thodi simple karke likhein.`); }
    finally { busy--; }
});

cmd({ pattern: 'codeedit', alias: ['editcode'], category: 'ai', react: '✏️', desc: 'Pichle code mein badlaav karo + naya preview', use: '.codeedit button laal karo', filename: __filename },
async (conn, mek, m, ctx) => {
    const { mobile, q } = parseMobile((ctx.q || '').trim());
    const last = LAST.get(ctx.from);
    if (!last) return ctx.reply('✏️ Pehle *.code* se kuch banao, phir *.codeedit* se badlo.');
    if (!q) return ctx.reply('✏️ Kya badalna hai? Misal: *.codeedit dark theme lagao*');
    if (throttled(ctx)) return;
    busy++;
    try {
        react(conn, mek, ctx, '⏳');
        const text = await askModel([
            { role: 'system', content: SYSTEM },
            { role: 'user', content: last.prompt },
            { role: 'assistant', content: '```html\n' + last.html.slice(0, 60000) + '\n```' },
            { role: 'user', content: `Change request: ${q}\nKeep everything that already works and the same design quality. Return the FULL updated file.` }
        ]);
        const html = extractHtml(text);
        if (!html) return ctx.reply('❌ AI ne sahi code nahi diya. Dobara try karo.');
        await deliver(conn, mek, ctx, html, `${last.prompt} + ${q}`, mobile);
        react(conn, mek, ctx, '✅');
    } catch (e) { ctx.reply(`❌ ${e.message || 'Badlaav nahi ho saka'}.\nThodi der baad dobara try karein.`); }
    finally { busy--; }
});

cmd({ pattern: 'preview', alias: ['livepreview', 'runhtml'], category: 'ai', react: '👁️', desc: 'Apne HTML code ka preview (image) chat mein dekho', use: '.preview <html code>  ya code wale message / .html file ko reply karo', filename: __filename },
async (conn, mek, m, ctx) => {
    const { mobile, q } = parseMobile((ctx.q || '').trim());
    let src = q || (m.quoted && m.quoted.text) || '';
    if (!src && m.quoted && m.quoted.mtype === 'documentMessage' && m.quoted.download) {
        try { const b = await m.quoted.download(); if (b && b.length < 400 * 1024) src = b.toString('utf8'); } catch (_) {}
    }
    const wrapped = src.includes('<') && !/```/.test(src) && !/<html[\s>]|<!doctype/i.test(src) ? '```html\n' + src + '\n```' : src;
    const html = extractHtml(wrapped);
    if (!html) return ctx.reply('👁️ HTML code likho ya kisi code wale message / .html file ko reply karo.\nMisal: *.preview <h1>Hello</h1>*');
    if (throttled(ctx)) return;
    busy++;
    try { await deliver(conn, mek, ctx, html, 'user page', mobile); } catch (e) { ctx.reply(`❌ ${e.message}`); } finally { busy--; }
});
