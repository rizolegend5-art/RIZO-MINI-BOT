// plugins/rizojagar.js
// RIZOJAGAR — Gangster Edition with hard dialogues
// MUJEEB ✖ RIZO — Enemies vanish from WhatsApp

const { cmd } = require('../arslan');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ═══ FONT STYLES ═══
const G = {
    bold: (t) => t.split('').map(c => {
        const m = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const s = '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵';
        const i = m.indexOf(c);
        return i >= 0 ? s[i] : c;
    }).join(''),

    script: (t) => t.split('').map(c => {
        const m = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        const s = '𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃';
        const i = m.indexOf(c);
        return i >= 0 ? s[i] : c;
    }).join(''),

    double: (t) => t.split('').map(c => {
        const m = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const s = '𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡';
        const i = m.indexOf(c);
        return i >= 0 ? s[i] : c;
    }).join(''),

    small: (t) => t.toLowerCase().split('').map(c => {
        const m = 'abcdefghijklmnopqrstuvwxyz';
        const s = 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘQʀꜱᴛᴜᴠᴡxʏᴢ';
        const i = m.indexOf(c);
        return i >= 0 ? s[i] : c;
    }).join(''),

    circle: (t) => t.split('').map(c => {
        const m = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        const s = 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ';
        const i = m.indexOf(c);
        return i >= 0 ? s[i] : c;
    }).join('')
};

// ═══ GANGSTER SYMBOLS ═══
const SKULL = '☠️';
const FIRE = '🔥';
const BLOOD = '🩸';
const GUN = '🔫';
const CROWN = '👑';
const DAGGER = '🗡️';

const LINE_SKULL = `${SKULL}━━━━━━━━━━━━━━━━━━━━━━━━━━━${SKULL}`;
const LINE_BLOOD = `${BLOOD}•·•·•·•·•·•·•·•·•·•·•·•·•${BLOOD}`;
const LINE_GUN = `${GUN}━━━━━━━━━━━━━━━━━━━━━━━━━━━${GUN}`;

