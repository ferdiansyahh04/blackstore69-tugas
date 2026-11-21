'use client';
import {useEffect,useState} from 'react';
import {games as defaults,type Game} from './catalog';
export type LiveGame=Omit<Game,'packs'>&{packs:(Game['packs'][number]&{active:boolean})[]};
export async function api<T>(url:string,init?:RequestInit):Promise<T>{const r=await fetch(url,{...init,headers:{'Content-Type':'application/json',...init?.headers}});const b=await r.json() as T & {error?:string};if(!r.ok)throw new Error(b.error||'Permintaan gagal.');return b;}
export function useCatalog(){const [games,setGames]=useState<LiveGame[]>(defaults.map(g=>({...g,packs:g.packs.map(p=>({...p,active:p.price>=1000}))})));const [error,setError]=useState('');const [ready,setReady]=useState(false);useEffect(()=>{let live=true;api<{games:LiveGame[]}>('/api/catalog').then(r=>{if(live){setGames(r.games);setReady(true)}}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[]);return {games,error,ready};}
