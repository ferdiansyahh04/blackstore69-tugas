const {spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const origin='http://127.0.0.1:3162',child=spawn(process.execPath,['app.js'],{env:{...process.env,PORT:'3162',SITE_ORIGIN:origin,DATA_DIR:fs.mkdtempSync(path.join(os.tmpdir(),'wa-http-')),SESSION_SECRET:'mock-http-secret-not-production-1234567890',OWNER_PASSWORD_HASH:'mock-not-a-real-password-hash',DIGIFLAZZ_ENABLED:'false',SUMOPOD_CHECKOUT_ENABLED:'false',FONNTE_ENABLED:'false',KIRIMDEV_ENABLED:'false'},stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);
(async()=>{try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(origin+'/')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}assert.ok(ready,log);
 for(const page of ['/','/admin/whatsapp','/game/pulsa','/layanan/pdam'])assert.equal((await fetch(origin+page)).status,200);
 const old=await fetch(origin+'/admin/fonnte',{redirect:'manual'});assert.ok([307,308].includes(old.status));assert.ok(old.headers.get('location').includes('/admin/whatsapp'));
 for(const url of ['/api/admin/whatsapp','/api/admin/fonnte']){
  assert.equal((await fetch(origin+url)).status,401);
  assert.equal((await fetch(origin+url,{method:'POST',headers:{Origin:origin}})).status,401);
  assert.equal((await fetch(origin+url,{method:'POST',headers:{Origin:'https://evil.example'}})).status,403);
 }
 console.log('PASS HTTP: website renders, legacy redirect, admin GET/POST protected, cross-origin rejected. Providers disabled.');
 }finally{child.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
