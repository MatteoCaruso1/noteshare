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
      admin_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      applause: {
        Row: {
          created_at: string
          id: string
          note_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applause_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applause_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_focus: {
        Row: {
          created_at: string
          focus_date: string
          focus_text: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          focus_date: string
          focus_text?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          focus_date?: string
          focus_text?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      focus_backlog: {
        Row: {
          created_at: string
          focus_text: string
          id: string
          original_focus_date: string | null
          saved_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          focus_text: string
          id?: string
          original_focus_date?: string | null
          saved_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          focus_text?: string
          id?: string
          original_focus_date?: string | null
          saved_at?: string
          user_id?: string
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
      group_events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          event_date: string
          event_type: string
          group_id: string
          id: string
          is_virtual: boolean
          location: string | null
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          event_date: string
          event_type?: string
          group_id: string
          id?: string
          is_virtual?: boolean
          location?: string | null
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string
          event_type?: string
          group_id?: string
          id?: string
          is_virtual?: boolean
          location?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invites: {
        Row: {
          created_at: string
          group_id: string
          id: string
          invited_by: string
          invited_user_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          invited_by: string
          invited_user_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          invited_by?: string
          invited_user_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invites_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          mute_events: boolean
          mute_posts: boolean
          role: string
          status: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          mute_events?: boolean
          mute_posts?: boolean
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          mute_events?: boolean
          mute_posts?: boolean
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_posts: {
        Row: {
          audio_file_names: string[] | null
          audio_files: string[] | null
          author_id: string
          created_at: string
          group_id: string
          id: string
          text_content: string | null
          updated_at: string
        }
        Insert: {
          audio_file_names?: string[] | null
          audio_files?: string[] | null
          author_id: string
          created_at?: string
          group_id: string
          id?: string
          text_content?: string | null
          updated_at?: string
        }
        Update: {
          audio_file_names?: string[] | null
          audio_files?: string[] | null
          author_id?: string
          created_at?: string
          group_id?: string
          id?: string
          text_content?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          city: string | null
          cover_image: string | null
          created_at: string
          description: string | null
          focus_details: string[] | null
          focus_type: string
          group_type: string[]
          id: string
          location_type: string
          member_count: number
          name: string
          owner_id: string
          privacy: string
          profile_image: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          focus_details?: string[] | null
          focus_type?: string
          group_type?: string[]
          id?: string
          location_type?: string
          member_count?: number
          name: string
          owner_id: string
          privacy?: string
          profile_image?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          focus_details?: string[] | null
          focus_type?: string
          group_type?: string[]
          id?: string
          location_type?: string
          member_count?: number
          name?: string
          owner_id?: string
          privacy?: string
          profile_image?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      muted_friends: {
        Row: {
          created_at: string
          id: string
          muted_friend_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          muted_friend_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          muted_friend_id?: string
          user_id?: string
        }
        Relationships: []
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
      note_shares: {
        Row: {
          created_at: string
          id: string
          note_id: string
          responded_at: string | null
          shared_by_id: string
          shared_with_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          responded_at?: string | null
          shared_by_id: string
          shared_with_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          responded_at?: string | null
          shared_by_id?: string
          shared_with_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_shares_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_shares_shared_by_id_fkey"
            columns: ["shared_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_shares_shared_with_id_fkey"
            columns: ["shared_with_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          audio_file_names: string[] | null
          audio_files: string[] | null
          author_id: string
          comment_count: number
          created_at: string
          focus_date: string | null
          focus_entry_id: string | null
          focus_text_snapshot: string | null
          gig_id: string | null
          goal_id: string | null
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
          comment_count?: number
          created_at?: string
          focus_date?: string | null
          focus_entry_id?: string | null
          focus_text_snapshot?: string | null
          gig_id?: string | null
          goal_id?: string | null
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
          comment_count?: number
          created_at?: string
          focus_date?: string | null
          focus_entry_id?: string | null
          focus_text_snapshot?: string | null
          gig_id?: string | null
          goal_id?: string | null
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
            foreignKeyName: "notes_focus_entry_id_fkey"
            columns: ["focus_entry_id"]
            isOneToOne: false
            referencedRelation: "daily_focus"
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
            foreignKeyName: "notes_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
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
          gig_id: string | null
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
          gig_id?: string | null
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
          gig_id?: string | null
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
            foreignKeyName: "notifications_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "promo_posts"
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
      page_views: {
        Row: {
          created_at: string
          id: string
          page_name: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_name: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          page_name?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          collaborator_ids: string[] | null
          created_at: string
          ended_at: string | null
          focus_date: string | null
          focus_entry_id: string | null
          focus_text_snapshot: string | null
          goals: string | null
          id: string
          is_active: boolean | null
          is_mobile: boolean
          notes_summary: string | null
          paused_at: string | null
          paused_duration_ms: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          collaborator_ids?: string[] | null
          created_at?: string
          ended_at?: string | null
          focus_date?: string | null
          focus_entry_id?: string | null
          focus_text_snapshot?: string | null
          goals?: string | null
          id?: string
          is_active?: boolean | null
          is_mobile?: boolean
          notes_summary?: string | null
          paused_at?: string | null
          paused_duration_ms?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          collaborator_ids?: string[] | null
          created_at?: string
          ended_at?: string | null
          focus_date?: string | null
          focus_entry_id?: string | null
          focus_text_snapshot?: string | null
          goals?: string | null
          id?: string
          is_active?: boolean | null
          is_mobile?: boolean
          notes_summary?: string | null
          paused_at?: string | null
          paused_duration_ms?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_focus_entry_id_fkey"
            columns: ["focus_entry_id"]
            isOneToOne: false
            referencedRelation: "daily_focus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_overrides: {
        Row: {
          created_at: string
          enabled: boolean
          note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string | null
          bio: string | null
          celebrated_streak_milestones: number[]
          color_theme: string | null
          created_at: string
          current_streak: number
          followers_count: number
          following_count: number
          genres: string[] | null
          has_used_trial: boolean | null
          id: string
          instruments: string[] | null
          location: string | null
          name: string
          open_to_collaborate: boolean | null
          premium_override: boolean
          skill_level: string | null
          streak_achievement_counts: Json | null
          updated_at: string
          user_id: string | null
          username: string
        }
        Insert: {
          avatar?: string | null
          bio?: string | null
          celebrated_streak_milestones?: number[]
          color_theme?: string | null
          created_at?: string
          current_streak?: number
          followers_count?: number
          following_count?: number
          genres?: string[] | null
          has_used_trial?: boolean | null
          id?: string
          instruments?: string[] | null
          location?: string | null
          name: string
          open_to_collaborate?: boolean | null
          premium_override?: boolean
          skill_level?: string | null
          streak_achievement_counts?: Json | null
          updated_at?: string
          user_id?: string | null
          username: string
        }
        Update: {
          avatar?: string | null
          bio?: string | null
          celebrated_streak_milestones?: number[]
          color_theme?: string | null
          created_at?: string
          current_streak?: number
          followers_count?: number
          following_count?: number
          genres?: string[] | null
          has_used_trial?: boolean | null
          id?: string
          instruments?: string[] | null
          location?: string | null
          name?: string
          open_to_collaborate?: boolean | null
          premium_override?: boolean
          skill_level?: string | null
          streak_achievement_counts?: Json | null
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
          repost_reminder_days: number | null
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
          repost_reminder_days?: number | null
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
          repost_reminder_days?: number | null
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
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          reported_item_id: string
          reported_item_type: string
          reported_user_id: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          reported_item_id: string
          reported_item_type: string
          reported_user_id: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          reported_item_id?: string
          reported_item_type?: string
          reported_user_id?: string
          reporter_id?: string
        }
        Relationships: []
      }
      weekly_goals: {
        Row: {
          created_at: string
          id: string
          skipped: boolean
          target_minutes: number
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          skipped?: boolean
          target_minutes?: number
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          skipped?: boolean
          target_minutes?: number
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_goals_user_id_fkey"
            columns: ["user_id"]
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
      claim_streak_milestone: {
        Args: { p_milestone: number; p_profile_id: string }
        Returns: Json
      }
      has_group_invite: { Args: { p_group_id: string }; Returns: boolean }
      has_pending_join_request: {
        Args: { p_group_id: string }
        Returns: boolean
      }
      is_active_group_member: { Args: { p_group_id: string }; Returns: boolean }
      is_group_admin: { Args: { p_group_id: string }; Returns: boolean }
      is_group_public: { Args: { p_group_id: string }; Returns: boolean }
      my_profile_id: { Args: never; Returns: string }
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
