import {Shell} from '../ui';
import ContactForm from '../contact-form';

export const dynamic='force-dynamic';

export const metadata={
 title:'Kontak bisnis',
 description:'Hubungi layanan pelanggan black.store69 untuk bantuan produk digital, pembayaran tagihan, dan status pesanan.',
};

export default function Contact(){
 const email=process.env.BUSINESS_EMAIL?.trim();
 const whatsapp=process.env.BUSINESS_WHATSAPP?.trim();
 const waNumber=whatsapp?.replace(/\D/g,'');
 return <Shell active="contact">
  <div className="contact-page">
   <section className="contact-hero">
    <h1>Butuh bantuan?<br/>Hubungi admin.</h1>
    <p>Pilih kanal yang tersedia untuk bantuan transaksi, kendala pembayaran, status pesanan, atau pertanyaan seputar layanan black.store69.</p>
   </section>

   <section className="contact-channel-grid" aria-label="Kanal layanan pelanggan">
    {waNumber&&<article className="contact-channel contact-channel-wa">
     <span className="contact-channel-number" aria-hidden="true">01</span>
     <h2>WhatsApp</h2>
     <p>Chat langsung dengan admin untuk bantuan transaksi dan pemeriksaan status pesanan.</p>
     <a className="contact-channel-action" href={'https://wa.me/'+waNumber} target="_blank" rel="noreferrer">Chat WhatsApp <span aria-hidden="true">↗</span></a>
    </article>}

    <article className="contact-channel contact-channel-telegram">
     <span className="contact-channel-number" aria-hidden="true">02</span>
     <h2>Telegram</h2>
     <p>Hubungi admin melalui <strong>@Ferddiansyahh</strong> untuk bantuan pesanan dan informasi layanan.</p>
     <a className="contact-channel-action" href="https://t.me/Ferddiansyahh" target="_blank" rel="noreferrer">Buka Telegram <span aria-hidden="true">↗</span></a>
    </article>

    <article className="contact-channel contact-channel-discord">
     <span className="contact-channel-number" aria-hidden="true">03</span>
     <h2>Discord</h2>
     <p>Cari dan tambahkan username <strong>_ferdi7</strong> di Discord untuk menghubungi admin.</p>
     <a className="contact-channel-action" href="https://discord.com/app" target="_blank" rel="noreferrer">Buka Discord <span aria-hidden="true">↗</span></a>
    </article>
   </section>

   <section className="contact-service-info">
    {email&&<div><span>Email bisnis</span><strong><a href={'mailto:'+email}>{email}</a></strong></div>}
    <div><span>Jam layanan</span><strong>Senin–Sabtu, 09.00–21.00 WIB</strong></div>
    <div><span>Wilayah layanan</span><strong>Indonesia</strong></div>
   </section>

   <div id="form-bantuan" className="contact-form-wrap"><ContactForm/></div>
  </div>
 </Shell>;
}
