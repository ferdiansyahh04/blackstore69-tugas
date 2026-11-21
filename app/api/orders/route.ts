import {advance} from '../../advance';
import {identity,sameOrigin,body,HttpError,handle,json} from '../../api-utils';
import {catalogFor} from '../../server-catalog';
import {database} from '../../../db';
import {createSumoPayment,sumoEnabled} from '../../sumopod-payments';
import {flushWhatsApp,normalizeWhatsapp,notifyOrder} from '../../fonnte';

export const dynamic='force-dynamic';

export async function GET(){
 return handle(async()=>{
  const user=await identity();const db=await database();await advance(db,user);
  const {results}=await db.prepare('SELECT id,game_id,game_name,sku,label,target,zone,method,amount,status,created_at,paid_at,completed_at,payment_url,payment_id,provider_order_id FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(user).all();
  return json({orders:results});
 });
}

export async function POST(req:Request){
 return handle(async()=>{
  sameOrigin(req);const user=await identity();const b=await body(req);
  if(!b||typeof b!=='object')throw new HttpError(400,'Data tidak valid.');
  const {gameId,sku,target,zone,whatsapp,method,requestKey}=b;
  if(typeof requestKey!=='string'||!/^[-a-zA-Z0-9]{16,80}$/.test(requestKey))throw new HttpError(400,'Kunci pesanan tidak valid.');
  const db=await database();
  const prior=await db.prepare('SELECT id FROM orders WHERE user_id=? AND request_key=?').bind(user,requestKey).first<{id:string}>();
  if(prior){await flushWhatsApp(db,{orderId:prior.id,limit:2});return json({id:prior.id});}
  const game=(await catalogFor('owner')).find(g=>g.id===gameId);const pack=game?.packs.find(p=>p.id===sku&&p.active);
  if(!game||!pack)throw new HttpError(400,'Nominal tidak tersedia. Pilih kembali.');
  if(typeof target!=='string')throw new HttpError(400,'Tujuan tidak valid.');
  const phoneProduct=game.id==='pulsa'||game.id==='paket-data';
  let normalizedTarget=target.trim();
  if(phoneProduct){
   if(!/^[+0-9 ()-]+$/.test(normalizedTarget))throw new HttpError(400,'Nomor HP hanya boleh berisi angka.');
   normalizedTarget=normalizedTarget.replace(/[ ()-]/g,'');
   if(normalizedTarget.startsWith('+62'))normalizedTarget='0'+normalizedTarget.slice(3);
   else if(normalizedTarget.startsWith('62'))normalizedTarget='0'+normalizedTarget.slice(2);
   if(!/^08\d{8,12}$/.test(normalizedTarget))throw new HttpError(400,'Nomor HP tidak valid. Gunakan format 08... atau 628...');
  }else if(normalizedTarget.length<3||normalizedTarget.length>40||!(/^[a-zA-Z0-9_.# -]+$/).test(normalizedTarget)){
   throw new HttpError(400,'ID tujuan harus 3–40 karakter berupa huruf, angka, spasi, titik, #, - atau _.');
  }
  if(typeof zone!=='string'||zone.length>10||(game.zone&&!/^\d{3,10}$/.test(zone)))throw new HttpError(400,'Server harus berisi 3–10 angka.');
  if(whatsapp!==undefined&&typeof whatsapp!=='string')throw new HttpError(400,'Nomor WhatsApp tidak valid.');
  const phone=typeof whatsapp==='string'&&whatsapp.trim()?normalizeWhatsapp(whatsapp):'';
  if(typeof whatsapp==='string'&&whatsapp.trim()&&!phone)throw new HttpError(400,'Nomor WhatsApp Indonesia tidak valid. Gunakan format 08... atau 628...');
  if(method!=='QRIS')throw new HttpError(400,'Saat ini pembayaran hanya tersedia melalui QRIS.');
  const count=await db.prepare('SELECT COUNT(*) AS count FROM orders WHERE user_id=? AND created_at>?').bind(user,Date.now()-60000).first<{count:number}>();
  if((count?.count??0)>=10)throw new HttpError(429,'Terlalu banyak pesanan. Coba lagi satu menit lagi.');
  if(!sumoEnabled())throw new HttpError(503,'Layanan pembayaran belum dikonfigurasi.');
  const id='BLK-'+crypto.randomUUID().replaceAll('-','').slice(0,16).toUpperCase();
  const payment=await createSumoPayment({orderId:id,amount:pack.price,method});
  await db.prepare('INSERT OR IGNORE INTO orders (id,user_id,request_key,game_id,game_name,sku,label,target,zone,whatsapp,method,amount,status,outcome,created_at,payment_url,payment_id,provider_order_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,user,requestKey,game.id,game.name,pack.id,pack.label,normalizedTarget,game.zone?zone:'',phone,method,pack.price,'pending','success',Date.now(),payment.payment_link_url,payment.payment_id,payment.order_id).run();
  await notifyOrder(db,id,'created');
  return json({id},201);
 });
}
