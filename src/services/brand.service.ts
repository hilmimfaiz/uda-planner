import { createClient } from '@/lib/supabase/client';
import { DUMMY_BRANDS, DummyBrand } from '@/lib/dummy-data';

export const isUuid = (val?: string | null): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

const STORAGE_KEY = 'uda_custom_brands';

const getStoredCustomBrands = (): DummyBrand[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return (Array.isArray(parsed) ? parsed : []).filter(
      (b: any) => b && b.id !== 'brand-1' && b.id !== 'brand-2' && b.id !== 'brand-3'
    );
  } catch {
    return [];
  }
};

const saveCustomBrands = (brands: DummyBrand[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(brands));
  } catch {}
};

let localBrands: DummyBrand[] = [...DUMMY_BRANDS];

export class BrandService {
  static async getRealBrandId(requestedId?: string, fallbackUserId?: string): Promise<string> {
    if (requestedId && isUuid(requestedId)) {
      return requestedId;
    }

    const supabase = createClient();
    if (supabase) {
      try {
        let userId = fallbackUserId;
        if (!userId) {
          const { data: { user } } = await supabase.auth.getUser();
          userId = user?.id;
        }

        if (userId && isUuid(userId)) {
          const { data } = await supabase
            .from('brands' as any)
            .select('id')
            .eq('owner_id', userId)
            .order('created_at', { ascending: true })
            .limit(1);

          const rows = data as any[];
          if (rows && rows.length > 0 && rows[0]?.id) {
            return rows[0].id;
          }
        }
      } catch (err) {
        console.warn('BrandService.getRealBrandId db lookup:', err);
      }
    }

    // Periksa local storage custom brands jika ada yang uuid
    const custom = getStoredCustomBrands();
    const foundCustom = custom.find((b) => isUuid(b.id));
    if (foundCustom) return foundCustom.id;

    return '00000000-0000-0000-0000-000000000001';
  }

  static async ensureDefaultBrand(userId?: string): Promise<DummyBrand | null> {
    const supabase = createClient();
    if (!supabase) return null;

    try {
      let finalUserId = userId;
      if (!finalUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        finalUserId = user?.id;
      }

      if (!finalUserId || !isUuid(finalUserId)) return null;

      // Cek apakah sudah ada brand di Supabase
      const { data: existing } = await supabase
        .from('brands' as any)
        .select('*')
        .eq('owner_id', finalUserId)
        .limit(1);

      if (existing && existing.length > 0) {
        const d = existing[0] as any;
        return {
          id: d.id,
          owner_id: d.owner_id,
          name: d.name,
          handle: d.handle || 'udacoding',
          platforms: d.platforms || ['instagram', 'tiktok', 'facebook'],
          color: d.color || '#16A34A',
          avatar_url: d.avatar_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
          require_approval: d.require_approval ?? false,
          is_archived: d.is_archived ?? false,
          post_count_this_month: 0,
        };
      }

      // Buat default brand di Supabase
      const insertPayload = {
        owner_id: finalUserId,
        name: 'UdaCoding',
        handle: 'udacoding',
        platforms: ['instagram', 'tiktok', 'facebook'],
        color: '#16A34A',
        avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
        require_approval: false,
        is_archived: false,
      };

      const { data: created, error } = await (supabase.from('brands' as any) as any)
        .insert(insertPayload)
        .select()
        .single();

      if (!error && created) {
        const d = created as any;
        const brandObj: DummyBrand = {
          id: d.id,
          owner_id: d.owner_id,
          name: d.name,
          handle: d.handle,
          platforms: d.platforms,
          color: d.color,
          avatar_url: d.avatar_url,
          require_approval: d.require_approval,
          is_archived: d.is_archived,
          post_count_this_month: 0,
        };
        localBrands.unshift(brandObj);
        return brandObj;
      }
    } catch (err) {
      console.warn('BrandService.ensureDefaultBrand error:', err);
    }
    return null;
  }

