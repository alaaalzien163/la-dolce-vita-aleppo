export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      creators: {
        Row: {
          bio: string | null;
          created_at: string;
          display_order: number;
          id: string;
          image_url: string | null;
          instagram_url: string | null;
          is_active: boolean;
          is_featured: boolean;
          name: string;
          slug: string;
          updated_at: string;
          website_url: string | null;
        };
        Insert: {
          bio?: string | null;
          created_at?: string;
          display_order?: number;
          id?: string;
          image_url?: string | null;
          instagram_url?: string | null;
          is_active?: boolean;
          is_featured?: boolean;
          name: string;
          slug: string;
          updated_at?: string;
          website_url?: string | null;
        };
        Update: {
          bio?: string | null;
          created_at?: string;
          display_order?: number;
          id?: string;
          image_url?: string | null;
          instagram_url?: string | null;
          is_active?: boolean;
          is_featured?: boolean;
          name?: string;
          slug?: string;
          updated_at?: string;
          website_url?: string | null;
        };
        Relationships: [];
      };
      menu_categories: {
        Row: {
          created_at: string;
          description: string | null;
          display_order: number;
          id: string;
          is_active: boolean;
          main_category_id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          main_category_id: string;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          main_category_id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_categories_main_category_id_fkey";
            columns: ["main_category_id"];
            isOneToOne: false;
            referencedRelation: "menu_main_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_items: {
        Row: {
          category_id: string;
          created_at: string;
          currency: string;
          description: string | null;
          display_order: number;
          id: string;
          image_url: string | null;
          is_available: boolean;
          is_featured: boolean;
          name: string;
          price: number | null;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          image_url?: string | null;
          is_available?: boolean;
          is_featured?: boolean;
          name: string;
          price?: number | null;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          image_url?: string | null;
          is_available?: boolean;
          is_featured?: boolean;
          name?: string;
          price?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "menu_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_main_categories: {
        Row: {
          created_at: string;
          description: string | null;
          display_order: number;
          id: string;
          is_active: boolean;
          menu_id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          menu_id: string;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          menu_id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_main_categories_menu_id_fkey";
            columns: ["menu_id"];
            isOneToOne: false;
            referencedRelation: "menus";
            referencedColumns: ["id"];
          },
        ];
      };
      menus: {
        Row: {
          created_at: string;
          description: string | null;
          display_order: number;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          updated_at: string;
          venue_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          updated_at?: string;
          venue_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          updated_at?: string;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menus_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          created_at: string;
          creator_id: string | null;
          currency: string | null;
          description: string | null;
          display_order: number;
          id: string;
          image_url: string | null;
          is_available: boolean;
          is_featured: boolean;
          name: string;
          price: number | null;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          creator_id?: string | null;
          currency?: string | null;
          description?: string | null;
          display_order?: number;
          id?: string;
          image_url?: string | null;
          is_available?: boolean;
          is_featured?: boolean;
          name: string;
          price?: number | null;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          creator_id?: string | null;
          currency?: string | null;
          description?: string | null;
          display_order?: number;
          id?: string;
          image_url?: string | null;
          is_available?: boolean;
          is_featured?: boolean;
          name?: string;
          price?: number | null;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "creators";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          role: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          role?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      section_images: {
        Row: {
          alt_text: string | null;
          created_at: string;
          display_order: number;
          id: string;
          image_url: string;
          is_active: boolean;
          section_id: string;
          updated_at: string;
        };
        Insert: {
          alt_text?: string | null;
          created_at?: string;
          display_order?: number;
          id?: string;
          image_url: string;
          is_active?: boolean;
          section_id: string;
          updated_at?: string;
        };
        Update: {
          alt_text?: string | null;
          created_at?: string;
          display_order?: number;
          id?: string;
          image_url?: string;
          is_active?: boolean;
          section_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "section_images_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          },
        ];
      };
      sections: {
        Row: {
          created_at: string;
          description: string | null;
          display_order: number;
          id: string;
          image_url: string | null;
          is_active: boolean;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          address: string | null;
          created_at: string;
          email: string | null;
          favicon_url: string | null;
          google_maps_url: string | null;
          id: string;
          instagram_url: string | null;
          logo_url: string | null;
          opening_hours: Json | null;
          phone: string | null;
          singleton_key: number;
          site_name: string;
          tagline: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          email?: string | null;
          favicon_url?: string | null;
          google_maps_url?: string | null;
          id?: string;
          instagram_url?: string | null;
          logo_url?: string | null;
          opening_hours?: Json | null;
          phone?: string | null;
          singleton_key?: number;
          site_name: string;
          tagline?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          email?: string | null;
          favicon_url?: string | null;
          google_maps_url?: string | null;
          id?: string;
          instagram_url?: string | null;
          logo_url?: string | null;
          opening_hours?: Json | null;
          phone?: string | null;
          singleton_key?: number;
          site_name?: string;
          tagline?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      studio_info: {
        Row: {
          booking_url: string | null;
          created_at: string;
          description: string | null;
          hero_image_url: string | null;
          id: string;
          instagram_url: string | null;
          is_active: boolean;
          phone: string | null;
          short_description: string | null;
          singleton_key: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          booking_url?: string | null;
          created_at?: string;
          description?: string | null;
          hero_image_url?: string | null;
          id?: string;
          instagram_url?: string | null;
          is_active?: boolean;
          phone?: string | null;
          short_description?: string | null;
          singleton_key?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          booking_url?: string | null;
          created_at?: string;
          description?: string | null;
          hero_image_url?: string | null;
          id?: string;
          instagram_url?: string | null;
          is_active?: boolean;
          phone?: string | null;
          short_description?: string | null;
          singleton_key?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      venues: {
        Row: {
          created_at: string;
          description: string | null;
          display_order: number;
          id: string;
          image_url: string | null;
          is_active: boolean;
          name: string;
          section_id: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name: string;
          section_id: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name?: string;
          section_id?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "venues_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: { Args: never; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
