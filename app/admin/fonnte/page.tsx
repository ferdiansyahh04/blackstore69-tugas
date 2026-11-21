'use client';
import {useEffect,useState} from 'react';
import {Shell,PageTitle} from '../../ui';
import {api} from '../../hooks';

type Config={enabled:boolean;tokenSet:boolean;businessTargetSet:boolean};
type Notice={id:number;order_id:string;event:string;target:string;status:string;attempts:number;last_try:number;response:string;created_at:number;sent_at:number|null};

export default function FonnteAdmin(){
 const [config,setConfig]=useState<Config|null>(null);const [notifications,setNotifications]=useState<Notice[]>([]);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [loading,setLoading]=useState(true);const [testing,setTesting]=useState(false);
 async function load(){setLoading(true);setError('');try{const r=await api<{config:Config;notifications:Notice[]}>('/api/admin/fonnte');setConfig(r.config);setNotifications(r.notifications)}catch(e){setError((e as Error).message)}finally{setLoading(false)}}
 useEffect(()=>{void load()},[]);
 async function test(){setTesting(true);setError('');setNotice('');try{await api('/api/admin/fonnte',{method:'POST'});setNotice('Pesan tes masuk antrean Fonnte. Periksa WhatsApp bisnis dan Message History.');await load()}catch(e){setError((e as Error).message)}finally{setTesting(false)}}
 const ready=!!config?.enabled&&!!config?.tokenSet&&!!config?.businessTargetSet;
 return <Shell><PageTitle tag="FONNTE / WHATSAPP" title="Invoice dan status pesanan." sub="Periksa koneksi perangkat serta riwayat pengiriman notifikasi WhatsApp."/>
  <div className="section-head"><a href="/admin">Kembali ke panel admin</a><button className="secondary" onClick={()=>void load()} disabled={loading}>Muat ulang</button></div>
  {error&&<div className="error" role="alert">{error} {error.includes('Masuk')&&<a href="/masuk?return_to=%2Fadmin%2Ffonnte">Masuk</a>}</div>}{notice&&<div className="notice" role="status">{notice}</div>}
  {config&&<section className="panel" style={{margin:'20px 0'}}><div className="section-head"><h2>Koneksi Fonnte</h2><span className={'status '+(ready?'success':'pending')}>{ready?'Siap':'Belum lengkap'}</span></div><p>Integrasi: <b>{config.enabled?'Aktif':'Nonaktif'}</b> · Token: <b>{config.tokenSet?'Terisi':'Belum terisi'}</b> · Nomor bisnis: <b>{config.businessTargetSet?'Terisi':'Belum terisi'}</b></p><p className="hint">Token hanya berada pada environment server dan tidak dikirim ke browser.</p><button className="secondary" disabled={!ready||testing} onClick={()=>void test()}>{testing?'Mengirim…':'Kirim pesan tes'}</button></section>}
  <h2>Riwayat notifikasi</h2>
  {loading?<div className="empty">Memuat...</div>:notifications.length===0?<div className="empty panel"><h2>Belum ada invoice WhatsApp.</h2><p>Notifikasi pesanan baru akan muncul setelah pelanggan mengisi nomor WhatsApp pada checkout.</p></div>:<div className="table-wrap"><table><thead><tr><th>Waktu</th><th>Pesanan</th><th>Jenis</th><th>Status</th><th>Respons</th></tr></thead><tbody>{notifications.map(n=><tr key={n.id}><td>{new Date(n.created_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})}</td><td><b>{n.order_id}</b><small>Tujuan ••••{n.target.slice(-4)}</small></td><td>{n.event}</td><td><span className={'status '+(n.status==='sent'?'success':'pending')}>{n.status}</span><small>{n.attempts} percobaan</small></td><td>{n.response||'-'}</td></tr>)}</tbody></table></div>}
 </Shell>;
}
