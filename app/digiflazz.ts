import {createHash, createHmac, timingSafeEqual, randomUUID} from 'node:crypto';
import type {database} from '../db';
import {queueWhatsApp} from './fonnte';
type DB = Awaited<ReturnType<typeof database>>;
type Tx = {order_id:string;ref_id:string;sku:string;status:string;last_try:number;attempts:number;response:string;customer_no:string|null;testing:number|null};
type Supplier = {ref_id?:unknown;buyer_sku_code?:unknown;customer_no?:unknown;status?:unknown;message?:unknown;rc?:unknown;sn?:unknown};
const MAP: Record<string, string> = {
  'ml-240': 'pre34145751', 'ml-257': 'pre34145752', 'ml-296': 'pre34145749',
  'ml-300': 'pre34145750', 'ml-355': 'pre34145753', 'ml-514': 'pre34145754',
  'ml-568': 'pre34145755', 'ml-875': 'pre34145757', 'ml-963': 'pre34145756',
  'ml-1159': 'pre34145758', 'ml-1412': 'pre34145759', 'ml-2010': 'pre34145760',
  'ff-70': 'ff70', 'ff-140': 'ff140', 'ff-150': 'pre34145727',
  'ff-190': 'pre34145728', 'ff-200': 'pre34145729', 'ff-300': 'pre34145730',
  'ff-355': 'ff355', 'ff-400': 'pre34145731', 'ff-500': 'pre34145732',
  'ff-600': 'pre34145733', 'ff-1000': 'pre34145734', 'ff-1075': 'pre34145735',
  'ff-1450': 'pre34145736', 'ff-2000': 'pre34145737', 'ff-2180': 'pre34145738',
  'ff-3640': 'pre34145739',
  'pubg-325': 'pre34145776', 'pubg-445': 'pre34145775', 'pubg-565': 'pre34145774',
  'pubg-660': 'pre34145773', 'pubg-780': 'pre34145772', 'pubg-985': 'pre34145771',
  'pubg-1320': 'pre34145770', 'pubg-1800': 'pre34145769', 'pubg-1980': 'pre34145768',
  'pubg-2125': 'pre34145767', 'pubg-2785': 'pre34145766', 'pubg-3120': 'pre34145765',
  'pubg-3850': 'pre34145764', 'pubg-4835': 'pre34145763', 'pubg-6000': 'pre34145762',
  'pubg-8100': 'pre34145761',
  'pb-1200': 'pre34073295', 'pb-2400': 'pre34073296', 'pb-6000': 'pre34073199',
  'pb-7000': 'pre34073298', 'pb-8400': 'pre34073299', 'pb-12000': 'pre34073297',
  'pb-15000': 'pre34073300', 'pb-18000': 'pre34073301', 'pb-24000': 'pre34073302',
  'pb-30000': 'pre34073303', 'pb-36000': 'pre34073305', 'pb-40800': 'pre34073304',
  'pb-45000': 'pre34073306', 'pb-60000': 'pre34073307',
  'valo-475': 'pre34073286', 'valo-950': 'pre34073287',
  'valo-1000': 'pre34073288', 'valo-1475': 'pre34073289',
  'mcgg-44': 'pre34197067', 'mcgg-59': 'pre34197066', 'mcgg-85': 'pre34197068',
  'mcgg-170': 'pre34197069', 'mcgg-240': 'pre34197070', 'mcgg-296': 'pre34318852',
  'mcgg-408': 'pre34318853', 'mcgg-568': 'pre34318854', 'mcgg-875': 'pre34318855',
  'mcgg-2010': 'pre34318856',
  'mcgg-first-50': 'pre34376769',
  'mcgg-first-150': 'pre34376770',
  'mcgg-first-250': 'pre34376771',
  'mcgg-first-500': 'pre34376772',
  'hok-80': 'pre34145777', 'hok-240': 'pre34145778', 'hok-400': 'pre34145779',
  'hok-560': 'pre34145785', 'hok-800': 'pre34145780', 'hok-1200': 'pre34145781',
  'hok-2400': 'pre34145782', 'hok-4000': 'pre34145783', 'hok-8000': 'pre34145784',
};
const ENDPOINT='https://api.digiflazz.com/v1/transaction';
const final=(s:string)=>s==='Sukses'||s==='Gagal';
const clean=(v:unknown,max=240)=>typeof v==='string'?v.slice(0,max):'';
export function initDigiflazz(db:DB){
 db.raw.exec(`CREATE TABLE IF NOT EXISTS digiflazz_transactions(order_id TEXT PRIMARY KEY,ref_id TEXT NOT NULL,sku TEXT NOT NULL,status TEXT NOT NULL,last_try INTEGER NOT NULL,attempts INTEGER NOT NULL,response TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS digiflazz_hook_log(id INTEGER PRIMARY KEY AUTOINCREMENT,at INTEGER NOT NULL,event TEXT NOT NULL,verified INTEGER NOT NULL,code INTEGER NOT NULL,reason TEXT NOT NULL,ref_id TEXT NOT NULL,status TEXT NOT NULL,rc TEXT NOT NULL);`);
 const cols=db.raw.prepare('PRAGMA table_info(digiflazz_transactions)').all() as unknown as {name:string}[];
 for(const [name,type] of [['customer_no','TEXT'],['testing','INTEGER']])if(!cols.some(c=>c.name===name))db.raw.exec('ALTER TABLE digiflazz_transactions ADD COLUMN '+name+' '+type);
}
export function configuration(){
 const base=(process.env.DIGIFLAZZ_BASE_URL||ENDPOINT).replace(/\/+$/,'');
 const endpointOK=[ENDPOINT,'https://api.digiflazz.com/v1','https://api.digiflazz.com'].includes(base);
 return {enabled:process.env.DIGIFLAZZ_ENABLED==='true',testing:process.env.DIGIFLAZZ_TESTING!=='false',usernameSet:!!process.env.DIGIFLAZZ_USERNAME?.trim(),keySet:!!process.env.DIGIFLAZZ_API_KEY?.trim(),secretSet:!!process.env.DIGIFLAZZ_WEBHOOK_SECRET,endpoint:ENDPOINT,endpointOK};
}
function ready(){const c=configuration();if(!c.enabled)return 'Integrasi belum aktif.';if(!c.usernameSet||!c.keySet)return 'Username atau API key belum diatur pada aplikasi.';if(c.testing&&!process.env.DIGIFLAZZ_API_KEY?.trim().startsWith('dev-'))return 'Mode development memerlukan Development API key.';if(!c.endpointOK)return 'DIGIFLAZZ_BASE_URL tidak dikenali.';return '';}
function codeFor(sku:string){
 let mapped='';
 try{const map=JSON.parse(process.env.DIGIFLAZZ_SKU_MAP||'{}');mapped=clean(map[sku]||MAP[sku],100);}catch{mapped=MAP[sku]||'';}
 if(mapped)return mapped;
 const direct=sku.startsWith('df-')?sku.slice(3):'';
 return /^[A-Za-z0-9._-]{1,100}$/.test(direct)?direct:'';
}
function txByOrder(db:DB,id:string){return db.raw.prepare('SELECT * FROM digiflazz_transactions WHERE order_id=?').get(id) as unknown as Tx|undefined;}
function log(db:DB,event:string,verified:boolean,code:number,reason:string,data:Supplier={}){
 // Only store allowlisted metadata. Ping payloads may contain the signing secret.
 db.raw.prepare('INSERT INTO digiflazz_hook_log(at,event,verified,code,reason,ref_id,status,rc) VALUES(?,?,?,?,?,?,?,?)').run(Date.now(),clean(event,40),verified?1:0,code,reason,clean(data.ref_id,120),clean(data.status,20),clean(data.rc,12));
 db.raw.exec('DELETE FROM digiflazz_hook_log WHERE id NOT IN (SELECT id FROM digiflazz_hook_log ORDER BY id DESC LIMIT 300)');
}
function safeData(data:Supplier){return {status:clean(data.status,20),message:clean(data.message),rc:clean(data.rc,12),sn:clean(data.sn,300)};}
export function applySupplier(db:DB,ref:string,data:Supplier,source:string){
 db.raw.exec('BEGIN IMMEDIATE');
 try{
  const tx=db.raw.prepare('SELECT * FROM digiflazz_transactions WHERE ref_id=?').get(ref) as unknown as Tx|undefined;
  let reason='ref_id_not_found';
  if(tx){
   const order=db.raw.prepare('SELECT target,game_id FROM orders WHERE id=?').get(tx.order_id) as {target:string;game_id:string}|undefined;
   const target=tx.customer_no||order?.target;
   if(!target||data.ref_id!==tx.ref_id||data.buyer_sku_code!==tx.sku||data.customer_no!==target)reason='identity_mismatch';
   else if(!['Sukses','Gagal','Pending'].includes(String(data.status)))reason='invalid_status';
   else if(order&&['pln-prabayar','pln-pascabayar','pdam'].includes(order.game_id)&&data.status==='Sukses'&&(!tx.attempts||!clean(data.sn,300)))reason='missing_receipt';
   else if(final(tx.status))reason=tx.status===data.status?'duplicate_final':'final_preserved';
   else {
    db.raw.prepare('UPDATE digiflazz_transactions SET status=?,response=? WHERE order_id=?').run(String(data.status),JSON.stringify({...safeData(data),source}),tx.order_id);
    if(data.status==='Sukses'||data.status==='Gagal'){
     const state=data.status==='Sukses'?'success':'failed';
     db.raw.prepare("UPDATE orders SET status=?,outcome=?,completed_at=? WHERE id=? AND status='processing'").run(state,state,Date.now(),tx.order_id);
     queueWhatsApp(db,tx.order_id,data.status==='Sukses'?'success':'failed');
    }
    reason='status_applied';
   }
  }
  db.raw.exec('COMMIT');return reason;
 }catch(e){db.raw.exec('ROLLBACK');throw e;}
}
export function receiveDigiflazz(db:DB,raw:Buffer,signature:string|null,event:string){
 initDigiflazz(db);
 const done=(code:number,reason:string,verified=false,data:Supplier={})=>{log(db,event,verified,code,reason,data);return {code,body:{received:code===200,reason}};};
 const secret=process.env.DIGIFLAZZ_WEBHOOK_SECRET;
 if(!secret)return done(503,'secret_not_configured');
 const actual=Buffer.from(signature||'');const expected=Buffer.from('sha1='+createHmac('sha1',secret).update(raw).digest('hex'));
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return done(401,'signature_invalid');
 let payload;try{payload=JSON.parse(raw.toString('utf8'));}catch{return done(400,'invalid_json',true);}
 if(event==='ping')return done(200,'ping_received',true);
 const data=payload?.data;
 if(!data||typeof data.ref_id!=='string'||!/^[-A-Za-z0-9_]{3,120}$/.test(data.ref_id)||!['Sukses','Pending','Gagal'].includes(data.status))return done(400,'invalid_payload',true);
 const reason=applySupplier(db,data.ref_id,data,'webhook');
 return done(reason==='identity_mismatch'?422:200,reason,true,data);
}
async function sendStored(db:DB,id:string){
 // Claim a persisted reference before network I/O, including across worker processes.
 const tx=txByOrder(db,id);if(!tx)return {sent:false,reason:'Transaksi supplier belum tercatat.'};
 if(final(tx.status))return {sent:false,reason:'Status supplier sudah final.',status:tx.status};
 if((tx.testing!==0&&tx.testing!==1)||!tx.customer_no)return {sent:false,reason:'Identitas atau mode transaksi belum lengkap.'};
 const now=Date.now();
 const claim=db.raw.prepare("UPDATE digiflazz_transactions SET last_try=?,attempts=attempts+1 WHERE order_id=? AND status NOT IN ('Sukses','Gagal') AND last_try<=?").run(now,id,now-60000);
 if(!Number(claim.changes))return {sent:false,reason:'Tunggu 60 detik sebelum cek ulang.'};
 const username=process.env.DIGIFLAZZ_USERNAME!.trim(),key=process.env.DIGIFLAZZ_API_KEY!.trim();
 const payload={username,sign:createHash('md5').update(username+key+tx.ref_id).digest('hex'),ref_id:tx.ref_id,buyer_sku_code:tx.sku,customer_no:tx.customer_no,...(tx.testing===1?{testing:true}:{})};
 let reason='';let statusCode=0;
 try{
  const response=await fetch(ENDPOINT,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000),redirect:'error'});
  statusCode=response.status;let result;try{result=await response.json();}catch{result=null;}
  const data=result?.data as Supplier|undefined;
  // HTTP/server/auth failures do not prove a top-up has failed. Preserve pending.
  if(!response.ok)reason='HTTP '+response.status+' dari Digiflazz. Periksa konfigurasi/akses API.';
  else if(!data)reason='Respons Digiflazz bukan data transaksi yang valid.';
  else {const applied=applySupplier(db,tx.ref_id,data,'api');if(['status_applied','duplicate_final','final_preserved'].includes(applied))return {sent:true,status:txByOrder(db,id)?.status,reason:applied};reason='Respons tidak cocok dengan transaksi: '+applied;}
 }catch{reason='Koneksi Digiflazz gagal atau melewati batas waktu. Referensi dipertahankan untuk cek ulang.';}
 db.raw.prepare("UPDATE digiflazz_transactions SET response=? WHERE order_id=? AND status NOT IN ('Sukses','Gagal')").run(JSON.stringify({message:reason,http_status:statusCode,source:'api'}),id);
 return {sent:true,status:txByOrder(db,id)?.status,reason};
}
export async function dispatchOrder(db:DB,orderId:string){
 const utility=db.raw.prepare('SELECT game_id FROM orders WHERE id=?').get(orderId) as {game_id:string}|undefined;
 if(utility&&['pln-prabayar','pln-pascabayar','pdam'].includes(utility.game_id))return (await import('./utility-fulfillment')).dispatchUtility(db,orderId);
 initDigiflazz(db);const problem=ready();if(problem)return {sent:false,reason:problem};
 const order=db.raw.prepare('SELECT id,game_id,sku,target,zone,status FROM orders WHERE id=?').get(orderId) as {id:string;game_id:string;sku:string;target:string;zone:string;status:string}|undefined;
 if(!order||order.status!=='processing')return {sent:false,reason:'Pesanan tidak dalam tahap proses.'};
 const customerNo=order.zone?order.target+order.zone:order.target;
 let prior=txByOrder(db,orderId);
 if(!prior){const sku=codeFor(order.sku);if(!sku)return {sent:false,reason:'SKU belum dipetakan ke Digiflazz.'};
 db.raw.prepare('INSERT OR IGNORE INTO digiflazz_transactions(order_id,ref_id,sku,status,last_try,attempts,response,customer_no,testing) VALUES(?,?,?,?,?,?,?,?,?)').run(orderId,orderId,sku,'Pending',0,0,'{}',customerNo,configuration().testing?1:0);
 }else if(prior.testing===null){
  db.raw.prepare('UPDATE digiflazz_transactions SET testing=?,customer_no=COALESCE(customer_no,?) WHERE order_id=? AND testing IS NULL').run(configuration().testing?1:0,customerNo,orderId);
 }
 return sendStored(db,orderId);
}
export async function dispatchForUser(db:DB,user:string){
 if(ready())return;
 const orders=db.raw.prepare("SELECT id FROM orders WHERE user_id=? AND status='processing' ORDER BY created_at DESC LIMIT 3").all(user) as unknown as {id:string}[];
 for(const order of orders)await dispatchOrder(db,order.id);
}
export async function recheckDigiflazz(db:DB,id:string){initDigiflazz(db);const problem=ready();if(problem)return {sent:false,reason:problem};if(id.startsWith('DGTEST-'))return sendStored(db,id);return dispatchOrder(db,id);}
export async function createDigiflazzProbe(db:DB,outcome:'success'|'failed'){
 initDigiflazz(db);const problem=ready();if(problem)return {sent:false,reason:problem};
 if(!configuration().testing)return {sent:false,reason:'Tes callback hanya tersedia pada mode development.'};
 const recent=db.raw.prepare("SELECT order_id FROM digiflazz_transactions WHERE order_id LIKE 'DGTEST-%' AND last_try>? LIMIT 1").get(Date.now()-60000);
 if(recent)return {sent:false,reason:'Tunggu satu menit sebelum tes baru.'};
 const id='DGTEST-'+randomUUID().replace(/-/g,'').slice(0,24);
 db.raw.prepare('INSERT INTO digiflazz_transactions(order_id,ref_id,sku,status,last_try,attempts,response,customer_no,testing) VALUES(?,?,?,?,?,?,?,?,?)').run(id,id,'xld10','Pending',0,0,'{}',outcome==='success'?'087800001233':'087800001234',1);
 return {...await sendStored(db,id),ref_id:id};
}
export function digiflazzDiagnostics(db:DB){
 initDigiflazz(db);
 const rows=db.raw.prepare("SELECT t.*,o.status AS order_status FROM digiflazz_transactions t LEFT JOIN orders o ON o.id=t.order_id ORDER BY t.last_try DESC LIMIT 30").all() as unknown as (Tx & {order_status:string|null})[];
 const transactions=rows.map(t=>{let data;try{data=JSON.parse(t.response);}catch{data={};}const value=data?.data?.data||data?.data||data||{};return {order_id:t.order_id,ref_id:t.ref_id,sku:t.sku,status:t.status,order_status:t.order_status,last_try:t.last_try,attempts:t.attempts,testing:t.testing,...{message:clean(value.message||data.message),rc:clean(value.rc||data.rc,12)}};});
 const pending=db.raw.prepare("SELECT o.id,o.sku FROM orders o LEFT JOIN digiflazz_transactions t ON t.order_id=o.id WHERE o.status='processing' AND t.order_id IS NULL ORDER BY o.created_at DESC LIMIT 30").all();
 return {config:configuration(),problem:ready(),transactions,pending,events:db.raw.prepare('SELECT * FROM digiflazz_hook_log ORDER BY id DESC LIMIT 50').all()};
}
