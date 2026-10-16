const mongoose = require('mongoose');
const config = require('../config');

// ===========================================================
// CONNECTDB
// ===========================================================
const connectdb = async () => {
    try {
        if (!config.MONGODB_URI || config.MONGODB_URI.includes('username:password')) {
            console.error("❌ MONGODB_URI config.js me set nahi hai!");
            return;
        }
        mongoose.set('strictQuery', false);
        await mongoose.connect(config.MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 60000,
            bufferCommands: false,
            connectTimeoutMS: 30000
        });
        console.log("✅ Database Connected Successfully");

        mongoose.connection.on('error', (err) => console.error('❌ MongoDB error:', err.message));
        mongoose.connection.on('disconnected', () => console.warn('⚠️ MongoDB disconnected'));
        mongoose.connection.on('reconnected', () => console.log('✅ MongoDB reconnected'));
    } catch (e) {
        console.error("❌ Database Connection Failed:", e.message);
    }
};

// ===========================================================
// SCHEMAS
// ===========================================================
const sessionSchema = new mongoose.Schema({
    number: { type: String, required: true, unique: true, index: true },
    credentials: { type: Object, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const userConfigSchema = new mongoose.Schema({
    number: { type: String, required: true, unique: true, index: true },
    config: {
        AUTO_RECORDING: { type: String, default: 'false' },
        AUTO_TYPING: { type: String, default: 'false' },
        ANTI_CALL: { type: String, default: 'false' },
        REJECT_MSG: { type: String, default: '*🔕 ʏᴏᴜʀ ᴄᴀʟʟ ᴡᴀs ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀʟʟʏ ʀᴇᴊᴇᴄᴛᴇᴅ..!*' },
        READ_MESSAGE: { type: String, default: 'false' },
        AUTO_VIEW_STATUS: { type: String, default: 'false' },
        AUTO_LIKE_STATUS: { type: String, default: 'false' },
        AUTO_STATUS_REPLY: { type: String, default: 'false' },
        AUTO_STATUS_MSG: { type: String, default: 'Hello from popkid' },
        AUTO_LIKE_EMOJI: { type: Array, default: ['❤️', '👍', '😮', '😎'] }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const otpSchema = new mongoose.Schema({
    number: { type: String, required: true, index: true },
    otp: { type: String, required: true },
    config: { type: Object, required: true },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 5 * 60000), index: { expires: '5m' } },
    createdAt: { type: Date, default: Date.now }
});

const activeNumberSchema = new mongoose.Schema({
    number: { type: String, required: true, unique: true, index: true },
    lastConnected: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
});

const statsSchema = new mongoose.Schema({
    number: { type: String, required: true },
    date: { type: String, required: true },
    commandsUsed: { type: Number, default: 0 },
    messagesReceived: { type: Number, default: 0 },
    messagesSent: { type: Number, default: 0 },
    groupsInteracted: { type: Number, default: 0 }
});

// Premium promo codes grant a fixed number of access days.
const promoCodeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, index: true },
    maxUses: { type: Number, default: 3 },
    usedBy: [{ type: String }],
    usedCount: { type: Number, default: 0 },
    premiumDays: { type: Number, default: 30 },
    createdBy: { type: String, required: true },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const promoPremiumSchema = new mongoose.Schema({
    number: { type: String, required: true, unique: true, index: true },
    code: { type: String, required: true },
    unlockedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
});

// ===========================================================
// MODELS
// ===========================================================
const Session = mongoose.model('Session', sessionSchema);
const UserConfig = mongoose.model('UserConfig', userConfigSchema);
const OTP = mongoose.model('OTP', otpSchema);
const ActiveNumber = mongoose.model('ActiveNumber', activeNumberSchema);
const Stats = mongoose.model('Stats', statsSchema);
const PromoCode = mongoose.model('PromoCode', promoCodeSchema);
const PromoPremium = mongoose.model('PromoPremium', promoPremiumSchema);

// ===========================================================
// STATS QUEUE
// ===========================================================
const pendingStats = new Map();
let statsFlushTimer = null;

function scheduleStatsFlush() {
    if (statsFlushTimer) return;
    statsFlushTimer = setTimeout(() => {
        statsFlushTimer = null;
        flushStats().catch(e => console.error('Stats flush error:', e.message));
    }, 2000);
    if (statsFlushTimer.unref) statsFlushTimer.unref();
}

function cleanNumber(number) {
    let value = String(number || '').replace(/\D/g, '');
    if (value.startsWith('0')) value = `${config.DEFAULT_COUNTRY_CODE}${value.slice(1)}`;
    return value;
}

// ===========================================================
// SESSION
// ===========================================================
async function saveSessionToMongoDB(number, credentials) {
    try {
        const sanitized = number.replace(/[^0-9]/g, '');
        await Session.findOneAndUpdate(
            { number: sanitized },
            { credentials, updatedAt: new Date() },
            { upsert: true, new: true }
        );
        return true;
    } catch (e) { console.error('saveSession error:', e.message); return false; }
}

async function getSessionFromMongoDB(number) {
    try {
        const sanitized = number.replace(/[^0-9]/g, '');
        const session = await Session.findOne({ number: sanitized });
        return session ? session.credentials : null;
    } catch (e) { console.error('getSession error:', e.message); return null; }
}

async function deleteSessionFromMongoDB(number) {
    try {
        const sanitized = number.replace(/[^0-9]/g, '');
        await Session.deleteOne({ number: sanitized });
        await ActiveNumber.deleteOne({ number: sanitized });
        return true;
    } catch (e) { console.error('deleteSession error:', e.message); return false; }
}

// ===========================================================
// USER CONFIG
// ===========================================================
async function getUserConfigFromMongoDB(number) {
    try {
        const sanitized = number.replace(/[^0-9]/g, '');
        const configDoc = await UserConfig.findOne({ number: sanitized });
        if (configDoc) return configDoc.config;

        const defaultConfig = {
            AUTO_RECORDING: 'false',
            AUTO_TYPING: 'false',
            ANTI_CALL: 'false',
            REJECT_MSG: '*🔕 ʏᴏᴜʀ ᴄᴀʟʟ ᴡᴀs ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀʟʟʏ ʀᴇᴊᴇᴄᴛᴇᴅ..!*',
            READ_MESSAGE: 'false',
            AUTO_VIEW_STATUS: 'false',
            AUTO_LIKE_STATUS: 'false',
            AUTO_STATUS_REPLY: 'false',
            AUTO_STATUS_MSG: 'Hello from black popkid!',
            AUTO_LIKE_EMOJI: ['❤️', '👍', '😮', '😎']
        };
        await UserConfig.create({ number: sanitized, config: defaultConfig });
        return defaultConfig;
    } catch (e) { console.error('getUserConfig error:', e.message); return {}; }
}

async function updateUserConfigInMongoDB(number, newConfig) {
    try {
        const sanitized = number.replace(/[^0-9]/g, '');
        await UserConfig.findOneAndUpdate(
            { number: sanitized },
            { config: newConfig, updatedAt: new Date() },
            { upsert: true, new: true }
        );
        return true;
    } catch (e) { console.error('updateUserConfig error:', e.message); return false; }
}

// ===========================================================
// OTP
// ===========================================================
async function saveOTPToMongoDB(number, otp, config) {
    try {
        const sanitized = number.replace(/[^0-9]/g, '');
        await OTP.create({ number: sanitized, otp, config });
        return true;
    } catch (e) { console.error('saveOTP error:', e.message); return false; }
}

async function verifyOTPFromMongoDB(number, otp) {
    try {
        const sanitized = number.replace(/[^0-9]/g, '');
        const otpRecord = await OTP.findOne({
            number: sanitized,
            otp,
            expiresAt: { $gt: new Date() }
        });
        if (!otpRecord) return { valid: false, error: 'Invalid or expired OTP' };
        await OTP.deleteOne({ _id: otpRecord._id });
        return { valid: true, config: otpRecord.config };
    } catch (e) { console.error('verifyOTP error:', e.message); return { valid: false, error: 'Verification error' }; }
}

// ===========================================================
// ACTIVE NUMBERS
// ===========================================================
async function addNumberToMongoDB(number) {
    try {
        const sanitized = number.replace(/[^0-9]/g, '');
        await ActiveNumber.findOneAndUpdate(
            { number: sanitized },
            { lastConnected: new Date(), isActive: true },
            { upsert: true, new: true }
        );
        return true;
    } catch (e) { console.error('addNumber error:', e.message); return false; }
}

async function removeNumberFromMongoDB(number) {
    try {
        const sanitized = number.replace(/[^0-9]/g, '');
        await ActiveNumber.deleteOne({ number: sanitized });
        return true;
    } catch (e) { console.error('removeNumber error:', e.message); return false; }
}

async function getAllNumbersFromMongoDB() {
    try {
        const activeNumbers = await ActiveNumber.find({ isActive: true });
        return activeNumbers.map(num => num.number);
    } catch (e) { console.error('getAllNumbers error:', e.message); return []; }
}

// ===========================================================
// STATS
// ===========================================================
async function incrementStats(number, field) {
    const allowedFields = new Set(['commandsUsed', 'messagesReceived', 'messagesSent', 'groupsInteracted']);
    const normalized = cleanNumber(number);
    if (!normalized || !allowedFields.has(field)) return;

    const date = new Date().toISOString().split('T')[0];
    const key = `${normalized}:${date}`;
    const item = pendingStats.get(key) || { number: normalized, date, increments: {} };
    item.increments[field] = (item.increments[field] || 0) + 1;
    pendingStats.set(key, item);
    scheduleStatsFlush();
}

async function flushStats() {
    if (!pendingStats.size) return;
    const batch = [...pendingStats.values()];
    pendingStats.clear();
    try {
        await Stats.bulkWrite(batch.map(item => ({
            updateOne: {
                filter: { number: item.number, date: item.date },
                update: { $inc: item.increments },
                upsert: true
            }
        })), { ordered: false });
    } catch (e) { console.error('flushStats error:', e.message); throw e; }
}

async function getStatsForNumber(number) {
    try {
        const sanitized = number.replace(/[^0-9]/g, '');
        return await Stats.find({ number: sanitized }).sort({ date: -1 }).limit(30);
    } catch (e) { console.error('getStats error:', e.message); return []; }
}

// ===========================================================
// PROMO CODES
// ===========================================================
async function createPromoCode(code, maxUses, createdBy, expiresInHours = 24, premiumDays = 30) {
    const cleanCode = String(code || '').toUpperCase().trim();
    if (!/^[A-Z0-9_-]{4,24}$/.test(cleanCode)) throw new Error('Code 4-24 letters/numbers ka hona chahiye');
    maxUses = Number(maxUses || 100);
    premiumDays = Number(premiumDays || 30);
    expiresInHours = Number(expiresInHours || 24);
    if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100000) throw new Error('Max uses 1-100000 hona chahiye');
    if (!Number.isInteger(premiumDays) || premiumDays < 1 || premiumDays > 3650) throw new Error('Premium days 1-3650 honay chahiye');
    if (!Number.isFinite(expiresInHours) || expiresInHours < 1 || expiresInHours > 8760) throw new Error('Expiry 1-8760 hours honi chahiye');
    const existing = await PromoCode.findOne({ code: cleanCode });
    if (existing) throw new Error('Ye code already exist karta hai');
    return PromoCode.create({ code: cleanCode, maxUses, premiumDays, createdBy: cleanNumber(createdBy), expiresAt: new Date(Date.now() + expiresInHours * 3600000) });
}

async function redeemPromoCode(code, userNumber) {
    const cleanCode = String(code || '').toUpperCase().trim();
    const user = cleanNumber(userNumber);
    if (!user) return { success: false, reason: 'invalid_user' };
    const now = new Date();
    // Atomic conditional update prevents concurrent redeems exceeding maxUses.
    const promo = await PromoCode.findOneAndUpdate(
        { code: cleanCode, active: true, $and: [ { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }, { usedBy: { $ne: user } } ] },
        { $addToSet: { usedBy: user }, $inc: { usedCount: 1 } },
        { new: true }
    );
    if (!promo) {
        const existing = await PromoCode.findOne({ code: cleanCode });
        if (!existing) return { success: false, reason: 'invalid_code' };
        if (!existing.active) return { success: false, reason: 'inactive' };
        if (existing.expiresAt && existing.expiresAt <= now) return { success: false, reason: 'expired' };
        if ((existing.usedBy || []).includes(user)) return { success: false, reason: 'already_used_by_you' };
        if (existing.usedCount >= existing.maxUses) return { success: false, reason: 'limit_reached' };
        return { success: false, reason: 'try_again' };
    }
    try {
        await grantPromoPremium(user, promo.code, Math.max(1, Number(promo.premiumDays) || 30));
    } catch (e) {
        await PromoCode.updateOne(
            { code: cleanCode, usedBy: user },
            { $pull: { usedBy: user }, $inc: { usedCount: -1 } }
        ).catch(() => {});
        throw e;
    }
    return {
        success: true,
        remaining: Math.max(0, promo.maxUses - promo.usedCount),
        total: promo.maxUses,
        premiumDays: Math.max(1, Number(promo.premiumDays) || 30)
    };
}

async function listPromoCodes(ownerNumber) {
    return await PromoCode.find({ createdBy: cleanNumber(ownerNumber) })
        .sort({ createdAt: -1 }).limit(20).lean();
}

async function deletePromoCode(code, ownerNumber) {
    const cleanCode = String(code || '').toUpperCase().trim();
    const result = await PromoCode.deleteOne({ code: cleanCode, createdBy: cleanNumber(ownerNumber) });
    return result.deletedCount === 1;
}

async function grantPromoPremium(number, code, days = 30) {
    const cleanNum = cleanNumber(number);
    const durationDays = Number(days);
    if (!cleanNum || !Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) {
        throw new Error('Invalid premium grant');
    }
    const current = await PromoPremium.findOne({ number: cleanNum }).lean();
    const now = new Date();
    const base = current?.expiresAt && current.expiresAt > now ? current.expiresAt : now;
    const expiresAt = new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000);
    await PromoPremium.findOneAndUpdate(
        { number: cleanNum },
        { $set: { code: String(code).toUpperCase(), unlockedAt: now, expiresAt } },
        { upsert: true, new: true }
    );
    return true;
}

async function hasPromoPremium(number) {
    const cleanNum = cleanNumber(number);
    try {
        const record = await PromoPremium.findOne({ number: cleanNum });
        if (!record) return false;
        if (record.expiresAt && record.expiresAt < new Date()) {
            await PromoPremium.deleteOne({ number: cleanNum });
            return false;
        }
        return true;
    } catch (e) { return false; }
}

// ===========================================================
// EXPORTS
// ===========================================================
module.exports = {
    connectdb,
    Session, UserConfig, OTP, ActiveNumber, Stats, PromoCode, PromoPremium,
    saveSessionToMongoDB, getSessionFromMongoDB, deleteSessionFromMongoDB,
    getUserConfigFromMongoDB, updateUserConfigInMongoDB,
    saveOTPToMongoDB, verifyOTPFromMongoDB,
    addNumberToMongoDB, removeNumberFromMongoDB, getAllNumbersFromMongoDB,
    incrementStats, getStatsForNumber, flushStats,
    createPromoCode, redeemPromoCode, listPromoCodes, deletePromoCode, grantPromoPremium, hasPromoPremium
};

// ᴘᴏᴡᴇʀᴇᴅ ʙʏ RIZO MD