// RIZO HINDI PACK — Roman Hindi (Hinglish) shayari & suvichar. Original lines, offline.
const { cmd } = require('../arslan');
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const SETS = {
    hindiprem: ['❤️ PREM SHAYARI', [
        'Tere saath bitaye pal mere jeevan ka sabse sundar sapna hain,\nTu mil gayi to lagta hai sara sansaar apna hai.',
        'Teri ek muskaan par dil apna haar jaata hoon,\nHar subah tere khayal se hi main jaag jaata hoon.',
        'Prem woh nahi jo shabdon mein kaha jaaye,\nPrem woh hai jo aankhon se chupke se samjha jaaye.',
        'Chand taare sab fike lagte hain tere aage,\nTu hai to har raat mein roshni si jaage.',
        'Tujhse milne ki chaah mein har din guzaar deta hoon,\nTere intezaar mein khud ko sanwaar leta hoon.',
        'Dil ke kone mein ek naam hamesha rehta hai,\nWoh tera hi hai jo dhadkan mein behta hai.',
        'Tere bina adhoora hoon, tere saath poora hoon,\nTu meri zindagi ki woh kahani hai jo main roz padhna chahta hoon.',
        'Mohabbat kabhi puchh kar nahi hoti,\nBas ek nazar mein dil ka faisla ho jaata hai.']],
    hindidard: ['💔 DARD SHAYARI', [
        'Aankhon mein nami hai par lab muskurate hain,\nHum dard ko apne andar hi chhupate hain.',
        'Jinhe apna samjha tha unhi ne tanha chhod diya,\nBhari mehfil mein bhi hum akele reh gaye.',
        'Yaadon ke sahaare kat jaate hain din,\nRaaton ko toh aansu hi saathi hote hain.',
        'Ab kisi se koi gila nahi hai humein,\nBas dil ke ek kone mein dard baaki hai.',
        'Waqt ne sab kuch badal diya, bas ek tera naam nahi badla,\nAaj bhi dil usi ke liye dhadakta hai.',
        'Toote hue dil ki awaaz kisi ko sunayi nahi deti,\nBas khamoshi hi sab kuch keh jaati hai.',
        'Humne toh chaha tha tumhein har janam mein,\nPar tumne toh ek pal mein hi raah badal li.',
        'Rone se kuch hasil nahi hota,\nPhir bhi dil rone ko majboor ho jaata hai.']],
    hindidosti: ['🤝 DOSTI SHAYARI', [
        'Mitra woh hai jo bina kahe dil ki baat samajh jaaye,\nAur har mushkil mein saaya ban kar saath chale.',
        'Dosti ka rishta sabse anmol hota hai,\nIsme na koi swaarth na koi mol hota hai.',
        'Tere jaisa yaar kismat waalon ko milta hai,\nHar dukh mein tu hi mera sahaara banta hai.',
        'Yaaron ke saath har din tyohaar lagta hai,\nUnke bina yeh sansaar adhoora lagta hai.',
        'Dost woh nahi jo khushi mein hans de,\nDost woh hai jo dukh mein haath thaam le.',
        'Dosti mein koi chhota bada nahi hota,\nBas dil se dil ka rishta hota hai.',
        'Zindagi mein aaye kitne log, par yaar toh ek hi hota hai,\nJo har haal mein apna hota hai.',
        'Yaari hamari pehchaan hai,\nYaaron se hi toh meri shaan hai.']],
    hindijeevan: ['🌿 JEEVAN SHAYARI', [
        'Jeevan ek safar hai, ruk kar mat dekho peeche,\nJo beet gaya woh kal tha, aaj ko jee lo seene se.',
        'Mushkilein toh aati rahengi, himmat mat haarna,\nJo gir kar uth jaata hai wahi sikandar kehlata hai.',
        'Waqt ka pahiya kabhi rukta nahi,\nIsliye har pal ko khushi se jee lo.',
        'Jo kismat mein likha hai woh mil kar rehta hai,\nBas sabr aur mehnat ka saath rakhna padta hai.',
        'Andhere ke baad hi toh roshni aati hai,\nBas dhairya rakho, subah zaroor aati hai.',
        'Sapne woh nahi jo neend mein aaye,\nSapne woh hain jo neend udaa jaayein.',
        'Zindagi chhoti hai, naraazgi kya rakhni,\nJo mile pyaar se, usi se rishta rakhna.',
        'Jeevan mein kuch banna hai toh pehle khud par bharosa karo,\nDuniya apne aap tumhare peeche chal degi.']],
    hindiraat: ['🌙 SHUBH RATRI', [
        'Chand ki roshni mein tumhein sapne aayein sunehre,\nShubh ratri, so jao ab mere pyaare.',
        'Din bhar ki thakaan ko aaj bhula do,\nNeend ki godi mein sukoon pa lo.',
        'Taaron ki chaaon mein neend aaye gehri,\nSapne mein mile tumhein har khushi sunehri.',
        'Raat ka sannata kehta hai ab aaram karo,\nKal ki subah ke liye nayi ummeed bharo.',
        'Rab tumhari raat ko sukoon se bhar de,\nHar dukh tumse door aur har khushi tumhare naam kar de.',
        'Aankhein band karo aur muskurate hue so jao,\nKal ek nayi khushi tumhara intezaar kar rahi hai.',
        'Tumhare bina din adhoora, tumhare saath raat bhi poori,\nShubh ratri mere dost, meethe sapne dekhna.',
        'Shubh ratri! Meethi neend aur pyaare sapne aapke naam.']]
};
const SUVICHAR = [
    'Sabr ka phal meetha hota hai, par uske liye mehnat ki jad kadvi hoti hai.',
    'Jo vyakti apni galtiyon se seekhta hai, wahi sabse zyada aage badhta hai.',
    'Vishwas ek baar tootne ke baad kabhi pehle jaisa nahi hota.',
    'Khud par yakeen rakho, duniya tumhe khud maan degi.',
    'Chhoti chhoti khushiyan hi jeevan ko bada banati hain.',
    'Kal kisne dekha hai, aaj hi sabse achha kaam karo.',
    'Safalta unhein milti hai jo haar maanne se inkaar karte hain.',
    'Mann shaant ho toh har samasya ka hal mil jaata hai.',
    'Jo log tumhare bure waqt mein saath rahein, unhe kabhi mat bhoolna.',
    'Mehnat itni khamoshi se karo ki safalta shor macha de.'
];

