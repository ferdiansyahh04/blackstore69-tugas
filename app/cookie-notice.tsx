'use client';
import {useEffect,useState} from 'react';

const STORAGE='blackstore69_cookie_notice_v1';

export default function CookieNotice(){
 const [open,setOpen]=useState(false);
 useEffect(()=>{
  try{setOpen(localStorage.getItem(STORAGE)!=='accepted');}
  catch{setOpen(true);}
 },[]);
 function accept(){
  try{localStorage.setItem(STORAGE,'accepted');}catch{}
  setOpen(false);
 }
 if(!open)return null;
 return <div className="consent-wrap" role="region" aria-label="Pemberitahuan cookie">
  <div><strong>Cookie di black.store69</strong><p>Kami memakai cookie yang diperlukan untuk menjaga sesi dan membantu Anda melacak pesanan. Tombol ini menutup pemberitahuan; cookie tersebut diperlukan agar fitur situs berfungsi. <a href="/kebijakan-privasi">Baca Kebijakan Privasi</a>.</p></div>
  <div className="consent-actions"><button type="button" className="primary" onClick={accept}>Terima cookies</button></div>
 </div>;
}
