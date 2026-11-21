import {Shell,PageTitle} from '../ui';
export const metadata={title:'Cara transaksi',description:'Panduan membeli produk game, pulsa, paket data, token listrik, serta membayar tagihan PLN dan PDAM di black.store69.'};
const steps=[
 ['01','Pilih produk atau layanan','Buka katalog, lalu pilih game, pulsa, paket data, token listrik, atau pembayaran tagihan. Periksa operator, wilayah, nominal, serta harga dalam Rupiah.'],
 ['02','Masukkan data tujuan','Isi data sesuai produk: ID dan Zone ID untuk game, nomor HP untuk pulsa atau paket data, serta nomor meter atau pelanggan untuk PLN dan PDAM. Pilih wilayah PDAM yang sesuai.'],
 ['03','Periksa dan bayar','Untuk PLN dan PDAM, cek nama pelanggan atau rincian tagihan terlebih dahulu. Periksa kembali seluruh ringkasan pesanan, setujui ketentuan, lalu selesaikan pembayaran melalui QRIS.'],
 ['04','Pantau sampai selesai','Setelah pembayaran dikonfirmasi, pesanan diproses oleh penyedia layanan. Status, token listrik, atau bukti transaksi dapat dilihat melalui Riwayat dan Lacak Pesanan.'],
];
const faq=[
 ['Berapa lama pesanan diproses?','Sebagian besar produk digital diproses otomatis setelah pembayaran dikonfirmasi. Gangguan operator, penyedia produk, layanan tagihan, atau jaringan dapat membuat proses lebih lama.'],
 ['Data tujuan apa yang harus saya isi?','Game memakai ID tujuan dan Zone ID jika diminta. Pulsa dan paket data memakai nomor HP. PLN memakai nomor meter atau ID pelanggan, sedangkan PDAM memakai nomor pelanggan dan wilayah layanan.'],
 ['Apakah nama pelanggan atau nickname selalu diperiksa?','Pemeriksaan bergantung pada dukungan masing-masing penyedia. PLN dan PDAM menampilkan hasil pengecekan sebelum pembayaran. Untuk produk lain, selalu periksa sendiri data tujuan sebelum membayar.'],
 ['Apa yang terjadi jika transaksi gagal?','Jika pembayaran berhasil tetapi penyedia menyatakan gagal dan produk atau layanan tidak diterima, ajukan pemeriksaan melalui halaman Kontak sesuai Kebijakan Pengembalian Dana.'],
 ['Apakah saya perlu memberikan kata sandi atau OTP?','Tidak. black.store69 hanya meminta data tujuan yang diperlukan untuk memenuhi pesanan. Jangan pernah memberikan kata sandi, PIN, atau OTP kepada siapa pun.'],
 ['Di mana pesanan saya disimpan?','Pesanan dikaitkan dengan akun sesi pada perangkat ini. Simpan nomor pesanan dan jangan menghapus data situs sebelum transaksi selesai.'],
];
export default function Guide(){return <Shell active="guide"><div className="narrow"><PageTitle tag="DARI PILIH PRODUK SAMPAI SELESAI" title="Transaksi mudah untuk semua produk." sub="Ikuti langkah berikut untuk membeli produk digital atau membayar tagihan di black.store69."/><div className="guide-steps">{steps.map(([n,t,p])=><section className="panel guide-step" key={n}><span>{n}</span><div><h2>{t}</h2><p>{p}</p></div></section>)}</div><h2 className="faq-title">Yang sering ditanyakan</h2>{faq.map(([q,a])=><details className="faq" key={q}><summary>{q}</summary><p>{a}</p></details>)}<a className="primary" href="/">Pilih produk sekarang ↗</a></div></Shell>}
