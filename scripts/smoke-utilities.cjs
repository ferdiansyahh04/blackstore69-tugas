const {spawn}=require('child_process'),assert=require('assert/strict');const origin='http://127.0.0.1:3158';
const child=spawn(process.execPath,['app.js'],{cwd:process.cwd(),env:{...process.env,PORT:'3158',SITE_ORIGIN:origin,DATA_DIR:process.cwd()+'/data',DIGIFLAZZ_ENABLED:'false',SUMOPOD_CHECKOUT_ENABLED:'false',FONNTE_ENABLED:'false'},stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',x=>log+=x);child.stderr.on('data',x=>log+=x);
(async()=>{try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(origin+'/api/utilities')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,250));}assert.ok(ready,log);
 const products=(await (await fetch(origin+'/api/utilities')).json()).products;assert.equal(products.length,13);assert.equal(products.filter(x=>x.active).length,13);assert.ok(products.every(p=>!('cost' in p)&&!('sku' in p)));
 for(const url of ['/','/game/pulsa','/game/mobile-legends','/layanan/pln-prabayar','/layanan/pln-pascabayar','/layanan/pdam','/riwayat'])assert.equal((await fetch(origin+url)).status,200,url);
 assert.equal((await fetch(origin+'/layanan/invalid')).status,404);
 for(const endpoint of ['/api/utilities/inquiry','/api/utilities/orders']){
 const r=await fetch(origin+endpoint,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://wrong.example'},body:'{}'});assert.equal(r.status,403);
 }
 const invalid=await fetch(origin+'/api/utilities/inquiry',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({productId:'ut-pln20',target:'abc'})});assert.equal(invalid.status,400);
 const missing=await fetch(origin+'/api/utilities/orders',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:'{}'});assert.equal(missing.status,400);
 console.log('PASS HTTP smoke: 13 products, all 3 pages, existing pages, invalid route, cross-origin protection, invalid inquiry/order rejection. Providers disabled.');
 }finally{child.kill();}})().catch(e=>{console.error(e.message);process.exitCode=1});
