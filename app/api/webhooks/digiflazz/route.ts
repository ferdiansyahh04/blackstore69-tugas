import {handle,HttpError,json} from '../../../api-utils';
import {database} from '../../../../db';
import {receiveDigiflazz} from '../../../digiflazz';
import {flushWhatsApp} from '../../../fonnte';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){return json({service:'Product fulfillment webhook',method:'POST',message:'Endpoint aktif.'});}
export async function POST(req:Request){return handle(async()=>{
 const max=32768;
 if(Number(req.headers.get('content-length')||0)>max)throw new HttpError(413,'Payload terlalu besar.');
 if(!req.body)throw new HttpError(400,'Payload kosong.');
 const reader=req.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new HttpError(413,'Payload terlalu besar.');}chunks.push(value);}}finally{reader.releaseLock();}
 const db=await database();
 const result=receiveDigiflazz(db,Buffer.concat(chunks),req.headers.get('x-hub-signature'),req.headers.get('x-digiflazz-event')||'unknown');
 await flushWhatsApp(db,{limit:4});
 return json(result.body,result.code);
});}

