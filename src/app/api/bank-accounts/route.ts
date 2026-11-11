import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { BankAccountItem } from '@/services/bank.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_ACTIVE_ACCOUNTS: BankAccountItem[] = [
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

export async function GET() {
  try {
    const admin = createAdminClient();
    if (admin) {
      const { data, error } = await admin
        .from('bank_accounts' as any)
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (!error && data && data.length > 0) {
        const mapped: BankAccountItem[] = data.map((b: any) => ({
          id: b.id,
          bankName: b.bank_name || '',
          bankCode: b.bank_code || (b.bank_name ? b.bank_name.toLowerCase().replace(/[^a-z0-9]/g, '') : ''),
          accountNumber: b.account_number || '',
          accountName: b.account_name || '',
          logoUrl: b.logo_url || null,
          isActive: true,
          sortOrder: b.sort_order || 0,
          createdAt: b.created_at || new Date().toISOString(),
        }));
        return NextResponse.json({ success: true, data: mapped });
      }
    }

    return NextResponse.json({ success: true, data: DEFAULT_ACTIVE_ACCOUNTS });
  } catch {
    return NextResponse.json({ success: true, data: DEFAULT_ACTIVE_ACCOUNTS });
  }
}
