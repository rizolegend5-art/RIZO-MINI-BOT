const { cmd } = require('../arslan');
const { updateUserConfigInMongoDB } = require('../lib/database');
const { getGroupSetting, setGroupSetting } = require('../lib/group-config');

const USER_CONFIG_KEYS = new Set([
    'AUTO_RECORDING', 'AUTO_TYPING', 'ANTI_CALL', 'REJECT_MSG',
    'READ_MESSAGE', 'AUTO_VIEW_STATUS', 'AUTO_LIKE_STATUS',
    'AUTO_STATUS_REPLY', 'AUTO_STATUS_MSG', 'AUTO_LIKE_EMOJI',
    'ANTI_STATUS'
]);

// Session preferences live under the connected bot number, not in the shared
// process config. Global settings remain runtime-only unless set in config/env.
const updateConfig = async (key, value, botNumber, config, reply, userConfig) => {
    try {
        if (!USER_CONFIG_KEYS.has(key)) {
            config[key] = value;
            if (typeof config.persistRuntimeSetting === 'function') config.persistRuntimeSetting(key, value);
            return reply(`✅ *${key}* saved: *${value}*`);
        }
        if (!userConfig) throw new Error('Session settings are not available.');
        const newConfig = { ...userConfig, [key]: value };
        const saved = await updateUserConfigInMongoDB(String(botNumber || ''), newConfig);
        if (!saved) throw new Error('Database update returned false');
        Object.assign(userConfig, newConfig);
        return reply(`✅ *${key}* has been updated to: *${value}*`);
    } catch (e) {
        console.error(e);
        return reply("❌ Setting save nahi hui. Database connection ya writable data folder check karo.");
    }
};

// ============================================================
// 1. PRESENCE MANAGEMENT (Recording / Typing)
// ============================================================

cmd({
    pattern: "autorecording",
    alias: ["autorec", "arecording"],
    desc: "Enable/Disable auto recording simulation",
    category: "settings",
    react: "👑"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config, userConfig }) => {
    if (!isOwner) return reply("*YEH COMMAND SIRF MERE LIE HAI 😎*");
    const value = args[0]?.toLowerCase();
    
    if (value === 'on' || value === 'true') {
        await updateConfig('AUTO_RECORDING', 'true', botNumber, config, reply, userConfig);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('AUTO_RECORDING', 'false', botNumber, config, reply, userConfig);
    } else {
        reply(`*ABHI :❯ ${userConfig?.AUTO_RECORDING || 'false'} HAI 😊*\n\n*AUTO RECORDING ON KARNE K LIE LIKHO ☺️*\n*👑 ❮AUTORECORDING ON❯ 👑*\n*AUTORECORDING OFF KARNE K LIE LIKHO ☺️*\n*👑 ❮AUTORECORDING OFF❯ 👑*`);
    }
});

cmd({
    pattern: "autotyping",
    alias: ["autotype", "atyping"],
    desc: "Enable/Disable auto typing simulation",
    category: "settings",
    react: "👑"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config, userConfig }) => {
    if (!isOwner) return reply("*YEH COMMAND SIRF MERE LIE HAI 😎*");
    const value = args[0]?.toLowerCase();
    
    if (value === 'on' || value === 'true') {
        await updateConfig('AUTO_TYPING', 'true', botNumber, config, reply, userConfig);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('AUTO_TYPING', 'false', botNumber, config, reply, userConfig);
    } else {
        reply(`*ABHI :❯ ${userConfig?.AUTO_TYPING || 'false'} HAI 😊*\n\n*AUTO TYPING ON KARNE K LIE LIKHO ☺️*\n*👑 ❮AUTOTYPING ON❯ 👑*\n*AUTOTYPING OFF KARNE K LIE LIKHO ☺️*\n*👑 ❮AUTOTYPING OFF❯ 👑*`);
    }
});

// ============================================================
// 2. CALL MANAGEMENT (Anti-Call)
// ============================================================

cmd({
    pattern: "anticall",
    alias: "acall",
    desc: "Auto reject calls",
    category: "settings",
    react: "👑"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config, userConfig }) => {
    if (!isOwner) return reply("*YEH COMMAND SIRF MERE LIE HAI ☺️*");
    const value = args[0]?.toLowerCase();
    
    if (value === 'on' || value === 'true') {
        await updateConfig('ANTI_CALL', 'true', botNumber, config, reply, userConfig);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('ANTI_CALL', 'false', botNumber, config, reply, userConfig);
    } else {
        reply(`*ABHI :❯ ${userConfig?.ANTI_CALL || 'false'} HAI 😊*\n\n*JO BHI CALL KARE GA KHUD HI REJECT HO JAYE GE 😃 YE SETTING ON KARNE K LIE LIKHO ☺️*\n*👑 ❮ANTICALL ON❯ 👑*\n*ANTICALL OFF KARNE K LIE LIKHO ☺️*\n*👑 ❮ANTICALL OFF❯ 👑*`);
    }
});

