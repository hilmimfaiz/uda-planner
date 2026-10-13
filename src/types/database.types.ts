export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'user';
export type BrandRole = 'owner' | 'editor' | 'reviewer' | 'viewer';
export type PostStatus = 'draft' | 'in_review' | 'approved' | 'scheduled' | 'published' | 'rejected';
export type ContentType = 'feed' | 'reel' | 'story' | 'carousel';
export type SnippetType = 'caption' | 'hashtag';
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';
export type PaymentStatus = 'pending' | 'verified' | 'rejected';
export type NotificationType = 'post_review' | 'comment' | 'invitation' | 'payment' | 'system';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string;
          avatar_url: string | null;
          role: UserRole;
          bio: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name: string;
          avatar_url?: string | null;
          role?: UserRole;
          bio?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string | null;
          full_name?: string;
          avatar_url?: string | null;
          role?: UserRole;
          bio?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      plans: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          price: number;
          billing_period: string;
          max_brands: number;
          max_posts_per_month: number;
          max_team_members: number;
          features: Json;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          slug: string;
          description?: string | null;
          price?: number;
          billing_period?: string;
          max_brands?: number;
          max_posts_per_month?: number;
          max_team_members?: number;
          features?: Json;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          price?: number;
          billing_period?: string;
          max_brands?: number;
          max_posts_per_month?: number;
          max_team_members?: number;
          features?: Json;
          is_active?: boolean;
        };
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          owner_id: string;
          plan_id: string;
          company_name: string | null;
          brand_quota: number;
          post_quota: number;
          member_quota: number;
          status: string;
          valid_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          plan_id?: string;
          company_name?: string | null;
          brand_quota?: number;
          post_quota?: number;
          member_quota?: number;
          status?: string;
          valid_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          plan_id?: string;
          company_name?: string | null;
          brand_quota?: number;
          post_quota?: number;
          member_quota?: number;
          status?: string;
          valid_until?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      brands: {
        Row: {
          id: string;
          account_id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          color: string;
          industry: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          color?: string;
          industry?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          color?: string;
          industry?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      brand_members: {
        Row: {
          id: string;
          brand_id: string;
          user_id: string;
          role: BrandRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          user_id: string;
          role?: BrandRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          role?: BrandRole;
          updated_at?: string;
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          id: string;
          brand_id: string;
          email: string;
          role: BrandRole;
          token: string;
          status: InvitationStatus;
          invited_by: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          email: string;
          role?: BrandRole;
          token?: string;
          status?: InvitationStatus;
          invited_by: string;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          role?: BrandRole;
          status?: InvitationStatus;
        };
        Relationships: [];
      };
      content_pillars: {
        Row: {
          id: string;
          brand_id: string;
          name: string;
          color: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          name: string;
          color?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          color?: string;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          brand_id: string;
          pillar_id: string | null;
          title: string;
          caption: string;
          hashtags: string[];
          platforms: string[];
          content_type: ContentType;
          assigned_to: string | null;
          scheduled_at: string | null;
          published_at: string | null;
          status: PostStatus;
          review_notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          pillar_id?: string | null;
          title: string;
          caption?: string;
          hashtags?: string[];
          platforms?: string[];
          content_type?: ContentType;
          assigned_to?: string | null;
          scheduled_at?: string | null;
          published_at?: string | null;
          status?: PostStatus;
          review_notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          pillar_id?: string | null;
          title?: string;
          caption?: string;
          hashtags?: string[];
          platforms?: string[];
          content_type?: ContentType;
          assigned_to?: string | null;
          scheduled_at?: string | null;
          published_at?: string | null;
          status?: PostStatus;
          review_notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      post_assets: {
        Row: {
          id: string;
          post_id: string;
          file_url: string;
          file_type: string;
          file_name: string;
          file_size: number;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          file_url: string;
          file_type?: string;
          file_name: string;
          file_size?: number;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          file_url?: string;
          file_type?: string;
          file_name?: string;
          file_size?: number;
          sort_order?: number;
        };
        Relationships: [];
      };
      snippets: {
        Row: {
          id: string;
          brand_id: string;
          type: SnippetType;
          title: string;
          content: string;
          tags: string[];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          type?: SnippetType;
          title: string;
          content: string;
          tags?: string[];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          type?: SnippetType;
          title?: string;
          content?: string;
          tags?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          content: string;
          parent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          content: string;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          brand_id: string | null;
          title: string;
          message: string;
          link: string | null;
          is_read: boolean;
          type: NotificationType;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          brand_id?: string | null;
          title: string;
          message: string;
          link?: string | null;
          is_read?: boolean;
          type?: NotificationType;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          account_id: string;
          plan_id: string;
          amount: number;
          payment_method: string;
          payment_proof_url: string | null;
          status: PaymentStatus;
          notes: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          plan_id: string;
          amount: number;
          payment_method?: string;
          payment_proof_url?: string | null;
          status?: PaymentStatus;
          notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          payment_proof_url?: string | null;
          status?: PaymentStatus;
          notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          id: string;
          key: string;
          value: Json;
          description: string | null;
          updated_at: string;
        };
        Insert: {
          id: string;
          key: string;
          value: Json;
          description?: string | null;
          updated_at?: string;
        };
        Update: {
          value?: Json;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      brand_role: BrandRole;
      post_status: PostStatus;
      content_type: ContentType;
      snippet_type: SnippetType;
      invitation_status: InvitationStatus;
      payment_status: PaymentStatus;
      notification_type: NotificationType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Plan = Database['public']['Tables']['plans']['Row'];
export type Account = Database['public']['Tables']['accounts']['Row'];
export type Brand = Database['public']['Tables']['brands']['Row'];
export type BrandMember = Database['public']['Tables']['brand_members']['Row'];
export type Invitation = Database['public']['Tables']['invitations']['Row'];
export type ContentPillar = Database['public']['Tables']['content_pillars']['Row'];
export type Post = Database['public']['Tables']['posts']['Row'];
export type PostAsset = Database['public']['Tables']['post_assets']['Row'];
export type Snippet = Database['public']['Tables']['snippets']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type Payment = Database['public']['Tables']['payments']['Row'];
export type AppSetting = Database['public']['Tables']['app_settings']['Row'];
