# black.store69 — paket cPanel
Domain: https://blackstore69.web.id
Tahap: demo untuk pengujian pemilik toko. Tidak menerima uang, tidak mengirim top-up.
Paket ini merupakan ekspor mandiri untuk cPanel; situs demo Sites sebelumnya tetap terpisah.

## Pemasangan (akun cPanel blackstore69)
1. Unggah blackstore69-installer.cjs ke direktori Home akun (/home/blackstore69), bukan public_html.
2. Buka Terminal cPanel sebagai blackstore69:
```bash
export PATH=/opt/cpanel/ea-nodejs22/bin:$PATH
node ~/blackstore69-installer.cjs
cd ~/blackstore-app
npm ci
npm run setup
npm run build
```
Installer membuat direktori baru ~/blackstore-app dan menolak menimpa direktori yang sudah ada.
Setup menampilkan password pemilik satu kali. Simpan di pengelola password, jangan bagikan ke chat.
File .env hanya berisi hash password dan rahasia sesi. Tidak ada API key supplier/payment di paket.

3. cPanel > Application Manager > Register Application:
- Application Name: blackstore69
- Deployment Domain: blackstore69.web.id
- Base Application URL: /
- Application Path: blackstore-app
- Deployment Environment: Production
- Klik Deploy/Register sesuai label yang tersedia.

Aplikasi memakai app.js sebagai startup Passenger. Node.js yang dipakai harus /opt/cpanel/ea-nodejs22/bin/node.
Jika registrasi belum mengenali versi 22, periksa konfigurasi Passenger pada WHM sebelum mengubahnya.
Domain utama harus mengarah ke server dan sertifikat HTTPS valid.

4. Buka https://blackstore69.web.id dan https://blackstore69.web.id/masuk.
Gunakan password dari npm run setup, lalu uji pesanan simulasi.

## Pemeliharaan
- Source aplikasi, .env, dan database disimpan di luar public_html.
- Database: ~/blackstore-app/data/store.sqlite (SQLite bawaan Node 22, masih bertanda experimental).
- Hanya folder public/ yang berisi aset publik.
- Batasi izin .env (600) dan data/ (700). Setup sudah menerapkannya pada Linux.
- Untuk memperbarui source: build ulang, lalu buat/ubah tmp/restart.txt melalui Terminal:
```bash
cd ~/blackstore-app
npm run build
mkdir -p tmp
touch tmp/restart.txt
```
- Cadangkan database menggunakan backup SQLite konsisten atau saat aplikasi dihentikan. Jangan menyalin store.sqlite sendirian ketika WAL masih aktif.
- Masuk berlaku 8 jam. Endpoint admin dan transaksi hanya untuk sesi pemilik.
- Maksimal 10 percobaan login per 5 menit, tersimpan di database.
- Harga demo di panel berlaku untuk sesi pengujian pemilik. Katalog publik tetap contoh.
- Gunakan menu Keluar untuk menghapus cookie sesi dari browser.

## Batas tahap ini
Belum ada pembayaran nyata, katalog Digiflazz live, webhook pembayaran/supplier, akun pelanggan, maupun top-up production.
API key development yang pernah digunakan untuk tes tidak dimasukkan ke source.
Sebelum penjualan dibuka, integrasi pembayaran dan fulfillment harus dibuat serta diuji terpisah.
Tidak ada proses deploy ke WHM yang dilakukan dari komputer pembuat paket; pemasangan server perlu mengikuti langkah di atas.

## Validasi lokal
Build Next.js 16.3.5 dan TypeScript lulus. npm audit: 0 temuan pada saat paket dibuat.
Tes otomatis lulus: halaman, login pemilik, penolakan cookie/header palsu, pemeriksaan origin, validasi pesanan, harga dari server, submit ganda, hasil demo berhasil/gagal, kedaluwarsa, perubahan harga admin, data bertahan setelah restart, dan batas percobaan login.
Pengujian Passenger/cPanel harus dilakukan setelah instalasi karena lingkungan lokal berbeda.
