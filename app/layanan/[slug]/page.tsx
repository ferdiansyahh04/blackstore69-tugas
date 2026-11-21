import {notFound} from 'next/navigation';
import {utilityServices} from '../../utility-types';
import UtilityCheckout from '../../utility-checkout';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const s=utilityServices.find(s=>s.id===slug);return {title:s?.name||'Layanan',description:s?.description};}
export default async function UtilityPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const s=utilityServices.find(s=>s.id===slug);if(!s)notFound();return <UtilityCheckout kind={s.id}/>;}
