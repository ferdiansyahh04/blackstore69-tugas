'use client';
import {useEffect,useState} from 'react';
import {api} from './hooks';
import {rupiah} from './catalog';
import {utilityServices,type UtilityProduct} from './utility-types';
export function UtilityIcon({water=false}:{water?:boolean}){return <span className={'utility-icon '+(water?'water':'')}><svg viewBox="0 0 64 64" fill="none" aria-hidden="true">{water?<path d="M32 7C26 18 13 29 13 41a19 19 0 0 0 38 0C51 29 38 18 32 7Z" fill="currentColor"/>:<path d="M36 5 12 36h17l-2 23 26-34H35l1-20Z" fill="currentColor"/>}</svg></span>;}
export function useUtilityProducts(){const [products,setProducts]=useState<UtilityProduct[]>([]),[error,setError]=useState(''),[ready,setReady]=useState(false);useEffect(()=>{let live=true;api<{products:UtilityProduct[]}>('/api/utilities').then(r=>{if(live){setProducts(r.products);setReady(true)}}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[]);return {products,error,ready};}
export function UtilityCards({products,ready,error,services}:{products:UtilityProduct[];ready:boolean;error:string;services:readonly (typeof utilityServices[number])[]}){
 if(!services.length)return null;
 return <section className="front-utilities" aria-labelledby="section-utilities">
  <div className="front-utilities-title"><span className="front-section-number" aria-hidden="true">04</span><h2 id="section-utilities">Listrik<br/>& air.</h2><p>Keperluan rumah, dari token hingga tagihan bulanan.</p></div>
  <div className="front-utility-list">
   {error&&<p className="error" role="alert">Layanan listrik dan air belum berhasil dimuat. <a href="/">Muat ulang katalog</a></p>}
   {!ready&&!error&&<p className="front-loading" role="status">Memuat layanan listrik dan air…</p>}
   {ready&&services.map(service=>{
    const available=products.filter(product=>product.kind===service.id&&product.active);
    const prices=available.map(product=>product.price).filter((price):price is number=>typeof price==='number');
    return <a href={'/layanan/'+service.id} className="front-utility" key={service.id}>
     <UtilityIcon water={service.icon==='water'}/><div><span>{service.label==='PRABAYAR'?'Prabayar':'Pascabayar'}</span><h3>{service.name}</h3><p>{service.description}</p></div>
     <div className="front-utility-price"><span>{available.length?(prices.length?'Mulai '+rupiah(Math.min(...prices)):'Cek tagihan dahulu'):'Sedang tidak tersedia'}</span><span className="front-open" aria-hidden="true">↗</span></div>
    </a>;
   })}
  </div>
 </section>;
}
