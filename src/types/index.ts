// Noteshare Types

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  content: string;
  note_id: string | null;
  from_user_id: string | null;
  read: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string | null;
  name: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  location: string | null;
  instruments: string[];
  genres: string[];
  skill_level: string | null;
  open_to_collaborate: boolean;
  followers_count: number;
  following_count: number;
  current_streak: number;
  celebrated_streak_milestones: number[];
  streak_achievement_counts: Record<string, number> | null;
  color_theme: string | null;
  created_at: string;
  updated_at: string;
}

export interface PracticeSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  goals: string | null;
  notes_summary: string | null;
  is_active: boolean;
  paused_at: string | null;
  paused_duration_ms: number;
  collaborator_ids: string[] | null;
  created_at: string;
}

export interface Note {
  id: string;
  author_id: string;
  session_id: string | null;
  project_id: string | null;
  goal_id: string | null;
  gig_id: string | null;
  focus_entry_id: string | null;
  focus_date: string | null;
  focus_text_snapshot: string | null;
  text_content: string | null;
  audio_files: string[];
  audio_file_names: string[];
  image_files: string[];
  video_files: string[];
  tags: string[];
  visibility: 'private' | 'friends';
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface NoteWithAuthor extends Note {
  author: Profile;
  session?: PracticeSession | null;
  sessionCollaborators?: Profile[] | null; // Collaborators from session
  project?: { id: string; title: string } | null;
  goal?: { id: string; title: string | null; content: string } | null;
  gig?: { id: string; title: string } | null;
  _share_id?: string; // Present when note was shared with the user
}

export interface Project {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  tags: string[];
  collaborator_ids: string[];
  show_on_feed: boolean;
  release_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithOwner extends Project {
  owner: Profile;
}

export interface NoteComment {
  id: string;
  note_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface PromoPost {
  id: string;
  author_id: string;
  promo_type: 'gig' | 'release' | 'event';
  title: string;
  description: string | null;
  event_date: string | null;
  image: string | null;
  links: string[];
  collaborator_ids: string[];
  show_on_feed: boolean;
  is_paid_opportunity: boolean;
  repost_reminder_days: number | null;
  created_at: string;
}

export interface PromoPostWithAuthor extends PromoPost {
  author: Profile;
}

export interface Follower {
  id: string;
  follower_id: string;
  following_id: string;
  approved: boolean;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  goal_type: 'near-term' | 'long-term';
  content: string;
  title: string | null;
  description: string | null;
  target_date: string | null;
  priority: number;
  progress_type: 'checkbox' | 'step' | 'time';
  target_steps: number;
  current_steps: number;
  target_minutes: number;
  current_minutes: number;
  is_completed: boolean;
  completed_at: string | null;
  reflection: string | null;
  created_at: string;
  updated_at: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface FriendshipWithProfile extends Friendship {
  requester?: Profile;
  addressee?: Profile;
}

export interface AudioFileWithName {
  url: string;
  name: string;
  duration?: number;
}

export const INSTRUMENTS = [
  'Piano', 'Guitar', 'Bass', 'Drums', 'Saxophone', 'Trumpet', 'Violin', 
  'Cello', 'Flute', 'Clarinet', 'Trombone', 'Voice', 'Synthesizer', 'Other'
];

export const GENRES = [
  'Jazz', 'Classical', 'Rock', 'Pop', 'R&B', 'Hip-Hop', 'Electronic',
  'Folk', 'Country', 'Blues', 'Metal', 'Indie', 'World', 'Other'
];

export const SKILL_LEVELS = [
  'Beginner', 'Intermediate', 'Advanced', 'Professional'
];
