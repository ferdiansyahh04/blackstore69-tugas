import {database} from '../db';
import {dispatchForUser} from './digiflazz';
import {flushWhatsApp,queueWhatsApp} from './fonnte';

export async function advance(db:Awaited<ReturnType<typeof database>>,user:string){
 const expired=db.raw.prepare("UPDATE orders SET status='expired' WHERE user_id=? AND status='pending' AND created_at<=? RETURNING id").all(user,Date.now()-3600000) as unknown as {id:string}[];
 for(const order of expired)queueWhatsApp(db,order.id,'expired');
 await dispatchForUser(db,user);
 await flushWhatsApp(db,{userId:user,limit:4});
}
