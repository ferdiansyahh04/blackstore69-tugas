import type {database} from '../db';

type DB=Awaited<ReturnType<typeof database>>;
type Event='created'|'success'|'failed'|'expired';
type OrderRow={id:string;user_id:string;game_name:string;label:string;target:string;zone:string;method:string;amount:number;status:string;whatsapp:string|null;payment_url:string|null};
type NoticeRow={id:number;order_id:string;event:Event;target:string;status:string;attempts:number;last_try:number;response:string;created_at:number;sent_at:number|null};

const ENDPOINT='https://api.fonnte.com/send';
const SITE=()=>new URL(process.env.SITE_ORIGIN||'https://blackstore69.web.id').origin;
const clean=(value:unknown,max=500)=>typeof value==='string'?value.slice(0,max):'';

export function fonnteConfiguration(){
 return {
  enabled:process.env.FONNTE_ENABLED==='true',
  tokenSet:!!process.env.FONNTE_TOKEN?.trim(),
  endpoint:ENDPOINT,
  businessTarget:normalizeWhatsapp(process.env.BUSINESS_WHATSAPP||''),
 };
}

export function normalizeWhatsapp(value:string){
 let digits=value.replace(/\D/g,'');
 if(digits.startsWith('0'))digits='62'+digits.slice(1);
 else if(digits.startsWith('8'))digits='62'+digits;
 return /^62\d{8,13}$/.test(digits)?digits:'';
}

export function initFonnte(db:DB){
 db.raw.exec(`CREATE TABLE IF NOT EXISTS whatsapp_notifications(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  event TEXT NOT NULL,
  target TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  last_try INTEGER NOT NULL,
  response TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  sent_at INTEGER,
  UNIQUE(order_id,event)
 );
 CREATE INDEX IF NOT EXISTS idx_whatsapp_status_try ON whatsapp_notifications(status,last_try);`);
}

export function queueWhatsApp(db:DB,orderId:string,event:Event){
 initFonnte(db);
 const order=db.raw.prepare('SELECT whatsapp FROM orders WHERE id=?').get(orderId) as {whatsapp:string|null}|undefined;
 const target=normalizeWhatsapp(order?.whatsapp||'');
 if(!target)return false;
 db.raw.prepare("INSERT OR IGNORE INTO whatsapp_notifications(order_id,event,target,status,attempts,last_try,response,created_at) VALUES(?,?,?,'pending',0,0,'',?)").run(orderId,event,target,Date.now());
 return true;
}

function money(value:number){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(value)}
function detailTarget(order:OrderRow){return order.target+(order.zone?' ('+order.zone+')':'')}
function providerSerial(db:DB,orderId:string){
 const row=db.raw.prepare('SELECT response FROM digiflazz_transactions WHERE order_id=?').get(orderId) as {response:string}|undefined;
 if(!row)return '';
 try{const data=JSON.parse(row.response);return clean(data?.sn||data?.data?.sn||data?.data?.data?.sn,300)}catch{return ''}
}
function messageFor(db:DB,order:OrderRow,event:Event){
 const track=SITE()+'/pesanan/'+encodeURIComponent(order.id);
 const head='Halo Pelanggan 👋\n\n';
 const base=`🧾 No. Pesanan: *${order.id}*\n📦 Produk/layanan: *${order.game_name} - ${order.label}*\n📍 Tujuan: *${detailTarget(order)}*\n💰 Total: *${money(order.amount)}*`;
 if(event==='created')return head+'🎉 *Pesanan kamu berhasil dibuat.*\n\n'+base+`\n📌 Status: *Menunggu pembayaran*\n\n💳 Lanjutkan pembayaran:\n${order.payment_url||track}\n\nPantau pesanan:\n${track}\n\nSimpan nomor pesanan ini. Jangan bagikan OTP atau kata sandi kepada siapa pun.\n\n© black.store69`;
 if(event==='success'){
  const serial=providerSerial(db,order.id);
  return head+'✅ *Pesanan kamu berhasil diproses.*\n\n'+base+(serial?`\n🔐 Token / bukti: *${serial}*`:'')+`\n📦 Status: *Selesai*\n\nTerima kasih sudah berbelanja di black.store69 ⚡\n\nDetail pesanan:\n${track}\n\n© black.store69`;
 }
 if(event==='failed')return head+'❌ *Pesanan belum berhasil diproses.*\n\n'+base+`\n📦 Status: *Gagal*\n\nHubungi dukungan dan sertakan nomor pesanan agar dapat kami periksa:\n${SITE()}/kontak\n\n© black.store69`;
 return head+'⌛ *Waktu pembayaran pesanan telah berakhir.*\n\n'+base+`\n📌 Status: *Kedaluwarsa*\n\nSilakan buat pesanan baru jika masih ingin melanjutkan.\n\n© black.store69`;
}

