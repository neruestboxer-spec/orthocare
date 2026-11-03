# OrthoCare Admin — Frontend

Aplikasi manajemen klinik orthopedi (mobile-first) untuk 1 admin: pasien, jadwal + Google Calendar,
rekam medis SOAP, tindakan & resep, kasir + kuitansi PDF, stok BMHP/obat, HPP & margin, keuangan,
laporan, tenaga medis, dan pengaturan.

- **Frontend:** HTML/CSS/JS vanilla — di-host di GitHub Pages (folder ini).
- **Backend:** Google Apps Script sebagai REST API JSON (`Kode.gs`, tidak ada di repo ini).
- **Database:** Google Sheets · **Berkas:** Google Drive (privat) · **Jadwal:** Google Calendar.

## Struktur

```
index.html          ← halaman tunggal (SPA, navigasi #/rute)
css/style.css       ← desain (token DESIGN.md)
js/config.js        ← ⚠️ ISI GAS_URL di sini
js/api.js           ← fetch ke Apps Script (text/plain, tanpa CORS preflight)
js/core.js          ← state, format Rupiah/tanggal, HPP, slot jadwal, komponen UI
js/app.js           ← router, login, sinkron data
js/pages-*.js       ← halaman: utama, pasien, kasir, admin
```

## Keamanan

Repository ini publik tetapi **tidak berisi data apa pun**. Semua data pasien ada di Google Sheets/Drive
milik akun admin dan hanya bisa dibaca lewat API setelah login dengan kata sandi admin.

Panduan lengkap: lihat `PANDUAN-INSTALASI.md`.
