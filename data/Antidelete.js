// Antidelete settings stored in local JSON storage; no MongoDB required.
const fs = require('fs');
const path = require('path');
const DATA_DIR = process.env.RIZO_DATA_DIR || path.join(__dirname, 'store');
const FILE = path.join(DATA_DIR, 'antidelete.json');
fs.mkdirSync(DATA_DIR, { recursive: true });
function read() { try { const x=JSON.parse(fs.readFileSync(FILE,'utf8')); return Array.isArray(x)?x:[]; } catch { return []; } }
function write(rows) { const tmp=FILE+'.tmp'; fs.writeFileSync(tmp,JSON.stringify(rows,null,2)); fs.renameSync(tmp,FILE); }
const Antidelete = {
  async findOne(query={}) { return read().find(x=>x.chatId===query.chatId)||null; },
  async findOneAndUpdate(query={}, update={}, options={}) { const rows=read(); let row=rows.find(x=>x.chatId===query.chatId); if(!row&&options.upsert){row={chatId:query.chatId,status:false};rows.push(row);} if(!row)return null; Object.assign(row,update.$set||update);write(rows);return row; }
};
const getAntideleteStatus = async chatId => { try { const x=await Antidelete.findOne({chatId}); return Boolean(x&&x.status); } catch { return false; } };
const setAntideleteStatus = async (chatId,status) => { try { await Antidelete.findOneAndUpdate({chatId},{status:Boolean(status)},{upsert:true,new:true});return true; } catch { return false; } };
module.exports={Antidelete,getAntideleteStatus,setAntideleteStatus};
