import { createClient } from '@/lib/supabase/client';
import { initialBrandMembers, initialProfiles } from '@/lib/supabase/mock-data';
import { BrandMember, BrandRole, Invitation, Profile } from '@/types/database.types';
import { sendRealtimeBroadcast } from '@/lib/realtime';

let mockMembers: BrandMember[] = [...initialBrandMembers];
let mockInvitations: Invitation[] = [];

export interface MemberWithProfile extends BrandMember {
  profile?: Profile;
}

export class MemberService {
  static async getBrandMembers(brandId: string): Promise<MemberWithProfile[]> {
    const supabase = createClient();
    if (supabase) {
      try {
        const { data: bMembers, error: mErr } = await (supabase.from('brand_members' as any) as any)
          .select('*')
          .eq('brand_id', brandId);

        if (!mErr && bMembers && bMembers.length > 0) {
          const userIds = bMembers.map((m: any) => m.user_id).filter(Boolean);
          const profMap = new Map<string, Profile>();

          if (userIds.length > 0) {
            const { data: profs } = await (supabase.from('profiles' as any) as any)
              .select('*')
              .in('id', userIds);

            if (profs) {
              profs.forEach((p: Profile) => profMap.set(p.id, p));
            }
          }

          return bMembers.map((item: any) => ({
            ...item,
            profile: profMap.get(item.user_id),
          }));
        }
      } catch (err) {
        console.warn('MemberService.getBrandMembers db lookup notice:', err);
      }
    }

    return mockMembers
      .filter((m) => m.brand_id === brandId)
      .map((m) => ({
        ...m,
        profile: initialProfiles.find((p) => p.id === m.user_id),
      }));
  }

  static async addMember(brandId: string, userId: string, role: BrandRole): Promise<BrandMember> {
    const newMember: BrandMember = {
      id: `bm-${Date.now()}`,
      brand_id: brandId,
      user_id: userId,
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('brand_members')
        .insert({ brand_id: brandId, user_id: userId, role } as any)
        .select()
        .single();
      if (!error && data) return data as BrandMember;
    }

    mockMembers.push(newMember);
    return newMember;
  }

