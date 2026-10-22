import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment.service';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';
import { resolvePaymentDuration } from '@/services/plan.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId') || undefined;
    const email = searchParams.get('email') || undefined;
    const payments = await PaymentService.getPayments(accountId, email);
    return NextResponse.json({ success: true, data: payments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Jika admin client tersedia, lakukan insert dengan bypass RLS
    const adminClient = createAdminClient();
    if (adminClient && body.userId && body.userId.includes('-') && body.userId.length > 20) {
      try {
        await adminClient.from('payments' as any).insert({
          user_id: body.userId,
          plan_code: body.planCode || 'pro',
          amount: body.amount,
          duration_days: body.durationDays || 30,
          sender_name: body.senderName || 'Pelanggan',
          sender_bank: body.senderBank || 'Transfer Bank',
          proof_path: body.proofPath || body.proofUrl,
          status: 'pending',
        });
      } catch (insertErr: any) {
        console.warn('adminClient insert payment warning:', insertErr.message);
      }
    }

    const payment = await PaymentService.submitPayment({
      userId: body.userId,
      accountId: body.accountId || body.userId || 'acc-001',
      userEmail: body.userEmail,
      userName: body.userName || body.senderName,
      planId: body.planId,
      planCode: body.planCode,
      planDurationId: body.planDurationId,
      durationLabel: body.durationLabel,
      durationDays: body.durationDays,
      amount: body.amount,
      senderName: body.senderName,
      senderBank: body.senderBank,
      targetBankName: body.targetBankName,
      targetAccountNumber: body.targetAccountNumber,
      targetAccountName: body.targetAccountName,
      paymentMethod: body.paymentMethod,
      proofUrl: body.proofUrl,
      proofPath: body.proofPath,
      notes: body.notes,
    });
    return NextResponse.json({ success: true, data: payment }, { status: 201 });
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

                // Jika paket sama (misal Pro tambah Pro, atau Team tambah Team), tambahkan durasi ke sisa masa aktif
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
                updated_at: new Date().toISOString(),
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

    const updated = await PaymentService.verifyPayment(
      paymentId,
      status,
      adminId || 'admin-001',
      notes,
      {
        userId: targetUserId,
        planCode: targetPlan,
        durationDays: targetDuration,
      }
    );

    return NextResponse.json({
      success: true,
      data: updated,
      upgraded: status === 'approved' ? { userId: targetUserId, planCode: targetPlan } : null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
