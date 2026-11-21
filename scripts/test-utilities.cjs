const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
process.env.DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'blackstore-utility-test-'));process.env.DIGIFLAZZ_ENABLED='true';process.env.DIGIFLAZZ_TESTING='false';process.env.DIGIFLAZZ_USERNAME='test';process.env.DIGIFLAZZ_API_KEY='test-key';process.env.SUMOPOD_CHECKOUT_ENABLED='true';process.env.SUMOPOD_API_KEY='test-key';process.env.FONNTE_ENABLED='false';process.env.SITE_ORIGIN='https://blackstore69.web.id';
const {database}=require('../db/index.ts');const store=require('../app/utility-store.ts');const {inquireUtility}=require('../app/utility-inquiry.ts');const {createUtilityOrder}=require('../app/utility-order.ts');const {dispatchUtility}=require('../app/utility-fulfillment.ts');const {applySupplier,initDigiflazz}=require('../app/digiflazz.ts');const {inbox,applyPaymentEvent}=require('../app/sumopod-inbox.ts');
let now=Date.parse('2026-09-21T05:00:00Z');Date.now=()=>now;let calls=[],invalidIdentity=false,payMode='success',badInquiry=false,timeoutPay=false;
global.fetch=async(url,init)=>{
 const p=JSON.parse(init.body);calls.push({url,p});
 if(url==='https://api.digiflazz.com/v1/inquiry-pln')return Response.json({data:{status:'Sukses',rc:'00',customer_no:invalidIdentity?'WRONG':p.customer_no,name:'Pelanggan Uji',segment_power:'R1 / 1300'}});
 if(url==='https://api.digiflazz.com/v1/transaction'){
  if(p.commands==='inq-pasca')return Response.json({data:{status:'Sukses',rc:'00',ref_id:p.ref_id,customer_no:p.customer_no,buyer_sku_code:p.buyer_sku_code,customer_name:'Pelanggan Uji',price:badInquiry?'50825':50825,selling_price:52000,admin:4000,periode:'202609',desc:{tarif:'R1',daya:1300}}});
  if(timeoutPay){timeoutPay=false;throw new Error('Timeout');}
  return Response.json({data:{status:payMode==='success'?'Sukses':'Pending',rc:payMode==='success'?'00':'03',message:'Test',ref_id:p.ref_id,customer_no:p.customer_no,buyer_sku_code:p.buyer_sku_code,sn:payMode==='success'?'1234-5678-9012-3456-7890':''}});
 }
 if(url==='https://api-pay.sumopod.com/api/v1/payments')return Response.json({payment_id:'payment-'+p.order_id,order_id:p.order_id,amount:p.amount,status:'pending',payment_link_url:'https://checkout.pymnt.app/test/'+p.order_id});
 throw Error('UNEXPECTED NETWORK '+url);
};
(async()=>{
const db=await database();store.initUtilities(db);initDigiflazz(db);await inbox();
for(const p of [['token','pln-prabayar','pln20','Token 20.000',21768,1],['post','pln-pascabayar','plnpasca','PLN Pascabayar',0,1],['water','pdam','pdamtest','PDAM Test',0,1],['off','pdam','off','PDAM Off',0,0]])db.raw.prepare('INSERT INTO utility_products VALUES(?,?,?,?,?,?,?)').run(...p,now);
for(const cost of [11125,21768,51784,101784,501999,50825,9999999]){const price=store.retail(cost);assert.equal(price-store.qrFee(price)-cost,100);assert.ok(price-1-store.qrFee(price-1)-cost<100);}
await assert.rejects(inquireUtility(db,'u','off','12345'),/belum tersedia/);await assert.rejects(inquireUtility(db,'u','token','08123'),/11 digit/);assert.equal(calls.length,0);
invalidIdentity=true;await assert.rejects(inquireUtility(db,'u','token','12345678901'),/tidak cocok/);invalidIdentity=false;
const q=await inquireUtility(db,'u','token','12345678902');assert.equal(q.name,'Pelanggan Uji');assert.ok(!('cost' in q));assert.equal(db.raw.prepare('SELECT COUNT(*) n FROM orders').get().n,0);
await assert.rejects(inquireUtility(db,'u','token','12345678902'),/Tunggu/);
await assert.rejects(createUtilityOrder(db,'other',{quoteId:q.id,requestKey:'abcdefghijklmnop',agreed:true}),/tidak ditemukan/);
await assert.rejects(createUtilityOrder(db,'u',{quoteId:q.id,requestKey:'abcdefghijklmnop',agreed:false}),/setujui/);
const input={quoteId:q.id,requestKey:'abcdefghijklmnop',agreed:true,amount:1,target:'99999999999'};
const [a,b]=await Promise.all([createUtilityOrder(db,'u',input),createUtilityOrder(db,'u',input)]);assert.equal(a.id,b.id);assert.equal(calls.filter(c=>c.url.endsWith('/payments')).length,1);
let o=db.raw.prepare('SELECT * FROM orders WHERE id=?').get(a.id);assert.equal(o.amount,q.amount);assert.equal(o.target,q.target);assert.equal((await dispatchUtility(db,a.id)).sent,false);
const event={event_type:'payment.completed',data:{payment_id:o.payment_id,order_id:o.id,amount:o.amount,status:'completed'}};
await applyPaymentEvent(db,{...event,data:{...event.data,amount:o.amount+1}},'badamount',now);assert.equal(db.raw.prepare('SELECT status FROM orders WHERE id=?').get(o.id).status,'pending');
await applyPaymentEvent(db,event,'paid',now);assert.equal(db.raw.prepare('SELECT status FROM orders WHERE id=?').get(o.id).status,'success');
let topups=calls.filter(c=>c.url.endsWith('/transaction')&&!c.p.commands);assert.equal(topups.length,1);assert.equal(topups[0].p.ref_id,q.id);assert.equal(topups[0].p.max_price,21768);assert.ok(!('testing' in topups[0].p));
await applyPaymentEvent(db,event,'duplicate',now);assert.equal(calls.filter(c=>c.url.endsWith('/transaction')&&!c.p.commands).length,1);
const pq=await inquireUtility(db,'p','post','523456789012');assert.equal(pq.amount-store.qrFee(pq.amount)-50825,100);assert.equal(pq.bill+pq.admin,pq.amount);
const po=await createUtilityOrder(db,'p',{quoteId:pq.id,requestKey:'postabcdefghijkl',agreed:true});o=db.raw.prepare('SELECT * FROM orders WHERE id=?').get(po.id);payMode='pending';await applyPaymentEvent(db,{event_type:'payment.completed',data:{payment_id:o.payment_id,order_id:o.id,amount:o.amount,status:'completed'}},'postpaid',now);
const paid=calls.find(c=>c.p.commands==='pay-pasca');assert.equal(paid.p.ref_id,pq.id);assert.equal(db.raw.prepare('SELECT status FROM orders WHERE id=?').get(po.id).status,'processing');
assert.equal(applySupplier(db,pq.id,{ref_id:pq.id,buyer_sku_code:'plnpasca',customer_no:pq.target,status:'Sukses',rc:'00'},'webhook'),'missing_receipt');
const before=calls.length;await dispatchUtility(db,po.id);assert.equal(calls.length,before);now+=61000;payMode='success';await dispatchUtility(db,po.id);assert.equal(calls.at(-1).p.commands,'status-pasca');assert.equal(db.raw.prepare('SELECT status FROM orders WHERE id=?').get(po.id).status,'success');
const duplicate=await inquireUtility(db,'p2','post','523456789012');await assert.rejects(createUtilityOrder(db,'p2',{quoteId:duplicate.id,requestKey:'duplicatepayment',agreed:true}),/sudah memiliki/);
const expired=await inquireUtility(db,'e','token','12345678903');now+=16*60000;await assert.rejects(createUtilityOrder(db,'e',{quoteId:expired.id,requestKey:'expiredquote1234',agreed:true}),/kedaluwarsa/);
badInquiry=true;await assert.rejects(inquireUtility(db,'bad','water','12345'),/Pengecekan sedang/);badInquiry=false;
const late=await inquireUtility(db,'late','water','12346');const lateOrder=await createUtilityOrder(db,'late',{quoteId:late.id,requestKey:'latepayment12345',agreed:true});db.raw.prepare("UPDATE orders SET status='expired' WHERE id=?").run(lateOrder.id);now+=86400000;o=db.raw.prepare('SELECT * FROM orders WHERE id=?').get(lateOrder.id);const n=calls.filter(c=>c.p.commands==='pay-pasca').length;await applyPaymentEvent(db,{event_type:'payment.completed',data:{payment_id:o.payment_id,order_id:o.id,amount:o.amount,status:'completed'}},'late',now);assert.equal(db.raw.prepare('SELECT status FROM orders WHERE id=?').get(o.id).status,'failed');assert.equal(calls.filter(c=>c.p.commands==='pay-pasca').length,n);
now=Date.parse('2026-09-22T16:00:00Z');await assert.rejects(inquireUtility(db,'cut','post','523456789015'),/22.30/);
console.log('PASS utilities: pricing, ownership, disabled products, identity, rate limit, concurrent checkout, unpaid dispatch, amount validation, duplicate webhook, token receipt, postpaid reference, pending recheck, inquiry webhook rejection, duplicate bill, expiry and date cutoff. No real network or payments.');
})().catch(e=>{console.error(e);process.exitCode=1});
