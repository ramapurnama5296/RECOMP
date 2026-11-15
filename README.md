# RECOMP.

**Build muscle. Lose fat. Stay consistent.**

Fitness tracker pribadi untuk merencanakan latihan, mencatat body progress, nutrisi, dan suplemen, serta mengikuti komitmen bulanan dan tabungan disiplin. Antarmuka utama berbahasa Indonesia.

## Jalankan di Windows

Pasang [Node.js 24 LTS](https://nodejs.org/) beserta npm. Buka PowerShell di folder proyek.

```powershell
npm install
npm run dev
```

Buka `http://localhost:5173/recomp/`. Selesaikan onboarding untuk membuat profil dan memilih jadwal PT Kamis atau Jumat. Isi tanggal mulai dan target pribadi. Untuk memasukkan konsumsi mie yang sudah terjadi, isi tanggal dan nama hidangan di bagian catatan awal. Satu waktu makan dapat memuat beberapa hidangan dalam satu entri. Target kalori bisa dikosongkan.

## Build dan pengujian

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Jalankan preview production untuk mencoba pemasangan cache aplikasi.

```powershell
npm run preview
```

Buka `http://localhost:4173/recomp/`. Origin development dan preview berbeda sehingga memiliki data lokal masing-masing. Buka **More → Install di iPhone** untuk melihat status cache. Setelah status siap, gunakan mode Offline di DevTools lalu muat ulang dan coba simpan catatan.

## Deploy di GitHub Pages

1. Buat repository publik kosong bernama `recomp` agar GitHub Pages bisa digunakan pada GitHub Free. Repository berisi source code dan aset aplikasi. Simpan backup, foto, dan catatan pribadi di perangkat atau lokasi terbatas.
2. Dari folder proyek, jalankan perintah di bawah. Ganti `USERNAME` dengan nama akun GitHub.

   ```powershell
   git init -b main
   git add .
   git commit -m "Build RECOMP PWA"
   git remote add origin https://github.com/USERNAME/recomp.git
   git push -u origin main
   ```

3. Buka **Settings → Pages**, lalu pilih **GitHub Actions** sebagai **Source**. [Dokumentasi GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
4. Buka **Actions → Test and deploy RECOMP**. Jalankan **Run workflow** jika proses pertama dimulai sebelum Pages diaktifkan. Workflow menjalankan lint, type checking, unit test, build, dan Playwright sebelum memublikasikan `dist/`.
5. Setelah deployment berhasil, buka `https://USERNAME.github.io/recomp/`. Navigasi memakai URL hash, misalnya `/recomp/#/workout`, dan tetap bekerja saat halaman dimuat ulang.

Vite menggunakan base `/recomp/`. Jika nama repository berubah, sesuaikan `base` di `vite.config.ts` dan URL pengujian. Pindahkan data dengan backup saat mengganti origin atau base path.

## Pasang di Home Screen iPhone

1. Buka URL deployment di Safari saat online.
2. Tekan **Share** dan pilih **Add to Home Screen**.
3. Aktifkan **Open as Web App** jika tersedia, lalu tekan **Add**. [Panduan Apple](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios)
4. Jalankan RECOMP dari Home Screen saat masih online. Buka **More → Install di iPhone** dan tunggu status **Siap digunakan offline**. Lakukan onboarding di aplikasi yang dibuka dari Home Screen atau impor backup yang sudah disiapkan.
5. Untuk memeriksa offline, aktifkan mode pesawat, pastikan Wi-Fi mati, buka ulang aplikasi, lalu periksa catatan dan coba simpan satu entri.

## Backup, restore, dan pembaruan

- Buka **More → Settings → Backup dan restore → Export backup JSON**. Pilih **Sertakan foto progres** bila diperlukan. Backup berisi data pribadi dan tidak dienkripsi oleh aplikasi.
- Untuk restore, pilih file JSON RECOMP. **Merge backup** menggabungkan catatan berdasarkan ID dan memilih versi dengan waktu pembaruan lebih baru. Setoran yang sudah dikonfirmasi tetap dipertahankan saat merge. Mengimpor file yang sama lagi tidak menggandakan catatan. **Replace semua data** memakai isi backup sebagai seluruh penyimpanan. Ketik `RECOMP` untuk mengonfirmasi.
- Browser dapat kehilangan data saat data situs atau aplikasi dihapus. Penyimpanan lokal tidak otomatis sinkron antara Windows dan iPhone. Gunakan export/import untuk memindahkan data.
- Untuk merilis pembaruan, push perubahan ke `main`. Saat perangkat kembali online dan versi baru sudah tersimpan di cache, RECOMP menawarkan **Muat versi baru**. Cache aset dan database IndexedDB diperbarui secara terpisah. Pertahankan scope dan nama database agar data lama tetap bisa dibuka.

## Struktur proyek

| Lokasi | Isi |
| --- | --- |
| `src/domain/` | Model, kalender Asia/Jakarta, jadwal, rekap nutrisi, personal records, dan tabungan |
| `src/data/` | Penyimpanan IndexedDB native, migrasi, backup JSON, dan kompresi foto |
| `src/features/` | Home, Plan, Workout, Progress, nutrition, supplements, discipline, reports, settings |
| `src/ui/` | Komponen bersama dan akses ke data aplikasi |
| `public/`, `scripts/` | Manifest, ikon, dan template service worker |
| `tests/` | Pengujian logika, persistensi, dan alur browser |
| `.github/workflows/deploy.yml` | Pengujian dan publish melalui GitHub Actions |

Tanggal aktivitas disimpan sebagai tanggal kalender WIB dan timestamp perubahan disimpan dalam UTC. Semua data fitness tetap berada di IndexedDB di browser. Halaman, ikon, dan aset aplikasi dilayani melalui GitHub Pages tanpa API, analitik, atau database cloud.
