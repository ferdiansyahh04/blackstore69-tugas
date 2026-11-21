'use client';
import {useState} from 'react';
import {rupiah} from './catalog';
import {useCatalog, type LiveGame} from './hooks';
import {Shell} from './ui';
import {OPERATORS, OperatorLogo} from './operators';
import {UtilityCards, useUtilityProducts} from './utility-ui';
import {utilityServices} from './utility-types';
import ArenaBackground from './arena-background';

function startingPrice(product:LiveGame|undefined, operator?:string){
 const prices=product?.packs.filter(pack=>pack.active&&(!operator||pack.group===operator)).map(pack=>pack.price)||[];
 return prices.length?'Mulai '+rupiah(Math.min(...prices)):'Sedang tidak tersedia';
}

export default function Store(){
 const {games,error,ready}=useCatalog();
 const utilities=useUtilityProducts();
 const [search,setSearch]=useState('');
 const query=search.trim().toLocaleLowerCase('id');
 const matches=(terms:string[])=>!query||query.split(/\s+/).every(word=>terms.join(' ').toLocaleLowerCase('id').split(/[\s:,.&/+#()-]+/).some(term=>term.startsWith(word)));
 const gameProducts=games.filter(game=>game.id!=='pulsa'&&game.id!=='paket-data');
 const visibleGames=gameProducts.filter(game=>matches([game.name,game.abbr,game.publisher,game.type,'game games',...game.packs.filter(pack=>pack.active).map(pack=>pack.label)]));
 const phoneGroups=[
  {id:'pulsa',title:'Pulsa',description:'Isi pulsa untuk nomor prabayar.',number:'02'},
  {id:'paket-data',title:'Paket data',description:'Pilih paket sesuai operator nomormu.',number:'03'},
 ].map(group=>{
  const product=games.find(game=>game.id===group.id);
  const brands=new Set(product?.packs.filter(pack=>pack.active).map(pack=>pack.group));
  const operators=OPERATORS.filter(operator=>brands.has(operator.id)&&matches([operator.name,operator.id,group.title,'operator nomor hp']));
  return {...group,product,operators};
 });
 const visibleUtilities=utilityServices.filter(service=>matches([service.name,service.description,service.label,...utilities.products.filter(product=>product.active&&product.kind===service.id).map(product=>product.name)]));
 const loading=!ready&&!error;
 const noResults=ready&&utilities.ready&&!visibleGames.length&&!phoneGroups.some(group=>group.operators.length)&&!visibleUtilities.length;

 return <Shell active="topup">
  <div className="storefront">
   <section className="front-hero" aria-labelledby="front-title">
    <div className="front-hero-copy">
     <div className="front-hero-kicker"><p className="front-intro">Game dan kebutuhan digital, satu tempat.</p><ArenaBackground/></div>
     <h1 id="front-title">MAIN LAGI.<br/>ISI ULANG.</h1>
     <div className="front-hero-bottom">
      <p>Top up game, isi pulsa dan data.<br/>Token listrik serta tagihan rumah juga ada.</p>
      <a className="primary" href="#katalog">Pilih produk</a>
     </div>
    </div>
    <a className="front-feature" href="/game/mobile-legends" aria-label="Top up Mobile Legends">
     <img src="/games/mobile-legends.jpg" alt="Karakter Mobile Legends: Bang Bang" width={700} height={500} fetchPriority="high"/>
     <div className="front-feature-caption"><span>Top up game</span><strong>Mobile Legends</strong><span aria-hidden="true">↗</span></div>
    </a>
   </section>

   <section id="katalog" className="front-catalog" aria-labelledby="catalog-title">
    <div className="front-catalog-intro">
     <div><p className="front-label">Katalog black.store69</p><h2 id="catalog-title">Pilih produkmu.</h2></div>
     <div className="front-search-wrap">
      <label htmlFor="catalog-search">Cari produk</label>
      <div className="front-search"><input id="catalog-search" type="search" placeholder="Nama game, operator, PLN atau PDAM" value={search} onChange={event=>setSearch(event.target.value)}/>{search&&<button type="button" onClick={()=>setSearch('')} aria-label="Hapus pencarian">×</button>}</div>
     </div>
    </div>
    {error&&<div className="error" role="alert">Katalog belum berhasil dimuat. {error} <a href="/">Muat ulang katalog</a></div>}
    {loading&&<p className="front-loading" role="status">Memuat produk dan harga terbaru…</p>}
    {!loading&&!error&&visibleGames.length>0&&<section className="front-group" aria-labelledby="section-games">
     <div className="front-group-heading"><span className="front-section-number" aria-hidden="true">01</span><h2 id="section-games">Game</h2><span>{visibleGames.length} pilihan</span></div>
     <div className="front-game-grid">{visibleGames.map(game=><a href={'/game/'+game.id} className="front-game" key={game.id}>
      <div className="front-game-art">{game.image&&<img src={game.image} alt="" width={320} height={380} loading="lazy"/>}</div>
      <div className="front-game-details"><p>{game.publisher}</p><h3>{game.name}</h3><span>{startingPrice(game)}</span></div>
     </a>)}</div>
    </section>}

    {!loading&&!error&&<div className="front-phone-groups">{phoneGroups.filter(group=>group.operators.length>0).map(group=><section className="front-phone-group" key={group.id} aria-labelledby={'section-'+group.id}>
     <div className="front-group-heading"><span className="front-section-number" aria-hidden="true">{group.number}</span><h2 id={'section-'+group.id}>{group.title}</h2><span>{group.operators.length} operator</span></div>
     <p className="front-group-description">{group.description}</p>
     <div className="front-operator-list">{group.operators.map(operator=><a href={'/game/'+group.id+'?operator='+operator.id} className="front-operator" key={operator.id}>
      <OperatorLogo id={operator.id}/><div><h3>{operator.name}</h3><p>{startingPrice(group.product,operator.id)}</p></div><span className="front-open" aria-hidden="true">↗</span>
     </a>)}</div>
    </section>)}</div>}

    <UtilityCards products={utilities.products} ready={utilities.ready} error={utilities.error} services={visibleUtilities}/>
    {noResults&&<div className="front-empty" role="status"><h2>Produk belum ditemukan.</h2><p>Coba nama game, operator, PLN, atau PDAM.</p><button className="secondary" type="button" onClick={()=>setSearch('')}>Tampilkan semua produk</button></div>}
    <p className="front-price-note">Harga dalam Rupiah (IDR). Pesanan diproses setelah pembayaran terkonfirmasi.</p>
   </section>

   <section className="front-help" aria-labelledby="front-help-title">
    <div><p className="front-label">Sebelum membayar</p><h2 id="front-help-title">Cek tujuan.<br/>Baru lanjut.</h2></div>
    <div className="front-help-copy"><p>Pastikan ID game, nomor HP, nomor meter, atau nomor pelanggan sudah benar. Untuk tagihan PLN dan PDAM, periksa rincian tagihan sebelum membayar.</p><a className="front-text-link" href="/panduan">Baca cara transaksi <span aria-hidden="true">↗</span></a></div>
   </section>
  </div>
 </Shell>;
}
