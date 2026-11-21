import {createHash,randomUUID} from 'node:crypto';
import {HttpError} from './api-utils';
import {initUtilities,retail,quotePublic,beforeBillingCutoff,type Store,type ProductRow,type QuoteRow} from './utility-store';
function clean(v:unknown,max=120){return typeof v==='string'?v.slice(0,max):'';}
export async function inquireUtility(db:Store,user:string,productId:unknown,targetInput:unknown){
 initUtilities(db);
 if(typeof productId!=='string'||typeof targetInput!=='string')throw new HttpError(400,'Pilih produk dan isi nomor pelanggan.');
 const p=db.raw.prepare('SELECT * FROM utility_products WHERE id=? AND enabled=1').get(productId) as ProductRow|undefined;
 if(!p)throw new HttpError(400,'Produk belum tersedia. Silakan pilih produk lain.');
 const target=targetInput.trim();if(!(p.kind==='pdam'?/^\d{4,25}$/:/^\d{11,12}$/).test(target))throw new HttpError(400,p.kind==='pdam'?'Isi nomor pelanggan PDAM dengan benar.':'Nomor meter PLN harus 11 digit atau ID pelanggan 12 digit.');
 const username=process.env.DIGIFLAZZ_USERNAME?.trim(),key=process.env.DIGIFLAZZ_API_KEY?.trim();
 if(!username||!key||process.env.DIGIFLAZZ_ENABLED!=='true'||process.env.DIGIFLAZZ_TESTING!=='false')throw new HttpError(503,'Layanan belum tersedia.');
 const now=Date.now(),postpaid=p.kind!=='pln-prabayar';
 if(postpaid&&!beforeBillingCutoff(now))throw new HttpError(400,'Cek tagihan tersedia hingga pukul 22.30 WIB. Silakan kembali besok.');
 const id='UTL-'+randomUUID().replaceAll('-','');
 db.raw.exec('BEGIN IMMEDIATE');try{
 const count=db.raw.prepare('SELECT COUNT(*) AS n FROM utility_quotes WHERE user_id=? AND created_at>?').get(user,now-3600000) as {n:number};
 const recent=db.raw.prepare('SELECT id FROM utility_quotes WHERE sku=? AND target=? AND created_at>?').get(p.sku,target,now-60000);
 if(count.n>=20||recent)throw new HttpError(429,'Tunggu satu menit sebelum cek ulang. Maksimal 20 pengecekan per jam.');
 db.raw.prepare("INSERT INTO utility_quotes(id,user_id,product_id,kind,sku,target,created_at,expires_at,state) VALUES(?,?,?,?,?,?,?,?,'checking')").run(id,user,p.id,p.kind,p.sku,target,now,now+15*60000);
 db.raw.exec('COMMIT');
 }catch(e){db.raw.exec('ROLLBACK');throw e;}
 try{
 const payload=postpaid?{commands:'inq-pasca',username,buyer_sku_code:p.sku,customer_no:target,ref_id:id,sign:createHash('md5').update(username+key+id).digest('hex')}:{username,customer_no:target,sign:createHash('md5').update(username+key+target).digest('hex')};
 const r=await fetch('https://api.digiflazz.com/v1/'+(postpaid?'transaction':'inquiry-pln'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000),redirect:'error'});
 const result=await r.json();const d=result?.data;
 if(!r.ok||!d||d.status!=='Sukses'||d.rc!=='00')throw new HttpError(400,'Data pelanggan atau tagihan belum tersedia. Periksa nomor dan wilayah, lalu coba lagi.');
 if(d.customer_no!==target||(postpaid&&(d.ref_id!==id||d.buyer_sku_code!==p.sku)))throw new HttpError(502,'Hasil pengecekan tidak cocok dengan tujuan. Silakan hubungi admin.');
 const name=clean(postpaid?d.customer_name:d.name);if(!name)throw new HttpError(502,'Nama pelanggan belum dapat diverifikasi.');
 const cost=postpaid?d.price:p.cost;const amount=retail(cost);
 // The deposit debit is the cost. Supplier commission must not be subtracted twice.
 const bill=postpaid&&Number.isSafeInteger(d.selling_price)&&Number.isSafeInteger(d.admin)&&d.selling_price>d.admin?d.selling_price-d.admin:cost;
 const admin=amount-bill;if(admin<0)throw new HttpError(502,'Rincian tagihan tidak konsisten. Silakan hubungi admin.');
 const period=clean(d.periode,80);const description=postpaid?clean(d.desc?.tarif,50)+(d.desc?.daya?' / '+String(d.desc.daya).slice(0,20)+' VA':''):clean(d.segment_power,100);
 db.raw.prepare("UPDATE utility_quotes SET customer_name=?,period=?,description=?,cost=?,amount=?,bill=?,admin=?,state='ready' WHERE id=? AND state='checking'").run(name,period,description,cost,amount,bill,admin,id);
 return quotePublic(db.raw.prepare('SELECT * FROM utility_quotes WHERE id=?').get(id) as QuoteRow);
 }catch(e){db.raw.prepare("UPDATE utility_quotes SET state='failed' WHERE id=? AND state='checking'").run(id);if(e instanceof HttpError)throw e;throw new HttpError(503,'Pengecekan sedang terganggu. Silakan coba kembali.');}
}
