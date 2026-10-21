import { NextRequest, NextResponse } from 'next/server';
import { VerificationService } from '@/services/verification.service';

export async function GET() {
  try {
    const [users, stats, logs] = await Promise.all([
      VerificationService.getVerifiableUsers(),
      VerificationService.getVerificationStats(),
      VerificationService.getAuditLogs(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users,
        stats,
        logs,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, adminId, adminName, note } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID wajib disertakan.' }, { status: 400 });
    }

    if (action === 'resend_email') {
      const res = await VerificationService.resendVerificationEmail(userId, adminId, adminName);
      return NextResponse.json({ success: res.success, message: res.message });
    }

    // Default: manual verify email
    const success = await VerificationService.manualVerifyEmail(
      userId,
      adminId || 'admin-001',
      adminName || 'Administrator',
      note || 'Verifikasi manual oleh admin via Panel Admin'
    );

    return NextResponse.json({
      success,
      message: success
        ? 'Email pengguna berhasil diverifikasi secara manual.'
        : 'Gagal memverifikasi email pengguna.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
