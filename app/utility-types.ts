export const utilityServices=[
 {id:'pln-prabayar',name:'Token PLN',label:'PRABAYAR',description:'Beli token listrik untuk meter prabayar.',icon:'electric',tone:'#f7ce46'},
 {id:'pln-pascabayar',name:'PLN Pascabayar',label:'PASCABAYAR',description:'Cek dan bayar tagihan listrik bulanan.',icon:'electric',tone:'#59d4df'},
 {id:'pdam',name:'PDAM',label:'PASCABAYAR',description:'Cek dan bayar tagihan air sesuai wilayah.',icon:'water',tone:'#65b6f5'},
] as const;
export type UtilityKind=typeof utilityServices[number]['id'];
export type UtilityProduct={id:string;kind:UtilityKind;name:string;active:boolean;price:number|null};
export type UtilityQuote={id:string;productId:string;target:string;name:string;period:string;description:string;amount:number;bill:number;admin:number;expiresAt:number};
