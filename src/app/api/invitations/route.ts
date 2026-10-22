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
        let query = admin.from('invitations' as any).select('*');
        if (brandId) {
          query = query.eq('brand_id', brandId);
        } else if (email) {
          query = query.ilike('email', email);
        }

        const { data, error } = await query;
        if (!error && data) {
          invites = data;
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
        if (!invites.some((inv) => inv.id === b.id || (inv.brand_id === b.brand_id && inv.email === bEmail))) {
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

    const inviteId = `inv-${Date.now()}`;
    const token = Math.random().toString(36).substring(2, 12);
    const createdAt = new Date().toISOString();

    const newInviteRecord = {
      id: inviteId,
      brand_id: brandId,
      brand_name: brandName || 'Brand',
      brand_avatar: brandAvatar || null,
      email: cleanEmail,
      target_email: cleanEmail,
      target_user_id: targetUserId || null,
      target_name: targetName || cleanEmail.split('@')[0],
      target_avatar: targetAvatar || null,
      role,
      token,
      invited_by: inviterId || null,
      inviter_name: inviterName || 'Owner',
      inviter_email: inviterEmail || '',
      status: 'pending',
      created_at: createdAt,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    };

    // 1. Simpan di Supabase database via admin client
    const admin = createAdminClient();
    if (admin) {
      try {
        await admin.from('invitations' as any).insert({
          brand_id: brandId,
          email: cleanEmail,
          role,
          invited_by: inviterId,
          status: 'pending',
        } as any);

        // Jika targetUserId terdaftar di auth.users, simpan ke tabel notifications
        if (targetUserId) {
          await admin.from('notifications' as any).insert({
            user_id: targetUserId,
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

    // 2. Simpan di backup file server agar realtime antar browser
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

      // 2. Tambah ke brand_members di Supabase
      if (admin && brandId && userId) {
        try {
          await admin
            .from('brand_members' as any)
            .insert({
              brand_id: brandId,
              user_id: userId,
              role: role || 'editor',
            } as any);

          // Update plan akun target menjadi team
          await admin
            .from('accounts' as any)
            .update({ plan_code: 'team', role: 'user', updated_at: new Date().toISOString() })
            .eq('user_id', userId);
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
