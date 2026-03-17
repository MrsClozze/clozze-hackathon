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
      agent_communication_preferences: {
        Row: {
          booking_link_url: string | null
          buyer_bad_news_scenario: string | null
          buyer_good_news_scenario: string | null
          coworker_team_scenario: string | null
          created_at: string | null
          general_client_scenario: string | null
          has_booking_link: boolean | null
          has_preferred_email: boolean | null
          id: string
          listing_new_listing_scenario: string | null
          listing_price_reduction_scenario: string | null
          onboarding_completed: boolean | null
          preferred_email: string | null
          preferred_lender_scenario: string | null
          share_calendars_access_level: string
          share_calendars_with_team: boolean
          share_emails_with_team: boolean
          title_company_scenario: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          booking_link_url?: string | null
          buyer_bad_news_scenario?: string | null
          buyer_good_news_scenario?: string | null
          coworker_team_scenario?: string | null
          created_at?: string | null
          general_client_scenario?: string | null
          has_booking_link?: boolean | null
          has_preferred_email?: boolean | null
          id?: string
          listing_new_listing_scenario?: string | null
          listing_price_reduction_scenario?: string | null
          onboarding_completed?: boolean | null
          preferred_email?: string | null
          preferred_lender_scenario?: string | null
          share_calendars_access_level?: string
          share_calendars_with_team?: boolean
          share_emails_with_team?: boolean
          title_company_scenario?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          booking_link_url?: string | null
          buyer_bad_news_scenario?: string | null
          buyer_good_news_scenario?: string | null
          coworker_team_scenario?: string | null
          created_at?: string | null
          general_client_scenario?: string | null
          has_booking_link?: boolean | null
          has_preferred_email?: boolean | null
          id?: string
          listing_new_listing_scenario?: string | null
          listing_price_reduction_scenario?: string | null
          onboarding_completed?: boolean | null
          preferred_email?: string | null
          preferred_lender_scenario?: string | null
          share_calendars_access_level?: string
          share_calendars_with_team?: boolean
          share_emails_with_team?: boolean
          title_company_scenario?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      buyer_access_logs: {
        Row: {
          access_type: string
          accessed_at: string
          accessed_by: string
          buyer_id: string
          id: string
          ip_address: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string
          accessed_by: string
          buyer_id: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string
          accessed_by?: string
          buyer_id?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_access_logs_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
        ]
      }
      buyers: {
        Row: {
          agent_commission: number | null
          commission_percentage: number | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          pre_approved_amount: number | null
          status: string
          updated_at: string
          user_id: string
          wants_needs: string | null
        }
        Insert: {
          agent_commission?: number | null
          commission_percentage?: number | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          pre_approved_amount?: number | null
          status?: string
          updated_at?: string
          user_id: string
          wants_needs?: string | null
        }
        Update: {
          agent_commission?: number | null
          commission_percentage?: number | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          pre_approved_amount?: number | null
          status?: string
          updated_at?: string
          user_id?: string
          wants_needs?: string | null
        }
        Relationships: []
      }
      calendar_connections: {
        Row: {
          access_token_encrypted: string | null
          created_at: string
          id: string
          last_synced_at: string | null
          provider: string
          provider_account_id: string | null
          provider_email: string | null
          refresh_token_encrypted: string | null
          sync_enabled: boolean | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
          vault_secret_id: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          provider: string
          provider_account_id?: string | null
          provider_email?: string | null
          refresh_token_encrypted?: string | null
          sync_enabled?: boolean | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          vault_secret_id?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          provider?: string
          provider_account_id?: string | null
          provider_email?: string | null
          refresh_token_encrypted?: string | null
          sync_enabled?: boolean | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          vault_secret_id?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          address: string | null
          calendar_connection_id: string | null
          client: string | null
          created_at: string
          description: string | null
          event_date: string
          event_time: string | null
          event_type: string | null
          external_event_id: string | null
          id: string
          reminder_enabled: boolean | null
          reminder_sent: boolean | null
          source: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          calendar_connection_id?: string | null
          client?: string | null
          created_at?: string
          description?: string | null
          event_date: string
          event_time?: string | null
          event_type?: string | null
          external_event_id?: string | null
          id?: string
          reminder_enabled?: boolean | null
          reminder_sent?: boolean | null
          source?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          calendar_connection_id?: string | null
          client?: string | null
          created_at?: string
          description?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: string | null
          external_event_id?: string | null
          id?: string
          reminder_enabled?: boolean | null
          reminder_sent?: boolean | null
          source?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_calendar_connection_id_fkey"
            columns: ["calendar_connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          category: string
          company: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          subcategory: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          company?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          subcategory: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          subcategory?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts_documents: {
        Row: {
          contact_id: string
          file_name: string
          file_path: string
          file_type: string | null
          id: string
          uploaded_at: string
        }
        Insert: {
          contact_id: string
          file_name: string
          file_path: string
          file_type?: string | null
          id?: string
          uploaded_at?: string
        }
        Update: {
          contact_id?: string
          file_name?: string
          file_path?: string
          file_type?: string | null
          id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      docusign_envelopes: {
        Row: {
          buyer_id: string | null
          completed_at: string | null
          created_at: string
          document_name: string | null
          envelope_id: string
          id: string
          listing_id: string | null
          recipients: Json
          sent_at: string | null
          status: string
          subject: string
          task_id: string | null
          updated_at: string
          user_id: string
          voided_at: string | null
        }
        Insert: {
          buyer_id?: string | null
          completed_at?: string | null
          created_at?: string
          document_name?: string | null
          envelope_id: string
          id?: string
          listing_id?: string | null
          recipients?: Json
          sent_at?: string | null
          status?: string
          subject: string
          task_id?: string | null
          updated_at?: string
          user_id: string
          voided_at?: string | null
        }
        Update: {
          buyer_id?: string | null
          completed_at?: string | null
          created_at?: string
          document_name?: string | null
          envelope_id?: string
          id?: string
          listing_id?: string | null
          recipients?: Json
          sent_at?: string | null
          status?: string
          subject?: string
          task_id?: string | null
          updated_at?: string
          user_id?: string
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "docusign_envelopes_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docusign_envelopes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docusign_envelopes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address: string
          agent_commission: number | null
          bathrooms: number | null
          bedrooms: number | null
          city: string
          commission_percentage: number | null
          county: string | null
          created_at: string
          days_on_market: number | null
          id: string
          listing_end_date: string | null
          listing_start_date: string | null
          price: number
          seller_email: string | null
          seller_first_name: string | null
          seller_last_name: string | null
          seller_phone: string | null
          sq_feet: number | null
          status: string
          updated_at: string
          user_id: string
          zipcode: string | null
        }
        Insert: {
          address: string
          agent_commission?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city: string
          commission_percentage?: number | null
          county?: string | null
          created_at?: string
          days_on_market?: number | null
          id?: string
          listing_end_date?: string | null
          listing_start_date?: string | null
          price: number
          seller_email?: string | null
          seller_first_name?: string | null
          seller_last_name?: string | null
          seller_phone?: string | null
          sq_feet?: number | null
          status?: string
          updated_at?: string
          user_id: string
          zipcode?: string | null
        }
        Update: {
          address?: string
          agent_commission?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          commission_percentage?: number | null
          county?: string | null
          created_at?: string
          days_on_market?: number | null
          id?: string
          listing_end_date?: string | null
          listing_start_date?: string | null
          price?: number
          seller_email?: string | null
          seller_first_name?: string | null
          seller_last_name?: string | null
          seller_phone?: string | null
          sq_feet?: number | null
          status?: string
          updated_at?: string
          user_id?: string
          zipcode?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_state: string
          avatar_url: string | null
          broker_license_number: string | null
          company_name: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          license_number: string | null
          onboarding_completed: boolean | null
          phone: string | null
          professional_title: string | null
          referral_source: string | null
          role: string | null
          team_onboarding_completed: boolean | null
          timezone: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          account_state?: string
          avatar_url?: string | null
          broker_license_number?: string | null
          company_name?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          license_number?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          professional_title?: string | null
          referral_source?: string | null
          role?: string | null
          team_onboarding_completed?: boolean | null
          timezone?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          account_state?: string
          avatar_url?: string | null
          broker_license_number?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          license_number?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          professional_title?: string | null
          referral_source?: string | null
          role?: string | null
          team_onboarding_completed?: boolean | null
          timezone?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      service_integrations: {
        Row: {
          access_token_encrypted: string | null
          connected_at: string | null
          created_at: string
          id: string
          is_connected: boolean
          refresh_token_encrypted: string | null
          service_name: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
          vault_secret_id: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          refresh_token_encrypted?: string | null
          service_name: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          vault_secret_id?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          refresh_token_encrypted?: string | null
          service_name?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          vault_secret_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan_type: string
          status: string
          stripe_customer_id: string | null
          stripe_product_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_type: string
          status: string
          stripe_customer_id?: string | null
          stripe_product_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_product_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      synced_emails: {
        Row: {
          ai_action_item: string | null
          ai_analyzed: boolean | null
          ai_category: string | null
          ai_ignored: boolean | null
          ai_priority: string | null
          ai_requires_action: boolean | null
          body_preview: string | null
          buyer_id: string | null
          created_at: string
          external_email_id: string
          id: string
          is_read: boolean | null
          labels: string[] | null
          listing_id: string | null
          received_at: string
          sender_email: string
          sender_name: string | null
          snippet: string | null
          subject: string | null
          thread_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_action_item?: string | null
          ai_analyzed?: boolean | null
          ai_category?: string | null
          ai_ignored?: boolean | null
          ai_priority?: string | null
          ai_requires_action?: boolean | null
          body_preview?: string | null
          buyer_id?: string | null
          created_at?: string
          external_email_id: string
          id?: string
          is_read?: boolean | null
          labels?: string[] | null
          listing_id?: string | null
          received_at: string
          sender_email: string
          sender_name?: string | null
          snippet?: string | null
          subject?: string | null
          thread_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_action_item?: string | null
          ai_analyzed?: boolean | null
          ai_category?: string | null
          ai_ignored?: boolean | null
          ai_priority?: string | null
          ai_requires_action?: boolean | null
          body_preview?: string | null
          buyer_id?: string | null
          created_at?: string
          external_email_id?: string
          id?: string
          is_read?: boolean | null
          labels?: string[] | null
          listing_id?: string | null
          received_at?: string
          sender_email?: string
          sender_name?: string | null
          snippet?: string | null
          subject?: string | null
          thread_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "synced_emails_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "synced_emails_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      synced_messages: {
        Row: {
          ai_action_item: string | null
          ai_analyzed: boolean | null
          ai_category: string | null
          ai_ignored: boolean | null
          ai_priority: string | null
          ai_requires_action: boolean | null
          created_at: string
          direction: string
          external_message_id: string
          id: string
          is_read: boolean | null
          message_body: string | null
          received_at: string
          recipient_phone: string | null
          sender_name: string | null
          sender_phone: string | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_action_item?: string | null
          ai_analyzed?: boolean | null
          ai_category?: string | null
          ai_ignored?: boolean | null
          ai_priority?: string | null
          ai_requires_action?: boolean | null
          created_at?: string
          direction?: string
          external_message_id: string
          id?: string
          is_read?: boolean | null
          message_body?: string | null
          received_at?: string
          recipient_phone?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_action_item?: string | null
          ai_analyzed?: boolean | null
          ai_category?: string | null
          ai_ignored?: boolean | null
          ai_priority?: string | null
          ai_requires_action?: boolean | null
          created_at?: string
          direction?: string
          external_message_id?: string
          id?: string
          is_read?: boolean | null
          message_body?: string | null
          received_at?: string
          recipient_phone?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_assignees: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          address: string | null
          assignee: string | null
          assignee_user_id: string | null
          buyer_id: string | null
          calendar_sync_targets: Json | null
          contact_id: string | null
          created_at: string
          date: string | null
          due_date: string | null
          due_time: string | null
          end_time: string | null
          external_calendar_event_id: string | null
          has_ai_assist: boolean
          id: string
          include_weekends: boolean
          listing_id: string | null
          notes: string | null
          parent_task_id: string | null
          priority: string
          recurrence_end_date: string | null
          recurrence_index: number | null
          recurrence_pattern: string | null
          show_on_calendar: boolean
          start_date: string | null
          status: string
          sync_to_external_calendar: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          assignee?: string | null
          assignee_user_id?: string | null
          buyer_id?: string | null
          calendar_sync_targets?: Json | null
          contact_id?: string | null
          created_at?: string
          date?: string | null
          due_date?: string | null
          due_time?: string | null
          end_time?: string | null
          external_calendar_event_id?: string | null
          has_ai_assist?: boolean
          id?: string
          include_weekends?: boolean
          listing_id?: string | null
          notes?: string | null
          parent_task_id?: string | null
          priority?: string
          recurrence_end_date?: string | null
          recurrence_index?: number | null
          recurrence_pattern?: string | null
          show_on_calendar?: boolean
          start_date?: string | null
          status?: string
          sync_to_external_calendar?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          assignee?: string | null
          assignee_user_id?: string | null
          buyer_id?: string | null
          calendar_sync_targets?: Json | null
          contact_id?: string | null
          created_at?: string
          date?: string | null
          due_date?: string | null
          due_time?: string | null
          end_time?: string | null
          external_calendar_event_id?: string | null
          has_ai_assist?: boolean
          id?: string
          include_weekends?: boolean
          listing_id?: string | null
          notes?: string | null
          parent_task_id?: string | null
          priority?: string
          recurrence_end_date?: string | null
          recurrence_index?: number | null
          recurrence_pattern?: string | null
          show_on_calendar?: boolean
          start_date?: string | null
          status?: string
          sync_to_external_calendar?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_buyer"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_listing"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          first_name: string | null
          id: string
          invited_by: string
          last_name: string | null
          replaces_member_id: string | null
          status: Database["public"]["Enums"]["invitation_status"]
          team_id: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          first_name?: string | null
          id?: string
          invited_by: string
          last_name?: string | null
          replaces_member_id?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          team_id: string
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          first_name?: string | null
          id?: string
          invited_by?: string
          last_name?: string | null
          replaces_member_id?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          team_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_replaces_member_id_fkey"
            columns: ["replaces_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_slots: {
        Row: {
          created_at: string
          id: string
          stripe_subscription_id: string | null
          stripe_subscription_item_id: string | null
          total_slots: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          stripe_subscription_id?: string | null
          stripe_subscription_item_id?: string | null
          total_slots?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          stripe_subscription_id?: string | null
          stripe_subscription_item_id?: string | null
          total_slots?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["team_member_role"]
          status: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["team_member_role"]
          status?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["team_member_role"]
          status?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
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
        Relationships: []
      }
      transaction_state_history: {
        Row: {
          changed_at: string
          changed_by: string
          from_state: string | null
          id: string
          note: string | null
          to_state: string
          transaction_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          from_state?: string | null
          id?: string
          note?: string | null
          to_state: string
          transaction_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          from_state?: string | null
          id?: string
          note?: string | null
          to_state?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_state_history_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_suggested_tasks: {
        Row: {
          accepted_task_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          rule_snapshot: Json
          status: string
          template_id: string
          title: string
          transaction_id: string
          updated_at: string
        }
        Insert: {
          accepted_task_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          rule_snapshot?: Json
          status?: string
          template_id: string
          title: string
          transaction_id: string
          updated_at?: string
        }
        Update: {
          accepted_task_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          rule_snapshot?: Json
          status?: string
          template_id?: string
          title?: string
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_suggested_tasks_accepted_task_id_fkey"
            columns: ["accepted_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_suggested_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "transaction_task_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_suggested_tasks_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_task_templates: {
        Row: {
          conditions: Json
          created_at: string
          description: string | null
          due_anchor: string
          due_offset_days: number
          id: string
          is_active: boolean
          priority: string
          sort_order: number
          title: string
          trigger_state: string
        }
        Insert: {
          conditions?: Json
          created_at?: string
          description?: string | null
          due_anchor?: string
          due_offset_days?: number
          id?: string
          is_active?: boolean
          priority?: string
          sort_order?: number
          title: string
          trigger_state: string
        }
        Update: {
          conditions?: Json
          created_at?: string
          description?: string | null
          due_anchor?: string
          due_offset_days?: number
          id?: string
          is_active?: boolean
          priority?: string
          sort_order?: number
          title?: string
          trigger_state?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          buyer_id: string | null
          created_at: string
          financing_type: string | null
          has_hoa: boolean | null
          id: string
          listing_id: string | null
          notes: string | null
          property_type: string | null
          state: string
          target_close_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string
          financing_type?: string | null
          has_hoa?: boolean | null
          id?: string
          listing_id?: string | null
          notes?: string | null
          property_type?: string | null
          state?: string
          target_close_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          buyer_id?: string | null
          created_at?: string
          financing_type?: string | null
          has_hoa?: boolean | null
          id?: string
          listing_id?: string | null
          notes?: string | null
          property_type?: string | null
          state?: string
          target_close_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
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
      whatsapp_business_connections: {
        Row: {
          access_token_encrypted: string
          business_phone_number: string | null
          connected_at: string | null
          created_at: string
          id: string
          is_connected: boolean
          phone_number_id: string
          updated_at: string
          user_id: string
          webhook_verify_token: string
        }
        Insert: {
          access_token_encrypted: string
          business_phone_number?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          phone_number_id: string
          updated_at?: string
          user_id: string
          webhook_verify_token?: string
        }
        Update: {
          access_token_encrypted?: string
          business_phone_number?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          phone_number_id?: string
          updated_at?: string
          user_id?: string
          webhook_verify_token?: string
        }
        Relationships: []
      }
      whatsapp_integrations: {
        Row: {
          created_at: string
          id: string
          phone_number: string
          updated_at: string
          user_id: string
          verification_code: string | null
          verification_code_expires_at: string | null
          verified: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          phone_number: string
          updated_at?: string
          user_id: string
          verification_code?: string | null
          verification_code_expires_at?: string | null
          verified?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          phone_number?: string
          updated_at?: string
          user_id?: string
          verification_code?: string | null
          verification_code_expires_at?: string | null
          verified?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_team_invitation: { Args: { _token: string }; Returns: Json }
      get_team_buyers: {
        Args: never
        Returns: {
          agent_commission: number
          commission_percentage: number
          created_at: string
          email: string
          first_name: string
          id: string
          is_owner: boolean
          last_name: string
          phone: string
          pre_approved_amount: number
          status: string
          updated_at: string
          user_id: string
          wants_needs: string
        }[]
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_team_owner: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_owner_or_admin: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      shared_team: { Args: { _u1: string; _u2: string }; Returns: boolean }
      store_calendar_tokens: {
        Args: {
          _access_token: string
          _expires_at: string
          _provider: string
          _provider_account_id: string
          _provider_email: string
          _refresh_token: string
          _user_id: string
        }
        Returns: string
      }
      store_integration_tokens: {
        Args: {
          _access_token: string
          _expires_at: string
          _refresh_token: string
          _service_name: string
          _user_id: string
        }
        Returns: string
      }
      user_is_in_team: {
        Args: { _team: string; _user: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      invitation_status: "pending" | "accepted" | "declined" | "expired"
      team_member_role: "owner" | "admin" | "member"
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
      invitation_status: ["pending", "accepted", "declined", "expired"],
      team_member_role: ["owner", "admin", "member"],
    },
  },
} as const
