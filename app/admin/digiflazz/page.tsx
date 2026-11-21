'use client';
import {useEffect,useState} from 'react';
import {Shell,PageTitle} from '../../ui';
import {api} from '../../hooks';
type Tx={order_id:string;ref_id:string;sku:string;status:string;order_status:string|null;last_try:number;attempts:number;message:string;rc:string};
type Event={id:number;at:number;event:string;verified:number;code:number;reason:string;ref_id:string;status:string;rc:string};
type Report={config:{enabled:boolean;testing:boolean;usernameSet:boolean;keySet:boolean;secretSet:boolean;endpoint:string};problem:string;transactions:Tx[];pending:{id:string;sku:string}[];events:Event[]};
const reasons:Record<string,string>={ping_received:'Ping Digiflazz diterima',signature_invalid:'Signature ditolak: cocokkan secret aplikasi dan Digiflazz',secret_not_configured:'Secret aplikasi belum tersedia',ref_id_not_found:'Webhook valid, referensi tidak ditemukan di toko',identity_mismatch:'SKU atau tujuan berbeda dari transaksi tersimpan',status_applied:'Status supplier tersimpan',duplicate_final:'Notifikasi final diterima ulang',final_preserved:'Status final dipertahankan',invalid_payload:'Format transaksi tidak sesuai',invalid_json:'JSON tidak valid'};
const time=(ms:number)=>ms?new Date(ms).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})+' WIB':'Belum dikirim';
export default function Page(){
 const [report,setReport]=useState<Report|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 async function load(){try{setReport(await api<Report>('/api/admin/digiflazz'));setError('');}catch(e){setError(e instanceof Error?e.message:'Gagal memuat.');}}
 useEffect(()=>{void load();const timer=setInterval(()=>void load(),15000);return()=>clearInterval(timer);},[]);
 async function action(data:object){setBusy(true);setNotice('');try{const result=await api<{reason:string;status?:string;ref_id?:string}>('/api/admin/digiflazz',{method:'POST',body:JSON.stringify(data)});setNotice([result.ref_id,result.status,reasons[result.reason]||result.reason].filter(Boolean).join(' · '));await load();}catch(e){setError(e instanceof Error?e.message:'Permintaan gagal.');}finally{setBusy(false);}}
 return <Shell><PageTitle tag="DIGIFLAZZ" title="Status supplier dan webhook." sub="Periksa pengiriman top-up, respons supplier, dan notifikasi yang masuk."/>
 <div className="section-head"><a href="/admin">← Panel admin</a><a href="/admin/midtrans">Pembayaran Midtrans</a><button className="secondary" disabled={busy} onClick={()=>void load()}>Muat ulang</button></div>
 {error&&<p className="error" role="alert">{error} <a href="/masuk?return_to=%2Fadmin%2Fdigiflazz">Masuk pemilik →</a></p>}
 {notice&&<p className="notice" role="status">{notice}</p>}
 {report&&<>
 <section className="panel" style={{margin:'20px 0',padding:24}}><h2>Koneksi aplikasi</h2><p>Integrasi: {report.config.enabled?'Aktif':'Nonaktif'} · Mode: {report.config.testing?'Development':'Production'}</p><p>Username: {report.config.usernameSet?'Terisi':'Belum terisi'} · API key: {report.config.keySet?'Terisi':'Belum terisi'} · Secret webhook: {report.config.secretSet?'Terisi':'Belum terisi'}</p><p>Endpoint transaksi: <code>{report.config.endpoint}</code></p>{report.problem&&<p className="error">{report.problem}</p>}
 {report.config.testing&&<><p>Tes di bawah memakai data uji resmi Digiflazz dan tidak mengubah pesanan pelanggan. Setelah respons Pending, periksa notifikasi di bagian bawah.</p><div style={{display:'flex',gap:12,flexWrap:'wrap'}}><button disabled={busy||!!report.problem} onClick={()=>void action({action:'probe',outcome:'success'})}>Tes callback sukses</button><button className="secondary" disabled={busy||!!report.problem} onClick={()=>void action({action:'probe',outcome:'failed'})}>Tes callback gagal</button></div></>}</section>
 <h2>Transaksi supplier</h2><p className="hint">Cek ulang memakai referensi, SKU, dan tujuan yang sama. SKU game dengan ID pemain bebas tidak termasuk skenario uji resmi Digiflazz; hasil akhirnya belum dijamin.</p>
 {report.pending.map(o=><section className="panel" key={o.id} style={{padding:20,margin:'12px 0'}}><strong>{o.id}</strong><p>{o.sku} · Pembayaran diproses, transaksi supplier belum tercatat.</p><button disabled={busy||!!report.problem} onClick={()=>void action({action:'recheck',orderId:o.id})}>Kirim ke development</button></section>)}
 {report.transactions.length===0&&<p>Belum ada transaksi supplier.</p>}
 {report.transactions.map(t=><section className="panel" key={t.order_id} style={{padding:20,margin:'12px 0',overflowWrap:'anywhere'}}><div className="section-head"><strong>{t.order_id}</strong><span className="pill">{t.status}</span></div><p>SKU: {t.sku} · Pesanan: {t.order_status||'Tes koneksi terpisah'} · RC: {t.rc||'—'}</p><p>{t.message||'Tidak ada pesan supplier.'}</p><p className="hint">{time(t.last_try)} · {t.attempts} permintaan · Ref: {t.ref_id}</p>{!['Sukses','Gagal'].includes(t.status)&&<button className="secondary" disabled={busy||!!report.problem} onClick={()=>void action({action:'recheck',orderId:t.order_id})}>Cek status supplier</button>}</section>)}
 <h2>Log webhook Digiflazz</h2><p className="hint">Log mulai dicatat setelah pembaruan dipasang. Diperbarui otomatis setiap 15 detik. Secret dan isi lengkap payload tidak ditampilkan.</p>
 {report.events.length===0&&<p className="panel" style={{padding:24}}>Belum ada request yang tercatat oleh aplikasi. Jalankan ping atau tes callback di atas.</p>}
 {report.events.map(e=><section className="panel" key={e.id} style={{padding:20,margin:'12px 0',overflowWrap:'anywhere'}}><div className="section-head"><strong>{reasons[e.reason]||e.reason}</strong><span className="pill">HTTP {e.code}</span></div><p>{time(e.at)} · Event: {e.event} · {e.verified?'Signature valid':'Belum terverifikasi'}</p>{e.ref_id&&<p>Ref: {e.ref_id} · {e.status} · RC: {e.rc||'—'}</p>}</section>)}
 </>}
 </Shell>;
}
