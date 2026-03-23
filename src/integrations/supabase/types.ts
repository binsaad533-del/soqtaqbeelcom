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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      backup_logs: {
        Row: {
          backup_type: string
          completed_at: string | null
          error_message: string | null
          id: string
          initiated_by: string | null
          metadata: Json | null
          size_bytes: number | null
          started_at: string
          status: string
          tables_included: Json | null
        }
        Insert: {
          backup_type?: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          initiated_by?: string | null
          metadata?: Json | null
          size_bytes?: number | null
          started_at?: string
          status?: string
          tables_included?: Json | null
        }
        Update: {
          backup_type?: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          initiated_by?: string | null
          metadata?: Json | null
          size_bytes?: number | null
          started_at?: string
          status?: string
          tables_included?: Json | null
        }
        Relationships: []
      }
      crm_lead_activities: {
        Row: {
          action_type: string
          actor_id: string
          created_at: string
          details: string | null
          id: string
          lead_id: string
        }
        Insert: {
          action_type: string
          actor_id: string
          created_at?: string
          details?: string | null
          id?: string
          lead_id: string
        }
        Update: {
          action_type?: string
          actor_id?: string
          created_at?: string
          details?: string | null
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          message: string | null
          phone: string
          source: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          message?: string | null
          phone: string
          source?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          message?: string | null
          phone?: string
          source?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      deal_agreements: {
        Row: {
          agreement_number: string
          amendment_reason: string | null
          business_activity: string | null
          buyer_approved: boolean
          buyer_approved_at: string | null
          buyer_contact: string | null
          buyer_name: string | null
          created_at: string
          deal_id: string
          deal_title: string | null
          deal_type: string | null
          declarations: Json | null
          documents_referenced: Json | null
          excluded_assets: Json | null
          financial_terms: Json | null
          id: string
          important_notes: Json | null
          included_assets: Json | null
          lease_details: Json | null
          liabilities: Json | null
          license_status: Json | null
          location: string | null
          pdf_path: string | null
          previous_version_id: string | null
          seller_approved: boolean
          seller_approved_at: string | null
          seller_contact: string | null
          seller_name: string | null
          status: string
          version: number
        }
        Insert: {
          agreement_number: string
          amendment_reason?: string | null
          business_activity?: string | null
          buyer_approved?: boolean
          buyer_approved_at?: string | null
          buyer_contact?: string | null
          buyer_name?: string | null
          created_at?: string
          deal_id: string
          deal_title?: string | null
          deal_type?: string | null
          declarations?: Json | null
          documents_referenced?: Json | null
          excluded_assets?: Json | null
          financial_terms?: Json | null
          id?: string
          important_notes?: Json | null
          included_assets?: Json | null
          lease_details?: Json | null
          liabilities?: Json | null
          license_status?: Json | null
          location?: string | null
          pdf_path?: string | null
          previous_version_id?: string | null
          seller_approved?: boolean
          seller_approved_at?: string | null
          seller_contact?: string | null
          seller_name?: string | null
          status?: string
          version?: number
        }
        Update: {
          agreement_number?: string
          amendment_reason?: string | null
          business_activity?: string | null
          buyer_approved?: boolean
          buyer_approved_at?: string | null
          buyer_contact?: string | null
          buyer_name?: string | null
          created_at?: string
          deal_id?: string
          deal_title?: string | null
          deal_type?: string | null
          declarations?: Json | null
          documents_referenced?: Json | null
          excluded_assets?: Json | null
          financial_terms?: Json | null
          id?: string
          important_notes?: Json | null
          included_assets?: Json | null
          lease_details?: Json | null
          liabilities?: Json | null
          license_status?: Json | null
          location?: string | null
          pdf_path?: string | null
          previous_version_id?: string | null
          seller_approved?: boolean
          seller_approved_at?: string | null
          seller_contact?: string | null
          seller_name?: string | null
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "deal_agreements_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_agreements_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "deal_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_checks: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          rating: string | null
          raw_input: Json | null
          requested_by: string | null
          status: string
          summary: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          rating?: string | null
          raw_input?: Json | null
          requested_by?: string | null
          status?: string
          summary?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          rating?: string | null
          raw_input?: Json | null
          requested_by?: string | null
          status?: string
          summary?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      deal_commissions: {
        Row: {
          commission_amount: number | null
          commission_rate: number
          created_at: string
          deal_amount: number
          deal_id: string
          id: string
          last_reminder_at: string | null
          marked_paid_at: string | null
          notes: string | null
          paid_at: string | null
          payment_status: string
          receipt_path: string | null
          reminder_count: number
          seller_id: string
          updated_at: string
        }
        Insert: {
          commission_amount?: number | null
          commission_rate?: number
          created_at?: string
          deal_amount?: number
          deal_id: string
          id?: string
          last_reminder_at?: string | null
          marked_paid_at?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_status?: string
          receipt_path?: string | null
          reminder_count?: number
          seller_id: string
          updated_at?: string
        }
        Update: {
          commission_amount?: number | null
          commission_rate?: number
          created_at?: string
          deal_amount?: number
          deal_id?: string
          id?: string
          last_reminder_at?: string | null
          marked_paid_at?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_status?: string
          receipt_path?: string | null
          reminder_count?: number
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_commissions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: true
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_history: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          deal_id: string
          details: Json | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          deal_id: string
          details?: Json | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          deal_id?: string
          details?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          agreed_price: number | null
          buyer_id: string | null
          completed_at: string | null
          created_at: string
          deal_details: Json | null
          deal_type: string | null
          fraud_flags: Json | null
          id: string
          listing_id: string
          locked: boolean
          risk_factors: Json | null
          risk_score: number | null
          seller_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agreed_price?: number | null
          buyer_id?: string | null
          completed_at?: string | null
          created_at?: string
          deal_details?: Json | null
          deal_type?: string | null
          fraud_flags?: Json | null
          id?: string
          listing_id: string
          locked?: boolean
          risk_factors?: Json | null
          risk_score?: number | null
          seller_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agreed_price?: number | null
          buyer_id?: string | null
          completed_at?: string | null
          created_at?: string
          deal_details?: Json | null
          deal_type?: string | null
          fraud_flags?: Json | null
          id?: string
          listing_id?: string
          locked?: boolean
          risk_factors?: Json | null
          risk_score?: number | null
          seller_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      failed_login_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      legal_confirmations: {
        Row: {
          confirmations: Json
          confirmed_at: string
          deal_id: string
          deal_snapshot: Json
          id: string
          invalidated_at: string | null
          invalidation_reason: string | null
          ip_address: string | null
          party_role: string
          user_agent: string | null
          user_id: string
          version: number
        }
        Insert: {
          confirmations?: Json
          confirmed_at?: string
          deal_id: string
          deal_snapshot?: Json
          id?: string
          invalidated_at?: string | null
          invalidation_reason?: string | null
          ip_address?: string | null
          party_role: string
          user_agent?: string | null
          user_id: string
          version?: number
        }
        Update: {
          confirmations?: Json
          confirmed_at?: string
          deal_id?: string
          deal_snapshot?: Json
          id?: string
          invalidated_at?: string | null
          invalidation_reason?: string | null
          ip_address?: string | null
          party_role?: string
          user_agent?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "legal_confirmations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          ai_rating: string | null
          ai_structure_validation: Json | null
          ai_summary: string | null
          annual_rent: number | null
          business_activity: string | null
          category: string | null
          city: string | null
          civil_defense_license: string | null
          created_at: string
          deal_disclosures: Json | null
          deal_options: Json | null
          deal_type: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          disclosure_score: number | null
          district: string | null
          documents: Json | null
          featured: boolean
          fraud_flags: Json | null
          fraud_score: number | null
          id: string
          inventory: Json | null
          lease_duration: string | null
          lease_paid_period: string | null
          lease_remaining: string | null
          liabilities: string | null
          municipality_license: string | null
          overdue_rent: string | null
          overdue_salaries: string | null
          owner_id: string
          photos: Json | null
          price: number | null
          primary_deal_type: string | null
          published_at: string | null
          required_documents: Json | null
          status: string
          surveillance_cameras: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          ai_rating?: string | null
          ai_structure_validation?: Json | null
          ai_summary?: string | null
          annual_rent?: number | null
          business_activity?: string | null
          category?: string | null
          city?: string | null
          civil_defense_license?: string | null
          created_at?: string
          deal_disclosures?: Json | null
          deal_options?: Json | null
          deal_type?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          disclosure_score?: number | null
          district?: string | null
          documents?: Json | null
          featured?: boolean
          fraud_flags?: Json | null
          fraud_score?: number | null
          id?: string
          inventory?: Json | null
          lease_duration?: string | null
          lease_paid_period?: string | null
          lease_remaining?: string | null
          liabilities?: string | null
          municipality_license?: string | null
          overdue_rent?: string | null
          overdue_salaries?: string | null
          owner_id: string
          photos?: Json | null
          price?: number | null
          primary_deal_type?: string | null
          published_at?: string | null
          required_documents?: Json | null
          status?: string
          surveillance_cameras?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          ai_rating?: string | null
          ai_structure_validation?: Json | null
          ai_summary?: string | null
          annual_rent?: number | null
          business_activity?: string | null
          category?: string | null
          city?: string | null
          civil_defense_license?: string | null
          created_at?: string
          deal_disclosures?: Json | null
          deal_options?: Json | null
          deal_type?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          disclosure_score?: number | null
          district?: string | null
          documents?: Json | null
          featured?: boolean
          fraud_flags?: Json | null
          fraud_score?: number | null
          id?: string
          inventory?: Json | null
          lease_duration?: string | null
          lease_paid_period?: string | null
          lease_remaining?: string | null
          liabilities?: string | null
          municipality_license?: string | null
          overdue_rent?: string | null
          overdue_salaries?: string | null
          owner_id?: string
          photos?: Json | null
          price?: number | null
          primary_deal_type?: string | null
          published_at?: string | null
          required_documents?: Json | null
          status?: string
          surveillance_cameras?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      negotiation_messages: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          is_read: boolean
          message: string
          message_type: string
          metadata: Json | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          is_read?: boolean
          message: string
          message_type?: string
          metadata?: Json | null
          sender_id: string
          sender_type?: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          is_read?: boolean
          message?: string
          message_type?: string
          metadata?: Json | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_messages_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cancelled_deals: number
          city: string | null
          completed_deals: number
          created_at: string
          disputes_count: number
          full_name: string | null
          id: string
          is_active: boolean
          is_suspended: boolean
          is_verified: boolean
          kyc_data: Json | null
          last_activity: string | null
          phone: string | null
          trust_score: number
          updated_at: string
          user_id: string
          verification_level: string
        }
        Insert: {
          avatar_url?: string | null
          cancelled_deals?: number
          city?: string | null
          completed_deals?: number
          created_at?: string
          disputes_count?: number
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_suspended?: boolean
          is_verified?: boolean
          kyc_data?: Json | null
          last_activity?: string | null
          phone?: string | null
          trust_score?: number
          updated_at?: string
          user_id: string
          verification_level?: string
        }
        Update: {
          avatar_url?: string | null
          cancelled_deals?: number
          city?: string | null
          completed_deals?: number
          created_at?: string
          disputes_count?: number
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_suspended?: boolean
          is_verified?: boolean
          kyc_data?: Json | null
          last_activity?: string | null
          phone?: string | null
          trust_score?: number
          updated_at?: string
          user_id?: string
          verification_level?: string
        }
        Relationships: []
      }
      security_incidents: {
        Row: {
          affected_resource_id: string | null
          affected_resource_type: string | null
          affected_user_id: string | null
          created_at: string
          description: string
          details: Json | null
          id: string
          incident_type: string
          recommended_actions: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          affected_resource_id?: string | null
          affected_resource_type?: string | null
          affected_user_id?: string | null
          created_at?: string
          description: string
          details?: Json | null
          id?: string
          incident_type: string
          recommended_actions?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          affected_resource_id?: string | null
          affected_resource_type?: string | null
          affected_user_id?: string | null
          created_at?: string
          description?: string
          details?: Json | null
          id?: string
          incident_type?: string
          recommended_actions?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      seller_reviews: {
        Row: {
          comment: string | null
          created_at: string
          deal_id: string
          honesty: number
          id: string
          listing_accuracy: number
          overall_experience: number
          responsiveness: number
          reviewer_id: string
          seller_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          deal_id: string
          honesty: number
          id?: string
          listing_accuracy: number
          overall_experience: number
          responsiveness: number
          reviewer_id: string
          seller_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          deal_id?: string
          honesty?: number
          id?: string
          listing_accuracy?: number
          overall_experience?: number
          responsiveness?: number
          reviewer_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_reviews_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_by?: string | null
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
      calculate_seller_trust_score: {
        Args: { _seller_id: string }
        Returns: number
      }
      get_seller_visibility_tier: {
        Args: { _seller_id: string }
        Returns: number
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "platform_owner" | "supervisor" | "customer"
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
      app_role: ["platform_owner", "supervisor", "customer"],
    },
  },
} as const