for (const [pattern, [title, list]] of Object.entries(SETS)) {
    cmd({ pattern, category: 'shayari', react: title.split(' ')[0], desc: `Roman Hindi ${title.split(' ').slice(1).join(' ').toLowerCase()}`, use: `.${pattern}`, filename: __filename },
    async (conn, mek, m, ctx) => { await ctx.reply(`${title}\n\n${pick(list)}\n\n_Dobara likho: *.${pattern}* ✨_`); });
}
cmd({ pattern: 'hindisuvichar', category: 'shayari', react: '💭', desc: 'Roman Hindi suvichar (achhi baatein)', use: '.hindisuvichar', filename: __filename },
async (conn, mek, m, ctx) => { await ctx.reply(`💭 *SUVICHAR*\n\n"${pick(SUVICHAR)}"\n\n_Dobara likho: *.hindisuvichar* ✨_`); });

cmd({ pattern: 'hindishayari', category: 'shayari', react: '📜', desc: 'Roman Hindi random shayari (sab mein se)', use: '.hindishayari', filename: __filename },
async (conn, mek, m, ctx) => {
    const [title, list] = pick(Object.values(SETS));
    await ctx.reply(`${title}\n\n${pick(list)}\n\n_Dobara likho: *.hindishayari* ✨_`);
});
