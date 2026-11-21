import OrderView from '../../order-view';
export const metadata={title:'Detail pesanan',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <OrderView id={id}/>;}
