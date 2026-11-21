const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
process.env.DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'wa-test-'));
Object.assign(process.env,{KIRIMDEV_ENABLED:'true',KIRIMDEV_TEMPLATE_APPROVED:'true',KIRIMDEV_API_KEY:'mock-key',KIRIMDEV_PHONE_NUMBER_ID:'123456',SITE_ORIGIN:'https://blackstore69.web.id'});
const {database}=require('../db/index.ts');const wa=require('../app/whatsapp.ts');
let now=Date.now(),calls=[],mode='ok',count=0;Date.now=()=>now;
global.fetch=async(url,init)=>{
 assert.ok(url.startsWith('https://api.kirimdev.com/v1/123456/messages'));assert.equal(init.headers.Authorization,'Bearer mock-key');calls.push({url,...init});
 if(mode==='timeout')throw Error('Timed out');
 if(mode==='reject')return Response.json({error:{code:'invalid_field_value',message:'DO NOT LOG THIS SECRET'}},{status:400});
 if(init.method==='GET')return Response.json({data:{id:url.split('/').at(-1),status:mode==='pending'?'pending':'delivered'}});
 return Response.json({data:{id:'msg_test'+(++count),status:'pending'}});
};
(async()=>{
 const db=await database();
 function order(id,status='pending',whatsapp='081234567890'){db.raw.prepare('INSERT INTO orders(id,user_id,request_key,game_id,game_name,sku,label,target,zone,whatsapp,method,amount,status,outcome,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,'user',id,'game','Telkomsel','sku','Pulsa 20.000','081234567891','',whatsapp,'qris',21300,status,'',now);}
 order('legacy');db.raw.prepare("INSERT INTO whatsapp_notifications(order_id,event,target,status,attempts,last_try,response,created_at) VALUES('legacy','created','6281234567890','pending',0,0,'',?)").run(now);
 wa.initWhatsApp(db);assert.equal(db.raw.prepare("SELECT status FROM whatsapp_notifications WHERE order_id='legacy'").get().status,'archived');
 order('empty','pending','');assert.equal(wa.queueWhatsApp(db,'empty','created'),false);
 order('normal');assert.equal(wa.queueWhatsApp(db,'normal','created'),true);assert.equal(wa.queueWhatsApp(db,'normal','created'),false);
 await Promise.all([wa.flushWhatsApp(db),wa.flushWhatsApp(db)]);assert.equal(calls.length,1);
 let n=db.raw.prepare("SELECT * FROM whatsapp_notifications WHERE order_id='normal'").get();assert.equal(n.status,'accepted');assert.equal(n.sent_at,null);
 const p=JSON.parse(calls[0].body);assert.equal(p.to,'+6281234567890');assert.equal(p.type,'template');assert.equal(p.template.language,'id');assert.equal(p.template.components[0].parameters.length,6);
 now+=61000;await wa.refreshWhatsApp(db);assert.equal(db.raw.prepare('SELECT status FROM whatsapp_notifications WHERE id=?').get(n.id).status,'delivered');
 order('timeout');wa.queueWhatsApp(db,'timeout','created');mode='timeout';await wa.flushWhatsApp(db);const first=calls.at(-1);assert.equal(db.raw.prepare("SELECT status FROM whatsapp_notifications WHERE order_id='timeout'").get().status,'retry');
 db.raw.prepare("UPDATE orders SET status='success',label='CHANGED' WHERE id='timeout'").run();now+=61000;mode='ok';await wa.flushWhatsApp(db);assert.equal(calls.at(-1).body,first.body);assert.equal(calls.at(-1).headers['Idempotency-Key'],first.headers['Idempotency-Key']);
 order('stale','success');wa.queueWhatsApp(db,'stale','created');let before=calls.length;await wa.flushWhatsApp(db);assert.equal(calls.length,before);assert.equal(db.raw.prepare("SELECT status FROM whatsapp_notifications WHERE order_id='stale'").get().status,'skipped');
 order('rejected');wa.queueWhatsApp(db,'rejected','created');mode='reject';await wa.flushWhatsApp(db);n=db.raw.prepare("SELECT * FROM whatsapp_notifications WHERE order_id='rejected'").get();assert.equal(n.status,'failed');assert.ok(!n.response.includes('SECRET'));now+=61000;before=calls.length;await wa.flushWhatsApp(db);assert.equal(calls.length,before);
 order('old');wa.queueWhatsApp(db,'old','created');mode='timeout';await wa.flushWhatsApp(db);now+=23*3600000;before=calls.length;await wa.flushWhatsApp(db);assert.equal(calls.length,before);assert.equal(db.raw.prepare("SELECT status FROM whatsapp_notifications WHERE order_id='old'").get().status,'uncertain');
 process.env.KIRIMDEV_ENABLED='false';order('disabled');wa.queueWhatsApp(db,'disabled','created');assert.equal((await wa.flushWhatsApp(db)).enabled,false);process.env.KIRIMDEV_ENABLED='true';before=calls.length;await wa.flushWhatsApp(db);assert.equal(calls.length,before);
 process.env.KIRIMDEV_TEMPLATE_APPROVED='false';assert.equal((await wa.flushWhatsApp(db)).enabled,false);process.env.KIRIMDEV_TEMPLATE_APPROVED='true';
 order('crashed');wa.queueWhatsApp(db,'crashed','created');db.raw.prepare("UPDATE whatsapp_notifications SET status='sending',next_try=?,payload_json=?,first_attempt_at=?,sender_id='123456',idempotency_key='stable-crash' WHERE order_id='crashed'").run(now-1,first.body,now-60000);mode='ok';await wa.flushWhatsApp(db);assert.equal(calls.at(-1).headers['Idempotency-Key'],'stable-crash');assert.equal(db.raw.prepare("SELECT status FROM whatsapp_notifications WHERE order_id='crashed'").get().status,'accepted');
 const safe=wa.whatsappDiagnostics(db);assert.ok(!JSON.stringify(safe).includes('mock-key'));assert.ok(!JSON.stringify(safe).includes('6281234567890'));
 console.log('PASS: optional number, legacy archive, concurrency/idempotency, template payload, API acceptance vs delivery, timeout retry unchanged, stale events, permanent failure, retry deadline, disabled backlog, unapproved template, crash recovery, secret redaction. No real messages.');
})().catch(e=>{console.error(e);process.exitCode=1;});
