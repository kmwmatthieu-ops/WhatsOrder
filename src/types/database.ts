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
          images: string[];
          options_text: string | null;
          stock: number | null;
          is_available: boolean;
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
          images?: string[];
          options_text?: string | null;
          stock?: number | null;
          is_available?: boolean;
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
