import {database} from '../../../../db';
import {HttpError,handle,json,sameOrigin} from '../../../api-utils';
import {owner} from '../../../owner-auth';
import {whatsappDiagnostics,refreshWhatsApp} from '../../../whatsapp';
export const dynamic='force-dynamic';
async function authorized(){if(!await owner())throw new HttpError(401,'Masuk sebagai pemilik toko terlebih dahulu.');}
export async function GET(){return handle(async()=>{await authorized();return json(whatsappDiagnostics(await database()));});}
export async function POST(req:Request){return handle(async()=>{sameOrigin(req);await authorized();const checked=await refreshWhatsApp(await database(),5);return json({checked});});}
