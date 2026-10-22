'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Users, CheckCircle2, ShieldCheck, ArrowRight, Loader2, LogIn, Sparkles, Building } from 'lucide-react';
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
  const [inviteData, setInviteData] = useState<{
    brand_id: string;
    brand_name: string;
    brand_avatar?: string;
    role: string;
    inviter_name: string;
    target_email?: string;
  } | null>(null);

  useEffect(() => {
    // 1. Cari data undangan berdasarkan token atau query param
    const findInvite = async () => {
      setIsLoading(true);

      let found: any = null;

      // Cek di localStorage 'uda_brand_invitations'
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('uda_brand_invitations');
          if (raw) {
            const list = JSON.parse(raw);
            found = list.find((i: any) => i.id === token || i.token === token);
          }
        } catch {}
      }

      // Cek di Supabase database jika belum ketemu
      if (!found && supabase && token) {
        try {
          const { data: dbInv } = await (supabase.from('invitations' as any) as any)
            .select('*, brands(id, name, avatar_url)')
            .eq('token', token)
            .maybeSingle();

          if (dbInv) {
            found = {
              brand_id: dbInv.brand_id,
              brand_name: dbInv.brands?.name || 'Brand UdaPlanner',
              brand_avatar: dbInv.brands?.avatar_url,
              role: dbInv.role || 'editor',
              inviter_name: 'Pemilik Brand',
              target_email: dbInv.email,
            };
          }
        } catch {}
      }

      // Cek query params sebagai fallback tautan langsung WhatsApp
      const qBrandId = searchParams.get('brand');
      const qBrandName = searchParams.get('name') || searchParams.get('brand_name');
      const qRole = searchParams.get('role');
      const qInviter = searchParams.get('inviter');
      const qTarget = searchParams.get('target');

      if (!found && qBrandId) {
        found = {
          brand_id: qBrandId,
          brand_name: qBrandName || 'Brand Kolaborasi',
          role: qRole || 'editor',
          inviter_name: qInviter || 'Brand Owner',
          target_email: qTarget || undefined,
        };
      }

      if (found) {
        setInviteData(found);
      } else {
        // Fallback default info jika token custom
        setInviteData({
          brand_id: qBrandId || 'brand-default',
          brand_name: qBrandName || 'Brand Kolaborasi UdaPlanner',
          role: qRole || 'editor',
          inviter_name: qInviter || 'Brand Owner',
        });
      }

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
      await MemberService.addMember(inviteData.brand_id, currentUserId, finalRole as any);

      if (typeof window !== 'undefined') {
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

        if (!existingMembers.some((m) => m.email?.toLowerCase() === currentUserEmail.toLowerCase())) {
          existingMembers.push(newMember);
          localStorage.setItem(localKey, JSON.stringify(existingMembers));
        }

        // 2. Simpan status keanggotaan TIM
        const teamInfo = {
          brand_id: inviteData.brand_id,
          brand_name: inviteData.brand_name,
          role: finalRole,
          joined_at: new Date().toISOString(),
          inviter_name: inviteData.inviter_name,
        };
        localStorage.setItem('uda_team_membership_' + currentUserId, JSON.stringify(teamInfo));

        // 3. Update cache akun lokal & role sistem
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
              ? { ...inv, status: 'accepted', target_user_id: currentUserId }
              : inv
          );
          localStorage.setItem('uda_brand_invitations', JSON.stringify(updated));
        }
      }

      // 4. Update tabel accounts di Supabase menjadi paket 'team'
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
