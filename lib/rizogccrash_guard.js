// lib/rizogccrash_guard.js
const fs = require('fs');
const path = require('path');

let userConfig = {};
try { userConfig = require('../config'); } catch (_) { userConfig = {}; }

function clean(v) {
    if (!v) return '';
    let r = String(v).trim();
    if (r.includes('@')) r = r.split('@')[0];
    if (r.includes(':')) r = r.split(':')[0];
    return r.replace(/[^0-9]/g, '');
}

const OWNERS = [
    ...(Array.isArray(userConfig.OWNER_NUMBERS) ? userConfig.OWNER_NUMBERS : []),
    userConfig.OWNER_NUMBER
].map(clean).filter(Boolean);

const STATE_FILE = path.join(__dirname, '..', 'rizogccrash_state.json');
const PROT_FILE = path.join(__dirname, '..', 'rizogccrash_protected.json');

const DEFAULTS = {
    protectedGroups: [],
    cooldownHours: 168,           // 7 din per group
    dailyLimit: 1,                // 1 group per day
    globalCooldownMinutes: 180,   // 3 hours
    history: [],
    lastAttackAt: 0
};

function loadState() {
    if (!fs.existsSync(STATE_FILE)) {
        try { fs.writeFileSync(STATE_FILE, JSON.stringify(DEFAULTS, null, 2)); } catch (_) {}
        return { ...DEFAULTS };
    }
    try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) }; }
    catch (_) { return { ...DEFAULTS }; }
}

function saveState(s) {
    try { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); } catch (_) {}
}

function loadProtected() {
    if (!fs.existsSync(PROT_FILE)) {
        try { fs.writeFileSync(PROT_FILE, JSON.stringify([], null, 2)); } catch (_) {}
        return [];
    }
    try { return JSON.parse(fs.readFileSync(PROT_FILE, 'utf-8')); }
    catch (_) { return []; }
}

function saveProtected(l) {
    try { fs.writeFileSync(PROT_FILE, JSON.stringify(l, null, 2)); } catch (_) {}
}

function hoursSince(ts) { return (Date.now() - new Date(ts).getTime()) / 3600000; }
function minsSince(ts) { return (Date.now() - ts) / 60000; }

function checkTarget(groupJid) {
    const state = loadState();
    const prot = loadProtected();

    if (prot.includes(groupJid)) {
        return { ok: false, reason: 'PROTECTED', msg: '🛡 Ye group protected list mein hai.' };
    }

    const last = [...state.history].reverse().find(
        h => h.target === groupJid && h.status === 'success'
    );
    if (last && hoursSince(last.ts) < state.cooldownHours) {
        const r = (state.cooldownHours - hoursSince(last.ts)).toFixed(1);
        return { ok: false, reason: 'GROUP_COOLDOWN', msg: `⏳ Group ${r}h pehle hit hua. ${state.cooldownHours}h cooldown.` };
    }

    if (state.lastAttackAt && minsSince(state.lastAttackAt) < state.globalCooldownMinutes) {
        const r = (state.globalCooldownMinutes - minsSince(state.lastAttackAt)).toFixed(1);
        return { ok: false, reason: 'GLOBAL_COOLDOWN', msg: `⏳ Global cooldown. ${r} min baaki.` };
    }

    const today = new Date().toISOString().slice(0, 10);
    const t = state.history.filter(h => h.status === 'success' && h.ts.startsWith(today)).length;
    if (t >= state.dailyLimit) {
        return { ok: false, reason: 'DAILY_LIMIT', msg: `📊 Aaj ka limit khatam (${state.dailyLimit}).` };
    }

    return { ok: true };
}

function recordAttack(target, status) {
    const s = loadState();
    s.history.push({ target, ts: new Date().toISOString(), status });
    if (status === 'success') s.lastAttackAt = Date.now();
    if (s.history.length > 500) s.history = s.history.slice(-500);
    saveState(s);
}

function getStats() {
    const s = loadState();
    const today = new Date().toISOString().slice(0, 10);
    const t = s.history.filter(h => h.status === 'success' && h.ts.startsWith(today)).length;
    return {
        todayCount: t,
        dailyLimit: s.dailyLimit,
        total: s.history.filter(h => h.status === 'success').length,
        lastAttack: s.lastAttackAt ? new Date(s.lastAttackAt).toLocaleString() : 'never'
    };
}

module.exports = {
    checkTarget, recordAttack, getStats,
    loadProtected, saveProtected,
    loadState, saveState
};