# 📋 PANDUAN INSTALASI — OrthoCare Admin

Arsitektur: **Frontend di GitHub Pages** + **Google Apps Script sebagai REST API** (Google Sheets, Drive, Calendar).

Anda menerima 4 berkas:

| Berkas | Untuk apa |
|---|---|
| `Kode.gs` | Backend — disalin-tempel ke editor Apps Script |
| `appsscript.json` | Pengaturan zona waktu (Asia/Jakarta) & web app — disalin-tempel ke editor Apps Script |
| `orthocare-admin.zip` | Frontend — diekstrak lalu di-push ke GitHub |
| `PANDUAN-INSTALASI.md` | Dokumen ini |

Urutan kerja: **A. Backend → B. Isi config.js → C. GitHub Pages → D. Uji**. Jangan dibalik — frontend butuh URL dari backend.

---

## A. BACKEND (Google Apps Script) — ±10 menit

> Gunakan **akun Google milik klinik/admin**. Semua data (Sheets, Drive, Calendar) akan dibuat di akun ini.
> Aktifkan **verifikasi 2 langkah** di akun tersebut (data medis = data sensitif UU PDP).

1. Buka **https://script.google.com** → **Proyek Baru**. Ganti nama proyek menjadi `OrthoCare API`.
2. Klik ikon ⚙️ **Setelan Proyek** → centang **"Tampilkan file manifes appsscript.json di editor"**.
3. Kembali ke ikon **< > Editor**:
   - Buka `appsscript.json` → hapus semua isinya → tempel isi berkas `appsscript.json` → **Simpan** (Ctrl+S).
   - Buka `Code.gs` → ganti nama menjadi `Kode` → hapus isinya → tempel seluruh isi `Kode.gs` → **Simpan**.
4. **Jalankan setup — HANYA SEKALI:**
   - Di dropdown fungsi (atas editor) pilih **`setupAppEnvironment`** → klik **▶ Jalankan**.
   - Muncul "Otorisasi diperlukan" → **Tinjau izin** → pilih akun → bila muncul *"Google belum memverifikasi aplikasi ini"* klik **Lanjutan → Buka OrthoCare API (tidak aman)**. Ini normal karena skripnya milik Anda sendiri.
   - Izinkan akses Sheets, Drive, Calendar, dan layanan lain yang diminta.
   - Buka **Log eksekusi** di bawah. Pastikan muncul `✅ SETUP SELESAI!` dan baris:

     ```
     🔑 KATA SANDI ADMIN: xxxxxxxxxx
     ```
     **Catat kata sandi ini sekarang.** Inilah kata sandi untuk masuk ke aplikasi (bisa diganti nanti di menu Pengaturan).
   - Cek hasilnya: di Google Drive ada folder **OrthoCare** (berisi Database, Pasien, Kuitansi_PDF, Surat_Keterangan_PDF, Template, Backup) dan di Google Calendar ada kalender **OrthoCare Admin Calendar**.
   - ⚠️ Jangan jalankan `setupAppEnvironment` lagi. Kalau terjalankan, skrip akan menolak dan tidak membuat duplikat.
5. **Deploy sebagai Web App:**
   - Klik **Terapkan (Deploy) → Deployment baru** → ikon ⚙️ → pilih **Aplikasi web**.
   - **Jalankan sebagai:** `Saya` · **Yang memiliki akses:** `Siapa saja` (Anyone).
   - Klik **Terapkan** → **SALIN URL** yang berakhiran `/exec`.
6. Uji cepat: tempel URL `/exec` itu di browser. Harus tampil teks seperti
   `{"success":true,"app":"OrthoCare","ready":true,...}`.

> **Kenapa "Siapa saja" aman?** Frontend di GitHub Pages tidak bisa memakai sesi Google Anda, jadi pengaman
> diganti **kata sandi admin + token sesi 6 jam**. Tanpa kata sandi, URL `/exec` hanya bisa menjawab "ping".
> Kata sandi disimpan sebagai hash di Script Properties, salah 5× → dikunci 10 menit, dan semua aksi tercatat di Log_Aktivitas.

