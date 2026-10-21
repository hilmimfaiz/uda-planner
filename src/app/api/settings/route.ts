import { NextRequest, NextResponse } from 'next/server';
import { AdminService } from '@/services/admin.service';

export async function GET() {
  try {
    const settings = await AdminService.getAppSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { bankName, accountNumber, accountName, adminWhatsapp } = body;

    if (!adminWhatsapp) {
      return NextResponse.json({ success: false, error: 'Nomor WhatsApp admin wajib diisi.' }, { status: 400 });
    }

    await AdminService.updateAppSettings({
      bankName: bankName || 'BCA (Bank Central Asia)',
      accountNumber: accountNumber || '8839210928',
      accountName: accountName || 'PT. Koding Teknologi Asia',
      adminWhatsapp,
    });

    return NextResponse.json({ success: true, message: 'Pengaturan berhasil diperbarui.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
