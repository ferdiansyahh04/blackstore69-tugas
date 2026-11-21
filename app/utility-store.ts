import type {database} from '../db';
import type {UtilityKind,UtilityProduct} from './utility-types';
export type Store=Awaited<ReturnType<typeof database>>;
export type ProductRow={id:string;kind:UtilityKind;sku:string;name:string;cost:number;enabled:number;updated_at:number};
export type QuoteRow={id:string;user_id:string;product_id:string;kind:UtilityKind;sku:string;target:string;customer_name:string;period:string;description:string;cost:number;amount:number;bill:number;admin:number;created_at:number;expires_at:number;state:string;order_id:string|null};
export function initUtilities(db:Store){db.raw.exec(`
 CREATE TABLE IF NOT EXISTS utility_products(id TEXT PRIMARY KEY,kind TEXT NOT NULL,sku TEXT NOT NULL,name TEXT NOT NULL,cost INTEGER NOT NULL,enabled INTEGER NOT NULL,updated_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS utility_quotes(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,product_id TEXT NOT NULL,kind TEXT NOT NULL,sku TEXT NOT NULL,target TEXT NOT NULL,customer_name TEXT NOT NULL DEFAULT '',period TEXT NOT NULL DEFAULT '',description TEXT NOT NULL DEFAULT '',cost INTEGER NOT NULL DEFAULT 0,amount INTEGER NOT NULL DEFAULT 0,bill INTEGER NOT NULL DEFAULT 0,admin INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,state TEXT NOT NULL,order_id TEXT UNIQUE);
 CREATE INDEX IF NOT EXISTS utility_quote_user ON utility_quotes(user_id,created_at);
 CREATE INDEX IF NOT EXISTS utility_quote_target ON utility_quotes(sku,target,state);
`);}
export function qrFee(amount:number){return 300+Math.ceil(amount*7/1000);}
export function retail(cost:number){if(!Number.isSafeInteger(cost)||cost<=0||cost>50000000)throw new Error('Nilai tagihan tidak valid.');return Math.max(10000,Math.ceil((cost+400)*1000/993));}
export function jakartaDay(now:number){return new Date(now+7*3600000).toISOString().slice(0,10);}
export function beforeBillingCutoff(now:number){const d=new Date(now+7*3600000);return d.getUTCHours()<22||(d.getUTCHours()===22&&d.getUTCMinutes()<30);}
export function publicUtilities(db:Store):UtilityProduct[]{initUtilities(db);return (db.raw.prepare('SELECT * FROM utility_products ORDER BY kind,cost,name').all() as ProductRow[]).map(p=>({id:p.id,kind:p.kind,name:p.name,active:p.enabled===1,price:p.kind==='pln-prabayar'&&p.cost>0?retail(p.cost):null}));}
export function quotePublic(q:QuoteRow){return {id:q.id,productId:q.product_id,target:q.target,name:q.customer_name,period:q.period,description:q.description,amount:q.amount,bill:q.bill,admin:q.admin,expiresAt:q.expires_at};}
