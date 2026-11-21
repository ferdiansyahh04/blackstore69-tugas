# black.store69

Kode sumber situs [blackstore69.web.id](https://blackstore69.web.id/) untuk katalog produk digital, checkout, pelacakan pesanan, dan layanan pelanggan.

## Teknologi

- Next.js dan TypeScript untuk situs dan API
- SQLite untuk data pesanan dan katalog
- Integrasi pembayaran QRIS, pemasok produk digital, dan notifikasi WhatsApp melalui variabel lingkungan

## Menjalankan secara lokal

```sh
npm ci
cp .env.example .env
# Isi konfigurasi lokal milik Anda sendiri; jangan gunakan kredensial produksi.
npm run build
npm start
```

Repositori ini adalah snapshot kode per 21 November 2026 untuk dokumentasi tugas. Database transaksi, `.env` produksi, kunci pemulihan, arsip backup, `node_modules`, dan hasil build tidak disertakan. Layanan pembayaran atau pemasok memerlukan akun dan konfigurasi masing-masing sebelum dapat diuji.