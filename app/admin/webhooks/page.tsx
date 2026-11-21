'use client';
import {useEffect,useState} from 'react';
import {Shell,PageTitle} from '../../ui';
import {api} from '../../hooks';
type Event={digest:string;payload:unknown;first_received:number;last_received:number;deliveries:number};
export default function Webhooks(){
 const [events,setEvents]=useState<Event[]>([]),[error,setError]=useState(''),[loaded,setLoaded]=useState(false),[configured,setConfigured]=useState(false);
 async function load(){setError('');try{const data=await api<{events:Event[];configured:boolean}>('/api/webhooks/sumopod');setEvents(data.events);setConfigured(data.configured);}catch(e){setError((e as Error).message);}finally{setLoaded(true);}}
 useEffect(()=>{load();},[]);
 return <Shell><PageTitle tag="PEMBAYARAN" title="Notifikasi pembayaran." sub="Penerimaan webhook pembayaran, khusus pemilik toko."/><div className="notice">Event payment.completed dengan order ID dan nominal yang cocok akan memindahkan pesanan ke tahap proses dan meneruskan top-up bila integrasi supplier aktif.</div><div className="section-head"><a href="/admin">← Panel admin</a><button className="secondary" onClick={load}>Muat ulang</button></div>{error&&<p className="error" role="alert">{error} <a href="/masuk?return_to=%2Fadmin%2Fwebhooks">Masuk pemilik →</a></p>}{loaded&&!error&&<p className="hint">{configured?'Token webhook sudah diatur.':'Token webhook belum diatur.'} Menampilkan 10 notifikasi terbaru.</p>}{!loaded?<p className="empty">Memuat…</p>:!error&&events.length===0?<div className="panel empty">Belum ada notifikasi terverifikasi. Jalankan pengujian webhook di panel pembayaran, lalu Muat ulang.</div>:events.map(event=><section className="panel" key={event.digest} style={{margin:'20px 0'}}><div className="section-head"><h2>Webhook diterima</h2><span className="pill">Token valid</span></div><p className="hint">{new Date(event.last_received).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})} WIB · Dikirim {event.deliveries} kali</p><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:12,lineHeight:1.6,background:'#101110',padding:16,borderRadius:8}}>{JSON.stringify(event.payload,null,2)}</pre></section>)}</Shell>;
}
