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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          created_at: string
          id: string
          ip: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      accounts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          owner_user_id: string | null
          plan_kit_id: string | null
          seats_purchased: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscribed: boolean
          subscription_tier: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          owner_user_id?: string | null
          plan_kit_id?: string | null
          seats_purchased?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_tier?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          owner_user_id?: string | null
          plan_kit_id?: string | null
          seats_purchased?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_tier?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_plan_kit_id_fkey"
            columns: ["plan_kit_id"]
            isOneToOne: false
            referencedRelation: "plan_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          target_id: string | null
          target_table: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      auth_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: unknown | null
          success: boolean
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address?: unknown | null
          success?: boolean
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: unknown | null
          success?: boolean
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          active: boolean
          conditions: Json
          created_at: string
          delay_hours: number
          id: string
          name: string
          template_type: string
          trigger: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          conditions?: Json
          created_at?: string
          delay_hours?: number
          id?: string
          name: string
          template_type: string
          trigger: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          conditions?: Json
          created_at?: string
          delay_hours?: number
          id?: string
          name?: string
          template_type?: string
          trigger?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      email_jobs: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          scheduled_for: string
          status: string
          template_type: string
          to_email: string
          updated_at: string
          variables: Json
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          scheduled_for?: string
          status?: string
          template_type: string
          to_email: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          scheduled_for?: string
          status?: string
          template_type?: string
          to_email?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          sent_at: string
          status: string
          subscriber_id: string | null
          template_type: string
          user_email: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          sent_at?: string
          status?: string
          subscriber_id?: string | null
          template_type: string
          user_email: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          sent_at?: string
          status?: string
          subscriber_id?: string | null
          template_type?: string
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          html: string
          id: string
          subject: string
          type: Database["public"]["Enums"]["email_template_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          html: string
          id?: string
          subject: string
          type: Database["public"]["Enums"]["email_template_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          html?: string
          id?: string
          subject?: string
          type?: Database["public"]["Enums"]["email_template_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      plan_kits: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          description: string | null
          features: string[] | null
          id: string
          name: string
          price_cents: number
          seats: number
          sort_order: number
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          features?: string[] | null
          id?: string
          name: string
          price_cents: number
          seats: number
          sort_order?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          features?: string[] | null
          id?: string
          name?: string
          price_cents?: number
          seats?: number
          sort_order?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      plan_settings: {
        Row: {
          annual_discount: number
          auto_billing: boolean
          auto_trial: boolean
          coupons_enabled: boolean
          created_at: string
          first_purchase_discount: number
          id: string
          trial_days: number
          updated_at: string
        }
        Insert: {
          annual_discount?: number
          auto_billing?: boolean
          auto_trial?: boolean
          coupons_enabled?: boolean
          created_at?: string
          first_purchase_discount?: number
          id?: string
          trial_days?: number
          updated_at?: string
        }
        Update: {
          annual_discount?: number
          auto_billing?: boolean
          auto_trial?: boolean
          coupons_enabled?: boolean
          created_at?: string
          first_purchase_discount?: number
          id?: string
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          mobile_phone: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          mobile_phone?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          mobile_phone?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          currency: string
          id: string
          price_per_seat_cents: number
          stripe_publishable_key: string | null
          trial_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          price_per_seat_cents?: number
          stripe_publishable_key?: string | null
          trial_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          price_per_seat_cents?: number
          stripe_publishable_key?: string | null
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      smtp_settings: {
        Row: {
          created_at: string
          from_email: string
          host: string
          id: string
          password: string | null
          port: number
          secure: boolean
          updated_at: string
          updated_by: string | null
          username: string | null
        }
        Insert: {
          created_at?: string
          from_email: string
          host: string
          id?: string
          password?: string | null
          port?: number
          secure?: boolean
          updated_at?: string
          updated_by?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string
          from_email?: string
          host?: string
          id?: string
          password?: string | null
          port?: number
          secure?: boolean
          updated_at?: string
          updated_by?: string | null
          username?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          last_login_at: string | null
          source: string | null
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          user_email: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          last_login_at?: string | null
          source?: string | null
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          last_login_at?: string | null
          source?: string | null
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      user_memberships: {
        Row: {
          account_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["membership_status"]
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_memberships_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_auth_rate_limit: {
        Args: { client_ip?: unknown; user_email: string }
        Returns: boolean
      }
      get_admin_metrics: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_subscriptions: number
          active_trials: number
          average_ticket_cents: number
          revenue_growth_percentage: number
          subscription_growth_percentage: number
          total_admins: number
          total_monthly_revenue_cents: number
          total_users: number
        }[]
      }
      get_first_admin_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_account_member: {
        Args: { _account_id: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          action_type: string
          new_data?: Json
          old_data?: Json
          record_id?: string
          table_name?: string
        }
        Returns: undefined
      }
      log_auth_attempt: {
        Args: {
          client_ip?: unknown
          user_email: string
          was_successful?: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      email_template_type:
        | "welcome"
        | "trial_expired"
        | "payment_confirmed"
        | "email_confirmation"
        | "password_reset"
        | "trial_start"
        | "trial_ending"
        | "trial_ended"
        | "subscription_welcome"
        | "subscription_renewal"
        | "subscription_cancelled"
        | "payment_failed"
        | "tutorial_inicial"
      membership_status: "active" | "inactive"
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
      app_role: ["admin", "moderator", "user"],
      email_template_type: [
        "welcome",
        "trial_expired",
        "payment_confirmed",
        "email_confirmation",
        "password_reset",
        "trial_start",
        "trial_ending",
        "trial_ended",
        "subscription_welcome",
        "subscription_renewal",
        "subscription_cancelled",
        "payment_failed",
        "tutorial_inicial",
      ],
      membership_status: ["active", "inactive"],
    },
  },
} as const
