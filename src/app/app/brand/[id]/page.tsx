'use client';

import React, { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Layers,
  Settings,
  ShieldCheck,
  Share2,
  Copy,
  Trash2,
  Plus,
  Check,
  Camera,
  Upload,
  Loader2,
  X,
  Lock,
  Clock,
  Sparkles,
  Phone,
  MessageCircle,
  AlertCircle,
  Link2,
  Edit3,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { DUMMY_BRANDS, DUMMY_PILLARS, DUMMY_MEMBERS, DummyBrand, DummyMember } from '@/lib/dummy-data';
import { initialProfiles } from '@/lib/supabase/mock-data';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { uploadBrandLogo } from '@/lib/image-upload';
import { BrandService } from '@/services/brand.service';
import { ContentPillarService } from '@/services/content-pillar.service';
import { MemberService } from '@/services/member.service';
import { useModal } from '@/contexts/modal-context';
import { getSiteUrl } from '@/lib/site-url';
import { playSuccessSound, playErrorSound, playNotificationSound } from '@/lib/audio-effects';
import { addAppNotification } from '@/lib/notification-manager';

const isGenericStockPhoto = (url?: string | null) =>
  !url || url.includes('photo-1534528741775-53994a69daeb');

const getSyncedAvatar = (
  name: string,
  email: string,
  explicitAvatar?: string | null,
  userId?: string
) => {
  if (explicitAvatar && !isGenericStockPhoto(explicitAvatar)) {
    return explicitAvatar;
  }
  if (typeof window !== 'undefined' && userId) {
    const local = localStorage.getItem('uda_custom_avatar_' + userId);
    if (local && !isGenericStockPhoto(local)) return local;
  }
  const cleanName = (name || '').trim() || (email || '').split('@')[0] || 'User';
  const cleanEmail = (email || '').trim().toLowerCase();
  const colors = ['16a34a', '2563eb', '7c3aed', 'ea580c', '0891b2', 'd97706', 'dc2626'];
  const hash = (cleanName + cleanEmail).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = colors[hash % colors.length];
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=${color}&color=ffffff&bold=true&size=128`;
};

export default function PengaturanBrandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, account } = useAuth();
  const { confirmDelete, showSuccess, showError } = useModal();
  const supabase = createClient();
  const brandId = (params?.id as string) || 'brand-1';
  const isTeamPlan = account?.plan_code === 'team';

  const fallbackBrand: DummyBrand = {
    id: brandId,
    owner_id: user?.id || '',
    name: 'Brand',
    handle: 'brand',
    platforms: ['instagram', 'tiktok'],
    color: '#16a34a',
    avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
    require_approval: false,
    is_archived: false,
    post_count_this_month: 0,
  };

  const [currentBrand, setCurrentBrand] = useState<DummyBrand>(
    DUMMY_BRANDS.find((b) => b.id === brandId) || fallbackBrand
  );
  const brand = currentBrand;

  const [activeTab, setActiveTab] = useState<'profil' | 'pilar' | 'anggota' | 'pengaturan'>('profil');
  const [pillars, setPillars] = useState(DUMMY_PILLARS.filter((p) => p.brand_id === brand.id));
  const [members, setMembers] = useState<DummyMember[]>(DUMMY_MEMBERS);
  const [requireApproval, setRequireApproval] = useState(brand.require_approval);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Platform state
  const [brandPlatforms, setBrandPlatforms] = useState<string[]>(brand.platforms || ['instagram', 'tiktok']);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(brand.platforms || ['instagram', 'tiktok']);
  const [platformInput, setPlatformInput] = useState('');

  // Brand Profile Edit States
  const [brandName, setBrandName] = useState(brand.name);
  const [brandHandle, setBrandHandle] = useState(brand.handle);
  const [brandColor, setBrandColor] = useState(brand.color);
  const [brandAvatarUrl, setBrandAvatarUrl] = useState(brand.avatar_url);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User Search & Invite Modal States
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'reviewer' | 'viewer'>('editor');
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [searchedUser, setSearchedUser] = useState<{
    id: string;
    name: string;
    email: string;
    avatar: string;
    phone?: string | null;
    isGoogleUser?: boolean;
    systemRole?: string;
  } | null>(null);
  const [inviteWaPhone, setInviteWaPhone] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [isSendingInvite, setIsSendingInvite] = useState<boolean>(false);

  // Dedicated Copy Link Modal States
  const [showCopyLinkModal, setShowCopyLinkModal] = useState<boolean>(false);
  const [copyLinkRole, setCopyLinkRole] = useState<'editor' | 'reviewer' | 'viewer'>('editor');
  const [copyLinkToken, setCopyLinkToken] = useState<string>('');
  const [isCopyLinkCopied, setIsCopyLinkCopied] = useState<boolean>(false);
  const [showCopySuccessModal, setShowCopySuccessModal] = useState<boolean>(false);
  const [copiedLinkInfo, setCopiedLinkInfo] = useState<{ url: string; role: string; expiresAtTime: string } | null>(null);

  const [userRole, setUserRole] = useState<'owner' | 'editor' | 'reviewer' | 'viewer' | null>(null);
  const [isAccessDenied, setIsAccessDenied] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [brandOwner, setBrandOwner] = useState<{
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    planCode?: string;
  } | null>(null);

  React.useEffect(() => {
    setIsLoadingAuth(true);
    BrandService.getUserBrandRole(brandId, user?.id).then((role) => {
      setUserRole(role);
      if (!role) {
        setIsAccessDenied(true);
      }
      setIsLoadingAuth(false);
    });

    BrandService.getBrandById(brandId, user?.id).then((b) => {
      if (b) {
        setCurrentBrand(b);
        setBrandName(b.name);
        setBrandHandle(b.handle);
        setBrandColor(b.color);
        setBrandAvatarUrl(b.avatar_url);
        setRequireApproval(b.require_approval);
        setBrandPlatforms(b.platforms && b.platforms.length > 0 ? b.platforms : ['instagram', 'tiktok']);
        setSelectedPlatforms(b.platforms && b.platforms.length > 0 ? b.platforms : ['instagram', 'tiktok']);

        // Ambil data profil dan paket dari pembuat/pemilik asli brand
        const creatorId = b.owner_id;
        if (creatorId) {
          if (user && user.id === creatorId) {
            setBrandOwner({
              id: user.id,
              name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Pemilik Brand',
              email: user.email || '',
              avatar: user.user_metadata?.avatar_url,
              planCode: account?.plan_code || 'free',
            });
          } else if (supabase) {
            Promise.all([
              (supabase.from('profiles' as any) as any).select('id, full_name, email, avatar_url').eq('id', creatorId).maybeSingle(),
              (supabase.from('accounts' as any) as any).select('plan_code').eq('user_id', creatorId).maybeSingle(),
            ]).then(([profRes, accRes]) => {
              if (profRes.data) {
                setBrandOwner({
                  id: profRes.data.id,
                  name: profRes.data.full_name || 'Pemilik Brand',
                  email: profRes.data.email || '',
                  avatar: profRes.data.avatar_url,
                  planCode: accRes.data?.plan_code || 'free',
                });
              }
            }).catch(() => {});
          }
        }
      }
    });

    ContentPillarService.getPillars(brandId, user?.id).then((pils) => {
      if (pils) setPillars(pils);
    });

    const loadBrandMembers = async () => {
      try {
        let profilesMap = new Map<string, any>();
        if (supabase) {
          try {
            const { data: profs } = await (supabase.from('profiles' as any) as any)
              .select('id, email, full_name, avatar_url');
            if (profs) {
              profs.forEach((p: any) => {
                if (p.email) profilesMap.set(p.email.toLowerCase().trim(), p);
                if (p.id) profilesMap.set(p.id, p);
              });
            }
          } catch (e) {}
        }

        let rawMembers: any[] = [];
        const mems = await MemberService.getBrandMembers(brandId);
        if (mems && mems.length > 0) {
          rawMembers = mems.map((m) => ({
            id: m.user_id,
            name: m.profile?.full_name || 'Anggota Tim',
            email: m.profile?.email || 'member@udaplanner.id',
            avatar: m.profile?.avatar_url,
            role: m.role as any,
          }));
        } else {
          const storedLocal = localStorage.getItem('uda_brand_members_' + brandId);
          if (storedLocal) {
            rawMembers = JSON.parse(storedLocal);
          }
        }

        // Pastikan pemilik asli brand selalu ada di list
        const hasOwner = rawMembers.some((m) => m.role === 'owner');
        if (!hasOwner && currentBrand?.owner_id) {
          const ownerProf = profilesMap.get(currentBrand.owner_id);
          if (ownerProf) {
            rawMembers.unshift({
              id: ownerProf.id,
              name: ownerProf.full_name || 'Pemilik Brand',
              email: ownerProf.email || '',
              avatar: ownerProf.avatar_url,
              role: 'owner',
            });
          }
        }

        const syncedMembers = rawMembers.map((m: any) => {
          const cleanEm = (m.email || '').toLowerCase().trim();
          const prof = profilesMap.get(m.id) || (cleanEm && profilesMap.get(cleanEm));
          const syncedAvatar = getSyncedAvatar(
            prof?.full_name || m.name,
            cleanEm,
            prof?.avatar_url || (isGenericStockPhoto(m.avatar) ? null : m.avatar),
            prof?.id || m.id
          );
          return {
            ...m,
            name: prof?.full_name || m.name,
            avatar: syncedAvatar,
          };
        });

        setMembers(syncedMembers);
      } catch {}
    };

    const loadBrandInvites = async () => {
      try {
        let profilesMap = new Map<string, any>();
        if (supabase) {
          try {
            const { data: profs } = await (supabase.from('profiles' as any) as any)
              .select('id, email, full_name, avatar_url');
            if (profs) {
              profs.forEach((p: any) => {
                if (p.email) profilesMap.set(p.email.toLowerCase().trim(), p);
              });
            }
          } catch (e) {}
        }

        let allList: any[] = [];
        try {
          const res = await fetch(`/api/invitations?brandId=${brandId}`);
          if (res.ok) {
            const resData = await res.json();
            if (resData.success && Array.isArray(resData.invitations)) {
              allList = resData.invitations;
            }
          }
        } catch {}

        const raw = localStorage.getItem('uda_brand_invitations');
        if (raw) {
          const list = JSON.parse(raw);
          list.forEach((loc: any) => {
            if (!allList.some((s) => s.id === loc.id || (s.brand_id === loc.brand_id && (s.target_email || s.email)?.toLowerCase() === (loc.target_email || loc.email)?.toLowerCase()))) {
              allList.push(loc);
            }
          });
        }

        const mapped = allList.map((inv: any) => {
          const cleanEm = (inv.target_email || inv.email || '').toLowerCase().trim();
          const prof = profilesMap.get(cleanEm);
          const syncedAvatar = getSyncedAvatar(
            prof?.full_name || inv.target_name,
            cleanEm,
            prof?.avatar_url || (isGenericStockPhoto(inv.target_avatar) ? null : inv.target_avatar),
            prof?.id
          );
          return {
            ...inv,
            target_name: prof?.full_name || inv.target_name || cleanEm.split('@')[0],
            target_avatar: syncedAvatar,
          };
        });
        localStorage.setItem('uda_brand_invitations', JSON.stringify(mapped));
        setPendingInvites(mapped.filter((inv: any) =>
          inv.brand_id === brandId &&
          inv.status === 'pending' &&
          !inv.is_link_invite &&
          Boolean(inv.target_email || inv.email) &&
          (inv.target_email || inv.email).trim() !== '' &&
          inv.target_name !== 'Penerima Tautan'
        ));
      } catch {}
    };

    loadBrandMembers();
    loadBrandInvites();

    window.addEventListener('uda_brand_member_added', loadBrandMembers);
    window.addEventListener('uda_notification_added', loadBrandInvites);
    window.addEventListener('storage', () => {
      loadBrandMembers();
      loadBrandInvites();
    });

    return () => {
      window.removeEventListener('uda_brand_member_added', loadBrandMembers);
      window.removeEventListener('uda_notification_added', loadBrandInvites);
    };
  }, [brandId]);



  // Delete Brand confirmation state
  const [deleteInputName, setDeleteInputName] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const uploadedUrl = await uploadBrandLogo(supabase, file, brand.id);
      setBrandAvatarUrl(uploadedUrl);
      await BrandService.updateBrand(brand.id, { avatar_url: uploadedUrl });
      showToast('✅ Foto logo brand berhasil diunggah!');
    } catch (err: any) {
      showToast('❌ Gagal mengunggah foto: ' + (err.message || 'Coba lagi'));
    } finally {
      setIsUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSearchUser = async (emailToSearch: string) => {
    const cleanEmail = emailToSearch.trim().toLowerCase();
    if (!cleanEmail) {
      setSearchError('Silakan masukkan alamat email atau nomor kontak pengguna.');
      return;
    }

    setIsSearchingUser(true);
    setSearchError(null);
    setSearchedUser(null);

    try {
      // 1. Cek via API /api/users/search (mencakup Auth Admin, akun Google OAuth, Email Biasa, & Database Profiles)
      try {
        const res = await fetch(`/api/users/search?query=${encodeURIComponent(cleanEmail)}`);
        const result = await res.json();
        if (result.success && result.found && result.user) {
          const u = result.user;
          const userPhone = u.phone || (typeof window !== 'undefined' ? localStorage.getItem('uda_custom_phone_' + u.id) : '') || '';
          const syncedAvatar = getSyncedAvatar(u.name, u.email, u.avatar, u.id);
          setSearchedUser({
            id: u.id,
            name: u.name || 'Pengguna Terdaftar',
            email: u.email,
            avatar: syncedAvatar,
            phone: userPhone,
            isGoogleUser: !!u.isGoogleUser,
            systemRole: u.systemRole || 'user',
          });
          setInviteWaPhone(userPhone);
          playSuccessSound();
          return;
        }
      } catch (apiErr) {
        console.warn('API user search notice:', apiErr);
      }

      // 2. Cek Supabase profiles langsung (fallback)
      if (supabase) {
        try {
          const { data, error } = await (supabase.from('profiles' as any) as any)
            .select('id, full_name, email, avatar_url, phone, role')
            .eq('email', cleanEmail)
            .maybeSingle();

          if (!error && data) {
            const d = data as any;
            const userPhone = d.phone || (typeof window !== 'undefined' ? localStorage.getItem('uda_custom_phone_' + d.id) : '') || '';
            const syncedAvatar = getSyncedAvatar(d.full_name, d.email, d.avatar_url, d.id);
            const isGoogle = cleanEmail.endsWith('@gmail.com');
            setSearchedUser({
              id: d.id,
              name: d.full_name || 'Pengguna Terdaftar',
              email: d.email,
              avatar: syncedAvatar,
              phone: userPhone,
              isGoogleUser: isGoogle,
              systemRole: d.role || 'user',
            });
            setInviteWaPhone(userPhone);
            playSuccessSound();
            return;
          }
        } catch (err) {
          console.warn('Supabase profile search notice:', err);
        }
      }

      // 3. Cek local users dari localStorage 'uda_admin_users'
      if (typeof window !== 'undefined') {
        try {
          const rawAdminUsers = localStorage.getItem('uda_admin_users');
          if (rawAdminUsers) {
            const list = JSON.parse(rawAdminUsers);
            const found = list.find((u: any) => u.email?.toLowerCase() === cleanEmail);
            if (found) {
              const uId = found.id || found.userId || `usr-${Date.now()}`;
              const userPhone = found.phone || localStorage.getItem('uda_custom_phone_' + uId) || '';
              const syncedAvatar = getSyncedAvatar(
                found.name,
                found.email,
                found.avatarUrl || found.avatar,
                uId
              );
              setSearchedUser({
                id: uId,
                name: found.name,
                email: found.email,
                avatar: syncedAvatar,
                phone: userPhone,
                isGoogleUser: cleanEmail.endsWith('@gmail.com'),
                systemRole: found.role || 'user',
              });
              setInviteWaPhone(userPhone);
              playSuccessSound();
              return;
            }
          }
        } catch {}
      }

      // 4. Cek initialProfiles
      const foundInitial = initialProfiles.find((p) => p.email?.toLowerCase() === cleanEmail);
      if (foundInitial) {
        const userPhone = (foundInitial as any).phone || (typeof window !== 'undefined' ? localStorage.getItem('uda_custom_phone_' + foundInitial.id) : '') || '';
        const syncedAvatar = getSyncedAvatar(
          foundInitial.full_name,
          foundInitial.email,
          foundInitial.avatar_url,
          foundInitial.id
        );
        setSearchedUser({
          id: foundInitial.id,
          name: foundInitial.full_name || 'Pengguna Terdaftar',
          email: foundInitial.email,
          avatar: syncedAvatar,
          phone: userPhone,
          isGoogleUser: cleanEmail.endsWith('@gmail.com'),
          systemRole: foundInitial.role || 'user',
        });
        setInviteWaPhone(userPhone);
        playSuccessSound();
        return;
      }

      // 5. Cek DUMMY_MEMBERS
      const foundDummy = DUMMY_MEMBERS.find((m) => m.email?.toLowerCase() === cleanEmail);
      if (foundDummy) {
        const syncedAvatar = getSyncedAvatar(foundDummy.name, foundDummy.email, foundDummy.avatar, foundDummy.id);
        setSearchedUser({
          id: foundDummy.id,
          name: foundDummy.name,
          email: foundDummy.email,
          avatar: syncedAvatar,
          phone: '',
          isGoogleUser: cleanEmail.endsWith('@gmail.com'),
          systemRole: 'user',
        });
        setInviteWaPhone('');
        playSuccessSound();
        return;
      }

      // Jika tidak ditemukan
      setSearchError(`Email atau kontak "${emailToSearch}" belum terdaftar di sistem. Pastikan calon anggota telah membuat akun di Uda-Planner.`);
      playErrorSound();
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handleSendWhatsAppInvite = () => {
    if (!searchedUser) return;
    const token = Math.random().toString(36).substring(2, 12);
    const siteUrl = getSiteUrl();
    const inviterName = user?.user_metadata?.full_name || user?.email || 'Owner';
    const joinUrl = `${siteUrl}/undangan/${token}?brand=${brand.id}&name=${encodeURIComponent(brand.name)}&role=${inviteRole}&inviter=${encodeURIComponent(inviterName)}&target=${encodeURIComponent(searchedUser.email)}`;

    const newInvite = {
      id: token,
      token: token,
      brand_id: brand.id,
      brand_name: brand.name,
      brand_avatar: brand.avatar_url,
      target_email: searchedUser.email.toLowerCase(),
      target_user_id: searchedUser.id,
      target_name: searchedUser.name,
      target_avatar: searchedUser.avatar,
      role: inviteRole,
      inviter_name: inviterName,
      inviter_email: user?.email || '',
      status: 'pending' as const,
      created_at: new Date().toISOString(),
    };

    try {
      const raw = localStorage.getItem('uda_brand_invitations');
      const allInvites = raw ? JSON.parse(raw) : [];
      const updated = [newInvite, ...allInvites.filter((i: any) => !(i.brand_id === brand.id && i.target_email === newInvite.target_email))];
      localStorage.setItem('uda_brand_invitations', JSON.stringify(updated));
      setPendingInvites(updated.filter((i: any) =>
        i.brand_id === brand.id &&
        i.status === 'pending' &&
        !i.is_link_invite &&
        Boolean(i.target_email || i.email) &&
        (i.target_email || i.email).trim() !== '' &&
        i.target_name !== 'Penerima Tautan'
      ));
    } catch {}

    const rawPhone = inviteWaPhone || searchedUser.phone || '';
    let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    const message = `Halo ${searchedUser.name}! 🚀\n\nAnda diundang oleh *${inviterName}* untuk bergabung ke brand *${brand.name}* sebagai *${inviteRole.toUpperCase()}* di UdaPlanner.\n\nKlik tautan berikut untuk konfirmasi dan otomatis bergabung ke brand:\n${joinUrl}\n\nSetelah bergabung, paket akun Anda akan otomatis berstatus TIM. Terima kasih!`;

    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
    playSuccessSound();
    showToast('✅ Tautan undangan WhatsApp berhasil dibuka!');
  };

  const handleCopyInviteLink = () => {
    if (!searchedUser) return;
    const token = Math.random().toString(36).substring(2, 12);
    const siteUrl = getSiteUrl();
    const inviterName = user?.user_metadata?.full_name || user?.email || 'Owner';
    const joinUrl = `${siteUrl}/undangan/${token}?brand=${brand.id}&name=${encodeURIComponent(brand.name)}&role=${inviteRole}&inviter=${encodeURIComponent(inviterName)}&target=${encodeURIComponent(searchedUser.email)}`;

    navigator.clipboard.writeText(joinUrl);
    playSuccessSound();
    showToast('📋 Link undangan berhasil disalin!');
  };

  const handleSendInvite = async () => {
    if (!searchedUser || isSendingInvite) return;

    const nonOwnerMembers = members.filter((m) => m.role !== 'owner');
    if (nonOwnerMembers.length >= 10) {
      showError(
        'Batas Anggota Penuh (Maks. 10)',
        'Maksimal anggota tim kolaborator untuk Paket Tim adalah 10 orang (1 Owner + 10 Anggota Kolaborator). Silakan hapus anggota yang sudah tidak aktif untuk menambah anggota baru.'
      );
      playErrorSound();
      return;
    }

    if (members.some((m) => m.email.toLowerCase() === searchedUser.email.toLowerCase())) {
      showError('Sudah Menjadi Anggota', `User "${searchedUser.name}" (${searchedUser.email}) sudah terdaftar aktif dalam brand ini.`);
      playErrorSound();
      return;
    }

    if (pendingInvites.some((inv) => (inv.target_email || inv.email)?.toLowerCase() === searchedUser.email.toLowerCase())) {
      showError('Undangan Sudah Terkirim', `Undangan untuk "${searchedUser.name}" (${searchedUser.email}) sudah pernah dikirimkan dan saat ini menunggu konfirmasi dari calon anggota.`);
      playErrorSound();
      return;
    }

    setIsSendingInvite(true);

    try {
      const inviterName = user?.user_metadata?.full_name || user?.email || 'Owner';
      const inviterEmail = user?.email || '';

      // 1. Kirim ke Server API Realtime (/api/invitations)
      let serverInvite: any = null;
      try {
        const res = await fetch('/api/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandId: brand.id,
            brandName: brand.name,
            brandAvatar: brand.avatar_url,
            targetEmail: searchedUser.email.toLowerCase(),
            targetUserId: searchedUser.id,
            targetName: searchedUser.name,
            targetAvatar: searchedUser.avatar,
            role: inviteRole,
            inviterId: user?.id,
            inviterName,
            inviterEmail,
          }),
        });
        const resData = await res.json();
        if (!res.ok || !resData.success) {
          showError('Gagal Mengirim Undangan', resData.error || 'Tidak dapat mengirim undangan ke pengguna ini.');
          playErrorSound();
          setIsSendingInvite(false);
          return;
        }
        if (resData.success && resData.invitation) {
          serverInvite = resData.invitation;
        }
      } catch (apiErr: any) {
        showError('Gagal Mengirim Undangan', apiErr.message || 'Terjadi kesalahan koneksi.');
        playErrorSound();
        setIsSendingInvite(false);
        return;
      }

      const newInvite = serverInvite || {
        id: `inv-${Date.now()}`,
        brand_id: brand.id,
        brand_name: brand.name,
        brand_avatar: brand.avatar_url,
        target_email: searchedUser.email.toLowerCase(),
        target_user_id: searchedUser.id,
        target_name: searchedUser.name,
        target_avatar: searchedUser.avatar,
        role: inviteRole,
        inviter_name: inviterName,
        inviter_email: inviterEmail,
        status: 'pending' as const,
        created_at: new Date().toISOString(),
      };

      // 2. Simpan di localStorage 'uda_brand_invitations'
      let allInvites: any[] = [];
      try {
        const raw = localStorage.getItem('uda_brand_invitations');
        if (raw) allInvites = JSON.parse(raw);
      } catch {}
      const updatedAll = [newInvite, ...allInvites.filter((i: any) => !(i.brand_id === brand.id && (i.target_email || i.email)?.toLowerCase() === newInvite.target_email))];
      localStorage.setItem('uda_brand_invitations', JSON.stringify(updatedAll));
      setPendingInvites(updatedAll.filter((i: any) =>
        i.brand_id === brand.id &&
        i.status === 'pending' &&
        !i.is_link_invite &&
        Boolean(i.target_email || i.email) &&
        (i.target_email || i.email).trim() !== '' &&
        i.target_name !== 'Penerima Tautan'
      ));

      // 3. Dispatch realtime notifikasi di client
      addAppNotification({
        type: 'team_invite',
        title: `Undangan Bergabung ke Brand ${brand.name}`,
        message: `${newInvite.inviter_name} mengundang Anda bergabung ke brand "${brand.name}" sebagai ${inviteRole.toUpperCase()}. Silakan konfirmasi terima atau tolak undangan ini.`,
        link: '/app/notifikasi',
        playSound: false,
        target_email: searchedUser.email.toLowerCase(),
        target_user_id: searchedUser.id,
        invite_data: {
          invite_id: newInvite.id,
          brand_id: brand.id,
          brand_name: brand.name,
          brand_avatar: brand.avatar_url,
          role: inviteRole,
          inviter_name: newInvite.inviter_name,
          inviter_email: newInvite.inviter_email,
          target_email: searchedUser.email.toLowerCase(),
          target_user_id: searchedUser.id,
          target_name: searchedUser.name,
          status: 'pending',
          created_at: newInvite.created_at,
        },
      });

      playSuccessSound();
      showSuccess(
        'Undangan Realtime Berhasil Dikirim!',
        `Undangan realtime telah berhasil dikirim ke akun "${searchedUser.name}" (${searchedUser.email}) dengan peran ${inviteRole.toUpperCase()}.\n\nPengguna akan langsung menerima pemberitahuan undangan di lonceng notifikasi akun UdaPlanner mereka secara realtime.`
      );

      setShowInviteModal(false);
      setInviteEmail('');
      setSearchedUser(null);
      setSearchError(null);
    } catch (err: any) {
      playErrorSound();
      showError('Gagal Mengirim Undangan', err.message || 'Terjadi kesalahan sistem saat mengirim undangan.');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCancelInvite = (inviteId: string, targetName: string) => {
    confirmDelete({
      title: 'Batalkan Undangan?',
      message: `Apakah Anda yakin ingin membatalkan undangan untuk "${targetName}"?`,
      confirmText: 'Ya, Batalkan Undangan',
      onConfirm: async () => {
        try {
          fetch('/api/invitations', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inviteId,
              brandId: brand.id,
              action: 'reject',
            }),
          }).catch(() => {});

          const raw = localStorage.getItem('uda_brand_invitations');
          if (raw) {
            const list = JSON.parse(raw);
            const filtered = list.filter((inv: any) => inv.id !== inviteId);
            localStorage.setItem('uda_brand_invitations', JSON.stringify(filtered));
            setPendingInvites(filtered.filter((inv: any) =>
              inv.brand_id === brand.id &&
              inv.status === 'pending' &&
              !inv.is_link_invite &&
              Boolean(inv.target_email || inv.email) &&
              (inv.target_email || inv.email).trim() !== '' &&
              inv.target_name !== 'Penerima Tautan'
            ));
          }
          playSuccessSound();
          showToast(`Undangan untuk ${targetName} berhasil dibatalkan`);
        } catch {}
      },
    });
  };

  const openCopyLinkModal = (initialRole: 'editor' | 'reviewer' | 'viewer' = 'editor') => {
    const newToken = Math.random().toString(36).substring(2, 12);
    setCopyLinkRole(initialRole);
    setCopyLinkToken(newToken);
    setIsCopyLinkCopied(false);
    setShowCopyLinkModal(true);
  };

  const getCopyInviteUrl = (role: 'editor' | 'reviewer' | 'viewer', tokenVal: string, expTimeMs?: number) => {
    const siteUrl = getSiteUrl();
    const inviterName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Owner';
    const exp = expTimeMs || (Date.now() + 60 * 60 * 1000);
    return `${siteUrl}/undangan/${tokenVal}?brand=${brand.id}&name=${encodeURIComponent(brand.name)}&role=${role}&inviter=${encodeURIComponent(inviterName)}&exp=${exp}`;
  };

  const handleCopyLinkExecute = async () => {
    const currentToken = copyLinkToken || Math.random().toString(36).substring(2, 12);
    if (!copyLinkToken) setCopyLinkToken(currentToken);

    const expTime = Date.now() + 60 * 60 * 1000;
    const expiresAtIso = new Date(expTime).toISOString();
    const expiryTimeString = new Date(expTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const joinUrl = getCopyInviteUrl(copyLinkRole, currentToken, expTime);
    const inviterName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Owner';

    try {
      await navigator.clipboard.writeText(joinUrl);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = joinUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    setIsCopyLinkCopied(true);
    playSuccessSound();

    const roleName = copyLinkRole === 'editor' ? 'Editor' : copyLinkRole === 'reviewer' ? 'Reviewer' : 'Viewer';
    showToast(`📋 Link undangan ${roleName} untuk brand "${brand.name}" berhasil disalin!`);

    const newInvite = {
      id: currentToken,
      token: currentToken,
      brand_id: brand.id,
      brand_name: brand.name,
      brand_avatar: brand.avatar_url,
      owner_id: brand.owner_id || user?.id,
      target_email: '',
      target_name: 'Penerima Tautan',
      role: copyLinkRole,
      inviter_name: inviterName,
      inviter_email: user?.email || '',
      is_link_invite: true,
      status: 'pending' as const,
      created_at: new Date().toISOString(),
      expires_at: expiresAtIso,
    };

    try {
      const raw = localStorage.getItem('uda_brand_invitations');
      const allInvites = raw ? JSON.parse(raw) : [];
      const updated = [newInvite, ...allInvites.filter((i: any) => i.token !== currentToken)];
      localStorage.setItem('uda_brand_invitations', JSON.stringify(updated));
    } catch {}

    try {
      fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: brand.id,
          brandName: brand.name,
          brandAvatar: brand.avatar_url,
          role: copyLinkRole,
          token: currentToken,
          inviterId: user?.id,
          inviterName,
          inviterEmail: user?.email,
          isLinkInvite: true,
          expiresAt: expiresAtIso,
        }),
      }).catch(() => {});
    } catch {}

    // Buka pop-up pesan tautan telah disalin dengan info batas durasi 1 jam
    setCopiedLinkInfo({
      url: joinUrl,
      role: copyLinkRole,
      expiresAtTime: expiryTimeString,
    });
    setShowCopyLinkModal(false);
    setShowCopySuccessModal(true);
  };

  const handleShareLinkWhatsApp = () => {
    const currentToken = copyLinkToken || Math.random().toString(36).substring(2, 12);
    if (!copyLinkToken) setCopyLinkToken(currentToken);

    const joinUrl = getCopyInviteUrl(copyLinkRole, currentToken);
    const inviterName = user?.user_metadata?.full_name || user?.email || 'Owner';
    const roleName = copyLinkRole === 'editor' ? 'Editor' : copyLinkRole === 'reviewer' ? 'Reviewer' : 'Viewer';

    const message = `Halo! 🚀\n\nAnda diundang oleh *${inviterName}* untuk bergabung ke brand *${brand.name}* sebagai *${roleName.toUpperCase()}* di UdaPlanner.\n\nKlik tautan berikut untuk konfirmasi dan otomatis bergabung ke brand:\n${joinUrl}\n\nSetelah bergabung, paket akun Anda akan otomatis aktif dalam tim brand ${brand.name}. Terima kasih!`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    playSuccessSound();
    showToast('✅ Tautan undangan WhatsApp berhasil dibuka!');
  };

  const handleGenerateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    openCopyLinkModal(inviteRole);
  };

  if (isLoadingAuth) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 10, color: '#64748b' }}>
        <Loader2 className="animate-spin" size={24} style={{ color: '#16a34a' }} />
        <span style={{ fontWeight: 600 }}>Memverifikasi hak akses brand...</span>
      </div>
    );
  }

  if (isAccessDenied) {
    return (
      <div className="uda-card" style={{ maxWidth: 540, margin: '60px auto', padding: '40px 32px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Lock size={32} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
          Akses Ditolak
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 24 }}>
          Anda tidak memiliki hak akses ke brand ini. Brand ini dimiliki oleh akun lain dan Anda tidak terdaftar sebagai anggota tim kolaborator.
        </p>
        <button className="btn-uda btn-uda-primary" onClick={() => router.push('/app/brand')}>
          Kembali ke Daftar Brand
        </button>
      </div>
    );
  }

  const isBrandOwner = userRole === 'owner';
  const ownerFromMembers = members.find((m) => m.role === 'owner');
  const effectiveOwner =
    ownerFromMembers ||
    brandOwner ||
    (isBrandOwner && user
      ? {
          id: user.id,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Pemilik Brand',
          email: user.email || '',
          avatar: user.user_metadata?.avatar_url,
          role: 'owner' as const,
        }
      : null);

  const isBrandOwnerTeamPlan = (brandOwner?.planCode || (isBrandOwner ? account?.plan_code : null)) === 'team';
  const hasCollaborators = members.filter((m) => m.role !== 'owner').length > 0;
  // Pengguna undangan tim (Editor, Reviewer, Viewer) SELALU melihat daftar anggota tim kolaborator
  // Pemilik brand melihat tampilan tim jika berlangganan Paket Tim atau sudah memiliki anggota tim kolaborator
  const showTeamView = !isBrandOwner || isBrandOwnerTeamPlan || hasCollaborators;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#0f172a',
            color: '#f8fafc',
            padding: '12px 18px',
            borderRadius: 10,
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            zIndex: 9999,
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn-uda btn-uda-secondary btn-uda-sm" onClick={() => router.push('/app/brand')}>
            <ArrowLeft size={16} />
            <span>Kembali</span>
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                Pengaturan Brand: {brand.name}
              </h1>
              {userRole && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: userRole === 'owner' ? '#dcfce7' : userRole === 'reviewer' ? '#e0e7ff' : userRole === 'editor' ? '#fef3c7' : '#f1f5f9',
                    color: userRole === 'owner' ? '#15803d' : userRole === 'reviewer' ? '#4338ca' : userRole === 'editor' ? '#92400e' : '#475569',
                    border: '1px solid currentColor',
                    textTransform: 'uppercase',
                  }}
                >
                  Peran: {userRole}
                </span>
              )}
            </div>
            <p style={{ color: '#64748b', fontSize: '0.82rem' }}>@{brand.handle}</p>
          </div>
        </div>
      </div>

      {/* 4 Tabs Sesuai PRD Bab 8 (Scroll horizontal halus di HP & Tablet) */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 10, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        {[
          { id: 'profil', label: 'Profil Brand' },
          { id: 'pilar', label: 'Pilar Konten' },
          { id: 'anggota', label: 'Anggota & Undangan' },
          { id: 'pengaturan', label: 'Pengaturan & Review' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              background: activeTab === tab.id ? '#f0fdf4' : 'transparent',
              color: activeTab === tab.id ? '#16a34a' : '#64748b',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PROFIL BRAND */}
      {activeTab === 'profil' && (
        <div className="uda-card" style={{ maxWidth: 580 }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 18, color: '#0f172a' }}>
            Detail Profil Brand
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Foto / Logo Brand Upload */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                Logo / Foto Profil Brand
              </label>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: 16,
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: 12,
                }}
              >
                <div style={{ position: 'relative' }}>
                  <img
                    src={brandAvatarUrl}
                    alt={brandName}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: `3px solid ${brandColor}`,
                      background: '#ffffff',
                    }}
                  />
                  {isUploadingAvatar && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                      }}
                    >
                      <Loader2 size={22} className="animate-spin" />
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                    style={{ display: 'none' }}
                    onChange={handleLogoUpload}
                  />

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-uda btn-uda-primary btn-uda-sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Camera size={14} />
                      <span>{isUploadingAvatar ? 'Mengunggah...' : 'Unggah Foto Baru'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn-uda btn-uda-secondary btn-uda-sm"
                      onClick={() => {
                        setBrandAvatarUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150');
                        showToast('Logo direset ke gambar default');
                      }}
                      style={{ fontSize: '0.8rem' }}
                    >
                      Reset Logo
                    </button>
                  </div>

                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                    Format didukung: PNG, JPG, WebP, atau SVG. Rasio disarankan 1:1, ukuran maks. 5 MB.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Nama Brand</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4, outline: 'none', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Username Handle (@)</label>
              <input
                type="text"
                value={brandHandle}
                onChange={(e) => setBrandHandle(e.target.value.replace('@', ''))}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4, outline: 'none', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Warna Identitas Brand</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  style={{ width: 50, height: 42, border: '1px solid #e2e8f0', borderRadius: 8, padding: 2, cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#475569' }}>{brandColor}</span>
              </div>
            </div>

            {/* Pengaturan Platform Brand */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                  Platform Media Sosial Brand
                </label>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Tekan <strong>Enter</strong> untuk menambah
                </span>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  placeholder="Ketik platform (misal: Instagram, TikTok, LinkedIn) lalu tekan Enter..."
                  value={platformInput}
                  onChange={(e) => setPlatformInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = platformInput.trim().toLowerCase().replace(/\s+/g, '-');
                      if (val) {
                        if (!brandPlatforms.includes(val)) {
                          setBrandPlatforms((prev) => [...prev, val]);
                        }
                        if (!selectedPlatforms.includes(val)) {
                          setSelectedPlatforms((prev) => [...prev, val]);
                        }
                        setPlatformInput('');
                      }
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    outline: 'none',
                    fontSize: '0.88rem',
                  }}
                />
                <button
                  type="button"
                  className="btn-uda btn-uda-secondary btn-uda-sm"
                  onClick={() => {
                    const val = platformInput.trim().toLowerCase().replace(/\s+/g, '-');
                    if (val) {
                      if (!brandPlatforms.includes(val)) {
                        setBrandPlatforms((prev) => [...prev, val]);
                      }
                      if (!selectedPlatforms.includes(val)) {
                        setSelectedPlatforms((prev) => [...prev, val]);
                      }
                      setPlatformInput('');
                    }
                  }}
                  style={{ padding: '0 12px' }}
                >
                  + Tambah
                </button>
              </div>

              {/* Checkbox Platform */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {brandPlatforms.map((plt) => {
                  const isChecked = selectedPlatforms.includes(plt);
                  return (
                    <label
                      key={plt}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 10px',
                        borderRadius: 8,
                        border: `1.5px solid ${isChecked ? '#16a34a' : '#cbd5e1'}`,
                        backgroundColor: isChecked ? '#f0fdf4' : '#ffffff',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: isChecked ? '#15803d' : '#475569',
                        transition: 'all 0.15s ease',
                        userSelect: 'none',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPlatforms((prev) => [...prev, plt]);
                          } else {
                            setSelectedPlatforms((prev) => prev.filter((p) => p !== plt));
                          }
                        }}
                        style={{ accentColor: '#16a34a', cursor: 'pointer' }}
                      />
                      <span style={{ textTransform: 'capitalize' }}>{plt}</span>
                      {!['instagram', 'tiktok'].includes(plt) && (
                        <span
                          role="button"
                          title="Hapus platform"
                          onClick={(ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            setBrandPlatforms((prev) => prev.filter((p) => p !== plt));
                            setSelectedPlatforms((prev) => prev.filter((p) => p !== plt));
                          }}
                          style={{
                            marginLeft: 4,
                            color: '#94a3b8',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            lineHeight: 1,
                            cursor: 'pointer',
                          }}
                        >
                          ×
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Platform yang dicentang akan otomatis muncul sebagai pilihan platform di <strong>Form Konten</strong> brand ini.
              </div>
            </div>

            {userRole !== 'viewer' ? (
              <button
                className="btn-uda btn-uda-primary"
                style={{ width: 'fit-content', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={async () => {
                  const finalPlatforms = selectedPlatforms.length > 0 ? selectedPlatforms : ['instagram'];
                  const updated = await BrandService.updateBrand(brand.id, {
                    name: brandName,
                    handle: brandHandle,
                    color: brandColor,
                    avatar_url: brandAvatarUrl,
                    platforms: finalPlatforms,
                    require_approval: requireApproval,
                  });
                  if (updated) setCurrentBrand(updated);
                  playSuccessSound();
                  showToast('✅ Profil dan platform brand berhasil disimpan!');
                }}
              >
                Simpan Profil Brand
              </button>
            ) : (
              <div style={{ marginTop: 10, padding: '8px 14px', background: '#f1f5f9', borderRadius: 8, color: '#64748b', fontSize: '0.82rem', fontWeight: 600 }}>
                👁️ Mode Lihat Saja: Pengguna dengan peran Viewer tidak memiliki izin mengubah profil brand.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PILAR KONTEN */}
      {activeTab === 'pilar' && (
        <div className="uda-card" style={{ maxWidth: 640 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Daftar Pilar Konten</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Kategori tema komunikasi untuk postingan brand</p>
            </div>
            {userRole !== 'viewer' && (
              <button
                className="btn-uda btn-uda-primary btn-uda-sm"
                onClick={async () => {
                  const created = await ContentPillarService.createPillar({
                    brandId: brand.id,
                    name: `Pilar Baru ${pillars.length + 1}`,
                    color: '#6366F1',
                  });
                  setPillars((prev) => [...prev, created]);
                  showToast('Pilar baru ditambahkan');
                }}
              >
                + Tambah Pilar
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pillars.map((pil) => (
              <div
                key={pil.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 12,
                  borderRadius: 8,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: pil.color }} />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{pil.name}</span>
                </div>
                {userRole !== 'viewer' && (
                  <button
                    className="btn-uda btn-uda-secondary btn-uda-sm"
                    title="Hapus Pilar"
                    onClick={() => {
                      confirmDelete({
                        title: 'Hapus Pilar Konten?',
                        message: `Apakah Anda yakin ingin menghapus pilar "${pil.name}"?`,
                        onConfirm: async () => {
                          await ContentPillarService.deletePillar(pil.id);
                          setPillars((prev) => prev.filter((p) => p.id !== pil.id));
                          showSuccess('Pilar Dihapus', `Pilar "${pil.name}" telah dihapus.`);
                        },
                      });
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ANGGOTA & UNDANGAN */}
      {activeTab === 'anggota' && (
        <div className="uda-card" style={{ maxWidth: 740 }}>
          {/* Jika bukan Paket Tim dan belum ada kolaborator, tampilkan notice kunci & panduan */}
          {!showTeamView ? (
            <div>
              <div
                style={{
                  padding: '18px 20px',
                  background: '#fefce8',
                  border: '1.5px solid #fef08a',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  marginBottom: 20,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: '#fef08a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#854d0e',
                      flexShrink: 0,
                    }}
                  >
                    <Lock size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#713f12' }}>
                      Fitur Tambah Anggota Khusus Paket Tim
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#854d0e', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                      Akun <strong>Paket {account?.plan_code === 'pro' ? 'Pro' : 'Gratis'}</strong> ditujukan untuk kreator mandiri (solo). Fitur mengundang anggota kolaborator (Editor, Reviewer, Viewer) hanya tersedia di <strong>Paket Tim</strong>.
                    </p>
                  </div>
                </div>
                <button
                  className="btn-uda btn-uda-primary btn-uda-sm"
                  onClick={() => router.push('/app/langganan')}
                  style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Sparkles size={14} />
                  <span>Upgrade ke Paket Tim</span>
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  Pemilik Akun Brand (Owner)
                </h3>
                <span style={{ fontSize: '0.74rem', background: '#f1f5f9', color: '#64748b', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                  1 Akun Pengguna Solo
                </span>
              </div>

              {/* Tampilkan hanya owner pembuat brand */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={getSyncedAvatar(effectiveOwner?.name || '', effectiveOwner?.email || '', effectiveOwner?.avatar, effectiveOwner?.id)}
                    alt=""
                    style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #cbd5e1' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{effectiveOwner?.name || 'Pemilik Brand'}</span>
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999, background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                        Pemilik Utama (Owner)
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{effectiveOwner?.email || 'owner@udaplanner.id'}</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '4px 10px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                  Owner (Penuh)
                </span>
              </div>
            </div>
          ) : (
            <div>
              {/* Header Tab untuk Tim Kolaborator */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Anggota Tim Kolaborator</h3>
                    {isBrandOwner ? (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '3px 9px',
                          borderRadius: 999,
                          fontWeight: 800,
                          background: members.filter((m) => m.role !== 'owner').length >= 10 ? '#fef2f2' : '#f0fdf4',
                          color: members.filter((m) => m.role !== 'owner').length >= 10 ? '#dc2626' : '#16a34a',
                          border: `1px solid ${members.filter((m) => m.role !== 'owner').length >= 10 ? '#fecaca' : '#bbf7d0'}`,
                        }}
                      >
                        {members.filter((m) => m.role !== 'owner').length}/10 Anggota Kolaborator (Maks. 10)
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '3px 9px',
                          borderRadius: 999,
                          fontWeight: 800,
                          background: '#f0fdf4',
                          color: '#16a34a',
                          border: '1px solid #bbf7d0',
                        }}
                      >
                        {members.length} Anggota Tim
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
                    {isBrandOwner
                      ? 'Kelola hak akses tim: Owner (Akses Penuh), Editor (Buat Konten), Reviewer (Menyetujui), Viewer (Lihat Saja)'
                      : `Daftar anggota tim kolaborator pada brand ${brand.name}`}
                  </p>
                </div>
                {isBrandOwner && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-uda btn-uda-secondary btn-uda-sm"
                      onClick={() => openCopyLinkModal('editor')}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                      title="Salin tautan undangan dengan pilihan role"
                    >
                      <Copy size={14} />
                      <span>Salin Link Undangan</span>
                    </button>
                    <button
                      className="btn-uda btn-uda-primary btn-uda-sm"
                      disabled={members.filter((m) => m.role !== 'owner').length >= 10}
                      onClick={() => {
                        setShowInviteModal(true);
                        setInviteEmail('');
                        setSearchedUser(null);
                        setSearchError(null);
                        setGeneratedInviteLink(null);
                      }}
                      title={members.filter((m) => m.role !== 'owner').length >= 10 ? 'Batas kuota 10 anggota kolaborator tercapai' : 'Undang anggota baru'}
                    >
                      <Plus size={14} />
                      <span>+ Undang Anggota</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Daftar Anggota Aktif */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {members.map((m) => {
                  const isMemberOwner = m.role === 'owner';
                  const isCurrentUser = m.id === user?.id || (user?.email && m.email?.toLowerCase() === user?.email?.toLowerCase());

                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: 10,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img
                          src={getSyncedAvatar(m.name, m.email, m.avatar, m.id)}
                          alt=""
                          style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #cbd5e1' }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>{m.name}</span>
                            {isMemberOwner ? (
                              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999, background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                                Pemilik Utama (Owner)
                              </span>
                            ) : isCurrentUser ? (
                              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999, background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
                                Anda ({m.role.toUpperCase()})
                              </span>
                            ) : null}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{m.email}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {isMemberOwner ? (
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '4px 10px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                            Owner (Penuh)
                          </span>
                        ) : isBrandOwner ? (
                          <select
                            className="brand-dropdown-select"
                            value={m.role}
                            onChange={async (e) => {
                              const newRole = e.target.value as any;
                              const updatedMembers = members.map((item) => (item.id === m.id ? { ...item, role: newRole } : item));
                              setMembers(updatedMembers);
                              localStorage.setItem('uda_brand_members_' + brand.id, JSON.stringify(updatedMembers));
                              await MemberService.updateRole(brand.id, m.id, newRole);
                              playSuccessSound();
                              showToast(`Peran ${m.name} diubah menjadi ${newRole.toUpperCase()}`);
                            }}
                            style={{ fontSize: '0.82rem', padding: '6px 10px', minWidth: 120 }}
                          >
                            <option value="editor">Editor (Buat Konten)</option>
                            <option value="reviewer">Reviewer (Menyetujui)</option>
                            <option value="viewer">Viewer (Lihat Saja)</option>
                          </select>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              color: m.role === 'reviewer' ? '#4338ca' : m.role === 'editor' ? '#92400e' : '#475569',
                              background: m.role === 'reviewer' ? '#e0e7ff' : m.role === 'editor' ? '#fef3c7' : '#f1f5f9',
                              padding: '4px 10px',
                              borderRadius: 6,
                              border: '1px solid currentColor',
                              textTransform: 'capitalize',
                            }}
                          >
                            {m.role === 'editor' ? 'Editor (Buat Konten)' : m.role === 'reviewer' ? 'Reviewer (Menyetujui)' : 'Viewer (Lihat Saja)'}
                          </span>
                        )}

                        {/* Tombol Hapus Anggota untuk Owner */}
                        {!isMemberOwner && isBrandOwner && (
                          <button
                            type="button"
                            className="btn-uda btn-uda-secondary btn-uda-sm"
                            title="Hapus Anggota dari Brand"
                            style={{ color: '#dc2626', borderColor: '#fca5a5', padding: '6px 10px' }}
                            onClick={() => {
                              confirmDelete({
                                title: `Hapus Anggota ${m.name}?`,
                                message: `Apakah Anda yakin ingin menghapus ${m.name} (${m.email}) dari brand "${brand.name}"? Akses mereka ke brand ini akan dicabut.`,
                                confirmText: 'Ya, Hapus Anggota',
                                onConfirm: async () => {
                                  await MemberService.leaveTeam(m.id, m.email, brand.id);
                                  const updated = members.filter((item) => item.id !== m.id);
                                  setMembers(updated);
                                  localStorage.setItem('uda_brand_members_' + brand.id, JSON.stringify(updated));
                                  playSuccessSound();
                                  showSuccess('Anggota Dihapus', `${m.name} telah berhasil dihapus dari brand.`);
                                },
                              });
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}

                        {/* Tombol Keluar dari Tim untuk Diri Sendiri jika bukan Owner */}
                        {!isBrandOwner && isCurrentUser && (
                          <button
                            type="button"
                            className="btn-uda btn-uda-secondary btn-uda-sm"
                            title="Keluar dari Tim Brand Ini"
                            style={{ color: '#dc2626', borderColor: '#fca5a5', padding: '6px 12px', fontSize: '0.78rem', fontWeight: 800 }}
                            onClick={() => {
                              confirmDelete({
                                title: `Keluar dari Brand "${brand.name}"?`,
                                message: `Apakah Anda yakin ingin keluar dari brand "${brand.name}"? Status akses kolaborator Anda pada brand ini akan berakhir.`,
                                confirmText: 'Ya, Keluar dari Brand',
                                onConfirm: async () => {
                                  await MemberService.leaveTeam(user?.id || '', user?.email, brand.id);
                                  playSuccessSound();
                                  showSuccess('Berhasil Keluar', `Anda telah berhasil keluar dari brand "${brand.name}".`);
                                  router.push('/app/brand');
                                },
                              });
                            }}
                          >
                            <span>Keluar dari Tim</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bagian Undangan Menunggu Konfirmasi (Pending Invitations) - Khusus Owner */}
              {isBrandOwner && pendingInvites.length > 0 && (
                <div style={{ marginTop: 24, borderTop: '1px solid #e2e8f0', paddingTop: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Clock size={16} style={{ color: '#d97706' }} />
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Undangan Terkirim — Menunggu Konfirmasi Anggota ({pendingInvites.length})
                    </h4>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {pendingInvites.map((inv) => (
                      <div
                        key={inv.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: 10,
                          background: '#fffbeb',
                          border: '1.5px dashed #fde68a',
                          flexWrap: 'wrap',
                          gap: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <img
                            src={getSyncedAvatar(inv.target_name, inv.target_email, inv.target_avatar)}
                            alt=""
                            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #fcd34d' }}
                          />
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span>{inv.target_name}</span>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  background: '#fef3c7',
                                  color: '#78350f',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                }}
                              >
                                {inv.role}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#b45309' }}>{inv.target_email}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: '0.75rem', color: '#92400e', background: '#fef3c7', padding: '4px 8px', borderRadius: 6, fontWeight: 700 }}>
                            Menunggu Konfirmasi User
                          </span>
                          <button
                            type="button"
                            className="btn-uda btn-uda-secondary btn-uda-sm"
                            style={{ fontSize: '0.78rem', color: '#dc2626', borderColor: '#fca5a5' }}
                            onClick={() => handleCancelInvite(inv.id, inv.target_name)}
                          >
                            Batalkan
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Panduan Peran Tim */}
          <div style={{ marginTop: 20, padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569' }}>
            <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Tugas & Fungsi Masing-Masing Peran:</div>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              <li><strong>Owner</strong>: Mengelola profil brand, undang & hapus anggota, pilar konten, alur persetujuan, dan hapus brand. Owner tidak dapat diturunkan.</li>
              <li><strong>Editor</strong>: Membuat dan mengedit postingan konten, serta mengajukan review jika Wajib Review aktif.</li>
              <li><strong>Reviewer</strong>: Memeriksa draft konten, menyetujui jadwal tayang, atau memberikan catatan revisi internal.</li>
              <li><strong>Viewer</strong>: Hanya dapat melihat kalender, papan kanban, dan pratinjau grid tanpa izin modifikasi (read-only).</li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 4: PENGATURAN & REVIEW */}
      {activeTab === 'pengaturan' && (
        <div className="uda-card" style={{ maxWidth: 580, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>Alur Persetujuan (Wajib Review)</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 12 }}>
              Jika diaktifkan, editor tidak bisa langsung menjadwalkan konten tanpa persetujuan Reviewer atau Pemilik.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={requireApproval}
                onChange={async (e) => {
                  const val = e.target.checked;
                  setRequireApproval(val);
                  await BrandService.updateBrand(brand.id, { require_approval: val });
                  setCurrentBrand((prev) => ({ ...prev, require_approval: val }));
                  playSuccessSound();
                  showToast(val ? '✅ Alur Wajib Review diaktifkan dan tersinkron' : 'Alur Wajib Review dimatikan');
                }}
                style={{ width: 18, height: 18, accentColor: '#16a34a', cursor: 'pointer' }}
              />
              <span>Aktifkan "Wajib Review" untuk brand ini</span>
            </label>
          </div>

          {userRole === 'owner' ? (
            <div style={{ borderTop: '1px solid #fecaca', paddingTop: 16 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#dc2626', marginBottom: 6 }}>Zona Berbahaya</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 10 }}>
                Ketik nama brand <strong>"{brand.name}"</strong> untuk mengonfirmasi penghapusan permanen:
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  placeholder={brand.name}
                  value={deleteInputName}
                  onChange={(e) => setDeleteInputName(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #fecaca', borderRadius: 8, flex: 1 }}
                />
                <button
                  className="btn-uda btn-uda-danger btn-uda-sm"
                  disabled={deleteInputName !== brand.name}
                  onClick={() => {
                    confirmDelete({
                      title: `Hapus Brand ${brand.name}?`,
                      message: `Brand "${brand.name}" beserta seluruh postingan dan template yang terkait akan dihapus secara permanen.`,
                      confirmText: 'Ya, Hapus Brand',
                      onConfirm: async () => {
                        await BrandService.deleteBrand(brand.id);
                        showSuccess('Brand Berhasil Dihapus', `Brand "${brand.name}" telah dihapus dari sistem.`, () => {
                          router.push('/app/brand');
                        });
                      },
                    });
                  }}
                >
                  Hapus Brand
                </button>
              </div>
            </div>
          ) : (
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, color: '#64748b', fontSize: '0.82rem' }}>
              ℹ️ Hanya Pemilik Utama (Owner) yang memiliki wewenang untuk menghapus brand ini.
            </div>
          )}
        </div>
      )}

      {/* MODAL UNDANG ANGGOTA: Cek Email Terdaftar di Sistem */}
      {showInviteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 20,
          }}
        >
          <div className="uda-card" style={{ maxWidth: 480, width: '100%', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Undang Anggota Tim Baru</h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Input Email dengan Enter untuk Cek Detail User */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                  Email Calon Anggota (Harus Terdaftar di Sistem)
                </label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input
                    type="email"
                    required
                    placeholder="nama@email.com (tekan Enter)"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      if (searchedUser) setSearchedUser(null);
                      if (searchError) setSearchError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchUser(inviteEmail);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: `1px solid ${searchError ? '#ef4444' : '#e2e8f0'}`,
                      borderRadius: 8,
                      outline: 'none',
                      fontSize: '0.9rem',
                    }}
                  />
                  <button
                    type="button"
                    className="btn-uda btn-uda-secondary btn-uda-sm"
                    onClick={() => handleSearchUser(inviteEmail)}
                    disabled={isSearchingUser || !inviteEmail.trim()}
                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    {isSearchingUser ? <Loader2 size={14} className="animate-spin" /> : null}
                    <span>{isSearchingUser ? 'Mengecek...' : 'Cek User'}</span>
                  </button>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 4 }}>
                  Tekan <strong>Enter</strong> untuk memeriksa apakah user sudah terdaftar di sistem Uda-Planner.
                </div>
              </div>

              {/* Pesan Error jika tidak terdaftar */}
              {searchError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{searchError}</span>
                </div>
              )}

              {/* Kartu Detail User yang ditemukan */}
              {searchedUser && (
                <div
                  style={{
                    padding: 14,
                    background: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    borderRadius: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase' }}>
                      User Ditemukan di Sistem
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {searchedUser.isGoogleUser ? (
                        <span style={{ fontSize: '0.7rem', color: '#0369a1', background: '#e0f2fe', border: '1px solid #7dd3fc', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
                          Akun Google
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: '#166534', background: '#dcfce7', border: '1px solid #86efac', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
                          Email Terdaftar
                        </span>
                      )}
                      <span style={{ fontSize: '0.7rem', color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
                        {searchedUser.systemRole === 'admin' ? 'Administrator' : 'Pengguna Aktif'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img
                      src={searchedUser.avatar}
                      alt=""
                      style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #16a34a' }}
                    />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0f172a' }}>
                        {searchedUser.name}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                        {searchedUser.email}
                      </div>
                    </div>
                  </div>

                  {/* Input Nomor WhatsApp / HP Pengguna */}
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Phone size={13} />
                      <span>Nomor Kontak / WhatsApp Calon Anggota:</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="Contoh: 081234567890 (atau 628...)"
                      value={inviteWaPhone}
                      onChange={(e) => setInviteWaPhone(e.target.value)}
                      style={{
                        width: '100%',
                        marginTop: 4,
                        padding: '7px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #86efac',
                        background: '#ffffff',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534' }}>
                      Pilih Peran Anggota di Brand "{brand.name}":
                    </label>
                    <select
                      className="brand-dropdown-select"
                      style={{ width: '100%', marginTop: 4, background: '#ffffff' }}
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                    >
                      <option value="editor">Editor — Bisa buat, edit & jadwalkan konten</option>
                      <option value="reviewer">Reviewer — Menyetujui atau minta revisi konten</option>
                      <option value="viewer">Viewer — Hanya melihat kalender & kanban (read-only)</option>
                    </select>
                  </div>

                  {/* Tombol Kirim Undangan Realtime Aplikasi */}
                  <button
                    type="button"
                    className="btn-uda btn-uda-primary"
                    onClick={handleSendInvite}
                    disabled={isSendingInvite}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: isSendingInvite ? 0.75 : 1,
                      cursor: isSendingInvite ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSendingInvite ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Mengirim Undangan Realtime...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        <span>Kirim Undangan Realtime ke Akun</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Alternatif: Salin Link Undangan dengan Pilihan Role */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                <button
                  type="button"
                  className="btn-uda btn-uda-secondary btn-uda-sm"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700 }}
                  onClick={() => {
                    setShowInviteModal(false);
                    openCopyLinkModal(inviteRole);
                  }}
                >
                  <Copy size={14} />
                  <span>Salin Link Undangan Tim (Pilih Role)</span>
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  type="button"
                  className="btn-uda btn-uda-secondary btn-uda-sm"
                  onClick={() => setShowInviteModal(false)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL POPUP: SALIN LINK UNDANGAN TIM (PILIH ROLE & BIND KE BRAND) */}
      {showCopyLinkModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setShowCopyLinkModal(false)}
        >
          <div
            className="uda-card"
            style={{
              maxWidth: 540,
              width: '100%',
              padding: 0,
              borderRadius: 20,
              border: '2.5px solid #0f172a',
              boxShadow: '8px 8px 0px #0f172a',
              backgroundColor: '#ffffff',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '2px solid #0f172a',
                background: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: '#dcfce7',
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #0f172a',
                    boxShadow: '2px 2px 0px #0f172a',
                  }}
                >
                  <Link2 size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    Salin Link Undangan Tim
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                    Pilih hak akses (role) untuk anggota yang diundang
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCopyLinkModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Brand Target Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                }}
              >
                <img
                  src={
                    brand.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(brand.name)}&background=16a34a&color=fff&bold=true`
                  }
                  alt={brand.name}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    objectFit: 'cover',
                    border: '1.5px solid #0f172a',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.98rem', fontWeight: 900, color: '#0f172a' }}>
                      {brand.name}
                    </span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: '#16a34a',
                        color: '#ffffff',
                        textTransform: 'uppercase',
                      }}
                    >
                      Brand Tujuan
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#166534', margin: '2px 0 0' }}>
                    Penerima link akan langsung otomatis bergabung ke brand <strong>{brand.name}</strong>.
                  </p>
                </div>
              </div>

              {/* Role Selection Label */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    color: '#334155',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 8,
                  }}
                >
                  Pilih Role / Hak Akses:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Option 1: Editor */}
                  <div
                    onClick={() => {
                      setCopyLinkRole('editor');
                      setIsCopyLinkCopied(false);
                      playNotificationSound();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      border: copyLinkRole === 'editor' ? '2px solid #16a34a' : '1.5px solid #e2e8f0',
                      background: copyLinkRole === 'editor' ? '#f0fdf4' : '#ffffff',
                      boxShadow: copyLinkRole === 'editor' ? '3px 3px 0px #16a34a' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: copyLinkRole === 'editor' ? '6px solid #16a34a' : '2px solid #94a3b8',
                        background: '#ffffff',
                        marginTop: 2,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>
                          Editor
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '1px 8px',
                            borderRadius: 6,
                            background: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                          }}
                        >
                          Bisa Buat &amp; Edit Konten
                        </span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                        Dapat membuat draft postingan baru, mengedit jadwal, mengunggah media, dan mengajukan konten untuk disetujui.
                      </p>
                    </div>
                  </div>

                  {/* Option 2: Reviewer */}
                  <div
                    onClick={() => {
                      setCopyLinkRole('reviewer');
                      setIsCopyLinkCopied(false);
                      playNotificationSound();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      border: copyLinkRole === 'reviewer' ? '2px solid #f59e0b' : '1.5px solid #e2e8f0',
                      background: copyLinkRole === 'reviewer' ? '#fffbeb' : '#ffffff',
                      boxShadow: copyLinkRole === 'reviewer' ? '3px 3px 0px #f59e0b' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: copyLinkRole === 'reviewer' ? '6px solid #f59e0b' : '2px solid #94a3b8',
                        background: '#ffffff',
                        marginTop: 2,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>
                          Reviewer
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '1px 8px',
                            borderRadius: 6,
                            background: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                          }}
                        >
                          Menyetujui &amp; Revisi
                        </span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                        Dapat memeriksa postingan tim, menyetujui (approve) publikasi, atau meminta revisi sebelum diposting.
                      </p>
                    </div>
                  </div>

                  {/* Option 3: Viewer */}
                  <div
                    onClick={() => {
                      setCopyLinkRole('viewer');
                      setIsCopyLinkCopied(false);
                      playNotificationSound();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      border: copyLinkRole === 'viewer' ? '2px solid #3b82f6' : '1.5px solid #e2e8f0',
                      background: copyLinkRole === 'viewer' ? '#eff6ff' : '#ffffff',
                      boxShadow: copyLinkRole === 'viewer' ? '3px 3px 0px #3b82f6' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: copyLinkRole === 'viewer' ? '6px solid #3b82f6' : '2px solid #94a3b8',
                        background: '#ffffff',
                        marginTop: 2,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>
                          Viewer
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '1px 8px',
                            borderRadius: 6,
                            background: '#dbeafe',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                          }}
                        >
                          Lihat Saja (Read-Only)
                        </span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                        Hanya memiliki hak untuk melihat kalender dan preview postingan tanpa dapat mengedit atau menyetujui.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Link Preview Box */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    color: '#64748b',
                    marginBottom: 6,
                  }}
                >
                  PREVIEW LINK UNDANGAN:
                </label>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: '#f8fafc',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.75rem',
                    color: '#334155',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                    lineHeight: 1.4,
                  }}
                >
                  {getCopyInviteUrl(copyLinkRole, copyLinkToken || 'token-undangan')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: '0.74rem', color: '#d97706', fontWeight: 700 }}>
                  <Clock size={13} />
                  <span>Tautan ini dibatasi hanya berlaku 1 jam saja setelah disalin.</span>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  className="btn-uda btn-uda-primary"
                  onClick={handleCopyLinkExecute}
                  style={{
                    flex: 1.2,
                    height: 46,
                    fontSize: '0.92rem',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {isCopyLinkCopied ? (
                    <>
                      <Check size={18} />
                      <span>✓ Link Berhasil Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      <span>Salin Link Undangan</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn-uda btn-uda-secondary"
                  onClick={handleShareLinkWhatsApp}
                  style={{
                    flex: 1,
                    height: 46,
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                  title="Bagikan undangan via WhatsApp"
                >
                  <Share2 size={16} />
                  <span>Kirim ke WA</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL POPUP: PESAN TAUTAN TELAH DISALIN (DURASI 1 JAM) */}
      {showCopySuccessModal && copiedLinkInfo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: 16,
          }}
          onClick={() => setShowCopySuccessModal(false)}
        >
          <div
            className="uda-card"
            style={{
              maxWidth: 480,
              width: '100%',
              padding: 0,
              borderRadius: 20,
              border: '2.5px solid #0f172a',
              boxShadow: '8px 8px 0px #0f172a',
              backgroundColor: '#ffffff',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 24px',
                borderBottom: '2px solid #0f172a',
                background: '#f0fdf4',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#16a34a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #0f172a',
                  }}
                >
                  <Check size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    Tautan Telah Berhasil Disalin!
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#166534', margin: 0 }}>
                    Tautan siap dibagikan kepada calon anggota
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCopySuccessModal(false)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Info Brand & Role */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>BRAND TUJUAN:</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>{brand.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>ROLE DIBERIKAN:</div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '2px 10px',
                      borderRadius: 6,
                      background: copiedLinkInfo.role === 'editor' ? '#dcfce7' : copiedLinkInfo.role === 'reviewer' ? '#fef3c7' : '#dbeafe',
                      color: copiedLinkInfo.role === 'editor' ? '#15803d' : copiedLinkInfo.role === 'reviewer' ? '#b45309' : '#1d4ed8',
                      textTransform: 'uppercase',
                    }}
                  >
                    {copiedLinkInfo.role}
                  </span>
                </div>
              </div>

              {/* Box Link */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>
                  TAUTAN UNDANGAN (SUDAH DISALIN):
                </label>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: '#f1f5f9',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.76rem',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                    color: '#334155',
                  }}
                >
                  {copiedLinkInfo.url}
                </div>
              </div>

              {/* Warning Notice: Batas 1 Jam */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: '#fffbeb',
                  border: '1.5px solid #fde68a',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                <Clock size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: '0.8rem', color: '#92400e', lineHeight: 1.5 }}>
                  <strong>⏱️ Batas Waktu 1 Jam:</strong> Tautan undangan ini dibatasi durasi aktifnya selama <strong>1 jam saja</strong> (kedaluwarsa pukul <strong>{copiedLinkInfo.expiresAtTime}</strong>). Jika lewat 1 jam, tautan otomatis tidak dapat diakses lagi. Jika ingin diakses kembali, silakan buat tautan undangan baru.
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  className="btn-uda btn-uda-primary"
                  onClick={() => setShowCopySuccessModal(false)}
                  style={{ flex: 1, height: 44, fontWeight: 800, fontSize: '0.9rem' }}
                >
                  OK, Mengerti
                </button>
                <button
                  type="button"
                  className="btn-uda btn-uda-secondary"
                  onClick={() => {
                    const msg = `Halo! 🚀\n\nAnda diundang untuk bergabung ke brand *${brand.name}* sebagai *${copiedLinkInfo.role.toUpperCase()}* di UdaPlanner.\n\nKlik tautan berikut (berlaku 1 jam):\n${copiedLinkInfo.url}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                  style={{ flex: 1, height: 44, fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Share2 size={16} />
                  <span>Kirim ke WA</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
