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
    PostgrestVersion: "14.5"
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
          source: Database["public"]["Enums"]["record_source"]
          stage: Database["public"]["Enums"]["brand_stage"]
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
          source?: Database["public"]["Enums"]["record_source"]
          stage?: Database["public"]["Enums"]["brand_stage"]
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
          source?: Database["public"]["Enums"]["record_source"]
          stage?: Database["public"]["Enums"]["brand_stage"]
          updated_at?: string
          website?: string
        }
        Relationships: []
      }
      creators: {
        Row: {
          archived_at: string | null
          auth_user_id: string | null
          content_link: string | null
          created_at: string
          email: string
          followers: string | null
          id: string
          invited_at: string | null
          name: string
          niches: string[]
          notes: string | null
          owner_id: string | null
          platform: string | null
          product_interests: string | null
          reviewed_at: string | null
          shipping_address: string | null
          social_handles: string | null
          source: Database["public"]["Enums"]["record_source"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          auth_user_id?: string | null
          content_link?: string | null
          created_at?: string
          email: string
          followers?: string | null
          id?: string
          invited_at?: string | null
          name: string
          niches?: string[]
          notes?: string | null
          owner_id?: string | null
          platform?: string | null
          product_interests?: string | null
          reviewed_at?: string | null
          shipping_address?: string | null
          social_handles?: string | null
          source?: Database["public"]["Enums"]["record_source"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          auth_user_id?: string | null
          content_link?: string | null
          created_at?: string
          email?: string
          followers?: string | null
          id?: string
          invited_at?: string | null
          name?: string
          niches?: string[]
          notes?: string | null
          owner_id?: string | null
          platform?: string | null
          product_interests?: string | null
          reviewed_at?: string | null
          shipping_address?: string | null
          social_handles?: string | null
          source?: Database["public"]["Enums"]["record_source"]
          updated_at?: string
        }
        Relationships: []
      }
      eval_videos: {
        Row: {
          blob_key: string
          bytes: number | null
          created_at: string
          duration_sec: number | null
          extracted: Json | null
          extracted_at: string | null
          extraction_error: string | null
          extraction_status: string
          id: string
          match_id: string
          mime_type: string | null
          transcript: string | null
          transcript_error: string | null
          transcript_status: string
        }
        Insert: {
          blob_key: string
          bytes?: number | null
          created_at?: string
          duration_sec?: number | null
          extracted?: Json | null
          extracted_at?: string | null
          extraction_error?: string | null
          extraction_status?: string
          id?: string
          match_id: string
          mime_type?: string | null
          transcript?: string | null
          transcript_error?: string | null
          transcript_status?: string
        }
        Update: {
          blob_key?: string
          bytes?: number | null
          created_at?: string
          duration_sec?: number | null
          extracted?: Json | null
          extracted_at?: string | null
          extraction_error?: string | null
          extraction_status?: string
          id?: string
          match_id?: string
          mime_type?: string | null
          transcript?: string | null
          transcript_error?: string | null
          transcript_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "eval_videos_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          accepted_at: string | null
          commission_pct: number | null
          created_at: string
          created_by: string | null
          creator_id: string
          decline_note: string | null
          decline_reason: string | null
          declined_at: string | null
          eval_complete_at: string | null
          eval_submitted_at: string | null
          id: string
          product_id: string
          proposed_at: string
          received_at: string | null
          shipped_at: string | null
          stage: string
          tracking_carrier: string | null
          tracking_number: string | null
          updated_at: string
          why_matched: string | null
        }
        Insert: {
          accepted_at?: string | null
          commission_pct?: number | null
          created_at?: string
          created_by?: string | null
          creator_id: string
          decline_note?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          eval_complete_at?: string | null
          eval_submitted_at?: string | null
          id?: string
          product_id: string
          proposed_at?: string
          received_at?: string | null
          shipped_at?: string | null
          stage?: string
          tracking_carrier?: string | null
          tracking_number?: string | null
          updated_at?: string
          why_matched?: string | null
        }
        Update: {
          accepted_at?: string | null
          commission_pct?: number | null
          created_at?: string
          created_by?: string | null
          creator_id?: string
          decline_note?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          eval_complete_at?: string | null
          eval_submitted_at?: string | null
          id?: string
          product_id?: string
          proposed_at?: string
          received_at?: string | null
          shipped_at?: string | null
          stage?: string
          tracking_carrier?: string | null
          tracking_number?: string | null
          updated_at?: string
          why_matched?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_messages: {
        Row: {
          body: string
          channel: string
          created_at: string
          created_by: Database["public"]["Enums"]["created_by_kind"]
          created_by_id: string
          direction: Database["public"]["Enums"]["message_direction"]
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          external_id: string | null
          id: string
          metadata: Json
          sender_account: string | null
          sent_at: string
          status: Database["public"]["Enums"]["message_status"]
          subject: string | null
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          created_by: Database["public"]["Enums"]["created_by_kind"]
          created_by_id: string
          direction?: Database["public"]["Enums"]["message_direction"]
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          external_id?: string | null
          id?: string
          metadata?: Json
          sender_account?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["message_status"]
          subject?: string | null
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          created_by?: Database["public"]["Enums"]["created_by_kind"]
          created_by_id?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          external_id?: string | null
          id?: string
          metadata?: Json
          sender_account?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["message_status"]
          subject?: string | null
        }
        Relationships: []
      }
      outbound_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["created_by_kind"]
          created_by_id: string
          description: string | null
          due_at: string | null
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["entity_type"] | null
          id: string
          owner_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: Database["public"]["Enums"]["created_by_kind"]
          created_by_id: string
          description?: string | null
          due_at?: string | null
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          id?: string
          owner_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["created_by_kind"]
          created_by_id?: string
          description?: string | null
          due_at?: string | null
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          id?: string
          owner_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          image_url: string | null
          name: string
          retail_price_cents: number | null
          sku: string | null
          status: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          retail_price_cents?: number | null
          sku?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          retail_price_cents?: number | null
          sku?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
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
      brand_stage: "cold" | "in_talks" | "done"
      created_by_kind: "user" | "agent"
      entity_type: "creator" | "brand"
      message_direction: "outbound" | "inbound"
      message_status: "sent" | "delivered" | "replied" | "bounced" | "failed"
      record_source: "application" | "outreach" | "manual"
      task_status: "todo" | "in_progress" | "waiting" | "done" | "dropped"
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
      brand_stage: ["cold", "in_talks", "done"],
      created_by_kind: ["user", "agent"],
      entity_type: ["creator", "brand"],
      message_direction: ["outbound", "inbound"],
      message_status: ["sent", "delivered", "replied", "bounced", "failed"],
      record_source: ["application", "outreach", "manual"],
      task_status: ["todo", "in_progress", "waiting", "done", "dropped"],
    },
  },
} as const
