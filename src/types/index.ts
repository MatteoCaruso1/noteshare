// Noteshare Types

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
  created_at: string;
}

export interface Note {
  id: string;
  author_id: string;
  session_id: string | null;
  project_id: string | null;
  text_content: string | null;
  audio_files: string[];
  image_files: string[];
  video_files: string[];
  tags: string[];
  visibility: 'private' | 'collaborators' | 'followers' | 'public';
  created_at: string;
  updated_at: string;
}

export interface NoteWithAuthor extends Note {
  author: Profile;
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
  show_on_feed: boolean;
  is_paid_opportunity: boolean;
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
  target_date: string | null;
  visibility: 'public' | 'private';
  created_at: string;
  updated_at: string;
}

export interface AudioFileWithName {
  url: string;
  name: string;
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
