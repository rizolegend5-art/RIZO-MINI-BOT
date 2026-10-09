const mongoose = require('mongoose');
const config = require('../config');
const crypto = require('crypto');

// ====================================
// CONNECTDB
// ====================================
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

        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB error:', err.message);
        });
        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected');
        });
        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected');
        });

    } catch (e) {
        console.error("❌ Database Connection Failed:", e.message);
    }
};

// ====================================
// MODELS
// ====================================

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
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 5 * 60000),
        index: { expires: '5m' }
    },
    createdAt: { type: Date, default: Date.now }
});

const activeNumberSchema = new mongoose.Schema({
    number: { type: String, required: true, unique: true, index: true },
    lastConnected: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    connectionInfo: {
        ip: String,
        userAgent: String,
        timestamp: Date
    }
});

const statsSchema = new mongoose.Schema({
    number: { type: String, required: true },
    date: { type: String, required: true },
    commandsUsed: { type: Number, default: 0 },
    messagesReceived: { type: Number, default: 0 },
    messagesSent: { type: Number, default: 0 },
    groupsInteracted: { type: Number, default: 0 }
});

const referralCodeSchema = new mongoose.Schema({
    number: { type: String, required: true, unique: true, index: true },
    code: { type: String, required: true, unique: true, index: true },
    createdAt: { type: Date, default: Date.now }
});

const referralSchema = new mongoose.Schema({
    referrerNumber: { type: String, required: true, index: true },
    referredNumber: { type: String, required: true, unique: true, index: true },
    createdAt: { type: Date, default: Date.now }
});

// ===========================================================
// 🆕 PROMO CODE SYSTEM
// ===========================================================
const promoCodeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, index: true },
    maxUses: { type: Number, default: 3 },
    usedBy: [{ type: String }],
    usedCount: { type: Number, default: 0 },
    createdBy: { type: String, required: true },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const promoPremiumSchema = new mongoose.Schema({
    number: { type: String, required: true, unique: true, index: true },
    code: { type: String, required: true },
    unlockedAt: { type: Date, default: Date.now },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
});

const Session = mongoose.model('Session', sessionSchema);
const UserConfig = mongoose.model('UserConfig', userConfigSchema);
const OTP = mongoose.model('OTP', otpSchema);
const ActiveNumber = mongoose.model('ActiveNumber', activeNumberSchema);
const Stats = mongoose.model('Stats', statsSchema);
const ReferralCode = mongoose.model('ReferralCode', referralCodeSchema);
const Referral = mongoose.model('Referral', referralSchema);
const PromoCode = mongoose.model('PromoCode', promoCodeSchema);
const PromoPremium = mongoose.model('PromoPremium', promoPremiumSchema);

// ====================================
// STATS QUEUE
// ====================================
const pendingStats = new Map();
let statsFlushTimer = null;

function scheduleStatsFlush() {
    if (statsFlushTimer) return;
    statsFlushTimer = setTimeout(() => {
        statsFlushTimer = null;
        flushStats().catch(error => console.error('❌ Error flushing stats:', error.message));
    }, 2000);
    if (statsFlushTimer.unref) statsFlushTimer.unref();
}

function cleanNumber(number) {
    let value = String(number || '').replace(/\D/g, '');
    if (value.startsWith('0')) value = `${config.DEFAULT_COUNTRY_CODE}${value.slice(1)}`;
    return value;
}

// ====================================
// SESSION FUNCTIONS
// ====================================

async function saveSessionToMongoDB(number, credentials) {
    try {
        const sanitized = number.replace(/[^0-9]/g, '');
        await Session.findOneAndUpdate(
            { number: sanitized },
            { credentials, updatedAt: new Date() },
            { upsert: true, new: true }
        );
        console.log(`📁 Session saved to MongoDB for ${sanitized}`);
        return true;
    } catch (error) {
        console.error('❌ Error saving session to MongoDB:', error);
        return false;
    }
}

async function getSessionFromMongoDB(number) {
    try {
        const sanitized = number.replace(/[^0-9]/g, '');
        const session = await Session.findOne({ number: sanitized });
        return session ? session.credentials : null;
    } catch (error) {
        console.error('❌ Error getting session from MongoDB:', error);
        return null;
    }
}

async function deleteSessionFromMongoDB(number) {
    try {
        const sanitized = number.replace(/[^0-9]/g, '');
        await Session.deleteOne({ number: sanitized });
        await ActiveNumber.deleteOne({ number: sanitized });
        console.log(`🗑️ Session deleted from MongoDB for ${sanitized}`);
        return true;
    } catch (error) {
        console.error('❌ Error deleting session from MongoDB:', error);
        return false;
    }
}

// ====================================
// USER CONFIG
// ====================================

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
    } catch (error) {
        console.error('❌ Error getting user config from MongoDB:', error);
        return {};
    }
}

async function updateUserConfigInMongoDB(number, newConfig) {
    try {
        const sanitized = number.replace(/[^0-9]/g, '');
        await UserConfig.findOneAndUpdate(
            { number: sanitized },
            { config: newConfig, updatedAt: new Date() },
            { upsert: true, new: true }
        );
        console.log(`⚙️ Config updated for ${sanitized}`);
        return true;
    } catch (error) {
        console.error('❌ Error updating user config in MongoDB:', error);
        return false;
    }
}

