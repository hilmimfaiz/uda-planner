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
    window.dispatchEvent(new CustomEvent('uda_bank_accounts_updated', { detail: data }));
    window.dispatchEvent(new Event('storage'));
  } catch {}
};

export class BankService {
  /**
   * Mengambil semua rekening aktif secara sinkron (instan) dari cache/default
   */
  static getCachedActiveBankAccounts(): BankAccountItem[] {
    const all = getStorage();
    return all.filter((b) => b.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Mengambil semua rekening aktif untuk halaman pembayaran pengguna
   */
  static async getActiveBankAccounts(): Promise<BankAccountItem[]> {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/bank-accounts');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            return json.data;
          }
        }
      } catch (err) {
        console.warn('BankService.getActiveBankAccounts fetch fallback:', err);
      }
    }

    const all = await this.getAllBankAccounts();
    return all.filter((b) => b.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Mengambil semua rekening bank untuk Panel Admin
   */
  static async getAllBankAccounts(): Promise<BankAccountItem[]> {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/admin/bank-accounts');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setStorage(json.data);
            return json.data;
          }
        }
      } catch (err) {
        console.warn('BankService.getAllBankAccounts api fallback:', err);
      }
    }

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
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/admin/bank-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const current = getStorage();
            const updated = [...current.filter((b) => b.id !== json.data.id), json.data].sort(
              (a, b) => a.sortOrder - b.sortOrder
            );
            setStorage(updated);
            return json.data;
          }
        }
      } catch (apiErr) {
        console.warn('BankService.createBankAccount api error:', apiErr);
      }
    }

    const newId = `bank-${Date.now()}`;
    const newAccount: BankAccountItem = {
      ...item,
      id: newId,
    };

    const current = getStorage();
    const updated = [...current, newAccount].sort((a, b) => a.sortOrder - b.sortOrder);
    setStorage(updated);
    return newAccount;
  }

  /**
   * Mengubah detail rekening bank
   */
  static async updateBankAccount(id: string, updates: Partial<BankAccountItem>): Promise<boolean> {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/admin/bank-accounts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, updates }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            const current = getStorage();
            const updated = current
              .map((b) => (b.id === id ? { ...b, ...updates } : b))
              .sort((a, b) => a.sortOrder - b.sortOrder);
            setStorage(updated);
            return true;
          }
        }
      } catch (apiErr) {
        console.warn('BankService.updateBankAccount api error:', apiErr);
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
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/admin/bank-accounts?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            const current = getStorage();
            const updated = current.filter((b) => b.id !== id);
            setStorage(updated);
            return true;
          }
        }
      } catch (apiErr) {
        console.warn('BankService.deleteBankAccount api error:', apiErr);
      }
    }

    const current = getStorage();
    const updated = current.filter((b) => b.id !== id);
    setStorage(updated);
    return true;
  }
}
