import {DatabaseSync, type SQLInputValue} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
class Statement {
 constructor(private raw:DatabaseSync,private sql:string,private args:SQLInputValue[]=[]){}
 bind(...args:SQLInputValue[]){return new Statement(this.raw,this.sql,args);}
 async first<T=Record<string,unknown>>():Promise<T|null>{return (this.raw.prepare(this.sql).get(...this.args) as T)??null;}
 async all<T=Record<string,unknown>>():Promise<{results:T[]}>{return {results:this.raw.prepare(this.sql).all(...this.args) as T[]};}
 runSync(){const result=this.raw.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes)}};}
 async run(){return this.runSync();}
}
class StoreDb {
 constructor(public raw:DatabaseSync){}
 prepare(sql:string){return new Statement(this.raw,sql);}
 async batch(statements:Statement[]){this.raw.exec('BEGIN IMMEDIATE');try{const result=[];for(const statement of statements)result.push(statement.runSync());this.raw.exec('COMMIT');return result;}catch(e){this.raw.exec('ROLLBACK');throw e;}}
}
const globals=globalThis as typeof globalThis & {blackstoreDb?:StoreDb};
export async function database(){
 if(globals.blackstoreDb)return globals.blackstoreDb;
 const folder=path.resolve(process.env.DATA_DIR||path.join(process.cwd(),'data'));
 mkdirSync(folder,{recursive:true,mode:0o700});
 const raw=new DatabaseSync(path.join(folder,'store.sqlite'));raw.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
 raw.exec(`
 CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY NOT NULL,user_id TEXT NOT NULL,request_key TEXT NOT NULL,game_id TEXT NOT NULL,game_name TEXT NOT NULL,sku TEXT NOT NULL,label TEXT NOT NULL,target TEXT NOT NULL,zone TEXT NOT NULL,whatsapp TEXT,method TEXT NOT NULL,amount INTEGER NOT NULL,status TEXT NOT NULL,outcome TEXT NOT NULL,created_at INTEGER NOT NULL,paid_at INTEGER,completed_at INTEGER,payment_url TEXT,payment_id TEXT,provider_order_id TEXT);
 CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id,created_at);
 CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_user_request ON orders(user_id,request_key);
 CREATE TABLE IF NOT EXISTS prices (user_id TEXT NOT NULL,sku TEXT NOT NULL,price INTEGER NOT NULL,active INTEGER NOT NULL,PRIMARY KEY(user_id,sku));
 CREATE TABLE IF NOT EXISTS login_attempts (id TEXT PRIMARY KEY, count INTEGER NOT NULL, until_ms INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS contact_messages (id TEXT PRIMARY KEY, buyer_id TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL, created_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_messages(created_at);
 CREATE TABLE IF NOT EXISTS midtrans_hook_log(id INTEGER PRIMARY KEY AUTOINCREMENT,at INTEGER NOT NULL,order_id TEXT NOT NULL,transaction_id TEXT NOT NULL,status TEXT NOT NULL,code TEXT NOT NULL,verified INTEGER NOT NULL,reason TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS idx_midtrans_hook_at ON midtrans_hook_log(at);
 CREATE TABLE IF NOT EXISTS whatsapp_notifications(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  event TEXT NOT NULL,
  target TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  last_try INTEGER NOT NULL,
  response TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  sent_at INTEGER,
  UNIQUE(order_id,event)
 );
 CREATE INDEX IF NOT EXISTS idx_whatsapp_status_try ON whatsapp_notifications(status,last_try);
 `);
 const columns=raw.prepare('PRAGMA table_info(orders)').all() as Array<{name:string}>;
 for(const column of ['payment_url','payment_id','provider_order_id','whatsapp'])if(!columns.some(item=>item.name===column))raw.exec('ALTER TABLE orders ADD COLUMN '+column+' TEXT');
 return globals.blackstoreDb=new StoreDb(raw);
}

