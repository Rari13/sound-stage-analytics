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
      artist_performances: {
        Row: {
          artist_id: string | null
          artist_name: string
          capacity: number | null
          city: string
          created_at: string | null
          event_date: string
          event_id: string | null
          id: string
          organizer_id: string | null
          revenue_cents: number | null
          tickets_sold: number | null
          venue_id: string | null
        }
        Insert: {
          artist_id?: string | null
          artist_name: string
          capacity?: number | null
          city: string
          created_at?: string | null
          event_date: string
          event_id?: string | null
          id?: string
          organizer_id?: string | null
          revenue_cents?: number | null
          tickets_sold?: number | null
          venue_id?: string | null
        }
        Update: {
          artist_id?: string | null
          artist_name?: string
          capacity?: number | null
          city?: string
          created_at?: string | null
          event_date?: string
          event_id?: string | null
          id?: string
          organizer_id?: string | null
          revenue_cents?: number | null
          tickets_sold?: number | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_performances_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_performances_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_performances_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_performances_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "public_organizers_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_performances_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_profiles: {
        Row: {
          created_at: string | null
          external_popularity_score: number | null
          genres: string[] | null
          id: string
          monthly_listeners: number | null
          name: string
          profile_vector: Json | null
          social_followers: number | null
          spotify_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          external_popularity_score?: number | null
          genres?: string[] | null
          id?: string
          monthly_listeners?: number | null
          name: string
          profile_vector?: Json | null
          social_followers?: number | null
          spotify_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          external_popularity_score?: number | null
          genres?: string[] | null
          id?: string
          monthly_listeners?: number | null
          name?: string
          profile_vector?: Json | null
          social_followers?: number | null
          spotify_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          country: string
          event_date: string
          event_name: string
          event_type: string
          id: string
          impact_on_nightlife: number | null
          notes: string | null
          region: string | null
        }
        Insert: {
          country?: string
          event_date: string
          event_name: string
          event_type: string
          id?: string
          impact_on_nightlife?: number | null
          notes?: string | null
          region?: string | null
        }
        Update: {
          country?: string
          event_date?: string
          event_name?: string
          event_type?: string
          id?: string
          impact_on_nightlife?: number | null
          notes?: string | null
          region?: string | null
        }
        Relationships: []
      }
      client_profiles: {
        Row: {
          address: string | null
          age_group: string | null
          art_movements: string[] | null
          artists: string[] | null
          avg_ticket_price_cents: number | null
          city: string | null
          created_at: string | null
          early_bird_rate: number | null
          gender: string | null
          last_minute_rate: number | null
          last_survey_at: string | null
          latitude: number | null
          longitude: number | null
          max_distance_km: number | null
          max_ticket_price_cents: number | null
          nationality: string | null
          onboarding_completed_at: string | null
          preferred_genres: string[] | null
          price_sensitivity_score: number | null
          promo_usage_rate: number | null
          purchase_frequency: string | null
          region: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          age_group?: string | null
          art_movements?: string[] | null
          artists?: string[] | null
          avg_ticket_price_cents?: number | null
          city?: string | null
          created_at?: string | null
          early_bird_rate?: number | null
          gender?: string | null
          last_minute_rate?: number | null
          last_survey_at?: string | null
          latitude?: number | null
          longitude?: number | null
          max_distance_km?: number | null
          max_ticket_price_cents?: number | null
          nationality?: string | null
          onboarding_completed_at?: string | null
          preferred_genres?: string[] | null
          price_sensitivity_score?: number | null
          promo_usage_rate?: number | null
          purchase_frequency?: string | null
          region?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          age_group?: string | null
          art_movements?: string[] | null
          artists?: string[] | null
          avg_ticket_price_cents?: number | null
          city?: string | null
          created_at?: string | null
          early_bird_rate?: number | null
          gender?: string | null
          last_minute_rate?: number | null
          last_survey_at?: string | null
          latitude?: number | null
          longitude?: number | null
          max_distance_km?: number | null
          max_ticket_price_cents?: number | null
          nationality?: string | null
          onboarding_completed_at?: string | null
          preferred_genres?: string[] | null
          price_sensitivity_score?: number | null
          promo_usage_rate?: number | null
          purchase_frequency?: string | null
          region?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      competitive_events: {
        Row: {
          competitor_capacity: number | null
          competitor_city: string
          competitor_date: string
          competitor_event_id: string | null
          competitor_genre: string | null
          competitor_name: string
          competitor_venue: string | null
          created_at: string | null
          date_overlap_days: number | null
          distance_km: number | null
          event_id: string
          genre_overlap_score: number | null
          id: string
          impact_score: number | null
          source: string | null
        }
        Insert: {
          competitor_capacity?: number | null
          competitor_city: string
          competitor_date: string
          competitor_event_id?: string | null
          competitor_genre?: string | null
          competitor_name: string
          competitor_venue?: string | null
          created_at?: string | null
          date_overlap_days?: number | null
          distance_km?: number | null
          event_id: string
          genre_overlap_score?: number | null
          id?: string
          impact_score?: number | null
          source?: string | null
        }
        Update: {
          competitor_capacity?: number | null
          competitor_city?: string
          competitor_date?: string
          competitor_event_id?: string | null
          competitor_genre?: string | null
          competitor_name?: string
          competitor_venue?: string | null
          created_at?: string | null
          date_overlap_days?: number | null
          distance_km?: number | null
          event_id?: string
          genre_overlap_score?: number | null
          id?: string
          impact_score?: number | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitive_events_competitor_event_id_fkey"
            columns: ["competitor_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitive_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_predictions: {
        Row: {
          bass_curve: Json | null
          calculated_at: string | null
          competition_factor: number | null
          confidence_interval_high: number | null
          confidence_interval_low: number | null
          demand_std_deviation: number | null
          event_id: string | null
          expected_demand: number | null
          expires_at: string | null
          f_sat: number | null
          id: string
          ipc_base: number | null
          ipc_score: number | null
          m_la: number | null
          optimal_price_cents: number | null
          organizer_id: string | null
          recommended_price_cents: number | null
          seasonality_factor: number | null
          sell_out_probability: number | null
          version: number | null
          weather_factor: number | null
        }
        Insert: {
          bass_curve?: Json | null
          calculated_at?: string | null
          competition_factor?: number | null
          confidence_interval_high?: number | null
          confidence_interval_low?: number | null
          demand_std_deviation?: number | null
          event_id?: string | null
          expected_demand?: number | null
          expires_at?: string | null
          f_sat?: number | null
          id?: string
          ipc_base?: number | null
          ipc_score?: number | null
          m_la?: number | null
          optimal_price_cents?: number | null
          organizer_id?: string | null
          recommended_price_cents?: number | null
          seasonality_factor?: number | null
          sell_out_probability?: number | null
          version?: number | null
          weather_factor?: number | null
        }
        Update: {
          bass_curve?: Json | null
          calculated_at?: string | null
          competition_factor?: number | null
          confidence_interval_high?: number | null
          confidence_interval_low?: number | null
          demand_std_deviation?: number | null
          event_id?: string | null
          expected_demand?: number | null
          expires_at?: string | null
          f_sat?: number | null
          id?: string
          ipc_base?: number | null
          ipc_score?: number | null
          m_la?: number | null
          optimal_price_cents?: number | null
          organizer_id?: string | null
          recommended_price_cents?: number | null
          seasonality_factor?: number | null
          sell_out_probability?: number | null
          version?: number | null
          weather_factor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "demand_predictions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_predictions_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_predictions_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "public_organizers_view"
            referencedColumns: ["id"]
          },
        ]
      }
      event_simulations: {
        Row: {
          ai_recommendation: string | null
          artist_id: string | null
          artist_name: string
          break_even_tickets: number | null
          cachet_cents: number
          capacity: number
          city: string
          competition_factor: number | null
          confidence_interval_high: number | null
          confidence_interval_low: number | null
          created_at: string
          demand_std_deviation: number | null
          expected_demand: number | null
          expected_profit_cents: number | null
          expected_revenue_cents: number | null
          f_sat: number | null
          id: string
          ipc_base: number | null
          ipc_score: number | null
          is_viable: boolean | null
          m_la: number | null
          optimal_price_cents: number | null
          organizer_id: string
          profit_margin: number | null
          recommended_price_cents: number | null
          risk_assessment: string | null
          seasonality_factor: number | null
          sell_out_probability: number | null
          target_date: string | null
          updated_at: string
          venue_id: string | null
          venue_name: string
          weather_factor: number | null
        }
        Insert: {
          ai_recommendation?: string | null
          artist_id?: string | null
          artist_name: string
          break_even_tickets?: number | null
          cachet_cents: number
          capacity: number
          city: string
          competition_factor?: number | null
          confidence_interval_high?: number | null
          confidence_interval_low?: number | null
          created_at?: string
          demand_std_deviation?: number | null
          expected_demand?: number | null
          expected_profit_cents?: number | null
          expected_revenue_cents?: number | null
          f_sat?: number | null
          id?: string
          ipc_base?: number | null
          ipc_score?: number | null
          is_viable?: boolean | null
          m_la?: number | null
          optimal_price_cents?: number | null
          organizer_id: string
          profit_margin?: number | null
          recommended_price_cents?: number | null
          risk_assessment?: string | null
          seasonality_factor?: number | null
          sell_out_probability?: number | null
          target_date?: string | null
          updated_at?: string
          venue_id?: string | null
          venue_name: string
          weather_factor?: number | null
        }
        Update: {
          ai_recommendation?: string | null
          artist_id?: string | null
          artist_name?: string
          break_even_tickets?: number | null
          cachet_cents?: number
          capacity?: number
          city?: string
          competition_factor?: number | null
          confidence_interval_high?: number | null
          confidence_interval_low?: number | null
          created_at?: string
          demand_std_deviation?: number | null
          expected_demand?: number | null
          expected_profit_cents?: number | null
          expected_revenue_cents?: number | null
          f_sat?: number | null
          id?: string
          ipc_base?: number | null
          ipc_score?: number | null
          is_viable?: boolean | null
          m_la?: number | null
          optimal_price_cents?: number | null
          organizer_id?: string
          profit_margin?: number | null
          recommended_price_cents?: number | null
          risk_assessment?: string | null
          seasonality_factor?: number | null
          sell_out_probability?: number | null
          target_date?: string | null
          updated_at?: string
          venue_id?: string | null
          venue_name?: string
          weather_factor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_simulations_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_simulations_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_simulations_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "public_organizers_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_simulations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          survey_completed_at: string | null
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
          survey_completed_at?: string | null
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
          survey_completed_at?: string | null
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
      generated_flyers: {
        Row: {
          created_at: string
          id: string
          image_url: string
          organizer_id: string
          prompt_used: string | null
          style: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          organizer_id: string
          prompt_used?: string | null
          style?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          organizer_id?: string
          prompt_used?: string | null
          style?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_flyers_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_flyers_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "public_organizers_view"
            referencedColumns: ["id"]
          },
        ]
      }
      group_order_participants: {
        Row: {
          amount_cents: number
          created_at: string | null
          email: string
          group_order_id: string
          id: string
          paid_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          email: string
          group_order_id: string
          id?: string
          paid_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          email?: string
          group_order_id?: string
          id?: string
          paid_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_order_participants_group_order_id_fkey"
            columns: ["group_order_id"]
            isOneToOne: false
            referencedRelation: "group_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      group_orders: {
        Row: {
          created_at: string | null
          creator_user_id: string
          event_id: string
          expires_at: string
          id: string
          price_per_ticket_cents: number
          share_code: string
          status: string
          total_tickets: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_user_id: string
          event_id: string
          expires_at?: string
          id?: string
          price_per_ticket_cents: number
          share_code?: string
          status?: string
          total_tickets: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_user_id?: string
          event_id?: string
          expires_at?: string
          id?: string
          price_per_ticket_cents?: number
          share_code?: string
          status?: string
          total_tickets?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      historical_events: {
        Row: {
          city: string | null
          created_at: string | null
          date: string
          genre: string | null
          id: string
          organizer_id: string
          revenue_cents: number | null
          tickets_sold: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          date: string
          genre?: string | null
          id?: string
          organizer_id: string
          revenue_cents?: number | null
          tickets_sold?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          date?: string
          genre?: string | null
          id?: string
          organizer_id?: string
          revenue_cents?: number | null
          tickets_sold?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historical_events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "public_organizers_view"
            referencedColumns: ["id"]
          },
        ]
      }
      no_show_analytics: {
        Row: {
          calculated_at: string | null
          event_id: string
          id: string
          no_show_rate: number | null
          segment_type: string
          segment_value: string
          tickets_scanned: number
          tickets_sold: number
        }
        Insert: {
          calculated_at?: string | null
          event_id: string
          id?: string
          no_show_rate?: number | null
          segment_type: string
          segment_value: string
          tickets_scanned: number
          tickets_sold: number
        }
        Update: {
          calculated_at?: string | null
          event_id?: string
          id?: string
          no_show_rate?: number | null
          segment_type?: string
          segment_value?: string
          tickets_scanned?: number
          tickets_sold?: number
        }
        Relationships: [
          {
            foreignKeyName: "no_show_analytics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
          custom_commission_fixed_cents: number | null
          custom_commission_rate_bps: number | null
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
          custom_commission_fixed_cents?: number | null
          custom_commission_rate_bps?: number | null
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
          custom_commission_fixed_cents?: number | null
          custom_commission_rate_bps?: number | null
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
      price_change_events: {
        Row: {
          changed_at: string
          created_at: string | null
          elasticity_observed: number | null
          event_id: string
          id: string
          price_after_cents: number
          price_before_cents: number
          price_tier_id: string | null
          reason: string | null
          sales_24h_after: number | null
          sales_24h_before: number | null
        }
        Insert: {
          changed_at?: string
          created_at?: string | null
          elasticity_observed?: number | null
          event_id: string
          id?: string
          price_after_cents: number
          price_before_cents: number
          price_tier_id?: string | null
          reason?: string | null
          sales_24h_after?: number | null
          sales_24h_before?: number | null
        }
        Update: {
          changed_at?: string
          created_at?: string | null
          elasticity_observed?: number | null
          event_id?: string
          id?: string
          price_after_cents?: number
          price_before_cents?: number
          price_tier_id?: string | null
          reason?: string | null
          sales_24h_after?: number | null
          sales_24h_before?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_change_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_change_events_price_tier_id_fkey"
            columns: ["price_tier_id"]
            isOneToOne: false
            referencedRelation: "price_tiers"
            referencedColumns: ["id"]
          },
        ]
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
      promo_codes: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          event_id: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          organizer_id: string
          starts_at: string | null
          updated_at: string
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          event_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          organizer_id: string
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          event_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          organizer_id?: string
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "public_organizers_view"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_requests: {
        Row: {
          created_at: string
          event_id: string
          id: string
          order_id: string
          organizer_id: string
          reason: string
          responded_at: string | null
          response_message: string | null
          status: string
          ticket_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          order_id: string
          organizer_id: string
          reason: string
          responded_at?: string | null
          response_message?: string | null
          status?: string
          ticket_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          order_id?: string
          organizer_id?: string
          reason?: string
          responded_at?: string | null
          response_message?: string | null
          status?: string
          ticket_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "public_organizers_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_snapshots: {
        Row: {
          created_at: string | null
          current_price_cents: number | null
          days_until_event: number | null
          event_id: string
          fill_rate: number | null
          id: string
          revenue_cents: number
          snapshot_at: string
          tickets_sold: number
          velocity_per_hour: number | null
        }
        Insert: {
          created_at?: string | null
          current_price_cents?: number | null
          days_until_event?: number | null
          event_id: string
          fill_rate?: number | null
          id?: string
          revenue_cents?: number
          snapshot_at?: string
          tickets_sold?: number
          velocity_per_hour?: number | null
        }
        Update: {
          created_at?: string | null
          current_price_cents?: number | null
          days_until_event?: number | null
          event_id?: string
          fill_rate?: number | null
          id?: string
          revenue_cents?: number
          snapshot_at?: string
          tickets_sold?: number
          velocity_per_hour?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
      scan_links: {
        Row: {
          created_at: string
          device_id: string
          event_id: string
          expires_at: string
          id: string
          is_active: boolean
          organizer_id: string
          token: string
        }
        Insert: {
          created_at?: string
          device_id: string
          event_id: string
          expires_at: string
          id?: string
          is_active?: boolean
          organizer_id: string
          token?: string
        }
        Update: {
          created_at?: string
          device_id?: string
          event_id?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          organizer_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_links_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "scan_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_links_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_links_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_links_organizer_id_fkey"
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
      swipes: {
        Row: {
          created_at: string | null
          direction: string
          event_id: string
          filters_context: Json | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          direction: string
          event_id: string
          filters_context?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          direction?: string
          event_id?: string
          filters_context?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          event_id: string
          id: string
          is_for_sale: boolean | null
          issued_at: string | null
          order_id: string
          original_price_cents: number | null
          qr_hash: string | null
          qr_token: string
          resale_price_cents: number | null
          status: string | null
          used_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          event_id: string
          id?: string
          is_for_sale?: boolean | null
          issued_at?: string | null
          order_id: string
          original_price_cents?: number | null
          qr_hash?: string | null
          qr_token: string
          resale_price_cents?: number | null
          status?: string | null
          used_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          event_id?: string
          id?: string
          is_for_sale?: boolean | null
          issued_at?: string | null
          order_id?: string
          original_price_cents?: number | null
          qr_hash?: string | null
          qr_token?: string
          resale_price_cents?: number | null
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
      venue_profiles: {
        Row: {
          capacity: number | null
          city: string
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          organizer_id: string | null
          population: number | null
          profile_vector: Json | null
          updated_at: string | null
          venue_name: string
          venue_type: string | null
        }
        Insert: {
          capacity?: number | null
          city: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          organizer_id?: string | null
          population?: number | null
          profile_vector?: Json | null
          updated_at?: string | null
          venue_name: string
          venue_type?: string | null
        }
        Update: {
          capacity?: number | null
          city?: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          organizer_id?: string | null
          population?: number | null
          profile_vector?: Json | null
          updated_at?: string | null
          venue_name?: string
          venue_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_profiles_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_profiles_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "public_organizers_view"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_forecasts: {
        Row: {
          city: string
          fetched_at: string | null
          forecast_date: string
          id: string
          precipitation_mm: number | null
          precipitation_probability: number | null
          source: string | null
          temperature_high_c: number | null
          temperature_low_c: number | null
          weather_condition: string | null
          weather_score: number | null
        }
        Insert: {
          city: string
          fetched_at?: string | null
          forecast_date: string
          id?: string
          precipitation_mm?: number | null
          precipitation_probability?: number | null
          source?: string | null
          temperature_high_c?: number | null
          temperature_low_c?: number | null
          weather_condition?: string | null
          weather_score?: number | null
        }
        Update: {
          city?: string
          fetched_at?: string | null
          forecast_date?: string
          id?: string
          precipitation_mm?: number | null
          precipitation_probability?: number | null
          source?: string | null
          temperature_high_c?: number | null
          temperature_low_c?: number | null
          weather_condition?: string | null
          weather_score?: number | null
        }
        Relationships: []
      }
      yield_recommendations: {
        Row: {
          actual_velocity: number | null
          applied_at: string | null
          confidence_score: number | null
          created_at: string | null
          current_fill_rate: number | null
          current_price_cents: number | null
          current_tickets_sold: number | null
          days_until_event: number | null
          event_id: string
          expected_velocity: number | null
          expires_at: string | null
          id: string
          organizer_id: string
          predicted_demand: number | null
          price_change_percent: number | null
          reasoning: string | null
          recommended_action: string | null
          recommended_price_cents: number | null
          revenue_at_risk_cents: number | null
          sell_out_risk: string | null
          status: string | null
          velocity_ratio: number | null
        }
        Insert: {
          actual_velocity?: number | null
          applied_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          current_fill_rate?: number | null
          current_price_cents?: number | null
          current_tickets_sold?: number | null
          days_until_event?: number | null
          event_id: string
          expected_velocity?: number | null
          expires_at?: string | null
          id?: string
          organizer_id: string
          predicted_demand?: number | null
          price_change_percent?: number | null
          reasoning?: string | null
          recommended_action?: string | null
          recommended_price_cents?: number | null
          revenue_at_risk_cents?: number | null
          sell_out_risk?: string | null
          status?: string | null
          velocity_ratio?: number | null
        }
        Update: {
          actual_velocity?: number | null
          applied_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          current_fill_rate?: number | null
          current_price_cents?: number | null
          current_tickets_sold?: number | null
          days_until_event?: number | null
          event_id?: string
          expected_velocity?: number | null
          expires_at?: string | null
          id?: string
          organizer_id?: string
          predicted_demand?: number | null
          price_change_percent?: number | null
          reasoning?: string | null
          recommended_action?: string | null
          recommended_price_cents?: number | null
          revenue_at_risk_cents?: number | null
          sell_out_risk?: string | null
          status?: string | null
          velocity_ratio?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "yield_recommendations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_recommendations_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_recommendations_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "public_organizers_view"
            referencedColumns: ["id"]
          },
        ]
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
      calculate_f_sat: {
        Args: { p_artist_name: string; p_city: string; p_population?: number }
        Returns: number
      }
      calculate_saturation_pressure: {
        Args: { p_artist_name: string; p_city: string; p_lambda?: number }
        Returns: number
      }
      generate_event_slug: {
        Args: { event_id: string; event_title: string }
        Returns: string
      }
      generate_short_code: { Args: never; Returns: string }
      get_market_trends: {
        Args: { target_city: string; target_genre: string }
        Returns: {
          mois: string
          prix_moyen: number
          remplissage: number
          trend_status: string
          volume_billets: number
        }[]
      }
      get_secure_market_insights: {
        Args: { target_city?: string; target_genre?: string }
        Returns: {
          genre: string
          mois: string
          nb_evenements: number
          nb_organisateurs: number
          prix_moyen_marche: number
          remplissage_moyen: number
          total_volume_billets: number
          ville: string
        }[]
      }
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
