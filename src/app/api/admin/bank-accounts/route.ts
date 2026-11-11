import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { BankAccountItem } from '@/services/bank.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_BANK_ACCOUNTS: BankAccountItem[] = [
  {
    id: 'ca95f1ea-d9b9-45fd-b8d1-caf98661dae3',
    bankName: 'BCA (Bank Central Asia)',
    bankCode: 'bca',
    accountNumber: '8839210928',
    accountName: 'PT UdaCoding Digital Indonesia',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Bank_Central_Asia.svg',
    isActive: true,
    sortOrder: 1,
    createdAt: '2026-10-10',
  },
  {
    id: '34db29d8-d4ae-46c3-8cb7-d8d3d2936275',
    bankName: 'Bank Mandiri',
    bankCode: 'mandiri',
    accountNumber: '1280019283192',
    accountName: 'PT UdaCoding Digital Indonesia',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ad/Bank_Mandiri_logo_2016.svg',
    isActive: true,
    sortOrder: 2,
    createdAt: '2026-10-10',
  },
  {
    id: '452879ba-8a67-4807-889f-01e34a415286',
    bankName: 'Bank BNI',
    bankCode: 'bni',
    accountNumber: '0928192837',
    accountName: 'PT UdaCoding Digital Indonesia',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/id/5/55/BNI_logo.svg',
    isActive: true,
    sortOrder: 3,
    createdAt: '2026-10-10',
  },
  {
    id: 'c0d290bd-97d6-4b99-a352-7a3dd4215758',
    bankName: 'Bank Syariah Indonesia (BSI)',
    bankCode: 'bsi',
    accountNumber: '7182938491',
    accountName: 'PT UdaCoding Digital Indonesia',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Bank_Syariah_Indonesia.svg',
    isActive: true,
    sortOrder: 4,
    createdAt: '2026-10-10',
  },
];

function mapRowToItem(b: any): BankAccountItem {
  return {
    id: b.id,
    bankName: b.bank_name || '',
    bankCode: b.bank_code || (b.bank_name ? b.bank_name.toLowerCase().replace(/[^a-z0-9]/g, '') : ''),
    accountNumber: b.account_number || '',
    accountName: b.account_name || '',
    logoUrl: b.logo_url || null,
    isActive: b.is_active !== undefined ? !!b.is_active : true,
    sortOrder: b.sort_order || 0,
    createdAt: b.created_at || new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const admin = createAdminClient();
    if (admin) {
      const { data, error } = await admin
        .from('bank_accounts' as any)
        .select('*')
        .order('sort_order', { ascending: true });

      if (!error && data && data.length > 0) {
        return NextResponse.json({
          success: true,
          data: data.map(mapRowToItem),
        });
      }
    }

    return NextResponse.json({ success: true, data: DEFAULT_BANK_ACCOUNTS });
  } catch (error: any) {
    return NextResponse.json({ success: true, data: DEFAULT_BANK_ACCOUNTS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const bankName = (body.bankName || '').trim();
    const accountNumber = (body.accountNumber || '').trim();
    const accountName = (body.accountName || '').trim();

    if (!bankName || !accountNumber || !accountName) {
      return NextResponse.json(
        { success: false, error: 'Nama bank, nomor rekening, dan nama pemilik rekening wajib diisi.' },
        { status: 400 }
      );
    }

    const bankCode = (body.bankCode || '').trim() || bankName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const logoUrl = body.logoUrl ? String(body.logoUrl).trim() : null;
    const isActive = body.isActive !== undefined ? !!body.isActive : true;
    const sortOrder = Number(body.sortOrder) || 1;

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Koneksi database admin tidak tersedia.' },
        { status: 500 }
      );
    }

    const insertPayload: any = {
      bank_name: bankName,
      bank_code: bankCode,
      account_number: accountNumber,
      account_name: accountName,
      logo_url: logoUrl,
      is_active: isActive,
      sort_order: sortOrder,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await (admin.from('bank_accounts' as any) as any)
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Insert bank_accounts error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Gagal menambahkan rekening bank.' },
        { status: 500 }
      );
    }

    const createdItem = mapRowToItem(data);
    return NextResponse.json({ success: true, data: createdItem }, { status: 201 });
  } catch (error: any) {
    console.error('POST bank-accounts error stack:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan sistem.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id;
    const updates = body.updates || body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID rekening wajib disertakan.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Koneksi database admin tidak tersedia.' },
        { status: 500 }
      );
    }

    const dbUpdates: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.bankName !== undefined) dbUpdates.bank_name = String(updates.bankName).trim();
    if (updates.bankCode !== undefined) dbUpdates.bank_code = String(updates.bankCode).trim();
    if (updates.accountNumber !== undefined) dbUpdates.account_number = String(updates.accountNumber).trim();
    if (updates.accountName !== undefined) dbUpdates.account_name = String(updates.accountName).trim();
    if (updates.logoUrl !== undefined) {
      dbUpdates.logo_url = updates.logoUrl ? String(updates.logoUrl).trim() : null;
    }
    if (updates.isActive !== undefined) dbUpdates.is_active = !!updates.isActive;
    if (updates.sortOrder !== undefined) dbUpdates.sort_order = Number(updates.sortOrder);

    const { data, error } = await (admin.from('bank_accounts' as any) as any)
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Update bank_accounts error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Gagal memperbarui rekening bank.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Rekening bank berhasil diperbarui.',
      data: data ? mapRowToItem(data) : null,
    });
  } catch (error: any) {
    console.error('PUT bank-accounts error stack:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan sistem.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        if (body.id) id = body.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID rekening wajib disertakan.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    if (admin) {
      const { error } = await (admin.from('bank_accounts' as any) as any).delete().eq('id', id);
      if (error) {
        console.error('Delete bank_accounts error:', error);
        return NextResponse.json(
          { success: false, error: error.message || 'Gagal menghapus rekening bank.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Rekening bank berhasil dihapus.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan sistem.' },
      { status: 500 }
    );
  }
}
