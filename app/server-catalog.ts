import {games} from './catalog';
import {database} from '../db';
export async function catalogFor(userId:string|null){
 const db=await database();
 const {results}=await db.prepare('SELECT sku,price,active FROM prices WHERE user_id=?').bind(userId||'owner').all<{sku:string;price:number;active:number}>();
 const map=new Map(results.map(r=>[r.sku,r]));
 return games.map(g=>({...g,packs:g.packs.map(p=>{
  const saved=map.get(p.id),price=saved?.price??p.price;
  return {...p,price,active:Number.isSafeInteger(price)&&price>=1000&&(saved?saved.active===1:p.price>=1000)};
 })}));
}
