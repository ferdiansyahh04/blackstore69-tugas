import {handle,HttpError,json,sameOrigin,body} from '../../../api-utils';
import {owner} from '../../../owner-auth';
import {database} from '../../../../db';
import {digiflazzDiagnostics,recheckDigiflazz,createDigiflazzProbe} from '../../../digiflazz';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function authorized(){if(!await owner())throw new HttpError(401,'Masuk sebagai pemilik toko terlebih dahulu.');}
export async function GET(){return handle(async()=>{await authorized();return json(digiflazzDiagnostics(await database()));});}
export async function POST(req:Request){return handle(async()=>{
 await authorized();sameOrigin(req);const input=await body(req),db=await database();
 if(input?.action==='probe'&&['success','failed'].includes(input.outcome))return json(await createDigiflazzProbe(db,input.outcome));
 if(input?.action==='recheck'&&typeof input.orderId==='string'&&/^[-A-Za-z0-9_]{3,120}$/.test(input.orderId))return json(await recheckDigiflazz(db,input.orderId));
 throw new HttpError(400,'Aksi tidak valid.');
});}

