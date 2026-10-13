-- ==============================================================================
-- UdaPlanner Database Seed Data
-- Initial Subscription Plans, App Settings, and Demo Starter Data
-- ==============================================================================

-- 1. Insert Subscription Plans
INSERT INTO public.plans (id, name, slug, description, price, billing_period, max_brands, max_posts_per_month, max_team_members, features, is_active)
VALUES
  (
    'free',
    'Gratis (Free Plan)',
    'gratis',
    'Cocok untuk konten kreator perorangan atau pemula yang baru memulai perencanaan konten.',
    0.00,
    'monthly',
    1,
    15,
    1,
    '["1 Brand Aktif", "15 Jadwal Postingan / bulan", "1 Anggota Tim (Solo)", "Bank Caption & Hashtag Dasar", "Kalender Konten Mingguan & Bulanan"]'::jsonb,
    true
  ),
  (
    'pro',
    'Pro (Creator / Freelancer)',
    'pro',
    'Untuk kreator konten profesional dan freelancer yang mengelola multi-brand.',
    99000.00,
    'monthly',
    3,
    100,
    3,
    '["Hingga 3 Brand", "100 Jadwal Postingan / bulan", "Hingga 3 Anggota Tim", "Penyimpanan Media 2GB", "Alur Persetujuan & Komentar Revisi", "Bank Konten Lengkap", "Filter Kalender Lanjutan"]'::jsonb,
    true
  ),
  (
    'team',
    'Tim (Agensi / Bisnis)',
    'tim',
    'Solusi komprehensif untuk tim agensi kreatif, korporat, dan media planner profesional.',
    299000.00,
    'monthly',
    10,
    1000,
    10,
    '["Hingga 10 Brand", "Postingan Tanpa Batas (1000/bln)", "Hingga 10 Anggota Tim", "Role Lengkap: Owner, Editor, Reviewer, Viewer", "Penyimpanan Media 10GB", "Prioritas Support", "Export Jadwal Konten"]'::jsonb,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  max_brands = EXCLUDED.max_brands,
  max_posts_per_month = EXCLUDED.max_posts_per_month,
  max_team_members = EXCLUDED.max_team_members,
  features = EXCLUDED.features;

-- 2. Insert Application Settings
INSERT INTO public.app_settings (id, key, value, description)
VALUES
  (
    'setting_app_name',
    'app_name',
    '"UdaPlanner"'::jsonb,
    'Nama aplikasi'
  ),
  (
    'setting_bank_info',
    'bank_transfer_accounts',
    '[
      {"bank": "BCA", "account_number": "8720192837", "account_name": "PT UdaCoding Digital Indonesia"},
      {"bank": "Bank Mandiri", "account_number": "1370018273645", "account_name": "PT UdaCoding Digital Indonesia"},
      {"bank": "BSI", "account_number": "7192837465", "account_name": "PT UdaCoding Digital Indonesia"}
    ]'::jsonb,
    'Daftar rekening tujuan transfer pembayaran langganan'
  ),
  (
    'setting_maintenance',
    'maintenance_mode',
    'false'::jsonb,
    'Status mode pemeliharaan sistem'
  ),
  (
    'setting_default_platforms',
    'supported_platforms',
    '["instagram", "tiktok", "linkedin", "facebook", "x", "youtube_shorts"]'::jsonb,
    'Platform media sosial yang didukung'
  )
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;

-- ==============================================================================
-- 3. Demo Mock Data for Immediate Testing
-- Creates a test user profile, account, brand, pillars, posts, and snippets
-- ==============================================================================

DO $$
DECLARE
  v_demo_user_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  v_editor_user_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
  v_account_id UUID := '11111111-1111-1111-1111-111111111111'::uuid;
  v_brand_id UUID := '22222222-2222-2222-2222-222222222222'::uuid;
  v_pillar_edu UUID := '33333333-3333-3333-3333-333333333331'::uuid;
  v_pillar_promo UUID := '33333333-3333-3333-3333-333333333332'::uuid;
  v_pillar_eng UUID := '33333333-3333-3333-3333-333333333333'::uuid;
  v_post_1 UUID := '44444444-4444-4444-4444-444444444441'::uuid;
  v_post_2 UUID := '44444444-4444-4444-4444-444444444442'::uuid;
  v_post_3 UUID := '44444444-4444-4444-4444-444444444443'::uuid;
