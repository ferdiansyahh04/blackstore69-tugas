export const OPERATORS = [
 {id:'TELKOMSEL',name:'Telkomsel',logo:'/operators/telkomsel-wordmark.png',tone:'#ed1c24'},
 {id:'INDOSAT',name:'Indosat IM3',logo:'/operators/im3.svg',tone:'#f4c52c'},
 {id:'XL',name:'XL',logo:'/operators/xl.png',tone:'#00b7ad'},
 {id:'TRI',name:'Tri',logo:'/operators/tri-mark.svg',tone:'#111111'},
] as const;

export function OperatorLogo({id,className=''}:{id:string,className?:string}){
 const operator=OPERATORS.find(item=>item.id===id);
 return operator?<span className={'operator-logo-frame '+className+' logo-'+operator.id.toLowerCase()}><img src={operator.logo} alt={'Logo '+operator.name} width={180} height={90}/></span>:<span className={'operator-logo-frame operator-logo-all '+className} aria-label="Semua operator"><svg width="32" height="38" viewBox="0 0 32 38" fill="none" aria-hidden="true"><rect x="7" y="2" width="18" height="34" rx="4" stroke="currentColor" strokeWidth="2"/><path d="M13 7h6M14 30h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></span>;
}
