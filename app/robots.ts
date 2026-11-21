import type {MetadataRoute} from 'next';

export default function robots():MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/masuk', '/keluar', '/riwayat', '/pesanan/'],
    },
    sitemap: 'https://blackstore69.web.id/sitemap.xml',
  };
}
