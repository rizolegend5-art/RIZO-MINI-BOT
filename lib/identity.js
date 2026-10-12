const OWNER_NUMBERS = new Set();

function digitsOnly(value) {
    return String(value || '').replace(/\D/g, '');
}

function normalizeOwnerNumber(value, countryCode = '92') {
    const raw = String(value || '').trim();
    if (/@lid$/i.test(raw)) return '';
    let number = digitsOnly(raw.split('@')[0].split(':')[0]);
    if (number.startsWith('00')) number = number.slice(2);
    if (number.startsWith('0')) number = `${countryCode}${number.slice(1)}`;
    if (number.length === 10 && number.startsWith('3')) number = `${countryCode}${number}`;
    return number;
}

function phoneFromIdentity(value, countryCode = '92') {
    const raw = String(value || '').trim();
    if (!raw || /@lid$/i.test(raw)) return '';
    if (raw.includes('@') && !/@s\.whatsapp\.net$/i.test(raw)) return '';
    return normalizeOwnerNumber(raw, countryCode);
}

function identityKeys(value, countryCode = '92') {
    if (value && typeof value === 'object') {
        return [...new Set([
            ...identityKeys(value.id, countryCode),
            ...identityKeys(value.jid, countryCode),
            ...identityKeys(value.phoneNumber, countryCode),
            ...identityKeys(value.phone_number, countryCode),
            ...identityKeys(value.lid, countryCode)
        ])];
    }
    const raw = String(value || '').trim();
    if (!raw) return [];
    const keys = [`jid:${raw.toLowerCase()}`];
    const phone = phoneFromIdentity(raw, countryCode);
    if (phone) keys.push(`phone:${phone}`);
    if (!raw.includes('@')) {
        const number = normalizeOwnerNumber(raw, countryCode);
        if (number) keys.push(`phone:${number}`);
    }
    return keys;
}

function matchesIdentity(candidates, participant, countryCode = '92') {
    const candidateKeys = new Set(candidates.flatMap(value => identityKeys(value, countryCode)));
    return identityKeys(participant, countryCode).some(key => candidateKeys.has(key));
}

function isConfiguredOwner(candidates, ownerNumbers, countryCode = '92') {
    const owners = new Set((Array.isArray(ownerNumbers) ? ownerNumbers : [ownerNumbers])
        .map(value => normalizeOwnerNumber(value, countryCode)).filter(Boolean));
    return candidates.some(value => {
        const number = phoneFromIdentity(value, countryCode) || normalizeOwnerNumber(value, countryCode);
        return Boolean(number && owners.has(number));
    });
}

module.exports = {
    digitsOnly,
    normalizeOwnerNumber,
    phoneFromIdentity,
    identityKeys,
    matchesIdentity,
    isConfiguredOwner
};
