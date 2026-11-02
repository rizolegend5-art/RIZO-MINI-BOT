const config = require('../config');

function getConfig(userConfig) {
    return {
        ...config,
        ...(userConfig && typeof userConfig === 'object' ? userConfig : {})
    };
}

function getFooter(userConfig) {
    const cfg = getConfig(userConfig);
    return cfg.DESCRIPTION || '';
}

function getNewsletterInfo(userConfig) {
    const cfg = getConfig(userConfig);
    return {
        newsletterJid: cfg.NEWSLETTER_JID || '',
        newsletterName: cfg.NEWSLETTER_NAME || cfg.BOT_NAME || '',
    };
}

function box(title, lines = [], icon = '📥') {
    const safeTitle = String(title || '').toUpperCase();
    const body = lines.map(line => `┋⋄ ➠ ${line}`).join('\n');
    return `╭┈〔 ${icon} *${safeTitle}* 〕┈─⊷\n${body}\n╰──────────────────⊷`;
}

module.exports = { config, getConfig, getFooter, getNewsletterInfo, box };