// ====================================
// OTP
// ====================================

async function saveOTPToMongoDB(number, otp, config) {
    try {
        const sanitized = number.replace(/[^0-9]/g, '');
        await OTP.create({ number: sanitized, otp, config });
        console.log(`🔐 OTP saved for ${sanitized}`);
        return true;
    } catch (error) {
        console.error('❌ Error saving OTP to MongoDB:', error);
        return false;
    }
}

async function verifyOTPFromMongoDB(number, otp) {
    try {
        const sanitized = number.replace(/[^0-9]/g, '');
        const otpRecord = await OTP.findOne({
            number: sanitized,
            otp,
            expiresAt: { $gt: new Date() }
        });

        if (!otpRecord) {
            return { valid: false, error: 'Invalid or expired OTP' };
        }

        await OTP.deleteOne({ _id: otpRecord._id });
        return { valid: true, config: otpRecord.config };
    } catch (error) {
        console.error('❌ Error verifying OTP from MongoDB:', error);
        return { valid: false, error: 'Verification error' };
    }
}

// ====================================
// ACTIVE NUMBERS
// ====================================

async function addNumberToMongoDB(number) {
    try {
        const sanitized = number.replace(/[^0-9]/g, '');
        await ActiveNumber.findOneAndUpdate(
            { number: sanitized },
            { lastConnected: new Date(), isActive: true },
            { upsert: true, new: true }
        );
        return true;
    } catch (error) {
        console.error('❌ Error adding number to MongoDB:', error);
        return false;
    }
}

async function removeNumberFromMongoDB(number) {
    try {
        const sanitized = number.replace(/[^0-9]/g, '');
        await ActiveNumber.deleteOne({ number: sanitized });
        return true;
    } catch (error) {
        console.error('❌ Error removing number from MongoDB:', error);
        return false;
    }
}

async function getAllNumbersFromMongoDB() {
    try {
        const activeNumbers = await ActiveNumber.find({ isActive: true });
        return activeNumbers.map(num => num.number);
    } catch (error) {
        console.error('❌ Error getting numbers from MongoDB:', error);
        return [];
    }
}

// ====================================
// STATS
// ====================================

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
    } catch (error) {
        console.error('❌ Stats batch failed:', error.message);
        throw error;
    }
}

async function getStatsForNumber(number) {
    try {
        const sanitized = number.replace(/[^0-9]/g, '');
        return await Stats.find({ number: sanitized }).sort({ date: -1 }).limit(30);
    } catch (error) {
        console.error('❌ Error getting stats:', error);
        return [];
    }
}

// ====================================
// REFERRAL SYSTEM
// ====================================

async function getOrCreateReferralCode(number) {
    const normalized = cleanNumber(number);
    if (!normalized) throw new Error('Invalid phone number');

    let record = await ReferralCode.findOne({ number: normalized });
    if (record) return record.code;

    for (let attempt = 0; attempt < 4; attempt++) {
        const code = crypto.randomBytes(5).toString('hex').toUpperCase();
        try {
            record = await ReferralCode.findOneAndUpdate(
                { number: normalized },
                { $setOnInsert: { number: normalized, code } },
                { upsert: true, new: true }
            );
            return record.code;
        } catch (error) {
            if (error.code === 11000) {
                record = await ReferralCode.findOne({ number: normalized });
                if (record) return record.code;
            } else {
                throw error;
            }
        }
    }
    throw new Error('Could not create referral code');
}

async function countReferralsForNumber(number) {
    const normalized = cleanNumber(number);
    if (!normalized) return 0;
    return Referral.countDocuments({ referrerNumber: normalized });
}

async function recordReferral(code, referredNumber) {
    const referralCode = String(code || '').trim().toUpperCase();
    const referred = cleanNumber(referredNumber);
    if (!referralCode || !referred) return { recorded: false, reason: 'invalid' };

    const owner = await ReferralCode.findOne({ code: referralCode }).select('number').lean();
    if (!owner) return { recorded: false, reason: 'unknown_code' };
    if (owner.number === referred) return { recorded: false, reason: 'self_referral' };

    try {
        const result = await Referral.updateOne(
            { referredNumber: referred },
            { $setOnInsert: { referredNumber: referred, referrerNumber: owner.number } },
            { upsert: true }
        );
        return {
            recorded: result.upsertedCount === 1,
            reason: result.upsertedCount === 1 ? 'recorded' : 'already_counted'
        };
    } catch (error) {
        if (error.code === 11000) return { recorded: false, reason: 'already_counted' };
        throw error;
    }
}

async function getReferralStatsForNumber(number) {
    const normalized = cleanNumber(number);
    const [count, codeRecord, referrals] = await Promise.all([
        Referral.countDocuments({ referrerNumber: normalized }),
        ReferralCode.findOne({ number: normalized }).select('code').lean(),
        Referral.find({ referrerNumber: normalized })
            .sort({ createdAt: -1 })
            .limit(31)
            .select('referredNumber createdAt')
            .lean()
    ]);

    return {
        number: normalized,
        code: codeRecord ? codeRecord.code : null,
        count,
        premium: count >= config.PREMIUM_REFERRALS,
        referrals
    };
}