// ============================================================
// 3. GROUP MANAGEMENT (Welcome / Goodbye)
// ============================================================

cmd({
    pattern: "welcome",
    desc: "Enable/Disable welcome messages",
    category: "settings",
    react: "👑"
},
async(conn, mek, m, { args, isOwner, isAdmins, isGroup, from, reply }) => {
    if (!isGroup) return reply('❌ `.welcome` can only be used in a group.');
    if (!isOwner && !isAdmins) return reply('❌ Only a group admin can change welcome settings.');
    const value = args[0]?.toLowerCase();
    const current = getGroupSetting(from, 'WELCOME_ENABLE');
    if (value === 'on' || value === 'true') {
        try { setGroupSetting(from, 'WELCOME_ENABLE', true); return reply('✅ Welcome messages are ON for this group.'); }
        catch (e) { return reply(`❌ ${e.message}`); }
    } else if (value === 'off' || value === 'false') {
        try { setGroupSetting(from, 'WELCOME_ENABLE', false); return reply('✅ Welcome messages are OFF for this group.'); }
        catch (e) { return reply(`❌ ${e.message}`); }
    } else {
        return reply(`Welcome is currently *${current === true || current === 'true' ? 'ON' : 'OFF'}* for this group.\nUse \`.welcome on\` or \`.welcome off\`.`);
    }
});

cmd({
    pattern: "goodbye",
    desc: "Enable/Disable goodbye messages",
    category: "settings",
    react: "👑"
},
async(conn, mek, m, { args, isOwner, isAdmins, isGroup, from, reply }) => {
    if (!isGroup) return reply('❌ `.goodbye` can only be used in a group.');
    if (!isOwner && !isAdmins) return reply('❌ Only a group admin can change goodbye settings.');
    const value = args[0]?.toLowerCase();
    const current = getGroupSetting(from, 'GOODBYE_ENABLE');
    if (value === 'on' || value === 'true') {
        try { setGroupSetting(from, 'GOODBYE_ENABLE', true); return reply('✅ Goodbye messages are ON for this group.'); }
        catch (e) { return reply(`❌ ${e.message}`); }
    } else if (value === 'off' || value === 'false') {
        try { setGroupSetting(from, 'GOODBYE_ENABLE', false); return reply('✅ Goodbye messages are OFF for this group.'); }
        catch (e) { return reply(`❌ ${e.message}`); }
    } else {
        return reply(`Goodbye messages are currently *${current === true || current === 'true' ? 'ON' : 'OFF'}* for this group.\nUse \`.goodbye on\` or \`.goodbye off\`.`);
    }
});

// ============================================================
// 4. READ & STATUS MANAGEMENT
// ============================================================

cmd({
    pattern: "autoread",
    desc: "Enable/Disable auto read messages (Blue Tick)",
    category: "settings",
    react: "👀"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config, userConfig }) => {
    if (!isOwner) return reply("*YEH COMMAND SIRF MERE LIE HAI 😎*");
    const value = args[0]?.toLowerCase();
    
    if (value === 'on' || value === 'true') {
        await updateConfig('READ_MESSAGE', 'true', botNumber, config, reply, userConfig);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('READ_MESSAGE', 'false', botNumber, config, reply, userConfig);
    } else {
        reply(`*ABHI ${userConfig?.READ_MESSAGE || 'false'} HAI 😊*\n*JO BHI MSG KARE GA USKA MSG KHUD HI SEEN `);
    }
});

cmd({
    pattern: "autoviewstatus",
    alias: ["autoviewsview", "autostatusview", "statusview", "avs", "statusseen", "astatus"],
    desc: "Auto view status updates",
    category: "settings",
    react: "😎"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config, userConfig }) => {
    if (!isOwner) return reply("*YEH COMMAND SIRF MERE LIE HAI 😎*");
    const value = args[0]?.toLowerCase();
    
    if (value === 'on' || value === 'true') {
        await updateConfig('AUTO_VIEW_STATUS', 'true', botNumber, config, reply, userConfig);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('AUTO_VIEW_STATUS', 'false', botNumber, config, reply, userConfig);
    } else {
        reply(`*ABHI ${userConfig?.AUTO_VIEW_STATUS || 'false'} HAI 😊*\n\n*JO BHI STATUS LAGAYE GA KHUD HI SEEN HO JAYE GA 😃 YEH SETTING ON KARNE K LIE LIKHO ☺️*\n*👑 ❮AUTOSTATUSVIEW ON❯ 👑*\n*OFF KARNE KE LIE LIKHO ☺️*\n*👑 ❮AUTOSTATUSVIEW OFF❯ 👑*`);
    }
});

