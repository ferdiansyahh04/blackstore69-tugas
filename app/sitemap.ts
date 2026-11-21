import type {MetadataRoute} from 'next';
import {games} from './catalog';
import {utilityServices} from './utility-types';

export default function sitemap():MetadataRoute.Sitemap {
  const base='https://blackstore69.web.id';
  const staticPages=['','/panduan','/tentang-kami','/kontak','/syarat-ketentuan','/kebijakan-privasi','/kebijakan-pengembalian'];
  return [
    ...staticPages.map(path=>({url:base+path,changeFrequency:path===''?'daily' as const:'monthly' as const,priority:path===''?1:0.6})),
    ...utilityServices.map(service=>({url:base+'/layanan/'+service.id,changeFrequency:'daily' as const,priority:0.8})),
    ...games.map(game=>({url:base+'/game/'+game.id,changeFrequency:'daily' as const,priority:0.8})),
  ];
}