---

## B. ISI KONFIGURASI FRONTEND

1. Ekstrak `orthocare-admin.zip`. Hasilnya satu folder **`orthocare-admin`** yang langsung berisi `index.html`, `README.md`, folder `css` dan `js`.
2. Buka `orthocare-admin/js/config.js` dengan Notepad / VS Code.
3. Ganti baris:
   ```js
   GAS_URL: 'https://script.google.com/macros/s/GANTI_DENGAN_ID_DEPLOYMENT_ANDA/exec',
   ```
   dengan URL `/exec` dari langkah A.5 → **Simpan**.

---

## C. DEPLOY KE GITHUB PAGES

> **Folder kerja Anda adalah `orthocare-admin` — folder yang di dalamnya langsung ada `index.html`.**
> Semua perintah `git` dijalankan dari folder itu, bukan dari folder di atasnya.

### C1. Install Git (sekali seumur komputer)
- **Windows:** unduh https://git-scm.com/download/win → install dengan pilihan default → buka **PowerShell**.
- **Mac:** buka Terminal, ketik `git --version` (macOS akan menawarkan instalasi bila belum ada).

Cek: `git --version` → harus tampil nomor versi.

### C2. Akun & identitas
1. Daftar di https://github.com bila belum punya. Username akan menjadi bagian alamat situs (`username.github.io`).
2. Atur identitas Git (bebas, hanya label riwayat):
   ```bash
   git config --global user.name "Nama Anda"
   git config --global user.email "email-akun-github@contoh.com"
   ```

### C3. Buat repository
github.com → tombol **+** → **New repository** → nama: `orthocare-admin` → **Public** → **jangan** centang README / .gitignore / license → **Create repository**. Biarkan halaman itu terbuka.

### C4. Masuk ke folder & periksa isinya
Cara cepat di Windows: buka folder `orthocare-admin` di File Explorer → klik address bar → ketik `powershell` → Enter.

```powershell
dir
```
Yang **harus** terlihat: `css`, `js`, `index.html`, `README.md`, `PANDUAN-INSTALASI.md`.
Kalau yang terlihat malah folder `orthocare-admin`, ketik `cd orthocare-admin` dulu lalu `dir` lagi.

### C5. Push pertama (jalankan satu per satu)
```bash
git init
git add .
git commit -m "Upload pertama OrthoCare"
git branch -M main
git remote add origin https://github.com/USERNAME/orthocare-admin.git
git push -u origin main
```
- Ganti `USERNAME` dengan username GitHub Anda. Ada **titik** di akhir `git add .`
- Saat diminta **Password**, yang dimasukkan adalah **Personal Access Token**, bukan password akun. Saat mengetik/menempel, layar memang kosong — itu normal.
- Membuat token: https://github.com/settings/tokens → **Generate new token (classic)** → centang **repo** → Generate → salin `ghp_...` (hanya tampil sekali).
- Sukses bila muncul `Writing objects: 100%` dan `* [new branch] main -> main`.

### C6. Aktifkan Pages
Repo di github.com → **Settings** → **Pages**:
- Source: **Deploy from a branch** · Branch: **main** · **/ (root)** → **Save**
- Centang **Enforce HTTPS** (wajib — kamera HP untuk foto rontgen butuh HTTPS)

Tunggu 1–2 menit → muncul *"Your site is live at https://USERNAME.github.io/orthocare-admin/"*.

---

## D. UJI MENYELURUH

