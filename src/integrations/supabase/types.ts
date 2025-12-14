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
      direct_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          dislike_most: string | null
          id: string
          like_most: string
          nps_score: number | null
          user_id: string
          willing_to_pay: string | null
        }
        Insert: {
          created_at?: string
          dislike_most?: string | null
          id?: string
          like_most: string
          nps_score?: number | null
          user_id: string
          willing_to_pay?: string | null
        }
        Update: {
          created_at?: string
          dislike_most?: string | null
          id?: string
          like_most?: string
          nps_score?: number | null
          user_id?: string
          willing_to_pay?: string | null
        }
        Relationships: []
      }
      followers: {
        Row: {
          approved: boolean | null
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          approved?: boolean | null
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          approved?: boolean | null
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followers_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followers_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          completed_at: string | null
          content: string
          created_at: string
          current_minutes: number | null
          current_steps: number | null
          description: string | null
          goal_type: string
          id: string
          is_completed: boolean | null
          priority: number | null
          progress_type: string | null
          reflection: string | null
          target_date: string | null
          target_minutes: number | null
          target_steps: number | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          content: string
          created_at?: string
          current_minutes?: number | null
          current_steps?: number | null
          description?: string | null
          goal_type: string
          id?: string
          is_completed?: boolean | null
          priority?: number | null
          progress_type?: string | null
          reflection?: string | null
          target_date?: string | null
          target_minutes?: number | null
          target_steps?: number | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          content?: string
          created_at?: string
          current_minutes?: number | null
          current_steps?: number | null
          description?: string | null
          goal_type?: string
          id?: string
          is_completed?: boolean | null
          priority?: number | null
          progress_type?: string | null
          reflection?: string | null
          target_date?: string | null
          target_minutes?: number | null
          target_steps?: number | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      note_comments: {
        Row: {
          audio_url: string | null
          author_id: string
          content: string
          created_at: string
          id: string
          note_id: string
        }
        Insert: {
          audio_url?: string | null
          author_id: string
          content: string
          created_at?: string
          id?: string
          note_id: string
        }
        Update: {
          audio_url?: string | null
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_comments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          audio_file_names: string[] | null
          audio_files: string[] | null
          author_id: string
          created_at: string
          gig_id: string | null
          id: string
          image_files: string[] | null
          project_id: string | null
          session_id: string | null
          tags: string[] | null
          text_content: string | null
          updated_at: string
          video_files: string[] | null
          visibility: string
        }
        Insert: {
          audio_file_names?: string[] | null
          audio_files?: string[] | null
          author_id: string
          created_at?: string
          gig_id?: string | null
          id?: string
          image_files?: string[] | null
          project_id?: string | null
          session_id?: string | null
          tags?: string[] | null
          text_content?: string | null
          updated_at?: string
          video_files?: string[] | null
          visibility?: string
        }
        Update: {
          audio_file_names?: string[] | null
          audio_files?: string[] | null
          author_id?: string
          created_at?: string
          gig_id?: string | null
          id?: string
          image_files?: string[] | null
          project_id?: string | null
          session_id?: string | null
          tags?: string[] | null
          text_content?: string | null
          updated_at?: string
          video_files?: string[] | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "promo_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          from_user_id: string | null
          id: string
          note_id: string | null
          read: boolean | null
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          from_user_id?: string | null
          id?: string
          note_id?: string | null
          read?: boolean | null
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          from_user_id?: string | null
          id?: string
          note_id?: string | null
          read?: boolean | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          collaborator_ids: string[] | null
          created_at: string
          ended_at: string | null
          goals: string | null
          id: string
          is_active: boolean | null
          notes_summary: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          collaborator_ids?: string[] | null
          created_at?: string
          ended_at?: string | null
          goals?: string | null
          id?: string
          is_active?: boolean | null
          notes_summary?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          collaborator_ids?: string[] | null
          created_at?: string
          ended_at?: string | null
          goals?: string | null
          id?: string
          is_active?: boolean | null
          notes_summary?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          bio: string | null
          created_at: string
          followers_count: number
          following_count: number
          genres: string[] | null
          id: string
          instruments: string[] | null
          location: string | null
          name: string
          open_to_collaborate: boolean | null
          skill_level: string | null
          updated_at: string
          user_id: string | null
          username: string
        }
        Insert: {
          avatar?: string | null
          bio?: string | null
          created_at?: string
          followers_count?: number
          following_count?: number
          genres?: string[] | null
          id?: string
          instruments?: string[] | null
          location?: string | null
          name: string
          open_to_collaborate?: boolean | null
          skill_level?: string | null
          updated_at?: string
          user_id?: string | null
          username: string
        }
        Update: {
          avatar?: string | null
          bio?: string | null
          created_at?: string
          followers_count?: number
          following_count?: number
          genres?: string[] | null
          id?: string
          instruments?: string[] | null
          location?: string | null
          name?: string
          open_to_collaborate?: boolean | null
          skill_level?: string | null
          updated_at?: string
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          collaborator_ids: string[] | null
          cover_image: string | null
          created_at: string
          description: string | null
          id: string
          owner_id: string
          release_date: string | null
          show_on_feed: boolean
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          collaborator_ids?: string[] | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_id: string
          release_date?: string | null
          show_on_feed?: boolean
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          collaborator_ids?: string[] | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string
          release_date?: string | null
          show_on_feed?: boolean
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_posts: {
        Row: {
          author_id: string
          collaborator_ids: string[] | null
          created_at: string
          description: string | null
          event_date: string | null
          id: string
          image: string | null
          is_paid_opportunity: boolean
          links: string[] | null
          promo_type: Database["public"]["Enums"]["promo_type"]
          show_on_feed: boolean
          title: string
        }
        Insert: {
          author_id: string
          collaborator_ids?: string[] | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          image?: string | null
          is_paid_opportunity?: boolean
          links?: string[] | null
          promo_type: Database["public"]["Enums"]["promo_type"]
          show_on_feed?: boolean
          title: string
        }
        Update: {
          author_id?: string
          collaborator_ids?: string[] | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          image?: string | null
          is_paid_opportunity?: boolean
          links?: string[] | null
          promo_type?: Database["public"]["Enums"]["promo_type"]
          show_on_feed?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      promo_type: "gig" | "release" | "event"
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
      promo_type: ["gig", "release", "event"],
    },
  },
} as const
