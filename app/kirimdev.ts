export const KIRIMDEV_BASE='https://api.kirimdev.com/v1';
export const TEMPLATE_NAME='blackstore69_order_update_v1';
export const TEMPLATE_BODY='Informasi pesanan black.store69\n\nNomor pesanan: {{1}}\nProduk: {{2}}\nTujuan: {{3}}\nTotal pembayaran: {{4}}\nStatus pesanan: {{5}}\n\nLihat invoice dan detail pesanan: {{6}}\n\nPesan ini dikirim karena Anda memilih menerima pemberitahuan pesanan melalui WhatsApp.';
export function kirimdevConfiguration(){
 const phoneId=process.env.KIRIMDEV_PHONE_NUMBER_ID?.trim()||'';
 const tokenSet=Boolean(process.env.KIRIMDEV_API_KEY?.trim());
 const templateApproved=process.env.KIRIMDEV_TEMPLATE_APPROVED==='true';
 return {provider:'kirimdev',enabled:process.env.KIRIMDEV_ENABLED==='true',tokenSet,phoneIdSet:/^\d+$/.test(phoneId),templateApproved,template:TEMPLATE_NAME};
}
export function kirimdevReady(){const c=kirimdevConfiguration();return c.enabled&&c.tokenSet&&c.phoneIdSet&&c.templateApproved;}
export class KirimdevError extends Error{constructor(public http:number,public retryable:boolean,public code:string){super('Kirimdev HTTP '+http+' ('+code+')');}}
export type KirimMessage={id:string;status:string;provider_id?:string};
export async function kirimRequest(path:string,body?:string,idempotency?:string){
 const token=process.env.KIRIMDEV_API_KEY?.trim();if(!token)throw new KirimdevError(0,false,'missing_key');
 let response:Response;
 try{response=await fetch(KIRIMDEV_BASE+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...(idempotency?{'Idempotency-Key':idempotency}:{})},body,redirect:'error',signal:AbortSignal.timeout(8000),cache:'no-store'});}
 catch{throw new KirimdevError(0,true,'network_uncertain');}
 let result;try{result=await response.json();}catch{throw new KirimdevError(response.status,true,'invalid_response');}
 if(!response.ok){const raw=String(result?.error?.code||'request_failed');const code=/^[a-zA-Z0-9_\-.]{1,100}$/.test(raw)?raw:'request_failed';throw new KirimdevError(response.status,response.status===429||response.status>=500,code);}
 return result;
}
export function messagePath(phoneId:string,messageId?:string){if(!/^\d+$/.test(phoneId))throw new KirimdevError(0,false,'invalid_phone_id');return '/'+phoneId+'/messages'+(messageId?'/'+encodeURIComponent(messageId):'');}
export function messageResult(result:unknown):KirimMessage{
 const d=(result as {data?:KirimMessage})?.data;
 if(!d||typeof d.id!=='string'||!/^msg_[A-Za-z0-9_-]+$/.test(d.id)||!['pending','sent','delivered','read','failed'].includes(d.status))throw new KirimdevError(0,true,'invalid_message_response');
 return d;
}
