'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import {
  User,
  Camera,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { PlanService, DynamicPlan, PlanDurationItem } from '@/services/plan.service';

export default function ProfilAwalPage() {
  const router = useRouter();
  const { user, profile, refreshUserData } = useAuth();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step state: 'PROFILE' -> 'PLANS'
  const [step, setStep] = useState<'PROFILE' | 'PLANS'>('PROFILE');

  // Profile Form State
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imgLoadError, setImgLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Plans Selection State
  const [plans, setPlans] = useState<DynamicPlan[]>([]);
  const [selectedDurationIndex, setSelectedDurationIndex] = useState<Record<string, number>>({});
  const [isSelectingPlan, setIsSelectingPlan] = useState(false);

  // Muat data paket dinamis dari PlanService
  useEffect(() => {
    PlanService.getActivePlans().then((data) => {
      if (data && data.length > 0) {
        setPlans(data);
        const initialDurIdx: Record<string, number> = {};
        data.forEach((p) => {
          initialDurIdx[p.code] = 0;
        });
        setSelectedDurationIndex(initialDurIdx);
      }
    });
  }, []);

  // Tangkap data auth langsung dari Supabase Session
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        if (!supabase) {
          setIsReady(true);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user || user;

        if (currentUser && isMounted) {
          // Cek apakah pengguna sudah pernah menyelesaikan onboarding pengisian profil & pemilihan paket
          const hasCompletedOnboarding =
            currentUser.user_metadata?.has_completed_onboarding === true ||
            (typeof window !== 'undefined' && localStorage.getItem('uda_profile_setup_done_' + currentUser.id) === 'true');

          // JIKA PENGGUNA SUDAH MENYELESAIKAN PROFIL & PAKET:
          // JANGAN TAMPILKAN FORM ONBOARDING, LANGSUNG ARAHKAN KE DASHBOARD!
          if (hasCompletedOnboarding) {
            try {
              localStorage.removeItem('uda_google_auth_pending');
              localStorage.removeItem('uda_needs_profile_setup');
              localStorage.setItem('uda_profile_setup_done_' + currentUser.id, 'true');
            } catch (e) {}

            if (typeof window !== 'undefined') {
              window.location.replace('/app');
            } else {
              router.replace('/app');
            }
            return;
          }

          const googleName =
            currentUser.user_metadata?.full_name ||
            currentUser.user_metadata?.name ||
            profile?.full_name ||
            currentUser.email?.split('@')[0] ||
            '';
          setFullName((prev) => (prev ? prev : googleName));

          // Hanya gunakan avatar_url jika bukan string kosong atau invalid
          const rawPhoto =
            profile?.avatar_url ||
            currentUser.user_metadata?.avatar_url ||
            currentUser.user_metadata?.picture ||
            null;

          if (rawPhoto && typeof rawPhoto === 'string' && rawPhoto.trim().length > 5) {
            setAvatarUrl((prev) => (prev !== null ? prev : rawPhoto));
            setImgLoadError(false);
          }
        }
      } catch (err) {
        console.warn('Session check error:', err);
      } finally {
        if (isMounted) setIsReady(true);
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [user, profile, supabase]);

  // Helper kompresi gambar lokal super ringan (~2-3 KB) agar aman disimpan di database
  const fileToBase64Thumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 120;
          let w = img.width;
          let h = img.height;

          if (w > h) {
            if (w > MAX_DIM) {
              h = Math.round((h * MAX_DIM) / w);
              w = MAX_DIM;
            }
          } else {
            if (h > MAX_DIM) {
              w = Math.round((w * MAX_DIM) / h);
              h = MAX_DIM;
            }
          }

          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.65));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Hanya format file gambar yang diperbolehkan (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Ukuran file foto maksimal adalah 5 MB.');
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    setImgLoadError(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setAvatarUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatarUrl(null);
    setSelectedFile(null);
    setImgLoadError(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // STEP 1: Simpan Profil dan Lanjut ke Pemilihan Paket
  const handleSaveProfileAndContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage('Nama Lengkap tidak boleh kosong.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      let activeUser = user;
      if (!activeUser && supabase) {
        const { data } = await supabase.auth.getUser();
        activeUser = data.user;
      }

      if (activeUser && supabase) {
        let finalAvatarUrl: string | null = avatarUrl;

        // Jika user memilih file baru, upload ke Storage atau fallback ke base64 thumbnail
        if (selectedFile) {
          try {
            const fileExt = selectedFile.name.split('.').pop() || 'jpg';
            const filePath = `${activeUser.id}/avatar_${Date.now()}.${fileExt}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(filePath, selectedFile, { upsert: true });

            if (!uploadError && uploadData) {
              const { data: publicUrlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);
              finalAvatarUrl = publicUrlData.publicUrl;
            } else {
              finalAvatarUrl = await fileToBase64Thumbnail(selectedFile);
            }
          } catch {
            finalAvatarUrl = await fileToBase64Thumbnail(selectedFile);
          }
        } else if (finalAvatarUrl && finalAvatarUrl.startsWith('blob:')) {
          finalAvatarUrl = null;
        }

        // 1. Simpan foto dan nama ke tabel profiles (database PostgreSQL)
        const { error: updateError, data: updateData } = await (supabase.from('profiles' as any) as any)
          .update({
            full_name: fullName.trim(),
            avatar_url: finalAvatarUrl || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', activeUser.id)
          .select();

        // Jika baris belum ada di tabel profiles, buat baris baru dengan .insert()
        if (updateError || !updateData || updateData.length === 0) {
          await (supabase.from('profiles' as any) as any).insert({
            id: activeUser.id,
            email: activeUser.email || '',
            full_name: fullName.trim(),
            avatar_url: finalAvatarUrl || null,
            role: 'user',
            reminder_minutes: 15,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }

        // 2. Perbarui user metadata di auth session
        try {
          const metaUpdates: Record<string, any> = {
            full_name: fullName.trim(),
          };
          if (finalAvatarUrl && (finalAvatarUrl.startsWith('http://') || finalAvatarUrl.startsWith('https://'))) {
            metaUpdates.avatar_url = finalAvatarUrl;
          }
          await supabase.auth.updateUser({
            data: metaUpdates,
          });
        } catch (authErr) {
          console.warn('Auth metadata update error:', authErr);
        }

        // 3. Simpan ke local storage khusus custom avatar agar sinkron instan antar halaman
        if (finalAvatarUrl) {
          try {
            localStorage.setItem('uda_custom_avatar_' + activeUser.id, finalAvatarUrl);
          } catch (e) {}
        } else {
          try {
            localStorage.removeItem('uda_custom_avatar_' + activeUser.id);
          } catch (e) {}
        }

        // 4. Simpan langsung ke cache lokal
        try {
          const cachedProf = {
            id: activeUser.id,
            email: activeUser.email || '',
            full_name: fullName.trim(),
            avatar_url: finalAvatarUrl || null,
            reminder_minutes: 15,
          };
          localStorage.setItem('uda_auth_profile', JSON.stringify(cachedProf));
        } catch (e) {}

        // 5. Muat ulang cache context
        await refreshUserData();
      }

      setIsSaving(false);
      // Lanjut ke Step 2: Pilih Paket
      setStep('PLANS');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan profil. Silakan coba lagi.');
      setIsSaving(false);
    }
  };

  // STEP 2: Pilih Paket Gratis -> Langsung ke Dashboard
  const handleSelectFreePlan = async () => {
    setIsSelectingPlan(true);
    try {
      let activeUser = user;
      if (!activeUser && supabase) {
        const { data } = await supabase.auth.getUser();
        activeUser = data.user;
      }

      if (activeUser && supabase) {
        // Terapkan paket Gratis di tabel accounts
        await (supabase.from('accounts' as any) as any)
          .update({
            plan_code: 'free',
            plan_until: null,
          })
          .or(`user_id.eq.${activeUser.id},id.eq.${activeUser.id}`);

        // Set metadata onboarding selesai
        await supabase.auth.updateUser({
          data: {
            has_completed_onboarding: true,
            has_seen_dashboard_tour: false,
          },
        });
      }

      // Tandai di localStorage
      if (activeUser?.id) {
        localStorage.setItem('uda_profile_setup_done_' + activeUser.id, 'true');
        localStorage.setItem('uda_auto_start_dashboard_tour_' + activeUser.id, 'true');
        localStorage.setItem('uda_new_user_tour_' + activeUser.id, 'true');
        localStorage.removeItem('uda_guided_tour_dashboard_' + activeUser.id);
        localStorage.removeItem('uda_dashboard_tour_seen_' + activeUser.id);
        localStorage.removeItem('uda_tour_kalender_' + activeUser.id);
        localStorage.removeItem('uda_tour_papan_' + activeUser.id);
        localStorage.removeItem('uda_tour_daftar_' + activeUser.id);
        localStorage.removeItem('uda_tour_grid_' + activeUser.id);
        localStorage.removeItem('uda_tour_brand_' + activeUser.id);
        localStorage.removeItem('uda_tour_bank_' + activeUser.id);
        localStorage.removeItem('uda_tour_langganan_' + activeUser.id);
        localStorage.removeItem('uda_tour_notifikasi_' + activeUser.id);
        localStorage.removeItem('uda_tour_akun_' + activeUser.id);
        localStorage.removeItem('uda_tour_postingan_' + activeUser.id);
      }
      localStorage.setItem('uda_profile_setup_done', 'true');
      localStorage.setItem('uda_user_is_new', 'true');
      localStorage.setItem('uda_auto_start_dashboard_tour', 'true');
      localStorage.removeItem('uda_guided_tour_dashboard');
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('uda_new_user_first_dashboard_visit', 'true');
      }
      localStorage.removeItem('uda_google_auth_pending');
      localStorage.removeItem('uda_needs_profile_setup');

      await refreshUserData();

      // Alihkan langsung ke halaman /app/langganan sesuai instruksi
      router.replace('/app/langganan');
    } catch (err) {
      console.warn('Free plan selection error:', err);
      router.replace('/app/langganan');
    }
  };

  // STEP 2: Pilih Paket Berbayar (Pro atau Tim) -> Dialihkan Terlebih Dahulu ke Pembayaran
  const handleSelectPaidPlan = async (planCode: 'pro' | 'team') => {
    setIsSelectingPlan(true);
    try {
      let activeUser = user;
      if (!activeUser && supabase) {
        const { data } = await supabase.auth.getUser();
        activeUser = data.user;
      }

      if (activeUser && supabase) {
        // Tandai onboarding selesai agar tidak kembali ke form pengisian profil
        await supabase.auth.updateUser({
          data: {
            has_completed_onboarding: true,
            has_seen_dashboard_tour: false,
          },
        });
      }

      if (activeUser?.id) {
        localStorage.setItem('uda_profile_setup_done_' + activeUser.id, 'true');
        localStorage.setItem('uda_auto_start_dashboard_tour_' + activeUser.id, 'true');
        localStorage.setItem('uda_new_user_tour_' + activeUser.id, 'true');
        localStorage.removeItem('uda_guided_tour_dashboard_' + activeUser.id);
        localStorage.removeItem('uda_dashboard_tour_seen_' + activeUser.id);
        localStorage.removeItem('uda_tour_kalender_' + activeUser.id);
        localStorage.removeItem('uda_tour_papan_' + activeUser.id);
        localStorage.removeItem('uda_tour_daftar_' + activeUser.id);
        localStorage.removeItem('uda_tour_grid_' + activeUser.id);
        localStorage.removeItem('uda_tour_brand_' + activeUser.id);
        localStorage.removeItem('uda_tour_bank_' + activeUser.id);
        localStorage.removeItem('uda_tour_langganan_' + activeUser.id);
        localStorage.removeItem('uda_tour_notifikasi_' + activeUser.id);
        localStorage.removeItem('uda_tour_akun_' + activeUser.id);
        localStorage.removeItem('uda_tour_postingan_' + activeUser.id);
      }
      localStorage.setItem('uda_profile_setup_done', 'true');
      localStorage.setItem('uda_user_is_new', 'true');
      localStorage.setItem('uda_auto_start_dashboard_tour', 'true');
      localStorage.removeItem('uda_guided_tour_dashboard');
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('uda_new_user_first_dashboard_visit', 'true');
      }
      localStorage.removeItem('uda_google_auth_pending');
      localStorage.removeItem('uda_needs_profile_setup');

      await refreshUserData();

      const activePlan = plans.find((p) => p.code === planCode);
      const durations = (activePlan?.durations || []).filter((d) => d.isActive);
      const activeIdx = selectedDurationIndex[planCode] || 0;
      const curDur = durations[activeIdx] || durations[0];
      const durParam = curDur?.id ? `&dur=${curDur.id}` : '';

      // Alihkan otomatis masuk ke halaman Paket Langganan & Upgrade Akun
      router.replace(`/app/langganan?plan=${planCode}${durParam}`);
    } catch (err) {
      console.warn('Paid plan selection error:', err);
      router.replace(`/app/langganan?plan=${planCode}`);
    }
  };

  const userEmail = user?.email || profile?.email || '';
  const initial = (fullName.trim() || userEmail || 'U').charAt(0).toUpperCase();

  if (!isReady) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Loader2 size={36} className="animate-spin" style={{ color: '#16a34a' }} />
      </div>
    );
  }

  // ==========================================
  // TAMPILAN STEP 2: PILIHAN PAKET BERLANGGANAN
  // ==========================================
  if (step === 'PLANS') {
    // Cari data paket dinamis dari service atau fallback default
    const freePlan = plans.find((p) => p.code === 'free');
    const proPlan = plans.find((p) => p.code === 'pro');
    const teamPlan = plans.find((p) => p.code === 'team');

    const proDurations = (proPlan?.durations || []).filter((d) => d.isActive);
    const proActiveIdx = selectedDurationIndex['pro'] || 0;
    const currentProDur = proDurations[proActiveIdx] || proDurations[0];
    const proDisplayPrice = currentProDur ? currentProDur.price : (proPlan?.price || 49000);

    const teamDurations = (teamPlan?.durations || []).filter((d) => d.isActive);
    const teamActiveIdx = selectedDurationIndex['team'] || 0;
    const currentTeamDur = teamDurations[teamActiveIdx] || teamDurations[0];
    const teamDisplayPrice = currentTeamDur ? currentTeamDur.price : (teamPlan?.price || 149000);

    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          backgroundImage:
            'radial-gradient(circle at 85% 20%, rgba(22, 163, 74, 0.08) 0%, transparent 40%), radial-gradient(circle at 15% 80%, rgba(2, 132, 199, 0.06) 0%, transparent 40%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 16px',
        }}
      >
        <div style={{ maxWidth: 1080, width: '100%' }}>
          {/* Header Step 2 */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <button
              type="button"
              onClick={() => {
                setStep('PROFILE');
                if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: 16,
              }}
            >
              <ArrowLeft size={15} />
              <span>Kembali ke Lengkapi Profil</span>
            </button>

            <h1
              style={{
                fontSize: 'clamp(1.5rem, 4vw, 2.1rem)',
                fontWeight: 900,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                marginBottom: 8,
              }}
            >
              Pilih Paket Berlangganan
            </h1>
            <p style={{ color: '#475569', fontSize: '0.92rem', maxWidth: 560, margin: '0 auto', lineHeight: 1.5 }}>
              Pilih paket yang paling cocok untuk bisnis dan konten media sosial Anda. Anda dapat mengubah paket kapan saja.
            </p>
          </div>

          {/* Grid 3 Kartu Paket */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 24,
              alignItems: 'stretch',
            }}
          >
            {/* 1. KARTU GRATIS */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '2.5px solid #0f172a',
                borderRadius: 16,
                boxShadow: '6px 6px 0px #0f172a',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>
                  Gratis
                </h3>
                <p style={{ fontSize: '0.84rem', color: '#64748b', minHeight: 40, lineHeight: 1.4, margin: '0 0 20px' }}>
                  Ideal untuk kreator pemula yang mengelola akun pribadi
                </p>

                <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1.5px solid #f1f5f9' }}>
                  <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                    Gratis
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 6 }}>
                    Gratis selamanya tanpa syarat
                  </div>
                </div>

                {/* Fitur Checklist */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem', color: '#334155' }}>
                    <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <span>Maksimal <strong>1 Akun Brand</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem', color: '#334155' }}>
                    <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <span>Penggunaan Tunggal (Solo)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem', color: '#334155' }}>
                    <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <span>30 Postingan Terjadwal / Bulan</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem', color: '#334155' }}>
                    <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <span>Storage 200 MB</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSelectFreePlan}
                disabled={isSelectingPlan}
                style={{
                  width: '100%',
                  padding: '13px 18px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  border: '2px solid #0f172a',
                  boxShadow: '3px 3px 0px #0f172a',
                  borderRadius: 10,
                  fontSize: '0.92rem',
                  fontWeight: 900,
                  cursor: isSelectingPlan ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {isSelectingPlan ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <span>Daftar Akun Gratis</span>
                )}
              </button>
            </div>

            {/* 2. KARTU PRO (PALING POPULER) */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '2.5px solid #0f172a',
                borderRadius: 16,
                boxShadow: '6px 6px 0px #0f172a',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              {/* Badge Paling Populer */}
              <div
                style={{
                  position: 'absolute',
                  top: -14,
                  right: 24,
                  backgroundColor: '#fef08a',
                  color: '#0f172a',
                  border: '2px solid #0f172a',
                  boxShadow: '2px 2px 0px #0f172a',
                  padding: '3px 12px',
                  borderRadius: 6,
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                }}
              >
                ★ PALING POPULER
              </div>

              <div>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>
                  Pro
                </h3>
                <p style={{ fontSize: '0.84rem', color: '#64748b', minHeight: 40, lineHeight: 1.4, margin: '0 0 16px' }}>
                  Pilihan utama profesional kreator dan digital marketer
                </p>

                {/* Variasi Durasi Paket */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    Pilihan Durasi Paket:
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {proDurations.map((dur, dIdx) => (
                      <button
                        key={dur.id}
                        type="button"
                        onClick={() => setSelectedDurationIndex((prev) => ({ ...prev, pro: dIdx }))}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: proActiveIdx === dIdx ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                          backgroundColor: proActiveIdx === dIdx ? '#f0fdf4' : '#ffffff',
                          color: proActiveIdx === dIdx ? '#15803d' : '#334155',
                          fontSize: '0.74rem',
                          fontWeight: proActiveIdx === dIdx ? 800 : 600,
                          cursor: 'pointer',
                        }}
                      >
                        {dur.name} {dur.discountPercent > 0 && <span style={{ color: '#16a34a' }}>-{dur.discountPercent}%</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1.5px solid #f1f5f9' }}>
                  <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                    Rp {proDisplayPrice.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 6 }}>
                    Per {currentProDur?.name || '1 Bulan'}
                  </div>
                </div>

                {/* Fitur Checklist */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem', color: '#334155' }}>
                    <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <span>Maksimal <strong>5 Akun Brand</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem', color: '#334155' }}>
                    <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <span>Penggunaan Tunggal (Solo)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem', color: '#334155' }}>
                    <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <span>Postingan Tanpa Batas</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem', color: '#334155' }}>
                    <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <span>Storage 5 GB</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem', color: '#334155' }}>
                    <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <span>Pratinjau Grid Instagram Interaktif</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem', color: '#334155' }}>
                    <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <span>Ekspor Kalender CSV & Google Calendar (.ics)</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSelectPaidPlan('pro')}
                disabled={isSelectingPlan}
                style={{
                  width: '100%',
                  padding: '13px 18px',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: '2px solid #0f172a',
                  boxShadow: '3px 3px 0px #0f172a',
                  borderRadius: 10,
                  fontSize: '0.92rem',
                  fontWeight: 900,
                  cursor: isSelectingPlan ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {isSelectingPlan ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <span>Pilih Paket Pro</span>
                )}
              </button>
            </div>

            {/* 3. KARTU TIM */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '2.5px solid #0f172a',
                borderRadius: 16,
                boxShadow: '6px 6px 0px #0f172a',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>
                  Tim
                </h3>
                <p style={{ fontSize: '0.84rem', color: '#64748b', minHeight: 40, lineHeight: 1.4, margin: '0 0 16px' }}>
                  Untuk tim agensi kreatif dan bisnis dengan kolaborasi penuh
                </p>

                {/* Variasi Durasi Paket */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    Pilihan Durasi Paket:
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {teamDurations.map((dur, dIdx) => (
                      <button
                        key={dur.id}
                        type="button"
                        onClick={() => setSelectedDurationIndex((prev) => ({ ...prev, team: dIdx }))}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: teamActiveIdx === dIdx ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                          backgroundColor: teamActiveIdx === dIdx ? '#f0fdf4' : '#ffffff',
                          color: teamActiveIdx === dIdx ? '#15803d' : '#334155',
                          fontSize: '0.74rem',
                          fontWeight: teamActiveIdx === dIdx ? 800 : 600,
                          cursor: 'pointer',
                        }}
                      >
                        {dur.name} {dur.discountPercent > 0 && <span style={{ color: '#16a34a' }}>-{dur.discountPercent}%</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1.5px solid #f1f5f9' }}>
                  <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                    Rp {teamDisplayPrice.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 6 }}>
                    Per {currentTeamDur?.name || '1 Bulan'}
                  </div>
                </div>

                {/* Fitur Checklist */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem', color: '#334155' }}>
                    <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <span>Maksimal <strong>20 Akun Brand</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem', color: '#334155' }}>
                    <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <span>Hingga <strong>10 Anggota Tim</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem', color: '#334155' }}>
                    <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <span>Postingan Tanpa Batas</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem', color: '#334155' }}>
                    <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <span>Storage 20 GB</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem', color: '#334155' }}>
                    <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <span>Pratinjau Grid Instagram Interaktif</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem', color: '#334155' }}>
                    <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <span>Ekspor Kalender CSV & Google Calendar (.ics)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem', color: '#334155' }}>
                    <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <span>Alur Persetujuan & Review Klien</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSelectPaidPlan('team')}
                disabled={isSelectingPlan}
                style={{
                  width: '100%',
                  padding: '13px 18px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  border: '2px solid #0f172a',
                  boxShadow: '3px 3px 0px #0f172a',
                  borderRadius: 10,
                  fontSize: '0.92rem',
                  fontWeight: 900,
                  cursor: isSelectingPlan ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {isSelectingPlan ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <span>Pilih Paket Tim</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // TAMPILAN STEP 1: LENGKAPI PROFIL ANDA
  // ==========================================
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        backgroundImage:
          'radial-gradient(circle at 85% 25%, rgba(22, 163, 74, 0.09) 0%, transparent 40%), radial-gradient(circle at 15% 75%, rgba(2, 132, 199, 0.07) 0%, transparent 40%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        className="uda-card"
        style={{
          maxWidth: 520,
          width: '100%',
          padding: 'clamp(28px, 5vw, 42px)',
          borderRadius: 14,
          border: '2.5px solid #0f172a',
          boxShadow: '6px 6px 0px #0f172a',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: '#16a34a',
                color: '#ffffff',
                border: '2px solid #0f172a',
                boxShadow: '2px 2px 0px #0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.25rem',
              }}
            >
              U
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#0f172a', lineHeight: 1.1 }}>
                UdaPlanner
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                Perencana Konten Sosmed
              </div>
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontSize: 'clamp(1.25rem, 3.5vw, 1.55rem)',
              fontWeight: 900,
              color: '#0f172a',
              marginBottom: 6,
              letterSpacing: '-0.02em',
            }}
          >
            Lengkapi Profil Anda
          </h1>
          <p style={{ color: '#475569', fontSize: '0.86rem', lineHeight: 1.5, margin: 0 }}>
            Konfirmasi nama lengkap dan pasang foto profil Anda sebelum memilih paket langganan.
          </p>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#fef2f2',
              border: '2px solid #ef4444',
              borderRadius: 8,
              boxShadow: '2px 2px 0px #ef4444',
              color: '#991b1b',
              fontSize: '0.84rem',
              fontWeight: 600,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfileAndContinue} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Section: Tambah Foto Profil */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 800,
                color: '#0f172a',
                marginBottom: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Foto Profil
            </label>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '14px 16px',
                backgroundColor: '#f8fafc',
                border: '2px solid #0f172a',
                borderRadius: 12,
                boxShadow: '3px 3px 0px #0f172a',
              }}
            >
              {/* Avatar Preview */}
              <div
                style={{
                  position: 'relative',
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  border: '2.5px solid #0f172a',
                  boxShadow: '3px 3px 0px #0f172a',
                  backgroundColor: '#e2e8f0',
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {avatarUrl && !imgLoadError ? (
                  <img
                    src={avatarUrl}
                    alt="Foto Profil"
                    onError={() => setImgLoadError(true)}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1.6rem',
                    }}
                  >
                    {initial}
                  </div>
                )}
              </div>

              {/* Upload Action */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSaving}
                    className="btn-uda btn-uda-secondary btn-uda-sm"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      padding: '7px 12px',
                    }}
                  >
                    <Camera size={14} />
                    <span>{avatarUrl ? 'Ganti Foto' : 'Tambah Foto'}</span>
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={isSaving}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        padding: '7px 12px',
                        backgroundColor: '#fff1f2',
                        color: '#e11d48',
                        border: '1.5px solid #fecdd3',
                        borderRadius: 8,
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>

                <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>
                  JPG, PNG, atau WebP (Maks. 5 MB)
                </div>
              </div>
            </div>
          </div>

          {/* Section: Nama Lengkap */}
          <div>
            <label
              htmlFor="fullName"
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 800,
                color: '#0f172a',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Nama Lengkap <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Masukkan nama lengkap Anda..."
              disabled={isSaving}
              style={{
                width: '100%',
                height: 46,
                padding: '0 14px',
                borderRadius: 8,
                border: '2px solid #0f172a',
                boxShadow: '3px 3px 0px #0f172a',
                fontSize: '0.92rem',
                fontWeight: 700,
                color: '#0f172a',
                outline: 'none',
                backgroundColor: '#ffffff',
              }}
            />
          </div>

          {/* Akun Terhubung Info */}
          {userEmail && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                backgroundColor: '#f1f5f9',
                borderRadius: 8,
                border: '1.5px solid #cbd5e1',
                fontSize: '0.78rem',
                color: '#334155',
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Terhubung dengan: <span style={{ fontWeight: 800 }}>{userEmail}</span>
              </div>
            </div>
          )}

          {/* Tombol Lanjut ke Pilih Paket */}
          <button
            type="submit"
            disabled={isSaving || !fullName.trim()}
            className="btn-uda btn-uda-primary"
            style={{
              width: '100%',
              height: 48,
              fontSize: '0.95rem',
              fontWeight: 900,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: '2.5px solid #0f172a',
              boxShadow: '4px 4px 0px #0f172a',
              borderRadius: 10,
              cursor: isSaving || !fullName.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              marginTop: 4,
            }}
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Menyimpan Profil...</span>
              </>
            ) : (
              <>
                <span>Lanjut: Pilih Paket Langganan</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
