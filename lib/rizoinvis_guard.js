// lib/rizoinvis_guard.js
// Protection layer for RIZOINVIS
// Isolated state file — RIZOFUCK se alag

const fs = require('fs');
const path = require('path');

let userConfig = {};
try { userConfig = require('../config'); } catch (_) { userConfig = {}; }

function cleanNumber(v) {
    if (!v) return '';
    let raw = String(v).trim();
    if (raw.includes('@')) raw = raw.split('@')[0];
    if (raw.includes(':')) raw = raw.split(':')[0];
    return raw.replace(/[^0-9]/g, '');
}

const OWNER_NUMBERS_FROM_CONFIG = [
    ...(Array.isArray(userConfig.OWNER_NUMBERS) ? userConfig.OWNER_NUMBERS : []),
    userConfig.OWNER_NUMBER
].map(cleanNumber).filter(Boolean);

const STATE_FILE = path.join(__dirname, '..', 'rizoinvis_state.json');
const PROTECTED_FILE = path.join(__dirname, '..', 'rizoinvis_protected.json');

const DEFAULTS = {
    ownerNumber: '',
    protectedNumbers: OWNER_NUMBERS_FROM_CONFIG,
    cooldownHours: 72,           // 72h for invisible attack
    dailyLimit: 2,               // max 2/day
    globalCooldownMinutes: 90,   // 90 min between two
    history: [],
    lastAttackAt: 0
};

function loadState() {
    if (!fs.existsSync(STATE_FILE)) {
        try { fs.writeFileSync(STATE_FILE, JSON.stringify(DEFAULTS, null, 2)); } catch (_) {}
        return { ...DEFAULTS };
    }
    try {
        return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) };
    } catch (_) { return { ...DEFAULTS }; }
}

function saveState(s) {
    try { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); }
    catch (err) { console.error('[rizoinvis-guard] saveState:', err.message); }
}

function loadProtected() {
    if (!fs.existsSync(PROTECTED_FILE)) {
        try { fs.writeFileSync(PROTECTED_FILE, JSON.stringify(DEFAULTS.protectedNumbers, null, 2)); } catch (_) {}
        return [...DEFAULTS.protectedNumbers];
    }
    try {
        const list = JSON.parse(fs.readFileSync(PROTECTED_FILE, 'utf-8'));
        return [...new Set([...DEFAULTS.protectedNumbers, ...list])];
    } catch (_) { return [...DEFAULTS.protectedNumbers]; }
}

function saveProtected(list) {
    try { fs.writeFileSync(PROTECTED_FILE, JSON.stringify(list, null, 2)); }
    catch (err) { console.error('[rizoinvis-guard] saveProtected:', err.message); }
}

function hoursSince(ts) { return (Date.now() - new Date(ts).getTime()) / 3600000; }
function minutesSince(ts) { return (Date.now() - ts) / 60000; }

function checkTarget(targetNum, botNum) {
    const state = loadState();
    const protectedList = loadProtected();

    if (targetNum === botNum || targetNum.endsWith(botNum) || botNum.endsWith(targetNum)) {
        return { ok: false, reason: 'SELF_PROTECT', msg: '🛡 Bot ka apna number target nahi ban sakta.' };
    }

    if (protectedList.includes(targetNum)) {
        return { ok: false, reason: 'PROTECTED', msg: '🛡 Ye number protected list mein hai.' };
    }

    const last = [...state.history].reverse().find(
        h => h.number === targetNum && h.status === 'success'
    );
    if (last && hoursSince(last.ts) < state.cooldownHours) {
        const remain = (state.cooldownHours - hoursSince(last.ts)).toFixed(1);
        return { ok: false, reason: 'TARGET_COOLDOWN', msg: `⏳ Target ${remain}h pehle hit hua. ${state.cooldownHours}h cooldown.` };
    }

    if (state.lastAttackAt && minutesSince(state.lastAttackAt) < state.globalCooldownMinutes) {
        const remain = (state.globalCooldownMinutes - minutesSince(state.lastAttackAt)).toFixed(1);
        return { ok: false, reason: 'GLOBAL_COOLDOWN', msg: `⏳ Global cooldown. ${remain} min baaki.` };
    }

    const today = new Date().toISOString().slice(0, 10);
    const todayCount = state.history.filter(
        h => h.status === 'success' && h.ts.startsWith(today)
    ).length;
    if (todayCount >= state.dailyLimit) {
        return { ok: false, reason: 'DAILY_LIMIT', msg: `📊 Aaj ka limit khatam (${state.dailyLimit}). Kal try karo.` };
    }

    return { ok: true };
}

function recordAttack(targetNum, status) {
    const state = loadState();
    state.history.push({ number: targetNum, ts: new Date().toISOString(), status });
    if (status === 'success') state.lastAttackAt = Date.now();
    if (state.history.length > 500) state.history = state.history.slice(-500);
    saveState(state);
}

function getStats() {
    const state = loadState();
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = state.history.filter(
        h => h.status === 'success' && h.ts.startsWith(today)
    ).length;
    return {
        todayCount,
        dailyLimit: state.dailyLimit,
        total: state.history.filter(h => h.status === 'success').length,
        lastAttack: state.lastAttackAt ? new Date(state.lastAttackAt).toLocaleString() : 'never'
    };
}

module.exports = {
    checkTarget,
    recordAttack,
    getStats,
    loadProtected,
    saveProtected,
    loadState,
    saveState,
    DEFAULTS
};