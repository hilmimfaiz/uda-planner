import { createAdminClient, createServerClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const isUuid = (val?: string | null): boolean =>
  !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

const PAYMENTS_LOCAL_FILE = path.join(process.cwd(), '.server_payments.json');
const PAYMENTS_TMP_FILE = path.join(os.tmpdir(), '.server_payments.json');
const INVITATIONS_LOCAL_FILE = path.join(process.cwd(), '.server_invitations.json');

export async function performFullUserDeletion(targetUserId: string, targetEmail?: string) {
  const cleanEmail = (targetEmail || '').trim().toLowerCase();
  const adminClient = createAdminClient();
  const serverClient = createServerClient();
  const db = adminClient || serverClient;

  if (!db) {
    return { success: false, error: 'Database client tidak tersedia' };
  }

  // 1. Kumpulkan semua User ID & Profile ID terkait (baik dari targetUserId maupun cleanEmail)
  const userIdsSet = new Set<string>();
  if (isUuid(targetUserId)) {
    userIdsSet.add(targetUserId);
  }

  if (adminClient) {
    try {
      const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const matched = ((listData as any)?.users || []).filter(
        (u: any) =>
          u.id === targetUserId ||
          (cleanEmail && u.email?.toLowerCase().trim() === cleanEmail)
      );
      matched.forEach((u: any) => {
        if (u.id) userIdsSet.add(u.id);
      });
    } catch (e: any) {
      console.warn('admin.listUsers error during user deletion:', e.message);
    }
  }

  // Cari di profiles berdasarkan email
  if (cleanEmail) {
    try {
      const { data: profs } = await db.from('profiles' as any).select('id, email').ilike('email', cleanEmail);
      if (Array.isArray(profs)) {
        profs.forEach((p: any) => {
          if (p.id) userIdsSet.add(p.id);
        });
      }
    } catch {}

    try {
      const { data: accs } = await db.from('accounts' as any).select('id, user_id, email').ilike('email', cleanEmail);
      if (Array.isArray(accs)) {
        accs.forEach((a: any) => {
          if (a.id) userIdsSet.add(a.id);
          if (a.user_id) userIdsSet.add(a.user_id);
        });
      }
    } catch {}
  }

  // Cari di accounts berdasarkan targetUserId
  if (targetUserId) {
    try {
      const { data: accs } = await db.from('accounts' as any).select('id, user_id').or(`id.eq.${targetUserId},user_id.eq.${targetUserId}`);
      if (Array.isArray(accs)) {
        accs.forEach((a: any) => {
          if (a.id) userIdsSet.add(a.id);
          if (a.user_id) userIdsSet.add(a.user_id);
        });
      }
    } catch {}
  }

  const allUserIds = Array.from(userIdsSet).filter(Boolean);

  // 2. Kumpulkan semua ID Brand yang dimiliki atau dibuat oleh pengguna
  const brandIdsSet = new Set<string>();
  if (allUserIds.length > 0) {
    try {
      const { data: ownedBrands } = await db.from('brands' as any).select('id').in('owner_id', allUserIds);
      if (Array.isArray(ownedBrands)) {
        ownedBrands.forEach((b: any) => {
          if (b.id) brandIdsSet.add(b.id);
        });
      }
    } catch {}

    try {
      const { data: createdBrands } = await db.from('brands' as any).select('id').in('created_by', allUserIds);
      if (Array.isArray(createdBrands)) {
        createdBrands.forEach((b: any) => {
          if (b.id) brandIdsSet.add(b.id);
        });
      }
    } catch {}

    try {
      const { data: accBrands } = await db.from('brands' as any).select('id').in('account_id', allUserIds);
      if (Array.isArray(accBrands)) {
        accBrands.forEach((b: any) => {
          if (b.id) brandIdsSet.add(b.id);
        });
      }
    } catch {}
  }

  const allBrandIds = Array.from(brandIdsSet).filter(Boolean);

  // 3. Kumpulkan semua ID Postingan terkait
  const postIdsSet = new Set<string>();
  if (allUserIds.length > 0) {
    try {
      const { data: userPosts } = await db.from('posts' as any).select('id').in('created_by', allUserIds);
      if (Array.isArray(userPosts)) {
        userPosts.forEach((p: any) => {
          if (p.id) postIdsSet.add(p.id);
        });
      }
    } catch {}
  }
  if (allBrandIds.length > 0) {
    try {
      const { data: brandPosts } = await db.from('posts' as any).select('id').in('brand_id', allBrandIds);
      if (Array.isArray(brandPosts)) {
        brandPosts.forEach((p: any) => {
          if (p.id) postIdsSet.add(p.id);
        });
      }
    } catch {}
  }

  const allPostIds = Array.from(postIdsSet).filter(Boolean);

  // 4. Jalankan penghapusan berjenjang (Cascade Deletion) di Database
  // 4a. Hapus post_assets & comments terkait postingan
  if (allPostIds.length > 0) {
    try {
      await Promise.allSettled([
        db.from('post_assets' as any).delete().in('post_id', allPostIds),
        db.from('comments' as any).delete().in('post_id', allPostIds),
      ]);
    } catch {}
  }

  // 4b. Hapus postingan dan komentar pengguna
  if (allUserIds.length > 0) {
    try {
      await db.from('comments' as any).delete().in('user_id', allUserIds);
    } catch {}
  }
  if (allPostIds.length > 0) {
    try {
      await db.from('posts' as any).delete().in('id', allPostIds);
    } catch {}
  }
  if (allUserIds.length > 0) {
    try {
      await db.from('posts' as any).delete().in('created_by', allUserIds);
    } catch {}
  }

  // 4c. Hapus snippets dan content_pillars
  if (allUserIds.length > 0) {
    try {
      await db.from('snippets' as any).delete().in('created_by', allUserIds);
    } catch {}
  }
  if (allBrandIds.length > 0) {
    try {
      await Promise.allSettled([
        db.from('snippets' as any).delete().in('brand_id', allBrandIds),
        db.from('content_pillars' as any).delete().in('brand_id', allBrandIds),
      ]);
    } catch {}
  }

  // 4d. Hapus notifikasi (user_id & brand_id)
  if (allUserIds.length > 0) {
    try {
      await db.from('notifications' as any).delete().in('user_id', allUserIds);
    } catch {}
  }
  if (allBrandIds.length > 0) {
    try {
      await db.from('notifications' as any).delete().in('brand_id', allBrandIds);
    } catch {}
  }

  // 4e. Hapus undangan (invitations)
  if (cleanEmail) {
    try {
      await db.from('invitations' as any).delete().ilike('email', cleanEmail);
    } catch {}
  }
  if (allUserIds.length > 0) {
    try {
      await db.from('invitations' as any).delete().in('invited_by', allUserIds);
    } catch {}
  }
  if (allBrandIds.length > 0) {
    try {
      await db.from('invitations' as any).delete().in('brand_id', allBrandIds);
    } catch {}
  }

  // 4f. Hapus anggota brand (brand_members)
  if (allUserIds.length > 0) {
    try {
      await db.from('brand_members' as any).delete().in('user_id', allUserIds);
    } catch {}
  }
  if (allBrandIds.length > 0) {
    try {
      await db.from('brand_members' as any).delete().in('brand_id', allBrandIds);
    } catch {}
  }

  // 4g. Hapus brand
  if (allBrandIds.length > 0) {
    try {
      await db.from('brands' as any).delete().in('id', allBrandIds);
    } catch {}
  }
  if (allUserIds.length > 0) {
    try {
      await db.from('brands' as any).delete().or(`owner_id.in.(${allUserIds.join(',')}),created_by.in.(${allUserIds.join(',')})`);
    } catch {}
  }

  // 4h. Hapus riwayat & pengajuan pembayaran (payments)
  if (allUserIds.length > 0) {
    try {
      await db.from('payments' as any).delete().or(`user_id.in.(${allUserIds.join(',')}),account_id.in.(${allUserIds.join(',')})`);
    } catch {}
  }
  if (cleanEmail) {
    try {
      await (db.from('payments' as any) as any).delete().ilike('user_email', cleanEmail);
    } catch {}
  }

  // 4i. Hapus log verifikasi
  if (allUserIds.length > 0) {
    try {
      await db.from('verification_logs' as any).delete().in('user_id', allUserIds);
    } catch {}
  }
  if (cleanEmail) {
    try {
      await db.from('verification_logs' as any).delete().ilike('email', cleanEmail);
    } catch {}
  }

  // 4j. Hapus accounts & profiles
  if (allUserIds.length > 0) {
    try {
      await db.from('accounts' as any).delete().or(`user_id.in.(${allUserIds.join(',')}),id.in.(${allUserIds.join(',')})`);
    } catch {}
  }
  if (cleanEmail) {
    try {
      await db.from('accounts' as any).delete().ilike('email', cleanEmail);
    } catch {}
  }

  if (allUserIds.length > 0) {
    try {
      await db.from('profiles' as any).delete().in('id', allUserIds);
    } catch {}
  }
  if (cleanEmail) {
    try {
      await db.from('profiles' as any).delete().ilike('email', cleanEmail);
    } catch {}
  }

  // 4k. Hapus pengguna dari Supabase Auth
  if (adminClient) {
    for (const uid of allUserIds) {
      if (isUuid(uid)) {
        try {
          await adminClient.auth.admin.deleteUser(uid);
        } catch (e: any) {
          console.warn('adminClient.auth.admin.deleteUser error:', e.message);
        }
      }
    }
  }

  // 5. Bersihkan backup file server (.server_payments.json & .server_invitations.json)
  try {
    for (const filePath of [PAYMENTS_LOCAL_FILE, PAYMENTS_TMP_FILE]) {
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const payments = JSON.parse(content);
          if (Array.isArray(payments)) {
            const filtered = payments.filter((p: any) => {
              if (!p) return false;
              const pEmail = (p.user_email || p.email)?.trim().toLowerCase();
              const pUserId = (p.userId || p.user_id || p.accountId)?.trim();
              if (cleanEmail && pEmail === cleanEmail) return false;
              if (pUserId && allUserIds.includes(pUserId)) return false;
              return true;
            });
            fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf-8');
          }
        } catch {}
      }
    }

    const globalForPayments = globalThis as any;
    if (Array.isArray(globalForPayments.__udaServerPayments)) {
      globalForPayments.__udaServerPayments = globalForPayments.__udaServerPayments.filter((p: any) => {
        if (!p) return false;
        const pEmail = (p.user_email || p.email)?.trim().toLowerCase();
        const pUserId = (p.userId || p.user_id || p.accountId)?.trim();
        if (cleanEmail && pEmail === cleanEmail) return false;
        if (pUserId && allUserIds.includes(pUserId)) return false;
        return true;
      });
    }

    if (fs.existsSync(INVITATIONS_LOCAL_FILE)) {
      try {
        const content = fs.readFileSync(INVITATIONS_LOCAL_FILE, 'utf-8');
        const invites = JSON.parse(content);
        if (Array.isArray(invites)) {
          const filtered = invites.filter((inv: any) => {
            if (!inv) return false;
            const invEmail = (inv.email || inv.target_email)?.trim().toLowerCase();
            const invSender = inv.inviter_email?.trim().toLowerCase();
            const invUser = (inv.invited_by || inv.user_id)?.trim();
            if (cleanEmail && (invEmail === cleanEmail || invSender === cleanEmail)) return false;
            if (invUser && allUserIds.includes(invUser)) return false;
            if (inv.brand_id && allBrandIds.includes(inv.brand_id)) return false;
            return true;
          });
          fs.writeFileSync(INVITATIONS_LOCAL_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
        }
      } catch {}
    }
  } catch (fsErr: any) {
    console.warn('Cleaning server backup files warning:', fsErr.message);
  }

  return { success: true, deletedBrandIds: allBrandIds };
}