  static async updateRole(
    brandId: string,
    userId: string,
    role: BrandRole,
    brandName?: string,
    userEmail?: string
  ): Promise<BrandMember | null> {
    const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : undefined;

    // 1. Panggil server API /api/invitations via PUT action 'update_role' dengan admin client
    try {
      await fetch('/api/invitations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_role',
          brandId,
          userId,
          userEmail: cleanEmail,
          role,
          brandName,
        }),
      });
    } catch (apiErr) {
      console.warn('API updateRole fetch warning:', apiErr);
    }

    // 2. Update via client supabase jika terhubung
    const supabase = createClient();
    if (supabase) {
      try {
        await (supabase.from('brand_members' as any) as any)
          .update({ role, updated_at: new Date().toISOString() })
          .match({ brand_id: brandId, user_id: userId });
      } catch {}

      // Broadcast real-time terjamin ke semua room terkait
      const broadcastPayload = {
        brandId,
        type: 'role_updated',
        userId,
        userEmail: cleanEmail,
        newRole: role,
        brandName,
      };

      sendRealtimeBroadcast(`brand_room_${brandId}`, 'member_update', broadcastPayload).catch(() => {});
      if (cleanEmail) {
        sendRealtimeBroadcast(`user_room_${cleanEmail}`, 'member_update', broadcastPayload).catch(() => {});
      }
      if (userId) {
        sendRealtimeBroadcast(`user_room_${userId}`, 'member_update', broadcastPayload).catch(() => {});
      }
    }

    // 3. Update localStorage brand_members & trigger storage event
    if (typeof window !== 'undefined') {
      try {
        const key = 'uda_brand_members_' + brandId;
        const raw = localStorage.getItem(key);
        if (raw) {
          const list = JSON.parse(raw);
          const updated = list.map((m: any) =>
            m.id === userId || (userEmail && m.email?.toLowerCase() === userEmail.toLowerCase())
              ? { ...m, role }
              : m
          );
          localStorage.setItem(key, JSON.stringify(updated));
        }

        const rawTeam = localStorage.getItem('uda_team_membership_' + userId);
        if (rawTeam) {
          const team = JSON.parse(rawTeam);
          if (team.brand_id === brandId) {
            team.role = role;
            localStorage.setItem('uda_team_membership_' + userId, JSON.stringify(team));
          }
        }

        localStorage.setItem('uda_system_role_' + userId, role);

        window.dispatchEvent(
          new CustomEvent('uda_member_role_changed', {
            detail: { brandId, userId, role, brandName },
          })
        );
        window.dispatchEvent(new Event('storage'));
      } catch (e) {}
    }

    const member = mockMembers.find((m) => m.brand_id === brandId && m.user_id === userId);
    if (member) {
      member.role = role;
      member.updated_at = new Date().toISOString();
      return member;
    }
    return null;
  }

  static async removeMember(brandId: string, userId: string, brandName?: string, userEmail?: string): Promise<boolean> {
    return MemberService.leaveTeam(userId, userEmail, brandId, brandName);
  }

  static async createInvitation(payload: {
    brandId: string;
    email: string;
    role: BrandRole;
    invitedBy: string;
  }): Promise<Invitation> {
    const newInv: Invitation = {
      id: `inv-${Date.now()}`,
      brand_id: payload.brandId,
      email: payload.email,
      role: payload.role,
      token: Math.random().toString(36).substring(2, 15),
      status: 'pending',
      invited_by: payload.invitedBy,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
    };

    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          brand_id: payload.brandId,
          email: payload.email,
          role: payload.role,
          invited_by: payload.invitedBy,
        } as any)
        .select()
        .single();
      if (!error && data) return data as Invitation;
    }

    mockInvitations.push(newInv);
    return newInv;
  }

  static async getInvitations(brandId: string): Promise<Invitation[]> {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.from('invitations').select('*').eq('brand_id', brandId);
      if (!error && data) return data as Invitation[];
    }
    return mockInvitations.filter((i) => i.brand_id === brandId);
  }

  // Cek keanggotaan tim user di brand tertentu (status undangan yang sudah diterima)
  static async getTeamMembership(userId: string, userEmail?: string): Promise<{
    brand_id: string;
    brand_name: string;
    role: string;
    joined_at?: string;
    inviter_name?: string;
    inviter_email?: string;
  } | null> {
    if (!userId && !userEmail) return null;

    // 1. Cek dari localStorage 'uda_team_membership_[userId]'
    if (typeof window !== 'undefined' && userId) {
      try {
        const raw = localStorage.getItem('uda_team_membership_' + userId);
        if (raw) return JSON.parse(raw);
      } catch {}

      // 2. Cek dari 'uda_brand_invitations' dengan status accepted
      try {
        const rawInv = localStorage.getItem('uda_brand_invitations');
        if (rawInv) {
          const list = JSON.parse(rawInv);
          const match = list.find(
            (inv: any) =>
              inv.status === 'accepted' &&
              ((userEmail && inv.target_email?.toLowerCase() === userEmail.toLowerCase()) ||
               (userId && inv.target_user_id === userId))
          );
          if (match) {
            return {
              brand_id: match.brand_id,
              brand_name: match.brand_name || 'Brand Tim',
              role: match.role || 'editor',
              joined_at: match.created_at,
              inviter_name: match.inviter_name,
              inviter_email: match.inviter_email,
            };
          }
        }
      } catch {}
    }

    // 3. Cek database brand_members di Supabase jika user bukan owner dari brand tersebut
    const supabase = createClient();
    if (supabase && userId) {
      try {
        const { data: memberRows } = await (supabase.from('brand_members' as any) as any)
          .select('brand_id, role, brands(id, name, owner_id)')
          .eq('user_id', userId);

        if (memberRows && memberRows.length > 0) {
          const nonOwner = memberRows.find((m: any) => m.brands && m.brands.owner_id !== userId);
          if (nonOwner) {
            return {
              brand_id: nonOwner.brand_id,
              brand_name: nonOwner.brands?.name || 'Brand Kolaborasi',
              role: nonOwner.role,
            };
          }
        }
      } catch (e) {}
    }

    return null;
  }

  // Keluar dari keanggotaan TIM
  static async leaveTeam(userId: string, userEmail?: string, brandId?: string, brandName?: string): Promise<boolean> {
    const supabase = createClient();

    // 1. Panggil server API /api/invitations dengan admin client agar update ke database Supabase dan auth user_metadata terjamin tanpa terhalang RLS
    try {
      await fetch('/api/invitations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave',
          userId,
          userEmail,
          brandId,
          brandName,
        }),
      });
    } catch (apiErr) {
      console.warn('API leave team fetch warning:', apiErr);
    }

    // 2. Broadcast via Supabase channel jika ada brandId
    if (supabase && brandId) {
      const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : undefined;
      const broadcastPayload = {
        brandId,
        type: 'member_removed',
        userId,
        userEmail: cleanEmail,
        brandName,
      };

      sendRealtimeBroadcast(`brand_room_${brandId}`, 'member_update', broadcastPayload).catch(() => {});
      if (cleanEmail) {
        sendRealtimeBroadcast(`user_room_${cleanEmail}`, 'member_update', broadcastPayload).catch(() => {});
      }
      if (userId) {
        sendRealtimeBroadcast(`user_room_${userId}`, 'member_update', broadcastPayload).catch(() => {});
      }
    }

    // 2. Hapus record dari database brand_members via client jika ada sesi
    if (supabase && userId) {
      try {
        let query = (supabase.from('brand_members' as any) as any).delete().eq('user_id', userId);
        if (brandId) {
          query = query.eq('brand_id', brandId);
        }
        await query;
      } catch (e) {}

      // Hanya downgrade ke 'free' jika pengguna BUKAN owner brand yang masih punya langganan aktif.
      // Periksa apakah masih ada brand yang dimiliki user ini ATAU apakah plan_until di DB masih aktif.
      // Jika user adalah owner dengan plan berbayar sendiri (plan_until belum expired), jangan downgrade!
      try {
        const { data: currentAcc } = await (supabase.from('accounts' as any) as any)
          .select('plan_code, plan_until')
          .eq('user_id', userId)
          .maybeSingle();

        const hasActivePaidPlan =
          currentAcc &&
          currentAcc.plan_code &&
          currentAcc.plan_code !== 'free' &&
          currentAcc.plan_until &&
          new Date(currentAcc.plan_until).getTime() > Date.now();

        // Cek apakah user masih jadi owner di brand lain (maka tidak perlu downgrade)
        const { data: ownedBrands } = await (supabase.from('brands' as any) as any)
          .select('id')
          .eq('owner_id', userId)
          .limit(1);
        const isStillBrandOwner = ownedBrands && ownedBrands.length > 0;

        if (!hasActivePaidPlan && !isStillBrandOwner) {
          await (supabase.from('accounts' as any) as any)
            .update({
              plan_code: 'free',
              plan_until: null,
              role: 'user',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
        }
      } catch (e) {}
    }

    // 3. Bersihkan local storage keanggotaan dan paksa status menjadi 'free'
    if (typeof window !== 'undefined') {
      try {
        if (userId) {
          localStorage.removeItem('uda_team_membership_' + userId);
          localStorage.removeItem('uda_system_role_' + userId);
          localStorage.removeItem('uda_last_upgraded_user');
          localStorage.removeItem('uda_user_plan_' + userId);
        }
        localStorage.removeItem('uda_team_membership');
        if (userEmail) {
          localStorage.removeItem('uda_user_plan_' + userEmail.toLowerCase());
        }

        // Hapus brand dari cache daftar brand lokal jika user bukan owner
        if (brandId) {
          const rawCustom = localStorage.getItem('uda_custom_brands');
          if (rawCustom) {
            const bList = JSON.parse(rawCustom);
            const filteredB = bList.filter((b: any) => !(b.id === brandId && b.owner_id !== userId));
            localStorage.setItem('uda_custom_brands', JSON.stringify(filteredB));
          }

          // Bersihkan dari uda_brand_members_[brandId]
          const key = 'uda_brand_members_' + brandId;
          const rawM = localStorage.getItem(key);
          if (rawM) {
            const members = JSON.parse(rawM);
            const filtered = members.filter((m: any) =>
              !(m.id === userId || (userEmail && m.email?.toLowerCase() === userEmail.toLowerCase()))
            );
            localStorage.setItem(key, JSON.stringify(filtered));
          }

          // Reset active brand jika yang aktif adalah brand yang ditinggalkan
          const currentActive = localStorage.getItem('uda_active_brand_id');
          if (currentActive === brandId) {
            localStorage.removeItem('uda_active_brand_id');
            localStorage.removeItem('uda_active_brand_name');
          }
        } else {
          const rawCustom = localStorage.getItem('uda_custom_brands');
          if (rawCustom && userId) {
            const bList = JSON.parse(rawCustom);
            const ownedOnly = bList.filter((b: any) => b.owner_id === userId);
            localStorage.setItem('uda_custom_brands', JSON.stringify(ownedOnly));
          }
        }

        // Tandai undangan di uda_brand_invitations sebagai 'left'
        const rawInv = localStorage.getItem('uda_brand_invitations');
        if (rawInv) {
          const list = JSON.parse(rawInv);
          const updated = list.map((inv: any) => {
            if (
              (brandId ? inv.brand_id === brandId : true) &&
              ((userEmail && inv.target_email?.toLowerCase() === userEmail.toLowerCase()) ||
               (userId && inv.target_user_id === userId))
            ) {
              return { ...inv, status: 'left' };
            }
            return inv;
          });
          localStorage.setItem('uda_brand_invitations', JSON.stringify(updated));
        }

        // Reset paket di uda_auth_account ke 'free' HANYA jika plan yang tersimpan bukan langganan berbayar aktif owner
        const rawAcc = localStorage.getItem('uda_auth_account');
        if (rawAcc) {
          const acc = JSON.parse(rawAcc);
          delete acc.team_member_brand_id;
          delete acc.team_member_brand_name;
          // Jangan downgrade jika user adalah pemilik langganan yang masih aktif (plan_until belum expired)
          const hasActivePaidPlanLocal =
            acc.plan_code &&
            acc.plan_code !== 'free' &&
            acc.plan_until &&
            new Date(acc.plan_until).getTime() > Date.now();
          if (!hasActivePaidPlanLocal) {
            acc.plan_code = 'free';
            acc.plan_until = null;
          }
          localStorage.setItem('uda_auth_account', JSON.stringify(acc));
        }
      } catch (e) {}
    }

    // 4. Dispatch event realtime agar seluruh UI (sidebar, header, halaman langganan, brand) sinkron seketika
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('uda_member_removed', {
          detail: {
            brandId,
            userId,
            email: userEmail,
            brandName,
          },
        })
      );

      // Dispatch perubahan plan HANYA jika memang perlu downgrade ke free (cek localStorage terkini)
      try {
        const rawAccFinal = localStorage.getItem('uda_auth_account');
        const accFinal = rawAccFinal ? JSON.parse(rawAccFinal) : null;
        const finalPlanCode = accFinal?.plan_code || 'free';
        const finalPlanUntil = accFinal?.plan_until || null;
        window.dispatchEvent(
          new CustomEvent('uda_account_updated', {
            detail: {
              userId,
              email: userEmail,
              planCode: finalPlanCode,
              planUntil: finalPlanUntil,
            },
          })
        );
      } catch {
        // Fallback jika localStorage tidak bisa dibaca
        window.dispatchEvent(
          new CustomEvent('uda_account_updated', {
            detail: {
              userId,
              email: userEmail,
              planCode: 'free',
              planUntil: null,
            },
          })
        );
      }

      window.dispatchEvent(new CustomEvent('uda_brand_switched', { detail: { brandId: null } }));
      window.dispatchEvent(new Event('storage'));
    }

    return true;
  }
}

