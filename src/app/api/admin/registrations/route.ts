import { NextRequest, NextResponse } from 'next/server';
import { VerificationService } from '@/services/verification.service';

export async function GET() {
  try {
    const users = await VerificationService.getVerifiableUsers();
    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, status, adminId, adminName, note } = body;

    if (!userId || !status) {
      return NextResponse.json({ success: false, error: 'userId dan status wajib disertakan.' }, { status: 400 });
    }

    if (!['pending', 'verified', 'rejected'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Nilai status tidak valid.' }, { status: 400 });
    }

    const success = await VerificationService.updateRegistrationStatus(
      userId,
      status,
      adminId || 'admin-001',
      adminName || 'Administrator',
      note
    );

    return NextResponse.json({
      success,
      message: `Status pendaftaran pengguna berhasil diperbarui menjadi ${status}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
