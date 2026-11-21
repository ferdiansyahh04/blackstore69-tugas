import {createHash} from 'node:crypto';
import {handle,HttpError,json,identity} from '../../../api-utils';
import {applyPaymentEvent,inbox,redact,tokenMatches} from '../../../sumopod-inbox';
import {flushWhatsApp} from '../../../fonnte';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const MAX_BYTES=32768;
async function readLimited(req:Request){
 if(Number(req.headers.get('content-length')||0)>MAX_BYTES)throw new HttpError(413,'Payload terlalu besar.');
 if(!req.body)throw new HttpError(400,'Payload kosong.');
 const reader=req.body.getReader();const chunks:Uint8Array[]=[];let total=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>MAX_BYTES){await reader.cancel();throw new HttpError(413,'Payload terlalu besar.');}chunks.push(value);}}finally{reader.releaseLock();}
 return Buffer.concat(chunks);
}
export async function POST(req:Request){return handle(async()=>{
 const expected=process.env.SUMOPOD_WEBHOOK_TOKEN;
 if(!expected||expected.length<16)throw new HttpError(503,'Token webhook belum dikonfigurasi.');
 if(!tokenMatches(req.headers.get('x-webhook-token'),expected))throw new HttpError(401,'Webhook tidak terverifikasi.');
 if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new HttpError(415,'Gunakan application/json.');
 const raw=await readLimited(req);let payload:unknown;try{payload=JSON.parse(raw.toString('utf8'));}catch{throw new HttpError(400,'JSON tidak valid.');}
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new HttpError(400,'Payload harus berupa objek JSON.');
 const digest=createHash('sha256').update(raw).digest('hex'),now=Date.now(),db=await inbox();
 const paymentResult=await applyPaymentEvent(db,payload as {event_type?:unknown;data?:{amount?:unknown;order_id?:unknown;payment_id?:unknown;status?:unknown}},digest,now);
 await db.batch([
 db.prepare('INSERT INTO sumopod_webhook_inbox(digest,payload,first_received,last_received,deliveries) VALUES(?,?,?,?,1) ON CONFLICT(digest) DO UPDATE SET last_received=excluded.last_received,deliveries=deliveries+1').bind(digest,JSON.stringify(redact(payload)),now,now),
 db.prepare('DELETE FROM sumopod_webhook_inbox WHERE digest NOT IN (SELECT digest FROM sumopod_webhook_inbox ORDER BY last_received DESC,digest DESC LIMIT 100)')
 ]);
 await flushWhatsApp(db,{orderId:paymentResult.orderId,limit:4});
 return json({received:true,mode:'production-inbox',orders_updated:paymentResult.ordersUpdated,reason:paymentResult.reason,order_id:paymentResult.orderId??null});
});}
export async function GET(){return handle(async()=>{
 await identity();const db=await inbox();const {results}=await db.prepare('SELECT digest,payload,first_received,last_received,deliveries FROM sumopod_webhook_inbox ORDER BY last_received DESC LIMIT 10').all<{digest:string;payload:string;first_received:number;last_received:number;deliveries:number}>();
 return json({mode:'production-inbox',configured:!!process.env.SUMOPOD_WEBHOOK_TOKEN,orders_updated:0,events:results.map(e=>({...e,payload:JSON.parse(e.payload)}))});
});}

