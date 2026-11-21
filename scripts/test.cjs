const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const root=path.resolve(__dirname,'..'),data=fs.mkdtempSync(path.join(os.tmpdir(),'blackstore-test-'));
const origin='http://127.0.0.1:3147',password=crypto.randomBytes(24).toString('hex'),salt='test-only-salt';
const env={...process.env,PORT:'3147',SITE_ORIGIN:origin,DATA_DIR:data,SESSION_SECRET:crypto.randomBytes(48).toString('hex'),OWNER_PASSWORD_SALT:salt,OWNER_PASSWORD_HASH:crypto.scryptSync(password,salt,64).toString('hex')};
let child,logs='',cookie='';
async function start(){child=spawn(process.execPath,['app.js'],{cwd:root,env,stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);for(let i=0;i<100;i++){try{if((await fetch(origin+'/api/catalog')).ok)return;}catch{}await new Promise(r=>setTimeout(r,150));}throw Error('Server failed: '+logs);}
async function stop(){if(!child||child.exitCode!==null)return;const done=new Promise(r=>child.once('exit',r));child.kill();await done;}
async function call(url,method='GET',body,extra={}){const res=await fetch(origin+url,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});const text=await res.text();let value;try{value=JSON.parse(text);}catch{value=text;}return {status:res.status,data:value,headers:res.headers};}
(async()=>{try{
 await start();
 for(const page of ['/','/game/mobile-legends','/game/point-blank','/lacak','/riwayat','/panduan','/admin','/masuk'])assert.equal((await fetch(origin+page)).status,200,page);
 assert.equal((await call('/api/orders')).status,401);assert.equal((await call('/api/admin')).status,401);
 assert.equal((await call('/api/orders','GET',undefined,{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'fake@example.com'})).status,401);
 assert.equal((await call('/api/session','POST',{password},{Origin:'https://evil.example'})).status,403);
 assert.equal((await call('/api/session','POST',{password:'wrong'})).status,401);
 const auth=await call('/api/session','POST',{password});assert.equal(auth.status,200);cookie=auth.headers.get('set-cookie').split(';')[0];assert.match(auth.headers.get('set-cookie'),/HttpOnly/i);
 assert.equal((await call('/api/admin','GET',undefined,{Cookie:cookie+'tampered'})).status,401);
 const p={gameId:'mobile-legends',sku:'ml-86',target:'123456789',zone:'1234',method:'QRIS',amount:1,requestKey:crypto.randomUUID()};
 assert.equal((await call('/api/orders','POST',{...p,zone:'x'})).status,400);
 assert.equal((await call('/api/orders','POST',p,{Origin:'https://evil.example'})).status,403);
 const [a,b]=await Promise.all([call('/api/orders','POST',p),call('/api/orders','POST',p)]);assert.ok([200,201].includes(a.status),JSON.stringify(a));assert.equal(a.data.id,b.data.id);
 const id=a.data.id;
 assert.equal((await call('/api/orders/'+id)).data.order.amount,22000);
 assert.equal((await call('/api/orders/'+id,'GET',undefined,{Cookie:''})).status,401);
 assert.equal((await call('/api/orders/'+id,'POST',{outcome:'success'})).status,200);
 await call('/api/orders/'+id,'POST',{outcome:'failed'});
 const failed=await call('/api/orders','POST',{...p,requestKey:crypto.randomUUID()});await call('/api/orders/'+failed.data.id,'POST',{outcome:'failed'});
 assert.equal((await call('/api/admin','PATCH',{sku:'ml-86',price:25000,active:true})).status,200);
 const changed=await call('/api/orders','POST',{...p,requestKey:crypto.randomUUID()});assert.equal((await call('/api/orders/'+changed.data.id)).data.order.amount,25000);
 assert.equal((await call('/api/orders/'+id)).data.order.amount,22000);
 await call('/api/admin','PATCH',{sku:'ml-86',price:25000,active:false});
 assert.equal((await call('/api/orders','POST',{...p,requestKey:crypto.randomUUID()})).status,400);
 assert.equal((await call('/api/admin','PATCH',{sku:'ml-86',price:-1,active:true})).status,400);
 await new Promise(r=>setTimeout(r,4200));
 assert.equal((await call('/api/orders/'+id)).data.order.status,'success');
 assert.equal((await call('/api/orders/'+failed.data.id)).data.order.status,'failed');
 const sql=new DatabaseSync(path.join(data,'store.sqlite'));sql.prepare('UPDATE orders SET created_at=? WHERE id=?').run(Date.now()-1000000,changed.data.id);sql.close();
 assert.equal((await call('/api/orders/'+changed.data.id)).data.order.status,'expired');
 assert.equal((await call('/api/orders/'+changed.data.id,'POST',{outcome:'success'})).status,409);
 await stop();await start();assert.equal((await call('/api/orders/'+id)).data.order.status,'success');
 assert.equal((await call('/api/session','DELETE')).status,200);cookie='';
 assert.equal((await call('/api/admin')).status,401);
 let rate;for(let i=0;i<11;i++)rate=await call('/api/session','POST',{password:'wrong'});assert.equal(rate.status,429);
 console.log('PASS: 8 pages; owner login; forged headers/cookies rejected; CSRF; server pricing; idempotency; validation; demo success/failure; expiry; admin changes; persistence after restart; login rate limit.');
 }finally{await stop();}})().catch(e=>{console.error(e);console.error(logs.slice(-3000));process.exitCode=1;});
