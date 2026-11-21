import {sameOrigin,body,HttpError,handle,json} from '../../api-utils';
import {owner} from '../../owner-auth';
import {catalogFor} from '../../server-catalog';
import {games} from '../../catalog';
import {database} from '../../../db';
export const dynamic='force-dynamic';
async function authorized(){if(!await owner())throw new HttpError(401,'Masuk sebagai pemilik toko terlebih dahulu.');}
export async function GET(){return handle(async()=>{await authorized();const db=await database();const {results:orders}=await db.prepare('SELECT id,game_id,game_name,sku,label,target,zone,method,amount,status,created_at,paid_at,completed_at,payment_url,payment_id,provider_order_id FROM orders ORDER BY created_at DESC LIMIT 200').all();const {results:messages}=await db.prepare('SELECT id,name,email,message,created_at FROM contact_messages ORDER BY created_at DESC LIMIT 100').all();return json({games:await catalogFor('owner'),orders,messages,mode:'production',scope:'store'});});}
export async function PATCH(req:Request){return handle(async()=>{sameOrigin(req);await authorized();const b=await body(req);if(!b||!games.some(g=>g.packs.some(p=>p.id===b.sku))||!Number.isInteger(b.price)||b.price<1||b.price>10000000||typeof b.active!=='boolean')throw new HttpError(400,'Harga harus bilangan bulat antara Rp 1–10.000.000.');const db=await database();await db.prepare('INSERT INTO prices(user_id,sku,price,active) VALUES(?,?,?,?) ON CONFLICT(user_id,sku) DO UPDATE SET price=excluded.price,active=excluded.active').bind('owner',b.sku,b.price,b.active?1:0).run();return json({ok:true});});}
