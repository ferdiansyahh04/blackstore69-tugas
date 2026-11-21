'use client';
import {useState} from 'react';
import {api} from './hooks';

export default function ContactForm(){
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[message,setMessage]=useState(''),[notice,setNotice]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError('');setNotice('');
  try{const r=await api<{message:string}>('/api/contact',{method:'POST',body:JSON.stringify({name,email,message})});setNotice(r.message);setName('');setEmail('');setMessage('')}
  catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <form className="panel legal-form contact-message-form" onSubmit={submit}>
  <span className="eyebrow">FORMULIR BANTUAN</span>
  <h2>Kirim pesan ke admin.</h2>
  <p className="contact-form-intro">Ceritakan kendalamu dengan jelas. Cantumkan nomor pesanan pada kolom pesan jika pertanyaan berkaitan dengan transaksi.</p>
  <div className="contact-form-fields">
   <label>Nama<input required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Nama kamu"/></label>
   <label>Email<input required type="email" maxLength={160} value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com"/></label>
  </div>
  <label>Pesan<textarea required minLength={10} maxLength={1500} rows={6} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Tuliskan nomor pesanan dan kendala yang dialami..."/></label>
  {error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="notice" role="status">{notice}</p>}
  <button className="primary" disabled={busy}>{busy?'Mengirim…':'Kirim pesan'}</button>
 </form>;
}
