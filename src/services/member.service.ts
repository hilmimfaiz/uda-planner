import { createClient } from '@/lib/supabase/client';
import { initialBrandMembers, initialProfiles } from '@/lib/supabase/mock-data';
import { BrandMember, BrandRole, Invitation, Profile } from '@/types/database.types';

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

  static async updateRole(brandId: string, userId: string, role: BrandRole): Promise<BrandMember | null> {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await (supabase.from('brand_members' as any) as any)
        .update({ role, updated_at: new Date().toISOString() })
        .match({ brand_id: brandId, user_id: userId })
        .select()
        .single();
      if (!error && data) return data as BrandMember;
    }

    const member = mockMembers.find((m) => m.brand_id === brandId && m.user_id === userId);
    if (member) {
      member.role = role;
      member.updated_at = new Date().toISOString();
      return member;
    }
    return null;
  }

  static async removeMember(brandId: string, userId: string): Promise<boolean> {
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase
        .from('brand_members')
        .delete()
        .match({ brand_id: brandId, user_id: userId });
      if (!error) return true;
    }

    mockMembers = mockMembers.filter((m) => !(m.brand_id === brandId && m.user_id === userId));
    return true;
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
  static async leaveTeam(userId: string, userEmail?: string, brandId?: string): Promise<boolean> {
    const supabase = createClient();

    // 1. Hapus record dari database brand_members
    if (supabase && userId) {
      try {
        let query = (supabase.from('brand_members' as any) as any).delete().eq('user_id', userId);
        if (brandId) {
          query = query.eq('brand_id', brandId);
        }
        await query;
      } catch (e) {}
    }

    // 2. Bersihkan local storage keanggotaan
    if (typeof window !== 'undefined') {
      try {
        if (userId) {
          localStorage.removeItem('uda_team_membership_' + userId);
          localStorage.removeItem('uda_system_role_' + userId);
          localStorage.removeItem('uda_last_upgraded_user');
        }

        // Bersihkan dari uda_brand_members_[brandId]
        if (brandId) {
          const key = 'uda_brand_members_' + brandId;
          const rawM = localStorage.getItem(key);
          if (rawM) {
            const members = JSON.parse(rawM);
            const filtered = members.filter((m: any) =>
              !(m.id === userId || (userEmail && m.email?.toLowerCase() === userEmail.toLowerCase()))
            );
            localStorage.setItem(key, JSON.stringify(filtered));
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

        // Reset paket di uda_auth_account ke 'free'
        const rawAcc = localStorage.getItem('uda_auth_account');
        if (rawAcc) {
          const acc = JSON.parse(rawAcc);
          delete acc.team_member_brand_id;
          delete acc.team_member_brand_name;
          acc.plan_code = 'free';
          localStorage.setItem('uda_auth_account', JSON.stringify(acc));
        }
      } catch (e) {}
    }

    // 3. Kembalikan paket akun di database Supabase ke 'free'
    if (supabase && userId) {
      try {
        await (supabase.from('accounts' as any) as any)
          .update({
            plan_code: 'free',
            role: 'user',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
      } catch (e) {}
    }

    // 4. Dispatch event realtime agar seluruh UI (sidebar, header, halaman langganan) sinkron
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('uda_account_updated', { detail: { planCode: 'free' } }));
      window.dispatchEvent(new Event('storage'));
    }

    return true;
  }
}

