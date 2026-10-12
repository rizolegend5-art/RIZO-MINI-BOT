const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const {
    normalizeOwnerNumber,
    phoneFromIdentity,
    matchesIdentity,
    isConfiguredOwner
} = require('../lib/identity');
const { normalize, cmd, findCommand, commands, commandMap, aliasMap } = require('../arslan');

const originalModuleLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === 'dotenv') return { config() {} };
    return originalModuleLoad.call(this, request, parent, isMain);
};
const groupConfig = require('../lib/group-config');
Module._load = originalModuleLoad;

test('owner phone normalization supports local, international, and device JIDs', () => {
    assert.equal(normalizeOwnerNumber('0315 4734548'), '923154734548');
    assert.equal(normalizeOwnerNumber('923154734548:12@s.whatsapp.net'), '923154734548');
    assert.equal(phoneFromIdentity('983746281@lid'), '');
});

test('admin matching handles alternate phone JIDs on LID messages', () => {
    assert.equal(matchesIdentity(
        ['983746281@lid', '923154734548@s.whatsapp.net'],
        { id: '983746281@lid', phoneNumber: '923154734548@s.whatsapp.net', admin: 'admin' }
    ), true);
    assert.equal(matchesIdentity(['983746281@lid'], { id: '923154734548@s.whatsapp.net' }), false);
});

test('owner matching uses phone identity, not a numeric LID', () => {
    assert.equal(isConfiguredOwner(['923154734548@s.whatsapp.net'], ['923154734548']), true);
    assert.equal(isConfiguredOwner(['983746281@lid'], ['923154734548']), false);
});

test('group welcome setting persists per group and respects default', () => {
    const file = path.join(__dirname, '..', 'data', 'group-settings.json');
    let oldContent = null;
    try { oldContent = fs.readFileSync(file, 'utf8'); } catch (_) {}
    try {
        const groupJid = 'test-group@g.us';
        assert.equal(groupConfig.getGroupSetting(groupJid, 'WELCOME_ENABLE'), 'true');
        groupConfig.setGroupSetting(groupJid, 'WELCOME_ENABLE', false);
        assert.equal(groupConfig.getGroupSetting(groupJid, 'WELCOME_ENABLE'), false);
        groupConfig.setGroupSetting(groupJid, 'WELCOME_ENABLE', true);
        assert.equal(groupConfig.getGroupSetting(groupJid, 'WELCOME_ENABLE'), true);
    } finally {
        if (oldContent === null) fs.rmSync(file, { force: true });
        else fs.writeFileSync(file, oldContent);
    }
});

test('command registry normalizes prefix punctuation and alias lookup', () => {
    assert.equal(normalize('.WeLcOmE'), 'welcome');
    const marker = `test-${Date.now()}`;
    const alias = `${marker}-alias`;
    const registered = cmd({ pattern: `.${marker}`, alias: [alias] }, async () => {});
    assert.equal(findCommand(marker), registered);
    assert.equal(findCommand(alias), registered);
    commands.splice(commands.indexOf(registered), 1);
    commandMap.delete(marker);
    aliasMap.delete(alias);
});
        
