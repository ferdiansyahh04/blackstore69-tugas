import {createHash} from 'node:crypto';
import {applySupplier,initDigiflazz,configuration} from './digiflazz';
import {initUtilities,jakartaDay,type Store,type QuoteRow,type ProductRow} from './utility-store';
export async function dispatchUtility(db:Store,orderId:string){
 initUtilities(db);initDigiflazz(db);const cfg=configuration();if(!cfg.enabled||cfg.testing||!cfg.endpointOK||!cfg.keySet||!cfg.usernameSet)return {sent:false,reason:'Layanan belum tersedia.'};
 const o=db.raw.prepare('SELECT status,paid_at,amount FROM orders WHERE id=?').get(orderId) as {status:string;paid_at:number|null;amount:number}|undefined;
 const q=db.raw.prepare('SELECT * FROM utility_quotes WHERE order_id=?').get(orderId) as QuoteRow|undefined;
 if(!o||o.status!=='processing'||!o.paid_at||!q||o.amount!==q.amount)return {sent:false,reason:'Pesanan belum siap diproses.'};
 if(Date.now()-q.created_at>89*86400000)return {sent:false,reason:'Pesanan lama perlu diperiksa admin.'};
 const post=q.kind!=='pln-prabayar';const now=Date.now();let attempt=0;
 db.raw.exec('BEGIN IMMEDIATE');try{
 const prior=db.raw.prepare('SELECT ref_id,status,last_try,attempts FROM digiflazz_transactions WHERE order_id=?').get(orderId) as {ref_id:string;status:string;last_try:number;attempts:number}|undefined;
 if(prior&&(prior.ref_id!==q.id||['Sukses','Gagal'].includes(prior.status)||prior.last_try>now-60000)){db.raw.exec('COMMIT');return {sent:false,reason:'Menunggu konfirmasi transaksi.'};}
 if(!prior){
  const p=db.raw.prepare('SELECT * FROM utility_products WHERE id=?').get(q.product_id) as ProductRow|undefined;
  if(!p||!p.enabled||(post&&jakartaDay(q.created_at)!==jakartaDay(now))){
   db.raw.prepare("UPDATE orders SET status='failed',outcome='failed',completed_at=? WHERE id=? AND status='processing'").run(now,orderId);
   db.raw.exec('COMMIT');return {sent:false,reason:'Produk atau tanggal tagihan berubah. Pembayaran perlu ditangani admin.'};
  }
  db.raw.prepare("INSERT INTO digiflazz_transactions(order_id,ref_id,sku,status,last_try,attempts,response,customer_no,testing) VALUES(?,?,?,'Pending',?,1,'{}',?,0)").run(orderId,q.id,q.sku,now,q.target);
 }else{attempt=prior.attempts;db.raw.prepare('UPDATE digiflazz_transactions SET last_try=?,attempts=attempts+1 WHERE order_id=?').run(now,orderId);}
 db.raw.exec('COMMIT');
 }catch(e){db.raw.exec('ROLLBACK');throw e;}
 const username=process.env.DIGIFLAZZ_USERNAME!.trim(),key=process.env.DIGIFLAZZ_API_KEY!.trim();
 const payload={username,buyer_sku_code:q.sku,customer_no:q.target,ref_id:q.id,sign:createHash('md5').update(username+key+q.id).digest('hex'),...(post?{commands:attempt?'status-pasca':'pay-pasca'}:{max_price:q.cost})};
 try{
 const r=await fetch('https://api.digiflazz.com/v1/transaction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000),redirect:'error'});const result=await r.json();const d=result?.data;
 if(!r.ok||!d)throw new Error('invalid response');
 // A status lookup with no record does not authorize a new payment or prove failure.
 if(post&&attempt&&['50','01'].includes(d.rc))throw new Error('status not final');
 const applied=applySupplier(db,q.id,d,'utility_api');return {sent:true,reason:applied};
 }catch{
 db.raw.prepare("UPDATE digiflazz_transactions SET response=? WHERE order_id=? AND status='Pending'").run(JSON.stringify({message:'Konfirmasi masih ditunggu. Referensi transaksi dipertahankan.',source:'utility_api'}),orderId);
 return {sent:true,reason:'Menunggu konfirmasi. Tidak membuat transaksi baru.'};
 }
}
