/**
 * Tipos de la base de datos (mantenidos a mano por ahora).
 *
 * Cuando el esquema se estabilice, regenerar con:
 *   pnpm dlx supabase gen types typescript --project-id <ref> > src/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ListingKind = "offer" | "want";
export type ListingStatus = "active" | "reserved" | "closed" | "removed";
export type CollectionVisibility = "private" | "unlisted" | "public";
export type DealStatus = "pending" | "confirmed" | "cancelled";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          whatsapp: string | null;
          show_whatsapp: boolean;
          city: string;
          is_verified: boolean;
          rating_avg: number;
          rating_count: number;
          onboarding_completed: boolean;
          email_notifications: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          whatsapp?: string | null;
          show_whatsapp?: boolean;
          city?: string;
          onboarding_completed?: boolean;
        };
        Update: {
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          whatsapp?: string | null;
          show_whatsapp?: boolean;
          city?: string;
          onboarding_completed?: boolean;
          email_notifications?: boolean;
        };
        Relationships: [];
      };

      collections: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          visibility: CollectionVisibility;
          share_token: string;
          is_default: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          description?: string | null;
          visibility?: CollectionVisibility;
          sort_order?: number;
        };
        Update: {
          name?: string;
          description?: string | null;
          visibility?: CollectionVisibility;
          sort_order?: number;
        };
        Relationships: [];
      };

      sets: {
        Row: {
          id: string;
          name: string;
          serie_id: string | null;
          serie_name: string | null;
          logo_url: string | null;
          symbol_url: string | null;
          card_count_official: number | null;
          card_count_total: number | null;
          release_date: string | null;
          synced_at: string;
        };
        Insert: {
          id: string;
          name: string;
          serie_id?: string | null;
          serie_name?: string | null;
          logo_url?: string | null;
          symbol_url?: string | null;
          card_count_official?: number | null;
          card_count_total?: number | null;
          release_date?: string | null;
          synced_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sets"]["Insert"]>;
        Relationships: [];
      };

      cards: {
        Row: {
          id: string;
          name: string;
          set_id: string | null;
          local_id: string | null;
          rarity: string | null;
          category: string | null;
          types: string[] | null;
          image_small: string | null;
          image_large: string | null;
          synced_at: string;
        };
        Insert: {
          id: string;
          name: string;
          set_id?: string | null;
          local_id?: string | null;
          rarity?: string | null;
          category?: string | null;
          types?: string[] | null;
          image_small?: string | null;
          image_large?: string | null;
          synced_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cards"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "cards_set_id_fkey";
            columns: ["set_id"];
            referencedRelation: "sets";
            referencedColumns: ["id"];
          },
        ];
      };

      collection_items: {
        Row: {
          id: string;
          user_id: string;
          collection_id: string;
          card_id: string | null;
          custom_card_name: string | null;
          card_name: string;
          set_name: string | null;
          image_url: string | null;
          language: string;
          condition: string | null;
          quantity: number;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          collection_id: string;
          card_id?: string | null;
          custom_card_name?: string | null;
          card_name: string;
          set_name?: string | null;
          image_url?: string | null;
          language?: string;
          condition?: string | null;
          quantity?: number;
          note?: string | null;
        };
        Update: {
          collection_id?: string;
          card_id?: string | null;
          custom_card_name?: string | null;
          card_name?: string;
          set_name?: string | null;
          image_url?: string | null;
          language?: string;
          condition?: string | null;
          quantity?: number;
          note?: string | null;
        };
        Relationships: [];
      };

      listings: {
        Row: {
          id: string;
          user_id: string;
          kind: ListingKind;
          for_sale: boolean;
          for_trade: boolean;
          source_collection_item_id: string | null;
          card_id: string | null;
          custom_card_name: string | null;
          card_name: string;
          set_name: string | null;
          image_url: string | null;
          language: string;
          condition: string | null;
          quantity: number;
          price_cop: number | null;
          price_negotiable: boolean;
          trade_for: string | null;
          description: string | null;
          city: string;
          status: ListingStatus;
          bumped_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, never>; // se crea sólo vía rpc('create_listing')
        Update: {
          for_sale?: boolean;
          for_trade?: boolean;
          card_name?: string;
          set_name?: string | null;
          language?: string;
          condition?: string | null;
          quantity?: number;
          price_cop?: number | null;
          price_negotiable?: boolean;
          trade_for?: string | null;
          description?: string | null;
          city?: string;
          status?: ListingStatus;
          bumped_at?: string;
        };
        Relationships: [];
      };

      listing_photos: {
        Row: {
          id: string;
          listing_id: string;
          storage_path: string;
          sort_order: number;
          created_at: string;
        };
        Insert: Record<string, never>; // se crea sólo vía rpc('create_listing')
        Update: {
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "listing_photos_listing_id_fkey";
            columns: ["listing_id"];
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };

      deals: {
        Row: {
          id: string;
          listing_id: string;
          seller_id: string;
          buyer_id: string;
          status: DealStatus;
          seller_confirmed: boolean;
          buyer_confirmed: boolean;
          buyer_note: string | null;
          cancelled_by: string | null;
          confirmed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, never>; // se crea sólo vía rpc('create_deal')
        Update: Record<string, never>; // se edita sólo vía rpc
        Relationships: [
          {
            foreignKeyName: "deals_listing_id_fkey";
            columns: ["listing_id"];
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };

      reviews: {
        Row: {
          id: string;
          deal_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          deal_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment?: string | null;
        };
        Update: {
          rating?: number;
          comment?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_deal_id_fkey";
            columns: ["deal_id"];
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
        ];
      };

      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: "listing" | "user";
          target_listing_id: string | null;
          target_user_id: string | null;
          reason: string;
          detail: string | null;
          status: "open" | "reviewed" | "dismissed";
          created_at: string;
        };
        Insert: {
          reporter_id: string;
          target_type: "listing" | "user";
          target_listing_id?: string | null;
          target_user_id?: string | null;
          reason: string;
          detail?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };

      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          link: string | null;
          actor_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: Record<string, never>; // se crean sólo server-side (triggers / rpc)
        Update: {
          read_at?: string | null;
        };
        Relationships: [];
      };
    };

    Views: Record<string, never>;

    Functions: {
      complete_onboarding: {
        Args: { payload: Json };
        Returns: undefined;
      };
      create_listing: {
        Args: { payload: Json };
        Returns: string;
      };
      get_collection_by_token: {
        Args: { p_token: string };
        Returns: Json;
      };
      get_public_collections: {
        Args: { p_username: string };
        Returns: Json;
      };
      replace_listing_photos: {
        Args: { p_listing_id: string; p_paths: string[] };
        Returns: undefined;
      };
      create_deal: {
        Args: { p_listing_id: string };
        Returns: string;
      };
      confirm_deal: {
        Args: { p_deal_id: string };
        Returns: undefined;
      };
      cancel_deal: {
        Args: { p_deal_id: string };
        Returns: undefined;
      };
    };

    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type CardRow = Database["public"]["Tables"]["cards"]["Row"];
export type SetRow = Database["public"]["Tables"]["sets"]["Row"];
export type Collection = Database["public"]["Tables"]["collections"]["Row"];
export type CollectionItem =
  Database["public"]["Tables"]["collection_items"]["Row"];
export type Listing = Database["public"]["Tables"]["listings"]["Row"];
export type ListingPhoto =
  Database["public"]["Tables"]["listing_photos"]["Row"];
export type Deal = Database["public"]["Tables"]["deals"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type Notification =
  Database["public"]["Tables"]["notifications"]["Row"];
