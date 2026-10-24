export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      household_invitations: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          household_id: string
          id: string
          revoked_at: string | null
          token_hash: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string
          household_id: string
          id?: string
          revoked_at?: string | null
          token_hash: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          household_id?: string
          id?: string
          revoked_at?: string | null
          token_hash?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_invitations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_invitations_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      household_items: {
        Row: {
          household_id: string
          product_id: string
          status: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          household_id: string
          product_id: string
          status?: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          household_id?: string
          product_id?: string
          status?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_items_household_id_product_id_fkey"
            columns: ["household_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["household_id", "id"]
          },
          {
            foreignKeyName: "household_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          household_id: string
          joined_at?: string
          role: string
          user_id: string
        }
        Update: {
          household_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "households_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          archived_at: string | null
          barcode: string | null
          brand: string
          category: string
          created_at: string
          household_id: string
          id: string
          image_path: string | null
          name: string
          notes: string
          package_size: string
          source: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          barcode?: string | null
          brand?: string
          category: string
          created_at?: string
          household_id: string
          id?: string
          image_path?: string | null
          name: string
          notes?: string
          package_size?: string
          source?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          barcode?: string | null
          brand?: string
          category?: string
          created_at?: string
          household_id?: string
          id?: string
          image_path?: string | null
          name?: string
          notes?: string
          package_size?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_line_items: {
        Row: {
          created_at: string
          entry_id: string | null
          household_id: string
          id: string
          line_total: number | null
          package_size: string
          product_id: string
          product_name: string
          purchase_id: string
          purchase_unit: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          entry_id?: string | null
          household_id: string
          id?: string
          line_total?: number | null
          package_size: string
          product_id: string
          product_name: string
          purchase_id: string
          purchase_unit: string
          quantity: number
          unit_price: number
        }
        Update: {
          created_at?: string
          entry_id?: string | null
          household_id?: string
          id?: string
          line_total?: number | null
          package_size?: string
          product_id?: string
          product_name?: string
          purchase_id?: string
          purchase_unit?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_line_items_household_id_entry_id_fkey"
            columns: ["household_id", "entry_id"]
            isOneToOne: false
            referencedRelation: "shopping_list_entries"
            referencedColumns: ["household_id", "id"]
          },
          {
            foreignKeyName: "purchase_line_items_household_id_product_id_fkey"
            columns: ["household_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["household_id", "id"]
          },
          {
            foreignKeyName: "purchase_line_items_household_id_purchase_id_fkey"
            columns: ["household_id", "purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["household_id", "id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          household_id: string
          id: string
          purchase_date: string
          recorded_by: string
          request_id: string
          request_payload: Json
          store: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          purchase_date: string
          recorded_by: string
          request_id: string
          request_payload: Json
          store?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          purchase_date?: string
          recorded_by?: string
          request_id?: string
          request_payload?: Json
          store?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list_entries: {
        Row: {
          added_by: string
          created_at: string
          household_id: string
          id: string
          list_id: string
          notes: string
          priority: string
          product_id: string
          purchase_unit: string
          purchased_by: string | null
          quantity: number
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          added_by: string
          created_at?: string
          household_id: string
          id?: string
          list_id: string
          notes?: string
          priority?: string
          product_id: string
          purchase_unit: string
          purchased_by?: string | null
          quantity: number
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          added_by?: string
          created_at?: string
          household_id?: string
          id?: string
          list_id?: string
          notes?: string
          priority?: string
          product_id?: string
          purchase_unit?: string
          purchased_by?: string | null
          quantity?: number
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_entries_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_entries_household_id_list_id_fkey"
            columns: ["household_id", "list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["household_id", "id"]
          },
          {
            foreignKeyName: "shopping_list_entries_household_id_product_id_fkey"
            columns: ["household_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["household_id", "id"]
          },
          {
            foreignKeyName: "shopping_list_entries_purchased_by_fkey"
            columns: ["purchased_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_lists: {
        Row: {
          created_at: string
          household_id: string
          id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_lists_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      household_action: {
        Args: { action: string; payload: Json }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
