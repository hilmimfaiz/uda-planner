import { createClient } from '@/lib/supabase/client';
import { initialAccounts, initialPlans } from '@/lib/supabase/mock-data';
import { Account, Plan } from '@/types/database.types';
import { BrandService } from './brand.service';
import { PostService } from './post.service';

export class QuotaService {
  static async getPlans(): Promise<Plan[]> {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.from('plans').select('*').order('price', { ascending: true });
      if (!error && data) return data as Plan[];
    }
    return initialPlans;
  }

  static async getAccount(accountId: string): Promise<Account | null> {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.from('accounts').select('*').eq('id', accountId).single();
      if (!error && data) return data as Account;
    }
    return initialAccounts.find((a) => a.id === accountId) || initialAccounts[0];
  }

  static async getAccountUsage(accountId: string) {
    const account = await this.getAccount(accountId);
    const plans = await this.getPlans();
    const currentPlan = plans.find((p) => p.id === account?.plan_id) || plans[0];

    const brands = await BrandService.getBrands(accountId);
    const posts = await PostService.getPosts({}, accountId);

    return {
      plan: currentPlan,
      account,
      brandsCount: brands.length,
      brandQuota: currentPlan.max_brands,
      postsCount: posts.length,
      postQuota: currentPlan.max_posts_per_month,
      isBrandQuotaExceeded: brands.length >= currentPlan.max_brands,
      isPostQuotaExceeded: posts.length >= currentPlan.max_posts_per_month,
    };
  }

  static async canCreateBrand(accountId: string): Promise<{ allowed: boolean; message?: string }> {
    const usage = await this.getAccountUsage(accountId);
    if (usage.isBrandQuotaExceeded) {
      return {
        allowed: false,
        message: `Batas brand untuk paket ${usage.plan.name} (${usage.brandQuota} brand) telah tercapai. Tingkatkan paket Anda ke Pro atau Tim untuk menambah brand.`,
      };
    }
    return { allowed: true };
  }

  static async canCreatePost(accountId: string): Promise<{ allowed: boolean; message?: string }> {
    const usage = await this.getAccountUsage(accountId);
    if (usage.isPostQuotaExceeded) {
      return {
        allowed: false,
        message: `Batas kuota postingan bulanan (${usage.postQuota} post) telah tercapai. Silakan upgrade paket Anda.`,
      };
    }
    return { allowed: true };
  }
}
