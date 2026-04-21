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
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      api_tokens: {
        Row: {
          created_at: string
          created_by: string
          id: string
          label: string
          last_used_at: string | null
          revoked_at: string | null
          scopes: string[]
          token_hash: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          label: string
          last_used_at?: string | null
          revoked_at?: string | null
          scopes?: string[]
          token_hash: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          label?: string
          last_used_at?: string | null
          revoked_at?: string | null
          scopes?: string[]
          token_hash?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          archived_at: string | null
          brand_name: string
          category: string | null
          contact_email: string
          contact_name: string
          contact_role: string | null
          created_at: string
          id: string
          notes: string | null
          owner_id: string | null
          product_description: string | null
          reviewed_at: string | null
          stage: Database['public']['Enums']['brand_stage']
          updated_at: string
          website: string
        }
        Insert: {
          archived_at?: string | null
          brand_name: string
          category?: string | null
          contact_email: string
          contact_name: string
          contact_role?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          product_description?: string | null
          reviewed_at?: string | null
          stage?: Database['public']['Enums']['brand_stage']
          updated_at?: string
          website: string
        }
        Update: {
          archived_at?: string | null
          brand_name?: string
          category?: string | null
          contact_email?: string
          contact_name?: string
          contact_role?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          product_description?: string | null
          reviewed_at?: string | null
          stage?: Database['public']['Enums']['brand_stage']
          updated_at?: string
          website?: string
        }
        Relationships: []
      }
      creators: {
        Row: {
          archived_at: string | null
          content_link: string | null
          created_at: string
          email: string
          followers: string | null
          id: string
          name: string
          niches: string[]
          notes: string | null
          owner_id: string | null
          platform: string | null
          product_interests: string | null
          reviewed_at: string | null
          social_handles: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          content_link?: string | null
          created_at?: string
          email: string
          followers?: string | null
          id?: string
          name: string
          niches?: string[]
          notes?: string | null
          owner_id?: string | null
          platform?: string | null
          product_interests?: string | null
          reviewed_at?: string | null
          social_handles?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          content_link?: string | null
          created_at?: string
          email?: string
          followers?: string | null
          id?: string
          name?: string
          niches?: string[]
          notes?: string | null
          owner_id?: string | null
          platform?: string | null
          product_interests?: string | null
          reviewed_at?: string | null
          social_handles?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      outbound_messages: {
        Row: {
          body: string
          channel: string
          created_at: string
          created_by: Database['public']['Enums']['created_by_kind']
          created_by_id: string
          direction: Database['public']['Enums']['message_direction']
          entity_id: string
          entity_type: Database['public']['Enums']['entity_type']
          external_id: string | null
          id: string
          metadata: Json
          sender_account: string | null
          sent_at: string
          status: Database['public']['Enums']['message_status']
          subject: string | null
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          created_by: Database['public']['Enums']['created_by_kind']
          created_by_id: string
          direction?: Database['public']['Enums']['message_direction']
          entity_id: string
          entity_type: Database['public']['Enums']['entity_type']
          external_id?: string | null
          id?: string
          metadata?: Json
          sender_account?: string | null
          sent_at?: string
          status?: Database['public']['Enums']['message_status']
          subject?: string | null
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          created_by?: Database['public']['Enums']['created_by_kind']
          created_by_id?: string
          direction?: Database['public']['Enums']['message_direction']
          entity_id?: string
          entity_type?: Database['public']['Enums']['entity_type']
          external_id?: string | null
          id?: string
          metadata?: Json
          sender_account?: string | null
          sent_at?: string
          status?: Database['public']['Enums']['message_status']
          subject?: string | null
        }
        Relationships: []
      }
      outbound_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: Database['public']['Enums']['created_by_kind']
          created_by_id: string
          description: string | null
          due_at: string | null
          entity_id: string | null
          entity_type: Database['public']['Enums']['entity_type'] | null
          id: string
          owner_id: string | null
          status: Database['public']['Enums']['task_status']
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: Database['public']['Enums']['created_by_kind']
          created_by_id: string
          description?: string | null
          due_at?: string | null
          entity_id?: string | null
          entity_type?: Database['public']['Enums']['entity_type'] | null
          id?: string
          owner_id?: string | null
          status?: Database['public']['Enums']['task_status']
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: Database['public']['Enums']['created_by_kind']
          created_by_id?: string
          description?: string | null
          due_at?: string | null
          entity_id?: string | null
          entity_type?: Database['public']['Enums']['entity_type'] | null
          id?: string
          owner_id?: string | null
          status?: Database['public']['Enums']['task_status']
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_team_member: { Args: never; Returns: boolean }
      list_team_members: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          email: string
          full_name: string
          id: string
          last_sign_in_at: string
        }[]
      }
    }
    Enums: {
      brand_stage: 'cold' | 'in_talks' | 'done'
      created_by_kind: 'user' | 'agent'
      entity_type: 'creator' | 'brand'
      message_direction: 'outbound' | 'inbound'
      message_status: 'sent' | 'delivered' | 'replied' | 'bounced' | 'failed'
      task_status: 'todo' | 'in_progress' | 'waiting' | 'done' | 'dropped'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
