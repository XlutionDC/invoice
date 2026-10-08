# Luxora Invoice — handoff deployment

## Provenance
Snapshot source Sites commit b8ba7a3954cf512dd774b60aaa597372b6b4e883. Aplikasi aktif: https://luxora-invoice.groovinder-6494.chatgpt.site. Kode aplikasi dan aset dipertahankan tanpa mengubah fitur. README asli starter disimpan sebagai referensi teknis.

## Stack
TypeScript, React 19, vinext/Vite, Cloudflare Workers, D1/SQLite melalui Drizzle, PDF-lib dan font/logo tertanam. Gunakan package.json dan pnpm-lock.yaml sebagai sumber versi. Node >=22.13.0; gunakan Node 24 untuk integration test yang memakai node:sqlite.

## Batas portabilitas
Ini source lengkap versi Sites, bukan paket yang langsung berjalan di sembarang shared hosting. Hosting asal menyediakan autentikasi ChatGPT, identity dispatch dan binding D1. .openai/hosting.json mencatat Site asal; jangan menggunakannya sebagai konfigurasi otomatis untuk aplikasi/akun lain. Tidak ada token rahasia dalam manifest.

Untuk hosting sendiri, sediakan konfigurasi Worker/binding DB sendiri, lalu implementasikan login owner/admin dan identitas server yang tepercaya sebagai pengganti app/chatgpt-auth.ts. Jangan menerima actor/user ID/email dari request client sebagai autentikasi. lib/access.ts masih memuat email bootstrap owner dari Site asal; ganti dengan konfigurasi owner terverifikasi dan migrasikan role/user ID bila identitas berubah. Password per toko dan pemisahan data harus tetap berlaku. Cookie toko saat ini __Host-luxora-store Secure/HttpOnly/SameSite=None/Partitioned; uji perilakunya pada domain/HTTPS baru dan pertahankan proteksi origin pada write APIs.

## Instalasi dan build
1. Pasang dependensi menggunakan pnpm versi packageManager dan frozen lockfile. Simpan dev dependencies saat build.
2. Periksa scripts/execution-profile.mjs dan scripts/run-framework.mjs; jangan menyalin state .sites-runtime dari workspace asal.
3. pnpm run build menghasilkan Worker dan aset. pnpm run dev untuk pengembangan. pnpm run start adalah preview lokal Wrangler, bukan otomatis konfigurasi production hosting lain.
4. Konfigurasikan resource database dan migration pada provider tujuan; db/index.ts menggunakan binding DB. Jalankan migration berurutan 0000 sampai 0003, termasuk custom audit triggers. Jangan overwrite migration lama atau menjalankan ulang migration yang sudah diterapkan.

## Database produksi
Database asli, invoice customer, payments, hash password dan sesi tidak disertakan. Buat ekspor terpisah melalui mekanisme resmi provider ketika pemindahan data memang diperlukan. Backup sebelum import dan migrasi. Jangan commit ekspor/database ke GitHub. Jika identitas login berubah, rekonsiliasi members serta identitas owner, dan invalidasi store_sessions/login_attempts; hash password toko dapat dipertahankan dengan algoritme yang sama. Jangan seed transaksi contoh di production.

## Fitur yang wajib dipertahankan
- Tiga toko: Luxora, CetakYuk, Lancar Jaya Printing; password berbeda; tidak ada rekap gabungan.
- Owner mengatur password dan menghapus invoice tanpa riwayat pembayaran, setelah konfirmasi. Deleted invoices dikeluarkan dari daftar/laporan; audit dan nomor tetap tersimpan. Riwayat pembayaran/refund melarang penghapusan.
- Invoice/penawaran, produk + deskripsi manual, diskon/ongkir, nomor otomatis, edit beralasan dan version checks.
- Pembayaran parsial/lunas, pembatalan/refund dan uang masuk berdasarkan tanggal transaksi.
- Tiga template PDF dan logo/rekening, Luxora lunas tanpa sisa tagihan.
- Nama PDF: nama toko-tanggal invoice-nama customer.pdf, karakter nama file berbahaya disanitasi.
- Customer history, copy order tanpa payment/nomor/status lama, audit per toko.

## Verifikasi sebelum cutover
node tests/run-integration.mjs
python tests/storage.test.py
node node_modules/typescript/bin/tsc --noEmit

Integration test memakai SQLite in-memory dan identitas test; tidak menulis database production. Bandingkan PDF ketiga toko, daftar/rekap, pembayaran/refund, authorization antar toko dan owner, serta migration pada salinan data. Jalankan di staging terlebih dahulu. Jangan matikan aplikasi asal sampai semua checks dan pencocokan data lulus.

## Updates
Gunakan repo GitHub ini sebagai sumber perubahan deployment selanjutnya. Sinkronkan perubahan di sini dengan versi Sites bila keduanya masih digunakan; sinkronisasi tidak otomatis. Akun hosting/domain/GitHub tetap milik owner. Secrets hanya melalui secret manager/environment hosting, bukan source.
