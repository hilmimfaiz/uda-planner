import { createClient } from '@/lib/supabase/client';
import { initialNotifications } from '@/lib/supabase/mock-data';
import { Notification, NotificationType } from '@/types/database.types';

let mockNotifications: Notification[] = [...initialNotifications];

export class NotificationService {
  static async getNotifications(userId: string): Promise<Notification[]> {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && data) return data as Notification[];
    }
    return mockNotifications.filter((n) => n.user_id === userId || n.user_id === 'user-001');
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const list = await this.getNotifications(userId);
    return list.filter((n) => !n.is_read).length;
  }

  static async markAsRead(id: string): Promise<boolean> {
    const supabase = createClient();
    if (supabase) {
      const { error } = await (supabase.from('notifications' as any) as any).update({ is_read: true }).eq('id', id);
      if (!error) return true;
    }

    const n = mockNotifications.find((item) => item.id === id);
    if (n) n.is_read = true;
    return true;
  }

  static async markAllAsRead(userId: string): Promise<boolean> {
    const supabase = createClient();
    if (supabase) {
      await (supabase.from('notifications' as any) as any).update({ is_read: true }).eq('user_id', userId);
    }
    mockNotifications.forEach((n) => {
      if (n.user_id === userId || n.user_id === 'user-001') n.is_read = true;
    });
    return true;
  }

  static async createNotification(payload: {
    userId: string;
    brandId?: string;
    title: string;
    message: string;
    link?: string;
    type?: NotificationType;
  }): Promise<Notification> {
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      user_id: payload.userId,
      brand_id: payload.brandId || null,
      title: payload.title,
      message: payload.message,
      link: payload.link || null,
      is_read: false,
      type: payload.type || 'system',
      created_at: new Date().toISOString(),
    };

    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.from('notifications').insert(newNotif as any).select().single();
      if (!error && data) return data as Notification;
    }

    mockNotifications.unshift(newNotif);
    return newNotif;
  }
}
