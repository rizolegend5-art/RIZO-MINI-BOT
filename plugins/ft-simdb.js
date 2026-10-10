const { cmd } = require('../arslan');
const config = require('../config');
const axios = require('axios');

function cleanNumber(value) {
    let n = String(value || '').replace(/\D/g, '');
    if (n.startsWith('0')) n = `${config.DEFAULT_COUNTRY_CODE}${n.slice(1)}`;
    return n;
}

// ===========================================================
// 🎯 FT-SIMDB API
// ===========================================================
const FT_API = 'https://ft-simdb.ftshehryar10044.workers.dev/ft/api';

async function fetchSimData(number) {
    const cleanNum = cleanNumber(number);
    const res = await axios.get(`${FT_API}?num=${cleanNum}`, {
        timeout: 20000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
        }
    });
    return res.data;
}

// ===========================================================
// 1. FTNUM — Full SIM database lookup
// ===========================================================
cmd({
    pattern: 'ftnum',
    alias: ['simdb', 'ftsim', 'simdatabase2', 'numowner'],
    desc: 'SIM database se number ki info',
    category: 'tools',
    react: '📱',
    use: '.ftnum 923154734548',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const raw = (ctx.q || '').trim();
    if (!raw) {
        return ctx.reply([
            '📱 *FT SIM DATABASE*',
            '',
            'Use: `.ftnum <number>`',
            '',
            'Examples:',
            '• `.ftnum 923154734548`',
            '• `.ftnum 03154734548`',
            '• `.ftnum 3154734548`'
        ].join('\n'));
    }

    const number = cleanNumber(raw);
    if (number.length < 10 || number.length > 13) {
        return ctx.reply('❌ Invalid number. 10-13 digits hone chahiye.');
    }

    await ctx.reply('🔍 *SIM database check kar raha hun…*');

    try {
        const data = await fetchSimData(number);

        // API response handle — different formats support karo
        let info = data;

        // Agar nested hai
        if (data?.data) info = data.data;
        if (data?.result) info = data.result;
        if (data?.response) info = data.response;

        // Check karo data empty hai ya nahi
        if (!info || (typeof info === 'object' && !Object.keys(info).length)) {
            return ctx.reply(
                `❌ *Number nahi mila database me*\n\n` +
                `📞 \`+${number}\`\n\n` +
                `💡 *Possible reasons:*\n` +
                `• Ye number registered nahi hai\n` +
                `• Naya number hai (database me nahi)\n` +
                `• SIM inactive hai\n\n` +
                `📍 *Format try karo:* \`.ftnum 03XXXXXXXXX\``
            );
        }

        // Extract fields — different names handle karo
        const name = info.name || info.owner || info.customer_name || info.full_name || 'N/A';
        const cnic = info.cnic || info.cnic_number || info.id_card || info.nic || 'N/A';
        const network = info.network || info.operator || info.sim_company || info.carrier || 'N/A';
        const address = info.address || info.location || info.permanent_address || 'N/A';
        const activation = info.activation || info.activated || info.sim_activation || 'N/A';
        const province = info.province || info.state || 'N/A';
        const dob = info.dob || info.date_of_birth || 'N/A';

        // Build response
        const lines = [
            '📱 *FT SIM DATABASE RESULT*',
            '',
            '━━━━━━━━━━━━━━━━━',
            '',
            `📞 *Number:* \`+${number}\``,
            `👤 *Name:* ${name}`,
            `🆔 *CNIC:* ${cnic}`,
            `📡 *Network:* ${network}`
        ];

        if (address !== 'N/A') lines.push(`📍 *Address:* ${address}`);
        if (province !== 'N/A') lines.push(`🗺️ *Province:* ${province}`);
        if (activation !== 'N/A') lines.push(`📅 *Activation:* ${activation}`);
        if (dob !== 'N/A') lines.push(`🎂 *DOB:* ${dob}`);

        lines.push('');
        lines.push('━━━━━━━━━━━━━━━━━');
        lines.push('');
        lines.push(`📌 *Powered by ${config.BOT_NAME || 'RIZO-MD'}*`);

        return ctx.reply(lines.join('\n'));

    } catch (e) {
        console.error('ftnum error:', e.message);

        let errorMsg = '❌ *SIM database check fail*';

        if (e.response?.status === 400) {
            errorMsg += '\n\n💡 *Format issue hai.*\n\nTry karo:\n• `.ftnum 03154734548`\n• `.ftnum 923154734548`';
        } else if (e.response?.status === 404) {
            errorMsg += '\n\n💡 Number database me nahi mila.';
        } else if (e.response?.status === 429) {
            errorMsg += '\n\n⏳ *Rate limit* — 1 minute baad try karo.';
        } else if (e.response?.status === 500) {
            errorMsg += '\n\n🔧 API server down hai. Baad me try karo.';
        } else if (e.code === 'ECONNABORTED') {
            errorMsg += '\n\n⏱️ Timeout — API slow hai.';
        } else {
            errorMsg += `\n\n🔧 ${e.message}`;
        }

        return ctx.reply(errorMsg);
    }
});

// ===========================================================
// 2. FTRAW — Raw API response (debugging)
// ===========================================================
cmd({
    pattern: 'ftraw',
    alias: ['simraw', 'ftdebug'],
    desc: 'Raw API response (debug)',
    category: 'owner',
    react: '🔧',
    use: '.ftraw 923154734548',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!ctx.isOwner && !ctx.isCreator) return ctx.reply('⛔ Owner only.');

    const raw = (ctx.q || '').trim();
    if (!raw) return ctx.reply('Use: `.ftraw <number>`');

    const number = cleanNumber(raw);

    try {
        const data = await fetchSimData(number);
        let pretty = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        if (pretty.length > 3500) pretty = pretty.slice(0, 3500) + '\n…';
        return ctx.reply(`🔧 *RAW RESPONSE*\n\n\`\`\`\n${pretty}\n\`\`\``);
    } catch (e) {
        return ctx.reply(`❌ Error:\n\`\`\`\n${e.message}\n\`\`\``);
    }
});