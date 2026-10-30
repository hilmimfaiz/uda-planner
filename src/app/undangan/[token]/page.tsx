'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Users, CheckCircle2, ShieldCheck, ArrowRight, Loader2, LogIn, Sparkles, Building, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { MemberService } from '@/services/member.service';
import { createClient } from '@/lib/supabase/client';
import { playSuccessSound, playErrorSound } from '@/lib/audio-effects';
import Link from 'next/link';

export default function UndanganAnggotaPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, profile, refreshUserData } = useAuth();
  const supabase = createClient();

  const token = (params?.token as string) || '';

  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [inviteData, setInviteData] = useState<{
    id?: string;
    brand_id: string;
    brand_name: string;
    brand_avatar?: string;
    owner_id?: string;
    role: string;
    inviter_name: string;
    target_email?: string;
    expires_at?: string;
  } | null>(null);

  useEffect(() => {
    // 1. Cari data undangan berdasarkan token atau query param
    const findInvite = async () => {
      setIsLoading(true);

      let found: any = null;

      // Cek query params terlebih dahulu untuk prioritas data link yang dibagikan
      const qBrandId = searchParams.get('brand');
      const qBrandName = searchParams.get('name') || searchParams.get('brand_name');
      const qRole = searchParams.get('role');
      const qInviter = searchParams.get('inviter');
      const qAvatar = searchParams.get('avatar');
      const qOwnerId = searchParams.get('ownerId');
      const qTarget = searchParams.get('target');

      if (qBrandId && qBrandName) {
        found = {
          brand_id: qBrandId,
          brand_name: qBrandName,
          brand_avatar: qAvatar || undefined,
          owner_id: qOwnerId || undefined,
          role: qRole || 'editor',
          inviter_name: qInviter || 'Pemilik Brand',
          target_email: qTarget || undefined,
        };
      }

      // Cek di localStorage 'uda_brand_invitations'
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('uda_brand_invitations');
          if (raw) {
            const list = JSON.parse(raw);
            const match = list.find((i: any) => i.id === token || i.token === token);
            if (match) {
              found = {
                id: match.id,
                brand_id: match.brand_id || found?.brand_id,
                brand_name: match.brand_name || found?.brand_name || 'Brand',
                brand_avatar: match.brand_avatar || found?.brand_avatar,
                owner_id: match.owner_id || found?.owner_id,
                role: match.role || found?.role || 'editor',
                inviter_name: match.inviter_name || found?.inviter_name || 'Pemilik Brand',
                target_email: match.target_email || found?.target_email,
              };
            }
          }
        } catch {}
      }

      // Cek ke API /api/invitations (server file backup)
      if (token) {
        try {
          const res = await fetch(`/api/invitations?token=${token}`);
          const resJson = await res.json();
          if (resJson.success && resJson.invitations?.length > 0) {
            const match = resJson.invitations[0];
            found = {
              id: match.id,
              brand_id: match.brand_id || found?.brand_id,
              brand_name: match.brand_name || found?.brand_name || 'Brand',
              brand_avatar: match.brand_avatar || found?.brand_avatar,
              owner_id: match.owner_id || found?.owner_id,
              role: match.role || found?.role || 'editor',
              inviter_name: match.inviter_name || found?.inviter_name || 'Pemilik Brand',
              target_email: match.target_email || match.email || found?.target_email,
            };
          }
        } catch (err) {}
      }

      // Cek di Supabase database jika belum lengkap
      if (supabase && token) {
        try {
          const { data: dbInv } = await (supabase.from('invitations' as any) as any)
            .select('*, brands(id, name, avatar_url, owner_id)')
            .eq('token', token)
            .maybeSingle();

          if (dbInv) {
            found = {
              id: dbInv.id,
              brand_id: dbInv.brand_id,
              brand_name: dbInv.brands?.name || found?.brand_name || 'Brand UdaPlanner',
              brand_avatar: dbInv.brands?.avatar_url || found?.brand_avatar,
              owner_id: dbInv.brands?.owner_id || found?.owner_id,
              role: dbInv.role || found?.role || 'editor',
              inviter_name: 'Pemilik Brand',
              target_email: dbInv.email || found?.target_email,
            };
          }
        } catch {}
      }

      // Fallback query params jika belum ditemukan sebelumnya
      if (!found && qBrandId) {
        found = {
          brand_id: qBrandId,
          brand_name: qBrandName || 'Brand Kolaborasi',
          brand_avatar: qAvatar || undefined,
          owner_id: qOwnerId || undefined,
          role: qRole || 'editor',
          inviter_name: qInviter || 'Pemilik Brand',
          target_email: qTarget || undefined,
        };
      }

      // Cek apakah tautan telah kedaluwarsa (dibatasi 1 jam saja)
      const qExp = searchParams.get('exp');
      let linkIsExpired = false;

      if (qExp) {
        const expNum = Number(qExp);
        if (!isNaN(expNum) && Date.now() > expNum) {
          linkIsExpired = true;
        }
      }

      if (found?.expires_at) {
        const expDate = new Date(found.expires_at).getTime();
        if (!isNaN(expDate) && Date.now() > expDate) {
          linkIsExpired = true;
        }
      }

      setIsExpired(linkIsExpired);
      setInviteData(found);
      setIsLoading(false);
    };

    findInvite();
  }, [token, searchParams]);

  // Eksekusi Penerimaan Undangan & Otomatis Ubah Status Jadi TIM
  const handleAcceptInvite = async () => {
    if (!inviteData) return;
    setIsJoining(true);

    const currentUserId = user?.id || `usr-${Date.now()}`;
    const currentUserName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anggota Baru';
    const currentUserEmail = user?.email || inviteData.target_email || 'member@udaplanner.id';
    const finalRole = (inviteData.role || 'editor').toLowerCase();

    try {
      // 1. Tambahkan ke brand members (Supabase & LocalStorage)
      try {
        await MemberService.addMember(inviteData.brand_id, currentUserId, finalRole as any);
      } catch (errM) {}

      // 2. Simpan brand ke uda_custom_brands di localStorage penerima agar langsung muncul di workspace & daftar brand mereka
      if (typeof window !== 'undefined') {
        try {
          const rawBrands = localStorage.getItem('uda_custom_brands');
          let customBrands: any[] = [];
          if (rawBrands) customBrands = JSON.parse(rawBrands);

          const existingBrandIdx = customBrands.findIndex((b: any) => b.id === inviteData.brand_id);
          const brandRecord = {
            id: inviteData.brand_id,
            owner_id: inviteData.owner_id || 'brand-owner',
            name: inviteData.brand_name,
            handle: inviteData.brand_name.toLowerCase().replace(/[^a-z0-9]+/g, ''),
            platforms: ['instagram', 'tiktok', 'facebook'],
            color: '#16A34A',
            avatar_url:
              inviteData.brand_avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(inviteData.brand_name)}&background=16a34a&color=fff&bold=true`,
            require_approval: false,
            is_archived: false,
            post_count_this_month: 0,
          };

          if (existingBrandIdx >= 0) {
            customBrands[existingBrandIdx] = { ...customBrands[existingBrandIdx], ...brandRecord };
          } else {
            customBrands.unshift(brandRecord);
          }
          localStorage.setItem('uda_custom_brands', JSON.stringify(customBrands));

          // Set active brand ke brand yang baru saja diterima
          localStorage.setItem('uda_active_brand_id', inviteData.brand_id);
          localStorage.setItem('uda_active_brand_name', inviteData.brand_name);
        } catch (bErr) {}

        const localKey = 'uda_brand_members_' + inviteData.brand_id;
        let existingMembers: any[] = [];
        try {
          const rawM = localStorage.getItem(localKey);
          if (rawM) existingMembers = JSON.parse(rawM);
        } catch {}

        const newMember = {
          id: currentUserId,
          name: currentUserName,
          email: currentUserEmail,
          avatar:
            profile?.avatar_url ||
            localStorage.getItem('uda_custom_avatar_' + currentUserId) ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserName)}&background=16a34a&color=fff&bold=true`,
          role: finalRole,
        };

        const existingMemberIdx = existingMembers.findIndex(
          (m) => (m.id && m.id === currentUserId) || (m.email && m.email.toLowerCase() === currentUserEmail.toLowerCase())
        );
        if (existingMemberIdx >= 0) {
          existingMembers[existingMemberIdx] = { ...existingMembers[existingMemberIdx], ...newMember };
        } else {
          existingMembers.push(newMember);
        }
        localStorage.setItem(localKey, JSON.stringify(existingMembers));

        // 3. Simpan status keanggotaan TIM
        const teamInfo = {
          brand_id: inviteData.brand_id,
          brand_name: inviteData.brand_name,
          role: finalRole,
          joined_at: new Date().toISOString(),
          inviter_name: inviteData.inviter_name,
        };
        localStorage.setItem('uda_team_membership_' + currentUserId, JSON.stringify(teamInfo));

        // 4. Update cache akun lokal & role sistem
        const rawAcc = localStorage.getItem('uda_auth_account');
        let accObj: any = rawAcc ? JSON.parse(rawAcc) : {};
        accObj = {
          ...accObj,
          plan_code: 'team',
          role: 'user',
          team_member_brand_id: inviteData.brand_id,
          team_member_brand_name: inviteData.brand_name,
        };
        localStorage.setItem('uda_auth_account', JSON.stringify(accObj));

        const capitalizedRole = finalRole.charAt(0).toUpperCase() + finalRole.slice(1);
        localStorage.setItem('uda_system_role_' + currentUserId, capitalizedRole);

        localStorage.setItem(
          'uda_last_upgraded_user',
          JSON.stringify({
            userId: currentUserId,
            email: currentUserEmail,
            planCode: 'team',
            updatedAt: new Date().toISOString(),
          })
        );

        // Update status di uda_brand_invitations jika ada
        const rawInv = localStorage.getItem('uda_brand_invitations');
        if (rawInv) {
          const list = JSON.parse(rawInv);
          const updated = list.map((inv: any) =>
            inv.token === token || inv.id === token || (inv.brand_id === inviteData.brand_id && inv.target_email?.toLowerCase() === currentUserEmail.toLowerCase())
              ? { ...inv, status: 'accepted', target_user_id: currentUserId, target_email: currentUserEmail }
              : inv
          );
          localStorage.setItem('uda_brand_invitations', JSON.stringify(updated));
        }
      }

      // 5. Update backup di server via API PUT /api/invitations
      try {
        await fetch('/api/invitations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inviteId: inviteData.id || token,
            token,
            brandId: inviteData.brand_id,
            action: 'accept',
            userId: currentUserId,
            userEmail: currentUserEmail,
            userName: currentUserName,
            role: finalRole,
          }),
        });
      } catch (apiErr) {}

      // 6. Update tabel accounts di Supabase menjadi paket 'team'
      if (supabase && user?.id) {
        try {
          await (supabase.from('accounts' as any) as any)
            .update({
              plan_code: 'team',
              role: 'user',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);
        } catch (dbErr) {
          console.warn('Update accounts to team plan via invite link:', dbErr);
        }
      }

      // Dispatch event realtime
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('uda_account_updated', { detail: { planCode: 'team' } }));
        window.dispatchEvent(new CustomEvent('uda_brand_switched', { detail: { brandId: inviteData.brand_id } }));
        window.dispatchEvent(new Event('storage'));
      }

      if (refreshUserData) {
        await refreshUserData();
      }

      playSuccessSound();
      setAccepted(true);
    } catch (err: any) {
      playErrorSound();
      console.error('Accept invite error:', err);
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#16a34a' }} />
          <p style={{ fontWeight: 700 }}>Memuat informasi undangan tim...</p>
        </div>
      </div>
    );
  }

  if (!inviteData) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #f8fafc 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="uda-card" style={{ maxWidth: 460, width: '100%', padding: 36, textAlign: 'center', borderRadius: 20, border: '2.5px solid #0f172a', boxShadow: '8px 8px 0px #0f172a', backgroundColor: '#ffffff' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px solid #0f172a', boxShadow: '3px 3px 0px #0f172a' }}>
            <Building size={32} />
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginBottom: 10 }}>
            Tautan Undangan Tidak Valid
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>
            Tautan undangan ini tidak ditemukan, sudah kedaluwarsa, atau dibatalkan oleh pemilik brand. Silakan hubungi pemilik brand untuk meminta tautan undangan baru.
          </p>
          <Link href="/app" className="btn-uda btn-uda-primary" style={{ width: '100%', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 44, fontWeight: 800 }}>
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fef2f2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <div
          className="uda-card"
          style={{
            maxWidth: 480,
            width: '100%',
            padding: 36,
            textAlign: 'center',
            borderRadius: 20,
            border: '2.5px solid #0f172a',
            boxShadow: '8px 8px 0px #0f172a',
            backgroundColor: '#ffffff',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              border: '2px solid #0f172a',
              boxShadow: '3px 3px 0px #0f172a',
            }}
          >
            <Clock size={32} />
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '4px 12px',
              borderRadius: 999,
              marginBottom: 14,
              border: '1px solid #fca5a5',
            }}
          >
            <span>⏱️ TAUTAN KEDALUWARSA (BATAS 1 JAM)</span>
          </div>

          <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', marginBottom: 12 }}>
            Tautan Undangan Sudah Kedaluwarsa
          </h1>

          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>
            Tautan undangan untuk brand <strong>"{inviteData?.brand_name || 'Brand'}"</strong> telah melewati batas waktu berlaku (1 jam) dan otomatis dinonaktifkan demi keamanan. Silakan minta pemilik brand untuk membuat tautan undangan baru.
          </p>

          <Link
            href="/app"
            className="btn-uda btn-uda-primary"
            style={{
              width: '100%',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 46,
              fontWeight: 800,
            }}
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #f8fafc 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="uda-card"
        style={{
          maxWidth: 480,
          width: '100%',
          padding: 36,
          textAlign: 'center',
          borderRadius: 20,
          border: '2.5px solid #0f172a',
          boxShadow: '8px 8px 0px #0f172a',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Brand Icon / Logo */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: '#dcfce7',
            color: '#15803d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            border: '2px solid #0f172a',
            boxShadow: '3px 3px 0px #0f172a',
          }}
        >
          <Building size={32} />
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#f3e8ff',
            color: '#7e22ce',
            fontSize: '0.74rem',
            fontWeight: 800,
            padding: '4px 12px',
            borderRadius: 999,
            marginBottom: 14,
            border: '1px solid #d8b4fe',
          }}
        >
          <Sparkles size={13} />
          <span>UNDANGAN KOLABORASI RESMI</span>
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginBottom: 10, letterSpacing: '-0.02em' }}>
          Undangan Bergabung ke Brand
        </h1>

        <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: 24 }}>
          <strong>{inviteData?.inviter_name || 'Pemilik Brand'}</strong> mengundang Anda untuk bergabung ke brand{' '}
          <strong style={{ color: '#0f172a' }}>"{inviteData?.brand_name}"</strong> dengan peran{' '}
          <span
            style={{
              backgroundColor: '#dcfce7',
              color: '#15803d',
              padding: '2px 8px',
              borderRadius: 6,
              fontWeight: 800,
              textTransform: 'uppercase',
              fontSize: '0.8rem',
            }}
          >
            {inviteData?.role || 'Editor'}
          </span>
          .
        </p>

        {accepted ? (
          <div
            style={{
              background: '#f0fdf4',
              border: '2px solid #86efac',
              borderRadius: 14,
              padding: 20,
              marginBottom: 16,
              animation: 'fadeIn 0.3s ease-out',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#16a34a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px',
              }}
            >
              <CheckCircle2 size={28} />
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#15803d', marginBottom: 4 }}>
              Berhasil Bergabung!
            </div>
            <p style={{ fontSize: '0.84rem', color: '#166534', lineHeight: 1.5, margin: '0 0 16px' }}>
              Selamat! Anda kini resmi menjadi anggota brand <strong>"{inviteData?.brand_name}"</strong>. Status akun Anda otomatis aktif dengan paket <strong>TIM</strong>.
            </p>
            <button
              className="btn-uda btn-uda-primary"
              style={{ width: '100%', height: 46, fontSize: '0.92rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={() => {
                if (inviteData?.brand_id) {
                  router.push(`/app/brand/${inviteData.brand_id}`);
                } else {
                  router.push('/app');
                }
              }}
            >
              <span>Buka Workspace Brand Sekarang</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '12px 16px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}
              >
                {(user.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Masuk sebagai:</div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                backgroundColor: '#f5f3ff',
                border: '1px solid #ddd6fe',
                fontSize: '0.78rem',
                color: '#6b21a8',
                lineHeight: 1.5,
                textAlign: 'left',
              }}
            >
              ✨ <strong>Benefit Otomatis:</strong> Menerima undangan ini akan otomatis mengubah status langganan Anda menjadi <strong>Paket TIM</strong>.
            </div>

            <button
              type="button"
              className="btn-uda btn-uda-primary"
              disabled={isJoining}
              onClick={handleAcceptInvite}
              style={{
                width: '100%',
                height: 48,
                fontSize: '0.95rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {isJoining ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Sedang Bergabung...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Terima &amp; Gabung Jadi Anggota TIM</span>
                </>
              )}
            </button>

            <Link
              href="/app"
              style={{ fontSize: '0.82rem', color: '#64748b', textDecoration: 'none', fontWeight: 600, marginTop: 4 }}
            >
              Kembali ke Beranda
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: '0.82rem',
                color: '#92400e',
                lineHeight: 1.5,
                textAlign: 'left',
              }}
            >
              Silakan <strong>Masuk</strong> atau <strong>Daftar Akun</strong> (Google atau Email) untuk otomatis bergabung ke brand ini dan menikmati status paket TIM.
            </div>

            <Link
              href={`/masuk?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '')}`}
              className="btn-uda btn-uda-primary"
              style={{
                width: '100%',
                height: 46,
                fontSize: '0.92rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                textDecoration: 'none',
              }}
            >
              <LogIn size={18} />
              <span>Masuk / Login Akun</span>
            </Link>

            <Link
              href={`/daftar?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '')}`}
              className="btn-uda btn-uda-secondary"
              style={{
                width: '100%',
                height: 44,
                fontSize: '0.9rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                textDecoration: 'none',
              }}
            >
              <span>Daftar Akun Baru</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
