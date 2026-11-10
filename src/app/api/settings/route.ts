import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

let cachedSettings = {
  bankName: 'BCA (Bank Central Asia)',
  accountNumber: '8839210928',
  accountName: 'PT. Koding Teknologi Asia',
  adminWhatsapp: '6281234567890',
};

export async function GET() {
  try {
    const adminClient = createAdminClient();
    if (adminClient) {
      const { data, error } = await adminClient
        .from('app_settings' as any)
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (!error && data) {
        const d = data as any;
        cachedSettings = {
          bankName: d.bank_name || cachedSettings.bankName,
          accountNumber: d.bank_account_number || cachedSettings.accountNumber,
          accountName: d.bank_account_name || cachedSettings.accountName,
          adminWhatsapp: d.admin_whatsapp || cachedSettings.adminWhatsapp,
        };
      }
    }
    return NextResponse.json({ success: true, data: cachedSettings });
  } catch {
    return NextResponse.json({ success: true, data: cachedSettings });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const adminWhatsapp = body.adminWhatsapp || body.admin_whatsapp;

    if (!adminWhatsapp) {
      return NextResponse.json(
        { success: false, error: 'Nomor WhatsApp admin wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanWhatsapp = String(adminWhatsapp).trim();
    cachedSettings.adminWhatsapp = cleanWhatsapp;
    if (body.bankName) cachedSettings.bankName = body.bankName;
    if (body.accountNumber) cachedSettings.accountNumber = body.accountNumber;
    if (body.accountName) cachedSettings.accountName = body.accountName;

    const adminClient = createAdminClient();
    if (adminClient) {
      try {
        await (adminClient.from('app_settings' as any) as any).upsert({
          id: 1,
          bank_name: cachedSettings.bankName,
          bank_account_number: cachedSettings.accountNumber,
          bank_account_name: cachedSettings.accountName,
          admin_whatsapp: cleanWhatsapp,
          updated_at: new Date().toISOString(),
        });
      } catch (dbErr: any) {
        console.warn('app_settings upsert error:', dbErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Pengaturan kontak WhatsApp berhasil diperbarui.',
      data: cachedSettings,
    });
  } catch (error: any) {
    console.error('PUT /api/settings error stack:', error?.stack || error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menyimpan pengaturan.' },
      { status: 500 }
    );
  }
}