cmd({
    pattern: 'rizojagar',
    alias: ['mujeeb', 'bro', 'bhai', 'mybro', 'gangster', 'haters', 'rizogang'],
    desc: 'Gangster mode — Mujeeb & RIZO vs haters',
    category: 'fun',
    react: '🔫',
    use: '.rizojagar',
    filename: __filename
}, async (conn, mek, m, { from, pushname }) => {
    try {
        // ═══════════════════════════════════════════
        //  IMAGE + INTRO
        // ═══════════════════════════════════════════
        const introMsg = await conn.sendMessage(from, {
            image: { url: 'https://files.catbox.moe/qsauhy.jpg' },
            caption:
`${CROWN} ${G.double('GANGSTER MODE')} ${CROWN}

${G.bold('MUJEEB')}  ✖  ${G.bold('RIZO')}

${G.small('two brothers. one soul. zero mercy.')}`
        }, { quoted: mek });

        await sleep(5000);

        // ═══════════════════════════════════════════
        //  STAGE 1 — OPENING WARNING
        // ═══════════════════════════════════════════
        await conn.sendMessage(from, {
            text:
`${SKULL}━━━━━━━━━━━━━━━━━━━━━━━━━━━${SKULL}

       ${G.double('WARNING')}

${SKULL}━━━━━━━━━━━━━━━━━━━━━━━━━━━${SKULL}

${G.script('Ruk ja...')}
${G.script('Ek baar soch le...')}

${LINE_BLOOD}

${G.italic('Kyunki jo main kehne wala hoon...')}
${G.italic('Woh teri zindagi badal dega...')}

${LINE_BLOOD}

${G.bold('MUJEEB')} ${G.small('aur')} ${G.bold('RIZO')}
${G.small('ke baare mein...')}

${G.italic('Har jagah baat hoti hai...')}
${G.italic('Har jagah naam chalta hai...')}

${LINE_BLOOD}

${G.small('Aur tu...')}
${G.small('Tu sirf ek kissay mein aayega...')}
${G.small('Zameen ke neeche...')}

${SKULL}━━━━━━━━━━━━━━━━━━━━━━━━━━━${SKULL}`,
            edit: introMsg.key
        });

        await sleep(5000);

        // ═══════════════════════════════════════════
        //  STAGE 2 — PANGA WARNING
        // ═══════════════════════════════════════════
        await conn.sendMessage(from, {
            text:
`${GUN}━━━━━━━━━━━━━━━━━━━━━━━━━━━${GUN}

    ${G.double('PANGA NAHI LENE KA')}

${GUN}━━━━━━━━━━━━━━━━━━━━━━━━━━━${GUN}

${G.bold('Suno haters...')}
${G.bold('Suno dushman...')}

${LINE_BLOOD}

${G.script('Agar humse panga liya...')}

${LINE_BLOOD}

${G.bold('Toh WhatsApp ki duniya se...')}
${G.bold('GAYAB HO JAOGE...')}

${LINE_BLOOD}

${G.italic('Na naam rahega...')}
${G.italic('Na nishaan rahega...')}
${G.italic('Na teri chat history rahegi...')}
${G.italic('Na tera account rahega...')}

${LINE_BLOOD}

${G.bold('Sirf yeh yaad rahega...')}

${G.script('"Yeh log the jo')}
${G.script('humse ulajh gaye the..."')}

${LINE_BLOOD}

${G.small('Family ko bolna...')}
${G.small('Tera phone band hone wala hai...')}
${G.small('Hamesha ke liye...')}

${GUN}━━━━━━━━━━━━━━━━━━━━━━━━━━━${GUN}`,
            edit: introMsg.key
        });

        await sleep(5500);

        // ═══════════════════════════════════════════
        //  STAGE 3 — GANGSTER DIALOGUES
        // ═══════════════════════════════════════════
        await conn.sendMessage(from, {
            text:
`${SKULL}━━━━━━━━━━━━━━━━━━━━━━━━━━━${SKULL}

  ${G.double('RIZO GANG DIALOGUES')}

${SKULL}━━━━━━━━━━━━━━━━━━━━━━━━━━━${SKULL}

${FIRE} ${G.bold('"Hum baat nahi karte...')}
${G.bold('Hum faisla karte hain."')}

${LINE_BLOOD}

${DAGGER} ${G.bold('"Jis din hum chup ho jayein...')}
${G.bold('Us din teri maa ko')}
${G.bold('kaala dupatta pehnana."')}

${LINE_BLOOD}

${GUN} ${G.bold('"Humari list mein aane ka')}
${G.bold('matlab... teri list khatam."')}

${LINE_BLOOD}

${SKULL} ${G.bold('"Ek baar humne haath lagaya...')}
${G.bold('Toh teen pusht tak')}
${G.bold('yaad rahega."')}

${LINE_BLOOD}

${CROWN} ${G.bold('"MUJEEB aur RIZO se panga...')}
${G.bold('Bhagwan se panga lene se')}
${G.bold('bhi bura hota hai."')}

${LINE_BLOOD}

${BLOOD} ${G.bold('"Teri maa ko bolna...')}
${G.bold('beta ab WhatsApp pe nahi milega."')}

${SKULL}━━━━━━━━━━━━━━━━━━━━━━━━━━━${SKULL}`,
            edit: introMsg.key
        });

        await sleep(6000);

        // ═══════════════════════════════════════════
        //  STAGE 4 — FINAL BLOW
        // ═══════════════════════════════════════════
        await conn.sendMessage(from, {
            text:
`${SKULL}━━━━━━━━━━━━━━━━━━━━━━━━━━━${SKULL}

${SKULL}━━━━━━━━━━━━━━━━━━━━━━━━━━━${SKULL}

${G.double('FINAL NOTICE')}

${SKULL}━━━━━━━━━━━━━━━━━━━━━━━━━━━${SKULL}

${G.bold('HATERS')} ${G.small('ke liye...')}
${G.bold('DUSHMAN')} ${G.small('ke liye...')}

${LINE_BLOOD}

${G.script('Samajh lo kehna kya chahta hoon...')}

${LINE_BLOOD}

${G.bold('MUJEEB')} ${G.small('ke saamne aaya...')}
${G.italic('Toh teri')} ${G.bold('MAA')} ${G.italic('ka')}
${G.bold('SUHAAG')} ${G.italic('khatam...')}

${LINE_BLOOD}

${G.bold('RIZO')} ${G.small('ke saamne aaya...')}
${G.italic('Toh teri')} ${G.bold('BEHEN')} ${G.italic('ki')}
${G.bold('IZZAT')} ${G.italic('khatam...')}

${LINE_BLOOD}

${G.bold('Aur tu khud...')}

${G.bold('TU TOH')} ${G.double('GAYAB')}

${G.small('Ho jayega WhatsApp ki duniya se...')}
${G.small('Permanent.')}
${G.small('Hamesha ke liye.')}
${G.small('Bina kisi nishaan ke.')}

${LINE_BLOOD}

${G.double('LAST WARNING')}

${LINE_BLOOD}

${G.bold('CHAL BHAAG...')}

${G.small('Warna...')}

${G.double('GAME OVER')}

${SKULL}━━━━━━━━━━━━━━━━━━━━━━━━━━━${SKULL}

${CROWN} ${G.bold('MUJEEB')}  ✖  ${G.bold('RIZO')} ${CROWN}

${G.italic('Family first. Haters gone. Forever.')}

${SKULL}━━━━━━━━━━━━━━━━━━━━━━━━━━━${SKULL}

${BLOOD} ${G.small('© RIZO GANG — The Untouchables')} ${BLOOD}`,
            edit: introMsg.key
        });

        // Final gunfire reactions
        const reactions = ['🔫', '☠️', '🩸', '🔥', '👑', '💀', '🔫', '☠️'];
        for (const r of reactions) {
            await conn.sendMessage(from, {
                react: { text: r, key: mek.key }
            }).catch(() => {});
            await sleep(500);
        }

    } catch (err) {
        console.error('[rizojagar] ERROR:', err.message);
    }
});

