import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';
import { resolvePaymentDuration } from '@/services/plan.service';
import { formatWibDate } from '@/lib/date-utils';
import fs from 'fs';
import path from 'path';

const PAYMENTS_BACKUP_FILE = path.join(process.cwd(), '.server_payments.json');

function loadBackupPayments(): any[] {
  try {
    if (fs.existsSync(PAYMENTS_BACKUP_FILE)) {
      const content = fs.readFileSync(PAYMENTS_BACKUP_FILE, 'utf-8');
      return JSON.parse(content) || [];
    }
  } catch {}
  return [];
}

function saveBackupPayments(list: any[]) {
  try {
    fs.writeFileSync(PAYMENTS_BACKUP_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch {}
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
    if (db) {
      try {
        const [payRes, profRes] = await Promise.all([
          db.from('payments' as any).select('*').order('created_at', { ascending: false }),
          db.from('profiles' as any).select('id, full_name, email'),
        ]);

        if (!payRes.error && payRes.data) {
          const profMap = new Map((profRes.data || []).map((pr: any) => [pr.id, pr]));
          dbPayments = payRes.data.map((p: any) => {
            const prof: any = profMap.get(p.user_id) || {};
            const resolved = resolvePaymentDuration(p.duration_days, p.duration_label, p.amount, p.plan_code);
            return {
              id: p.id,
              userId: p.user_id,
              user: p.sender_name || prof.full_name || 'Pelanggan',
              email: prof.email || (p.sender_name ? `${p.sender_name.toLowerCase().replace(/\s+/g, '')}@gmail.com` : 'pelanggan@udaplanner.id'),
              plan: (p.plan_code as any) || 'pro',
              durationDays: resolved.days,
              durationLabel: resolved.label,
              amount: p.amount || 0,
              bank: `${p.sender_bank || 'Transfer'} — A/N ${p.sender_name || prof.full_name || 'Pelanggan'}`,
              proof: p.proof_path || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
              status: p.status || 'pending',
              date: formatWibDate(p.created_at),
              reason: p.admin_note,
            };
          });
        }
      } catch (err) {
        console.warn('GET payments db warning:', err);
      }
    }

    const backupList = loadBackupPayments();
    const dbIds = new Set(dbPayments.map((p) => p.id));
    const combined = [
      ...dbPayments,
      ...backupList.filter((bp: any) => !dbIds.has(bp.id)),
    ];

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

    const paymentId = body.id || `pay-${Date.now()}`;
    const planCode = body.planCode || body.planId || 'pro';
    const amount = Number(body.amount) || 0;
    const durationDays = Number(body.durationDays) || 30;
    const durationLabel = body.durationLabel || `${durationDays} Hari`;
    const senderName = body.senderName || body.userName || 'Pelanggan';
    const senderBank = body.senderBank || body.paymentMethod || 'Transfer Bank';
    const proofPath = body.proofPath || body.proofUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600';
    const userEmail = body.userEmail || (senderName ? `${senderName.toLowerCase().replace(/\s+/g, '')}@gmail.com` : 'pelanggan@udaplanner.id');
    const userId = body.userId || body.accountId || null;

    // Validasi pencegahan pengajuan ganda (Bug B4)
    if (db && userId) {
      try {
        const { data: existingPending } = await (db.from('payments' as any) as any)
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'pending')
          .limit(1)
          .maybeSingle();

        if (existingPending) {
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
    const existingPendingBackup = backupList.find(
      (p: any) => (p.userId === userId || p.email?.toLowerCase() === userEmail.toLowerCase()) && p.status === 'pending'
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

    let createdRecordId = paymentId;

    if (db && userId && userId.includes('-') && userId.length > 20) {
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

    const newPaymentRecord = {
      id: createdRecordId,
      userId,
      user: senderName,
      email: userEmail,
      plan: planCode,
      durationDays,
      durationLabel,
      amount,
      bank: `${senderBank} — A/N ${senderName}`,
      proof: proofPath,
      status: 'pending',
      date: formatWibDate(new Date()),
      created_at: new Date().toISOString(),
    };

    const filteredBackup = backupList.filter((p: any) => p.id !== newPaymentRecord.id);
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
    const { paymentId, status, adminId, notes, userId, userEmail, planCode, durationDays } = body;

    const adminClient = createAdminClient();
    const serverClient = createServerClient();
    const db = adminClient || serverClient;

    let targetUserId = userId;
    let targetPlan = planCode || 'pro';
    let targetDuration = durationDays || 30;

    if (db && paymentId) {
      try {
        // Ambil data pembayaran dari database
        const { data: payRecord } = await db
          .from('payments' as any)
          .select('*')
          .eq('id', paymentId)
          .maybeSingle();

        if (payRecord) {
          targetUserId = targetUserId || (payRecord as any).user_id;
          targetPlan = targetPlan || (payRecord as any).plan_code || 'pro';

          const resolved = resolvePaymentDuration(
            durationDays || (payRecord as any).duration_days,
            (payRecord as any).duration_label,
            (payRecord as any).amount,
            targetPlan
          );
          targetDuration = resolved.days;
        } else {
          const resolved = resolvePaymentDuration(durationDays, undefined, undefined, targetPlan);
          targetDuration = resolved.days;
        }

        // Update status pembayaran di database
        await (db.from('payments' as any) as any)
          .update({
            status,
            admin_note: notes || (status === 'approved' ? 'Disetujui oleh Administrator' : 'Ditolak'),
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', paymentId);

        // Jika disetujui, upgrade akun pengguna di tabel accounts
        if (status === 'approved') {
          // Jika userId belum ada tapi userEmail ada, cari user_id dari profiles
          if (!targetUserId && userEmail) {
            const { data: profRecord } = await db
              .from('profiles' as any)
              .select('id')
              .eq('email', userEmail)
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
                const currentPlanCode = (currentAcc as any).plan_code || 'free';

                // Jika paket sama, tambahkan durasi ke sisa masa aktif
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
    const backupList = loadBackupPayments();
    const updatedBackup = backupList.map((bp: any) => {
      if (bp.id === paymentId) {
        return {
          ...bp,
          status,
          reason: notes || (status === 'approved' ? 'Disetujui oleh Administrator' : 'Ditolak'),
        };
      }
      return bp;
    });
    saveBackupPayments(updatedBackup);

    return NextResponse.json({
      success: true,
      data: { id: paymentId, status },
      upgraded: status === 'approved' ? { userId: targetUserId, planCode: targetPlan } : null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