cmd({
    pattern: "autolikestatus",
    alias: ["als"],
    desc: "Auto like status updates",
    category: "settings",
    react: "❤️"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config, userConfig }) => {
    if (!isOwner) return reply("🚫 Owner only!");
    const value = args[0]?.toLowerCase();
    
    if (value === 'on' || value === 'true') {
        await updateConfig('AUTO_LIKE_STATUS', 'true', botNumber, config, reply, userConfig);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('AUTO_LIKE_STATUS', 'false', botNumber, config, reply, userConfig);
    } else {
        reply(`Current Status: ${userConfig?.AUTO_LIKE_STATUS || 'false'}\nUsage: .autolikestatus on/off`);
    }
});

cmd({
    pattern: "autostatusreply",
    alias: ["statusreply", "asreply"],
    desc: "Enable or disable automatic status replies",
    category: "settings",
    react: "💬"
}, async (conn, mek, m, { args, isOwner, reply, botNumber, config, userConfig }) => {
    if (!isOwner) return reply("🚫 Owner only!");
    const value = String(args[0] || '').toLowerCase();
    if (!['on', 'off', 'true', 'false'].includes(value)) {
        return reply(`Auto status reply is *${userConfig?.AUTO_STATUS_REPLY || 'false'}*.\nUse: \`${config.PREFIX}autostatusreply on|off\``);
    }
    return updateConfig('AUTO_STATUS_REPLY', ['on', 'true'].includes(value) ? 'true' : 'false', botNumber, config, reply, userConfig);
});

cmd({
    pattern: "antistatus",
    alias: ["statusprivacy", "nostatusview"],
    desc: "Block automatic viewing, reactions, and replies to statuses",
    category: "settings",
    react: "🛡️"
}, async (conn, mek, m, { args, isOwner, reply, botNumber, config, userConfig }) => {
    if (!isOwner) return reply("🚫 Owner only!");
    const value = String(args[0] || '').toLowerCase();
    if (!['on', 'off', 'true', 'false'].includes(value)) {
        return reply(`Anti-status is *${userConfig?.ANTI_STATUS || 'false'}*.\nON blocks auto-view/like/reply; OFF restores your individual settings.`);
    }
    const enabled = ['on', 'true'].includes(value) ? 'true' : 'false';
    return updateConfig('ANTI_STATUS', enabled, botNumber, config, reply, userConfig);
});

// ============================================================
// 5. SYSTEM (Mode & Prefix)
// ============================================================

cmd({
    pattern: "mode",
    desc: "Change bot mode (public/private/groups/inbox)",
    category: "settings",
    react: "⚙️"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config, userConfig }) => {
    if (!isOwner) return reply("*YEH COMMAND SIRF MERE LIE HAI 😎*");
    const mode = args[0]?.toLowerCase();
    const validModes = ['public', 'private', 'groups', 'inbox'];

    if (validModes.includes(mode)) {
        await updateConfig('WORK_TYPE', mode, botNumber, config, reply, userConfig);
    } else {
        reply(`*GHALAT LIKHA HAI 🥺*\n*ESE LIKHO ☺️*COMMAND ❮MODE❯ LIKH KER IN ME SE KOI EK WORD LIKHO JAHA AP CHAHTE HO K BOT WORK KRE 🤗*\n ${validModes.join(', ')}\nCurrent: ${config.WORK_TYPE}`);
    }
});

cmd({
    pattern: "setprefix",
    desc: "Change bot prefix",
    category: "settings",
    react: "👑"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config, userConfig }) => {
    if (!isOwner) return reply("*YEH COMMAND SIRF MERE LIE HAI 😎*");
    const newPrefix = args[0];

    if (newPrefix) {
        // Ensure prefix is short (single character or short string)
        if (newPrefix.length > 1 && newPrefix !== 'noprefix') return reply("❌ Prefix must be short (e.g. . or ! or #)");
        
        await updateConfig('PREFIX', newPrefix, botNumber, config, reply, userConfig);
    } else {
        reply(`*ABHI PREFIX ❮ ${config.PREFIX} ❯ HAI ☺️*\nJIS BHI NISHAN AP BOT CHALANA CHAHTE HAI WO NISHAN SET KERE ESE 😊*\n*❮SETPREFIX . ! + _ -❯*\n*JO BHI APKA DIL KARE 😍❣️*`);
    }
});
