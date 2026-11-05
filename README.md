# Panduan Deploy Website Zaki Ansyari

Website ini terdiri dari halaman portofolio statis, satu Vercel Function, dan Google Apps Script yang menyimpan data ke Google Sheets.

## Isi folder

| File/folder | Fungsi |
| --- | --- |
| `index.html` | Halaman utama, formulir kontak, dan dashboard admin di `/#admin` |
| `assets/` | Foto profil dan foto galeri |
| `api/portfolio.js` | API di Vercel; meneruskan permintaan ke Apps Script |
| `apps-script/Code.gs` | Login admin, pengelolaan konten, dan penyimpanan pesan |

## Bagian 1 — Siapkan Google Sheets dan Apps Script

### 1. Buat spreadsheet

1. Masuk ke akun Google Anda dan buat spreadsheet baru di [Google Sheets](https://sheets.google.com).
2. Salin ID spreadsheet dari alamatnya. ID adalah bagian di antara `/d/` dan `/edit`.

   Contoh alamat: `https://docs.google.com/spreadsheets/d/1AbCdeFG_example_ID_123/edit`

   ID-nya: `1AbCdeFG_example_ID_123`
3. **Jangan** publikasikan spreadsheet atau mengatur aksesnya menjadi “Anyone”. Apps Script akan mengaksesnya menggunakan akun Anda.

### 2. Buat project Apps Script

1. Buka [script.google.com](https://script.google.com) lalu pilih **New project**.
2. Di editor, buka file `Code.gs` bawaan.
3. Hapus isi file bawaan dan ganti dengan seluruh isi [`apps-script/Code.gs`](./apps-script/Code.gs) dari folder proyek ini.
4. Simpan project, misalnya dengan nama `Website Zaki API`.

### 3. Atur kredensial admin

1. Di Apps Script, buka **Project Settings** (ikon roda gigi).
2. Pada bagian **Script Properties**, pilih **Add script property**.
3. Tambahkan properti berikut satu per satu:

   | Property | Nilai |
   | --- | --- |
   | `SPREADSHEET_ID` | ID spreadsheet yang disalin pada langkah 1 |
   | `ADMIN_USERNAME` | Username admin pilihan Anda |
   | `ADMIN_PASSWORD` | Password unik dan kuat pilihan Anda |

4. Simpan perubahan. Jangan mengirimkan password melalui chat, memasukkannya ke `index.html`, atau menyimpannya di spreadsheet.

### 4. Deploy sebagai Web App

1. Di Apps Script, pilih **Deploy → New deployment**.
2. Tekan ikon roda gigi di samping “Select type”, lalu pilih **Web app**.
3. Pilih:
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. Tekan **Deploy** dan berikan izin Google yang diminta. Jika diminta login, gunakan akun pemilik spreadsheet.
5. Salin URL **Web app** yang berakhiran `/exec`. Contoh: `https://script.google.com/macros/s/DEPLOYMENT_ID/exec`.

URL `/exec` ini bukan password, tetapi tetap simpan di pengaturan environment Vercel. Jika mengedit Apps Script nanti, buka **Deploy → Manage deployments → Edit**, pilih **New version**, lalu deploy ulang.

> Akses `Anyone` diperlukan supaya Vercel dapat memanggil Apps Script. Permintaan admin selain login memerlukan token sesi. Spreadsheet tetap privat; jangan bagikan akses editor Apps Script atau spreadsheet kepada orang yang tidak dipercaya.

## Bagian 2 — Deploy website ke Vercel

### 1. Unggah proyek ke GitHub

Vercel biasanya mengimpor website dari repository Git:

1. Buat repository baru di [GitHub](https://github.com).
2. Unggah seluruh isi folder proyek ini, termasuk `index.html`, `assets/`, `api/`, dan `apps-script/`.
3. Pastikan `index.html` dan folder `api/` berada di tingkat teratas/root repository, bukan tersimpan dalam subfolder tambahan.
4. Jangan unggah password atau file yang berisi rahasia.

### 2. Impor repository ke Vercel

1. Masuk ke [Vercel](https://vercel.com) dan pilih **Add New → Project**.
2. Hubungkan akun GitHub jika diminta, cari repository website, lalu tekan **Import**.
3. Pada pengaturan proyek, pilih **Other** sebagai framework.
4. Karena website ini tidak menggunakan proses build, biarkan **Build Command** kosong. Atur **Output Directory** menjadi `.` jika Vercel meminta direktori output.
5. Sebelum menekan **Deploy**, buka **Environment Variables**, lalu tambahkan:

   | Name | Value |
   | --- | --- |
   | `APPS_SCRIPT_URL` | URL Web App `/exec` dari Apps Script |

   Pilih target **Production**. Tambahkan **Preview** juga jika Anda ingin mencoba deployment preview dari branch lain.
6. Tekan **Deploy**. Vercel akan menyajikan `index.html` dan membuat API pada `/api/portfolio` dari file `api/portfolio.js`.
7. Jika domain Vercel sudah tersedia sebelum environment variable ditambahkan, buka **Project → Settings → Environment Variables**, simpan `APPS_SCRIPT_URL`, lalu lakukan **Redeploy** pada deployment terbaru agar variabel terbaca.

### 3. Hubungkan domain

Vercel memberi domain awal berakhiran `.vercel.app`. Untuk memakai domain milik sendiri, buka **Project → Settings → Domains**, tambahkan domain, lalu ikuti petunjuk DNS yang ditampilkan Vercel.

## Bagian 3 — Uji website dan dashboard

1. Buka domain Vercel Anda. Halaman utama, foto, dan galeri seharusnya tampil.
2. Buka `https://DOMAIN-ANDA/#admin`.
3. Masuk dengan `ADMIN_USERNAME` dan `ADMIN_PASSWORD` yang Anda atur di Script Properties Apps Script.
4. Periksa dashboard:
   - **Tampilan website:** ubah teks, foto profil, warna, menu, dan bagian yang ditampilkan.
   - **Proyek:** tambah/edit/hapus proyek. Proyek akan muncul tepat di atas galeri.
   - **Galeri foto** dan **Tautan:** kelola konten halaman.
   - **Pesan masuk:** baca pesan dari pengunjung atau hapus pesan.
5. Simpan pengaturan, lalu buka halaman publik di tab baru untuk memastikan perubahan tampil.
6. Kirim pesan uji melalui formulir **Hubungi Saya**. Setelah berhasil, pesan akan tampil di **Admin → Pesan masuk** dan di tab `Messages` di spreadsheet.

## Tab spreadsheet

Apps Script membuat tab dan judul kolom secara otomatis saat pertama kali data digunakan.

| Tab | Kolom |
| --- | --- |
| `Settings` | `key`, `value` |
| `Projects` | `id`, `title`, `category`, `year`, `description`, `image`, `url` |
| `Gallery` | `id`, `title`, `description`, `image` |
| `Links` | `id`, `title`, `url` |
| `Messages` | `id`, `createdAt`, `name`, `email`, `message` |

Galeri dan tautan awal akan dibuat otomatis jika tab-nya masih kosong. Tab `Projects` sengaja kosong agar Anda dapat memasukkan proyek yang benar-benar pernah dikerjakan. Pesan hanya dikirim melalui respons admin yang sudah login; endpoint konten publik tidak memuat pesan. Jika spreadsheet masih menggunakan format tab `Messages` lama tanpa `id`, Apps Script menambahkan ID secara otomatis.

## Jika ada masalah

- **Login gagal / username atau password salah:** pastikan `ADMIN_USERNAME` dan `ADMIN_PASSWORD` di Script Properties benar, lalu coba lagi.
- **URL Apps Script belum dikonfigurasi:** pastikan environment variable Vercel bernama tepat `APPS_SCRIPT_URL`, berisi URL `/exec`, dan deployment sudah di-redeploy.
- **Tidak bisa terhubung ke Apps Script:** periksa pengaturan Web App (`Execute as: Me`, akses `Anyone`) dan pastikan URL deployment di Vercel benar.
- **Apps Script mengeluh `SPREADSHEET_ID` belum dikonfigurasi:** periksa Script Properties dan pastikan nilainya ID saja, bukan seluruh URL spreadsheet.
- **Pesan formulir tidak tersimpan:** pastikan koneksi API berhasil dan akun Google yang memiliki deployment Apps Script masih dapat mengakses spreadsheet. Formulir menampilkan peringatan jika pesan gagal dikirim.
- **Kode Apps Script diubah tetapi perilaku lama masih muncul:** buat versi baru di **Deploy → Manage deployments → Edit → New version → Deploy**.
- **Perubahan setting Vercel belum aktif:** lakukan redeploy setelah mengubah Environment Variables.

## Catatan keamanan

Jangan menyimpan username/password admin dalam HTML, GitHub, atau spreadsheet. Batasi orang yang dapat mengedit project Apps Script dan spreadsheet. Endpoint kontak dapat diakses publik untuk menerima pesan, jadi untuk penggunaan yang ramai pertimbangkan pembatasan laju (rate limiting) dan proteksi spam. Tailwind CSS dimuat dari CDN sehingga tidak memerlukan build lokal.
