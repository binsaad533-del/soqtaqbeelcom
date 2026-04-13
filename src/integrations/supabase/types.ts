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
      agent_actions_log: {
        Row: {
          action_details: Json
          action_type: string
          created_at: string
          id: string
          reference_id: string | null
          reference_type: string | null
          result: string | null
          user_id: string
        }
        Insert: {
          action_details?: Json
          action_type: string
          created_at?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          result?: string | null
          user_id: string
        }
        Update: {
          action_details?: Json
          action_type?: string
          created_at?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          result?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_settings: {
        Row: {
          agent_rules: Json | null
          auto_evaluate_offers: boolean
          auto_reject_below_min: boolean
          auto_reply_inquiries: boolean
          created_at: string
          daily_summary: boolean
          id: string
          is_active: boolean
          max_budget: number | null
          min_acceptable_price: number | null
          preferred_response_tone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_rules?: Json | null
          auto_evaluate_offers?: boolean
          auto_reject_below_min?: boolean
          auto_reply_inquiries?: boolean
          created_at?: string
          daily_summary?: boolean
          id?: string
          is_active?: boolean
          max_budget?: number | null
          min_acceptable_price?: number | null
          preferred_response_tone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_rules?: Json | null
          auto_evaluate_offers?: boolean
          auto_reject_below_min?: boolean
          auto_reply_inquiries?: boolean
          created_at?: string
          daily_summary?: boolean
          id?: string
          is_active?: boolean
          max_budget?: number | null
          min_acceptable_price?: number | null
          preferred_response_tone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_chat_actions: {
        Row: {
          action_type: string
          after_data: Json | null
          before_data: Json | null
          chat_message_id: string | null
          confirmed: boolean | null
          error_message: string | null
          executed_at: string
          id: string
          reference_id: string | null
          reference_type: string | null
          source: string
          status: string
          triggered_by: string
          user_id: string
        }
        Insert: {
          action_type: string
          after_data?: Json | null
          before_data?: Json | null
          chat_message_id?: string | null
          confirmed?: boolean | null
          error_message?: string | null
          executed_at?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          source?: string
          status?: string
          triggered_by?: string
          user_id: string
        }
        Update: {
          action_type?: string
          after_data?: Json | null
          before_data?: Json | null
          chat_message_id?: string | null
          confirmed?: boolean | null
          error_message?: string | null
          executed_at?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          source?: string
          status?: string
          triggered_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_actions_chat_message_id_fkey"
            columns: ["chat_message_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_feedback: {
        Row: {
          action_type: string | null
          ai_response_snapshot: string | null
          chat_message_id: string | null
          comment: string | null
          created_at: string
          detected_intent: string | null
          error_category: string | null
          id: string
          rating: string
          user_id: string
          user_message_snapshot: string | null
        }
        Insert: {
          action_type?: string | null
          ai_response_snapshot?: string | null
          chat_message_id?: string | null
          comment?: string | null
          created_at?: string
          detected_intent?: string | null
          error_category?: string | null
          id?: string
          rating: string
          user_id: string
          user_message_snapshot?: string | null
        }
        Update: {
          action_type?: string | null
          ai_response_snapshot?: string | null
          chat_message_id?: string | null
          comment?: string | null
          created_at?: string
          detected_intent?: string | null
          error_category?: string | null
          id?: string
          rating?: string
          user_id?: string
          user_message_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_feedback_chat_message_id_fkey"
            columns: ["chat_message_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          ai_response: string | null
          created_at: string
          detected_intent: string | null
          executed_action: string | null
          id: string
          metadata: Json | null
          session_id: string
          status: string
          user_id: string
          user_message: string
        }
        Insert: {
          ai_response?: string | null
          created_at?: string
          detected_intent?: string | null
          executed_action?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string
          status?: string
          user_id: string
          user_message: string
        }
        Update: {
          ai_response?: string | null
          created_at?: string
          detected_intent?: string | null
          executed_action?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string
          status?: string
          user_id?: string
          user_message?: string
        }
        Relationships: []
      }
      ai_user_memory: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          created_at: string
          id: string
          interaction_count: number | null
          last_search_query: string | null
          notes: Json | null
          preferences: Json | null
          preferred_activities: string[] | null
          preferred_cities: string[] | null
          updated_at: string
          user_id: string
          viewed_listings: string[] | null
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          id?: string
          interaction_count?: number | null
          last_search_query?: string | null
          notes?: Json | null
          preferences?: Json | null
          preferred_activities?: string[] | null
          preferred_cities?: string[] | null
          updated_at?: string
          user_id: string
          viewed_listings?: string[] | null
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          id?: string
          interaction_count?: number | null
          last_search_query?: string | null
          notes?: Json | null
          preferences?: Json | null
          preferred_activities?: string[] | null
          preferred_cities?: string[] | null
          updated_at?: string
          user_id?: string
          viewed_listings?: string[] | null
        }
        Relationships: []
      }
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
      blog_posts: {
        Row: {
          category_ar: string | null
          category_en: string | null
          content_ar: string
          content_en: string | null
          created_at: string
          excerpt_ar: string | null
          excerpt_en: string | null
          featured: boolean | null
          generated_by_ai: boolean | null
          id: string
          meta_description_ar: string | null
          meta_description_en: string | null
          published_at: string | null
          read_time_minutes: number | null
          slug: string
          status: string
          tags: string[] | null
          title_ar: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          category_ar?: string | null
          category_en?: string | null
          content_ar: string
          content_en?: string | null
          created_at?: string
          excerpt_ar?: string | null
          excerpt_en?: string | null
          featured?: boolean | null
          generated_by_ai?: boolean | null
          id?: string
          meta_description_ar?: string | null
          meta_description_en?: string | null
          published_at?: string | null
          read_time_minutes?: number | null
          slug: string
          status?: string
          tags?: string[] | null
          title_ar: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          category_ar?: string | null
          category_en?: string | null
          content_ar?: string
          content_en?: string | null
          created_at?: string
          excerpt_ar?: string | null
          excerpt_en?: string | null
          featured?: boolean | null
          generated_by_ai?: boolean | null
          id?: string
          meta_description_ar?: string | null
          meta_description_en?: string | null
          published_at?: string | null
          read_time_minutes?: number | null
          slug?: string
          status?: string
          tags?: string[] | null
          title_ar?: string
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string | null
          listing_id: string | null
          seller_id: string
          status: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          listing_id?: string | null
          seller_id: string
          status?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          listing_id?: string | null
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
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
          total_with_vat: number | null
          updated_at: string
          vat_amount: number | null
          vat_rate: number
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
          total_with_vat?: number | null
          updated_at?: string
          vat_amount?: number | null
          vat_rate?: number
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
          total_with_vat?: number | null
          updated_at?: string
          vat_amount?: number | null
          vat_rate?: number
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
      deal_files: {
        Row: {
          deal_id: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          deal_id: string
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          deal_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_files_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
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
      deal_ratings: {
        Row: {
          comment: string | null
          created_at: string
          deal_id: string
          id: string
          rated_id: string
          rater_id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          deal_id: string
          id?: string
          rated_id: string
          rater_id: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          rated_id?: string
          rater_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "deal_ratings_deal_id_fkey"
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
          escrow_status: string
          fraud_flags: Json | null
          id: string
          last_activity_alert: string | null
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
          escrow_status?: string
          fraud_flags?: Json | null
          id?: string
          last_activity_alert?: string | null
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
          escrow_status?: string
          fraud_flags?: Json | null
          id?: string
          last_activity_alert?: string | null
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
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
      feasibility_studies: {
        Row: {
          created_at: string
          id: string
          last_updated_at: string
          listing_id: string
          requested_by: string
          study_data: Json
        }
        Insert: {
          created_at?: string
          id?: string
          last_updated_at?: string
          listing_id: string
          requested_by: string
          study_data?: Json
        }
        Update: {
          created_at?: string
          id?: string
          last_updated_at?: string
          listing_id?: string
          requested_by?: string
          study_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "feasibility_studies_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_flags: {
        Row: {
          created_at: string
          details: Json | null
          flag_type: Database["public"]["Enums"]["fraud_flag_type"]
          id: string
          listing_id: string | null
          reviewed_by: string | null
          severity: Database["public"]["Enums"]["fraud_severity"]
          status: Database["public"]["Enums"]["fraud_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          flag_type: Database["public"]["Enums"]["fraud_flag_type"]
          id?: string
          listing_id?: string | null
          reviewed_by?: string | null
          severity?: Database["public"]["Enums"]["fraud_severity"]
          status?: Database["public"]["Enums"]["fraud_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          flag_type?: Database["public"]["Enums"]["fraud_flag_type"]
          id?: string
          listing_id?: string | null
          reviewed_by?: string | null
          severity?: Database["public"]["Enums"]["fraud_severity"]
          status?: Database["public"]["Enums"]["fraud_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_flags_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          buyer_id: string
          commission_amount: number | null
          commission_rate: number
          created_at: string
          deal_amount: number
          deal_id: string
          id: string
          invoice_number: number
          listing_title: string | null
          seller_id: string
          status: string
          total_amount: number
          total_with_vat: number | null
          vat_amount: number | null
          vat_rate: number
        }
        Insert: {
          buyer_id: string
          commission_amount?: number | null
          commission_rate?: number
          created_at?: string
          deal_amount?: number
          deal_id: string
          id?: string
          invoice_number?: number
          listing_title?: string | null
          seller_id: string
          status?: string
          total_amount?: number
          total_with_vat?: number | null
          vat_amount?: number | null
          vat_rate?: number
        }
        Update: {
          buyer_id?: string
          commission_amount?: number | null
          commission_rate?: number
          created_at?: string
          deal_amount?: number
          deal_id?: string
          id?: string
          invoice_number?: number
          listing_title?: string | null
          seller_id?: string
          status?: string
          total_amount?: number
          total_with_vat?: number | null
          vat_amount?: number | null
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
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
          user_id?: string
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
      listing_agent_settings: {
        Row: {
          auto_evaluate_offers: boolean
          auto_reject_below_min: boolean
          auto_reject_very_low: boolean
          auto_renew_enabled: boolean
          auto_reply_delay_minutes: number
          auto_reply_inquiries: boolean
          created_at: string
          daily_summary: boolean
          id: string
          is_active: boolean
          listing_id: string
          min_acceptable_price: number | null
          notify_low_views: boolean
          notify_market_price: boolean
          notify_missing_data: boolean
          notify_pending_offers: boolean
          notify_stale_deals: boolean
          owner_id: string
          preferred_response_tone: string | null
          updated_at: string
          weekly_report_enabled: boolean
        }
        Insert: {
          auto_evaluate_offers?: boolean
          auto_reject_below_min?: boolean
          auto_reject_very_low?: boolean
          auto_renew_enabled?: boolean
          auto_reply_delay_minutes?: number
          auto_reply_inquiries?: boolean
          created_at?: string
          daily_summary?: boolean
          id?: string
          is_active?: boolean
          listing_id: string
          min_acceptable_price?: number | null
          notify_low_views?: boolean
          notify_market_price?: boolean
          notify_missing_data?: boolean
          notify_pending_offers?: boolean
          notify_stale_deals?: boolean
          owner_id: string
          preferred_response_tone?: string | null
          updated_at?: string
          weekly_report_enabled?: boolean
        }
        Update: {
          auto_evaluate_offers?: boolean
          auto_reject_below_min?: boolean
          auto_reject_very_low?: boolean
          auto_renew_enabled?: boolean
          auto_reply_delay_minutes?: number
          auto_reply_inquiries?: boolean
          created_at?: string
          daily_summary?: boolean
          id?: string
          is_active?: boolean
          listing_id?: string
          min_acceptable_price?: number | null
          notify_low_views?: boolean
          notify_market_price?: boolean
          notify_missing_data?: boolean
          notify_pending_offers?: boolean
          notify_stale_deals?: boolean
          owner_id?: string
          preferred_response_tone?: string | null
          updated_at?: string
          weekly_report_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "listing_agent_settings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_likes: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: []
      }
      listing_offers: {
        Row: {
          buyer_id: string
          created_at: string
          deal_id: string | null
          id: string
          listing_id: string
          message: string | null
          offered_price: number
          reminder_count: number
          seller_response: string | null
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          deal_id?: string | null
          id?: string
          listing_id: string
          message?: string | null
          offered_price: number
          reminder_count?: number
          seller_response?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          deal_id?: string | null
          id?: string
          listing_id?: string
          message?: string | null
          offered_price?: number
          reminder_count?: number
          seller_response?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_offers_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          listing_id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      listing_views: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      listings: {
        Row: {
          ai_analysis_cache: Json | null
          ai_analysis_updated_at: string | null
          ai_assets_combined: Json | null
          ai_detected_assets: Json | null
          ai_detected_assets_files: Json | null
          ai_detected_assets_images: Json | null
          ai_price_analysis: Json | null
          ai_rating: string | null
          ai_structure_validation: Json | null
          ai_summary: string | null
          ai_trust_score: Json | null
          annual_rent: number | null
          area_sqm: number | null
          auto_renew: boolean
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
          last_reminder_sent: string | null
          lease_duration: string | null
          lease_paid_period: string | null
          lease_remaining: string | null
          liabilities: string | null
          location_lat: number | null
          location_lng: number | null
          municipality_license: string | null
          overdue_rent: string | null
          overdue_salaries: string | null
          owner_id: string
          photos: Json | null
          price: number | null
          primary_deal_type: string | null
          published_at: string | null
          renew_count: number
          required_documents: Json | null
          status: string
          surveillance_cameras: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          ai_analysis_cache?: Json | null
          ai_analysis_updated_at?: string | null
          ai_assets_combined?: Json | null
          ai_detected_assets?: Json | null
          ai_detected_assets_files?: Json | null
          ai_detected_assets_images?: Json | null
          ai_price_analysis?: Json | null
          ai_rating?: string | null
          ai_structure_validation?: Json | null
          ai_summary?: string | null
          ai_trust_score?: Json | null
          annual_rent?: number | null
          area_sqm?: number | null
          auto_renew?: boolean
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
          last_reminder_sent?: string | null
          lease_duration?: string | null
          lease_paid_period?: string | null
          lease_remaining?: string | null
          liabilities?: string | null
          location_lat?: number | null
          location_lng?: number | null
          municipality_license?: string | null
          overdue_rent?: string | null
          overdue_salaries?: string | null
          owner_id: string
          photos?: Json | null
          price?: number | null
          primary_deal_type?: string | null
          published_at?: string | null
          renew_count?: number
          required_documents?: Json | null
          status?: string
          surveillance_cameras?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          ai_analysis_cache?: Json | null
          ai_analysis_updated_at?: string | null
          ai_assets_combined?: Json | null
          ai_detected_assets?: Json | null
          ai_detected_assets_files?: Json | null
          ai_detected_assets_images?: Json | null
          ai_price_analysis?: Json | null
          ai_rating?: string | null
          ai_structure_validation?: Json | null
          ai_summary?: string | null
          ai_trust_score?: Json | null
          annual_rent?: number | null
          area_sqm?: number | null
          auto_renew?: boolean
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
          last_reminder_sent?: string | null
          lease_duration?: string | null
          lease_paid_period?: string | null
          lease_remaining?: string | null
          liabilities?: string | null
          location_lat?: number | null
          location_lng?: number | null
          municipality_license?: string | null
          overdue_rent?: string | null
          overdue_salaries?: string | null
          owner_id?: string
          photos?: Json | null
          price?: number | null
          primary_deal_type?: string | null
          published_at?: string | null
          renew_count?: number
          required_documents?: Json | null
          status?: string
          surveillance_cameras?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      market_alerts: {
        Row: {
          alert_type: string
          created_at: string
          expires_at: string | null
          id: string
          is_dismissed: boolean
          is_read: boolean
          message: string
          metadata: Json | null
          priority: string
          reference_id: string | null
          reference_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          alert_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message: string
          metadata?: Json | null
          priority?: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message?: string
          metadata?: Json | null
          priority?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      match_notifications: {
        Row: {
          alert_id: string
          id: string
          listing_id: string
          notified_at: string
          user_id: string
        }
        Insert: {
          alert_id: string
          id?: string
          listing_id: string
          notified_at?: string
          user_id: string
        }
        Update: {
          alert_id?: string
          id?: string
          listing_id?: string
          notified_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_notifications_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "search_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_notifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reports: {
        Row: {
          created_at: string
          deal_id: string
          details: string | null
          id: string
          message_id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          details?: string | null
          id?: string
          message_id: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          details?: string | null
          id?: string
          message_id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          listing_id: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          listing_id?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          listing_id?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
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
      notification_preferences: {
        Row: {
          created_at: string
          deals_email: boolean
          deals_sms: boolean
          id: string
          marketing_email: boolean
          marketing_sms: boolean
          messages_email: boolean
          messages_sms: boolean
          offers_email: boolean
          offers_sms: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deals_email?: boolean
          deals_sms?: boolean
          id?: string
          marketing_email?: boolean
          marketing_sms?: boolean
          messages_email?: boolean
          messages_sms?: boolean
          offers_email?: boolean
          offers_sms?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deals_email?: boolean
          deals_sms?: boolean
          id?: string
          marketing_email?: boolean
          marketing_sms?: boolean
          messages_email?: boolean
          messages_sms?: boolean
          offers_email?: boolean
          offers_sms?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      otp_attempts: {
        Row: {
          attempt_type: Database["public"]["Enums"]["otp_attempt_type"]
          created_at: string
          id: string
          ip_address: string | null
          locked_until: string | null
          phone: string
          success: boolean
          user_id: string | null
        }
        Insert: {
          attempt_type: Database["public"]["Enums"]["otp_attempt_type"]
          created_at?: string
          id?: string
          ip_address?: string | null
          locked_until?: string | null
          phone: string
          success?: boolean
          user_id?: string | null
        }
        Update: {
          attempt_type?: Database["public"]["Enums"]["otp_attempt_type"]
          created_at?: string
          id?: string
          ip_address?: string | null
          locked_until?: string | null
          phone?: string
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      post_deal_followups: {
        Row: {
          buyer_notified: boolean
          created_at: string
          deal_id: string
          followup_date: string
          id: string
          notified_at: string | null
          seller_notified: boolean
        }
        Insert: {
          buyer_notified?: boolean
          created_at?: string
          deal_id: string
          followup_date: string
          id?: string
          notified_at?: string | null
          seller_notified?: boolean
        }
        Update: {
          buyer_notified?: boolean
          created_at?: string
          deal_id?: string
          followup_date?: string
          id?: string
          notified_at?: string | null
          seller_notified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "post_deal_followups_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: true
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      price_alerts: {
        Row: {
          alert_date: string
          created_at: string
          current_price: number
          difference_pct: number | null
          id: string
          listing_id: string
          market_avg: number
        }
        Insert: {
          alert_date?: string
          created_at?: string
          current_price: number
          difference_pct?: number | null
          id?: string
          listing_id: string
          market_avg: number
        }
        Update: {
          alert_date?: string
          created_at?: string
          current_price?: number
          difference_pct?: number | null
          id?: string
          listing_id?: string
          market_avg?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cancelled_deals: number
          city: string | null
          completed_deals: number
          created_at: string
          disputes_count: number
          email: string | null
          fraud_score: number
          full_name: string | null
          id: string
          is_active: boolean
          is_commission_suspended: boolean
          is_suspended: boolean
          is_verified: boolean
          kyc_data: Json | null
          last_activity: string | null
          phone: string | null
          phone_verified: boolean
          phone_verified_at: string | null
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
          email?: string | null
          fraud_score?: number
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_commission_suspended?: boolean
          is_suspended?: boolean
          is_verified?: boolean
          kyc_data?: Json | null
          last_activity?: string | null
          phone?: string | null
          phone_verified?: boolean
          phone_verified_at?: string | null
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
          email?: string | null
          fraud_score?: number
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_commission_suspended?: boolean
          is_suspended?: boolean
          is_verified?: boolean
          kyc_data?: Json | null
          last_activity?: string | null
          phone?: string | null
          phone_verified?: boolean
          phone_verified_at?: string | null
          trust_score?: number
          updated_at?: string
          user_id?: string
          verification_level?: string
        }
        Relationships: []
      }
      promoted_listings: {
        Row: {
          amount_paid: number | null
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          listing_id: string
          promoted_by: string
          promotion_type: string
          starts_at: string
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          listing_id: string
          promoted_by: string
          promotion_type?: string
          starts_at?: string
        }
        Update: {
          amount_paid?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          listing_id?: string
          promoted_by?: string
          promotion_type?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promoted_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_user_id: string | null
          referrer_id: string
          reward_points: number
          status: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_user_id?: string | null
          referrer_id: string
          reward_points?: number
          status?: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_user_id?: string | null
          referrer_id?: string
          reward_points?: number
          status?: string
        }
        Relationships: []
      }
      search_alerts: {
        Row: {
          business_activity: string | null
          city: string | null
          created_at: string
          filters: Json | null
          id: string
          is_active: boolean
          max_price: number | null
          min_price: number | null
          notified_at: string | null
          notify_email: string | null
          notify_phone: string | null
          search_query: string
          user_id: string
        }
        Insert: {
          business_activity?: string | null
          city?: string | null
          created_at?: string
          filters?: Json | null
          id?: string
          is_active?: boolean
          max_price?: number | null
          min_price?: number | null
          notified_at?: string | null
          notify_email?: string | null
          notify_phone?: string | null
          search_query: string
          user_id: string
        }
        Update: {
          business_activity?: string | null
          city?: string | null
          created_at?: string
          filters?: Json | null
          id?: string
          is_active?: boolean
          max_price?: number | null
          min_price?: number | null
          notified_at?: string | null
          notify_email?: string | null
          notify_phone?: string | null
          search_query?: string
          user_id?: string
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
      seller_verifications: {
        Row: {
          business_name: string | null
          commercial_register_number: string | null
          id: string
          id_number: string
          id_type: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_at: string
          user_id: string
          verification_status: string
        }
        Insert: {
          business_name?: string | null
          commercial_register_number?: string | null
          id?: string
          id_number: string
          id_type?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string
          user_id: string
          verification_status?: string
        }
        Update: {
          business_name?: string | null
          commercial_register_number?: string | null
          id?: string
          id_number?: string
          id_type?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string
          user_id?: string
          verification_status?: string
        }
        Relationships: []
      }
      session_logs: {
        Row: {
          created_at: string
          device_info: string | null
          event_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      supervisor_permissions: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          manage_crm: boolean
          manage_deals: boolean
          manage_listings: boolean
          manage_reports: boolean
          manage_security: boolean
          manage_users: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          manage_crm?: boolean
          manage_deals?: boolean
          manage_listings?: boolean
          manage_reports?: boolean
          manage_security?: boolean
          manage_users?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          manage_crm?: boolean
          manage_deals?: boolean
          manage_listings?: boolean
          manage_reports?: boolean
          manage_security?: boolean
          manage_users?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          created_at: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          attachments: string[] | null
          created_at: string
          id: string
          is_staff: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_staff?: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_staff?: boolean
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
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
      weekly_reports: {
        Row: {
          created_at: string
          id: string
          listing_id: string | null
          report_data: Json
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id?: string | null
          report_data?: Json
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string | null
          report_data?: Json
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
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
      cleanup_old_logs: { Args: never; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_deal_confirmation_status: {
        Args: { _deal_id: string }
        Returns: {
          buyer_confirmed: boolean
          current_user_confirmed: boolean
          seller_confirmed: boolean
        }[]
      }
      get_listing_offers_summary: {
        Args: { _listing_id: string }
        Returns: Json
      }
      get_profile_name_by_email: { Args: { _email: string }; Returns: string }
      get_public_profile: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string
          cancelled_deals: number
          city: string
          completed_deals: number
          full_name: string
          is_verified: boolean
          trust_score: number
          user_id: string
        }[]
      }
      get_seller_rating_summary: { Args: { _seller_id: string }; Returns: Json }
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
      mask_id_number: {
        Args: { full_id: string; viewer_id: string }
        Returns: string
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "platform_owner"
        | "supervisor"
        | "customer"
        | "financial_manager"
      fraud_flag_type:
        | "duplicate_images"
        | "duplicate_text"
        | "spam_listing"
        | "suspicious_account"
        | "abnormal_pricing"
        | "rapid_messaging"
        | "new_account_publish"
        | "multi_account_ip"
      fraud_severity: "low" | "medium" | "high" | "critical"
      fraud_status: "pending" | "reviewed" | "dismissed" | "confirmed"
      otp_attempt_type: "request" | "verify"
      ticket_category:
        | "general"
        | "technical"
        | "billing"
        | "complaint"
        | "suggestion"
        | "other"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status:
        | "open"
        | "in_progress"
        | "waiting_response"
        | "resolved"
        | "closed"
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
      app_role: [
        "platform_owner",
        "supervisor",
        "customer",
        "financial_manager",
      ],
      fraud_flag_type: [
        "duplicate_images",
        "duplicate_text",
        "spam_listing",
        "suspicious_account",
        "abnormal_pricing",
        "rapid_messaging",
        "new_account_publish",
        "multi_account_ip",
      ],
      fraud_severity: ["low", "medium", "high", "critical"],
      fraud_status: ["pending", "reviewed", "dismissed", "confirmed"],
      otp_attempt_type: ["request", "verify"],
      ticket_category: [
        "general",
        "technical",
        "billing",
        "complaint",
        "suggestion",
        "other",
      ],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: [
        "open",
        "in_progress",
        "waiting_response",
        "resolved",
        "closed",
      ],
    },
  },
} as const
