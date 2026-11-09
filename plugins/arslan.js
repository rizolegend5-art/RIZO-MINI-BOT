// RIZO-MD command registry
const commands = [];
const commandMap = new Map();
const aliasMap = new Map();

function normalize(value) {
    return String(value || '').trim().toLowerCase().replace(/^\.+/, '');
}

function cmd(info, func) {
    const data = { ...(info || {}) };
    data.function = func;

    if (!data.pattern && data.cmdname) data.pattern = data.cmdname;
    data.pattern = normalize(data.pattern);
    data.alias = Array.isArray(data.alias)
        ? [...new Set(data.alias.map(normalize).filter(Boolean))]
        : [];
    data.dontAddCommandList = Boolean(data.dontAddCommandList);
    data.desc = data.desc || '';
    data.fromMe = Boolean(data.fromMe);
    data.category = data.category || 'misc';

    // Event-only handlers are allowed, but they are never command matches.
    if (!data.pattern) {
        commands.push(data);
        return data;
    }

    // Keep only the latest handler for a duplicated command. Do not invent
    // filename-suffixed command names: those made internal plugin filenames
    // appear as user-facing commands and bloated the menu.
    const old = commandMap.get(data.pattern);
    if (old) {
        const mergedAliases = [...new Set([...(old.alias || []), ...data.alias])]
            .filter(a => a !== data.pattern);
        for (const [a, c] of aliasMap) if (c === old) aliasMap.delete(a);
        const oldIndex = commands.indexOf(old);
        if (oldIndex !== -1) commands.splice(oldIndex, 1);
        data.alias = mergedAliases;
        commandMap.set(data.pattern, data);
        commands.push(data);
    } else {
        commands.push(data);
        commandMap.set(data.pattern, data);
    }

    for (const alias of data.alias) {
        if (alias === data.pattern) continue;
        aliasMap.set(alias, data);
    }
    return data;
}

function findCommand(name) {
    const key = normalize(name);
    return commandMap.get(key) || aliasMap.get(key) || null;
}

module.exports = { cmd, AddCommand: cmd, Function: cmd, commands, commandMap, aliasMap, findCommand, normalize };
