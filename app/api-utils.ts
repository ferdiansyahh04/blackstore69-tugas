import {buyerIdentity} from './owner-auth';
export class HttpError extends Error{constructor(public status:number,message:string){super(message)}}
export async function identity(){return buyerIdentity();}
export function sameOrigin(req:Request){const expected=new URL(process.env.SITE_ORIGIN||'https://blackstore69.web.id').origin;if(req.headers.get('origin')!==expected)throw new HttpError(403,'Permintaan harus berasal dari toko ini.');}
export async function body(req:Request){if(Number(req.headers.get('content-length')||0)>8192)throw new HttpError(413,'Data terlalu besar.');const text=await req.text();if(text.length>8192)throw new HttpError(413,'Data terlalu besar.');try{return JSON.parse(text)}catch{throw new HttpError(400,'Data tidak valid.');}}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export async function handle(fn:()=>Promise<Response>){try{return await fn()}catch(e){if(e instanceof HttpError)return json({error:e.message},e.status);console.error(e instanceof Error?e.message:'Internal error');return json({error:'Layanan belum dapat memproses permintaan. Coba kembali.'},500);}}
