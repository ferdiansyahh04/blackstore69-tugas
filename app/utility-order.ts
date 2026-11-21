import {randomUUID} from 'node:crypto';
import {HttpError} from './api-utils';
import {initUtilities,beforeBillingCutoff,jakartaDay,qrFee,type Store,type ProductRow,type QuoteRow} from './utility-store';
import {utilityServices} from './utility-types';
import {createSumoPayment,sumoEnabled} from './sumopod-payments';
import {normalizeWhatsapp,notifyOrder} from './fonnte';
export async function createUtilityOrder(db:Store,user:string,input:{quoteId?:unknown;whatsapp?:unknown;requestKey?:unknown;agreed?:unknown}){
 initUtilities(db);const {quoteId,whatsapp,requestKey,agreed}=input;
 if(typeof requestKey!=='string'||!/^[-A-Za-z0-9]{16,80}$/.test(requestKey)||typeof quoteId!=='string'||agreed!==true)throw new HttpError(400,'Periksa data dan setujui syarat transaksi terlebih dahulu.');
 const old=db.raw.prepare('SELECT id FROM orders WHERE user_id=? AND request_key=?').get(user,requestKey) as {id:string}|undefined;if(old)return old;
 if(whatsapp!==undefined&&typeof whatsapp!=='string')throw new HttpError(400,'Nomor WhatsApp tidak valid.');
 const phone=typeof whatsapp==='string'&&whatsapp.trim()?normalizeWhatsapp(whatsapp):'';
 if(typeof whatsapp==='string'&&whatsapp.trim()&&!phone)throw new HttpError(400,'Nomor WhatsApp tidak valid.');
 if(!sumoEnabled())throw new HttpError(503,'Pembayaran belum tersedia.');
 const now=Date.now();let id='BLK-'+randomUUID().replaceAll('-','').slice(0,16).toUpperCase();let q:QuoteRow;
 db.raw.exec('BEGIN IMMEDIATE');try{
 const found=db.raw.prepare('SELECT * FROM utility_quotes WHERE id=? AND user_id=?').get(quoteId,user) as QuoteRow|undefined;
 if(!found)throw new HttpError(404,'Hasil pengecekan tidak ditemukan.');q=found;
 if(q.order_id){db.raw.exec('COMMIT');return {id:q.order_id};}
 if(q.state!=='ready'||q.expires_at<=now)throw new HttpError(400,'Hasil pengecekan sudah kedaluwarsa. Cek kembali pelanggan/tagihan.');
 if(q.kind!=='pln-prabayar'&&(!beforeBillingCutoff(now)||jakartaDay(now)!==jakartaDay(q.created_at)))throw new HttpError(400,'Waktu pembayaran tagihan hari ini berakhir. Silakan cek kembali besok.');
 const p=db.raw.prepare('SELECT * FROM utility_products WHERE id=? AND enabled=1').get(q.product_id) as ProductRow|undefined;
 if(!p||p.sku!==q.sku||(q.kind==='pln-prabayar'&&p.cost>q.cost))throw new HttpError(400,'Produk atau harga telah berubah. Cek kembali sebelum membayar.');
 if(!Number.isSafeInteger(q.amount)||q.amount<10000||q.amount-qrFee(q.amount)-q.cost<100)throw new HttpError(400,'Total pembayaran tidak valid.');
 if(q.kind!=='pln-prabayar'){
 const existing=db.raw.prepare("SELECT o.id FROM utility_quotes u JOIN orders o ON o.id=u.order_id WHERE u.sku=? AND u.target=? AND (o.status IN ('pending','processing') OR (u.period=? AND o.status='success')) LIMIT 1").get(q.sku,q.target,q.period);
 if(existing)throw new HttpError(409,'Tagihan ini sudah memiliki pesanan. Periksa riwayat atau hubungi admin.');
 }
 const count=db.raw.prepare('SELECT COUNT(*) AS n FROM orders WHERE user_id=? AND created_at>?').get(user,now-60000) as {n:number};if(count.n>=10)throw new HttpError(429,'Terlalu banyak pesanan. Tunggu satu menit.');
 const name=utilityServices.find(s=>s.id===q.kind)!.name;
 db.raw.prepare("INSERT INTO orders(id,user_id,request_key,game_id,game_name,sku,label,target,zone,whatsapp,method,amount,status,outcome,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,'QRIS',?,'pending','success',?)").run(id,user,requestKey,q.kind,name,q.product_id,p.name,q.target,'',phone,q.amount,now);
 db.raw.prepare("UPDATE utility_quotes SET order_id=?,state='ordered' WHERE id=?").run(id,q.id);
 db.raw.exec('COMMIT');
 }catch(e){db.raw.exec('ROLLBACK');throw e;}
 try{
 const payment=await createSumoPayment({orderId:id,amount:q.amount,method:'QRIS',singleAttempt:true});
 db.raw.prepare('UPDATE orders SET payment_id=?,provider_order_id=?,payment_url=? WHERE id=? AND payment_id IS NULL').run(payment.payment_id,payment.order_id,payment.payment_link_url,id);
 await notifyOrder(db,id,'created');return {id};
 }catch{throw new HttpError(503,'Tautan pembayaran belum tersedia. Periksa riwayat pesanan atau hubungi admin dengan nomor '+id+'.');}
}
