import {database} from '../../../../db';
import {handle,json,identity,sameOrigin,body} from '../../../api-utils';
import {inquireUtility} from '../../../utility-inquiry';
export const dynamic='force-dynamic';
export async function POST(req:Request){return handle(async()=>{sameOrigin(req);const user=await identity();const b=await body(req);return json({quote:await inquireUtility(await database(),user,b?.productId,b?.target)});});}
