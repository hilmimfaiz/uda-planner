# LEMBAR CHECKLIST PENGUJIAN WEB UDAPLANNER (QA & UAT)

Dokumen ini memuat daftar skenario pengujian komprehensif untuk memastikan seluruh fungsionalitas sistem pada sisi **Pengunjung Publik**, **Pengguna (User)**, dan **Administrator (Admin)** berjalan optimal tanpa kendala.

> 📄 **File Dokumen Microsoft Word**: Tersedia file format Word yang siap dicetak atau dicentang manual di: [`Checklist_Testing_UdaPlanner.docx`](file:///d:/Magang%20Udacoding/Uda-Planner/Checklist_Testing_UdaPlanner.docx).

---

## 📌 INFORMASI PENGUJIAN
- **Aplikasi**: UdaPlanner (Social Media Content Planner, Collaboration & Multi-Brand System)
- **Lingkup Uji**: Frontend (User & Admin) + Backend Supabase + Integrasi API
- **Tester / Penguji**: __________________________________________________
- **Tanggal Pengujian**: __________________________________________________
- **Status Akhir**: `[ ] Siap Rilis (Production Ready)` / `[ ] Butuh Perbaikan`

---

## MODUL 1: AUTENTIKASI & AKUN PUBLIK

| No | Status | Fitur & Skenario Pengujian | Hasil yang Diharapkan (Expected Result) | Output Sistem (Actual / System Output) | Catatan |
|:--:|:------:|----------------------------|-----------------------------------------|----------------------------------------|:-------:|
| 1 | [ ] Pass<br>[ ] Fail | **Pendaftaran Akun Baru (`/daftar`)**<br>_Langkah:_ Input nama lengkap, email valid, password min. 6 karakter, klik tombol 'Daftar Akun'. | Pendaftaran sukses, akun baru tersimpan di database auth Supabase. | Muncul notifikasi sukses registrasi, dialihkan ke halaman login/konfirmasi email. | |
| 2 | [ ] Pass<br>[ ] Fail | **Validasi Pendaftaran Duplikat**<br>_Langkah:_ Mendaftar menggunakan email yang sudah pernah terdaftar di sistem. | Sistem menolak dan menampilkan peringatan email sudah digunakan. | Pesan error ramah: 'Email sudah terdaftar. Silakan gunakan email lain atau masuk'. | |
| 3 | [ ] Pass<br>[ ] Fail | **Masuk Akun Pengguna (`/masuk`)**<br>_Langkah:_ Input email dan password user biasa yang valid, klik 'Masuk'. | Kredensial diverifikasi, token sesi tersimpan di cookie & localStorage. | Redirect otomatis ke halaman dashboard pengguna (`/app`) dengan profil aktif. | |
| 4 | [ ] Pass<br>[ ] Fail | **Pemisahan Role Pengguna vs Admin**<br>_Langkah:_ Login menggunakan akun ber-role Admin (`admin@udaplanner.id`). | Sistem mendeteksi role admin dan mengarahkan khusus ke panel administrasi. | Redirect otomatis ke halaman dashboard admin (`/admin`) dengan hak akses admin aktif. | |
| 5 | [ ] Pass<br>[ ] Fail | **Validasi Password Salah**<br>_Langkah:_ Input email valid namun password sengaja dibuat salah. | Login ditolak, form tetap aman, muncul notifikasi password/email salah. | Pesan error 'Email atau password salah' dan akun tidak dapat masuk. | |
| 6 | [ ] Pass<br>[ ] Fail | **Masuk via Google OAuth**<br>_Langkah:_ Klik tombol 'Lanjutkan dengan Google' pada halaman `/masuk`. | Pop-up Google Auth muncul, setelah disetujui akun otomatis terdaftar/masuk. | Redirect otomatis ke `/app` dengan profil tersinkronisasi dari akun Google. | |
| 7 | [ ] Pass<br>[ ] Fail | **Lupa & Reset Password (`/lupa-password`)**<br>_Langkah:_ Input email terdaftar dan klik 'Kirim Tautan Reset'. | Tautan pemulihan password terkirim ke email melalui Supabase Auth. | Notifikasi sukses terkirim, email menerima tautan ke `/atur-ulang-password`. | |
| 8 | [ ] Pass<br>[ ] Fail | **Keluar Akun (Logout)**<br>_Langkah:_ Klik tombol 'Keluar' pada menu profil di sidebar / header. | Sesi, token, dan cookie dibersihkan dari browser secara tuntas. | Dialihkan kembali ke `/masuk`, tombol back browser tidak dapat membuka `/app`. | |

---

## MODUL 2: ONBOARDING & PENGATURAN PROFIL AWAL

| No | Status | Fitur & Skenario Pengujian | Hasil yang Diharapkan (Expected Result) | Output Sistem (Actual / System Output) | Catatan |
|:--:|:------:|----------------------------|-----------------------------------------|----------------------------------------|:-------:|
| 1 | [ ] Pass<br>[ ] Fail | **Inisialisasi Profil Pengguna Baru**<br>_Langkah:_ User baru login pertama kali diarahkan ke form profil awal / mulai. | Form pengisian nama lengkap dan brand bisnis pertama muncul. | Nama lengkap tersimpan ke tabel `profiles` & `accounts`, header terisi nama. | |
| 2 | [ ] Pass<br>[ ] Fail | **Upload Logo Brand Pertama**<br>_Langkah:_ Pilih file gambar logo brand pada wizard onboarding dan klik lanjutkan. | File logo terunggah ke bucket storage Supabase dan terhubung ke brand. | Logo tampil pada avatar brand dan workspace dashboard langsung aktif. | |

---

## MODUL 3: MANAJEMEN BRAND BISNIS & KOLABORASI TIM

| No | Status | Fitur & Skenario Pengujian | Hasil yang Diharapkan (Expected Result) | Output Sistem (Actual / System Output) | Catatan |
|:--:|:------:|----------------------------|-----------------------------------------|----------------------------------------|:-------:|
| 1 | [ ] Pass<br>[ ] Fail | **Pembuatan Brand Bisnis (`/app/brand`)**<br>_Langkah:_ Isi nama brand, industri, warna identitas tema, dan upload logo. | Brand baru tersimpan di database dan langsung muncul pada pemilih brand di sidebar. | Brand baru aktif di daftar brand, postingan dapat dibuat khusus untuk brand tersebut. | |
| 2 | [ ] Pass<br>[ ] Fail | **Batasan Kuota Brand (Paket Free)**<br>_Langkah:_ User berpaket Free (kuota 1 brand) mencoba membuat brand ke-2. | Sistem memblokir penambahan dan menampilkan modal saran upgrade paket. | Modal 'Batas Kuota Brand Tercapai' muncul, mengarahkan ke halaman langganan. | |
| 3 | [ ] Pass<br>[ ] Fail | **Multi-Brand (Paket Pro & Team)**<br>_Langkah:_ User berpaket Pro/Team membuat lebih dari 1 brand bisnis. | Penambahan brand berhasil dibuat sesuai batas kuota paket berbayar yang aktif. | Brand kedua/ketiga tersimpan normal di database dan user dapat berganti-ganti brand. | |
| 4 | [ ] Pass<br>[ ] Fail | **Undang Anggota Tim Kolaborasi**<br>_Langkah:_ Masukkan email rekan tim dan pilih role: Editor, Reviewer, atau Viewer. | Undangan tersimpan di tabel `brand_members` dengan status pending. | Link undangan (`/undangan/[token]`) ter-generate dan dapat disalin ke rekan tim. | |
| 5 | [ ] Pass<br>[ ] Fail | **Penerimaan Undangan (`/undangan/[token]`)**<br>_Langkah:_ Rekan tim membuka tautan undangan dan klik tombol 'Terima Undangan'. | Status undangan berubah 'accepted', user resmi tergabung ke brand tersebut. | Brand otomatis muncul di workspace rekan tim dengan hak akses sesuai perannya. | |
| 6 | [ ] Pass<br>[ ] Fail | **Batalkan Undangan & Hapus Anggota**<br>_Langkah:_ Owner menekan tombol batalkan undangan pending atau hapus pada anggota aktif. | Hak akses anggota dicabut seketika dari brand yang bersangkutan. | Nama anggota hilang dari daftar tim, dan rekan tim tidak dapat mengakses brand lagi. | |
| 7 | [ ] Pass<br>[ ] Fail | **Keluar dari Tim Mandiri**<br>_Langkah:_ Anggota tim menekan tombol 'Keluar dari Anggota TIM' pada `/app/langganan`. | Status keanggotaan terhapus, akun user otomatis kembali mandiri ke paket Free. | Modal sukses keluar tim, brand rekan tim terlepas, dan user dapat membeli paket pribadi. | |

---

## MODUL 4: PERENCANAAN KONTEN (POSTINGAN, KALENDER & PAPAN KANBAN)

| No | Status | Fitur & Skenario Pengujian | Hasil yang Diharapkan (Expected Result) | Output Sistem (Actual / System Output) | Catatan |
|:--:|:------:|----------------------------|-----------------------------------------|----------------------------------------|:-------:|
| 1 | [ ] Pass<br>[ ] Fail | **Buat Postingan Baru (`/app/postingan/baru`)**<br>_Langkah:_ Pilih brand, pilih medsos, isi judul, caption, tanggal & jam tayang. | Postingan tersimpan di database Supabase dengan metadata jadwal akurat. | Modal 'Postingan Berhasil Dijadwalkan' muncul di kalender dan papan kanban. | |
| 2 | [ ] Pass<br>[ ] Fail | **Upload Media Foto / Video**<br>_Langkah:_ Unggah gambar (JPG/PNG) atau video (MP4) sebagai materi visual postingan. | Media berhasil terupload ke storage dan muncul di kotak mockup smartphone. | Mockup feed menampilkan visual media secara proporsional sesuai rasio terpilih. | |
| 3 | [ ] Pass<br>[ ] Fail | **Bantuan Caption & Generator Hashtag**<br>_Langkah:_ Klik tombol rekomendasi ide caption atau tombol tambah hashtag otomatis. | Sistem mengisi teks caption dengan template kreatif dan hashtag relevan. | Teks caption bertambah otomatis tanpa menghapus draf yang sudah ditulis. | |
| 4 | [ ] Pass<br>[ ] Fail | **Papan Kanban Konten (`/app/papan`)**<br>_Langkah:_ Buka papan kanban kolom: Ide, Draf, Review, Dijadwalkan, Diterbitkan. | Seluruh kartu postingan terdistribusi sesuai status alur kerja masing-masing. | Kartu konten tampil memuat thumbnail, judul, platform medsos, dan tanggal tayang. | |
| 5 | [ ] Pass<br>[ ] Fail | **Drag and Drop Kartu Kanban**<br>_Langkah:_ Tarik kartu postingan dari kolom 'Draf' lalu letakkan di kolom 'Dijadwalkan'. | Status postingan berubah seketika di UI dan langsung tersimpan ke database. | Kartu berpindah kolom, notifikasi status terupdate, dan sinkron di kalender. | |
| 6 | [ ] Pass<br>[ ] Fail | **Kalender Konten (`/app/kalender`)**<br>_Langkah:_ Melihat jadwal bulanan, navigasi ganti bulan, dan klik salah satu jadwal. | Kalender menampilkan penanda postingan pada tanggal yang sesuai tepat waktu. | Muncul pop-up detail konten lengkap dengan jam, brand, caption, dan status review. | |
| 7 | [ ] Pass<br>[ ] Fail | **Jadwal Cepat dari Kalender**<br>_Langkah:_ Klik pada tanggal kosong di grid kalender bulanan. | Form pembuatan postingan terbuka dengan tanggal yang sudah terisi otomatis. | Form postingan baru aktif dengan field tanggal sesuai tanggal kalender yang diklik. | |
| 8 | [ ] Pass<br>[ ] Fail | **Daftar Konten Tabel (`/app/daftar`)**<br>_Langkah:_ Cari postingan via search judul dan filter berdasarkan status / brand. | Tabel memfilter baris postingan secara cepat dan responsif. | Daftar postingan yang cocok tampil, tombol aksi edit dan hapus berfungsi normal. | |

---

## MODUL 5: PRATINJAU GRID INSTAGRAM (FEED SIMULATOR)

| No | Status | Fitur & Skenario Pengujian | Hasil yang Diharapkan (Expected Result) | Output Sistem (Actual / System Output) | Catatan |
|:--:|:------:|----------------------------|-----------------------------------------|----------------------------------------|:-------:|
| 1 | [ ] Pass<br>[ ] Fail | **Empty State Pratinjau Grid (`/app/grid`)**<br>_Langkah:_ Buka halaman grid saat brand belum memiliki postingan terencana. | Tampil pesan dan ilustrasi ramah 'Belum ada postingan yang direncanakan'. | Tampilan empty state informatif dengan tombol 'Buat Postingan Pertama Sekarang'. | |
| 2 | [ ] Pass<br>[ ] Fail | **Simulasi Grid 3-Kolom Instagram**<br>_Langkah:_ Buka halaman grid ketika brand sudah memiliki beberapa postingan feed. | Menampilkan simulasi feed 3-kolom persis seperti antarmuka aplikasi Instagram. | Thumbnail postingan tersusun rapi dari kiri ke kanan berdasarkan urutan tayang. | |
| 3 | [ ] Pass<br>[ ] Fail | **Toggle Rasio Aspek (1:1 vs 4:5)**<br>_Langkah:_ Klik tombol switch antara '1:1 Kotak' dan '4:5 Portrait' di atas grid. | Proporsi setiap kotak grid berubah dinamis menyesuaikan rasio terpilih. | Thumbnail menyesuaikan tinggi-lebar tanpa mengalami distorsi gambar atau pecah. | |
| 4 | [ ] Pass<br>[ ] Fail | **Fitur Reorder Feed Grid**<br>_Langkah:_ Geser kotak gambar di grid simulator untuk menata estetika visual feed. | Posisi visual feed berubah dan susunan feed tersimpan dengan konsisten. | Urutan feed terupdate instan sehingga admin dapat menilai keserasian visual. | |

---

## MODUL 6: PAKET LANGGANAN, PEMBAYARAN & BERHENTI LANGGANAN

| No | Status | Fitur & Skenario Pengujian | Hasil yang Diharapkan (Expected Result) | Output Sistem (Actual / System Output) | Catatan |
|:--:|:------:|----------------------------|-----------------------------------------|----------------------------------------|:-------:|
| 1 | [ ] Pass<br>[ ] Fail | **Katalog Paket & Durasi (`/app/langganan`)**<br>_Langkah:_ Pilih paket (Free, Pro, Team) dan pilih durasi (1, 3, 6, 12 Bulan). | Total biaya transfer terhitung akurat sesuai diskon durasi yang berlaku. | Rincian harga, potongan diskon, dan kode unik pembayaran tertera transparan. | |
| 2 | [ ] Pass<br>[ ] Fail | **Sinkronisasi Rekening Bank Transfer**<br>_Langkah:_ Melihat daftar pilihan rekening bank tujuan transfer resmi di form. | Hanya rekening bank yang berstatus aktif dari sisi admin yang muncul. | Pilihan bank (BCA, Mandiri, BRI, dll) lengkap dengan nomor rekening & atas nama. | |
| 3 | [ ] Pass<br>[ ] Fail | **Pengajuan Bukti Transfer**<br>_Langkah:_ Isi nama pengirim rekening, bank asal, upload foto bukti transfer, klik konfirmasi. | Bukti struk terunggah, status transaksi tercatat sebagai 'pending' di database. | Modal sukses konfirmasi muncul, tombol kirim bukti ke WhatsApp Admin aktif. | |
| 4 | [ ] Pass<br>[ ] Fail | **Aktivasi Paket Otomatis setelah Disetujui**<br>_Langkah:_ Admin menyetujui transaksi pembayaran pelanggan pada panel admin. | Akun pelanggan otomatis ter-upgrade ke paket tujuan (Pro/Team) beserta masa aktif. | Banner paket di `/app/langganan` berubah: status 'LANGGANAN AKTIF' & masa aktif tampil. | |
| 5 | [ ] Pass<br>[ ] Fail | **Fitur Berhenti Langganan (Downgrade ke Free)**<br>_Langkah:_ User berbayar klik tombol 'Berhenti Langganan' dan menyetujui modal. | Sistem membatalkan langganan di database Supabase dan membersihkan cache lokal. | Status seketika beralih ke Gratis (Free), `plan_until` jadi null, tombol batal hilang. | |
| 6 | [ ] Pass<br>[ ] Fail | **Tampilan Banner Bebas Bug Status Free**<br>_Langkah:_ Periksa teks banner status paket setelah user berhenti berlangganan. | Paket Aktif: GRATIS (FREE), info: 'Paket dasar gratis tanpa batasan waktu'. | Tidak ada lagi teks 'Masa aktif paket berlaku hingga' ataupun pill 'LANGGANAN AKTIF'. | |
| 7 | [ ] Pass<br>[ ] Fail | **Proteksi Cache & Auto-Upgrade Bug**<br>_Langkah:_ Refresh halaman browser (F5) atau logout-login ulang setelah berhenti langganan. | Status akun TETAP berstatus Gratis (Free) dan tidak kembali ke paket lama. | Akun stabil berstatus Free, database tetap 'free', tidak ada lonjakan upgrade otomatis. | |

---

## MODUL 7: PENGATURAN PROFIL PENGGUNA

| No | Status | Fitur & Skenario Pengujian | Hasil yang Diharapkan (Expected Result) | Output Sistem (Actual / System Output) | Catatan |
|:--:|:------:|----------------------------|-----------------------------------------|----------------------------------------|:-------:|
| 1 | [ ] Pass<br>[ ] Fail | **Ubah Nama Lengkap (`/app/akun`)**<br>_Langkah:_ Ubah nama lengkap pada form akun dan simpan perubahan. | Nama lengkap tersimpan di database dan langsung memperbarui teks profil header. | Notifikasi 'Profil Berhasil Diperbarui', nama baru tampil konsisten di semua halaman. | |
| 2 | [ ] Pass<br>[ ] Fail | **Ganti Foto Avatar Profil**<br>_Langkah:_ Pilih foto profil baru dan simpan avatar. | Gambar avatar baru tersimpan di Supabase Storage dan menggantikan foto lama. | Avatar di pojok kanan atas navbar dan halaman profil langsung menampilkan foto baru. | |
| 3 | [ ] Pass<br>[ ] Fail | **Ubah Password Akun Pengguna**<br>_Langkah:_ Input password lama yang benar, masukkan password baru (min 6 karakter) & konfirmasi. | Password terupdate di Supabase Auth, sesi tetap aman. | Notifikasi 'Password Berhasil Diubah', user dapat logout dan login dengan password baru. | |

---

## MODUL 8: PANEL ADMIN - DASHBOARD & HEADER WAKTU

| No | Status | Fitur & Skenario Pengujian | Hasil yang Diharapkan (Expected Result) | Output Sistem (Actual / System Output) | Catatan |
|:--:|:------:|----------------------------|-----------------------------------------|----------------------------------------|:-------:|
| 1 | [ ] Pass<br>[ ] Fail | **Ucapan Sapaan Waktu Otomatis**<br>_Langkah:_ Buka admin pada jam: Pagi (04-11), Siang (11-15), Sore (15-18:30), Malam (18:30-04). | Sistem menyapa sesuai waktu lokal komputer: 'Selamat pagi/siang/sore/malam'. | Teks sapaan di header menampilkan salam waktu yang akurat secara otomatis. | |
| 2 | [ ] Pass<br>[ ] Fail | **Format Nama Lengkap Admin di Sapaan**<br>_Langkah:_ Periksa penulisan nama lengkap admin setelah koma pada sapaan header. | Format: [Sapaan Waktu], [Nama Lengkap Admin] (bukan email admin atau kata 'admin' polos). | Tampilan personal sesuai nama lengkap profil admin (contoh: 'Selamat siang, Budi Santoso'). | |
| 3 | [ ] Pass<br>[ ] Fail | **Jam Digital WIB Real-Time di Header**<br>_Langkah:_ Perhatikan jam digital di sebelah kanan header panel admin. | Jam digital (format HH:mm:ss WIB) berdetik dinamis setiap detik tanpa jeda. | Jam digital aktif berjalan real-time sinkron dengan waktu komputer penguji. | |
| 4 | [ ] Pass<br>[ ] Fail | **Kartu Metrik Statistik (`/admin`)**<br>_Langkah:_ Melihat kartu analitik: Total Pengguna, Pengguna Berbayar, Pending, Brand. | Angka metrik terhitung akurat sesuai data riil yang ada di database Supabase. | Statistik kuantitatif tampil jelas dengan indikator pertumbuhan yang mudah dipahami. | |

---

## MODUL 9: PANEL ADMIN - VERIFIKASI PEMBAYARAN LANGGANAN

| No | Status | Fitur & Skenario Pengujian | Hasil yang Diharapkan (Expected Result) | Output Sistem (Actual / System Output) | Catatan |
|:--:|:------:|----------------------------|-----------------------------------------|----------------------------------------|:-------:|
| 1 | [ ] Pass<br>[ ] Fail | **Daftar Transaksi (`/admin/pembayaran`)**<br>_Langkah:_ Filter transaksi: Semua, Menunggu Verifikasi, Disetujui, Ditolak, Dibatalkan. | Daftar pembayaran tersaring dengan tepat sesuai status yang dipilih. | Tabel memuat tanggal, nama user, bank, paket, nominal transfer, dan bukti transfer. | |
| 2 | [ ] Pass<br>[ ] Fail | **Preview Bukti Transfer**<br>_Langkah:_ Klik foto bukti struk transfer pada baris transaksi pending. | Modal gambar resolusi tinggi terbuka agar admin dapat membaca struk jelas. | Gambar bukti transfer tampil penuh, terdapat nomor rekening dan nominal transfer. | |
| 3 | [ ] Pass<br>[ ] Fail | **Aksi Persetujuan Pembayaran (Approve)**<br>_Langkah:_ Klik tombol 'Setujui' pada pengajuan pembayaran pending. | Status transaksi berubah menjadi 'approved', paket akun pelanggan aktif di database. | Baris pindah ke tab 'Disetujui', pelanggan langsung mendapatkan akses paket Pro/Team. | |
| 4 | [ ] Pass<br>[ ] Fail | **Aksi Penolakan Pembayaran (Reject)**<br>_Langkah:_ Klik tombol 'Tolak' dan masukkan alasan penolakan (misal: 'Nominal tidak cocok'). | Status transaksi berubah menjadi 'rejected', alasan tersimpan di database. | Baris pindah ke tab 'Ditolak', alasan penolakan tampil di riwayat transaksi pengguna. | |

---

## MODUL 10: PANEL ADMIN - MANAJEMEN PENGGUNA & PROTEKSI SESAMA ADMIN

| No | Status | Fitur & Skenario Pengujian | Hasil yang Diharapkan (Expected Result) | Output Sistem (Actual / System Output) | Catatan |
|:--:|:------:|----------------------------|-----------------------------------------|----------------------------------------|:-------:|
| 1 | [ ] Pass<br>[ ] Fail | **Tabel Daftar Pengguna (`/admin/pengguna`)**<br>_Langkah:_ Melihat daftar pengguna, cari nama/email, dan filter role/paket. | Tabel memuat Nama Lengkap, Email, Role (Admin/User), Paket Aktif, Tanggal, Status. | Pencarian cepat responsif, data pengguna tersaji lengkap dan terstruktur. | |
| 2 | [ ] Pass<br>[ ] Fail | **Proteksi Sesama Admin (Larangan Hapus)**<br>_Langkah:_ Periksa baris data pengguna yang berstatus role 'Admin'. | Tombol 'Hapus' TIDAK TERSEDIA / dinonaktifkan khusus pada baris akun Admin. | Tombol hapus hanya muncul pada baris pengguna biasa, sesama admin terlindungi. | |
| 3 | [ ] Pass<br>[ ] Fail | **Lihat Detail Profil Sesama Admin**<br>_Langkah:_ Klik tombol 'Lihat Detail' pada baris akun admin lain. | Modal detail terbuka menampilkan nama lengkap, email, peran, dan riwayat. | Modal menampilkan informasi lengkap profil admin secara transparan tanpa opsi hapus. | |
| 4 | [ ] Pass<br>[ ] Fail | **Hapus Pengguna Biasa (User)**<br>_Langkah:_ Admin menekan tombol hapus pada baris user biasa dengan konfirmasi. | Akun pengguna biasa berhasil dihapus dari database `accounts` dan `auth` Supabase. | Pengguna terhapus bersih dan tidak lagi dapat login ke dalam aplikasi. | |

---

## MODUL 11: PANEL ADMIN - PENGELOLAAN REKENING BANK TRANSFER

| No | Status | Fitur & Skenario Pengujian | Hasil yang Diharapkan (Expected Result) | Output Sistem (Actual / System Output) | Catatan |
|:--:|:------:|----------------------------|-----------------------------------------|----------------------------------------|:-------:|
| 1 | [ ] Pass<br>[ ] Fail | **Tambah Rekening Baru (`/admin/rekening`)**<br>_Langkah:_ Isi form: Nama Bank, Nomor Rekening, Nama Pemilik, klik simpan. | Rekening baru tersimpan di database dan langsung muncul pada tabel rekening. | Rekening baru aktif dan otomatis tersedia pada pilihan pembayaran di sisi pengguna. | |
| 2 | [ ] Pass<br>[ ] Fail | **Edit Detail Rekening Bank**<br>_Langkah:_ Ubah nomor rekening atau nama pemilik rekening yang ada dan simpan. | Perubahan tersimpan otomatis di database tanpa perlu reload manual. | Data rekening terbarui seketika dan sinkron dengan opsi pembayaran pelanggan. | |
| 3 | [ ] Pass<br>[ ] Fail | **Sakelar Nonaktifkan Rekening Bank**<br>_Langkah:_ Ubah toggle switch salah satu rekening dari Aktif menjadi Nonaktif. | Status rekening berubah menjadi nonaktif di database. | Rekening yang dinonaktifkan OTOMATIS HILANG dari pilihan transfer di user (`/app/langganan`). | |
| 4 | [ ] Pass<br>[ ] Fail | **Sakelar Aktifkan Kembali Rekening Bank**<br>_Langkah:_ Ubah toggle switch rekening yang nonaktif kembali menjadi Aktif. | Status rekening kembali aktif di database. | Rekening OTOMATIS MUNCUL KEMBALI sebagai opsi transfer di halaman langganan pelanggan. | |
| 5 | [ ] Pass<br>[ ] Fail | **Hapus Rekening Bank**<br>_Langkah:_ Klik ikon hapus rekening bank dan konfirmasi dialog peringatan. | Rekening terhapus dari database. | Rekening hilang dari tabel admin dan tidak lagi muncul di halaman pengguna. | |

---

## MODUL 12: PANEL ADMIN - PENGELOLAAN PAKET & HARGA

| No | Status | Fitur & Skenario Pengujian | Hasil yang Diharapkan (Expected Result) | Output Sistem (Actual / System Output) | Catatan |
|:--:|:------:|----------------------------|-----------------------------------------|----------------------------------------|:-------:|
| 1 | [ ] Pass<br>[ ] Fail | **Katalog Paket Langganan (`/admin/paket`)**<br>_Langkah:_ Melihat konfigurasi paket Free, Pro, Team beserta opsi durasi. | Menampilkan harga per durasi (1, 3, 6, 12 Bulan), batas kuota, dan fitur. | Informasi paket tersaji lengkap dan terstruktur. | |
| 2 | [ ] Pass<br>[ ] Fail | **Ubah Harga & Konfigurasi Paket**<br>_Langkah:_ Edit harga paket atau ubah kuota brand lalu klik simpan. | Perubahan tersimpan di database Supabase dan langsung sinkron ke pelanggan. | Halaman `/app/langganan` menampilkan harga baru dan kuota baru secara akurat. | |

---

## MODUL 13: PANEL ADMIN - PENGATURAN & UBAH PASSWORD ADMIN

| No | Status | Fitur & Skenario Pengujian | Hasil yang Diharapkan (Expected Result) | Output Sistem (Actual / System Output) | Catatan |
|:--:|:------:|----------------------------|-----------------------------------------|----------------------------------------|:-------:|
| 1 | [ ] Pass<br>[ ] Fail | **Ubah Nama Lengkap Admin (`/admin/pengaturan`)**<br>_Langkah:_ Ubah nama lengkap pada form pengaturan dan klik 'Simpan Profil'. | Nama baru tersimpan di database dan langsung memperbarui sapaan header. | Teks sapaan header seketika menampilkan nama baru tanpa reload browser. | |
| 2 | [ ] Pass<br>[ ] Fail | **Pengaturan Nomor WhatsApp Admin**<br>_Langkah:_ Perbarui nomor WhatsApp admin penerima konfirmasi bukti transfer. | Nomor WhatsApp tersimpan dan tautan kirim bukti di pelanggan mengarah ke nomor ini. | Klik tombol WhatsApp di user langsung membuka chat wa.me ke nomor baru tersebut. | |
| 3 | [ ] Pass<br>[ ] Fail | **Fitur Ubah Password Admin**<br>_Langkah:_ Input Password Saat Ini, Password Baru (min 6 karakter) & Konfirmasi cocok. | Password akun admin berhasil diubah di sistem Supabase Auth. | Notifikasi 'Password Admin Berhasil Diperbarui', admin dapat login dengan password baru. | |
| 4 | [ ] Pass<br>[ ] Fail | **Validasi Keamanan Ubah Password**<br>_Langkah:_ Ubah password dengan password saat ini yang salah atau konfirmasi tidak cocok. | Sistem memblokir pengubahan dan menampilkan pesan error spesifik. | Pesan error muncul dan password admin tetap aman tidak berubah. | |

---

## ✍️ LEMBAR PENGESAHAN & KESIMPULAN AKHIR

| Tanggal Selesai Pengujian | Hasil Kesimpulan Pengujian | Penanggung Jawab / Tester |
|:-------------------------|:---------------------------|:--------------------------|
| Tanggal: .......................................<br>Jam: ............................................ WIB | [  ] **DITERIMA** (Lolos Uji Siap Rilis)<br><br>[  ] **BUTUH PERBAIKAN** (Ada Temuan Bug) | Nama: ....................................................<br><br><br>Tanda Tangan: ( ............................................ ) |
