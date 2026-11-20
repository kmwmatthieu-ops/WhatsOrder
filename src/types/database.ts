/**
 * Types de la base Supabase.
 * Écrits à la main d'après supabase/migrations ; à régénérer dès que le projet est lié :
 *   npm run db:types
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type ShopStatus = "active" | "suspended";
type OrderStatus = "new" | "confirmed" | "ready" | "delivered" | "cancelled";
type FulfillmentType = "delivery" | "pickup";
type PaymentStatus = "unpaid" | "partial" | "paid";
type PaymentMethod = "cash" | "cash_on_delivery" | "mobile_money";

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
          description: string | null;
          whatsapp_number: string;
          primary_color: string;
          delivery_fee: number;
          pickup_enabled: boolean;
          delivery_enabled: boolean;
          address: string | null;
          status: ShopStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          description?: string | null;
          whatsapp_number: string;
          primary_color?: string;
          delivery_fee?: number;
          pickup_enabled?: boolean;
          delivery_enabled?: boolean;
          address?: string | null;
          status?: ShopStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shops"]["Insert"]>;
        Relationships: [];
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
      customers: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          phone: string;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          name: string;
          phone: string;
          address?: string | null;
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
          product_name: string;
          unit_price: number;
          quantity: number;
          selected_options: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          unit_price: number;
          quantity: number;
          selected_options?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
        Relationships: [];
      };
      order_status_history: {
        Row: { id: string; order_id: string; status: OrderStatus; changed_at: string };
        Insert: { id?: string; order_id: string; status: OrderStatus; changed_at?: string };
        Update: { id?: string; order_id?: string; status?: OrderStatus; changed_at?: string };
        Relationships: [];
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
      is_reserved_slug: { Args: { p_slug: string }; Returns: boolean };
      shop_product_limit: { Args: { p_shop_id: string }; Returns: number };
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
          }>;
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
