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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      client_profiles: {
        Row: {
          age_group: string | null
          art_movements: string[] | null
          artists: string[] | null
          city: string | null
          created_at: string | null
          gender: string | null
          last_survey_at: string | null
          latitude: number | null
          longitude: number | null
          max_distance_km: number | null
          nationality: string | null
          onboarding_completed_at: string | null
          preferred_genres: string[] | null
          region: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          age_group?: string | null
          art_movements?: string[] | null
          artists?: string[] | null
          city?: string | null
          created_at?: string | null
          gender?: string | null
          last_survey_at?: string | null
          latitude?: number | null
          longitude?: number | null
          max_distance_km?: number | null
          nationality?: string | null
          onboarding_completed_at?: string | null
          preferred_genres?: string[] | null
          region?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          age_group?: string | null
          art_movements?: string[] | null
          artists?: string[] | null
          city?: string | null
          created_at?: string | null
          gender?: string | null
          last_survey_at?: string | null
          latitude?: number | null
          longitude?: number | null
          max_distance_km?: number | null
          nationality?: string | null
          onboarding_completed_at?: string | null
          preferred_genres?: string[] | null
          region?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          address_line1: string | null
          banner_url: string | null
          capacity: number | null
          city: string
          country: string | null
          cover_image: Json | null
          created_at: string | null
          description: string | null
          ends_at: string
          event_type: string | null
          id: string
          is_searchable: boolean | null
          latitude: number | null
          longitude: number | null
          music_genres: string[] | null
          organizer_id: string
          postal_code: string | null
          published_at: string | null
          short_description: string | null
          slug: string
          starts_at: string
          status: string | null
          subtitle: string | null
          timezone: string | null
          title: string
          updated_at: string | null
          venue: string
        }
        Insert: {
          address_line1?: string | null
          banner_url?: string | null
          capacity?: number | null
          city: string
          country?: string | null
          cover_image?: Json | null
          created_at?: string | null
          description?: string | null
          ends_at: string
          event_type?: string | null
          id?: string
          is_searchable?: boolean | null
          latitude?: number | null
          longitude?: number | null
          music_genres?: string[] | null
          organizer_id: string
          postal_code?: string | null
          published_at?: string | null
          short_description?: string | null
          slug: string
          starts_at: string
          status?: string | null
          subtitle?: string | null
          timezone?: string | null
          title: string
          updated_at?: string | null
          venue: string
        }
        Update: {
          address_line1?: string | null
          banner_url?: string | null
          capacity?: number | null
          city?: string
          country?: string | null
          cover_image?: Json | null
          created_at?: string | null
          description?: string | null
          ends_at?: string
          event_type?: string | null
          id?: string
          is_searchable?: boolean | null
          latitude?: number | null
          longitude?: number | null
          music_genres?: string[] | null
          organizer_id?: string
          postal_code?: string | null
          published_at?: string | null
          short_description?: string | null
          slug?: string
          starts_at?: string
          status?: string | null
          subtitle?: string | null
          timezone?: string | null
          title?: string
          updated_at?: string | null
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "public_organizers_view"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          id: string
          organizer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organizer_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organizer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "public_organizers_view"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_total_cents: number
          application_fee_cents: number | null
          created_at: string | null
          currency: string | null
          event_id: string
          id: string
          organizer_id: string
          short_code: string
          status: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          amount_total_cents: number
          application_fee_cents?: number | null
          created_at?: string | null
          currency?: string | null
          event_id: string
          id?: string
          organizer_id: string
          short_code: string
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          amount_total_cents?: number
          application_fee_cents?: number | null
          created_at?: string | null
          currency?: string | null
          event_id?: string
          id?: string
          organizer_id?: string
          short_code?: string
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "public_organizers_view"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          monthly_price_cents: number
          organizer_id: string
          plan_type: string
          started_at: string
          status: string
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          monthly_price_cents?: number
          organizer_id: string
          plan_type: string
          started_at?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          monthly_price_cents?: number
          organizer_id?: string
          plan_type?: string
          started_at?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizer_subscriptions_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizer_subscriptions_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "public_organizers_view"
            referencedColumns: ["id"]
          },
        ]
      }
      organizers: {
        Row: {
          avatar_url: string | null
          bio: string | null
          commission_fixed_eur: number | null
          commission_rate_bps: number | null
          created_at: string | null
          id: string
          instant_payout_enabled: boolean | null
          name: string
          owner_user_id: string
          payout_mode: string | null
          phone: string | null
          siret: string | null
          slug: string
          stripe_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          commission_fixed_eur?: number | null
          commission_rate_bps?: number | null
          created_at?: string | null
          id?: string
          instant_payout_enabled?: boolean | null
          name: string
          owner_user_id: string
          payout_mode?: string | null
          phone?: string | null
          siret?: string | null
          slug: string
          stripe_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          commission_fixed_eur?: number | null
          commission_rate_bps?: number | null
          created_at?: string | null
          id?: string
          instant_payout_enabled?: boolean | null
          name?: string
          owner_user_id?: string
          payout_mode?: string | null
          phone?: string | null
          siret?: string | null
          slug?: string
          stripe_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      price_tiers: {
        Row: {
          created_at: string | null
          currency: string | null
          ends_at: string | null
          event_id: string
          has_timer: boolean | null
          hidden: boolean | null
          id: string
          name: string
          price_cents: number
          quota: number | null
          sort_order: number | null
          starts_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          ends_at?: string | null
          event_id: string
          has_timer?: boolean | null
          hidden?: boolean | null
          id?: string
          name: string
          price_cents: number
          quota?: number | null
          sort_order?: number | null
          starts_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          ends_at?: string | null
          event_id?: string
          has_timer?: boolean | null
          hidden?: boolean | null
          id?: string
          name?: string
          price_cents?: number
          quota?: number | null
          sort_order?: number | null
          starts_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          legal_version: string | null
          privacy_accepted_at: string | null
          role: string | null
          terms_accepted_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          legal_version?: string | null
          privacy_accepted_at?: string | null
          role?: string | null
          terms_accepted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          legal_version?: string | null
          privacy_accepted_at?: string | null
          role?: string | null
          terms_accepted_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scan_devices: {
        Row: {
          created_at: string | null
          device_key: string
          id: string
          last_seen: string | null
          name: string
          organizer_id: string
        }
        Insert: {
          created_at?: string | null
          device_key: string
          id?: string
          last_seen?: string | null
          name: string
          organizer_id: string
        }
        Update: {
          created_at?: string | null
          device_key?: string
          id?: string
          last_seen?: string | null
          name?: string
          organizer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_devices_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_devices_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "public_organizers_view"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_logs: {
        Row: {
          details: Json | null
          device_id: string | null
          event_id: string
          id: string
          result: string
          scanned_at: string | null
          session_id: string | null
          ticket_id: string | null
        }
        Insert: {
          details?: Json | null
          device_id?: string | null
          event_id: string
          id?: string
          result: string
          scanned_at?: string | null
          session_id?: string | null
          ticket_id?: string | null
        }
        Update: {
          details?: Json | null
          device_id?: string | null
          event_id?: string
          id?: string
          result?: string
          scanned_at?: string | null
          session_id?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_sessions: {
        Row: {
          created_by: string
          device_id: string
          ends_at: string | null
          event_id: string
          id: string
          is_active: boolean | null
          organizer_id: string
          started_at: string | null
        }
        Insert: {
          created_by: string
          device_id: string
          ends_at?: string | null
          event_id: string
          id?: string
          is_active?: boolean | null
          organizer_id: string
          started_at?: string | null
        }
        Update: {
          created_by?: string
          device_id?: string
          ends_at?: string | null
          event_id?: string
          id?: string
          is_active?: boolean | null
          organizer_id?: string
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "scan_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_sessions_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_sessions_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "public_organizers_view"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          event_id: string
          id: string
          issued_at: string | null
          order_id: string
          qr_hash: string | null
          qr_token: string
          status: string | null
          used_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          event_id: string
          id?: string
          issued_at?: string | null
          order_id: string
          qr_hash?: string | null
          qr_token: string
          status?: string | null
          used_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          event_id?: string
          id?: string
          issued_at?: string | null
          order_id?: string
          qr_hash?: string | null
          qr_token?: string
          status?: string | null
          used_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_organizers_view: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          id: string | null
          name: string | null
          slug: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      generate_event_slug: {
        Args: { event_id: string; event_title: string }
        Returns: string
      }
      generate_short_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_email_confirmed: { Args: { uid: string }; Returns: boolean }
      validate_ticket: {
        Args: { p_device_key: string; p_event_id: string; p_qr_token: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "client" | "organizer" | "scan_agent" | "admin"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["client", "organizer", "scan_agent", "admin"],
    },
  },
} as const