async function sendRow(db:DB,row:NoticeRow){
 const config=fonnteConfiguration(),token=process.env.FONNTE_TOKEN?.trim();
 if(!config.enabled||!token)return {sent:false,reason:'Fonnte belum diaktifkan.'};
 const now=Date.now();
 const claim=db.raw.prepare("UPDATE whatsapp_notifications SET attempts=attempts+1,last_try=?,status='sending' WHERE id=? AND status IN ('pending','failed') AND last_try<=?").run(now,row.id,now-60000);
 if(!Number(claim.changes))return {sent:false,reason:'Notifikasi sedang diproses atau menunggu jadwal ulang.'};
 const order=db.raw.prepare('SELECT id,user_id,game_name,label,target,zone,method,amount,status,whatsapp,payment_url FROM orders WHERE id=?').get(row.order_id) as OrderRow|undefined;
 if(!order){db.raw.prepare("UPDATE whatsapp_notifications SET status='failed',response=? WHERE id=?").run('Pesanan tidak ditemukan.',row.id);return {sent:false,reason:'Pesanan tidak ditemukan.'}}
 const form=new FormData();form.set('target',row.target);form.set('message',messageFor(db,order,row.event));form.set('countryCode','0');form.set('preview','true');
 let reason='Koneksi Fonnte gagal.';
 try{
  const response=await fetch(ENDPOINT,{method:'POST',headers:{Authorization:token},body:form,signal:AbortSignal.timeout(8000),redirect:'error'});
  const text=await response.text();let data:Record<string,unknown>={};try{data=JSON.parse(text)}catch{}
  const ok=response.ok&&(data.status===true||data.Status===true);
  reason=clean(data.detail||data.reason||text,500)||('HTTP '+response.status);
  db.raw.prepare('UPDATE whatsapp_notifications SET status=?,response=?,sent_at=? WHERE id=?').run(ok?'sent':'failed',reason,ok?Date.now():null,row.id);
  return {sent:ok,reason};
 }catch{
  db.raw.prepare("UPDATE whatsapp_notifications SET status='failed',response=? WHERE id=?").run(reason,row.id);
  return {sent:false,reason};
 }
}

export async function flushWhatsApp(db:DB,options:{orderId?:string;userId?:string;limit?:number}={}){
 initFonnte(db);
 const config=fonnteConfiguration();if(!config.enabled||!config.tokenSet)return {enabled:false,sent:0};
 const where=["n.status IN ('pending','failed')","n.last_try<=?"];const args:(string|number)[]=[Date.now()-60000];
 if(options.orderId){where.push('n.order_id=?');args.push(options.orderId)}
 if(options.userId){where.push('o.user_id=?');args.push(options.userId)}
 const limit=Math.max(1,Math.min(options.limit||5,10));
 const rows=db.raw.prepare(`SELECT n.* FROM whatsapp_notifications n JOIN orders o ON o.id=n.order_id WHERE ${where.join(' AND ')} ORDER BY n.id ASC LIMIT ${limit}`).all(...args) as unknown as NoticeRow[];
 let sent=0;for(const row of rows){const result=await sendRow(db,row);if(result.sent)sent++}
 return {enabled:true,sent};
}

export async function notifyOrder(db:DB,orderId:string,event:Event){queueWhatsApp(db,orderId,event);return flushWhatsApp(db,{orderId,limit:4})}

export async function sendFonnteTest(target:string){
 const config=fonnteConfiguration(),token=process.env.FONNTE_TOKEN?.trim(),normalized=normalizeWhatsapp(target);
 if(!config.enabled||!token)throw new Error('Fonnte belum dikonfigurasi.');
 if(!normalized)throw new Error('Nomor WhatsApp tujuan tidak valid.');
 const form=new FormData();form.set('target',normalized);form.set('countryCode','0');form.set('message','✅ Tes koneksi invoice WhatsApp black.store69 berhasil.\n\nPerangkat Fonnte dan API website sudah terhubung.');
 const response=await fetch(ENDPOINT,{method:'POST',headers:{Authorization:token},body:form,signal:AbortSignal.timeout(8000),redirect:'error'});
 const text=await response.text();let data:Record<string,unknown>={};try{data=JSON.parse(text)}catch{}
 if(!response.ok||(data.status!==true&&data.Status!==true))throw new Error(clean(data.reason||data.detail||text,300)||'Fonnte menolak pesan tes.');
 return {ok:true,detail:clean(data.detail,300)};
}

export function fonnteDiagnostics(db:DB){
 initFonnte(db);
 return {config:fonnteConfiguration(),notifications:db.raw.prepare('SELECT id,order_id,event,target,status,attempts,last_try,response,created_at,sent_at FROM whatsapp_notifications ORDER BY id DESC LIMIT 100').all()};
}
