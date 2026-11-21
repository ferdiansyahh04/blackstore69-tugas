'use client';
import {useState} from 'react';import {Shell,PageTitle} from '../ui';import {api} from '../hooks';
export default function Logout(){const [error,setError]=useState('');return <Shell><PageTitle tag="AKUN TOKO" title="Keluar dari sesi pemilik."/><button className="primary" onClick={async()=>{try{await api('/api/session',{method:'DELETE'});location.assign('/');}catch(e){setError((e as Error).message)}}}>Keluar</button>{error&&<p role="alert">{error}</p>}</Shell>}
