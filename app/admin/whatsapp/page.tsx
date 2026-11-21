'use client';
import {useEffect,useState} from 'react';
import {Shell,PageTitle} from '../../ui';
import {api} from '../../hooks';
type Config={enabled:boolean;tokenSet:boolean;phoneIdSet:boolean;templateApproved:boolean};
type Notice={id:number;order_id:string;event:string;target:string;status:string;attempts:number;response:string;created_at:number;provider:string};
const labels:Record<string,string>={pending:'Antrean',sending:'Mengirim',accepted:'Diterima API',sent:'Terkirim',delivered:'Sampai',read:'Dibaca',failed:'Gagal',retry:'Menunggu ulang',uncertain:'Perlu diperiksa',disabled:'Integrasi belum aktif',archived:'Arsip',skipped:'Dilewati'};
export default function WhatsAppAdmin(){
 const [config,setConfig]=useState<Config|null>(null),[rows,setRows]=useState<Notice[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(refresh=false){setBusy(true);setError('');try{if(refresh)await api('/api/admin/whatsapp',{method:'POST'});const r=await api<{config:Config;notifications:Notice[]}>('/api/admin/whatsapp');setConfig(r.config);setRows(r.notifications);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 useEffect(()=>{void load();},[]);
 const ready=config?.enabled&&config.tokenSet&&config.phoneIdSet&&config.templateApproved;
 return <Shell><PageTitle tag="WHATSAPP / KIRIMDEV" title="Invoice dan status pesanan." sub="Pantau pengiriman pemberitahuan WhatsApp yang dipilih pelanggan."/>
 <div className="section-head"><a href="/admin">Kembali ke panel admin</a><button className="secondary" disabled={busy} onClick={()=>void load(true)}>{busy?'Memeriksa…':'Perbarui status'}</button></div>
 {error&&<div className="error" role="alert">{error} <a href="/masuk?return_to=%2Fadmin%2Fwhatsapp">Masuk admin</a></div>}
 {config&&<section className="panel" style={{margin:'24px 0'}}><h2>Koneksi Kirimdev</h2><p className="status">{ready?'Aktif untuk pesanan baru':'Menunggu konfigurasi'}</p><p>API key: {config.tokenSet?'Terisi':'Belum terisi'} · Nomor pengirim: {config.phoneIdSet?'Terisi':'Belum terisi'} · Template: {config.templateApproved?'Disetujui saat aktivasi':'Belum dikonfirmasi'}</p><p className="hint">Aktivasi melalui terminal VPS: <code>python3 /root/configure-blackstore-kirimdev.py</code></p><p className="hint">Diterima API belum berarti pesan sampai. Status diperiksa otomatis setiap menit selama tujuh hari atau sampai pesan diterima. Pesan lama dari penyedia sebelumnya tidak dikirim ulang. Nomor WhatsApp tetap opsional.</p></section>}
 <h2>Riwayat notifikasi</h2>{!rows.length?<div className="empty panel">Belum ada notifikasi.</div>:<div className="table-wrap"><table><thead><tr><th>Waktu</th><th>Pesanan</th><th>Jenis</th><th>Status</th><th>Keterangan</th></tr></thead><tbody>{rows.map(n=><tr key={n.id}><td>{new Date(n.created_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})}</td><td><b>{n.order_id}</b><small>••••{n.target}</small></td><td>{n.event}</td><td>{labels[n.status]||n.status}<small>{n.attempts} percobaan</small></td><td>{n.provider==='fonnte'?'Riwayat lama':n.response||'—'}</td></tr>)}</tbody></table></div>}
 </Shell>;
}
