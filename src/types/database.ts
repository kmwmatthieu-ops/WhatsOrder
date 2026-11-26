/**
 * Types de la base Supabase.
 * Écrits à la main d'après supabase/migrations (V2-B et V2-C inclus).
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ShopStatus = "active" | "suspended";
export type OrderStatus = "new" | "confirmed" | "preparing" | "ready" | "delivering" | "delivered" | "cancelled";
export type FulfillmentType = "delivery" | "pickup";
export type PaymentStatus = "unpaid" | "partial" | "paid";
export type PaymentMethod = "cash" | "cash_on_delivery" | "mobile_money";
export type SubscriptionStatus = "active" | "expired" | "past_due";
export type SubscriptionRequestStatus = "pending" | "approved" | "rejected";

export type DaySchedule = { open: boolean; start: string; end: string };
export type OpeningHours = {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
};

export type VariantAttributes = {
  taille?: string;
  couleur?: string;
  modele?: string;
};

export type Database = {
  public: {
    Tables: {
      admins: {
        Row: { user_id: string; created_at: string };
        Insert: { user_id: string; created_at?: string };
        Update: { user_id?: string; created_at?: string };
        Relationships: [];
      };
      shops: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          banner_url: string | null;
          description: string | null;
          whatsapp_number: string;
          primary_color: string;
          delivery_fee: number;
          pickup_enabled: boolean;
          delivery_enabled: boolean;
          address: string | null;
          status: ShopStatus;
          opening_hours: OpeningHours;
          order_notifications_enabled: boolean;
          is_listed_in_explorer: boolean;
          is_certified: boolean;
          identity_verified: boolean;
          followers_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          banner_url?: string | null;
          description?: string | null;
          whatsapp_number: string;
          primary_color?: string;
          delivery_fee?: number;
          pickup_enabled?: boolean;
          delivery_enabled?: boolean;
          address?: string | null;
          status?: ShopStatus;
          opening_hours?: OpeningHours;
          order_notifications_enabled?: boolean;
          is_listed_in_explorer?: boolean;
          is_certified?: boolean;
          identity_verified?: boolean;
          followers_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shops"]["Insert"]>;
        Relationships: [];
      };
      delivery_zones: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          fee: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          name: string;
          fee?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["delivery_zones"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "delivery_zones_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: { id: string; shop_id: string; name: string; created_at: string };
        Insert: { id?: string; shop_id: string; name: string; created_at?: string };
        Update: { id?: string; shop_id?: string; name?: string; created_at?: string };
        Relationships: [
          {
            foreignKeyName: "categories_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          shop_id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          price: number;
          discount_percent: number;
          images: string[];
          options_text: string | null;
          stock: number | null;
          is_available: boolean;
          is_hidden: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          category_id?: string | null;
          name: string;
          description?: string | null;
          price: number;
          discount_percent?: number;
          images?: string[];
          options_text?: string | null;
          stock?: number | null;
          is_available?: boolean;
          is_hidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_fk";
            columns: ["category_id", "shop_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "shop_id"];
          },
        ];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          shop_id: string;
          label: string;
          attributes: VariantAttributes;
          price_override: number | null;
          stock: number | null;
          is_available: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          shop_id: string;
          label: string;
          attributes?: VariantAttributes;
          price_override?: number | null;
          stock?: number | null;
          is_available?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_variants"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "product_variants_product_shop_fk";
            columns: ["product_id", "shop_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id", "shop_id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          phone: string;
          address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          name: string;
          phone: string;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          shop_id: string;
          customer_id: string;
          public_code: string;
          status: OrderStatus;
          fulfillment: FulfillmentType;
          delivery_address: string | null;
          delivery_fee: number;
          delivery_zone_id: string | null;
          delivery_zone_name: string | null;
          subtotal: number;
          total: number;
          payment_status: PaymentStatus;
          payment_method: PaymentMethod | null;
          amount_paid: number;
          customer_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          customer_id: string;
          public_code: string;
          status?: OrderStatus;
          fulfillment: FulfillmentType;
          delivery_address?: string | null;
          delivery_fee?: number;
          delivery_zone_id?: string | null;
          delivery_zone_name?: string | null;
          subtotal: number;
          total: number;
          payment_status?: PaymentStatus;
          payment_method?: PaymentMethod | null;
          amount_paid?: number;
          customer_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          variant_id: string | null;
          product_name: string;
          unit_price: number;
          quantity: number;
          selected_options: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          variant_id?: string | null;
          product_name: string;
          unit_price: number;
          quantity: number;
          selected_options?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      order_status_history: {
        Row: {
          id: string;
          order_id: string;
          status: OrderStatus;
          changed_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          status: OrderStatus;
          changed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_status_history"]["Insert"]>;
        Relationships: [];
      };
      order_payments: {
        Row: {
          id: string;
          order_id: string;
          shop_id: string;
          amount: number;
          method: PaymentMethod;
          note: string | null;
          paid_at: string;
          idempotency_key: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          shop_id: string;
          amount: number;
          method?: PaymentMethod;
          note?: string | null;
          paid_at?: string;
          idempotency_key?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_payments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "order_payments_order_shop_fk";
            columns: ["order_id", "shop_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id", "shop_id"];
          },
        ];
      };
      order_rate_limits: {
        Row: { bucket: string; hits: number; window_start: string };
        Insert: { bucket: string; hits?: number; window_start?: string };
        Update: { bucket?: string; hits?: number; window_start?: string };
        Relationships: [];
      };
      subscription_plans: {
        Row: {
          id: string;
          name: string;
          description: string;
          price_monthly: number;
          max_products: number | null;
          max_orders_per_month: number | null;
          has_advanced_stats: boolean;
          has_csv_export: boolean;
          has_order_email_notifications: boolean;
          visibility_multiplier: number;
          has_certified_badge: boolean;
          max_explorer_products?: number | null;
          badge: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description: string;
          price_monthly?: number;
          max_products?: number | null;
          max_orders_per_month?: number | null;
          has_advanced_stats?: boolean;
          has_csv_export?: boolean;
          has_order_email_notifications?: boolean;
          visibility_multiplier?: number;
          has_certified_badge?: boolean;
          max_explorer_products?: number | null;
          badge?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subscription_plans"]["Insert"]>;
        Relationships: [];
      };
      platform_settings: {
        Row: {
          key: string;
          value: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          key: string;
          value?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["platform_settings"]["Insert"]>;
        Relationships: [];
      };
      shop_subscriptions: {
        Row: {
          id: string;
          shop_id: string;
          plan_id: string;
          status: SubscriptionStatus;
          starts_at: string;
          expires_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          plan_id?: string;
          status?: SubscriptionStatus;
          starts_at?: string;
          expires_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shop_subscriptions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "shop_subscriptions_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: true;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_requests: {
        Row: {
          id: string;
          shop_id: string;
          requested_plan_id: string;
          duration_months: number;
          amount_due: number;
          payment_method: string;
          sender_phone: string;
          transaction_reference: string | null;
          status: SubscriptionRequestStatus;
          admin_notes: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          requested_plan_id: string;
          duration_months?: number;
          amount_due: number;
          payment_method: string;
          sender_phone: string;
          transaction_reference?: string | null;
          status?: SubscriptionRequestStatus;
          admin_notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subscription_requests"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "subscription_requests_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_requests_requested_plan_id_fkey";
            columns: ["requested_plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      saspay_payments: {
        Row: {
          id: string;
          shop_id: string;
          user_id: string | null;
          plan_id: string;
          duration_months: number;
          amount: string;
          currency: string;
          saspay_session_id: string | null;
          saspay_payment_id: string | null;
          checkout_url: string | null;
          status: "PENDING" | "SUCCESS" | "FAILED";
          net_amount: string | null;
          debited_amount: string | null;
          idempotency_key: string | null;
          metadata: Json;
          delivered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          user_id?: string | null;
          plan_id: string;
          duration_months: number;
          amount: string;
          currency?: string;
          saspay_session_id?: string | null;
          saspay_payment_id?: string | null;
          checkout_url?: string | null;
          status?: "PENDING" | "SUCCESS" | "FAILED";
          net_amount?: string | null;
          debited_amount?: string | null;
          idempotency_key?: string | null;
          metadata?: Json;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["saspay_payments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "saspay_payments_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saspay_payments_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          residence_area: string | null;
          activity_consent: boolean;
          personalization_enabled: boolean;
          has_consented_personalization: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          residence_area?: string | null;
          activity_consent?: boolean;
          personalization_enabled?: boolean;
          has_consented_personalization?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customer_profiles"]["Insert"]>;
        Relationships: [];
      };
      customer_activity: {
        Row: {
          id: string;
          customer_id: string;
          activity_type: "view" | "click" | "search" | "order";
          product_id: string | null;
          shop_id: string | null;
          category_id: string | null;
          search_query: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          activity_type: "view" | "click" | "search" | "order";
          product_id?: string | null;
          shop_id?: string | null;
          category_id?: string | null;
          search_query?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customer_activity"]["Insert"]>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string | null;
          target_type: "product" | "shop";
          product_id: string | null;
          shop_id: string | null;
          reason: string;
          details: string | null;
          status: "pending" | "resolved_hidden" | "dismissed";
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id?: string | null;
          target_type: "product" | "shop";
          product_id?: string | null;
          shop_id?: string | null;
          reason: string;
          details?: string | null;
          status?: "pending" | "resolved_hidden" | "dismissed";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "reports_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
        ];
      };
      shop_certifications: {
        Row: {
          id: string;
          shop_id: string;
          business_doc_url: string;
          identity_doc_url: string;
          store_photo_url: string;
          store_video_url: string;
          status: "pending" | "approved" | "rejected";
          admin_notes: string | null;
          submitted_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: {
          id?: string;
          shop_id: string;
          business_doc_url: string;
          identity_doc_url: string;
          store_photo_url: string;
          store_video_url: string;
          status?: "pending" | "approved" | "rejected";
          admin_notes?: string | null;
          submitted_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["shop_certifications"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "shop_certifications_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
        ];
      };
      shop_followers: {
        Row: {
          id: string;
          user_id: string;
          shop_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          shop_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shop_followers"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "shop_followers_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      owns_shop: { Args: { p_shop_id: string }; Returns: boolean };
      is_slug_available: { Args: { p_slug: string }; Returns: boolean };
      place_order: {
        Args: {
          p_shop_slug: string;
          p_customer_name: string;
          p_customer_phone: string;
          p_fulfillment: FulfillmentType;
          p_delivery_address: string | null;
          p_customer_note: string | null;
          p_items: Array<{
            product_id: string;
            quantity: number;
            selected_options: string | null;
            variant_id?: string | null;
          }>;
          p_delivery_zone_id?: string | null;
        };
        Returns: Json;
      };
      admin_list_shops: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{
          id: string;
          name: string;
          slug: string;
          owner_id: string;
          owner_email: string;
          status: ShopStatus;
          created_at: string;
          orders_count: number;
          identity_verified: boolean;
          is_certified: boolean;
          plan_id: string;
          plan_name: string;
          subscription_status: string;
          subscription_expires_at: string | null;
          subscription_notes: string | null;
        }>;
      };
      admin_update_subscription_plan: {
        Args: {
          p_plan_id: string;
          p_visibility_multiplier: number;
          p_has_certified_badge: boolean;
          p_price_monthly?: number | null;
          p_max_products?: number | null;
          p_max_orders_per_month?: number | null;
          p_max_explorer_products?: number | null;
        };
        Returns: boolean;
      };
      admin_set_platform_setting: {
        Args: {
          p_key: string;
          p_value: string;
        };
        Returns: boolean;
      };
      admin_toggle_identity_verified: {
        Args: {
          p_shop_id: string;
          p_identity_verified: boolean;
        };
        Returns: boolean;
      };
      admin_assign_subscription: {
        Args: {
          p_shop_id: string;
          p_plan_id: string;
          p_duration_months?: number | null;
          p_notes?: string | null;
        };
        Returns: boolean;
      };
      admin_cancel_subscription: {
        Args: {
          p_shop_id: string;
          p_notes?: string | null;
        };
        Returns: boolean;
      };
      admin_toggle_certification: {
        Args: {
          p_shop_id: string;
          p_is_certified: boolean;
        };
        Returns: boolean;
      };
      admin_list_admins: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{
          user_id: string;
          email: string;
          created_at: string;
        }>;
      };
      admin_add_admin_by_email: {
        Args: { p_email: string };
        Returns: { ok: boolean; error?: string; user_id?: string };
      };
      admin_remove_admin: {
        Args: { p_user_id: string };
        Returns: { ok: boolean; error?: string };
      };
      get_active_shop_plan: {
        Args: { p_shop_id: string };
        Returns: Database["public"]["Tables"]["subscription_plans"]["Row"];
      };
      shop_product_limit: {
        Args: { p_shop_id: string };
        Returns: number;
      };
      shop_monthly_orders_limit: {
        Args: { p_shop_id: string };
        Returns: number;
      };
      shop_monthly_orders_count: {
        Args: { p_shop_id: string };
        Returns: number;
      };
      delete_user_account: {
        Args: Record<PropertyKey, never>;
        Returns: { success: boolean };
      };
      get_explorer_products: {
        Args: {
          p_search?: string | null;
          p_category?: string | null;
          p_limit?: number | null;
          p_offset?: number | null;
        };
        Returns: Array<{
          product_id: string;
          product_name: string;
          product_description: string | null;
          product_price: number;
          product_discount_percent: number;
          product_image_url: string;
          product_stock: number | null;
          product_created_at: string;
          category_id: string | null;
          category_name: string | null;
          shop_id: string;
          shop_name: string;
          shop_slug: string;
          shop_logo_url: string | null;
          shop_primary_color: string | null;
          shop_is_certified?: boolean;
        }>;
      };
      admin_list_certifications: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{
          id: string;
          shop_id: string;
          shop_name: string;
          shop_slug: string;
          owner_email: string;
          business_doc_url: string;
          identity_doc_url: string;
          store_photo_url: string;
          store_video_url: string;
          status: string;
          admin_notes: string | null;
          submitted_at: string;
          reviewed_at: string | null;
          is_certified: boolean;
        }>;
      };
      admin_review_certification: {
        Args: {
          p_certification_id: string;
          p_status: string;
          p_admin_notes?: string | null;
        };
        Returns: boolean;
      };
      admin_list_reports: {
        Args: { p_status?: string | null };
        Returns: Array<{
          id: string;
          reporter_id: string | null;
          target_type: string;
          product_id: string | null;
          product_name: string | null;
          shop_id: string | null;
          shop_name: string | null;
          shop_slug: string | null;
          reason: string;
          details: string | null;
          status: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        }>;
      };
      admin_resolve_report: {
        Args: {
          p_report_id: string;
          p_action: string;
          p_notes?: string | null;
        };
        Returns: { ok: boolean; action: string };
      };
      admin_get_users_stats: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{
          total_users: number;
          merchants_count: number;
          clients_count: number;
          active_users_30d: number;
        }>;
      };
      admin_get_accounting_timeline: {
        Args: Record<PropertyKey, never>;
        Returns: {
          orders: Array<{
            id: string;
            total: number;
            amount_paid: number;
            status: string;
            customer_id: string;
            created_at: string;
          }>;
          activities: Array<{
            id: string;
            activity_type: string;
            customer_id: string;
            created_at: string;
          }>;
          subscriptions: Array<{
            id: string;
            amount_due: number;
            requested_plan_id: string;
            status: string;
            created_at: string;
          }>;
        };
      };
      toggle_follow_shop: {
        Args: { p_shop_id: string };
        Returns: { following: boolean; followers_count: number };
      };
      is_following_shop: {
        Args: { p_shop_id: string };
        Returns: boolean;
      };
      get_my_followed_shops: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{
          shop_id: string;
          shop_name: string;
          shop_slug: string;
          shop_logo_url: string | null;
          shop_primary_color: string;
          is_certified: boolean;
          followers_count: number;
          products_count: number;
          followed_at: string;
        }>;
      };
      get_followed_shops_products: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: Array<{
          product_id: string;
          product_name: string;
          product_description: string | null;
          product_price: number;
          product_discount_percent: number;
          product_image_url: string;
          product_stock: number | null;
          product_created_at: string;
          category_id: string | null;
          category_name: string | null;
          shop_id: string;
          shop_name: string;
          shop_slug: string;
          shop_logo_url: string | null;
          shop_primary_color: string;
          shop_is_certified: boolean;
        }>;
      };
      record_customer_activity: {
        Args: {
          p_activity_type: "view" | "click" | "search" | "order";
          p_product_id?: string | null;
          p_shop_id?: string | null;
          p_category_id?: string | null;
          p_search_query?: string | null;
        };
        Returns: boolean;
      };
      clear_my_customer_activity: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      set_my_personalization_consent: {
        Args: { p_consented: boolean };
        Returns: boolean;
      };
      get_my_personalization_stats: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{
          has_consented: boolean;
          activity_count: number;
        }>;
      };
      get_for_you_products: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: Array<{
          product_id: string;
          product_name: string;
          product_description: string | null;
          product_price: number;
          product_discount_percent: number;
          product_image_url: string;
          product_stock: number | null;
          product_created_at: string;
          category_id: string | null;
          category_name: string | null;
          shop_id: string;
          shop_name: string;
          shop_slug: string;
          shop_logo_url: string | null;
          shop_primary_color: string | null;
          shop_is_certified: boolean;
        }>;
      };
    };
    Enums: {
      shop_status: ShopStatus;
      order_status: OrderStatus;
      fulfillment_type: FulfillmentType;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Shop = Tables<"shops">;
export type Category = Tables<"categories">;
export type Product = Tables<"products">;
export type ProductVariant = Tables<"product_variants">;
export type ProductWithVariants = Product & {
  product_variants?: ProductVariant[];
};
export type Customer = Tables<"customers">;
export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;
export type OrderPayment = Tables<"order_payments">;
export type DeliveryZone = Tables<"delivery_zones">;
export type SubscriptionPlan = Tables<"subscription_plans">;
export type ShopSubscription = Tables<"shop_subscriptions">;
export type SubscriptionRequest = Tables<"subscription_requests">;
export type SaspayPayment = Tables<"saspay_payments">;
export type CustomerProfile = Tables<"customer_profiles">;
export type Report = Tables<"reports">;
export type ShopCertification = Tables<"shop_certifications">;
export type ShopFollower = Tables<"shop_followers">;
export type PlatformSetting = Tables<"platform_settings">;
export type CustomerActivity = Tables<"customer_activity">;
export type FollowedShop = Database["public"]["Functions"]["get_my_followed_shops"]["Returns"][number];
export type ExplorerProduct = Database["public"]["Functions"]["get_explorer_products"]["Returns"][number];
