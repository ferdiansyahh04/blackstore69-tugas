const PAYMENT_ORIGIN='https://api-pay.sumopod.com/api/v1';
const PAYMENT_HOSTS=['checkout.pymnt.app','pay.sumopod.com','sumo.pymnt.global'];
export type SumoPayment={payment_id:string;order_id:string;amount:number;payment_link_url:string;status:string;fee?:number;net_amount?:number;expires_at?:string};
export function sumoEnabled(){return process.env.SUMOPOD_CHECKOUT_ENABLED==='true'&&!!process.env.SUMOPOD_API_KEY;}
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const errorCode=(error:unknown)=>error instanceof Error&&error.cause&&typeof error.cause==='object'&&'code' in error.cause?String((error.cause as {code?:unknown}).code||'UNKNOWN'):'UNKNOWN';

export async function createSumoPayment(input:{orderId:string;amount:number;method:string;singleAttempt?:boolean}):Promise<SumoPayment>{
 const key=process.env.SUMOPOD_API_KEY;if(!key)throw new Error('Layanan pembayaran belum dikonfigurasi.');
 if(input.method!=='QRIS')throw new Error('Pilih metode pembayaran QRIS.');
 const configured=(process.env.SUMOPOD_BASE_URL||PAYMENT_ORIGIN).replace(/\/$/,'');
 if(new URL(configured).hostname!=='api-pay.sumopod.com')throw new Error('Konfigurasi pembayaran tidak valid.');
 for(let attempt=0;attempt<(input.singleAttempt?1:2);attempt++){
  const providerOrderId=attempt===0?input.orderId:input.orderId+'-R1';
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
  try{
   let response:Response;
   try{
    response=await fetch(configured+'/payments',{method:'POST',headers:{'Content-Type':'application/json','X-Api-Key':key},body:JSON.stringify({order_id:providerOrderId,amount:input.amount,currency:'IDR',expires_in_hours:1,success_return_url:(process.env.SITE_ORIGIN||'https://blackstore69.web.id')+'/pesanan/'+input.orderId,cancel_return_url:(process.env.SITE_ORIGIN||'https://blackstore69.web.id')+'/pesanan/'+input.orderId,payment_method_type_code:'QRIS'}),signal:controller.signal,redirect:'error'});
   }catch(error){
    if(error instanceof Error&&error.name==='AbortError'){
     if(attempt===0){console.error('SUMOPOD_TRANSIENT attempt=1 code=TIMEOUT');await pause(450);continue;}
     throw new Error('Layanan pembayaran tidak merespons. Coba lagi.');
    }
    if(attempt===0){console.error('SUMOPOD_TRANSIENT attempt=1 code='+errorCode(error));await pause(450);continue;}
    throw new Error('Koneksi pembayaran sedang terganggu. Coba lagi.');
   }
   const raw=await response.text();let data:unknown;
   try{data=JSON.parse(raw)}catch{
    if(attempt===0){console.error('SUMOPOD_TRANSIENT attempt=1 code=INVALID_JSON');await pause(450);continue;}
    throw new Error('Respons pembayaran tidak valid.');
   }
   if(!data||typeof data!=='object'){
    if(attempt===0){console.error('SUMOPOD_TRANSIENT attempt=1 code=INVALID_BODY');await pause(450);continue;}
    throw new Error('Respons pembayaran tidak valid.');
   }
   const value=data as Record<string,unknown>;
   if(!response.ok){
    const providerError=typeof value.error==='string'?value.error:typeof value.message==='string'?value.message:'';
    if(response.status===400&&/minimum payment amount/i.test(providerError))throw new Error('Minimum pembayaran QRIS adalah Rp 10.000.');
    if(attempt===0&&(response.status===409||response.status===429||response.status>=500)){console.error('SUMOPOD_TRANSIENT attempt=1 code=HTTP_'+response.status);await pause(450);continue;}
    throw new Error('Layanan pembayaran belum dapat memproses permintaan.');
   }
   if(typeof value.payment_id!=='string'||typeof value.order_id!=='string'||value.order_id!==providerOrderId||typeof value.payment_link_url!=='string'||typeof value.amount!=='number'||value.amount!==input.amount)throw new Error('Respons pembayaran tidak cocok dengan pesanan.');
   let paymentUrl:URL;try{paymentUrl=new URL(value.payment_link_url)}catch{throw new Error('Tautan pembayaran tidak valid.');}
   if(paymentUrl.protocol!=='https:'||!PAYMENT_HOSTS.includes(paymentUrl.hostname))throw new Error('Tautan pembayaran tidak aman.');
   return {payment_id:value.payment_id,order_id:value.order_id,amount:value.amount,payment_link_url:value.payment_link_url,status:typeof value.status==='string'?value.status:'pending',fee:typeof value.fee==='number'?value.fee:undefined,net_amount:typeof value.net_amount==='number'?value.net_amount:undefined,expires_at:typeof value.expires_at==='string'?value.expires_at:undefined};
  }finally{clearTimeout(timer)}
 }
 throw new Error('Koneksi pembayaran sedang terganggu. Coba lagi.');
}
