import {notFound} from 'next/navigation';
import {games} from '../../catalog';
import Checkout from '../../checkout';

export async function generateMetadata({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const g=games.find(x=>x.id===slug);
 if(!g)return {title:'Produk tidak ditemukan',description:'Produk tidak tersedia.',openGraph:{images:[]},twitter:{images:[]}};
 const phone=slug==='pulsa'||slug==='paket-data';
 return {title:(phone?'Beli ':'Top up ')+g.name,description:phone?'Pilih operator dan nominal '+g.name.toLowerCase()+', lalu selesaikan pembayaran QRIS dalam Rupiah.':'Pilih '+g.name+' dan selesaikan pembayaran QRIS dalam Rupiah.',openGraph:{images:[]},twitter:{images:[]}};
}

export default async function GamePage({params,searchParams}:{params:Promise<{slug:string}>,searchParams:Promise<{operator?:string}>}){
 const [{slug},{operator}]=await Promise.all([params,searchParams]);
 const game=games.find(g=>g.id===slug);
 if(!game)notFound();
 const initialOperator=operator&&game.packs.some(pack=>pack.group===operator)?operator:'Semua';
 return <Checkout slug={slug} initialOperator={initialOperator}/>;
}
