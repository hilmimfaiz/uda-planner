# UdaPlanner — Aplikasi Perencana Konten Media Sosial

Sistem perencana konten media sosial terintegrasi dengan backend **Supabase (PostgreSQL, Supabase Auth, Storage, & Row Level Security)** dan **Next.js** berdasarkan dokumen **PRD — UdaPlanner**.

---

## 🎨 Identitas & Desain Sistem

- **Warna Utama**: Hijau UdaCoding `#16A34A` (Hover `#15803D`, Latar lembut `#F0FDF4`).
- **Latar Aplikasi**: Putih `#FFFFFF` & Abu sangat terang `#F8FAFC`, Teks utama `#0F172A`, Teks sekunder `#64748B`.
- **Warna Status Postingan**:
  - `ide`: Abu `#94A3B8`
  - `draft`: Biru `#3B82F6`
  - `review` (Menunggu Review): Kuning `#F59E0B`
  - `siap` (Siap Posting): Hijau `#16A34A`
  - `terposting` (Sudah Posting): Abu Gelap `#475569` + Centang
  - `terlewat`: Merah `#DC2626` (Penanda jadwal terlewat)
- **Tipografi**: Plus Jakarta Sans
- **Format**: Rupiah `Rp 49.000`; Tanggal `12 Oktober 2026`; Jam format 24 jam dengan titik (contoh `19.00 WIB`).

---

## 💎 Perbandingan Paket Langganan

| Fitur | Gratis | Pro (Paling Populer) | Tim |
|---|---|---|---|
| **Harga** | **Rp 0** | **Rp 49.000 / 30 hari** | **Rp 149.000 / 30 hari** |
| **Cocok Untuk** | Coba-coba, 1 akun | Kreator / UMKM banyak akun | Agensi & Tim |
| **Jumlah Brand** | 1 brand | 5 brand | 20 brand |
| **Anggota Tim** | — | — | 10 orang |
| **Jadwal Postingan** | 30 per bulan | Tanpa batas | Tanpa batas |
| **Penyimpanan** | 200 MB (Foto maks 10MB) | 5 GB (Foto & Video maks 50MB) | 20 GB (Foto & Video maks 50MB) |
| **Bank Konten** | 5 item | Tanpa batas | Tanpa batas |
| **Grid Instagram** | Terkunci (contoh buram) | ✓ Aktif (1:1 & 4:5) | ✓ Aktif (1:1 & 4:5) |
| **Ekspor CSV & .ics** | Terkunci | ✓ Aktif | ✓ Aktif |
| **Alur Review & Persetujuan** | — | — | ✓ Aktif (Wajib Review) |
| **Komentar & Catatan Revisi** | — | — | ✓ Aktif |

---

## 🗺️ Daftar Halaman Lengkap

| Halaman | URL | Keterangan |
|---|---|---|
| **Landing** | `/` | Hero mockup kalender, masalah → solusi, 6 fitur utama, cara kerja, tabel harga 3 paket, FAQ accordion |
| **Daftar** | `/daftar` | Registrasi nama, email, password |
| **Masuk** | `/masuk` | Form login email & password |
| **Lupa Password** | `/lupa-password` | Form kirim email pemulihan |
| **Beranda** | `/app` | Jadwal hari ini, postingan terlewat, menunggu review, ringkasan bulan ini, kuota progress bar |
| **Kalender** | `/app/kalender` | Tampilan Bulan / Minggu / Agenda, geser jadwal + toast Urungkan, kotak "Belum dijadwalkan" |
| **Papan (Kanban)** | `/app/papan` | 5 kolom status (`ide`, `draft`, `review`, `siap`, `terposting`), geser antar kolom dengan aturan peran |
| **Daftar** | `/app/daftar` | Tabel postingan + filter (brand, status, platform, pilar, tanggal) + pencarian + tombol Ekspor CSV |
| **Grid Instagram** | `/app/grid` | Pratinjau feed 3 kolom per brand, rasio 1:1 atau 4:5 |
| **Editor Postingan** | `/app/postingan/baru` & `/app/postingan/[id]` | Form kiri, pratinjau kanan, tombol salin caption + hashtag, unduh file, tambah ke GCal, unduh .ics, WA |
| **Bank Konten** | `/app/bank` | Tab Caption & Hashtag, tombol salin, filter brand, batas 5 item untuk Gratis |
| **Brand** | `/app/brand` | Grid kartu brand, tombol tambah (terkunci jika kuota penuh) |
| **Pengaturan Brand** | `/app/brand/[id]` | Tab Profil, Tab Pilar Konten, Tab Anggota (link undangan WA), Tab Pengaturan (switch Wajib Review, arsip, hapus) |
| **Undangan** | `/undangan/[token]` | Kartu penerimaan undangan kolaborasi |
| **Langganan** | `/app/langganan` | Status aktif, 3 kartu paket, langkah transfer kode unik 3 digit, upload bukti |
| **Akun** | `/app/akun` | Profil, menit pengingat (5/15/30/60 menit), izin notifikasi browser |
| **Notifikasi** | `/app/notifikasi` | Daftar semua notifikasi aktivitas |
| **Panel Admin** | `/admin` | Ringkasan KPI, verifikasi bukti transfer (Setujui / Tolak), kelola pengguna, kelola harga paket |
| **404** | `*` | Halaman tidak ditemukan rapi dengan tombol kembali |

---

## 🗄️ Database Supabase (14 Tabel PostgreSQL)

Skema database lengkap tersedia di [`supabase/schema.sql`](supabase/schema.sql) mencakup:
1. `profiles`
2. `accounts`
3. `plans`
4. `brands`
5. `brand_members`
6. `invitations`
7. `content_pillars`
8. `posts`
9. `post_assets`
10. `snippets`
11. `comments`
12. `notifications`
13. `payments`
14. `app_settings`

Beserta fungsi RPC, triggers (`handle_new_user`, `handle_new_brand`, `handle_updated_at`), kebijakan Row Level Security (RLS) pada seluruh tabel, serta 3 Storage Buckets: `avatars`, `post-assets`, dan `payment-proofs`.

---

## ⚡ Cara Menjalankan

```bash
# Jalankan development server
npm run dev
```

Buka peramban di:
- **Landing Page**: [http://localhost:3000](http://localhost:3000)
- **Aplikasi (Beranda)**: [http://localhost:3000/app](http://localhost:3000/app)
- **Kalender Konten**: [http://localhost:3000/app/kalender](http://localhost:3000/app/kalender)
- **Papan Kanban**: [http://localhost:3000/app/papan](http://localhost:3000/app/papan)
- **Grid Instagram**: [http://localhost:3000/app/grid](http://localhost:3000/app/grid)
- **Panel Admin**: [http://localhost:3000/admin](http://localhost:3000/admin)