1. Buka alamat situs di HP → masukkan kata sandi admin.
2. **Menu → Pengaturan:** isi nama admin, alamat klinik (dipakai menghitung jarak visit), unggah logo & gambar QRIS → Simpan.
3. **Menu → Tenaga Medis / Layanan & HPP / Stok:** ganti data contoh dengan data klinik Anda.
4. Alur harian: **Pasien +** → **Jadwal +** (cek event muncul di Google Calendar) → buka kartu jadwal → **Catat SOAP** → **Tandai Selesai** → **Kasir** → **Proses Pembayaran** → **Kirim via WhatsApp**.
5. Cek Google Sheets: tab Pasien, Jadwal, Rekam_Medis, Transaksi, Stok_Mutasi, Log_Aktivitas terisi.
6. Di Chrome HP: menu ⋮ → **Tambahkan ke layar utama** agar terasa seperti aplikasi.

---

## E. CARA UPDATE

**Frontend** (setelah mengubah file di folder `orthocare-admin`):
```bash
git add .
git commit -m "Keterangan perubahan"
git push
```
Tunggu 1–2 menit. Bila masih tampil versi lama: Ctrl+Shift+R atau buka jendela Incognito.

**Backend** (setelah mengubah `Kode.gs`): **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan.**
URL `/exec` tetap sama, jadi `config.js` tidak perlu diubah. *Jangan* membuat "Deployment baru" — itu menghasilkan URL berbeda.

---

## F. OTOMATIS YANG SUDAH TERPASANG

| Otomatis | Jadwal |
|---|---|
| Cadangan Spreadsheet ke folder Backup (simpan 8 salinan) | Tiap Senin 04:00 |
| Cabut tautan publik PDF kuitansi/surat yang berumur > 24 jam | Tiap jam |
| Event Google Calendar + pengingat H-2 jam | Setiap jadwal dibuat/diubah |
| Stok berkurang + HPP tercatat | Saat pembayaran diproses di Kasir |

---

## G. PEMECAHAN MASALAH

| Gejala | Penyebab | Solusi |
|---|---|---|
| Layar masuk: "GAS_URL belum diisi" | `js/config.js` belum diubah | Isi URL `/exec`, lalu push ulang |
| "Tidak dapat terhubung ke server" | URL salah / deployment bukan "Siapa saja" | Cek URL di browser (harus JSON), cek setelan deployment |
| "Backend belum di-setup" | `setupAppEnvironment` belum dijalankan | Jalankan sekali di editor |
| Lupa kata sandi | — | Editor Apps Script → jalankan **`resetPassword`** → lihat log |
| "Terlalu banyak percobaan gagal" | Salah sandi 5× | Tunggu 10 menit |
| Perubahan backend tidak berlaku | Deployment belum diperbarui | Kelola deployment → Edit → Versi baru |
| Situs 404 | `index.html` tidak di root repo | Pastikan push dari folder `orthocare-admin` (lihat C4) |
| Tampilan tanpa warna/gaya | Folder `css`/`js` tidak ikut | Selalu push lewat terminal, jangan "Upload files" di web |
| Jarak visit kosong | Alamat klinik/pasien tidak ditemukan Google Maps | Lengkapi alamat (kota) di Pengaturan & data pasien |
| Tombol WA tidak membuka aplikasi | Diblokir popup | Izinkan popup untuk situs ini |

---

## H. CATATAN PENYESUAIAN DARI PRD

- PRD menulis frontend di HtmlService + akses "Only myself". Karena frontend dipindah ke **GitHub Pages** (gas-pro-api), verifikasi `Session.getActiveUser()` diganti **kata sandi admin + token sesi**. Hak akses tetap 1 admin penuh.
- Struktur kode menjadi `Kode.gs` (API) + frontend `index.html`, `css/`, `js/` — bukan `Index.html/Stylesheet.html/JavaScript.html`.
- Laporan PDF memakai dialog cetak browser (**Simpan sebagai PDF**); kuitansi & surat keterangan PDF dibuat di server dan disimpan ke Drive.
- Pengiriman WhatsApp tetap Opsi A (tautan `wa.me`, 1 klik per pesan) sesuai PRD.