async function getReferralOverview() {
    const [activeNumbers, totalReferrals, premiumResult] = await Promise.all([
        ActiveNumber.countDocuments({ isActive: true }),
        Referral.countDocuments(),
        Referral.aggregate([
            { $group: { _id: '$referrerNumber', count: { $sum: 1 } } },
            { $match: { count: { $gte: config.PREMIUM_REFERRALS } } },
            { $sort: { count: -1 } },
            {
                $facet: {
                    total: [{ $count: 'count' }],
                    rows: [
                        { $limit: 100 },
                        { $project: { _id: 0, number: '$_id', count: 1 } }
                    ]
                }
            }
        ])
    ]);

    const result = premiumResult[0] || { total: [], rows: [] };
    return {
        activeNumbers,
        totalReferrals,
        premiumCount: result.total[0]?.count || 0,
        premiumReferrers: result.rows
    };
}

// ===========================================================
// 🆕 PROMO CODE FUNCTIONS
// ===========================================================

async function createPromoCode(code, maxUses, createdBy, expiresInHours = null) {
    const cleanCode = String(code || '').toUpperCase().trim();
    if (!cleanCode || cleanCode.length < 4 || cleanCode.length > 20) {
        throw new Error('Code 4-20 characters ka hona chahiye');
    }

    const existing = await PromoCode.findOne({ code: cleanCode });
    if (existing) throw new Error('Ye code already exist karta hai');

    const expiresAt = expiresInHours
        ? new Date(Date.now() + expiresInHours * 3600 * 1000)
        : null;

    return await PromoCode.create({
        code: cleanCode,
        maxUses: maxUses || 3,
        createdBy: cleanNumber(createdBy),
        expiresAt
    });
}

async function redeemPromoCode(code, userNumber) {
    const cleanCode = String(code || '').toUpperCase().trim();
    const user = cleanNumber(userNumber);

    const promo = await PromoCode.findOne({ code: cleanCode });
    if (!promo) return { success: false, reason: 'invalid_code' };
    if (!promo.active) return { success: false, reason: 'inactive' };

    if (promo.expiresAt && promo.expiresAt < new Date()) {
        return { success: false, reason: 'expired' };
    }

    if (promo.usedBy.includes(user)) {
        return { success: false, reason: 'already_used_by_you' };
    }

    if (promo.usedCount >= promo.maxUses) {
        return { success: false, reason: 'limit_reached' };
    }

    promo.usedBy.push(user);
    promo.usedCount += 1;
    await promo.save();

    return {
        success: true,
        remaining: promo.maxUses - promo.usedCount,
        total: promo.maxUses
    };
}

async function listPromoCodes(ownerNumber) {
    return await PromoCode.find({ createdBy: cleanNumber(ownerNumber) })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
}

async function deletePromoCode(code, ownerNumber) {
    const cleanCode = String(code || '').toUpperCase().trim();
    const result = await PromoCode.deleteOne({
        code: cleanCode,
        createdBy: cleanNumber(ownerNumber)
    });
    return result.deletedCount === 1;
}

async function grantPromoPremium(number, code, days = 30) {
    const cleanNum = cleanNumber(number);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await PromoPremium.findOneAndUpdate(
        { number: cleanNum },
        {
            code: String(code).toUpperCase(),
            unlockedAt: new Date(),
            expiresAt
        },
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
    } catch (e) {
        console.error('hasPromoPremium error:', e.message);
        return false;
    }
}

// ====================================
// EXPORTS
// ====================================

module.exports = {
    connectdb,

    // Models
    Session,
    UserConfig,
    OTP,
    ActiveNumber,
    Stats,
    ReferralCode,
    Referral,
    PromoCode,        // 🆕
    PromoPremium,     // 🆕

    // Session
    saveSessionToMongoDB,
    getSessionFromMongoDB,
    deleteSessionFromMongoDB,

    // Config
    getUserConfigFromMongoDB,
    updateUserConfigInMongoDB,

    // OTP
    saveOTPToMongoDB,
    verifyOTPFromMongoDB,

    // Numbers
    addNumberToMongoDB,
    removeNumberFromMongoDB,
    getAllNumbersFromMongoDB,

    // Stats
    incrementStats,
    getStatsForNumber,
    flushStats,

    // Referrals
    getOrCreateReferralCode,
    countReferralsForNumber,
    recordReferral,
    getReferralStatsForNumber,
    getReferralOverview,

    // 🆕 Promo
    createPromoCode,
    redeemPromoCode,
    listPromoCodes,
    deletePromoCode,
    grantPromoPremium,
    hasPromoPremium,

    // Aliases
    getUserConfig: async (number) => {
        const cfg = await getUserConfigFromMongoDB(number);
        return cfg || {};
    },
    updateUserConfig: updateUserConfigInMongoDB
};

// ᴘᴏᴡᴇʀᴇᴅ ʙʏ RIZO MD