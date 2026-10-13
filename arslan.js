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

    // Keep the latest handler as the canonical command (preserves prior behavior),
    // but expose the displaced handler under a unique filename-suffixed command.
    // Previously duplicate patterns silently removed earlier handlers from the menu
    // and made those implementations impossible to invoke.
    const old = commandMap.get(data.pattern);
    if (old) {
        const mergedAliases = [...new Set([...(old.alias || []), ...data.alias])]
            .filter(a => a !== data.pattern);

        const sourceName = String(old.filename || 'legacy')
            .split(/[\/]/).pop().replace(/\.js$/i, '')
            .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'legacy';
        let legacyPattern = `${data.pattern}_${sourceName}`;
        let suffix = 2;
        while (commandMap.has(legacyPattern) || legacyPattern === data.pattern) {
            legacyPattern = `${data.pattern}_${sourceName}_${suffix++}`;
        }
        for (const [a, c] of aliasMap) if (c === old) aliasMap.delete(a);
        commandMap.delete(data.pattern);
        old.pattern = legacyPattern;
        old.alias = [];
        old.dontAddCommandList = false;
        commandMap.set(legacyPattern, old);

        data.alias = mergedAliases;
        commands.push(data);
        commandMap.set(data.pattern, data);
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
