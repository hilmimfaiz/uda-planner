import { createClient } from '@/lib/supabase/client';

export interface BankAccountItem {
  id: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  logoUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
}

const STORAGE_BANK_KEY = 'uda_dynamic_bank_accounts';

const DEFAULT_BANK_ACCOUNTS: BankAccountItem[] = [
  {
    id: 'bank-bca',
    bankName: 'BCA (Bank Central Asia)',
    bankCode: 'bca',
    accountNumber: '8839210928',
    accountName: 'PT. Koding Teknologi Asia',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Bank_Central_Asia.svg',
    isActive: true,
    sortOrder: 1,
    createdAt: '2026-10-10',
  },
  {
    id: 'bank-mandiri',
    bankName: 'Bank Mandiri',
    bankCode: 'mandiri',
    accountNumber: '1280019283192',
    accountName: 'PT. Koding Teknologi Asia',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ad/Bank_Mandiri_logo_2016.svg',
    isActive: true,
    sortOrder: 2,
    createdAt: '2026-10-10',
  },
  {
    id: 'bank-bni',
    bankName: 'Bank BNI',
    bankCode: 'bni',
    accountNumber: '0928192837',
    accountName: 'PT. Koding Teknologi Asia',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/id/5/55/BNI_logo.svg',
    isActive: true,
    sortOrder: 3,
    createdAt: '2026-10-10',
  },
  {
    id: 'bank-bsi',
    bankName: 'Bank Syariah Indonesia (BSI)',
    bankCode: 'bsi',
    accountNumber: '7182938491',
    accountName: 'PT. Koding Teknologi Asia',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Bank_Syariah_Indonesia.svg',
    isActive: true,
    sortOrder: 4,
    createdAt: '2026-10-10',
  },
];

const getStorage = (): BankAccountItem[] => {
  if (typeof window === 'undefined') return DEFAULT_BANK_ACCOUNTS;
  try {
    const raw = localStorage.getItem(STORAGE_BANK_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_BANK_ACCOUNTS;
  } catch {
    return DEFAULT_BANK_ACCOUNTS;
  }
};

const setStorage = (data: BankAccountItem[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_BANK_KEY, JSON.stringify(data));
  } catch {}
};

export class BankService {
  /**
   * Mengambil semua rekening aktif untuk halaman pembayaran pengguna
   */
  static async getActiveBankAccounts(): Promise<BankAccountItem[]> {
    const all = await this.getAllBankAccounts();
    return all.filter((b) => b.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Mengambil semua rekening bank untuk Panel Admin
   */
  static async getAllBankAccounts(): Promise<BankAccountItem[]> {
    const local = getStorage();
    const supabase = createClient();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('bank_accounts' as any)
          .select('*')
          .order('sort_order', { ascending: true });

        if (!error && data && data.length > 0) {
          const dbAccounts: BankAccountItem[] = data.map((b: any) => ({
            id: b.id,
            bankName: b.bank_name,
            bankCode: b.bank_code || b.bank_name.toLowerCase().replace(/[^a-z0-9]/g, ''),
            accountNumber: b.account_number,
            accountName: b.account_name,
            logoUrl: b.logo_url,
            isActive: b.is_active ?? true,
            sortOrder: b.sort_order || 0,
            createdAt: b.created_at,
          }));

          setStorage(dbAccounts);
          return dbAccounts;
        }
      } catch (err) {
        console.warn('BankService.getAllBankAccounts db fallback:', err);
      }
    }

    return local;
  }

  /**
   * Menambahkan rekening bank baru oleh Admin
   */
  static async createBankAccount(item: Omit<BankAccountItem, 'id'>): Promise<BankAccountItem> {
    const supabase = createClient();
    const newId = `bank-${Date.now()}`;
    const newAccount: BankAccountItem = {
      ...item,
      id: newId,
    };

    if (supabase) {
      try {
        const { data, error } = await (supabase.from('bank_accounts' as any) as any)
          .insert({
            bank_name: item.bankName,
            bank_code: item.bankCode || item.bankName.toLowerCase().replace(/[^a-z0-9]/g, ''),
            account_number: item.accountNumber,
            account_name: item.accountName,
            logo_url: item.logoUrl || null,
            is_active: item.isActive,
            sort_order: item.sortOrder,
          })
          .select()
          .single();

        if (!error && data) {
          newAccount.id = data.id;
        }
      } catch (err) {
        console.warn('BankService.createBankAccount db error:', err);
      }
    }

    const current = getStorage();
    const updated = [...current, newAccount].sort((a, b) => a.sortOrder - b.sortOrder);
    setStorage(updated);
    return newAccount;
  }

  /**
   * Mengubah detail rekening bank
   */
  static async updateBankAccount(id: string, updates: Partial<BankAccountItem>): Promise<boolean> {
    const supabase = createClient();

    if (supabase) {
      try {
        const dbUpdates: any = {};
        if (updates.bankName !== undefined) dbUpdates.bank_name = updates.bankName;
        if (updates.bankCode !== undefined) dbUpdates.bank_code = updates.bankCode;
        if (updates.accountNumber !== undefined) dbUpdates.account_number = updates.accountNumber;
        if (updates.accountName !== undefined) dbUpdates.account_name = updates.accountName;
        if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl;
        if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
        if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
        dbUpdates.updated_at = new Date().toISOString();

        await (supabase.from('bank_accounts' as any) as any).update(dbUpdates).eq('id', id);
      } catch (err) {
        console.warn('BankService.updateBankAccount db error:', err);
      }
    }

    const current = getStorage();
    const updated = current
      .map((b) => (b.id === id ? { ...b, ...updates } : b))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    setStorage(updated);
    return true;
  }

  /**
   * Menghapus rekening bank
   */
  static async deleteBankAccount(id: string): Promise<boolean> {
    const supabase = createClient();

    if (supabase) {
      try {
        await (supabase.from('bank_accounts' as any) as any).delete().eq('id', id);
      } catch (err) {
        console.warn('BankService.deleteBankAccount db error:', err);
      }
    }

    const current = getStorage();
    const updated = current.filter((b) => b.id !== id);
    setStorage(updated);
    return true;
  }
}
