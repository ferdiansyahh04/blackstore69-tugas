import {createHash,timingSafeEqual} from 'node:crypto';
import {database} from '../db';
import {dispatchOrder} from './digiflazz';
export function tokenMatches(provided:string|null,expected:string){if(!provided||provided.length>1024)return false;const a=createHash('sha256').update(provided).digest(),b=createHash('sha256').update(expected).digest();return timingSafeEqual(a,b);}
export function redact(value:unknown,depth=0):unknown{
 if(depth>20)return '[nested content omitted]';
 if(Array.isArray(value))return value.map(v=>redact(v,depth+1));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,/secret|token|password|authorization|signature|api.?key/i.test(k)?'[REDACTED]':redact(v,depth+1)]));
 return value;
}
export async function inbox(){
 const db=await database();
 db.raw.exec(`
 CREATE TABLE IF NOT EXISTS sumopod_webhook_inbox (digest TEXT PRIMARY KEY,payload TEXT NOT NULL,first_received INTEGER NOT NULL,last_received INTEGER NOT NULL,deliveries INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sumopod_payment_events (payment_id TEXT PRIMARY KEY,order_id TEXT NOT NULL,amount INTEGER NOT NULL,status TEXT NOT NULL,received_at INTEGER NOT NULL,digest TEXT NOT NULL)
 `);
 return db;
}

type PaymentPayload={event_type?:unknown;data?:{amount?:unknown;order_id?:unknown;payment_id?:unknown;status?:unknown}};
export async function applyPaymentEvent(db:Awaited<ReturnType<typeof inbox>>,payload:PaymentPayload,digest:string,now:number){
 if(payload.event_type!=='payment.completed')return {ordersUpdated:0,reason:'event_ignored'};
 const data=payload.data;
 if(!data||typeof data.order_id!=='string'||!/^[-A-Za-z0-9_]{3,120}$/.test(data.order_id)||typeof data.payment_id!=='string'||!/^[-A-Za-z0-9_]{8,160}$/.test(data.payment_id)||data.status!=='completed'||typeof data.amount!=='number'||!Number.isSafeInteger(data.amount)||data.amount<1)return {ordersUpdated:0,reason:'payload_invalid'};
 const order=await db.prepare('SELECT id,game_id,status,amount,payment_id,provider_order_id FROM orders WHERE provider_order_id=? OR id=?').bind(data.order_id,data.order_id).first<{id:string;game_id:string;status:string;amount:number;payment_id:string|null;provider_order_id:string|null}>();
 if(!order){await db.prepare('INSERT OR IGNORE INTO sumopod_payment_events(payment_id,order_id,amount,status,received_at,digest) VALUES(?,?,?,?,?,?)').bind(data.payment_id,data.order_id,data.amount,data.status,now,digest).run();return {ordersUpdated:0,reason:'order_not_found',orderId:data.order_id};}
 if(order.payment_id!==data.payment_id)return {ordersUpdated:0,reason:'payment_id_mismatch',orderId:order.id};
 await db.prepare('INSERT OR IGNORE INTO sumopod_payment_events(payment_id,order_id,amount,status,received_at,digest) VALUES(?,?,?,?,?,?)').bind(data.payment_id,order.id,data.amount,data.status,now,digest).run();
 if(order.amount!==data.amount)return {ordersUpdated:0,reason:'amount_mismatch',orderId:order.id};
 const lateUtility=order.status==='expired'&&['pln-prabayar','pln-pascabayar','pdam'].includes(order.game_id);
 if(order.status==='pending'||lateUtility){
  const changed=await db.prepare("UPDATE orders SET status='processing',outcome='success',paid_at=? WHERE id=? AND status=? AND amount=?").bind(now,order.id,order.status,data.amount).run();
  if(changed.meta.changes)await dispatchOrder(db,order.id);
  return {ordersUpdated:changed.meta.changes,reason:'payment_completed',orderId:order.id};
 }
 return {ordersUpdated:0,reason:'already_processed',orderId:order.id};
}
