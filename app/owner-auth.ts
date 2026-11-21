import {cookies} from 'next/headers';
import {createHmac,randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
export const cookieName='blackstore_owner';
const buyerCookie='blackstore_buyer';
function secret(){const s=process.env.SESSION_SECRET;if(!s||s.length<32)throw Error('Konfigurasi login belum lengkap.');return s;}
function sign(payload:string){return createHmac('sha256',secret()).update(payload).digest('base64url')}
function valid(value:string|undefined){if(!value||value.length>512)return null;try{const [p,s,...rest]=value.split('.');if(rest.length||!p||!s)return null;const expected=Buffer.from(sign(p),'base64url'),actual=Buffer.from(s,'base64url');if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return null;const claims=JSON.parse(Buffer.from(p,'base64url').toString());if(typeof claims.exp!=='number'||claims.exp<=Date.now())return null;return claims}catch{return null}}
export function issueToken(){const p=Buffer.from(JSON.stringify({exp:Date.now()+8*3600000,nonce:randomBytes(16).toString('hex')})).toString('base64url');return p+'.'+sign(p)}
export async function owner(){const claims=valid((await cookies()).get(cookieName)?.value);return claims?{userId:'owner',displayName:'Pemilik toko',email:'',fullName:'Pemilik toko'}:null}
export async function buyerIdentity(){if(await owner())return 'owner';const jar=await cookies();const current=valid(jar.get(buyerCookie)?.value);if(current&&typeof current.id==='string'&&/^guest_[a-f0-9]{32}$/.test(current.id))return current.id;const id='guest_'+randomBytes(16).toString('hex');const p=Buffer.from(JSON.stringify({id,exp:Date.now()+30*86400000})).toString('base64url');jar.set(buyerCookie,p+'.'+sign(p),{httpOnly:true,secure:new URL(process.env.SITE_ORIGIN||'https://blackstore69.web.id').protocol==='https:',sameSite:'lax',path:'/',maxAge:30*86400});return id}
export function checkPassword(password:string){const hash=process.env.OWNER_PASSWORD_HASH;const salt=process.env.OWNER_PASSWORD_SALT;if(!hash||!salt)return false;const expected=Buffer.from(hash,'hex');const actual=scryptSync(password,salt,64);return expected.length===actual.length&&timingSafeEqual(expected,actual)}
