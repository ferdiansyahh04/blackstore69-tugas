import {createHash} from 'node:crypto';
import type {database} from '../db';
import {kirimdevConfiguration,kirimdevReady,kirimRequest,KirimdevError,messagePath,messageResult,TEMPLATE_NAME} from './kirimdev';
type DB=Awaited<ReturnType<typeof database>>;
type Event='created'|'success'|'failed'|'expired';
type Order={id:string;game_name:string;label:string;target:string;zone:string;amount:number;status:string;whatsapp:string|null};
type Notice={id:number;order_id:string;event:Event;target:string;status:string;attempts:number;created_at:number;last_try:number;payload_json:string;first_attempt_at:number;message_id:string;sender_id:string;idempotency_key:string};
export function normalizeWhatsapp(value:string){let n=value.replace(/\D/g,'');if(n.startsWith('0'))n='62'+n.slice(1);else if(n.startsWith('8'))n='62'+n;return /^62\d{8,13}$/.test(n)?n:'';}
const initialized=new WeakSet<object>();
export function initWhatsApp(db:DB){
 if(initialized.has(db))return;
 db.raw.exec('BEGIN IMMEDIATE');
 try{
  const names=new Set((db.raw.prepare('PRAGMA table_info(whatsapp_notifications)').all() as {name:string}[]).map(c=>c.name));
  const cols:Record<string,string>={provider:"TEXT NOT NULL DEFAULT 'fonnte'",message_id:"TEXT NOT NULL DEFAULT ''",sender_id:"TEXT NOT NULL DEFAULT ''",payload_json:"TEXT NOT NULL DEFAULT ''",idempotency_key:"TEXT NOT NULL DEFAULT ''",first_attempt_at:'INTEGER NOT NULL DEFAULT 0',next_try:'INTEGER NOT NULL DEFAULT 0',checked_at:'INTEGER NOT NULL DEFAULT 0'};
  for(const [name,type] of Object.entries(cols))if(!names.has(name))db.raw.exec('ALTER TABLE whatsapp_notifications ADD COLUMN '+name+' '+type);
  db.raw.exec("UPDATE whatsapp_notifications SET status='archived',response='Riwayat penyedia sebelumnya; tidak dikirim ulang.' WHERE provider='fonnte' AND status IN ('pending','failed','sending'); CREATE INDEX IF NOT EXISTS idx_wa_provider_queue ON whatsapp_notifications(provider,status,next_try);");
  db.raw.exec('COMMIT');initialized.add(db);
 }catch(e){db.raw.exec('ROLLBACK');throw e;}
}
export function queueWhatsApp(db:DB,orderId:string,event:Event){
 try{
  initWhatsApp(db);const order=db.raw.prepare('SELECT whatsapp FROM orders WHERE id=?').get(orderId) as {whatsapp:string|null}|undefined;
  const target=normalizeWhatsapp(order?.whatsapp||'');if(!target)return false;
  const status=kirimdevReady()?'pending':'disabled';
  return Number(db.raw.prepare("INSERT OR IGNORE INTO whatsapp_notifications(order_id,event,target,status,attempts,last_try,response,created_at,provider) VALUES(?,?,?,?,0,0,'',?,'kirimdev')").run(orderId,event,target,status,Date.now()).changes)>0;
 }catch{console.error('WhatsApp: gagal mencatat notifikasi.');return false;}
}
function payload(order:Order,event:Event,target:string){
 const text=(s:string)=>s.replace(/\s+/g,' ').trim().slice(0,300)||'-';
 const status={created:'Menunggu pembayaran',success:'Selesai',failed:'Gagal diproses. Hubungi admin melalui halaman kontak.',expired:'Waktu pembayaran berakhir'}[event];
 const site=new URL(process.env.SITE_ORIGIN||'https://blackstore69.web.id').origin;
 const values=[order.id,order.game_name+' - '+order.label,order.target+(order.zone?' ('+order.zone+')':''),new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(order.amount),status,site+'/pesanan/'+encodeURIComponent(order.id)];
 return JSON.stringify({messaging_product:'whatsapp',to:'+'+target,type:'template',template:{name:TEMPLATE_NAME,language:'id',components:[{type:'body',parameters:values.map(v=>({type:'text',text:text(v)}))}]}});
}
function matches(order:Order,event:Event){return order.status===({created:'pending',success:'success',failed:'failed',expired:'expired'}[event]);}
async function sendRow(db:DB,row:Notice){
 const now=Date.now();
 // Kirimdev retains idempotency keys for 24h. Stop well before that boundary.
 if((row.first_attempt_at&&now-row.first_attempt_at>=23*3600000)||row.attempts>=8){db.raw.prepare("UPDATE whatsapp_notifications SET status='uncertain',response='Periksa riwayat Kirimdev sebelum mengirim ulang.' WHERE id=? AND status IN ('pending','retry','sending')").run(row.id);return false;}
 const order=db.raw.prepare('SELECT * FROM orders WHERE id=?').get(row.order_id) as Order|undefined;
 if(!row.payload_json&&(!order||!matches(order,row.event))){db.raw.prepare("UPDATE whatsapp_notifications SET status='skipped',response='Status pesanan sudah berubah.' WHERE id=? AND status IN ('pending','retry','sending')").run(row.id);return false;}
 const body=row.payload_json||payload(order!,row.event,row.target);
 const sender=row.sender_id||process.env.KIRIMDEV_PHONE_NUMBER_ID!.trim();
 // Persist the exact request before sending, including the sender across restarts.
 const key=row.idempotency_key||'blackstore69-'+createHash('sha256').update(row.order_id+':'+row.event+':'+sender).digest('hex');
 const claimed=db.raw.prepare("UPDATE whatsapp_notifications SET status='sending',attempts=attempts+1,last_try=?,next_try=?,payload_json=?,sender_id=?,idempotency_key=?,first_attempt_at=CASE WHEN first_attempt_at=0 THEN ? ELSE first_attempt_at END WHERE id=? AND provider='kirimdev' AND status IN ('pending','retry','sending') AND next_try<=?").run(now,now+60000,body,sender,key,now,row.id,now);
 if(!Number(claimed.changes))return false;
 try{
  const msg=messageResult(await kirimRequest(messagePath(sender),body,key));
  const state=msg.status==='pending'?'accepted':msg.status;
  db.raw.prepare('UPDATE whatsapp_notifications SET status=?,message_id=?,response=?,sent_at=?,checked_at=? WHERE id=?').run(state,msg.id,'API: '+msg.status,['sent','delivered','read'].includes(state)?now:null,now,row.id);
  return state!=='failed';
 }catch(e){
  const retry=e instanceof KirimdevError&&e.retryable;
  const detail=e instanceof KirimdevError?e.message:'Pengiriman belum dapat dikonfirmasi.';
  const wait=Math.min(3600000,60000*2**Math.min(row.attempts,6));
  db.raw.prepare('UPDATE whatsapp_notifications SET status=?,response=?,next_try=? WHERE id=?').run(retry?'retry':'failed',detail,now+wait,row.id);return false;
 }
}
export async function refreshWhatsApp(db:DB,limit=10){
 initWhatsApp(db);if(!kirimdevReady())return 0;
 const now=Date.now();
 const rows=db.raw.prepare("SELECT * FROM whatsapp_notifications WHERE provider='kirimdev' AND message_id<>'' AND status IN ('accepted','sent') AND checked_at<=? AND first_attempt_at>=? ORDER BY checked_at ASC LIMIT ?").all(now-60000,now-7*86400000,Math.max(1,Math.min(limit,20))) as unknown as Notice[];
 let checked=0;
 for(const row of rows){
  if(!Number(db.raw.prepare('UPDATE whatsapp_notifications SET checked_at=? WHERE id=? AND checked_at<=?').run(now,row.id,now-60000).changes))continue;
  try{
   const msg=messageResult(await kirimRequest(messagePath(row.sender_id,row.message_id)));
   if(msg.id!==row.message_id)continue;
   const state=msg.status==='pending'?'accepted':msg.status;
   if(row.status==='sent'&&state==='accepted')continue;
   db.raw.prepare('UPDATE whatsapp_notifications SET status=?,response=?,sent_at=CASE WHEN ? IN (\'sent\',\'delivered\',\'read\') THEN COALESCE(sent_at,?) ELSE sent_at END WHERE id=?').run(state,'API: '+msg.status,state,now,row.id);checked++;
  }catch{db.raw.prepare("UPDATE whatsapp_notifications SET response='Pemeriksaan status tertunda; pesan tidak dikirim ulang.' WHERE id=?").run(row.id);}
 }
 return checked;
}
export async function flushWhatsApp(db:DB,options:{orderId?:string;userId?:string;limit?:number}={}){
 try{
  initWhatsApp(db);if(!kirimdevReady())return {enabled:false,sent:0};
  const where=["n.provider='kirimdev'","n.status IN ('pending','retry','sending')",'n.next_try<=?'];const args:(string|number)[]=[Date.now()];
  if(options.orderId){where.push('n.order_id=?');args.push(options.orderId);}
  if(options.userId){where.push('o.user_id=?');args.push(options.userId);}
  const rows=db.raw.prepare('SELECT n.* FROM whatsapp_notifications n JOIN orders o ON o.id=n.order_id WHERE '+where.join(' AND ')+' ORDER BY n.id LIMIT ?').all(...args,Math.max(1,Math.min(options.limit||5,10))) as unknown as Notice[];
  let sent=0;for(const row of rows)if(await sendRow(db,row))sent++;return {enabled:true,sent};
 }catch{console.error('WhatsApp: antrean tertunda; transaksi tetap berjalan.');return {enabled:kirimdevReady(),sent:0};}
}
export async function notifyOrder(db:DB,orderId:string,event:Event){queueWhatsApp(db,orderId,event);return flushWhatsApp(db,{orderId,limit:2});}
export function whatsappDiagnostics(db:DB){initWhatsApp(db);return {config:kirimdevConfiguration(),notifications:db.raw.prepare('SELECT id,order_id,event,substr(target,-4) target,status,attempts,last_try,response,created_at,sent_at,provider FROM whatsapp_notifications ORDER BY id DESC LIMIT 100').all()};}
