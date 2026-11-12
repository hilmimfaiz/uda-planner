import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';
import { resolvePaymentDuration } from '@/services/plan.service';
import { formatWibDate } from '@/lib/date-utils';
import fs from 'fs';
import path from 'path';
import os from 'os';

const LOCAL_BACKUP_FILE = path.join(process.cwd(), '.server_payments.json');
const TMP_BACKUP_FILE = path.join(os.tmpdir(), '.server_payments.json');

// Global in-memory cache so Vercel serverless warm instances always retain recent payments instantly
const globalForPayments = globalThis as unknown as {
  __udaServerPayments?: any[];
};

function isDummyPayment(p: any): boolean {
  if (!p) return true;
  if (['pay-1', 'pay-2', 'pay-3'].includes(p.id)) return true;
  if (['Budi Santoso', 'PT Muda Kreatif Indonesia', 'Sarah Rahmawati'].includes(p.user)) return true;
  return false;
}

function loadBackupPayments(): any[] {
  const results: any[] = [];
  const seenIds = new Set<string>();

  const addItems = (items: any[]) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (item && item.id && !seenIds.has(item.id) && !isDummyPayment(item)) {
        seenIds.add(item.id);
        results.push(item);
      }
    }
  };

  if (globalForPayments.__udaServerPayments) {
    addItems(globalForPayments.__udaServerPayments);
  }

  for (const filePath of [LOCAL_BACKUP_FILE, TMP_BACKUP_FILE]) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        addItems(parsed);
      }
    } catch {}
  }

  return results;
}

