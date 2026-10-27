import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';

const BACKUP_FILE = path.join(process.cwd(), '.server_invitations.json');

function loadBackupInvites(): any[] {
  try {
    if (fs.existsSync(BACKUP_FILE)) {
      const content = fs.readFileSync(BACKUP_FILE, 'utf-8');
      return JSON.parse(content) || [];
    }
  } catch {}
  return [];
}

function saveBackupInvites(list: any[]) {
  try {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch {}
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email')?.trim().toLowerCase() || '';
    const userId = searchParams.get('userId')?.trim() || '';
    const brandId = searchParams.get('brandId')?.trim() || '';

    const admin = createAdminClient();
    let invites: any[] = [];

    // 1. Cek dari Supabase jika tersedia
    if (admin) {
      try {
        let query: any = (admin.from('invitations' as any) as any).select('*, brands(id, name, avatar_url, owner_id)');
        if (brandId) {
          query = query.eq('brand_id', brandId);
        } else if (email) {
          query = query.ilike('email', email);
        }

        const { data, error } = await query;
        if (!error && data) {
          invites = data.map((inv: any) => ({
            id: inv.id,
            brand_id: inv.brand_id,
            brand_name: inv.brands?.name || 'Brand',
            brand_avatar: inv.brands?.avatar_url || null,
            owner_id: inv.brands?.owner_id || null,
            email: (inv.email || '').toLowerCase(),
            target_email: (inv.email || '').toLowerCase(),
            target_user_id: inv.target_user_id || null,
            role: inv.role || 'editor',
            token: inv.token,
            invited_by: inv.invited_by,
            status: inv.status || 'pending',
            created_at: inv.created_at,
            expires_at: inv.expires_at,
          }));
        }
      } catch (err) {
        console.warn('Supabase get invitations error:', err);
      }
    }

    // 2. Gabungkan dengan server backup
    const backup = loadBackupInvites();
    backup.forEach((b) => {
      const bEmail = (b.target_email || b.email || '').toLowerCase().trim();
      const bUserId = b.target_user_id || b.user_id || '';
      const bBrandId = b.brand_id || '';

      const matchBrand = brandId ? bBrandId === brandId : true;
      const matchUser = (email && bEmail === email) || (userId && bUserId === userId);

      if (matchBrand && (brandId ? true : matchUser)) {
        const existingIdx = invites.findIndex(
          (inv) => inv.id === b.id || (inv.brand_id === b.brand_id && (inv.email === bEmail || inv.target_email === bEmail))
        );
        if (existingIdx >= 0) {
          invites[existingIdx] = {
            ...b,
            ...invites[existingIdx],
            brand_name: invites[existingIdx].brand_name || b.brand_name || 'Brand',
            brand_avatar: invites[existingIdx].brand_avatar || b.brand_avatar,
            owner_id: invites[existingIdx].owner_id || b.owner_id,
            inviter_name: b.inviter_name || invites[existingIdx].inviter_name || 'Owner',
            inviter_email: b.inviter_email || invites[existingIdx].inviter_email,
          };
        } else {
          invites.push(b);
        }
      }
    });

    return NextResponse.json({ success: true, invitations: invites });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      brandId,
      brandName,
      brandAvatar,
      targetEmail,
      targetUserId,
      targetName,
      targetAvatar,
      role = 'editor',
      inviterId,
      inviterName,
      inviterEmail,
    } = body;

    const cleanEmail = (targetEmail || '').trim().toLowerCase();
    if (!cleanEmail || !brandId) {
      return NextResponse.json({ success: false, error: 'Email tujuan dan brand ID diperlukan.' }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Tentukan Owner dari Brand yang sedang mengundang
    let currentBrandOwnerId = inviterId || '';
    if (admin && brandId) {
      try {
        const { data: bData }: any = await (admin.from('brands' as any) as any).select('owner_id, name, avatar_url').eq('id', brandId).maybeSingle();
        if (bData?.owner_id) {
          currentBrandOwnerId = bData.owner_id;
        }
      } catch (e) {}
    }

    // 2. Resolve target user ID jika belum ada
    let resolvedTargetId = targetUserId || null;
    let resolvedTargetName = targetName || cleanEmail.split('@')[0];
    let resolvedTargetAvatar = targetAvatar || null;

    if (admin && (!resolvedTargetId || !resolvedTargetId.includes('-'))) {
      try {
        const { data: pData }: any = await (admin.from('profiles' as any) as any).select('id, full_name, avatar_url').ilike('email', cleanEmail).maybeSingle();
        if (pData?.id) {
          resolvedTargetId = pData.id;
          if (pData.full_name) resolvedTargetName = pData.full_name;
          if (pData.avatar_url) resolvedTargetAvatar = pData.avatar_url;
        }
      } catch (e) {}
    }

    // 3. ATURAN 1-OWNER:
    // "Pengguna yang di undang oleh owner bisa diundang lagi lebih dari 1 brand oleh owner.
    // namun, ownernya hanya 1 saja dari paket langganannya tidak bisa owner yang berbeda jika masuk ke brand yang lain."
    if (admin && resolvedTargetId) {
      try {
        const { data: existingMemberships }: any = await (admin.from('brand_members' as any) as any)
          .select('brand_id, brands(id, name, owner_id)')
          .eq('user_id', resolvedTargetId);

        if (existingMemberships && existingMemberships.length > 0) {
          for (const m of existingMemberships as any[]) {
            const existingOwner = m.brands?.owner_id;
            // Jika user sudah menjadi anggota di brand milik Owner yang BERBEDA
            if (existingOwner && existingOwner !== currentBrandOwnerId && existingOwner !== resolvedTargetId) {
              return NextResponse.json({
                success: false,
                error: `Pengguna ini sudah terdaftar dalam tim dari Owner lain. Paket Langganan Tim hanya mengizinkan pengguna bergabung dengan 1 Owner.`,
              }, { status: 400 });
            }
          }
        }
      } catch (checkErr) {
        console.warn('Check 1-owner rule warning:', checkErr);
      }
    }

    // Cek juga dari database backup undangan yang sudah diterima
    const backupInvites = loadBackupInvites();
    const alreadyAcceptedAnotherOwner = backupInvites.some((inv: any) => {
      const isSameUser = (inv.target_email || inv.email)?.toLowerCase() === cleanEmail || (resolvedTargetId && inv.target_user_id === resolvedTargetId);
      const isAccepted = inv.status === 'accepted';
      const isDifferentOwner = inv.owner_id && currentBrandOwnerId && inv.owner_id !== currentBrandOwnerId;
      return isSameUser && isAccepted && isDifferentOwner;
    });

    if (alreadyAcceptedAnotherOwner) {
      return NextResponse.json({
        success: false,
        error: `Pengguna ini sudah terdaftar dalam tim dari Owner lain. Paket Langganan Tim hanya mengizinkan pengguna bergabung dengan 1 Owner.`,
      }, { status: 400 });
    }

    const inviteId = `inv-${Date.now()}`;
    const token = Math.random().toString(36).substring(2, 12);
    const createdAt = new Date().toISOString();

    const newInviteRecord = {
      id: inviteId,
      brand_id: brandId,
      brand_name: brandName || 'Brand',
      brand_avatar: brandAvatar || null,
      owner_id: currentBrandOwnerId,
      email: cleanEmail,
      target_email: cleanEmail,
      target_user_id: resolvedTargetId,
      target_name: resolvedTargetName,
      target_avatar: resolvedTargetAvatar,
      role,
      token,
      invited_by: inviterId || null,
      inviter_name: inviterName || 'Owner',
      inviter_email: inviterEmail || '',
      status: 'pending',
      created_at: createdAt,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    };

    // 4. Simpan di Supabase database via admin client
    if (admin) {
      try {
        await admin.from('invitations' as any).insert({
          brand_id: brandId,
          email: cleanEmail,
          role,
          invited_by: inviterId,
          status: 'pending',
        } as any);

        // Jika user terdaftar, masukkan ke tabel notifications Supabase
        if (resolvedTargetId) {
          await admin.from('notifications' as any).insert({
            user_id: resolvedTargetId,
            type: 'team_invite',
            message: `${inviterName || 'Owner'} mengundang Anda bergabung ke brand "${brandName}" sebagai ${role.toUpperCase()}.`,
            link: '/app/notifikasi',
            is_read: false,
          } as any);
        }
      } catch (dbErr) {
        console.warn('Supabase insert invite warning:', dbErr);
      }
    }

    // 5. Simpan di backup file server agar realtime antar browser
    const all = loadBackupInvites();
    const filtered = all.filter((i) => !(i.brand_id === brandId && (i.target_email || i.email)?.toLowerCase() === cleanEmail));
    filtered.unshift(newInviteRecord);
    saveBackupInvites(filtered);

    return NextResponse.json({ success: true, invitation: newInviteRecord });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { inviteId, brandId, action, userId, userEmail, userName, role } = body;

    const admin = createAdminClient();

    if (action === 'accept') {
      // 1. Update status invitation di Supabase
      if (admin && inviteId) {
        try {
          await admin
            .from('invitations' as any)
            .update({ status: 'accepted' })
            .eq('id', inviteId);
        } catch {}
      }

      // 2. Tambah ke brand_members di Supabase & jadikan langganan TIM
      if (admin && brandId && userId) {
        try {
          // Cek apakah sudah terdaftar sebagai anggota
          const { data: existingMember } = await admin
            .from('brand_members' as any)
            .select('id')
            .eq('brand_id', brandId)
            .eq('user_id', userId)
            .maybeSingle();

          if (!existingMember) {
            await admin
              .from('brand_members' as any)
              .insert({
                brand_id: brandId,
                user_id: userId,
                role: role || 'editor',
              } as any);
          }

          // Update plan akun target menjadi team
          await admin
            .from('accounts' as any)
            .update({ plan_code: 'team', role: 'user', updated_at: new Date().toISOString() })
            .or(`user_id.eq.${userId},id.eq.${userId}`);

          // Update user metadata di Auth
          try {
            await admin.auth.admin.updateUserById(userId, {
              user_metadata: { plan_code: 'team' },
            });
          } catch (mErr) {}
        } catch (memberErr) {
          console.warn('Supabase add member from invite error:', memberErr);
        }
      }

      // Update backup server
      const all = loadBackupInvites();
      const updated = all.map((i) =>
        i.id === inviteId || (i.brand_id === brandId && (i.target_email || i.email)?.toLowerCase() === userEmail?.toLowerCase())
          ? { ...i, status: 'accepted', target_user_id: userId }
          : i
      );
      saveBackupInvites(updated);
    } else if (action === 'reject') {
      if (admin && inviteId) {
        try {
          await admin
            .from('invitations' as any)
            .update({ status: 'cancelled' })
            .eq('id', inviteId);
        } catch {}
      }

      const all = loadBackupInvites();
      const updated = all.map((i) =>
        i.id === inviteId ? { ...i, status: 'cancelled' } : i
      );
      saveBackupInvites(updated);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
