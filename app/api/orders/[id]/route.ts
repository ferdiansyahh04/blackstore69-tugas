import {identity,HttpError,handle,json} from '../../../api-utils';
import {database} from '../../../../db';
import {advance} from '../../../advance';

export const dynamic='force-dynamic';

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 return handle(async()=>{
  const user=await identity();const {id}=await params;const db=await database();
  await advance(db,user);
  const order=await db.prepare('SELECT id,game_id,game_name,sku,label,target,zone,method,amount,status,created_at,paid_at,completed_at,payment_url,payment_id,provider_order_id FROM orders WHERE id=? AND user_id=?').bind(id,user).first();
  if(!order)throw new HttpError(404,'Pesanan tidak ditemukan di perangkat ini. Periksa nomor pesanan.');
  const utilityTable=db.raw.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='utility_quotes'").get();
  let utility=null,receipt=null;
  if(utilityTable){const q=db.raw.prepare('SELECT customer_name AS name,period,description FROM utility_quotes WHERE order_id=? AND user_id=?').get(id,user);if(q){utility=q;const hasTransactions=db.raw.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='digiflazz_transactions'").get();const t=hasTransactions?db.raw.prepare("SELECT response FROM digiflazz_transactions WHERE order_id=? AND status='Sukses'").get(id) as {response:string}|undefined:undefined;if(t){try{const d=JSON.parse(t.response);receipt=typeof d.sn==='string'?d.sn:null;}catch{}}}}
  return json({order:{...order,utility,receipt}});
 });
}
