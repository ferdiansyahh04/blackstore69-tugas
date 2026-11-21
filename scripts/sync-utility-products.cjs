// Usage: node --env-file=.env scripts/sync-utility-products.cjs [prepaid.json pasca.json]
const fs=require('node:fs'),crypto=require('node:crypto');const ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {database}=require('../db/index.ts');const {initUtilities,retail}=require('../app/utility-store.ts');
(async()=>{
 const lists=[];for(const [i,cmd] of ['prepaid','pasca'].entries()){
 if(process.argv[i+2]){lists.push(JSON.parse(fs.readFileSync(process.argv[i+2],'utf8')));continue;}
 const username=process.env.DIGIFLAZZ_USERNAME?.trim(),key=process.env.DIGIFLAZZ_API_KEY?.trim();if(!username||!key)throw Error('Missing credentials');
 const r=await fetch('https://api.digiflazz.com/v1/price-list',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cmd,username,sign:crypto.createHash('md5').update(username+key+'pricelist').digest('hex')}),signal:AbortSignal.timeout(25000),redirect:'error'});const d=await r.json();if(!r.ok||!Array.isArray(d.data))throw Error('Supplier catalog unavailable');lists.push(d.data);
 }
 const now=Date.now(),rows=[];
 for(const [i,list] of lists.entries())for(const p of list){
 const kind=i===0&&p.brand==='PLN'&&p.category==='PLN'?'pln-prabayar':i===1&&p.brand==='PLN PASCABAYAR'?'pln-pascabayar':i===1&&p.brand==='PDAM'?'pdam':null;
 if(!kind)continue;const sku=p.buyer_sku_code;if(typeof sku!=='string'||!/^[-a-zA-Z0-9._]{1,100}$/.test(sku))throw Error('Invalid supplier SKU');
 const cost=kind==='pln-prabayar'?p.price:0;if(kind==='pln-prabayar')retail(cost);
 rows.push({id:'ut-'+sku,kind,sku,name:p.product_name,cost,enabled:p.buyer_product_status===true&&p.seller_product_status===true&&(i===1||p.unlimited_stock===true||p.stock>0)?1:0});
 }
 if(!rows.length||new Set(rows.map(p=>p.id)).size!==rows.length)throw Error('Empty or duplicate catalog');
 const db=await database();initUtilities(db);const before=db.raw.prepare('SELECT * FROM utility_products').all();
 const backup=process.env.DATA_DIR||require('node:path').join(process.cwd(),'data');fs.mkdirSync(backup,{recursive:true});fs.writeFileSync(require('node:path').join(backup,'utility-catalog-backup-'+now+'.json'),JSON.stringify(before),{mode:0o600});
 db.raw.exec('BEGIN IMMEDIATE');try{
 db.raw.prepare('UPDATE utility_products SET enabled=0,updated_at=?').run(now);
 for(const p of rows)db.raw.prepare('INSERT INTO utility_products(id,kind,sku,name,cost,enabled,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,sku=excluded.sku,name=excluded.name,cost=excluded.cost,enabled=excluded.enabled,updated_at=excluded.updated_at').run(p.id,p.kind,p.sku,p.name,p.cost,p.enabled,now);
 db.raw.exec('COMMIT');
 }catch(e){db.raw.exec('ROLLBACK');throw e;}
 console.log(JSON.stringify(rows.map(p=>({name:p.name,kind:p.kind,active:!!p.enabled,price:p.cost?retail(p.cost):'inquiry'}))));
})().catch(e=>{console.error(e.message);process.exitCode=1});
