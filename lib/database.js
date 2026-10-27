// RIZO local JSON database — MongoDB completely removed.
// For Railway, mount a persistent volume at /app/data (or set RIZO_DATA_DIR).
const fs = require('fs');
const path = require('path');
const config = require('../config');
const DATA_DIR = process.env.RIZO_DATA_DIR || path.join(__dirname, '..', 'data', 'store');
fs.mkdirSync(DATA_DIR, { recursive: true });
const files = {};
const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
function read(name) {
  if (!files[name]) {
    const file = path.join(DATA_DIR, `${name}.json`);
    try { files[name] = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { files[name] = []; }
    if (!Array.isArray(files[name])) files[name] = [];
  }
  return files[name];
}
function write(name) {
  const file = path.join(DATA_DIR, `${name}.json`), temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(files[name] || [], null, 2));
  fs.renameSync(temp, file);
}
function val(obj, key) { return key.split('.').reduce((v, k) => v == null ? undefined : v[k], obj); }
function match(doc, query = {}) {
  return Object.entries(query).every(([k, v]) => {
    if (k === '$or') return v.some(q => match(doc, q));
    if (k === '$and') return v.every(q => match(doc, q));
    if (k === '$expr') { const [op, pair] = Object.entries(v)[0] || []; if (op === '$lt') return val(doc, pair[0].slice(1)) < val(doc, pair[1].slice(1)); return true; }
    const got = val(doc, k);
    if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).some(x => x.startsWith('$'))) {
      return Object.entries(v).every(([op, x]) => op === '$gt' ? new Date(got) > new Date(x) : op === '$gte' ? got >= x : op === '$lt' ? got < x : op === '$ne' ? !(Array.isArray(got) ? got.includes(x) : got === x) : op === '$in' ? x.includes(got) : true);
    }
    if (Array.isArray(got)) return got.includes(v);
    return got === v;
  });
}
function applyUpdate(doc, update = {}) {
  const data = update.$set || update;
  for (const [k,v] of Object.entries(data)) if (!k.startsWith('$')) doc[k] = clone(v);
  if (update.$inc) for (const [k,v] of Object.entries(update.$inc)) doc[k] = (Number(doc[k]) || 0) + Number(v);
  if (update.$addToSet) for (const [k,v] of Object.entries(update.$addToSet)) { if (!Array.isArray(doc[k])) doc[k] = []; if (!doc[k].includes(v)) doc[k].push(v); }
  if (update.$pull) for (const [k,v] of Object.entries(update.$pull)) if (Array.isArray(doc[k])) doc[k] = doc[k].filter(x => x !== v);
  return doc;
}
function queryResult(promise) {
  let sorter = null, max = null;
  const q = { sort(s) { sorter=s; return q; }, limit(n) { max=n; return q; }, lean() { return q; }, then(resolve,reject) { return promise.then(rows => { let out=rows; if (sorter) { const [key,dir]=Object.entries(sorter)[0]; out=[...out].sort((a,b)=> (a[key]>b[key]?1:a[key]<b[key]?-1:0)*dir); } if (max != null) out=out.slice(0,max); return resolve(clone(out)); },reject); }, catch(reject) { return q.then(undefined,reject); } };
  return q;
}
function model(name) {
  return {
    findOne(q={}) { return queryResult(Promise.resolve(read(name).find(d=>match(d,q)) || null)); },
    find(q={}) { return queryResult(Promise.resolve(read(name).filter(d=>match(d,q)))); },
    async create(doc) { const row={_id:doc._id || `${Date.now()}-${Math.random().toString(36).slice(2)}`, createdAt:doc.createdAt || new Date(), ...clone(doc)}; read(name).push(row); write(name); return clone(row); },
    async findOneAndUpdate(q, upd, opts={}) { let rows=read(name), row=rows.find(d=>match(d,q)); if (!row && opts.upsert) { row={_id:`${Date.now()}-${Math.random().toString(36).slice(2)}`,...clone(q)}; rows.push(row); } if (!row) return null; applyUpdate(row,upd); if (!row.updatedAt) row.updatedAt=new Date(); write(name); return clone(row); },
    async deleteOne(q={}) { const rows=read(name), i=rows.findIndex(d=>match(d,q)); if(i<0)return {deletedCount:0}; rows.splice(i,1); write(name); return {deletedCount:1}; },
    async updateOne(q,upd,opts={}) { const r=await this.findOneAndUpdate(q,upd,opts); return {matchedCount:r?1:0,modifiedCount:r?1:0,upsertedCount:r?1:0}; },
    async bulkWrite(ops=[]) { for(const op of ops) { const u=op.updateOne; if(u) await this.findOneAndUpdate(u.filter,u.update,{upsert:u.upsert}); } return {ok:1}; }
  };
}
const Session=model('sessions'), UserConfig=model('user-configs'), OTP=model('otps'), ActiveNumber=model('active-numbers'), Stats=model('stats'), PromoCode=model('promo-codes'), PromoPremium=model('promo-premium');
const connectdb = async () => { try { fs.mkdirSync(DATA_DIR,{recursive:true}); for(const n of ['sessions','user-configs','otps','active-numbers','stats','promo-codes','promo-premium','referrals','antidelete']) read(n); console.log(`✅ Local JSON storage ready: ${DATA_DIR}`); return true; } catch(e) { console.error('❌ Local storage error:',e.message); return false; } };
function cleanNumber(number) { let n=String(number||'').replace(/\D/g,''); if(n.startsWith('0')) n=`${config.DEFAULT_COUNTRY_CODE}${n.slice(1)}`; return n; }
const clean = n => String(n||'').replace(/\D/g,'');
async function saveSessionToLocalStore(number, credentials) { try { await Session.findOneAndUpdate({number:clean(number)},{$set:{credentials,updatedAt:new Date()}},{upsert:true}); return true; } catch(e){console.error('save session:',e.message);return false;} }
async function getSessionFromLocalStore(number) { try { const x=await Session.findOne({number:clean(number)}); return x?.credentials||null; }catch(e){return null;} }
async function deleteSessionFromLocalStore(number) { const n=clean(number); await Session.deleteOne({number:n}); await ActiveNumber.deleteOne({number:n}); return true; }
const defaults=()=>({AUTO_RECORDING:'false',AUTO_TYPING:'false',ANTI_CALL:'false',REJECT_MSG:'*🔕 Your call was automatically rejected!*',READ_MESSAGE:'false',AUTO_VIEW_STATUS:'false',AUTO_LIKE_STATUS:'false',AUTO_STATUS_REPLY:'false',AUTO_STATUS_MSG:'Hello from RIZO!',AUTO_LIKE_EMOJI:['❤️','👍','😮','😎'],OWNER_DISPLAY_NUMBER:''});
async function getUserConfigFromLocalStore(number) { const n=clean(number); let d=await UserConfig.findOne({number:n}); if(d)return d.config||{}; const cfg=defaults(); await UserConfig.create({number:n,config:cfg}); return cfg; }
async function updateUserConfigInLocalStore(number,newConfig) { try { await UserConfig.findOneAndUpdate({number:clean(number)},{$set:{config:clone(newConfig),updatedAt:new Date()}},{upsert:true}); return true; }catch(e){console.error('save settings:',e.message);return false;} }
async function saveOTPToLocalStore(number,otp,cfg) { const n=clean(number); await OTP.deleteOne({number:n}); await OTP.create({number:n,otp:String(otp),config:cfg,expiresAt:new Date(Date.now()+300000)}); return true; }
async function verifyOTPFromLocalStore(number,otp) { const n=clean(number), r=await OTP.findOne({number:n,otp:String(otp)}); if(!r||new Date(r.expiresAt)<=new Date()) return {valid:false,error:'Invalid or expired OTP'}; await OTP.deleteOne({number:n,otp:String(otp)}); return {valid:true,config:r.config}; }
async function addNumberToLocalStore(number) { await ActiveNumber.findOneAndUpdate({number:clean(number)},{$set:{lastConnected:new Date(),isActive:true}},{upsert:true}); return true; }
async function removeNumberFromLocalStore(number) { await ActiveNumber.deleteOne({number:clean(number)}); return true; }
async function getAllNumbersFromLocalStore() { return (await ActiveNumber.find({isActive:true})).map(x=>x.number); }
const pendingStats=new Map(); let statsTimer;
async function incrementStats(number,field) { if(!['commandsUsed','messagesReceived','messagesSent','groupsInteracted'].includes(field))return; const n=cleanNumber(number), date=new Date().toISOString().slice(0,10), k=`${n}:${date}`; const x=pendingStats.get(k)||{number:n,date,inc:{}}; x.inc[field]=(x.inc[field]||0)+1; pendingStats.set(k,x); if(!statsTimer){statsTimer=setTimeout(()=>{statsTimer=null;flushStats().catch(console.error)},1500);statsTimer.unref?.();} }
async function flushStats() { for(const x of pendingStats.values()) await Stats.findOneAndUpdate({number:x.number,date:x.date},{$inc:x.inc},{upsert:true}); pendingStats.clear(); }
async function getStatsForNumber(number) { return await Stats.find({number:clean(number)}).sort({date:-1}).limit(30); }
async function createPromoCode(code,maxUses,createdBy,expiresInHours=24,premiumDays=30) { const c=String(code||'').toUpperCase().trim(); if(!/^[A-Z0-9_-]{4,24}$/.test(c))throw Error('Code 4-24 letters/numbers ka hona chahiye'); if(await PromoCode.findOne({code:c}))throw Error('Ye code already exist karta hai'); return PromoCode.create({code:c,maxUses:Number(maxUses||100),usedBy:[],usedCount:0,premiumDays:Number(premiumDays||30),createdBy:cleanNumber(createdBy),expiresAt:new Date(Date.now()+Number(expiresInHours||24)*3600000),active:true}); }
async function redeemPromoCode(code,userNumber) { const c=String(code||'').toUpperCase().trim(), u=cleanNumber(userNumber), p=await PromoCode.findOne({code:c}); if(!p)return {success:false,reason:'invalid_code'}; if(!p.active)return {success:false,reason:'inactive'}; if(p.expiresAt&&new Date(p.expiresAt)<=new Date())return {success:false,reason:'expired'}; if((p.usedBy||[]).includes(u))return {success:false,reason:'already_used_by_you'}; if(p.usedCount>=p.maxUses)return {success:false,reason:'limit_reached'}; await PromoCode.findOneAndUpdate({code:c},{$addToSet:{usedBy:u},$inc:{usedCount:1}}); await grantPromoPremium(u,c,p.premiumDays||30); return {success:true,remaining:Math.max(0,p.maxUses-p.usedCount-1),total:p.maxUses,premiumDays:p.premiumDays||30}; }
async function listPromoCodes(ownerNumber) { return await PromoCode.find({createdBy:cleanNumber(ownerNumber)}).sort({createdAt:-1}).limit(20); }
async function deletePromoCode(code,ownerNumber) { const p=await PromoCode.findOne({code:String(code||'').toUpperCase().trim(),createdBy:cleanNumber(ownerNumber)}); if(!p)return false; await PromoCode.deleteOne({_id:p._id}); return true; }
async function grantPromoPremium(number,code,days=30) { const n=cleanNumber(number), old=await PromoPremium.findOne({number:n}), now=new Date(), base=old?.expiresAt&&new Date(old.expiresAt)>now?new Date(old.expiresAt):now; await PromoPremium.findOneAndUpdate({number:n},{$set:{code:String(code).toUpperCase(),unlockedAt:now,expiresAt:new Date(base.getTime()+Number(days)*86400000)}},{upsert:true}); return true; }
async function hasPromoPremium(number) { const n=cleanNumber(number), p=await PromoPremium.findOne({number:n}); if(!p)return false; if(p.expiresAt&&new Date(p.expiresAt)<new Date()){await PromoPremium.deleteOne({number:n});return false;} return true; }

module.exports={connectdb,Session,UserConfig,OTP,ActiveNumber,Stats,PromoCode,PromoPremium,saveSessionToLocalStore,getSessionFromLocalStore,deleteSessionFromLocalStore,getUserConfigFromLocalStore,updateUserConfigInLocalStore,saveOTPToLocalStore,verifyOTPFromLocalStore,addNumberToLocalStore,removeNumberFromLocalStore,getAllNumbersFromLocalStore,incrementStats,getStatsForNumber,flushStats,createPromoCode,redeemPromoCode,listPromoCodes,deletePromoCode,grantPromoPremium,hasPromoPremium};