function saveBackupPayments(list: any[]) {
  const cleanList = (list || []).filter((p) => !isDummyPayment(p));
  globalForPayments.__udaServerPayments = cleanList;

  for (const filePath of [LOCAL_BACKUP_FILE, TMP_BACKUP_FILE]) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(cleanList, null, 2), 'utf-8');
    } catch {}
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId') || undefined;
    const email = searchParams.get('email') || undefined;
    const all = searchParams.get('all') === 'true' || (!accountId && !email);

    const adminClient = createAdminClient();
    const serverClient = createServerClient();
    const db = adminClient || serverClient;

    let dbPayments: any[] = [];
    let dbSuccess = false;
    if (db) {
      try {
        const [payRes, profRes] = await Promise.all([
          db.from('payments' as any).select('*').order('created_at', { ascending: false }),
          db.from('profiles' as any).select('id, full_name, email'),
        ]);

        if (!payRes.error) {
          dbSuccess = true;
          const profMap = new Map((profRes.data || []).map((pr: any) => [pr.id, pr]));
          dbPayments = (payRes.data || []).map((p: any) => {
            const prof: any = profMap.get(p.user_id) || {};
            const planCode = (p.plan_code || 'pro').toLowerCase();
            const resolved = resolvePaymentDuration(p.duration_days, p.duration_label, p.amount, planCode);
            return {
              id: p.id,
              userId: p.user_id,
              user: p.sender_name || prof.full_name || 'Pelanggan',
              email: prof.email || (p.sender_name ? `${p.sender_name.toLowerCase().replace(/\s+/g, '')}@gmail.com` : 'pelanggan@udaplanner.id'),
              plan: planCode,
              plan_code: planCode,
              durationDays: resolved.days,
              durationLabel: resolved.label,
              amount: p.amount || 0,
              bank: `${p.sender_bank || 'Transfer'} — A/N ${p.sender_name || prof.full_name || 'Pelanggan'}`,
              proof: p.proof_path || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
              status: p.status || 'pending',
              date: formatWibDate(p.created_at),
              created_at: p.created_at,
              reason: p.admin_note,
            };
          });
        }
      } catch (err) {
        console.warn('GET payments db warning:', err);
      }
    }

    // Jika database Supabase aktif & query sukses, jadikan DB sebagai Single Source of Truth
    let combined: any[] = [];
    if (dbSuccess) {
      combined = dbPayments.filter((p: any) => !isDummyPayment(p));
      saveBackupPayments(combined);
    } else {
      const backupList = loadBackupPayments();
      combined = backupList.filter((p: any) => !isDummyPayment(p));
    }

    if (!all) {
      const filtered = combined.filter((p: any) => {
        if (accountId && (p.userId === accountId || p.id === accountId)) return true;
        if (email && p.email && p.email.toLowerCase() === email.toLowerCase()) return true;
        return false;
      });
      return NextResponse.json({ success: true, data: filtered });
    }

    return NextResponse.json({ success: true, data: combined });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const adminClient = createAdminClient();
    const serverClient = createServerClient();
    const db = adminClient || serverClient;

    const alreadyInsertedInDb = !!body.alreadyInsertedInDb;
    const paymentId = body.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pay-${Date.now()}`);
    const planCode = (body.planCode || body.planId || 'pro').toLowerCase();
    const amount = Number(body.amount) || 0;
    const durationDays = Number(body.durationDays) || 30;
    const durationLabel = body.durationLabel || `${durationDays} Hari`;
    const senderName = body.senderName || body.userName || 'Pelanggan';
    const senderBank = body.senderBank || body.paymentMethod || 'Transfer Bank';
    const proofPath = body.proofPath || body.proofUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600';
    const userEmail = body.userEmail || (senderName ? `${senderName.toLowerCase().replace(/\s+/g, '')}@gmail.com` : 'pelanggan@udaplanner.id');
    const userId = body.userId || body.accountId || null;

    // Validasi pencegahan pengajuan ganda (Bug B4) hanya jika belum di-insert oleh client di request yang sama
    if (!alreadyInsertedInDb && db && userId) {
      try {
        const { data: existingPending } = await (db.from('payments' as any) as any)
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'pending')
          .limit(1)
          .maybeSingle();

        if (existingPending && existingPending.id !== paymentId) {
          return NextResponse.json(
            {
              success: false,
              error: 'Anda masih memiliki pengajuan pembayaran yang sedang menunggu verifikasi admin. Mohon tunggu proses verifikasi selesai sebelum mengajukan kembali.',
            },
            { status: 400 }
          );
        }
      } catch (checkErr) {}
    }

    const backupList = loadBackupPayments();
    if (!alreadyInsertedInDb) {
      const existingPendingBackup = backupList.find(
        (p: any) =>
          p.id !== paymentId &&
          ((userId && p.userId === userId) || (userEmail && p.email?.toLowerCase() === userEmail.toLowerCase())) &&
          p.status === 'pending'
      );
      if (existingPendingBackup) {
        return NextResponse.json(
          {
            success: false,
            error: 'Anda masih memiliki pengajuan pembayaran yang sedang menunggu verifikasi admin. Mohon tunggu proses verifikasi selesai sebelum mengajukan kembali.',
          },
          { status: 400 }
        );
      }
    }

    let createdRecordId = paymentId;

    if (!alreadyInsertedInDb && db && userId && userId.includes('-') && userId.length > 20) {
      try {
        const { data: inserted, error: insertErr } = await (db.from('payments' as any) as any)
          .insert({
            user_id: userId,
            plan_code: planCode,
            amount,
            duration_days: durationDays,
            sender_name: senderName,
            sender_bank: senderBank,
            proof_path: proofPath,
            status: 'pending',
          })
          .select()
          .maybeSingle();

        if (!insertErr && inserted) {
          createdRecordId = inserted.id;
        }
      } catch (insertErr: any) {
        console.warn('DB insert payment warning:', insertErr.message);
      }
    }

    const nowIso = new Date().toISOString();
    const newPaymentRecord = {
      id: createdRecordId,
      userId,
      user: senderName,
      email: userEmail,
      plan: planCode,
      plan_code: planCode,
      durationDays,
      durationLabel,
      amount,
      bank: `${senderBank} — A/N ${senderName}`,
      proof: proofPath,
      status: 'pending',
      date: formatWibDate(new Date()),
      created_at: nowIso,
    };

    const filteredBackup = backupList.filter(
      (p: any) =>
        p.id !== newPaymentRecord.id &&
        !(
          p.status === 'pending' &&
          ((userId && p.userId === userId) || (userEmail && p.email?.toLowerCase() === userEmail.toLowerCase()))
        )
    );
    filteredBackup.unshift(newPaymentRecord);
    saveBackupPayments(filteredBackup);

    return NextResponse.json({ success: true, data: newPaymentRecord }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentId, status, notes, userId, userEmail, planCode, durationDays } = body;

    const adminClient = createAdminClient();
    const serverClient = createServerClient();
    const db = adminClient || serverClient;

    const backupList = loadBackupPayments();
    const backupMatch = backupList.find((bp: any) => bp.id === paymentId);

    let targetUserId = userId || backupMatch?.userId;
    let targetPlan = (planCode || backupMatch?.plan || backupMatch?.plan_code || 'pro').toLowerCase();
    let targetDuration = durationDays || backupMatch?.durationDays || 30;

    if (db && paymentId) {
      try {
        // Ambil data pembayaran dari database jika merupakan UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId);
        let payRecord: any = null;
        if (isUuid) {
          const { data } = await db
            .from('payments' as any)
            .select('*')
            .eq('id', paymentId)
            .maybeSingle();
          payRecord = data;
        }

        if (payRecord) {
          targetUserId = targetUserId || payRecord.user_id;
          // Prioritaskan planCode eksplisit atau plan_code pada record pembayaran
          targetPlan = (planCode || payRecord.plan_code || targetPlan || 'pro').toLowerCase();

          const resolved = resolvePaymentDuration(
            durationDays || payRecord.duration_days,
            payRecord.duration_label,
            payRecord.amount,
            targetPlan
          );
          targetDuration = resolved.days;
        } else {
          const resolved = resolvePaymentDuration(durationDays, backupMatch?.durationLabel, backupMatch?.amount, targetPlan);
          targetDuration = resolved.days;
        }

        // Update status pembayaran di database
        if (isUuid) {
          await (db.from('payments' as any) as any)
            .update({
              status,
              plan_code: targetPlan,
              admin_note: notes || (status === 'approved' ? 'Disetujui oleh Administrator' : 'Ditolak'),
              reviewed_at: new Date().toISOString(),
            })
            .eq('id', paymentId);
        }

        // Jika disetujui, upgrade akun pengguna di tabel accounts
        if (status === 'approved') {
          if (!targetUserId && (userEmail || backupMatch?.email)) {
            const targetMail = userEmail || backupMatch?.email;
            const { data: profRecord } = await db
              .from('profiles' as any)
              .select('id')
              .ilike('email', targetMail)
              .maybeSingle();
            if (profRecord) {
              targetUserId = (profRecord as any).id;
            }
          }

          let planUntil = body.customPlanUntil;
          if (!planUntil) {
            let baseStartTime = Date.now();
            if (targetUserId) {
              const { data: currentAcc } = await db
                .from('accounts' as any)
                .select('plan_code, plan_until')
                .or(`user_id.eq.${targetUserId},id.eq.${targetUserId}`)
                .maybeSingle();

              if (currentAcc && (currentAcc as any).plan_until) {
                const currentExpiry = new Date((currentAcc as any).plan_until).getTime();
                const isStillActive = !isNaN(currentExpiry) && currentExpiry > Date.now();
                const currentPlanCode = ((currentAcc as any).plan_code || 'free').toLowerCase();

                if (isStillActive && currentPlanCode === targetPlan) {
                  baseStartTime = currentExpiry;
                }
              }
            }
            planUntil = new Date(baseStartTime + targetDuration * 86400000).toISOString();
          }

          if (targetUserId) {
            await (db.from('accounts' as any) as any)
              .update({
                plan_code: targetPlan,
                plan_until: planUntil,
              })
              .or(`user_id.eq.${targetUserId},id.eq.${targetUserId}`);

            // Pastikan semua pembayaran pending lain dari user ini juga diselesaikan agar tidak menghalangi
            await (db.from('payments' as any) as any)
              .update({
                status: 'approved',
                reviewed_at: new Date().toISOString(),
              })
              .eq('user_id', targetUserId)
              .eq('status', 'pending');

            if (adminClient) {
              try {
                await adminClient.auth.admin.updateUserById(targetUserId, {
                  user_metadata: { plan_code: targetPlan },
                });
              } catch (metaErr) {
                console.warn('Update user metadata warning:', metaErr);
              }
            }
          }
        }
      } catch (dbErr: any) {
        console.warn('DB verifyPayment in route warning:', dbErr.message);
      }
    }

    // Update juga status di backup file server
    const updatedBackup = backupList.map((bp: any) => {
      if (bp.id === paymentId) {
        return {
          ...bp,
          plan: targetPlan,
          plan_code: targetPlan,
          status,
          reason: notes || (status === 'approved' ? 'Disetujui oleh Administrator' : 'Ditolak'),
        };
      }
      return bp;
    });
    saveBackupPayments(updatedBackup);

    return NextResponse.json({
      success: true,
      data: { id: paymentId, status, planCode: targetPlan },
      upgraded: status === 'approved' ? { userId: targetUserId, planCode: targetPlan } : null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids, olderThanDays } = body;

    const adminClient = createAdminClient();
    const serverClient = createServerClient();
    const db = adminClient || serverClient;

    const backupList = loadBackupPayments();
    let idsToDelete: string[] = [];

    if (Array.isArray(ids) && ids.length > 0) {
      idsToDelete = ids;
    } else if (typeof olderThanDays === 'number') {
      const cutoffTime = Date.now() - olderThanDays * 86400000;
      idsToDelete = backupList
        .filter((p: any) => {
          const t = p.created_at ? new Date(p.created_at).getTime() : 0;
          return t > 0 && t <= cutoffTime;
        })
        .map((p: any) => p.id);
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ success: true, message: 'Tidak ada data riwayat yang dihapus', count: 0 });
    }

    // Hapus HANYA dari tabel payments (data pengguna & status akun tidak disentuh sama sekali)
    if (db) {
      try {
        const uuidList = idsToDelete.filter((id) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        );
        if (uuidList.length > 0) {
          await (db.from('payments' as any) as any).delete().in('id', uuidList);
        }
      } catch (dbErr: any) {
        console.warn('DELETE payments from DB error:', dbErr.message);
      }
    }

    // Hapus dari backup file & cache server
    const deleteSet = new Set(idsToDelete);
    const updatedBackup = backupList.filter((p: any) => !deleteSet.has(p.id));
    saveBackupPayments(updatedBackup);

    return NextResponse.json({
      success: true,
      message: `${idsToDelete.length} riwayat pembayaran berhasil dihapus`,
      deletedCount: idsToDelete.length,
      deletedIds: idsToDelete,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
