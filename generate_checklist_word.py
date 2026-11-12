import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.enum.section import WD_SECTION, WD_ORIENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=120, right=120):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_border(cell, **kwargs):
    """
    kwargs: top, bottom, left, right
    values: dict(sz=12, val='single', color='CBD5E1')
    """
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for edge in ('top', 'left', 'bottom', 'right'):
        edge_data = kwargs.get(edge)
        if edge_data:
            tag = f'w:{edge}'
            element = OxmlElement(tag)
            element.set(qn('w:val'), edge_data.get('val', 'single'))
            element.set(qn('w:sz'), str(edge_data.get('sz', 4)))
            element.set(qn('w:space'), '0')
            element.set(qn('w:color'), edge_data.get('color', 'E2E8F0'))
            tcBorders.append(element)
    tcPr.append(tcBorders)

def build_checklist_docx():
    doc = docx.Document()

    # Set page to Landscape A4 for wide table layout (perfect for UAT / Testing sheets)
    section = doc.sections[0]
    section.orientation = WD_ORIENT.LANDSCAPE
    # A4 dimensions in landscape: 11.69 x 8.27 inches
    section.page_width = Inches(11.69)
    section.page_height = Inches(8.27)
    section.top_margin = Inches(0.6)
    section.bottom_margin = Inches(0.6)
    section.left_margin = Inches(0.6)
    section.right_margin = Inches(0.6)

    # Document Header Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_after = Pt(2)
    r_title = p_title.add_run("LEMBAR CHECKLIST PENGUJIAN WEB (QA & UAT)")
    r_title.bold = True
    r_title.font.size = Pt(16)
    r_title.font.name = 'Arial'
    r_title.font.color.rgb = RGBColor(15, 23, 42)

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(10)
    r_sub = p_sub.add_run("Aplikasi: UdaPlanner (Social Media Content Planner, Collaboration & Multi-Brand System)")
    r_sub.font.size = Pt(10)
    r_sub.font.name = 'Arial'
    r_sub.font.color.rgb = RGBColor(71, 85, 105)

    # Metadata Box Table
    meta_table = doc.add_table(rows=2, cols=4)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_table.autofit = False

    col_widths = [Inches(1.8), Inches(3.4), Inches(1.8), Inches(3.4)]
    meta_data = [
        [("Nama Penguji", ".................................................."), ("Tanggal Pengujian", "..................................................")],
        [("Lingkup Uji", "Frontend, Backend Supabase & Panel Admin"), ("Status Akhir", "[  ] Siap Produksi    [  ] Perlu Revisi")]
    ]

    for row_idx, row_content in enumerate(meta_data):
        for col_pair_idx, (k, v) in enumerate(row_content):
            c_lbl = meta_table.cell(row_idx, col_pair_idx * 2)
            c_val = meta_table.cell(row_idx, col_pair_idx * 2 + 1)
            c_lbl.width = col_widths[col_pair_idx * 2]
            c_val.width = col_widths[col_pair_idx * 2 + 1]

            set_cell_background(c_lbl, 'F1F5F9')
            set_cell_background(c_val, 'FFFFFF')
            set_cell_margins(c_lbl, top=60, bottom=60, left=90, right=90)
            set_cell_margins(c_val, top=60, bottom=60, left=90, right=90)
            set_cell_border(c_lbl, top=dict(sz=4, color='CBD5E1'), bottom=dict(sz=4, color='CBD5E1'), left=dict(sz=4, color='CBD5E1'), right=dict(sz=4, color='CBD5E1'))
            set_cell_border(c_val, top=dict(sz=4, color='CBD5E1'), bottom=dict(sz=4, color='CBD5E1'), left=dict(sz=4, color='CBD5E1'), right=dict(sz=4, color='CBD5E1'))

            p_lbl = c_lbl.paragraphs[0]
            r_k = p_lbl.add_run(k)
            r_k.bold = True
            r_k.font.size = Pt(8.5)
            r_k.font.name = 'Arial'
            r_k.font.color.rgb = RGBColor(30, 41, 59)

            p_val = c_val.paragraphs[0]
            r_v = p_val.add_run(v)
            r_v.font.size = Pt(8.5)
            r_v.font.name = 'Arial'
            r_v.font.color.rgb = RGBColor(51, 65, 85)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # Definisi 13 Modul Pengujian Lengkap beserta Skenario, Hasil yang Diharapkan, dan Output
    modules = [
        {
            "title": "MODUL 1: AUTENTIKASI & AKUN PUBLIK",
            "tests": [
                {
                    "fitur": "Pendaftaran Akun Baru (/daftar)",
                    "skenario": "Input nama, email valid, password min. 6 karakter, klik tombol 'Daftar Akun'.",
                    "expected": "Pendaftaran sukses, user baru tersimpan di database auth Supabase, muncul notifikasi sukses registrasi.",
                    "output": "Pesan sukses registrasi tampil, dialihkan ke /masuk atau verifikasi email, session dibuat di browser."
                },
                {
                    "fitur": "Validasi Pendaftaran Duplikat",
                    "skenario": "Mencoba mendaftar menggunakan email yang sudah pernah terdaftar di sistem.",
                    "expected": "Sistem menolak dan menampilkan pesan error bahwa email sudah digunakan.",
                    "output": "Modal/Toast error 'Email sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda'."
                },
                {
                    "fitur": "Masuk Akun Pengguna (/masuk)",
                    "skenario": "Input email dan password user yang valid, klik tombol 'Masuk'.",
                    "expected": "Kredensial diverifikasi, token sesi tersimpan di cookie/localStorage, diarahkan ke dashboard pengguna.",
                    "output": "Redirect otomatis ke halaman utama aplikasi (/app) dengan profil user aktif di navbar."
                },
                {
                    "fitur": "Pemisahan Role Pengguna vs Admin",
                    "skenario": "Login menggunakan akun ber-role Admin (admin@udaplanner.id).",
                    "expected": "Sistem mendeteksi role admin dan mengarahkan khusus ke panel administrasi.",
                    "output": "Redirect otomatis ke halaman dashboard admin (/admin) dan hak akses admin aktif."
                },
                {
                    "fitur": "Validasi Password Salah",
                    "skenario": "Input email valid namun password sengaja dibuat salah.",
                    "expected": "Login gagal, form tetap menampilkan input, muncul notifikasi password/email salah.",
                    "output": "Pesan error 'Email atau password salah' dan akun tidak dapat masuk."
                },
                {
                    "fitur": "Masuk via Google OAuth",
                    "skenario": "Klik tombol 'Lanjutkan dengan Google' pada halaman /masuk.",
                    "expected": "Pop-up autentikasi Google muncul, setelah disetujui pengguna otomatis terdaftar/login.",
                    "output": "Redirect ke halaman /app dengan profil tersinkronisasi dari akun Google."
                },
                {
                    "fitur": "Lupa & Reset Password (/lupa-password)",
                    "skenario": "Input email terdaftar di /lupa-password dan kirim permintaan reset.",
                    "expected": "Tautan pemulihan password terkirim ke email melalui Supabase Auth.",
                    "output": "Notifikasi sukses terkirim, email menerima link ke /atur-ulang-password."
                },
                {
                    "fitur": "Keluar Akun (Logout)",
                    "skenario": "Klik tombol 'Keluar' pada menu profil di sidebar / header.",
                    "expected": "Sesi, token, dan cookie auth dibersihkan dari browser secara tuntas.",
                    "output": "Halaman dialihkan kembali ke /masuk atau landing page, tombol back browser tidak dapat membuka /app."
                }
            ]
        },
        {
            "title": "MODUL 2: ONBOARDING & PENGATURAN PROFIL AWAL",
            "tests": [
                {
                    "fitur": "Inisialisasi Profil Pengguna Baru",
                    "skenario": "Pengguna yang baru pertama kali login diarahkan ke /profil-awal atau /app/mulai.",
                    "expected": "Form setup nama lengkap profil dan inisialisasi brand bisnis pertama muncul.",
                    "output": "Nama lengkap tersimpan ke tabel profiles dan accounts Supabase, sapaan di header terisi nama."
                },
                {
                    "fitur": "Upload Logo Brand Pertama",
                    "skenario": "Pilih file gambar logo brand pada wizard onboarding dan klik lanjutkan.",
                    "expected": "File logo terunggah ke bucket storage Supabase dan terhubung ke profil brand.",
                    "output": "Gambar logo tampil pada avatar brand dan dashboard langsung aktif."
                }
            ]
        },
        {
            "title": "MODUL 3: MANAJEMEN BRAND BISNIS & KOLABORASI TIM",
            "tests": [
                {
                    "fitur": "Pembuatan Brand Bisnis (/app/brand)",
                    "skenario": "Isi form tambah brand: Nama Brand, Industri/Kategori, warna tema, upload logo.",
                    "expected": "Data brand baru tersimpan di database dan langsung muncul pada pemilih brand aktif di sidebar.",
                    "output": "Brand baru muncul di daftar brand, postingan dapat dibuat khusus untuk brand tersebut."
                },
                {
                    "fitur": "Batasan Kuota Brand (Paket Free)",
                    "skenario": "User berpaket Free (kuota 1 brand) mencoba membuat brand ke-2.",
                    "expected": "Sistem memblokir penambahan dan menampilkan modal saran upgrade ke paket Pro/Team.",
                    "output": "Modal 'Batas Kuota Brand Tercapai' muncul, mengarahkan user ke halaman /app/langganan."
                },
                {
                    "fitur": "Multi-Brand (Paket Pro & Team)",
                    "skenario": "User berpaket Pro/Team membuat lebih dari 1 brand (misal brand ke-2 atau ke-3).",
                    "expected": "Penambahan brand berhasil dibuat sesuai batas kuota paket berbayar yang aktif.",
                    "output": "Brand kedua tersimpan normal di database dan user dapat berganti-ganti brand dengan leluasa."
                },
                {
                    "fitur": "Undang Anggota Tim Kolaborasi",
                    "skenario": "Pada detail brand, masukkan email rekan tim dan pilih role: Editor, Reviewer, atau Viewer.",
                    "expected": "Undangan tersimpan di tabel brand_members/brand_invitations dengan status pending.",
                    "output": "Link undangan (/undangan/[token]) berhasil di-generate dan dapat disalin untuk dikirim ke rekan tim."
                },
                {
                    "fitur": "Penerimaan Undangan (/undangan/[token])",
                    "skenario": "Rekan tim membuka tautan undangan dan menekan tombol 'Terima Undangan'.",
                    "expected": "Status undangan berubah menjadi 'accepted', user resmi tergabung ke brand tersebut.",
                    "output": "Brand otomatis muncul di workspace rekan tim dengan hak akses sesuai peran yang diberikan."
                },
                {
                    "fitur": "Batalkan Undangan & Hapus Anggota",
                    "skenario": "Owner brand menekan tombol batalkan pada undangan pending atau hapus pada anggota aktif.",
                    "expected": "Akses anggota dicabut seketika dari brand yang bersangkutan.",
                    "output": "Nama anggota hilang dari daftar tim, dan rekan tim tidak dapat lagi mengakses brand tersebut."
                },
                {
                    "fitur": "Keluar dari Tim Mandiri",
                    "skenario": "Anggota tim menekan tombol 'Keluar dari Anggota TIM' pada halaman /app/langganan.",
                    "expected": "Status keanggotaan terhapus, akun user otomatis kembali mandiri ke paket Free.",
                    "output": "Modal sukses keluar tim, brand rekan tim terlepas, dan user dapat membeli paket pribadi."
                }
            ]
        },
        {
            "title": "MODUL 4: PERENCANAAN KONTEN (POSTINGAN, KALENDER & PAPAN KANBAN)",
            "tests": [
                {
                    "fitur": "Buat Postingan Baru (/app/postingan/baru)",
                    "skenario": "Pilih brand, pilih saluran media sosial (Instagram, TikTok, dll), input judul, caption, tanggal & jam tayang.",
                    "expected": "Postingan tersimpan di database Supabase dengan metadata jadwal yang akurat.",
                    "output": "Modal notifikasi 'Postingan Berhasil Dijadwalkan' dan muncul di kalender & papan kanban."
                },
                {
                    "fitur": "Upload Media Foto / Video",
                    "skenario": "Unggah foto (JPG/PNG) atau video (MP4) sebagai materi visual postingan.",
                    "expected": "Media berhasil terupload ke storage dan muncul di kotak pratinjau mockup smartphone.",
                    "output": "Mockup feed menampilkan visual media secara proporsional sesuai rasio yang dipilih."
                },
                {
                    "fitur": "Bantuan Caption & Generator Hashtag",
                    "skenario": "Klik tombol generator rekomendasi caption atau tombol tambah hashtag otomatis.",
                    "expected": "Sistem mengisi teks caption dengan template kreatif dan hashtag relevan.",
                    "output": "Teks caption bertambah otomatis tanpa menghapus draf yang sudah ditulis sebelumnya."
                },
                {
                    "fitur": "Papan Kanban Konten (/app/papan)",
                    "skenario": "Membuka halaman papan kanban yang menampilkan kolom: Ide, Draf, Review, Dijadwalkan, Diterbitkan.",
                    "expected": "Seluruh kartu postingan terdistribusi sesuai status alur kerjanya masing-masing.",
                    "output": "Kartu konten tampil rapi memuat thumbnail, judul, platform medsos, dan tanggal tayang."
                },
                {
                    "fitur": "Drag and Drop Kartu Kanban",
                    "skenario": "Tarik kartu postingan dari kolom 'Draf' lalu lepaskan di kolom 'Dijadwalkan'.",
                    "expected": "Status postingan berubah seketika di UI dan langsung tersimpan ke database.",
                    "output": "Kartu berpindah kolom, notifikasi status terupdate, dan sinkron di tampilan kalender."
                },
                {
                    "fitur": "Kalender Konten (/app/kalender)",
                    "skenario": "Melihat jadwal bulanan, navigasi ganti bulan, dan klik salah satu kartu jadwal.",
                    "expected": "Kalender menampilkan penanda postingan pada tanggal yang sesuai secara tepat waktu.",
                    "output": "Muncul pop-up detail konten lengkap dengan jam posting, brand, caption, dan status persetujuan."
                },
                {
                    "fitur": "Jadwal Cepat dari Kalender",
                    "skenario": "Klik pada tanggal kosong di grid kalender bulanan.",
                    "expected": "Form pembuatan postingan langsung terbuka dengan tanggal yang sudah terisi otomatis.",
                    "output": "Form postingan baru aktif dengan field tanggal terisi sesuai tanggal kalender yang diklik."
                },
                {
                    "fitur": "Daftar Konten Tabel (/app/daftar)",
                    "skenario": "Mencari postingan lewat kotak search judul dan filter berdasarkan status / brand.",
                    "expected": "Tabel memfilter baris postingan secara cepat dan responsif.",
                    "output": "Hasil pencarian menampilkan daftar postingan yang cocok, tombol edit dan hapus berfungsi."
                }
            ]
        },
        {
            "title": "MODUL 5: PRATINJAU GRID INSTAGRAM (FEED SIMULATOR)",
            "tests": [
                {
                    "fitur": "Empty State Pratinjau Grid (/app/grid)",
                    "skenario": "Membuka halaman grid Instagram saat brand belum memiliki postingan terencana.",
                    "expected": "Tampil pesan dan ilustrasi ramah 'Belum ada postingan yang direncanakan'.",
                    "output": "Tampilan empty state informatif dengan tombol ajakan 'Buat Postingan Pertama Sekarang'."
                },
                {
                    "fitur": "Simulasi Grid 3-Kolom Instagram",
                    "skenario": "Membuka halaman grid ketika brand sudah memiliki beberapa postingan feed terencana.",
                    "expected": "Menampilkan simulasi feed 3-kolom persis seperti aplikasi Instagram resmi.",
                    "output": "Thumbnail postingan tersusun rapi dari kiri ke kanan berdasarkan urutan penayangan."
                },
                {
                    "fitur": "Toggle Rasio Aspek (1:1 vs 4:5)",
                    "skenario": "Klik tombol toggle antara '1:1 Kotak' dan '4:5 Portrait' di pojok kanan atas grid.",
                    "expected": "Proporsi setiap kotak grid berubah dinamis menyesuaikan rasio aspek yang dipilih.",
                    "output": "Thumbnail menyesuaikan tinggi-lebar tanpa mengalami distorsi gambar atau pecah."
                },
                {
                    "fitur": "Fitur Reorder Feed Grid",
                    "skenario": "Geser kotak gambar di grid untuk menata ulang estetika visual feed Instagram.",
                    "expected": "Posisi visual feed berubah dan susunan feed tersimpan dengan konsisten.",
                    "output": "Urutan pratinjau feed terupdate secara instan sehingga admin dapat menilai keserasian warna feed."
                }
            ]
        },
        {
            "title": "MODUL 6: PAKET LANGGANAN, PEMBAYARAN & BERHENTI LANGGANAN",
            "tests": [
                {
                    "fitur": "Katalog Paket & Durasi (/app/langganan)",
                    "skenario": "Pilih paket (Free, Pro, Team) dan pilih durasi (1 Bulan, 3 Bulan, 6 Bulan, 1 Tahun).",
                    "expected": "Total biaya transfer terhitung akurat sesuai diskon durasi yang berlaku.",
                    "output": "Rincian harga, potongan diskon, dan kode unik pembayaran tertera dengan transparan."
                },
                {
                    "fitur": "Sinkronisasi Rekening Bank Transfer",
                    "skenario": "Melihat daftar pilihan bank tujuan transfer resmi yang disediakan di form.",
                    "expected": "Hanya rekening bank yang berstatus aktif dari sisi admin yang muncul sebagai opsi.",
                    "output": "Pilihan bank (BCA, Mandiri, BRI, dll) lengkap dengan nomor rekening dan nama pemilik rekening resmi."
                },
                {
                    "fitur": "Pengajuan Bukti Transfer",
                    "skenario": "Isi nama pengirim rekening, bank asal, unggah foto bukti struk transfer, dan klik konfirmasi.",
                    "expected": "Bukti transfer terunggah, status transaksi tercatat sebagai 'pending' di database.",
                    "output": "Modal sukses konfirmasi muncul, tombol kirim bukti ke WhatsApp Admin aktif, banner pending muncul."
                },
                {
                    "fitur": "Aktivasi Paket Otomatis setelah Disetujui",
                    "skenario": "Admin menyetujui transaksi pembayaran pelanggan pada panel admin.",
                    "expected": "Akun pelanggan otomatis ter-upgrade ke paket tujuan (Pro/Team) dengan masa aktif yang tepat.",
                    "output": "Banner paket di /app/langganan berubah: status 'LANGGANAN AKTIF' dan masa aktif tampil jelas."
                },
                {
                    "fitur": "Fitur Berhenti Langganan (Downgrade ke Free)",
                    "skenario": "User berbayar aktif menekan tombol 'Berhenti Langganan' dan menyetujui modal konfirmasi.",
                    "expected": "Sistem membatalkan langganan di database Supabase dan membersihkan cache lokal.",
                    "output": "Status seketika beralih ke Gratis (Free), plan_until jadi null, tombol berhenti langganan hilang."
                },
                {
                    "fitur": "Tampilan Banner Bebas Bug Status Free",
                    "skenario": "Memeriksa teks pada banner status paket setelah user berhenti berlangganan.",
                    "expected": "Paket Aktif: GRATIS (FREE), keterangan: 'Paket dasar gratis tanpa batasan waktu', pill: 'Paket Free'.",
                    "output": "Tidak ada lagi teks 'Masa aktif paket berlaku hingga' ataupun pill 'LANGGANAN AKTIF'."
                },
                {
                    "fitur": "Proteksi Cache & Auto-Upgrade Bug",
                    "skenario": "Lakukan refresh halaman browser (F5) atau logout-login ulang setelah berhenti langganan.",
                    "expected": "Status akun TETAP berstatus Gratis (Free) dan tidak kembali lagi ke paket Pro/Team lama.",
                    "output": "Akun stabil berstatus Free, database tetap 'free', tidak ada lonjakan upgrade otomatis."
                }
            ]
        },
        {
            "title": "MODUL 7: PENGATURAN PROFIL PENGGUNA",
            "tests": [
                {
                    "fitur": "Ubah Nama Lengkap (/app/akun)",
                    "skenario": "Ubah nama lengkap pada form akun dan simpan perubahan.",
                    "expected": "Nama lengkap tersimpan di database dan langsung memperbarui teks profil di header.",
                    "output": "Notifikasi 'Profil Berhasil Diperbarui', nama baru tampil konsisten di semua halaman."
                },
                {
                    "fitur": "Ganti Foto Avatar Profil",
                    "skenario": "Pilih foto profil baru dan simpan avatar.",
                    "expected": "Gambar avatar baru tersimpan di Supabase Storage dan menggantikan foto lama.",
                    "output": "Avatar di pojok kanan atas navbar dan halaman profil langsung menampilkan foto baru."
                },
                {
                    "fitur": "Ubah Password Akun Pengguna",
                    "skenario": "Input password lama yang benar, masukkan password baru (min 6 karakter) & konfirmasi cocok.",
                    "expected": "Password terupdate di Supabase Auth, sesi tetap aman.",
                    "output": "Notifikasi 'Password Berhasil Diubah', user dapat logout dan login dengan password baru."
                }
            ]
        },
        {
            "title": "MODUL 8: PANEL ADMIN - DASHBOARD & HEADER WAKTU",
            "tests": [
                {
                    "fitur": "Ucapan Sapaan Waktu Otomatis",
                    "skenario": "Buka panel admin pada berbagai rentang jam: Pagi (04-11), Siang (11-15), Sore (15-18:30), Malam (18:30-04).",
                    "expected": "Sistem menyapa sesuai waktu lokal komputer dengan tepat: 'Selamat pagi / siang / sore / malam'.",
                    "output": "Teks sapaan di header menampilkan salam waktu yang akurat (contoh: 'Selamat siang, Budi Santoso')."
                },
                {
                    "fitur": "Format Nama Lengkap Admin di Sapaan",
                    "skenario": "Periksa penulisan nama lengkap admin setelah koma pada sapaan header.",
                    "expected": "Format: [Sapaan Waktu], [Nama Lengkap Admin] (bukan email admin atau kata 'admin' polos).",
                    "output": "Tampilan rapi dan personal sesuai nama lengkap profil admin yang sedang login."
                },
                {
                    "fitur": "Jam Digital WIB Real-Time di Header",
                    "skenario": "Perhatikan jam digital di sebelah kanan header panel admin.",
                    "expected": "Jam waktu digital (format HH:mm:ss WIB) berdetik dinamis setiap detik tanpa jeda.",
                    "output": "Jam digital aktif berjalan real-time sinkron dengan waktu lokal komputer penguji."
                },
                {
                    "fitur": "Kartu Metrik Statistik (/admin)",
                    "skenario": "Melihat kartu analitik: Total Pengguna, Pengguna Berbayar, Transaksi Pending, dan Total Brand.",
                    "expected": "Angka metrik terhitung akurat sesuai data riil yang ada di database Supabase.",
                    "output": "Statistik kuantitatif tampil jelas dengan indikator pertumbuhan yang mudah dipahami."
                }
            ]
        },
        {
            "title": "MODUL 9: PANEL ADMIN - VERIFIKASI PEMBAYARAN LANGGANAN",
            "tests": [
                {
                    "fitur": "Daftar Transaksi (/admin/pembayaran)",
                    "skenario": "Filter transaksi berdasarkan tab: Semua, Menunggu Verifikasi, Disetujui, Ditolak, Dibatalkan.",
                    "expected": "Daftar pembayaran tersaring dengan tepat sesuai status yang dipilih.",
                    "output": "Tabel menampilkan tanggal, nama pengguna, bank, paket, nominal transfer, dan bukti transfer."
                },
                {
                    "fitur": "Preview Bukti Transfer",
                    "skenario": "Klik foto bukti struk transfer pada baris transaksi pending.",
                    "expected": "Modal gambar resolusi tinggi terbuka agar admin dapat membaca struk dengan jelas.",
                    "output": "Gambar bukti transfer tampil penuh, terdapat nomor rekening dan nominal transfer yang tertera."
                },
                {
                    "fitur": "Aksi Persetujuan Pembayaran (Approve)",
                    "skenario": "Klik tombol 'Setujui' pada pengajuan pembayaran pending.",
                    "expected": "Status transaksi berubah menjadi 'approved', paket akun pelanggan langsung aktif di database.",
                    "output": "Baris berpindah ke tab 'Disetujui', pelanggan langsung mendapatkan akses paket Pro/Team."
                },
                {
                    "fitur": "Aksi Penolakan Pembayaran (Reject)",
                    "skenario": "Klik tombol 'Tolak' dan masukkan alasan penolakan (misal: 'Nominal tidak cocok').",
                    "expected": "Status transaksi berubah menjadi 'rejected', alasan tersimpan di database.",
                    "output": "Baris berpindah ke tab 'Ditolak', alasan penolakan tampil di riwayat transaksi pengguna."
                }
            ]
        },
        {
            "title": "MODUL 10: PANEL ADMIN - MANAJEMEN PENGGUNA & PROTEKSI SESAMA ADMIN",
            "tests": [
                {
                    "fitur": "Tabel Manajemen Pengguna (/admin/pengguna)",
                    "skenario": "Melihat daftar pengguna, melakukan pencarian nama/email, dan filter role/paket.",
                    "expected": "Tabel memuat Nama Lengkap, Email, Role (Admin/User), Paket Aktif, Tanggal Daftar, dan Status.",
                    "output": "Pencarian cepat responsif, data pengguna tersaji lengkap dan terstruktur."
                },
                {
                    "fitur": "Proteksi Sesama Admin (Larangan Hapus Admin)",
                    "skenario": "Periksa baris data pengguna yang berstatus role 'Admin'.",
                    "expected": "Tombol 'Hapus' TIDAK TERSEDIA / dinonaktifkan khusus pada baris sesama akun Admin.",
                    "output": "Tombol hapus hanya muncul pada baris pengguna biasa (role user), sesama admin terlindungi dari penghapusan."
                },
                {
                    "fitur": "Lihat Detail Profil Sesama Admin",
                    "skenario": "Klik tombol 'Lihat Detail' pada baris akun admin lain.",
                    "expected": "Modal detail terbuka menampilkan nama lengkap profil, email, peran, dan riwayat aktivitas.",
                    "output": "Modal menampilkan informasi lengkap profil admin secara transparan tanpa opsi hapus."
                },
                {
                    "fitur": "Hapus Pengguna Biasa (User)",
                    "skenario": "Admin menekan tombol hapus pada baris pengguna biasa (role user) dengan konfirmasi.",
                    "expected": "Akun pengguna biasa berhasil dihapus dari database accounts dan auth Supabase.",
                    "output": "Pengguna terhapus bersih dan tidak lagi dapat login ke dalam aplikasi."
                }
            ]
        },
        {
            "title": "MODUL 11: PANEL ADMIN - PENGELOLAAN REKENING BANK TRANSFER",
            "tests": [
                {
                    "fitur": "Tambah Rekening Baru (/admin/rekening)",
                    "skenario": "Isi form tambah rekening: Nama Bank, Nomor Rekening, Nama Pemilik, dan klik simpan.",
                    "expected": "Rekening baru tersimpan di database dan langsung muncul pada tabel rekening bank.",
                    "output": "Rekening baru aktif dan otomatis tersedia pada pilihan pembayaran di sisi pengguna."
                },
                {
                    "fitur": "Edit Detail Rekening Bank",
                    "skenario": "Ubah nomor rekening atau nama pemilik rekening yang sudah ada dan klik simpan.",
                    "expected": "Perubahan tersimpan otomatis di database tanpa perlu reload manual.",
                    "output": "Data rekening terbarui seketika dan sinkron dengan opsi pembayaran pelanggan."
                },
                {
                    "fitur": "Sakelar Nonaktifkan Rekening Bank",
                    "skenario": "Ubah toggle switch salah satu rekening dari Aktif menjadi Nonaktif.",
                    "expected": "Status rekening berubah menjadi nonaktif di database.",
                    "output": "Rekening yang dinonaktifkan OTOMATIS HILANG dari pilihan transfer di /app/langganan pengguna."
                },
                {
                    "fitur": "Sakelar Aktifkan Kembali Rekening Bank",
                    "skenario": "Ubah toggle switch rekening yang nonaktif kembali menjadi Aktif.",
                    "expected": "Status rekening kembali aktif di database.",
                    "output": "Rekening OTOMATIS MUNCUL KEMBALI sebagai opsi transfer di halaman langganan pelanggan."
                },
                {
                    "fitur": "Hapus Rekening Bank",
                    "skenario": "Klik ikon hapus rekening bank dan konfirmasi dialog peringatan.",
                    "expected": "Rekening terhapus dari database.",
                    "output": "Rekening hilang dari tabel admin dan tidak lagi muncul di halaman pengguna."
                }
            ]
        },
        {
            "title": "MODUL 12: PANEL ADMIN - PENGELOLAAN PAKET & HARGA",
            "tests": [
                {
                    "fitur": "Katalog Paket Langganan (/admin/paket)",
                    "skenario": "Melihat konfigurasi paket Free, Pro, dan Team beserta opsi durasi langganannya.",
                    "expected": "Menampilkan harga per durasi (1, 3, 6, 12 Bulan), batas kuota brand, dan bullet-points fitur.",
                    "output": "Informasi paket tersaji lengkap dan terstruktur."
                },
                {
                    "fitur": "Ubah Harga & Konfigurasi Paket",
                    "skenario": "Edit harga salah satu paket atau ubah batas kuota brand lalu klik simpan.",
                    "expected": "Perubahan tersimpan di database Supabase dan langsung sinkron ke sisi pengguna.",
                    "output": "Halaman /app/langganan pelanggan menampilkan harga baru dan kuota baru secara akurat."
                }
            ]
        },
        {
            "title": "MODUL 13: PANEL ADMIN - PENGATURAN & UBAH PASSWORD ADMIN",
            "tests": [
                {
                    "fitur": "Ubah Nama Lengkap Admin (/admin/pengaturan)",
                    "skenario": "Ubah nama lengkap profil admin pada form pengaturan dan klik 'Simpan Profil'.",
                    "expected": "Nama baru tersimpan di database dan langsung memperbarui sapaan waktu di header admin.",
                    "output": "Teks sapaan header seketika menampilkan nama baru tanpa perlu reload browser."
                },
                {
                    "fitur": "Pengaturan Nomor WhatsApp Admin",
                    "skenario": "Perbarui nomor WhatsApp admin penerima konfirmasi transfer struk pembayaran.",
                    "expected": "Nomor WhatsApp tersimpan dan tautan kirim bukti transfer di sisi pelanggan mengarah ke nomor ini.",
                    "output": "Klik tombol WhatsApp di sisi user langsung membuka chat wa.me ke nomor baru tersebut."
                },
                {
                    "fitur": "Fitur Ubah Password Admin",
                    "skenario": "Input Password Saat Ini yang benar, masukkan Password Baru (min 6 karakter) & Konfirmasi Password cocok.",
                    "expected": "Password akun admin berhasil diubah di sistem Supabase Auth.",
                    "output": "Modal/Toast sukses 'Password Admin Berhasil Diperbarui', admin dapat login dengan password baru."
                },
                {
                    "fitur": "Validasi Keamanan Ubah Password",
                    "skenario": "Mencoba ubah password dengan password saat ini yang salah atau konfirmasi password tidak cocok.",
                    "expected": "Sistem memblokir pengubahan dan menampilkan pesan error spesifik.",
                    "output": "Pesan error muncul dan password admin tidak berubah."
                }
            ]
        }
    ]

    # Render Tabel untuk Setiap Modul
    for mod in modules:
        # Module Heading
        p_mod = doc.add_paragraph()
        p_mod.paragraph_format.space_before = Pt(12)
        p_mod.paragraph_format.space_after = Pt(4)
        r_mod = p_mod.add_run(mod["title"])
        r_mod.bold = True
        r_mod.font.size = Pt(10.5)
        r_mod.font.name = 'Arial'
        r_mod.font.color.rgb = RGBColor(15, 23, 42)

        # Table: 6 Kolom (No, Centang Status, Fitur & Skenario, Hasil yang Diharapkan, Output Sistem, Catatan)
        tests = mod["tests"]
        table = doc.add_table(rows=len(tests) + 1, cols=6)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False

        headers = [
            ("No", Inches(0.4)),
            ("Status", Inches(1.2)),
            ("Fitur & Skenario Pengujian", Inches(2.7)),
            ("Hasil yang Diharapkan (Expected)", Inches(2.8)),
            ("Output Sistem (Actual)", Inches(2.5)),
            ("Catatan", Inches(0.9)),
        ]

        # Header Row
        for c_idx, (text, w) in enumerate(headers):
            cell = table.cell(0, c_idx)
            cell.width = w
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_background(cell, '1E293B')
            set_cell_margins(cell, top=70, bottom=70, left=80, right=80)
            set_cell_border(cell, top=dict(sz=6, color='0F172A'), bottom=dict(sz=6, color='0F172A'), left=dict(sz=4, color='334155'), right=dict(sz=4, color='334155'))
            p = cell.paragraphs[0]
            if c_idx in (0, 1):
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = p.add_run(text)
            r.bold = True
            r.font.size = Pt(8.5)
            r.font.name = 'Arial'
            r.font.color.rgb = RGBColor(255, 255, 255)

        # Data Rows
        for r_idx, test_item in enumerate(tests, start=1):
            c_no = table.cell(r_idx, 0)
            c_stat = table.cell(r_idx, 1)
            c_fitur = table.cell(r_idx, 2)
            c_exp = table.cell(r_idx, 3)
            c_out = table.cell(r_idx, 4)
            c_note = table.cell(r_idx, 5)

            for i_col, col_cell in enumerate([c_no, c_stat, c_fitur, c_exp, c_out, c_note]):
                col_cell.width = headers[i_col][1]
                col_cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                bg = 'F8FAFC' if r_idx % 2 == 1 else 'FFFFFF'
                set_cell_background(col_cell, bg)
                set_cell_margins(col_cell, top=60, bottom=60, left=70, right=70)
                set_cell_border(col_cell, top=dict(sz=3, color='E2E8F0'), bottom=dict(sz=3, color='E2E8F0'), left=dict(sz=3, color='E2E8F0'), right=dict(sz=3, color='E2E8F0'))

            # No
            p_no = c_no.paragraphs[0]
            p_no.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r_n = p_no.add_run(str(r_idx))
            r_n.font.size = Pt(8)
            r_n.font.name = 'Arial'
            r_n.font.color.rgb = RGBColor(100, 116, 139)

            # Checkbox Status (Bisa dicentang manual dengan pulpen saat dicetak atau diisi di Word)
            p_stat = c_stat.paragraphs[0]
            p_stat.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r_pass = p_stat.add_run("[   ] Pass\n")
            r_pass.bold = True
            r_pass.font.size = Pt(8)
            r_pass.font.name = 'Arial'
            r_pass.font.color.rgb = RGBColor(22, 101, 52)

            r_fail = p_stat.add_run("[   ] Fail")
            r_fail.bold = True
            r_fail.font.size = Pt(8)
            r_fail.font.name = 'Arial'
            r_fail.font.color.rgb = RGBColor(185, 28, 28)

            # Fitur & Skenario
            p_fit = c_fitur.paragraphs[0]
            r_fn = p_fit.add_run(test_item["fitur"] + "\n")
            r_fn.bold = True
            r_fn.font.size = Pt(8)
            r_fn.font.name = 'Arial'
            r_fn.font.color.rgb = RGBColor(15, 23, 42)

            r_sc = p_fit.add_run("Langkah: " + test_item["skenario"])
            r_sc.font.size = Pt(7.5)
            r_sc.font.name = 'Arial'
            r_sc.font.color.rgb = RGBColor(71, 85, 105)

            # Hasil yang Diharapkan
            p_exp = c_exp.paragraphs[0]
            r_e = p_exp.add_run(test_item["expected"])
            r_e.font.size = Pt(7.5)
            r_e.font.name = 'Arial'
            r_e.font.color.rgb = RGBColor(30, 41, 59)

            # Output Sistem
            p_out = c_out.paragraphs[0]
            r_o = p_out.add_run(test_item["output"])
            r_o.font.size = Pt(7.5)
            r_o.font.name = 'Arial'
            r_o.font.color.rgb = RGBColor(15, 118, 110)

            # Catatan (Dikosongkan untuk catatan penguji)
            p_not = c_note.paragraphs[0]
            r_nt = p_not.add_run("")
            r_nt.font.size = Pt(7.5)
            r_nt.font.name = 'Arial'

    # Lembar Penandatanganan & Kesimpulan Akhir
    doc.add_paragraph().paragraph_format.space_before = Pt(14)
    sign_table = doc.add_table(rows=2, cols=3)
    sign_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    sign_table.autofit = False

    s_widths = [Inches(3.5), Inches(3.5), Inches(3.5)]
    for r_i in range(2):
        for c_i in range(3):
            c = sign_table.cell(r_i, c_i)
            c.width = s_widths[c_i]
            set_cell_background(c, 'F8FAFC' if r_i == 0 else 'FFFFFF')
            set_cell_margins(c, top=80, bottom=80, left=100, right=100)
            set_cell_border(c, top=dict(sz=4, color='CBD5E1'), bottom=dict(sz=4, color='CBD5E1'), left=dict(sz=4, color='CBD5E1'), right=dict(sz=4, color='CBD5E1'))

    p0 = sign_table.cell(0, 0).paragraphs[0]
    r = p0.add_run("Tanggal Selesai Pengujian:")
    r.bold = True
    r.font.size = Pt(8.5)
    r.font.name = 'Arial'

    p1 = sign_table.cell(0, 1).paragraphs[0]
    r = p1.add_run("Hasil Kesimpulan Pengujian:")
    r.bold = True
    r.font.size = Pt(8.5)
    r.font.name = 'Arial'

    p2 = sign_table.cell(0, 2).paragraphs[0]
    r = p2.add_run("Penanggung Jawab / Tester:")
    r.bold = True
    r.font.size = Pt(8.5)
    r.font.name = 'Arial'

    p0_sub = sign_table.cell(1, 0).paragraphs[0]
    p0_sub.add_run("\nTanggal: ................................\nJam: ....................................... WIB")

    p1_sub = sign_table.cell(1, 1).paragraphs[0]
    p1_sub.add_run("\n[   ] DITERIMA (Lolos Uji Siap Rilis)\n[   ] BUTUH PERBAIKAN (Ada Temuan Bug)")

    p2_sub = sign_table.cell(1, 2).paragraphs[0]
    p2_sub.add_run("\nNama: ....................................\n\nTanda Tangan: ( .................................. )")

    output_path = "Checklist_Testing_UdaPlanner.docx"
    doc.save(output_path)
    print(f"File Word berhasil dibuat: {output_path}")

if __name__ == '__main__':
    build_checklist_docx()
