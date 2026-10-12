const config = require('../config');
const { isConfiguredOwner } = require('./identity');

function cleanNumber(value) {
    let number = String(value || '').replace(/\D/g, '');
    if (number.startsWith('00')) number = number.slice(2);
    if (number.startsWith('0')) number = `${config.DEFAULT_COUNTRY_CODE || '92'}${number.slice(1)}`;
    return number;
}

function isOwnerNumber(number) {
    const owners = Array.isArray(config.OWNER_NUMBERS) && config.OWNER_NUMBERS.length
        ? config.OWNER_NUMBERS
        : [config.OWNER_NUMBER].filter(Boolean);
    return isConfiguredOwner([number], owners, config.DEFAULT_COUNTRY_CODE);
}

function isOwner(ctx) {
    if (!ctx) return false;
    const identities = [
        ...(Array.isArray(ctx.senderIdentities) ? ctx.senderIdentities : []),
        ctx.senderNumber,
        ctx.sender
    ].filter(Boolean);
    const owners = Array.isArray(config.OWNER_NUMBERS) && config.OWNER_NUMBERS.length
        ? config.OWNER_NUMBERS
        : [config.OWNER_NUMBER].filter(Boolean);
    return isConfiguredOwner(identities, owners, config.DEFAULT_COUNTRY_CODE);
}

module.exports = {
    OWNER_NUMBERS: config.OWNER_NUMBERS || [config.OWNER_NUMBER].filter(Boolean),
    cleanNumber,
    isOwnerNumber,
    isOwner
};
