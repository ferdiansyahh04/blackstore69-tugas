import {database} from '../../../../db';
import {HttpError,handle,json,sameOrigin} from '../../../api-utils';
import {owner} from '../../../owner-auth';
import {fonnteDiagnostics,sendFonnteTest} from '../../../fonnte';

export const dynamic='force-dynamic';

async function authorized(){if(!await owner())throw new HttpError(401,'Masuk sebagai pemilik toko terlebih dahulu.');}

export async function GET(){
 return handle(async()=>{
  await authorized();const data=fonnteDiagnostics(await database());
  return json({config:{enabled:data.config.enabled,tokenSet:data.config.tokenSet,businessTargetSet:!!data.config.businessTarget},notifications:data.notifications});
 });
}

export async function POST(req:Request){
 return handle(async()=>{
  sameOrigin(req);await authorized();const data=fonnteDiagnostics(await database());
  if(!data.config.businessTarget)throw new HttpError(400,'Nomor WhatsApp bisnis belum diatur.');
  try{return json(await sendFonnteTest(data.config.businessTarget))}catch(error){throw new HttpError(502,error instanceof Error?error.message:'Tes Fonnte gagal.');}
 });
}
