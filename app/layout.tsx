import type {Metadata} from 'next';
import CookieNotice from './cookie-notice';
import './globals.css';
import './design-system.css';

export const metadata:Metadata={
  metadataBase:new URL('https://blackstore69.web.id'),
  title:{default:'black.store69 | Produk digital & pembayaran tagihan',template:'%s | black.store69'},
  description:'Beli top-up game, pulsa, paket data, dan token PLN atau bayar tagihan PLN serta PDAM dalam Rupiah. Bayar via QRIS dan lacak status pesanan.',
  keywords:['produk digital','pulsa','paket data','token pln','pln pascabayar','pdam','top up game','mobile legends','free fire','pubg mobile','valorant','pembayaran qris'],
  authors:[{name:'black.store69'}],creator:'black.store69',
  openGraph:{type:'website',locale:'id_ID',url:'https://blackstore69.web.id',siteName:'black.store69',title:'black.store69 | Produk digital & pembayaran tagihan',description:'Game, pulsa, paket data, token PLN, serta tagihan PLN dan PDAM dalam satu tempat. Bayar via QRIS.',images:[{url:'/og.png',width:1536,height:1024,alt:'black.store69'}]},
  twitter:{card:'summary_large_image',title:'black.store69 | Produk digital & pembayaran tagihan',description:'Game, pulsa, paket data, token PLN, serta tagihan PLN dan PDAM. Bayar via QRIS.',images:['/og.png']},
  robots:{index:true,follow:true,googleBot:{index:true,follow:true,'max-video-preview':-1,'max-image-preview':'large','max-snippet':-1}},
  icons:{icon:'/favicon.png'},
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
 return <html lang="id"><head><link rel="preload" href="/fonts/barlow-condensed-800.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/></head><body>{children}<CookieNotice/></body></html>;
}
