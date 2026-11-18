// RIZO CODE — .code (AI web page/app likhe + live preview link), .codeedit (badlaav), .preview (kisi bhi HTML ka live link)
const axios = require('axios');
const previews = require('../lib/previews');
const { cmd } = require('../arslan');

const BASE = () => String(process.env.SITE_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '') || 'https://rizo-mini-bot-production-f3d7.up.railway.app').replace(/\/+$/, '');
const SYSTEM = [
    'You are an expert front-end developer.',
    'Write ONE complete, self-contained HTML file (inline <style> and <script>, no build step, no external images; CDN libraries only if truly needed).',
    'Make it responsive, modern, good-looking and fully working on mobile.',
    'Reply with ONLY the code inside a single ```html code block. No explanation.'
].join(' ');

const LAST = new Map();            // chat -> { html, prompt }
const cooldown = new Map();

async function askModel(messages) {
    try {
        const r = await axios.post('https://text.pollinations.ai/openai', { model: 'openai', messages, temperature: 0.4 }, { timeout: 120000, headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' } });
        const t = r.data && r.data.choices && r.data.choices[0] && r.data.choices[0].message && r.data.choices[0].message.content;
        if (t) return String(t);
    } catch (_) { /* fall back to the plain GET endpoint */ }
    const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n').slice(0, 6000);
    const r = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai`, { timeout: 120000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    return typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
}
function extractHtml(text) {
    text = String(text || '');
    let m = /```(?:html|HTML)?\s*\n([\s\S]*?)```/.exec(text);
    let code = m ? m[1] : (/<!doctype html|<html[\s>]/i.test(text) ? text.slice(text.search(/<!doctype html|<html[\s>]/i)) : '');
    if (!code && m === null && /```(?:html)?\s*\n([\s\S]*)$/.test(text)) code = /```(?:html)?\s*\n([\s\S]*)$/.exec(text)[1];   // unclosed fence
    code = code.trim();
    if (!code) return '';
    if (!/<html[\s>]/i.test(code)) code = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RIZO Code</title></head>\n<body>\n${code}\n</body></html>`;
    return code;
}
async function publish(conn, mek, ctx, html, prompt) {
    const id = previews.save(html, prompt.slice(0, 60));
    LAST.set(ctx.from, { html, prompt });
    const url = `${BASE()}/preview/${id}`;
    await ctx.reply(`✅ *Code tayyar!*\n\n🔗 *Live preview:*\n${url}\n\n⏳ Link 24 ghante chalega.\n✏️ Badlaav: *.codeedit dark theme lagao*\n📎 Neeche poori file bhi hai.`);
    await conn.sendMessage(ctx.from, { document: Buffer.from(html, 'utf8'), mimetype: 'text/html', fileName: 'index.html', caption: '📄 index.html' }, { quoted: mek });
}
const throttled = (ctx) => {
    const k = ctx.sender || ctx.from; const left = 20000 - (Date.now() - (cooldown.get(k) || 0));
    if (left > 0 && !ctx.isOwner) { ctx.reply(`⏳ ${Math.ceil(left / 1000)} second baad dobara try karo.`); return true; }
    cooldown.set(k, Date.now()); return false;
};

cmd({ pattern: 'code', alias: ['webcode', 'codegen', 'makeweb'], category: 'ai', react: '💻', desc: 'AI se web page/app ka code likhwao + live preview', use: '.code ek calculator banao', filename: __filename },
async (conn, mek, m, ctx) => {
    const q = (ctx.q || '').trim();
    if (!q) return ctx.reply('💻 *AI CODE + LIVE PREVIEW*\n\nMisal:\n*.code ek sundar calculator banao*\n*.code portfolio website dark theme mein*\n*.code snake game*\n\nBad mein badalna ho to: *.codeedit button ka rang laal karo*');
    if (throttled(ctx)) return;
    try {
        await conn.sendMessage(ctx.from, { react: { text: '⏳', key: mek.key } }).catch(() => {});
        const text = await askModel([{ role: 'system', content: SYSTEM }, { role: 'user', content: q }]);
        const html = extractHtml(text);
        if (!html) return ctx.reply('❌ AI ne sahi code nahi diya. Thora aur saaf likh kar dobara try karo.');
        await publish(conn, mek, ctx, html, q);
        conn.sendMessage(ctx.from, { react: { text: '✅', key: mek.key } }).catch(() => {});
    } catch (e) { ctx.reply(`❌ Code nahi ban saka: ${e.message}`); }
});

cmd({ pattern: 'codeedit', alias: ['editcode'], category: 'ai', react: '✏️', desc: 'Pichle code mein badlaav karo + naya live preview', use: '.codeedit button laal karo', filename: __filename },
async (conn, mek, m, ctx) => {
    const q = (ctx.q || '').trim();
    const last = LAST.get(ctx.from);
    if (!last) return ctx.reply('✏️ Pehle *.code* se kuch banao, phir *.codeedit* se badlo.');
    if (!q) return ctx.reply('✏️ Kya badalna hai? Misal: *.codeedit dark theme lagao*');
    if (throttled(ctx)) return;
    try {
        await conn.sendMessage(ctx.from, { react: { text: '⏳', key: mek.key } }).catch(() => {});
        const text = await askModel([
            { role: 'system', content: SYSTEM },
            { role: 'user', content: last.prompt },
            { role: 'assistant', content: '```html\n' + last.html.slice(0, 60000) + '\n```' },
            { role: 'user', content: `Change request: ${q}\nReturn the full updated file.` }
        ]);
        const html = extractHtml(text);
        if (!html) return ctx.reply('❌ AI ne sahi code nahi diya. Dobara try karo.');
        await publish(conn, mek, ctx, html, `${last.prompt} + ${q}`);
        conn.sendMessage(ctx.from, { react: { text: '✅', key: mek.key } }).catch(() => {});
    } catch (e) { ctx.reply(`❌ Badlaav nahi ho saka: ${e.message}`); }
});

cmd({ pattern: 'preview', alias: ['livepreview', 'runhtml'], category: 'ai', react: '👁️', desc: 'Apne HTML code ka live preview link', use: '.preview <html code>  ya code wale message ko reply karo', filename: __filename },
async (conn, mek, m, ctx) => {
    let src = (ctx.q || '').trim() || (m.quoted && m.quoted.text) || '';
    if (!src && m.quoted && m.quoted.mtype === 'documentMessage' && m.quoted.download) {
        try { const b = await m.quoted.download(); if (b && b.length < 400 * 1024) src = b.toString('utf8'); } catch (_) {}
    }
    const html = extractHtml(src.includes('<') && !/```/.test(src) && !/<html[\s>]|<!doctype/i.test(src) ? '```html\n' + src + '\n```' : src);
    if (!html) return ctx.reply('👁️ HTML code likho ya kisi code wale message / .html file ko reply karo.\nMisal: *.preview <h1>Hello</h1>*');
    try {
        const id = previews.save(html, 'manual');
        LAST.set(ctx.from, { html, prompt: 'user page' });
        await ctx.reply(`👁️ *Live preview tayyar!*\n\n🔗 ${BASE()}/preview/${id}\n\n⏳ Link 24 ghante chalega.`);
    } catch (e) { ctx.reply(`❌ ${e.message}`); }
});
