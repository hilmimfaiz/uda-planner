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
      const { data, error } = await supabase
        .from('brand_members')
        .select('*, profiles(*)')
        .eq('brand_id', brandId);

      if (!error && data) {
        return (data as any[]).map((item) => ({
          ...item,
          profile: item.profiles,
        }));
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
}
