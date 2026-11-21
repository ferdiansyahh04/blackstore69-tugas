'use client';
import {useState} from 'react';
import {Shell,PageTitle} from '../ui';
import {api} from '../hooks';
export default function Login(){const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{await api('/api/session',{method:'POST',body:JSON.stringify({password})});const next=new URLSearchParams(location.search).get('return_to')||'/admin';const dest=new URL(next,location.origin);location.assign(dest.origin===location.origin?dest.pathname+dest.search:'/admin');}catch(e){setError((e as Error).message);setBusy(false);}}
return <Shell><PageTitle tag="AKSES PEMILIK TOKO" title="Masuk ke panel admin." sub="Halaman ini khusus untuk pemilik black.store69."/><form className="panel" style={{maxWidth:480,margin:'0 auto 80px'}} onSubmit={submit}><label>Password pemilik<input className="login-input" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="error" role="alert">{error}</p>}<button className="primary full" disabled={busy}>{busy?'Memeriksa…':'Masuk'}</button><p className="hint">Gunakan password yang dibuat saat setup di server, bukan password cPanel.</p></form></Shell>}
