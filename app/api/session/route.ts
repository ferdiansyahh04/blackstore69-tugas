import {cookies} from 'next/headers';
import {body,handle,HttpError,json,sameOrigin} from '../../api-utils';
import {checkPassword,cookieName,issueToken} from '../../owner-auth';
import {database} from '../../../db';
export const dynamic='force-dynamic';
export async function POST(req:Request){return handle(async()=>{
 sameOrigin(req);const b=await body(req);if(typeof b?.password!=='string'||b.password.length>256)throw new HttpError(400,'Password tidak valid.');
 if(!process.env.OWNER_PASSWORD_HASH||!process.env.SESSION_SECRET)throw new HttpError(503,'Login pemilik belum dikonfigurasi.');
 const db=await database();const now=Date.now();
 // Persisted shared limit across Passenger workers; no trust in client-supplied IP headers.
 await db.prepare("INSERT INTO login_attempts(id,count,until_ms) VALUES('owner',1,?) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN until_ms<=? THEN 1 ELSE count+1 END, until_ms=CASE WHEN until_ms<=? THEN excluded.until_ms ELSE until_ms END").bind(now+300000,now,now).run();
 const limit=await db.prepare("SELECT count FROM login_attempts WHERE id='owner'").first<{count:number}>();
 if((limit?.count??99)>10)throw new HttpError(429,'Terlalu banyak percobaan. Tunggu 5 menit.');
 if(!checkPassword(b.password))throw new HttpError(401,'Password tidak sesuai.');
 await db.prepare("DELETE FROM login_attempts WHERE id='owner'").run();
 (await cookies()).set(cookieName,issueToken(),{httpOnly:true,secure:new URL(process.env.SITE_ORIGIN||'https://blackstore69.web.id').protocol==='https:',sameSite:'strict',path:'/',maxAge:8*3600});
 return json({ok:true});
});}
export async function DELETE(req:Request){return handle(async()=>{sameOrigin(req);(await cookies()).delete(cookieName);return json({ok:true});});}
