import type {ReactNode} from 'react';

const navigation=[
 {href:'/',label:'Home',key:'topup'},
 {href:'/lacak',label:'Lacak pesanan',key:'track'},
 {href:'/panduan',label:'Cara transaksi',key:'guide'},
 {href:'/kontak',label:'Kontak',key:'contact'},
];

export function Shell({children,active=''}:{children:ReactNode;active?:string}){
 return <>
  <a className="skip-link" href="#main-content">Langsung ke konten</a>
  <header className="site-header">
   <a className="brand" href="/" aria-label="black.store69, beranda">black<span>.store69</span><i aria-hidden="true">↗</i></a>
   <nav aria-label="Navigasi utama">{navigation.map(item=><a key={item.key} className={active===item.key?'active':''} aria-current={active===item.key?'page':undefined} href={item.href}>{item.label}</a>)}</nav>
   <a className="account" href="/riwayat">Riwayat</a>
  </header>
  <main id="main-content" tabIndex={-1}>{children}</main>
  <footer className="site-footer">
   <div className="footer-identity"><a className="brand" href="/">black<span>.store69</span><i aria-hidden="true">↗</i></a><p>Game, pulsa, data, listrik, dan air.</p></div>
   <div className="footer-links"><a href="/tentang-kami">Tentang</a><a href="/kontak">Kontak</a><a href="/syarat-ketentuan">Syarat & Ketentuan</a><a href="/kebijakan-privasi">Privasi</a><a href="/kebijakan-pengembalian">Pengembalian dana</a></div>
   <small>© 2026 black.store69 · Harga dalam Rupiah (IDR)</small>
  </footer>
 </>;
}
export function PageTitle({tag,title,sub}:{tag:string;title:string;sub?:string}){
 return <div className="page-title"><span className="eyebrow">{tag}</span><h1>{title}</h1>{sub&&<p>{sub}</p>}</div>;
}
