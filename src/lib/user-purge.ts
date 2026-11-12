/**
 * Utility untuk membersihkan data pengguna secara menyeluruh dari browser client-side storage (localStorage)
 * Digunakan saat:
 * 1. Admin menghapus pengguna secara permanen dari panel admin
 * 2. Pengguna mendaftar kembali (registrasi akun baru) dengan email yang sama agar tidak ada data basi
 * 3. Inisialisasi ulang akun baru
 */

export function purgeClientUserData(params: { userId?: string; email?: string }): {
  deletedBrandIds: string[];
} {
  const deletedBrandIds: string[] = [];
  if (typeof window === 'undefined') return { deletedBrandIds };

  const cleanEmail = params.email ? params.email.trim().toLowerCase() : '';
  const targetId = params.userId ? params.userId.trim() : '';

  if (!cleanEmail && !targetId) {
    return { deletedBrandIds };
  }

  // 1. Bersihkan uda_custom_notifications
  try {
    const rawNotifs = localStorage.getItem('uda_custom_notifications');
    if (rawNotifs) {
      const notifs = JSON.parse(rawNotifs);
      if (Array.isArray(notifs)) {
        const filtered = notifs.filter((n: any) => {
          if (!n) return false;
          const nEmail = (n.target_email || n.invite_data?.target_email || n.email)?.trim().toLowerCase();
          const nUserId = (n.target_user_id || n.invite_data?.target_user_id || n.user_id)?.trim();
          if (cleanEmail && nEmail === cleanEmail) return false;
          if (targetId && nUserId === targetId) return false;
          return true;
        });
        localStorage.setItem('uda_custom_notifications', JSON.stringify(filtered));
      }
    }
  } catch {}

  // 2. Bersihkan uda_admin_payments
  try {
    const rawPayments = localStorage.getItem('uda_admin_payments');
    if (rawPayments) {
      const payments = JSON.parse(rawPayments);
      if (Array.isArray(payments)) {
        const filtered = payments.filter((p: any) => {
          if (!p) return false;
          const pEmail = (p.user_email || p.email)?.trim().toLowerCase();
          const pUserId = (p.user_id || p.userId || p.accountId)?.trim();
          if (cleanEmail && pEmail === cleanEmail) return false;
          if (targetId && pUserId === targetId) return false;
          return true;
        });
        localStorage.setItem('uda_admin_payments', JSON.stringify(filtered));
      }
    }
  } catch {}

  // 3. Bersihkan uda_custom_brands & kumpulkan brand IDs milik pengguna
  try {
    const rawBrands = localStorage.getItem('uda_custom_brands');
    if (rawBrands) {
      const brands = JSON.parse(rawBrands);
      if (Array.isArray(brands)) {
        const remainingBrands: any[] = [];
        brands.forEach((b: any) => {
          if (!b) return;
          const bOwnerId = (b.owner_id || b.accountId || b.account_id || b.created_by)?.trim();
          const bOwnerEmail = (b.owner_email || b.email)?.trim().toLowerCase();
          const isOwned =
            (cleanEmail && bOwnerEmail === cleanEmail) ||
            (targetId && bOwnerId === targetId);

          if (isOwned) {
            if (b.id) deletedBrandIds.push(b.id);
          } else {
            // Jika bukan pemilik, bersihkan user dari daftar members brand lain
            if (Array.isArray(b.members)) {
              b.members = b.members.filter((m: any) => {
                const mEmail = m.email?.trim().toLowerCase();
                const mId = (m.id || m.user_id)?.trim();
                return !(cleanEmail && mEmail === cleanEmail) && !(targetId && mId === targetId);
              });
            }
            remainingBrands.push(b);
          }
        });
        localStorage.setItem('uda_custom_brands', JSON.stringify(remainingBrands));
      }
    }
  } catch {}

  // 4. Bersihkan uda_brand_invitations
  try {
    const rawInv = localStorage.getItem('uda_brand_invitations');
    if (rawInv) {
      const invList = JSON.parse(rawInv);
      if (Array.isArray(invList)) {
        const filtered = invList.filter((inv: any) => {
          if (!inv) return false;
          const invEmail = (inv.target_email || inv.email)?.trim().toLowerCase();
          const invSenderEmail = inv.inviter_email?.trim().toLowerCase();
          const invUserId = (inv.user_id || inv.target_user_id || inv.invited_by)?.trim();
          if (cleanEmail && (invEmail === cleanEmail || invSenderEmail === cleanEmail)) return false;
          if (targetId && invUserId === targetId) return false;
          if (inv.brand_id && deletedBrandIds.includes(inv.brand_id)) return false;
          return true;
        });
        localStorage.setItem('uda_brand_invitations', JSON.stringify(filtered));
      }
    }
  } catch {}

  // 5. Bersihkan uda_custom_posts & snippets
  try {
    const rawPosts = localStorage.getItem('uda_custom_posts');
    if (rawPosts) {
      const posts = JSON.parse(rawPosts);
      if (Array.isArray(posts)) {
        const filtered = posts.filter((p: any) => {
          if (!p) return false;
          const pCreator = p.created_by?.trim();
          if (targetId && pCreator === targetId) return false;
          if (p.brand_id && deletedBrandIds.includes(p.brand_id)) return false;
          return true;
        });
        localStorage.setItem('uda_custom_posts', JSON.stringify(filtered));
      }
    }

    const rawSnippets = localStorage.getItem('uda_custom_snippets');
    if (rawSnippets) {
      const snippets = JSON.parse(rawSnippets);
      if (Array.isArray(snippets)) {
        const filtered = snippets.filter((s: any) => {
          if (!s) return false;
          if (targetId && s.created_by?.trim() === targetId) return false;
          if (s.brand_id && deletedBrandIds.includes(s.brand_id)) return false;
          return true;
        });
        localStorage.setItem('uda_custom_snippets', JSON.stringify(filtered));
      }
    }
  } catch {}

  // 6. Hapus kunci-kunci spesifik pengguna
  const keysToRemove: string[] = [];

  if (cleanEmail) {
    keysToRemove.push(
      `uda_user_plan_${cleanEmail}`,
      `uda_user_plan_until_${cleanEmail}`,
      `uda_subscription_cancelled_${cleanEmail}`,
      `uda_suspended_${cleanEmail}`,
      `uda_manually_verified_${cleanEmail}`,
      `uda_unverified_registration_${cleanEmail}`,
      `uda_unverified_user_${cleanEmail}`,
      `uda_is_admin_${cleanEmail}`
    );
  }

  if (targetId) {
    keysToRemove.push(
      `uda_cached_brands_${targetId}`,
      `uda_team_membership_${targetId}`,
      `uda_system_role_${targetId}`,
      `uda_custom_phone_${targetId}`,
      `uda_user_plan_${targetId}`,
      `uda_user_plan_until_${targetId}`,
      `uda_subscription_cancelled_${targetId}`,
      `uda_suspended_${targetId}`,
      `uda_custom_avatar_${targetId}`,
      `uda_profile_setup_done_${targetId}`,
      `uda_has_logged_in_before_${targetId}`,
      `uda_disable_auto_tour_${targetId}`,
      `uda_manually_verified_${targetId}`,
      `uda_unverified_registration_${targetId}`,
      `uda_unverified_user_${targetId}`,
      `uda_is_admin_${targetId}`
    );
  }

  deletedBrandIds.forEach((bId) => {
    keysToRemove.push(`uda_brand_members_${bId}`);
  });

  const activeBrandId = localStorage.getItem('uda_active_brand_id');
  if (activeBrandId && deletedBrandIds.includes(activeBrandId)) {
    keysToRemove.push('uda_active_brand_id');
  }

  // Scan seluruh kunci di localStorage untuk menemukan kecocokan yang tersisa
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (cleanEmail && k.toLowerCase().includes(cleanEmail)) {
        keysToRemove.push(k);
      }
      if (targetId && k.includes(targetId)) {
        keysToRemove.push(k);
      }
    }
  } catch {}

  keysToRemove.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {}
  });

  // 7. Bersihkan uda_last_upgraded_user
  try {
    const rawUp = localStorage.getItem('uda_last_upgraded_user');
    if (rawUp) {
      const parsedUp = JSON.parse(rawUp);
      if (
        (cleanEmail && parsedUp.email?.trim().toLowerCase() === cleanEmail) ||
        (targetId && (parsedUp.userId === targetId || parsedUp.accountId === targetId))
      ) {
        localStorage.removeItem('uda_last_upgraded_user');
      }
    }
  } catch {}

  // 8. Bersihkan uda_verifiable_users
  try {
    const rawVer = localStorage.getItem('uda_verifiable_users');
    if (rawVer) {
      const list = JSON.parse(rawVer);
      if (Array.isArray(list)) {
        const filtered = list.filter((u: any) => {
          if (!u) return false;
          const uEmail = u.email?.trim().toLowerCase();
          const uId = (u.userId || u.id)?.trim();
          if (cleanEmail && uEmail === cleanEmail) return false;
          if (targetId && uId === targetId) return false;
          return true;
        });
        localStorage.setItem('uda_verifiable_users', JSON.stringify(filtered));
      }
    }
  } catch {}

  // 9. Jika pengguna yang sedang aktif di browser ini adalah akun yang dihapus, bersihkan sesi auth lokal
  try {
    const rawAuth = localStorage.getItem('uda_auth_user');
    if (rawAuth) {
      const parsedAuth = JSON.parse(rawAuth);
      if (
        (cleanEmail && parsedAuth.email?.trim().toLowerCase() === cleanEmail) ||
        (targetId && parsedAuth.id === targetId)
      ) {
        localStorage.removeItem('uda_auth_user');
        localStorage.removeItem('uda_auth_profile');
        localStorage.removeItem('uda_auth_account');
      }
    }
  } catch {}

  // 10. Pancarkan event agar komponen UI langsung tersinkronisasi bersih seketika
  try {
    window.dispatchEvent(new CustomEvent('uda_notification_added', { detail: { count: 0 } }));
    window.dispatchEvent(new CustomEvent('uda_notifications_cleared'));
    window.dispatchEvent(new CustomEvent('uda_brand_updated'));
    window.dispatchEvent(new CustomEvent('uda_brand_switched'));
    window.dispatchEvent(new CustomEvent('uda_payment_deleted'));
    window.dispatchEvent(new CustomEvent('uda_post_updated'));
  } catch {}

  return { deletedBrandIds };
}