  /**
   * Mendapatkan role pengguna pada brand tertentu ('owner', 'editor', 'reviewer', 'viewer', atau null jika tidak ada akses)
   */
  static async getUserBrandRole(brandId: string, userId?: string): Promise<'owner' | 'editor' | 'reviewer' | 'viewer' | null> {
    if (!brandId) return null;
    const supabase = createClient();
    let finalUserId = userId;
    let userEmail = '';

    // Pastikan userEmail dan finalUserId terisi secara lengkap dari Supabase maupun localStorage
    if (typeof window !== 'undefined') {
      try {
        const rawAuth = localStorage.getItem('uda_auth_profile');
        if (rawAuth) {
          const parsed = JSON.parse(rawAuth);
          if (!finalUserId) finalUserId = parsed.id;
          if (!userEmail && parsed.email) userEmail = parsed.email;
        }
        const rawUser = localStorage.getItem('uda_auth_user');
        if (rawUser) {
          const parsedU = JSON.parse(rawUser);
          if (!finalUserId) finalUserId = parsedU.id;
          if (!userEmail && parsedU.email) userEmail = parsedU.email;
        }
      } catch {}
    }

    if (supabase && (!finalUserId || !userEmail)) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (!finalUserId) finalUserId = user.id;
          if (!userEmail && user.email) userEmail = user.email;
        }
      } catch {}
    }

    // Dapatkan referensi nama brand untuk pencocokan cadangan jika ID brand adalah alias/dummy
    let targetBrandName = '';
    const storedBrands = typeof window !== 'undefined' ? getStoredCustomBrands() : [];
    const matchedBrand = storedBrands.find((b) => b.id === brandId) || DUMMY_BRANDS.find((b) => b.id === brandId);
    if (matchedBrand) {
      targetBrandName = matchedBrand.name;
    }

    // 1. Cek kepemilikan Owner langsung di Supabase
    if (supabase && isUuid(brandId) && isUuid(finalUserId)) {
      try {
        const { data: brand } = await (supabase.from('brands' as any) as any)
          .select('owner_id, name')
          .eq('id', brandId)
          .maybeSingle();

        if (brand) {
          if (brand.name && !targetBrandName) targetBrandName = brand.name;
          if (brand.owner_id === finalUserId) {
            return 'owner';
          }
        }

        // Cek tabel brand_members di database Supabase
        const { data: member } = await (supabase.from('brand_members' as any) as any)
          .select('role')
          .eq('brand_id', brandId)
          .eq('user_id', finalUserId)
          .maybeSingle();

        if (member && member.role) {
          return member.role.toLowerCase() as 'editor' | 'reviewer' | 'viewer';
        }
      } catch (err) {
        console.warn('BrandService.getUserBrandRole db lookup notice:', err);
      }
    }

    // 2. Cek di penyimpanan lokal: custom brands kepemilikan Owner
    if (typeof window !== 'undefined') {
      try {
        const b = storedBrands.find((item) => item.id === brandId);
        if (b && b.owner_id === finalUserId) {
          return 'owner';
        }

        // 3. Cek keanggotaan tim dari 'uda_team_membership_[userId]' & 'uda_team_membership'
        const teamKeys = [
          finalUserId ? 'uda_team_membership_' + finalUserId : null,
          'uda_team_membership',
        ].filter(Boolean) as string[];

        for (const key of teamKeys) {
          const rawTeam = localStorage.getItem(key);
          if (rawTeam) {
            const team = JSON.parse(rawTeam);
            const isMatch =
              team.brand_id === brandId ||
              (targetBrandName && team.brand_name && targetBrandName.toLowerCase() === team.brand_name.toLowerCase()) ||
              (team.brand_name && matchedBrand && matchedBrand.name.toLowerCase() === team.brand_name.toLowerCase());

            if (isMatch && team.role) {
              return team.role.toLowerCase() as 'editor' | 'reviewer' | 'viewer';
            }
          }
        }

        // 4. Cek anggota tim lokal di key 'uda_brand_members_' + brandId
        const rawMembers = localStorage.getItem('uda_brand_members_' + brandId);
        if (rawMembers) {
          const membersList = JSON.parse(rawMembers);
          const match = membersList.find((m: any) =>
            (finalUserId && (m.id === finalUserId || m.user_id === finalUserId)) ||
            (userEmail && m.email && m.email.toLowerCase() === userEmail.toLowerCase())
          );
          if (match && match.role) {
            return match.role.toLowerCase() as 'owner' | 'editor' | 'reviewer' | 'viewer';
          }
        }

        // 5. Cek undangan tim yang relevan di 'uda_brand_invitations'
        const rawInvites = localStorage.getItem('uda_brand_invitations');
        if (rawInvites) {
          const invitesList = JSON.parse(rawInvites);
          const acceptedMatch = invitesList.find((inv: any) => {
            const isUser =
              (userEmail && inv.target_email && inv.target_email.toLowerCase() === userEmail.toLowerCase()) ||
              (userEmail && inv.email && inv.email.toLowerCase() === userEmail.toLowerCase()) ||
              (finalUserId && inv.target_user_id === finalUserId);

            if (!isUser) return false;

            const isBrand =
              inv.brand_id === brandId ||
              (targetBrandName && inv.brand_name && targetBrandName.toLowerCase() === inv.brand_name.toLowerCase()) ||
              (inv.brand_name && matchedBrand && matchedBrand.name.toLowerCase() === inv.brand_name.toLowerCase());

            return isBrand && (inv.status === 'accepted' || inv.status === 'pending' || !inv.status);
          });

          if (acceptedMatch && acceptedMatch.role) {
            return acceptedMatch.role.toLowerCase() as 'editor' | 'reviewer' | 'viewer';
          }
        }

        // 6. Cek informasi cache akun tim di 'uda_auth_account'
        const rawAcc = localStorage.getItem('uda_auth_account');
        if (rawAcc) {
          const acc = JSON.parse(rawAcc);
          if (acc.plan_code === 'team') {
            const isBrandMatch =
              acc.team_member_brand_id === brandId ||
              (targetBrandName && acc.team_member_brand_name && targetBrandName.toLowerCase() === acc.team_member_brand_name.toLowerCase()) ||
              (!acc.team_member_brand_id && !acc.team_member_brand_name);

            if (isBrandMatch) {
              const sysRole = finalUserId ? localStorage.getItem('uda_system_role_' + finalUserId) : null;
              const r = sysRole || acc.team_role || acc.role;
              if (r && ['owner', 'editor', 'reviewer', 'viewer'].includes(r.toLowerCase())) {
                return r.toLowerCase() as 'owner' | 'editor' | 'reviewer' | 'viewer';
              }
            }
          }
        }

        // 7. Cek seluruh key uda_brand_members_* jika brand ID mengalami penyesuaian
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('uda_brand_members_')) {
            const raw = localStorage.getItem(k);
            if (raw) {
              const mList = JSON.parse(raw);
              const found = mList.find((m: any) =>
                (finalUserId && (m.id === finalUserId || m.user_id === finalUserId)) ||
                (userEmail && m.email && m.email.toLowerCase() === userEmail.toLowerCase())
              );
              if (found && found.role) {
                const keyBrandId = k.replace('uda_brand_members_', '');
                if (keyBrandId === brandId || !brandId.startsWith('brand-')) {
                  return found.role.toLowerCase() as 'owner' | 'editor' | 'reviewer' | 'viewer';
                }
              }
            }
          }
        }

        // 8. Fallback peran sistem tim jika pengguna memiliki peran tersimpan
        if (finalUserId) {
          const sysRole = localStorage.getItem('uda_system_role_' + finalUserId);
          if (sysRole && ['owner', 'editor', 'reviewer', 'viewer'].includes(sysRole.toLowerCase())) {
            return sysRole.toLowerCase() as 'owner' | 'editor' | 'reviewer' | 'viewer';
          }
        }
      } catch (err) {
        console.warn('BrandService.getUserBrandRole local lookup error:', err);
      }
    }

    return null;
  }

  static async getBrands(ownerId?: string): Promise<DummyBrand[]> {
    const supabase = createClient();
    const storedCustom = getStoredCustomBrands();

    let finalOwnerId = ownerId;
    let currentUserEmail = '';

    if (supabase && (!finalOwnerId || !isUuid(finalOwnerId))) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        finalOwnerId = user?.id;
        currentUserEmail = user?.email || '';
      } catch {}
    }

    if (!finalOwnerId && typeof window !== 'undefined') {
      try {
        const rawAuth = localStorage.getItem('uda_auth_profile');
        if (rawAuth) {
          const parsed = JSON.parse(rawAuth);
          finalOwnerId = parsed.id;
          currentUserEmail = parsed.email || '';
        }
      } catch {}
    }

    // Jika sama sekali tidak ada pengguna yang login, jangan kembalikan brand apapun
    if (!finalOwnerId) {
      return [];
    }

    const brandMap = new Map<string, DummyBrand>();

    if (supabase && isUuid(finalOwnerId)) {
      try {
        // 1. Ambil brand yang dimiliki sendiri (Owner)
        const { data: ownedData, error: ownedErr } = await (supabase.from('brands' as any) as any)
          .select('*')
          .eq('owner_id', finalOwnerId)
          .order('created_at', { ascending: false });

        if (!ownedErr && ownedData) {
          ownedData.forEach((b: any) => {
            brandMap.set(b.id, {
              id: b.id,
              owner_id: b.owner_id || finalOwnerId,
              name: b.name,
              handle: b.handle || b.slug || b.name.toLowerCase().replace(/[^a-z0-9]+/g, ''),
              platforms: b.platforms || ['instagram'],
              color: b.color || '#16A34A',
              avatar_url: b.avatar_url || b.logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
              require_approval: b.require_approval ?? false,
              is_archived: b.is_archived ?? false,
              post_count_this_month: 0,
            });
          });
        }

        // 2. Ambil brand dimana pengguna menjadi anggota tim (Editor, Reviewer, Viewer)
        const { data: memberData, error: memberErr } = await (supabase.from('brand_members' as any) as any)
          .select('brand_id, role')
          .eq('user_id', finalOwnerId);

        if (!memberErr && memberData && memberData.length > 0) {
          const joinedBrandIds = memberData.map((m: any) => m.brand_id).filter(Boolean);
          if (joinedBrandIds.length > 0) {
            const { data: joinedBrands, error: joinedErr } = await (supabase.from('brands' as any) as any)
              .select('*')
              .in('id', joinedBrandIds);

            if (!joinedErr && joinedBrands) {
              joinedBrands.forEach((b: any) => {
                if (!brandMap.has(b.id)) {
                  brandMap.set(b.id, {
                    id: b.id,
                    owner_id: b.owner_id,
                    name: b.name,
                    handle: b.handle || b.slug || b.name.toLowerCase().replace(/[^a-z0-9]+/g, ''),
                    platforms: b.platforms || ['instagram'],
                    color: b.color || '#16A34A',
                    avatar_url: b.avatar_url || b.logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
                    require_approval: b.require_approval ?? false,
                    is_archived: b.is_archived ?? false,
                    post_count_this_month: 0,
                  });
                }
              });
            }
          }
        }
      } catch (err) {
        console.warn('BrandService.getBrands Supabase query notice:', err);
      }
    }

    // 3. Sertakan brand lokal HANYA jika dimiliki pengguna atau terdaftar sebagai anggota tim
    storedCustom.forEach((c) => {
      let isAccessible = c.owner_id === finalOwnerId;
      if (!isAccessible && typeof window !== 'undefined') {
        try {
          const rawM = localStorage.getItem('uda_brand_members_' + c.id);
          if (rawM) {
            const mList = JSON.parse(rawM);
            if (mList.some((m: any) =>
              (finalOwnerId && (m.id === finalOwnerId || m.user_id === finalOwnerId)) ||
              (currentUserEmail && m.email?.toLowerCase() === currentUserEmail.toLowerCase())
            )) {
              isAccessible = true;
            }
          }
        } catch {}
      }

      if (isAccessible && !brandMap.has(c.id)) {
        brandMap.set(c.id, c);
      }
    });

    // 4. Sertakan brand dimana pengguna terdaftar sebagai anggota tim via undangan lokal/team membership
    if (typeof window !== 'undefined') {
      try {
        // Dari uda_team_membership_
        const teamKeys = [
          finalOwnerId ? 'uda_team_membership_' + finalOwnerId : null,
          'uda_team_membership',
        ].filter(Boolean) as string[];

        for (const tKey of teamKeys) {
          const rawTeam = localStorage.getItem(tKey);
          if (rawTeam) {
            const team = JSON.parse(rawTeam);
            if (team.brand_id && !brandMap.has(team.brand_id)) {
              const dummyMatch = DUMMY_BRANDS.find((d) => d.id === team.brand_id || d.name.toLowerCase() === team.brand_name?.toLowerCase());
              if (dummyMatch) {
                brandMap.set(dummyMatch.id, dummyMatch);
              } else {
                brandMap.set(team.brand_id, {
                  id: team.brand_id,
                  owner_id: 'owner',
                  name: team.brand_name || 'Brand Tim',
                  handle: (team.brand_name || 'brandtim').toLowerCase().replace(/[^a-z0-9]+/g, ''),
                  platforms: ['instagram'],
                  color: '#16A34A',
                  avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
                  require_approval: true,
                  is_archived: false,
                  post_count_this_month: 0,
                });
              }
            }
          }
        }

        // Dari uda_brand_invitations
        const rawInv = localStorage.getItem('uda_brand_invitations');
        if (rawInv) {
          const invList = JSON.parse(rawInv);
          invList.forEach((inv: any) => {
            const isUser =
              (currentUserEmail && (inv.target_email?.toLowerCase() === currentUserEmail.toLowerCase() || inv.email?.toLowerCase() === currentUserEmail.toLowerCase())) ||
              (finalOwnerId && inv.target_user_id === finalOwnerId);

            if (isUser && (inv.status === 'accepted' || inv.status === 'pending' || !inv.status)) {
              if (inv.brand_id && !brandMap.has(inv.brand_id)) {
                const dummyMatch = DUMMY_BRANDS.find((d) => d.id === inv.brand_id || d.name.toLowerCase() === inv.brand_name?.toLowerCase());
                if (dummyMatch) {
                  brandMap.set(dummyMatch.id, dummyMatch);
                } else {
                  brandMap.set(inv.brand_id, {
                    id: inv.brand_id,
                    owner_id: 'owner',
                    name: inv.brand_name || 'Brand Tim',
                    handle: (inv.brand_name || 'brandtim').toLowerCase().replace(/[^a-z0-9]+/g, ''),
                    platforms: ['instagram'],
                    color: '#16A34A',
                    avatar_url: inv.brand_avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
                    require_approval: true,
                    is_archived: false,
                    post_count_this_month: 0,
                  });
                }
              }
            }
          });
        }

        // Dari seluruh key uda_brand_members_*
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('uda_brand_members_')) {
            const bId = k.replace('uda_brand_members_', '');
            if (!brandMap.has(bId)) {
              const rawM = localStorage.getItem(k);
              if (rawM) {
                const mList = JSON.parse(rawM);
                if (mList.some((m: any) =>
                  (finalOwnerId && (m.id === finalOwnerId || m.user_id === finalOwnerId)) ||
                  (currentUserEmail && m.email && m.email.toLowerCase() === currentUserEmail.toLowerCase())
                )) {
                  const dummyMatch = DUMMY_BRANDS.find((d) => d.id === bId);
                  if (dummyMatch) {
                    brandMap.set(dummyMatch.id, dummyMatch);
                  }
                }
              }
            }
          }
        }
      } catch {}
    }

    return Array.from(brandMap.values());
  }

  static async getBrandById(id: string, userId?: string): Promise<DummyBrand | null> {
    const supabase = createClient();
    const role = await this.getUserBrandRole(id, userId);

    // Jika pengguna tidak memiliki peran (bukan owner dan bukan anggota tim), tolak akses!
    if (!role) {
      return null;
    }

    if (supabase && isUuid(id)) {
      try {
        const { data, error } = await (supabase.from('brands' as any) as any).select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          const d = data as any;
          return {
            id: d.id,
            owner_id: d.owner_id || 'user-1',
            name: d.name,
            handle: d.handle || d.slug || d.name.toLowerCase().replace(/[^a-z0-9]+/g, ''),
            platforms: d.platforms || ['instagram'],
            color: d.color || '#16A34A',
            avatar_url: d.avatar_url || d.logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
            require_approval: d.require_approval ?? false,
            is_archived: d.is_archived ?? false,
            post_count_this_month: 0,
          };
        }
      } catch (err) {
        console.warn('BrandService.getBrandById db lookup notice:', err);
      }
    }

    const stored = getStoredCustomBrands();
    const found = stored.find((b) => b.id === id);
    if (found) return found;

    return null;
  }

  static async createBrand(payload: {
    ownerId?: string;
    accountId?: string;
    name: string;
    handle?: string;
    slug?: string;
    description?: string;
    platforms?: string[];
    color?: string;
    industry?: string;
    avatarUrl?: string;
    userId?: string;
    requireApproval?: boolean;
  }): Promise<DummyBrand> {
    const cleanHandle = (payload.handle || payload.slug || payload.name)
      .toLowerCase()
      .replace(/@/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const supabase = createClient();
    let effectiveOwnerId = payload.ownerId || payload.userId || payload.accountId;

    if (supabase && (!effectiveOwnerId || !isUuid(effectiveOwnerId))) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) effectiveOwnerId = user.id;
      } catch {}
    }

    const fallbackId = `brand-${Date.now()}`;
    const newBrand: DummyBrand = {
      id: fallbackId,
      owner_id: effectiveOwnerId || 'user-1',
      name: payload.name,
      handle: cleanHandle,
      platforms: payload.platforms || ['instagram'],
      color: payload.color || '#16A34A',
      avatar_url: payload.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
      require_approval: payload.requireApproval ?? false,
      is_archived: false,
      post_count_this_month: 0,
    };

    if (supabase && effectiveOwnerId && isUuid(effectiveOwnerId)) {
      try {
        // Cek apakah pengguna adalah anggota tim undangan yang bukan pemilik brand
        const { data: memberRows } = await (supabase.from('brand_members' as any) as any)
          .select('brand_id, role')
          .eq('user_id', effectiveOwnerId);

        const { data: ownedBrands } = await (supabase.from('brands' as any) as any)
          .select('id')
          .eq('owner_id', effectiveOwnerId);

        const isCollaboratorOnly =
          (!ownedBrands || ownedBrands.length === 0) &&
          memberRows &&
          memberRows.length > 0 &&
          memberRows.every((m: any) => m.role !== 'owner');

        if (isCollaboratorOnly) {
          throw new Error('Pengguna undangan tim tidak dapat menambah brand baru. Hanya Pemilik Akun Brand (Owner) yang berwenang menambah brand.');
        }

        const insertPayload: any = {
          owner_id: effectiveOwnerId,
          name: payload.name,
          handle: cleanHandle,
          platforms: newBrand.platforms,
          color: newBrand.color,
          avatar_url: newBrand.avatar_url,
          require_approval: newBrand.require_approval,
          is_archived: false,
        };

        const { data, error } = await (supabase.from('brands' as any) as any).insert(insertPayload).select().single();
        if (!error && data) {
          const d = data as any;
          const created: DummyBrand = {
            id: d.id,
            owner_id: d.owner_id || effectiveOwnerId,
            name: d.name,
            handle: d.handle || cleanHandle,
            platforms: d.platforms || newBrand.platforms,
            color: d.color || newBrand.color,
            avatar_url: d.avatar_url || newBrand.avatar_url,
            require_approval: d.require_approval ?? false,
            is_archived: d.is_archived ?? false,
            post_count_this_month: 0,
          };
          localBrands.unshift(created);
          const currentStored = getStoredCustomBrands();
          saveCustomBrands([created, ...currentStored.filter((b) => b.id !== created.id)]);
          return created;
        } else if (error) {
          console.error('BrandService.createBrand Supabase insert error:', error.message, error.details);
        }
      } catch (err) {
        console.warn('BrandService.createBrand db error, using local:', err);
      }
    }

    localBrands.unshift(newBrand);
    const currentStored = getStoredCustomBrands();
    saveCustomBrands([newBrand, ...currentStored.filter((b) => b.id !== newBrand.id)]);
    return newBrand;
  }

  static async updateBrand(id: string, updates: Partial<DummyBrand>): Promise<DummyBrand | null> {
    const supabase = createClient();
    if (supabase && isUuid(id)) {
      try {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.handle !== undefined) dbUpdates.handle = updates.handle;
        if (updates.color !== undefined) dbUpdates.color = updates.color;
        if (updates.avatar_url !== undefined) {
          dbUpdates.avatar_url = updates.avatar_url;
        }
        if (updates.platforms !== undefined) dbUpdates.platforms = updates.platforms;
        if (updates.require_approval !== undefined) dbUpdates.require_approval = updates.require_approval;
        if (updates.is_archived !== undefined) dbUpdates.is_archived = updates.is_archived;
        dbUpdates.updated_at = new Date().toISOString();

        await (supabase.from('brands' as any) as any)
          .update(dbUpdates)
          .eq('id', id);
      } catch (err) {
        console.warn('BrandService.updateBrand db error:', err);
      }
    }

    const currentStored = getStoredCustomBrands();
    const updatedStored = currentStored.map((b) => (b.id === id ? { ...b, ...updates } : b));
    saveCustomBrands(updatedStored);

    const index = localBrands.findIndex((b) => b.id === id);
    if (index !== -1) {
      localBrands[index] = { ...localBrands[index], ...updates };
      return localBrands[index];
    }
    return null;
  }

  static async deleteBrand(id: string): Promise<boolean> {
    const supabase = createClient();
    if (supabase && isUuid(id)) {
      try {
        await supabase.from('brands' as any).delete().eq('id', id);
      } catch (err) {
        console.warn('BrandService.deleteBrand db error:', err);
      }
    }

    const currentStored = getStoredCustomBrands();
    saveCustomBrands(currentStored.filter((b) => b.id !== id));
    localBrands = localBrands.filter((b) => b.id !== id);
    return true;
  }
}