BEGIN
  -- Insert demo profiles (only if not conflicting with auth.users triggers)
  -- Note: In production Supabase, profiles reference auth.users.
  -- Here we insert safe fallback seed that works both in standalone postgres & Supabase.
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, bio)
    VALUES 
      (v_demo_user_id, 'demo@udaplanner.id', 'Uda Admin Planner', 'admin', 'Lead Content Strategist & Administrator UdaPlanner'),
      (v_editor_user_id, 'editor@udaplanner.id', 'Sarah Rahmawati', 'user', 'Content Creator & Copywriter')
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If FK constraint to auth.users fails because auth.users is empty, ignore
    NULL;
  END;

  -- Insert Demo Account
  INSERT INTO public.accounts (id, owner_id, plan_id, company_name, brand_quota, post_quota, member_quota, status)
  VALUES (v_account_id, v_demo_user_id, 'pro', 'UdaCoding Creative Lab', 3, 100, 3, 'active')
  ON CONFLICT (id) DO NOTHING;

  -- Insert Demo Brand
  INSERT INTO public.brands (id, account_id, name, slug, description, color, industry, created_by)
  VALUES (
    v_brand_id,
    v_account_id,
    'UdaCoding Official',
    'udacoding-official',
    'Akun resmi pelatihan coding, bootcamp Flutter, Next.js, dan pengembangan aplikasi digital.',
    '#6366f1',
    'Pendidikan & Teknologi',
    v_demo_user_id
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert Brand Members
  INSERT INTO public.brand_members (brand_id, user_id, role)
  VALUES 
    (v_brand_id, v_demo_user_id, 'owner'),
    (v_brand_id, v_editor_user_id, 'editor')
  ON CONFLICT (brand_id, user_id) DO NOTHING;

  -- Insert Content Pillars
  INSERT INTO public.content_pillars (id, brand_id, name, color, description)
  VALUES
    (v_pillar_edu, v_brand_id, 'Edukasi & Tips Coding', '#3b82f6', 'Tutorial singkat, tips clean code, dan best practices programming.'),
    (v_pillar_promo, v_brand_id, 'Promosi & Program Magang', '#ec4899', 'Info pendaftaran batch magang, bootcamp, dan promo kelas.'),
    (v_pillar_eng, v_brand_id, 'Behind the Scenes & Trivia', '#10b981', 'Keseruan tim, kuis programming, dan interaksi komunitas.')
  ON CONFLICT (id) DO NOTHING;

  -- Insert Starter Posts
  INSERT INTO public.posts (id, brand_id, pillar_id, title, caption, hashtags, platforms, content_type, assigned_to, scheduled_at, status, created_by)
  VALUES
    (
      v_post_1,
      v_brand_id,
      v_pillar_edu,
      '5 Tips Menguasai PostgreSQL & Supabase untuk Backend Developer',
      'Ingin bikin backend cepat, aman, dan scalable? Simak 5 langkah rahasia memanfaatkan Row Level Security (RLS) dan auto trigger di Supabase! 🚀💡',
      ARRAY['#UdaCoding', '#Supabase', '#PostgreSQL', '#BackendDeveloper', '#CodingTips'],
      ARRAY['instagram', 'linkedin'],
      'carousel',
      v_demo_user_id,
      NOW() + INTERVAL '2 hours',
      'scheduled',
      v_demo_user_id
    ),
    (
      v_post_2,
      v_brand_id,
      v_pillar_promo,
      'Pendaftaran Magang Batch Terbaru UdaCoding Telah Dibuka!',
      'Siap naik level dari teori ke dunia industri nyata? Gabung program magang UdaCoding sekarang dan bangun portofolio impianmu bersama mentor berpengalaman! 🌟',
      ARRAY['#MagangUdaCoding', '#Internship', '#WebDeveloper', '#MobileDeveloper'],
      ARRAY['instagram', 'tiktok'],
      'reel',
      v_editor_user_id,
      NOW() + INTERVAL '1 day',
      'in_review',
      v_editor_user_id
    ),
    (
      v_post_3,
      v_brand_id,
      v_pillar_eng,
      'Tebak Output Kode JavaScript Ini! (Trivia Jumat Santai)',
      'Jangan ngaku sepuh JS kalau belum bisa jawab kuis satu ini tanpa buka console! Tulis jawabanmu di kolom komentar 👇',
      ARRAY['#KuisCoding', '#JavaScript', '#ProgrammerLife', '#Trivia'],
      ARRAY['instagram'],
      'feed',
      v_editor_user_id,
      NOW() - INTERVAL '1 day',
      'published',
      v_demo_user_id
    )
  ON CONFLICT (id) DO NOTHING;

  -- Insert Snippets (Caption Bank & Hashtags)
  INSERT INTO public.snippets (brand_id, type, title, content, tags, created_by)
  VALUES
    (
      v_brand_id,
      'caption',
      'Call to Action (CTA) Pendaftaran Kelas',
      'Tertarik belajar lebih dalam? Klik link di bio kami untuk info silabus dan konsultasi pendaftaran gratis dengan tim kami sekarang juga!',
      ARRAY['cta', 'pendaftaran', 'promo'],
      v_demo_user_id
    ),
    (
      v_brand_id,
      'caption',
      'Opening Hook Tips Coding',
      'Pernah merasa bingung saat baru belajar konsep ini? Tenang, kamu gak sendirian. Yuk kita bahas bareng-bareng langkah mudahnya di postingan ini!',
      ARRAY['hook', 'edukasi', 'tips'],
      v_demo_user_id
    ),
    (
      v_brand_id,
      'hashtag',
      'Hashtag Utama Brand UdaCoding',
      '#UdaCoding #BelajarCoding #ProgrammerIndonesia #BootcampCoding #SoftwareEngineer #TechCareer',
      ARRAY['brand', 'tech', 'general'],
      v_demo_user_id
    )
  ON CONFLICT DO NOTHING;

  -- Insert Starter Notifications
  INSERT INTO public.notifications (user_id, brand_id, title, message, link, is_read, type)
  VALUES
    (
      v_demo_user_id,
      v_brand_id,
      'Postingan Membutuhkan Review',
      'Sarah Rahmawati mengajukan postingan "Pendaftaran Magang Batch Terbaru" untuk ditinjau.',
      '/planner',
      false,
      'post_review'
    ),
    (
      v_demo_user_id,
      v_brand_id,
      'Selamat Datang di UdaPlanner!',
      'Backend UdaPlanner siap digunakan. Anda sedang menggunakan paket Pro.',
      '/settings',
      true,
      'system'
    )
  ON CONFLICT DO NOTHING;

END $$;
