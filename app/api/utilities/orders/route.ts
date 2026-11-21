import {database} from '../../../../db';
import {handle,json,identity,sameOrigin,body,HttpError} from '../../../api-utils';
import {createUtilityOrder} from '../../../utility-order';
export const dynamic='force-dynamic';
export async function POST(req:Request){return handle(async()=>{sameOrigin(req);const user=await identity();const b=await body(req);if(!b||typeof b!=='object'||Array.isArray(b))throw new HttpError(400,'Data tidak valid.');return json(await createUtilityOrder(await database(),user,b),201);});}