// ═══ QUICK GANGSTER VERSION ═══
cmd({
    pattern: 'lovebhai',
    alias: ['bhaiforever', 'dilse', 'jaan', 'ganggang'],
    desc: 'Quick gangster message',
    category: 'fun',
    react: '🔫',
    use: '.lovebhai',
    filename: __filename
}, async (conn, mek, m, { from, pushname }) => {
    const user = pushname || 'Bhai';

    const message =
`${SKULL}━━━━━━━━━━━━━━━━━━━━━━━━━━━${SKULL}

${CROWN} ${G.double('RIZO GANG')} ${CROWN}

${SKULL}━━━━━━━━━━━━━━━━━━━━━━━━━━━${SKULL}

${G.bold('MUJEEB')}  ✖  ${G.bold('RIZO')}

${G.small('do bhai. ek rooh. zero mercy.')}

${LINE_BLOOD}

${G.bold('Haterson sunno...')}

${LINE_BLOOD}

${G.script('"Agar humse panga liya...')}
${G.script('Toh WhatsApp ki duniya se')}
${G.script('GAYAB HO JAOGE..."')}

${LINE_BLOOD}

${G.italic('Na naam rahega...')}
${G.italic('Na nishaan rahega...')}
${G.italic('Na tera account rahega...')}

${LINE_BLOOD}

${G.bold('"Teri maa ko bolna...')}
${G.bold('Beta ab WhatsApp pe nahi milega."')}

${LINE_BLOOD}

${G.double('CHAL BHAAG.')}
${G.double('WARNA.')}
${G.double('GAME OVER.')}

${SKULL}━━━━━━━━━━━━━━━━━━━━━━━━━━━${SKULL}

${CROWN} ${G.script('Family First. Haters Gone. Forever.')} ${CROWN}

${BLOOD} — ${G.bold(user)} ${BLOOD}`;

    return conn.sendMessage(from, { text: message }, { quoted: mek });
});

console.log('[RIZO HELL-MD] RIZOJAGAR gangster loaded 🔫');